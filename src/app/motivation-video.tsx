import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUserStore } from '@/store/useUserStore';
import { ChromeExtensionBridge } from '@/services/ChromeExtensionBridge';

const { width, height } = Dimensions.get('window');

/**
 * 목표 기반 AI 동기부여 영상
 * 차단 발생 시 사용자의 목표를 기반으로 동기부여 슬라이드를 보여줍니다.
 *
 * 향후 확장:
 * - AWS Bedrock으로 개인화 메시지 생성
 * - Amazon Polly로 TTS 음성 추가
 * - 실제 mp4 영상 생성 및 저장
 */

interface Slide {
  emoji: string;
  title: string;
  message: string;
  color: [string, string];
}

function generateSlides(goals: string[], dreams: string[], blockedKeyword: string): Slide[] {
  const goalText = goals.length > 0 ? goals[0] : '더 나은 나';
  const dreamText = dreams.length > 0 ? dreams[0] : '꿈';

  return [
    {
      emoji: '🛡️',
      title: '차단되었습니다',
      message: `"${blockedKeyword || '유해 콘텐츠'}"가 감지되어 차단했습니다.\n지금 이 순간이 중요합니다.`,
      color: ['#1E1B4B', '#312E81'],
    },
    {
      emoji: '🎯',
      title: '당신의 목표',
      message: `"${goalText}"\n\n이 목표를 위해 지금 이 시간이 필요합니다.`,
      color: ['#0F172A', '#1E3A5F'],
    },
    {
      emoji: '💭',
      title: '잠깐 생각해보세요',
      message: `지금 보려던 것이\n${goalText}에 도움이 되나요?\n\n아니라면, 더 나은 선택을 할 수 있어요.`,
      color: ['#1A1A35', '#2D1B69'],
    },
    {
      emoji: '⏰',
      title: '시간의 가치',
      message: `지금 이 30분을\n${goalText}에 투자하면\n1년 후 당신은 달라져 있을 거예요.`,
      color: ['#0F2027', '#203A43'],
    },
    {
      emoji: '🌟',
      title: '당신의 꿈',
      message: `"${dreamText}"\n\n그 꿈을 이루는 사람들은\n지금 이 순간 다른 선택을 합니다.`,
      color: ['#1A0533', '#2D1B69'],
    },
    {
      emoji: '💪',
      title: '지금 할 수 있는 것',
      message: `• 25분 집중 세션 시작하기\n• 목표 관련 책 읽기\n• 운동 10분 하기\n• 계획 세우기`,
      color: ['#0A2E0A', '#1A4A1A'],
    },
    {
      emoji: '🚀',
      title: '시작하세요',
      message: `완벽한 때는 없습니다.\n지금 이 순간이\n가장 좋은 시작점입니다.`,
      color: ['#1A0A2E', '#2D1B69'],
    },
  ];
}

export default function MotivationVideoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const profile = useUserStore((s) => s.profile);

  const blockedKeyword = (params.keyword as string) || '';
  const goals = profile?.goals.map(g => g.title) || [];
  const dreams = profile?.dreams || [];

  const slides = generateSlides(goals, dreams, blockedKeyword);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoMeta, setGeneratedVideoMeta] = useState<any>(null);
  const [lambdaEndpoint, setLambdaEndpoint] = useState<string | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const SLIDE_DURATION = 4000;

  // Lambda 엔드포인트 확인 및 영상 생성 트리거
  useEffect(() => {
    const endpoint = typeof window !== 'undefined'
      ? window.localStorage?.getItem('lambda_endpoint')
      : null;
    setLambdaEndpoint(endpoint);

    if (endpoint && goals.length > 0) {
      triggerVideoGeneration(endpoint);
    }
  }, []);

  const triggerVideoGeneration = async (endpoint: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id || 'anonymous',
          goals: profile?.goals.map(g => ({ title: g.title, description: g.description, category: g.category })) || [],
          dreams: profile?.dreams || [],
          blockedKeyword,
          videoStyle: 'cinematic',
        }),
      });
      const result = await response.json();
      if (result.videoUrl) {
        const metaResponse = await fetch(result.videoUrl);
        const meta = await metaResponse.json();
        setGeneratedVideoMeta(meta);
        setIsPlaying(false); // 슬라이드쇼 중지
      }
    } catch (e) {
      console.log('Lambda 영상 생성 실패:', e);
    } finally {
      setIsGenerating(false);
    }
  }; // 4초

  const goToSlide = (index: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -50, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    setCurrentSlide(index);
    progressAnim.setValue(0);
  };

  useEffect(() => {
    if (!isPlaying) return;

    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: SLIDE_DURATION,
      useNativeDriver: false,
    }).start();

    intervalRef.current = setTimeout(() => {
      if (currentSlide < slides.length - 1) {
        goToSlide(currentSlide + 1);
      } else {
        setIsPlaying(false);
      }
    }, SLIDE_DURATION);

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [currentSlide, isPlaying]);

  const slide = slides[currentSlide];

  // AI 생성 영상이 있으면 그것을 표시
  if (generatedVideoMeta) {
    return (
      <View style={st.container}>
        <LinearGradient colors={['#0A0A1A', '#1A0A2E']} style={st.gradient}>
          <View style={st.header}>
            <TouchableOpacity onPress={() => router.back()} style={st.closeBtn}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <Text style={st.headerTitle}>✨ AI가 만든 당신의 영상</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={{ flex: 1, padding: 20 }}>
            <Text style={[st.slideTitle, { marginBottom: 8 }]}>{generatedVideoMeta.title}</Text>
            <Text style={[st.slideMessage, { marginBottom: 24 }]}>{generatedVideoMeta.narration}</Text>

            {/* AI 생성 클립 슬라이드쇼 */}
            <AIVideoPlayer clips={generatedVideoMeta.clips} audioUrl={generatedVideoMeta.audioUrl} />
          </View>

          <View style={st.actionRow}>
            <TouchableOpacity style={st.actionBtnPrimary} onPress={() => router.replace('/(tabs)/focus')}>
              <Ionicons name="leaf" size={20} color="white" />
              <Text style={st.actionBtnText}>집중 세션 시작</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={st.container}>
      <LinearGradient colors={slide.color} style={st.gradient}>
        {/* 생성 중 표시 */}
        {isGenerating && (
          <View style={st.generatingBanner}>
            <ActivityIndicator size="small" color="#A855F7" />
            <Text style={st.generatingText}>AI가 당신만의 영상을 생성 중...</Text>
          </View>
        )}

        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.back()} style={st.closeBtn}>
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>AI 동기부여</Text>
          <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)} style={st.playBtn}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* Progress bars */}
        <View style={st.progressRow}>
          {slides.map((_, i) => (
            <View key={i} style={st.progressBarBg}>
              {i < currentSlide ? (
                <View style={[st.progressBarFill, { width: '100%' }]} />
              ) : i === currentSlide ? (
                <Animated.View style={[st.progressBarFill, {
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                }]} />
              ) : null}
            </View>
          ))}
        </View>

        {/* Slide content */}
        <Animated.View style={[st.slideContent, { transform: [{ translateY: slideAnim }] }]}>
          <Text style={st.slideEmoji}>{slide.emoji}</Text>
          <Text style={st.slideTitle}>{slide.title}</Text>
          <Text style={st.slideMessage}>{slide.message}</Text>
        </Animated.View>

        {/* Navigation */}
        <View style={st.navRow}>
          <TouchableOpacity
            style={[st.navBtn, currentSlide === 0 && { opacity: 0.3 }]}
            onPress={() => currentSlide > 0 && goToSlide(currentSlide - 1)}
            disabled={currentSlide === 0}
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>

          <View style={st.dotRow}>
            {slides.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
                <View style={[st.dot, i === currentSlide && st.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[st.navBtn, currentSlide === slides.length - 1 && { opacity: 0.3 }]}
            onPress={() => currentSlide < slides.length - 1 && goToSlide(currentSlide + 1)}
            disabled={currentSlide === slides.length - 1}
          >
            <Ionicons name="chevron-forward" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Action buttons */}
        {currentSlide === slides.length - 1 && (
          <View style={st.actionRow}>
            <TouchableOpacity style={st.actionBtnPrimary} onPress={() => router.replace('/(tabs)/focus')}>
              <Ionicons name="leaf" size={20} color="white" />
              <Text style={st.actionBtnText}>집중 세션 시작</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.actionBtnSecondary} onPress={() => router.back()}>
              <Text style={st.actionBtnSecText}>돌아가기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Goal reminder */}
        {goals.length > 0 && (
          <View style={st.goalReminder}>
            <Text style={st.goalReminderText}>🎯 {goals[0]}</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

// AI 생성 영상 플레이어 컴포넌트
function AIVideoPlayer({ clips, audioUrl }: { clips: any[]; audioUrl?: string }) {
  const [currentClip, setCurrentClip] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!clips || clips.length === 0) return;
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
      setCurrentClip(prev => (prev + 1) % clips.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [clips]);

  const clip = clips?.[currentClip];
  if (!clip) return null;

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[{ flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1A1A35' }, { opacity: fadeAnim }]}>
        {clip.url && clip.type === 'image' ? (
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🎬</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFF', textAlign: 'center', marginBottom: 8 }}>
              {clip.title}
            </Text>
            <Text style={{ fontSize: 14, color: '#A0A0C0', textAlign: 'center', lineHeight: 22 }}>
              {clip.situation}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>
              {['🌅', '💪', '🎯', '⭐', '🚀', '🏆'][currentClip % 6]}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFF', textAlign: 'center', marginBottom: 8 }}>
              {clip.title}
            </Text>
            <Text style={{ fontSize: 14, color: '#A0A0C0', textAlign: 'center', lineHeight: 22 }}>
              {clip.situation}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* 진행 점 */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
        {clips.map((_, i) => (
          <View key={i} style={{
            width: i === currentClip ? 20 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === currentClip ? '#8B5CF6' : 'rgba(255,255,255,0.2)',
          }} />
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 20, marginBottom: 40 },
  progressBarBg: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 2 },
  slideContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  slideEmoji: { fontSize: 80, marginBottom: 24 },
  slideTitle: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 20 },
  slideMessage: { fontSize: 18, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 28 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20 },
  navBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  dotRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: '#FFFFFF', width: 20 },
  actionRow: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  actionBtnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(16,185,129,0.8)', borderRadius: 16, paddingVertical: 16 },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  actionBtnSecondary: { alignItems: 'center', paddingVertical: 12 },
  actionBtnSecText: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  goalReminder: { marginHorizontal: 20, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 },
  goalReminderText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  generatingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(168,85,247,0.15)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, marginHorizontal: 20, marginBottom: 8 },
  generatingText: { fontSize: 12, color: '#A855F7', fontWeight: '600' },
});
