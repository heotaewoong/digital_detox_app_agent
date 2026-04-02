import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/store/useUserStore';
import { DEFAULT_KEYWORD_GROUPS, CATEGORY_LABELS, RISK_LABELS } from '@/utils/constants';
import { KeywordGroup } from '@/types';

const RISK_COLORS = {
  low: '#10B981',
  medium: '#FBBF24',
  high: '#F97316',
  critical: '#EF4444',
};

export default function SetKeywordsScreen() {
  const router = useRouter();
  const updateKeywords = useUserStore((s) => s.updateKeywords);
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);

  const [groups, setGroups] = useState<KeywordGroup[]>(DEFAULT_KEYWORD_GROUPS);
  const [customKeyword, setCustomKeyword] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const toggleGroup = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
    );
  };

  const addCustomKeyword = () => {
    if (!customKeyword.trim()) return;
    const customGroup = groups.find((g) => g.id === 'custom_user');
    if (customGroup) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === 'custom_user'
            ? { ...g, keywords: [...g.keywords, customKeyword.trim()] }
            : g
        )
      );
    } else {
      setGroups((prev) => [
        ...prev,
        {
          id: 'custom_user',
          name: '나의 차단 키워드',
          category: 'custom',
          keywords: [customKeyword.trim()],
          enabled: true,
          riskLevel: 'high',
        },
      ]);
    }
    setCustomKeyword('');
  };

  const handleComplete = () => {
    updateKeywords(groups);
    completeOnboarding();
    router.replace('/(tabs)/dashboard');
  };

  const enabledCount = groups.filter((g) => g.enabled).length;
  const totalKeywords = groups
    .filter((g) => g.enabled)
    .reduce((sum, g) => sum + g.keywords.length, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.step}>3/3 단계</Text>
          <Text style={styles.title}>차단 키워드 설정</Text>
          <Text style={styles.subtitle}>
            감지할 콘텐츠 카테고리를 선택하세요.{'\n'}
            나중에 설정에서 변경할 수 있습니다.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{enabledCount}</Text>
            <Text style={styles.statLabel}>활성 카테고리</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalKeywords}</Text>
            <Text style={styles.statLabel}>차단 키워드</Text>
          </View>
        </View>

        {groups.map((group) => (
          <View key={group.id} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <View style={styles.groupInfo}>
                <View style={styles.groupTitleRow}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <View
                    style={[
                      styles.riskBadge,
                      { backgroundColor: RISK_COLORS[group.riskLevel] + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskText,
                        { color: RISK_COLORS[group.riskLevel] },
                      ]}
                    >
                      {RISK_LABELS[group.riskLevel]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.groupKeywords}>
                  {group.keywords.slice(0, 4).join(', ')}
                  {group.keywords.length > 4
                    ? ` 외 ${group.keywords.length - 4}개`
                    : ''}
                </Text>
              </View>
              <Switch
                value={group.enabled}
                onValueChange={() => toggleGroup(group.id)}
                trackColor={{ false: '#333', true: 'rgba(139,92,246,0.4)' }}
                thumbColor={group.enabled ? '#8B5CF6' : '#666'}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addCustomButton}
          onPress={() => setShowCustom(!showCustom)}
        >
          <Ionicons
            name={showCustom ? 'chevron-up' : 'add-circle'}
            size={20}
            color="#8B5CF6"
          />
          <Text style={styles.addCustomText}>커스텀 키워드 추가</Text>
        </TouchableOpacity>

        {showCustom && (
          <View style={styles.customInput}>
            <TextInput
              style={styles.input}
              placeholder="차단할 키워드 입력..."
              placeholderTextColor="#6B6B8D"
              value={customKeyword}
              onChangeText={setCustomKeyword}
              onSubmitEditing={addCustomKeyword}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={addCustomKeyword}
            >
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {groups.find((g) => g.id === 'custom_user') && (
          <View style={styles.customTags}>
            {groups
              .find((g) => g.id === 'custom_user')!
              .keywords.map((kw, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{kw}</Text>
                </View>
              ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={handleComplete}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6C5CE7', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Ionicons name="shield-checkmark" size={20} color="#FFF" />
            <Text style={styles.buttonText}>보호 시작하기</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
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
    marginBottom: 24,
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  statLabel: {
    fontSize: 12,
    color: '#A0A0C0',
    marginTop: 4,
  },
  groupCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupInfo: {
    flex: 1,
    marginRight: 12,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '600',
  },
  groupKeywords: {
    fontSize: 13,
    color: '#6B6B8D',
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 4,
  },
  addCustomText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  customInput: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 13,
    color: '#A855F7',
    fontWeight: '500',
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 12,
  },
  buttonWrapper: {
    width: '100%',
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
