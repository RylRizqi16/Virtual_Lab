import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import simulation components
import PendulumSimulation from './pendulum';
import FreefallSimulation from './freefall';
import ProjectileSimulation from './projectile';

// Simulation titles mapping
const simulationTitles: Record<string, string> = {
  freefall: 'Gerak Jatuh Bebas',
  pendulum: 'Gerak Bandul',
  projectile: 'Gerak Parabola',
};

export default function SimulationScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const title = simulationTitles[type || ''] || 'Simulation';

  // Render the appropriate simulation based on type
  const renderSimulation = () => {
    switch (type) {
      case 'pendulum':
        return <PendulumSimulation />;
      case 'freefall':
        return <FreefallSimulation />;
      case 'projectile':
        return <ProjectileSimulation />;
      default:
        return (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={64} color="#ff6b6b" />
            <Text style={styles.errorTitle}>Simulasi Tidak Ditemukan</Text>
            <Text style={styles.errorText}>
              Tipe simulasi "{type}" tidak dikenali.
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: title,
          headerStyle: { backgroundColor: '#16213e' },
          headerTintColor: '#fff',
        }}
      />
      {renderSimulation()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});
