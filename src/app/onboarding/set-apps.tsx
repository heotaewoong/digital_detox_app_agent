import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/store/useUserStore';

const POPULAR_APPS = [
  { name: 'Instagram', packageName: 'com.instagram.android', emoji: '📸', category: 'social_media' as const },
  { name: 'TikTok', packageName: 'com.zhiliaoapp.musically', emoji: '🎵', category: 'social_media' as const },
  { name: 'YouTube', packageName: 'com.google.android.youtube', emoji: '📺', category: 'social_media' as const },
  { name: 'Twitter/X', packageName: 'com.twitter.android', emoji: '🐦', category: 'social_media' as const },
  { name: 'Facebook', packageName: 'com.facebook.katana', emoji: '👤', category: 'social_media' as const },
  { name: '네이버', packageName: 'com.nhn.android.search', emoji: '🟢', category: 'news' as const },
  { name: '쿠팡', packageName: 'com.coupang.mobile', emoji: '🛒', category: 'shopping' as const },
  { name: '배달의민족', packageName: 'com.sampleapp.baemin', emoji: '🍔', category: 'shopping' as const },
  { name: '당근마켓', packageName: 'com.towneers.www', emoji: '🥕', category: 'shopping' as const },
  { name: '게임 앱', packageName: 'com.game.app', emoji: '🎮', category: 'gaming' as const },
];

export default function SetAppsScreen() {
  const router = useRouter();
  const addBlockedApp = useUserStore((s) => s.addBlockedApp);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());

  const toggleApp = (packageName: string) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(packageName)) next.delete(packageName);
      else next.add(packageName);
      return next;
    });
  };

  const handleNext = () => {
    // 선택된 앱들을 차단 목록에 추가
    POPULAR_APPS.filter((a) => selectedApps.has(a.packageName)).forEach((app) => {
      addBlockedApp({
        name: app.name,
        packageName: app.packageName,
        category: app.category,
        isBlocked: true,
      });
    });
    router.push('/onboarding/set-keywords');
  };

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.step}>2/3 단계</Text>
          <Text style={s.title}>차단할 앱 선택</Text>
          <Text style={s.subtitle}>
            사용을 줄이고 싶은 앱을 선택하세요.{'\n'}
            나중에 설정에서 변경할 수 있습니다.
          </Text>
        </View>

        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{selectedApps.size}</Text>
            <Text style={s.statLabel}>선택된 앱</Text>
          </View>
        </View>

        {POPULAR_APPS.map((app) => {
          const isSelected = selectedApps.has(app.packageName);
          return (
            <TouchableOpacity
              key={app.packageName}
              style={[s.appCard, isSelected && s.appCardSelected]}
              onPress={() => toggleApp(app.packageName)}
            >
              <Text style={s.appEmoji}>{app.emoji}</Text>
              <View style={s.appInfo}>
                <Text style={s.appName}>{app.name}</Text>
                <Text style={s.appPackage}>{app.packageName}</Text>
              </View>
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={isSelected ? '#EF4444' : '#6B6B8D'}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.bottom}>
        <TouchableOpacity style={s.btnWrap} onPress={handleNext} activeOpacity={0.8}>
          <LinearGradient colors={['#6C5CE7', '#A855F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
            <Text style={s.btnText}>다음 단계</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNext}>
          <Text style={s.skipText}>건너뛰기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24 },
  header: { marginBottom: 24 },
  step: { fontSize: 14, fontWeight: '600', color: '#8B5CF6', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#A0A0C0', lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statNum: { fontSize: 24, fontWeight: '700', color: '#EF4444' },
  statLabel: { fontSize: 12, color: '#A0A0C0', marginTop: 4 },
  appCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  appCardSelected: { borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.08)' },
  appEmoji: { fontSize: 28 },
  appInfo: { flex: 1 },
  appName: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  appPackage: { fontSize: 11, color: '#6B6B8D', marginTop: 2 },
  bottom: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 12, alignItems: 'center' },
  btnWrap: { width: '100%' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 8 },
  btnText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  skipText: { fontSize: 14, color: '#6B6B8D', marginTop: 12 },
});
