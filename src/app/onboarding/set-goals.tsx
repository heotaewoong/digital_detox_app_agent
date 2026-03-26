import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/store/useUserStore';
import { GoalCategory } from '@/types';

const GOAL_CATEGORIES: { key: GoalCategory; label: string; icon: string; emoji: string }[] = [
  { key: 'career', label: '커리어', icon: 'briefcase', emoji: '💼' },
  { key: 'health', label: '건강', icon: 'heart', emoji: '❤️' },
  { key: 'education', label: '교육', icon: 'book', emoji: '📚' },
  { key: 'relationship', label: '관계', icon: 'people', emoji: '👥' },
  { key: 'creative', label: '창작', icon: 'color-palette', emoji: '🎨' },
  { key: 'financial', label: '재무', icon: 'cash', emoji: '💰' },
];

export default function SetGoalsScreen() {
  const router = useRouter();
  const initProfile = useUserStore((s) => s.initProfile);
  const addGoal = useUserStore((s) => s.addGoal);

  const [name, setName] = useState('');
  const [dream, setDream] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory | null>(null);
  const [goalTitle, setGoalTitle] = useState('');

  const canProceed = name.trim().length > 0 && dream.trim().length > 0;

  const handleNext = () => {
    initProfile(name.trim(), [dream.trim()]);
    if (selectedCategory && goalTitle.trim()) {
      addGoal(goalTitle.trim(), `${dream.trim()}을 위한 목표`, selectedCategory);
    }
    router.push('/onboarding/set-keywords');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.step}>1/2 단계</Text>
          <Text style={styles.title}>당신의 꿈을 알려주세요</Text>
          <Text style={styles.subtitle}>
            AI가 당신의 꿈에 맞는 동기부여 콘텐츠를 생성합니다
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>이름</Text>
          <TextInput
            style={styles.input}
            placeholder="이름을 입력하세요"
            placeholderTextColor="#6B6B8D"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>나의 꿈 / 비전</Text>
          <TextInput
            style={[styles.input, styles.inputLarge]}
            placeholder="예: 세계적인 AI 엔지니어가 되고 싶어요"
            placeholderTextColor="#6B6B8D"
            value={dream}
            onChangeText={setDream}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>목표 카테고리 (선택)</Text>
          <View style={styles.categoryGrid}>
            {GOAL_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.key && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(
                  selectedCategory === cat.key ? null : cat.key
                )}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    selectedCategory === cat.key && styles.categoryLabelActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {selectedCategory && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>구체적인 목표</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 매일 1시간 코딩 공부하기"
              placeholderTextColor="#6B6B8D"
              value={goalTitle}
              onChangeText={setGoalTitle}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.buttonWrapper, !canProceed && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={canProceed ? ['#6C5CE7', '#A855F7'] : ['#333', '#444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>다음</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 32,
  },
  step: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#A0A0C0',
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A0A0C0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  inputLarge: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: '#8B5CF6',
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#A0A0C0',
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 12,
  },
  buttonWrapper: {
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
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
});
