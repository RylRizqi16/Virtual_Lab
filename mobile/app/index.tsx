import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [session, loading]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SimuLab</Text>
      <Text style={styles.subtitle}>Simulasi Fisika</Text>
      <ActivityIndicator size="large" color="#0a58ca" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f9ff',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0a58ca',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#3e4a6b',
    marginBottom: 32,
  },
  loader: {
    marginTop: 20,
  },
});
