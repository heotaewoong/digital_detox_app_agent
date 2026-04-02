import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { useUserStore } from '@/store/useUserStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useReportStore } from '@/store/useReportStore';
import { useFocusStore } from '@/store/useFocusStore';
import { useSiteTrackingStore } from '@/store/useSiteTrackingStore';
import { useChallengeStore } from '@/store/useChallengeStore';
import { useAppControlStore } from '@/store/useAppControlStore';
import FloatingWidget from '@/components/ui/FloatingWidget';

export default function RootLayout() {
  const loadProfile = useUserStore((s) => s.loadProfile);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadSimulationReport = useReportStore((s) => s.loadSimulationReport);
  const loadFocusData = useFocusStore((s) => s.loadFocusData);
  const loadSiteData = useSiteTrackingStore((s) => s.loadData);
  const loadChallengeData = useChallengeStore((s) => s.loadData);
  const loadAppControlData = useAppControlStore((s) => s.loadData);

  useEffect(() => {
    loadProfile();
    loadSettings();
    loadSimulationReport();
    loadFocusData();
    loadSiteData();
    loadChallengeData();
    loadAppControlData();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A1A' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="block/intervention"
          options={{
            animation: 'fade',
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="analytics"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="weekly-report"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="emergency"
          options={{ animation: 'fade', presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="partners"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="challenges"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="whitelist-mode"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="sleep-mode"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="motivation-video"
          options={{ animation: 'fade', presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="block-stats"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="app-limits"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
      <FloatingWidget />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
});
