import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface SimulationItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
}

const simulations: SimulationItem[] = [
  {
    id: 'freefall',
    title: 'Free Fall',
    description: 'Explore gravitational motion and acceleration due to gravity',
    icon: 'arrow-down-circle',
    route: '/simulation/freefall',
    color: '#00d4ff',
  },
  {
    id: 'pendulum',
    title: 'Pendulum',
    description: 'Study simple harmonic motion and oscillation periods',
    icon: 'sync-circle',
    route: '/simulation/pendulum',
    color: '#ff6b6b',
  },
  {
    id: 'projectile',
    title: 'Projectile Motion',
    description: 'Analyze trajectory, range, and maximum height of projectiles',
    icon: 'trending-up',
    route: '/simulation/projectile',
    color: '#4ecdc4',
  },
];

export default function SimulationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Simulations</Text>
          <Text style={styles.subtitle}>Choose an experiment to explore</Text>
        </View>

        <View style={styles.simulationsList}>
          {simulations.map((sim) => (
            <TouchableOpacity
              key={sim.id}
              style={styles.simulationCard}
              onPress={() => router.push(sim.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${sim.color}20` }]}>
                <Ionicons name={sim.icon} size={40} color={sim.color} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{sim.title}</Text>
                <Text style={styles.cardDescription}>{sim.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#00d4ff" />
          <Text style={styles.infoText}>
            Each simulation includes interactive controls, real-time graphs, and educational content to help you understand physics concepts.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  simulationsList: {
    gap: 16,
  },
  simulationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
});
