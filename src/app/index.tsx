import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useUserStore } from '@/store/useUserStore';

export default function SplashScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const isLoading = useUserStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (profile?.onboardingCompleted) {
        router.replace('/(tabs)/dashboard');
      } else {
        router.replace('/onboarding/welcome');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isLoading, profile]);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🛡️</Text>
      <Text style={styles.title}>AI Content Guardian</Text>
      <Text style={styles.subtitle}>디지털 습관을 지키는 AI 에이전트</Text>
      <ActivityIndicator
        size="large"
        color="#8B5CF6"
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0C0',
    marginBottom: 48,
  },
  loader: {
    marginTop: 24,
  },
});
