import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  QuizQuestion,
  QuizStats,
  generateQuestion,
  getQuizStats,
  submitAnswer,
  formatAnswer,
} from '@/lib/quiz';

interface QuizCardProps {
  experiment: 'pendulum' | 'freefall' | 'projectile';
  title: string;
}

export function QuizCard({ experiment, title }: QuizCardProps) {
  const { user } = useAuth();
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [stats, setStats] = useState<QuizStats>({ attempts: 0, correctCount: 0, incorrectCount: 0 });
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize quiz
  const initializeQuiz = useCallback(async () => {
    if (!user) {
      setQuestion(null);
      setStats({ attempts: 0, correctCount: 0, incorrectCount: 0 });
      setIsInitializing(false);
      return;
    }

    setIsInitializing(true);
    try {
      // Get stats
      const fetchedStats = await getQuizStats(experiment);
      setStats(fetchedStats);

      // Generate question
      const newQuestion = generateQuestion(experiment);
      setQuestion(newQuestion);
    } catch (error) {
      console.error('Error initializing quiz:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [user, experiment]);

  useEffect(() => {
    initializeQuiz();
  }, [initializeQuiz]);

  // Refresh question
  const handleRefresh = () => {
    if (!user || isLoading) return;
    const newQuestion = generateQuestion(experiment);
    setQuestion(newQuestion);
    setAnswer('');
    setFeedback({ message: '', type: '' });
  };

  // Submit answer
  const handleSubmit = async () => {
    if (!user || !question || isLoading) return;

    const numericAnswer = parseFloat(answer.replace(',', '.'));
    if (isNaN(numericAnswer)) {
      setFeedback({ message: 'Masukkan jawaban numerik yang valid.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setFeedback({ message: 'Memproses...', type: '' });

    try {
      const result = await submitAnswer(experiment, question.parameters, numericAnswer);
      
      if (!result) {
        setFeedback({ message: 'Gagal mengirim jawaban.', type: 'error' });
        return;
      }

      const expectedText = formatAnswer(result.expectedAnswer, result.answerDecimalPlaces);
      const unitLabel = question.unit ? ` ${question.unit}` : '';

      if (result.correct) {
        setFeedback({
          message: `✓ Benar! Jawaban: ${expectedText}${unitLabel}`,
          type: 'success',
        });
      } else {
        const difference = Math.abs(numericAnswer - result.expectedAnswer);
        const diffText = formatAnswer(difference, Math.min(result.answerDecimalPlaces + 1, 4));
        setFeedback({
          message: `✗ Belum tepat. Selisih ${diffText}${unitLabel}. Jawaban seharusnya ${expectedText}${unitLabel}.`,
          type: 'error',
        });
      }

      // Update stats
      setStats(result.stats);

      // Set next question
      if (result.nextQuestion) {
        setQuestion(result.nextQuestion);
        setAnswer('');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setFeedback({ message: 'Terjadi kesalahan.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Not logged in state
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="help-circle" size={24} color="#0a58ca" />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.prompt}>Masuk untuk memulai kuis dan simpan hasilnya.</Text>
        <View style={styles.disabledState}>
          <Ionicons name="lock-closed" size={32} color="#3e4a6b" />
          <Text style={styles.disabledText}>Kuis terkunci</Text>
        </View>
      </View>
    );
  }

  // Loading state
  if (isInitializing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="help-circle" size={24} color="#0a58ca" />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color="#0a58ca" />
          <Text style={styles.loadingText}>Memuat kuis...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="help-circle" size={24} color="#0a58ca" />
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Question */}
      <Text style={styles.prompt}>{question?.prompt || 'Tidak ada pertanyaan'}</Text>

      {/* Answer Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Jawaban Anda ({question?.unit || '-'})</Text>
        <TextInput
          style={styles.input}
          value={answer}
          onChangeText={setAnswer}
          placeholder="0.00"
          placeholderTextColor="#3e4a6b"
          keyboardType="decimal-pad"
          editable={!isLoading}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isLoading || !answer}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#ffffff" />
              <Text style={styles.buttonText}>Kirim Jawaban</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, isLoading && styles.disabledButton]}
          onPress={handleRefresh}
          disabled={isLoading}
        >
          <Ionicons name="refresh" size={18} color="#0a58ca" />
          <Text style={styles.secondaryButtonText}>Soal Baru</Text>
        </TouchableOpacity>
      </View>

      {/* Feedback */}
      {feedback.message && (
        <View style={[
          styles.feedback,
          feedback.type === 'success' && styles.feedbackSuccess,
          feedback.type === 'error' && styles.feedbackError,
        ]}>
          <Text style={[
            styles.feedbackText,
            feedback.type === 'success' && styles.feedbackTextSuccess,
            feedback.type === 'error' && styles.feedbackTextError,
          ]}>
            {feedback.message}
          </Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Upaya</Text>
          <Text style={styles.statValue}>{stats.attempts}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Benar</Text>
          <Text style={[styles.statValue, styles.statCorrect]}>{stats.correctCount}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Salah</Text>
          <Text style={[styles.statValue, styles.statIncorrect]}>{stats.incorrectCount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbe6ff',
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1b2a4e',
  },
  prompt: {
    fontSize: 14,
    color: '#3e4a6b',
    lineHeight: 22,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3e4a6b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f9ff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1b2a4e',
    borderWidth: 1,
    borderColor: '#dbe6ff',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#0a58ca',
  },
  secondaryButton: {
    backgroundColor: '#f5f9ff',
    borderWidth: 1,
    borderColor: '#dbe6ff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#0a58ca',
    fontSize: 14,
    fontWeight: '600',
  },
  feedback: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f5f9ff',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(26, 188, 156, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(26, 188, 156, 0.3)',
  },
  feedbackError: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  feedbackText: {
    fontSize: 13,
    color: '#3e4a6b',
    lineHeight: 20,
  },
  feedbackTextSuccess: {
    color: '#1abc9c',
  },
  feedbackTextError: {
    color: '#e74c3c',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#f5f9ff',
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#3e4a6b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1b2a4e',
  },
  statCorrect: {
    color: '#1abc9c',
  },
  statIncorrect: {
    color: '#e74c3c',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#dbe6ff',
    marginVertical: 4,
  },
  disabledState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    opacity: 0.5,
  },
  disabledText: {
    fontSize: 14,
    color: '#3e4a6b',
    marginTop: 8,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#3e4a6b',
  },
});
