import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🛡️',
    title: 'AI Content Guardian',
    subtitle: 'AI가 당신의 디지털 습관을 지키고\n꿈을 향해 나아가도록 도와줍니다',
    color: ['#6C5CE7', '#A855F7'] as [string, string],
  },
  {
    emoji: '🎯',
    title: '목표 기반 차단',
    subtitle: '당신의 목표와 꿈을 설정하면\nAI가 유해 콘텐츠를 자동으로 차단합니다',
    color: ['#10B981', '#059669'] as [string, string],
  },
  {
    emoji: '📊',
    title: '스마트 분석',
    subtitle: 'YouTube 영상을 공부/게임으로 분류하고\n사이트별 사용 시간을 추적합니다',
    color: ['#3B82F6', '#2563EB'] as [string, string],
  },
  {
    emoji: '🌲',
    title: '집중 모드',
    subtitle: '포모도로 타이머로 집중하면\n나무가 자라고 코인을 획득합니다',
    color: ['#F97316', '#EA580C'] as [string, string],
  },
  {
    emoji: '🔗',
    title: '크롬 확장 프로그램',
    subtitle: '브라우저에서도 실시간으로\n키워드와 사이트를 차단합니다',
    color: ['#EC4899', '#DB2777'] as [string, string],
  },
];

const FEATURES = [
  { icon: 'shield-checkmark' as const, title: 'AI 실시간 차단', desc: '키워드·URL·콘텐츠 분석', color: '#8B5CF6' },
  { icon: 'leaf' as const, title: '집중 모드', desc: '포모도로 + 나무 키우기', color: '#10B981' },
  { icon: 'calendar' as const, title: '스케줄 차단', desc: '시간대별 자동 차단', color: '#3B82F6' },
  { icon: 'bar-chart' as const, title: 'AI 분석', desc: 'YouTube 영상 분류 + 리포트', color: '#F97316' },
  { icon: 'trophy' as const, title: '챌린지', desc: '일일 챌린지 + 습관 트래커', color: '#FBBF24' },
  { icon: 'people' as const, title: '책임 파트너', desc: '함께 디톡스하는 친구', color: '#EC4899' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showFeatures, setShowFeatures] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (showFeatures) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % SLIDES.length;
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [showFeatures]);

  const slide = SLIDES[currentSlide];

  if (showFeatures) {
    return (
      <View style={s.container}>
        <ScrollView contentContainerStyle={s.featuresContent} showsVerticalScrollIndicator={false}>
          <Text style={s.featuresTitle}>주요 기능</Text>
          <View style={s.featuresGrid}>
            {FEATURES.map((f, i) => (
              <View key={i} style={s.featureCard}>
                <View style={[s.featureIconBg, { backgroundColor: `${f.color}20` }]}>
                  <Ionicons name={f.icon} size={24} color={f.color} />
                </View>
                <Text style={s.featureCardTitle}>{f.title}</Text>
                <Text style={s.featureCardDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
          <View style={s.bottom}>
            <TouchableOpacity style={s.btnWrap} onPress={() => router.push('/onboarding/set-goals')} activeOpacity={0.8}>
              <LinearGradient colors={['#6C5CE7', '#A855F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
                <Text style={s.btnText}>시작하기</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowFeatures(false)}>
              <Text style={s.backText}>← 돌아가기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={['#0A0A1A', '#1A0A2E']} style={s.bg}>
        {/* Slide */}
        <Animated.View style={[s.slideArea, { opacity: fadeAnim }]}>
          <LinearGradient colors={slide.color} style={s.emojiCircle}>
            <Text style={s.slideEmoji}>{slide.emoji}</Text>
          </LinearGradient>
          <Text style={s.slideTitle}>{slide.title}</Text>
          <Text style={s.slideSubtitle}>{slide.subtitle}</Text>
        </Animated.View>

        {/* Dots */}
        <View style={s.dotsRow}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setCurrentSlide(i)}>
              <View style={[s.dot, i === currentSlide && s.dotActive, { backgroundColor: i === currentSlide ? slide.color[0] : 'rgba(255,255,255,0.2)' }]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { num: '10+', label: '차단 기능' },
            { num: 'AI', label: '콘텐츠 분류' },
            { num: '100%', label: '온디바이스' },
          ].map((stat, i) => (
            <View key={i} style={s.statItem}>
              <Text style={s.statNum}>{stat.num}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={s.bottom}>
          <TouchableOpacity style={s.btnWrap} onPress={() => router.push('/onboarding/set-goals')} activeOpacity={0.8}>
            <LinearGradient colors={['#6C5CE7', '#A855F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
              <Text style={s.btnText}>지금 시작하기</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFeatures(true)}>
            <Text style={s.featuresLink}>모든 기능 보기 →</Text>
          </TouchableOpacity>
          <Text style={s.notice}>모든 데이터는 기기 내에서 처리됩니다</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  bg: { flex: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 48 },
  slideArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emojiCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  slideEmoji: { fontSize: 56 },
  slideTitle: { fontSize: 26, fontWeight: '700', color: '#FFF', textAlign: 'center', marginBottom: 16 },
  slideSubtitle: { fontSize: 16, color: '#A0A0C0', textAlign: 'center', lineHeight: 26, paddingHorizontal: 8 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', color: '#8B5CF6' },
  statLabel: { fontSize: 11, color: '#6B6B8D', marginTop: 4 },
  bottom: { gap: 12 },
  btnWrap: { width: '100%' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 8 },
  btnText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  featuresLink: { textAlign: 'center', fontSize: 14, color: '#8B5CF6', fontWeight: '600' },
  notice: { fontSize: 11, color: '#6B6B8D', textAlign: 'center' },
  backText: { textAlign: 'center', fontSize: 14, color: '#6B6B8D' },
  // Features page
  featuresContent: { paddingHorizontal: 24, paddingTop: 80, paddingBottom: 48 },
  featuresTitle: { fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: 24, textAlign: 'center' },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  featureCard: { width: (width - 60) / 2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 8 },
  featureIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureCardTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  featureCardDesc: { fontSize: 12, color: '#6B6B8D' },
});
