import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Simulation titles mapping
const simulationTitles: Record<string, string> = {
  freefall: 'Free Fall',
  pendulum: 'Pendulum',
  projectile: 'Projectile Motion',
};

export default function SimulationScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const title = simulationTitles[type || ''] || 'Simulation';

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: title,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.placeholder}>
            <Ionicons name="flask" size={64} color="#00d4ff" />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>
              This simulation will be implemented when migrating the HTML/JS code from the original project.
            </Text>
            <Text style={styles.hint}>
              Berikan kode HTML/JS dari file {type}.html untuk memulai konversi ke React Native.
            </Text>
          </View>

          {/* Controls Section Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Controls</Text>
            <View style={styles.controlsPlaceholder}>
              <Text style={styles.placeholderText}>Parameter controls will appear here</Text>
            </View>
          </View>

          {/* Canvas/Animation Section Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Simulation</Text>
            <View style={styles.canvasPlaceholder}>
              <Ionicons name="play-circle" size={48} color="#666" />
              <Text style={styles.placeholderText}>Animation canvas will appear here</Text>
            </View>
          </View>

          {/* Data/Graph Section Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data & Graphs</Text>
            <View style={styles.graphPlaceholder}>
              <Ionicons name="analytics" size={48} color="#666" />
              <Text style={styles.placeholderText}>Real-time graphs will appear here</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    padding: 20,
  },
  placeholder: {
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  hint: {
    fontSize: 12,
    color: '#00d4ff',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  controlsPlaceholder: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f3460',
    borderStyle: 'dashed',
  },
  canvasPlaceholder: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f3460',
    borderStyle: 'dashed',
  },
  graphPlaceholder: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f3460',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});
