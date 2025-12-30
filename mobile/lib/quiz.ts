import { supabase } from './supabase';

// Quiz types
export interface QuizQuestion {
  experiment: string;
  prompt: string;
  parameters: Record<string, number>;
  unit: string;
  answerDecimalPlaces: number;
}

export interface QuizStats {
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  lastAttemptAt?: string;
}

export interface QuizResult {
  correct: boolean;
  expectedAnswer: number;
  answerDecimalPlaces: number;
  tolerance: number;
  stats: QuizStats;
  nextQuestion: QuizQuestion;
}

// Experiment configurations
const EXPERIMENT_CONFIG = {
  pendulum: {
    unit: 's',
    answerDecimalPlaces: 2,
    tolerance: (expected: number) => Math.max(0.05, expected * 0.02),
    generateQuestion: () => {
      const length = sampleRange(0.5, 2.5, 0.05, 2);
      const gravity = 9.81;
      return {
        prompt: `Dengan panjang tali L = ${formatNumber(length, 2)} m, berapakah periode satu ayunan (dalam detik) untuk bandul sederhana pada g = 9,81 m/s²?`,
        parameters: { length, gravity },
      };
    },
    computeExpected: (params: { length: number; gravity: number }) => {
      const { length, gravity } = params;
      if (!Number.isFinite(length) || length <= 0 || !Number.isFinite(gravity) || gravity <= 0) {
        throw new Error('INVALID_PARAMETERS');
      }
      return 2 * Math.PI * Math.sqrt(length / gravity);
    },
  },
  freefall: {
    unit: 's',
    answerDecimalPlaces: 2,
    tolerance: (expected: number) => Math.max(0.06, expected * 0.03),
    generateQuestion: () => {
      const height = sampleRange(8, 90, 1, 0);
      const gravity = sampleRange(7, 12, 0.1, 1);
      return {
        prompt: `Sebuah benda dijatuhkan dari ketinggian h = ${formatNumber(height, 0)} m pada lingkungan dengan g = ${formatNumber(gravity, 1)} m/s². Berapa waktu yang dibutuhkan hingga mencapai tanah?`,
        parameters: { height, gravity },
      };
    },
    computeExpected: (params: { height: number; gravity: number }) => {
      const { height, gravity } = params;
      if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(gravity) || gravity <= 0) {
        throw new Error('INVALID_PARAMETERS');
      }
      return Math.sqrt((2 * height) / gravity);
    },
  },
  projectile: {
    unit: 'm',
    answerDecimalPlaces: 2,
    tolerance: (expected: number) => Math.max(0.12, expected * 0.03),
    generateQuestion: () => {
      const speed = sampleRange(20, 90, 1, 0);
      const angle = sampleRange(25, 70, 1, 0);
      const gravity = sampleRange(8, 11, 0.1, 1);
      return {
        prompt: `Sebuah proyektil ditembakkan dengan kecepatan awal v₀ = ${formatNumber(speed, 0)} m/s dan sudut θ = ${formatNumber(angle, 0)}°. Berapa jangkauan horizontal maksimum (dalam meter) jika g = ${formatNumber(gravity, 1)} m/s²?`,
        parameters: { speed, angle, gravity },
      };
    },
    computeExpected: (params: { speed: number; angle: number; gravity: number }) => {
      const { speed, angle, gravity } = params;
      if (!Number.isFinite(speed) || speed <= 0 || !Number.isFinite(angle) || !Number.isFinite(gravity) || gravity <= 0) {
        throw new Error('INVALID_PARAMETERS');
      }
      const angleRad = (angle * Math.PI) / 180;
      return (speed * speed * Math.sin(2 * angleRad)) / gravity;
    },
  },
};

// Helper functions
function sampleRange(min: number, max: number, step: number, decimals: number): number {
  const steps = Math.round((max - min) / step);
  const index = Math.floor(Math.random() * (steps + 1));
  const value = min + index * step;
  return Number(value.toFixed(decimals));
}

function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Generate a new quiz question
export function generateQuestion(experiment: 'pendulum' | 'freefall' | 'projectile'): QuizQuestion | null {
  const config = EXPERIMENT_CONFIG[experiment];
  if (!config) return null;

  const question = config.generateQuestion();
  return {
    experiment,
    prompt: question.prompt,
    parameters: question.parameters,
    unit: config.unit,
    answerDecimalPlaces: config.answerDecimalPlaces,
  };
}

// Get quiz stats from Supabase
export async function getQuizStats(experiment: 'pendulum' | 'freefall' | 'projectile'): Promise<QuizStats> {
  const defaultStats = { attempts: 0, correctCount: 0, incorrectCount: 0 };
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return defaultStats;

  const { data, error } = await supabase
    .from('quiz_stats')
    .select('*')
    .eq('user_id', user.id)
    .eq('experiment', experiment)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching quiz stats:', error);
    return defaultStats;
  }

  if (!data) return defaultStats;

  return {
    attempts: data.attempts || 0,
    correctCount: data.correct_count || 0,
    incorrectCount: data.incorrect_count || 0,
    lastAttemptAt: data.last_attempt_at,
  };
}

// Submit answer and check if correct
export async function submitAnswer(
  experiment: 'pendulum' | 'freefall' | 'projectile',
  parameters: Record<string, number>,
  answer: number
): Promise<QuizResult | null> {
  const config = EXPERIMENT_CONFIG[experiment];
  if (!config) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Calculate expected answer
  let expected: number;
  try {
    expected = config.computeExpected(parameters as any);
  } catch (error) {
    console.error('Error computing expected answer:', error);
    return null;
  }

  const tolerance = config.tolerance(expected);
  const isCorrect = Math.abs(answer - expected) <= tolerance;
  const correctDelta = isCorrect ? 1 : 0;
  const incorrectDelta = isCorrect ? 0 : 1;

  // Update stats in Supabase
  try {
    // First try to get existing stats
    const { data: existingStats } = await supabase
      .from('quiz_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('experiment', experiment)
      .single();

    let newStats: QuizStats;

    if (existingStats) {
      // Update existing stats
      const { data: updatedData, error: updateError } = await supabase
        .from('quiz_stats')
        .update({
          attempts: existingStats.attempts + 1,
          correct_count: existingStats.correct_count + correctDelta,
          incorrect_count: existingStats.incorrect_count + incorrectDelta,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('experiment', experiment)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating quiz stats:', updateError);
      }

      newStats = {
        attempts: updatedData?.attempts || existingStats.attempts + 1,
        correctCount: updatedData?.correct_count || existingStats.correct_count + correctDelta,
        incorrectCount: updatedData?.incorrect_count || existingStats.incorrect_count + incorrectDelta,
      };
    } else {
      // Insert new stats
      const { data: insertedData, error: insertError } = await supabase
        .from('quiz_stats')
        .insert({
          user_id: user.id,
          experiment,
          attempts: 1,
          correct_count: correctDelta,
          incorrect_count: incorrectDelta,
          last_attempt_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting quiz stats:', insertError);
      }

      newStats = {
        attempts: insertedData?.attempts || 1,
        correctCount: insertedData?.correct_count || correctDelta,
        incorrectCount: insertedData?.incorrect_count || incorrectDelta,
      };
    }

    // Generate next question
    const nextQuestion = generateQuestion(experiment)!;

    return {
      correct: isCorrect,
      expectedAnswer: Number(expected.toFixed(config.answerDecimalPlaces + 2)),
      answerDecimalPlaces: config.answerDecimalPlaces,
      tolerance,
      stats: newStats,
      nextQuestion,
    };
  } catch (error) {
    console.error('Error submitting quiz answer:', error);
    return null;
  }
}

// Format answer for display
export function formatAnswer(value: number, decimals: number): string {
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
