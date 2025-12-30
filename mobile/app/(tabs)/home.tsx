import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const features = [
    {
      icon: 'flask',
      title: 'Simulasi Interaktif',
      description: 'Pelajari konsep fisika melalui eksperimen virtual yang interaktif',
    },
    {
      icon: 'analytics',
      title: 'Data Real-time',
      description: 'Visualisasi grafik dan pengukuran saat bereksperimen',
    },
    {
      icon: 'school',
      title: 'Belajar Sambil Praktik',
      description: 'Pahami konsep kompleks melalui aplikasi praktis',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcome}>
            Selamat Datang{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
          </Text>
          <Text style={styles.title}>SimuLab</Text>
          <Text style={styles.subtitle}>Simulasi Fisika</Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroText}>
            Jelajahi dunia fisika melalui simulasi interaktif
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)/simulations')}
          >
            <Text style={styles.ctaButtonText}>Mulai Eksperimen</Text>
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Mengapa SimuLab?</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon as any} size={28} color="#0a58ca" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Access */}
        <View style={styles.quickAccess}>
          <Text style={styles.sectionTitle}>Akses Cepat</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/simulation/freefall')}
            >
              <Ionicons name="arrow-down-circle" size={32} color="#0a58ca" />
              <Text style={styles.quickAccessText}>Jatuh Bebas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/simulation/pendulum')}
            >
              <Ionicons name="sync-circle" size={32} color="#0a58ca" />
              <Text style={styles.quickAccessText}>Bandul</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/simulation/projectile')}
            >
              <Ionicons name="trending-up" size={32} color="#0a58ca" />
              <Text style={styles.quickAccessText}>Gerak Parabola</Text>
            </TouchableOpacity>
          </View>
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
    alignItems: 'center',
    marginBottom: 32,
  },
  welcome: {
    fontSize: 16,
    color: '#54648c',
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0a58ca',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#3e4a6b',
  },
  heroSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroText: {
    fontSize: 18,
    color: '#1b2a4e',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 26,
  },
  ctaButton: {
    backgroundColor: '#0a58ca',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0a58ca',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(10, 88, 202, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a58ca',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#3e4a6b',
    lineHeight: 20,
  },
  quickAccess: {
    marginBottom: 32,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickAccessCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  quickAccessText: {
    color: '#0a58ca',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});
