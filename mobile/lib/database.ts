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
): Promise<UserProgress | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('User not logged in, progress not saved');
    return null;
  }

  // Add timestamp if not present
  const dataWithTimestamp = {
    ...payload,
    capturedAt: payload.capturedAt || new Date().toISOString(),
  };

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
    return null;
  }

  // Log activity
  await logActivity('simulation_progress', experiment, dataWithTimestamp);

  return data;
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
