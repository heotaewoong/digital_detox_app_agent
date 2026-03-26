import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const FEATURES = [
  { icon: 'shield-checkmark' as const, title: 'AI 콘텐츠 감시', desc: '유해 콘텐츠를 실시간 감지' },
  { icon: 'bulb' as const, title: '맞춤 동기부여', desc: '당신의 꿈에 맞는 메시지' },
  { icon: 'bar-chart' as const, title: '스마트 리포트', desc: '디지털 습관 분석 대시보드' },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🛡️</Text>
        <Text style={styles.title}>AI Content Guardian</Text>
        <Text style={styles.subtitle}>
          AI가 당신의 디지털 습관을 지키고{'\n'}
          꿈을 향해 나아가도록 도와줍니다
        </Text>
      </View>

      <View style={styles.features}>
        {FEATURES.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <View style={styles.iconCircle}>
              <Ionicons name={feature.icon} size={24} color="#8B5CF6" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={() => router.push('/onboarding/set-goals')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6C5CE7', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>시작하기</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.notice}>
          이 앱은 접근성 서비스 권한이 필요합니다.{'\n'}
          모든 데이터는 기기 내에서 처리됩니다.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0C0',
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    gap: 20,
    marginBottom: 48,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#A0A0C0',
  },
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  buttonWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notice: {
    fontSize: 12,
    color: '#6B6B8D',
    textAlign: 'center',
    lineHeight: 18,
  },
});
