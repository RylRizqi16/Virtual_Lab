import { supabase } from './supabase';

// Types
export interface ProgressPayload {
  [key: string]: any;
  capturedAt?: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  experiment: 'pendulum' | 'freefall' | 'projectile';
  payload: ProgressPayload;
  created_at: string;
  updated_at: string;
}

export interface PendulumData {
  L: number;        // Length in meters
  T10: number;      // Total time for 10 oscillations
  T: number;        // Period (single oscillation)
  g: number;        // Calculated gravity
  capturedAt: string;
}

export interface FreefallData {
  height: number;
  mass: number;
  gravity: number;
  timeOfFlight: number;
  impactVelocity: number;
  capturedAt: string;
}

export interface ProjectileData {
  speed: number;
  angle: number;
  gravity: number;
  timeOfFlight: number;
  range: number;
  maxHeight: number;
  capturedAt: string;
}

// Get all progress for current user
export async function getAllProgress(): Promise<UserProgress[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching progress:', error);
    return [];
  }

  return data || [];
}

// Get progress for specific experiment
export async function getExperimentProgress(
  experiment: 'pendulum' | 'freefall' | 'projectile'
): Promise<UserProgress | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('experiment', experiment)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching experiment progress:', error);
  }

  return data;
}

// Save/Update progress (upsert)
export async function saveProgress(
  experiment: 'pendulum' | 'freefall' | 'projectile',
  payload: ProgressPayload
): Promise<{ success: boolean; data: UserProgress | null; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('User not logged in, progress not saved');
    return { success: false, data: null, message: 'Masuk untuk menyimpan progres' };
  }

  // Add timestamp if not present
  const dataWithTimestamp = {
    ...payload,
    capturedAt: payload.capturedAt || new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('user_progress')
      .upsert(
        {
          user_id: user.id,
          experiment,
          payload: dataWithTimestamp,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,experiment',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving progress:', error);
      return { success: false, data: null, message: 'Gagal menyimpan progres: ' + error.message };
    }

    // Log activity
    await logActivity('simulation_progress', experiment, dataWithTimestamp);

    console.log('Progress saved successfully:', data);
    return { success: true, data, message: 'Progres berhasil disimpan!' };
  } catch (err) {
    console.error('Exception saving progress:', err);
    return { success: false, data: null, message: 'Terjadi kesalahan saat menyimpan' };
  }
}

// Log activity (for history)
export async function logActivity(
  type: 'simulation_progress' | 'quiz_attempt',
  experiment: string,
  metadata: any
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('activity_log').insert({
    user_id: user.id,
    type,
    experiment,
    metadata,
  });

  if (error) {
    console.error('Error logging activity:', error);
  }
}

// Get activity history
export async function getActivityHistory(limit = 50): Promise<any[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching activity:', error);
    return [];
  }

  return data || [];
}

// Delete progress for an experiment
export async function deleteProgress(
  experiment: 'pendulum' | 'freefall' | 'projectile'
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_progress')
    .delete()
    .eq('user_id', user.id)
    .eq('experiment', experiment);

  if (error) {
    console.error('Error deleting progress:', error);
    return false;
  }

  return true;
}

// Get user profile
export async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
  }

  return data;
}

// Update user profile
export async function updateUserProfile(profile: {
  full_name?: string;
  institution?: string;
  bio?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: user.id,
        ...profile,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return data;
}

// Format progress summary (like original script.js)
export function formatProgressSummary(
  experiment: string,
  payload: ProgressPayload
): string {
  const formatValue = (value: any, decimals: number) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(decimals) : '--';
  };

  if (experiment === 'pendulum' && payload) {
    const length = formatValue(payload.L, 2);
    const period = formatValue(payload.T, 3);
    const gravity = formatValue(payload.g, 3);
    return `L=${length} m, T=${period} s, g=${gravity} m/s²`;
  }

  if (experiment === 'freefall' && payload) {
    const height = formatValue(payload.height ?? payload.h, 1);
    const time = formatValue(payload.timeOfFlight ?? payload.time, 2);
    const impact = formatValue(payload.impactVelocity ?? payload.velocity, 2);
    return `h=${height} m, t=${time} s, v=${impact} m/s`;
  }

  if (experiment === 'projectile' && payload) {
    const speed = formatValue(payload.speed ?? payload.v0, 1);
    const angle = formatValue(payload.angle ?? payload.theta, 0);
    const range = formatValue(payload.range ?? payload.distance, 2);
    return `v₀=${speed} m/s, θ=${angle}°, jangkauan=${range} m`;
  }

  return '-';
}

// Format experiment name
export function formatExperimentName(experiment: string): string {
  switch (experiment) {
    case 'pendulum':
      return 'Bandul';
    case 'freefall':
      return 'Jatuh Bebas';
    case 'projectile':
      return 'Gerak Parabola';
    default:
      return experiment.charAt(0).toUpperCase() + experiment.slice(1);
  }
}

// Get user statistics summary
export interface UserStats {
  totalExperiments: number;
  totalQuizAttempts: number;
  totalQuizCorrect: number;
  progressPercent: number;
  experimentProgress: {
    name: string;
    experiment: string;
    completed: number;
    total: number;
  }[];
}

export async function getUserStats(): Promise<UserStats> {
  const defaultStats: UserStats = {
    totalExperiments: 0,
    totalQuizAttempts: 0,
    totalQuizCorrect: 0,
    progressPercent: 0,
    experimentProgress: [
      { name: 'Jatuh Bebas', experiment: 'freefall', completed: 0, total: 5 },
      { name: 'Bandul', experiment: 'pendulum', completed: 0, total: 5 },
      { name: 'Gerak Parabola', experiment: 'projectile', completed: 0, total: 5 },
    ],
  };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return defaultStats;

  try {
    // Get experiment progress count
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select('experiment, payload')
      .eq('user_id', user.id);

    if (!progressError && progressData) {
      defaultStats.totalExperiments = progressData.length;
      
      // Update experiment progress
      progressData.forEach((p) => {
        const expProgress = defaultStats.experimentProgress.find(
          (e) => e.experiment === p.experiment
        );
        if (expProgress) {
          // Count runs based on payload data
          expProgress.completed = Math.min(expProgress.total, 1);
        }
      });
    }

    // Get quiz stats
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_stats')
      .select('attempts, correct_count')
      .eq('user_id', user.id);

    if (!quizError && quizData) {
      quizData.forEach((q) => {
        defaultStats.totalQuizAttempts += q.attempts || 0;
        defaultStats.totalQuizCorrect += q.correct_count || 0;
      });
    }

    // Get activity log for more accurate experiment count
    const { data: activityData, error: activityError } = await supabase
      .from('activity_log')
      .select('experiment, type')
      .eq('user_id', user.id)
      .eq('type', 'simulation_progress');

    if (!activityError && activityData) {
      // Count unique experiments completed
      const experimentCounts: Record<string, number> = {};
      activityData.forEach((a) => {
        experimentCounts[a.experiment] = (experimentCounts[a.experiment] || 0) + 1;
      });

      // Update experiment progress with actual counts
      defaultStats.experimentProgress.forEach((exp) => {
        const count = experimentCounts[exp.experiment] || 0;
        exp.completed = Math.min(count, exp.total);
      });

      defaultStats.totalExperiments = activityData.length;
    }

    // Calculate overall progress percentage
    const totalCompleted = defaultStats.experimentProgress.reduce(
      (sum, e) => sum + e.completed,
      0
    );
    const totalGoal = defaultStats.experimentProgress.reduce(
      (sum, e) => sum + e.total,
      0
    );
    defaultStats.progressPercent = totalGoal > 0 
      ? Math.round((totalCompleted / totalGoal) * 100) 
      : 0;

    return defaultStats;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return defaultStats;
  }
}
