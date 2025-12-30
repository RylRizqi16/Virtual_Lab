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
    title: 'Jatuh Bebas',
    description: 'Pelajari gerak gravitasi dan percepatan gravitasi bumi',
    icon: 'arrow-down-circle',
    route: '/simulation/freefall',
    color: '#0a58ca',
  },
  {
    id: 'pendulum',
    title: 'Bandul Sederhana',
    description: 'Pelajari gerak harmonik sederhana dan periode osilasi',
    icon: 'sync-circle',
    route: '/simulation/pendulum',
    color: '#e74c3c',
  },
  {
    id: 'projectile',
    title: 'Gerak Parabola',
    description: 'Analisis lintasan, jangkauan, dan tinggi maksimum proyektil',
    icon: 'trending-up',
    route: '/simulation/projectile',
    color: '#1abc9c',
  },
];

export default function SimulationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Simulasi</Text>
          <Text style={styles.subtitle}>Pilih eksperimen untuk dijelajahi</Text>
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
              <Ionicons name="chevron-forward" size={24} color="#3e4a6b" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#0a58ca" />
          <Text style={styles.infoText}>
            Setiap simulasi dilengkapi kontrol interaktif, grafik real-time, dan konten edukatif untuk membantu Anda memahami konsep fisika.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f9ff',
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
    color: '#1b2a4e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#3e4a6b',
  },
  simulationsList: {
    gap: 16,
  },
  simulationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dbe6ff',
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    color: '#1b2a4e',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#3e4a6b',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 88, 202, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#dbe6ff',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#3e4a6b',
    lineHeight: 20,
  },
});
