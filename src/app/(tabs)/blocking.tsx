import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '@/store/useUserStore';
import { ChromeExtensionBridge } from '@/services/ChromeExtensionBridge';
import { ContentCategory, RiskLevel } from '@/types';

const RISK_LEVELS: { key: RiskLevel; label: string; color: string }[] = [
  { key: 'low', label: '낮음', color: '#10B981' },
  { key: 'medium', label: '보통', color: '#FBBF24' },
  { key: 'high', label: '높음', color: '#F97316' },
  { key: 'critical', label: '위험', color: '#EF4444' },
];

const CATEGORY_INFO: Record<ContentCategory, { emoji: string; label: string }> = {
  gambling: { emoji: '🎰', label: '도박' },
  gaming: { emoji: '🎮', label: '게임' },
  adult: { emoji: '🔞', label: '성인' },
  social_media: { emoji: '📱', label: 'SNS' },
  shopping: { emoji: '🛒', label: '쇼핑' },
  news: { emoji: '📰', label: '뉴스' },
  custom: { emoji: '✏️', label: '사용자' },
};

const POPULAR_APPS = [
  { name: 'Instagram', packageName: 'com.instagram.android', category: 'social_media' as ContentCategory },
  { name: 'TikTok', packageName: 'com.zhiliaoapp.musically', category: 'social_media' as ContentCategory },
  { name: 'YouTube', packageName: 'com.google.android.youtube', category: 'social_media' as ContentCategory },
  { name: 'Twitter/X', packageName: 'com.twitter.android', category: 'social_media' as ContentCategory },
  { name: 'Facebook', packageName: 'com.facebook.katana', category: 'social_media' as ContentCategory },
  { name: '카카오톡', packageName: 'com.kakao.talk', category: 'social_media' as ContentCategory },
  { name: '네이버', packageName: 'com.nhn.android.search', category: 'news' as ContentCategory },
  { name: '쿠팡', packageName: 'com.coupang.mobile', category: 'shopping' as ContentCategory },
  { name: '배달의민족', packageName: 'com.sampleapp.baemin', category: 'shopping' as ContentCategory },
  { name: '당근마켓', packageName: 'com.towneers.www', category: 'shopping' as ContentCategory },
];

type TabMode = 'keywords' | 'apps';

export default function BlockingScreen() {
  const profile = useUserStore((s) => s.profile);
  const toggleKeywordGroup = useUserStore((s) => s.toggleKeywordGroup);
  const addCustomKeywordGroup = useUserStore((s) => s.addCustomKeywordGroup);
  const addKeywordToGroup = useUserStore((s) => s.addKeywordToGroup);
  const removeKeywordFromGroup = useUserStore((s) => s.removeKeywordFromGroup);
  const removeKeywordGroup = useUserStore((s) => s.removeKeywordGroup);
  const addBlockedApp = useUserStore((s) => s.addBlockedApp);
  const removeBlockedApp = useUserStore((s) => s.removeBlockedApp);
  const toggleBlockedApp = useUserStore((s) => s.toggleBlockedApp);
  const updateBlockedApp = useUserStore((s) => s.updateBlockedApp);

  const [tabMode, setTabMode] = useState<TabMode>('keywords');
  // Keyword modal
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [newKeywords, setNewKeywords] = useState<string[]>([]);
  const [newRiskLevel, setNewRiskLevel] = useState<RiskLevel>('medium');
  // Add keyword to existing group
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [addToGroupInput, setAddToGroupInput] = useState('');
  // App modal
  const [showAppModal, setShowAppModal] = useState(false);
  const [customAppName, setCustomAppName] = useState('');
  const [customAppPackage, setCustomAppPackage] = useState('');
  const [appDailyLimit, setAppDailyLimit] = useState('');

  const keywordGroups = profile?.blockedKeywords || [];
  const blockedApps = profile?.blockedApps || [];

  // 크롬 확장 프로그램에서 키워드 변경 이벤트 수신
  useEffect(() => {
    const cleanup = ChromeExtensionBridge.onKeywordsUpdatedFromExtension((groups) => {
      // 확장 프로그램에서 추가된 custom_user 그룹의 키워드를 앱에 반영
      const customGroup = groups.find((g: any) => g.id === 'custom_user');
      if (customGroup && customGroup.keywords.length > 0) {
        const existingCustom = profile?.blockedKeywords.find((g) => g.id === 'custom_user');
        const existingKeywords = existingCustom?.keywords || [];
        const newKeywords = customGroup.keywords.filter((kw: string) => !existingKeywords.includes(kw));
        newKeywords.forEach((kw: string) => {
          addKeywordToGroup('custom_user', kw);
        });
        if (newKeywords.length > 0) {
          Alert.alert('🔄 동기화', `크롬 확장 프로그램에서 ${newKeywords.length}개 키워드가 추가됐습니다.`);
        }
      }
    });
    return cleanup;
  }, [profile?.blockedKeywords]);

  // --- Keyword handlers ---
  const handleAddKeywordToList = useCallback(() => {
    const kw = newKeywordInput.trim();
    if (kw && !newKeywords.includes(kw)) {
      setNewKeywords((prev) => [...prev, kw]);
      setNewKeywordInput('');
    }
  }, [newKeywordInput, newKeywords]);

  const handleRemoveFromNewList = useCallback((kw: string) => {
    setNewKeywords((prev) => prev.filter((k) => k !== kw));
  }, []);

  const handleCreateGroup = useCallback(() => {
    if (!newGroupName.trim() || newKeywords.length === 0) return;
    addCustomKeywordGroup(newGroupName.trim(), newKeywords);
    // After creating, update risk level if not medium
    // (addCustomKeywordGroup defaults to medium)
    setNewGroupName('');
    setNewKeywords([]);
    setNewKeywordInput('');
    setNewRiskLevel('medium');
    setShowKeywordModal(false);
  }, [newGroupName, newKeywords, addCustomKeywordGroup]);

  const handleAddToExistingGroup = useCallback((groupId: string) => {
    const kw = addToGroupInput.trim();
    if (kw) {
      addKeywordToGroup(groupId, kw);
      setAddToGroupInput('');
    }
  }, [addToGroupInput, addKeywordToGroup]);

  const handleDeleteGroup = useCallback((groupId: string, groupName: string) => {
    Alert.alert('그룹 삭제', `"${groupName}" 그룹을 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeKeywordGroup(groupId) },
    ]);
  }, [removeKeywordGroup]);

  // --- App handlers ---
  const handleAddPopularApp = useCallback((app: typeof POPULAR_APPS[0]) => {
    const alreadyAdded = blockedApps.some((a) => a.packageName === app.packageName);
    if (alreadyAdded) {
      Alert.alert('알림', `${app.name}은(는) 이미 추가되어 있습니다.`);
      return;
    }
    addBlockedApp({
      name: app.name,
      packageName: app.packageName,
      category: app.category,
      isBlocked: true,
    });
  }, [blockedApps, addBlockedApp]);

  const handleAddCustomApp = useCallback(() => {
    if (!customAppName.trim()) return;
    addBlockedApp({
      name: customAppName.trim(),
      packageName: customAppPackage.trim() || `custom.${customAppName.trim().toLowerCase().replace(/\s/g, '.')}`,
      category: 'custom',
      isBlocked: true,
      dailyLimitMinutes: appDailyLimit ? parseInt(appDailyLimit, 10) : undefined,
    });
    setCustomAppName('');
    setCustomAppPackage('');
    setAppDailyLimit('');
    setShowAppModal(false);
  }, [customAppName, customAppPackage, appDailyLimit, addBlockedApp]);

  const handleDeleteApp = useCallback((id: string, name: string) => {
    Alert.alert('앱 삭제', `"${name}"을(를) 차단 목록에서 제거하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeBlockedApp(id) },
    ]);
  }, [removeBlockedApp]);

  const activeKeywordCount = keywordGroups.filter((g) => g.enabled).reduce((sum, g) => sum + g.keywords.length, 0);
  const activeAppCount = blockedApps.filter((a) => a.isBlocked).length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>차단 관리</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{activeKeywordCount}</Text>
            <Text style={styles.statLabel}>차단 키워드</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{activeAppCount}</Text>
            <Text style={styles.statLabel}>차단 앱</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{keywordGroups.length}</Text>
            <Text style={styles.statLabel}>키워드 그룹</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tab, tabMode === 'keywords' && styles.tabActive]}
            onPress={() => setTabMode('keywords')}
          >
            <Ionicons name="text" size={18} color={tabMode === 'keywords' ? '#8B5CF6' : '#6B6B8D'} />
            <Text style={[styles.tabText, tabMode === 'keywords' && styles.tabTextActive]}>키워드 차단</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tabMode === 'apps' && styles.tabActive]}
            onPress={() => setTabMode('apps')}
          >
            <Ionicons name="apps" size={18} color={tabMode === 'apps' ? '#8B5CF6' : '#6B6B8D'} />
            <Text style={[styles.tabText, tabMode === 'apps' && styles.tabTextActive]}>앱 차단</Text>
          </TouchableOpacity>
        </View>

        {tabMode === 'keywords' ? renderKeywordsTab() : renderAppsTab()}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => tabMode === 'keywords' ? setShowKeywordModal(true) : setShowAppModal(true)}
      >
        <LinearGradient colors={['#6C5CE7', '#A855F7']} style={styles.fabGrad}>
          <Ionicons name="add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {renderKeywordModal()}
      {renderAppModal()}
    </View>
  );

  // ─── Keywords Tab ───
  function renderKeywordsTab() {
    return (
      <View>
        {keywordGroups.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="text-outline" size={48} color="#6B6B8D" />
            <Text style={styles.emptyText}>차단 키워드가 없어요</Text>
            <Text style={styles.emptySubtext}>+ 버튼을 눌러 키워드 그룹을 추가하세요</Text>
          </View>
        ) : (
          keywordGroups.map((group) => {
            const catInfo = CATEGORY_INFO[group.category] || CATEGORY_INFO.custom;
            const riskInfo = RISK_LEVELS.find((r) => r.key === group.riskLevel);
            const isExpanded = expandedGroupId === group.id;

            return (
              <View key={group.id} style={styles.groupCard}>
                {/* Group Header */}
                <TouchableOpacity
                  style={styles.groupHeader}
                  onPress={() => setExpandedGroupId(isExpanded ? null : group.id)}
                >
                  <View style={styles.groupTitleRow}>
                    <Text style={styles.groupEmoji}>{catInfo.emoji}</Text>
                    <View style={styles.groupTitleInfo}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <View style={styles.groupMeta}>
                        <View style={[styles.riskBadge, { backgroundColor: `${riskInfo?.color}20` }]}>
                          <Text style={[styles.riskBadgeText, { color: riskInfo?.color }]}>
                            {riskInfo?.label}
                          </Text>
                        </View>
                        <Text style={styles.keywordCount}>{group.keywords.length}개 키워드</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.groupActions}>
                    <Switch
                      value={group.enabled}
                      onValueChange={() => toggleKeywordGroup(group.id)}
                      trackColor={{ false: '#333', true: 'rgba(139,92,246,0.4)' }}
                      thumbColor={group.enabled ? '#8B5CF6' : '#666'}
                    />
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#6B6B8D"
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded: keyword list + add input */}
                {isExpanded && (
                  <View style={styles.groupExpanded}>
                    <View style={styles.keywordChips}>
                      {group.keywords.map((kw) => (
                        <View key={kw} style={styles.keywordChip}>
                          <Text style={styles.keywordChipText}>{kw}</Text>
                          <TouchableOpacity onPress={() => removeKeywordFromGroup(group.id, kw)}>
                            <Ionicons name="close-circle" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    {/* Add keyword input */}
                    <View style={styles.addKeywordRow}>
                      <TextInput
                        style={styles.addKeywordInput}
                        placeholder="키워드 입력..."
                        placeholderTextColor="#6B6B8D"
                        value={addToGroupInput}
                        onChangeText={setAddToGroupInput}
                        onSubmitEditing={() => handleAddToExistingGroup(group.id)}
                        returnKeyType="done"
                      />
                      <TouchableOpacity
                        style={styles.addKeywordBtn}
                        onPress={() => handleAddToExistingGroup(group.id)}
                      >
                        <Ionicons name="add-circle" size={28} color="#8B5CF6" />
                      </TouchableOpacity>
                    </View>

                    {/* Delete group */}
                    {group.category === 'custom' && (
                      <TouchableOpacity
                        style={styles.deleteGroupBtn}
                        onPress={() => handleDeleteGroup(group.id, group.name)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text style={styles.deleteGroupText}>그룹 삭제</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    );
  }

  // ─── Apps Tab ───
  function renderAppsTab() {
    return (
      <View>
        {/* Popular Apps Quick Add */}
        <Text style={styles.sectionLabel}>인기 앱 빠른 추가</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularAppsScroll}>
          {POPULAR_APPS.map((app) => {
            const isAdded = blockedApps.some((a) => a.packageName === app.packageName);
            return (
              <TouchableOpacity
                key={app.packageName}
                style={[styles.popularAppChip, isAdded && styles.popularAppChipAdded]}
                onPress={() => handleAddPopularApp(app)}
                disabled={isAdded}
              >
                <Text style={styles.popularAppName}>{app.name}</Text>
                {isAdded && <Ionicons name="checkmark" size={14} color="#10B981" />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Blocked Apps List */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>차단된 앱 목록</Text>
        {blockedApps.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="apps-outline" size={48} color="#6B6B8D" />
            <Text style={styles.emptyText}>차단된 앱이 없어요</Text>
            <Text style={styles.emptySubtext}>위에서 앱을 선택하거나 + 버튼으로 추가하세요</Text>
          </View>
        ) : (
          blockedApps.map((app) => {
            const catInfo = CATEGORY_INFO[app.category] || CATEGORY_INFO.custom;
            return (
              <View key={app.id} style={styles.appCard}>
                <View style={styles.appInfo}>
                  <View style={styles.appIcon}>
                    <Text style={styles.appIconText}>{catInfo.emoji}</Text>
                  </View>
                  <View style={styles.appDetails}>
                    <Text style={styles.appName}>{app.name}</Text>
                    <Text style={styles.appPackage}>{app.packageName}</Text>
                    {app.dailyLimitMinutes && (
                      <Text style={styles.appLimit}>
                        일일 제한: {app.dailyLimitMinutes}분
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.appActions}>
                  <TouchableOpacity
                    onPress={() => toggleBlockedApp(app.id)}
                    style={[styles.toggleBtn, { backgroundColor: app.isBlocked ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)' }]}
                  >
                    <Ionicons
                      name={app.isBlocked ? 'ban' : 'checkmark-circle-outline'}
                      size={20}
                      color={app.isBlocked ? '#EF4444' : '#6B6B8D'}
                    />
                    <Text style={[styles.toggleBtnText, { color: app.isBlocked ? '#EF4444' : '#6B6B8D' }]}>
                      {app.isBlocked ? '차단 중' : '허용'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteApp(app.id, app.name)}>
                    <Ionicons name="trash-outline" size={18} color="#6B6B8D" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  }

  // ─── Keyword Modal ───
  function renderKeywordModal() {
    return (
      <Modal visible={showKeywordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>새 키워드 그룹</Text>
              <TouchableOpacity onPress={() => setShowKeywordModal(false)}>
                <Ionicons name="close" size={24} color="#A0A0C0" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>그룹 이름</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 나만의 차단 목록"
              placeholderTextColor="#6B6B8D"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />

            <Text style={styles.inputLabel}>위험도</Text>
            <View style={styles.riskRow}>
              {RISK_LEVELS.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.riskChip, newRiskLevel === r.key && { borderColor: r.color, backgroundColor: `${r.color}15` }]}
                  onPress={() => setNewRiskLevel(r.key)}
                >
                  <View style={[styles.riskDot, { backgroundColor: r.color }]} />
                  <Text style={[styles.riskChipText, newRiskLevel === r.key && { color: r.color }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>키워드 추가</Text>
            <View style={styles.addKeywordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="차단할 키워드 입력"
                placeholderTextColor="#6B6B8D"
                value={newKeywordInput}
                onChangeText={setNewKeywordInput}
                onSubmitEditing={handleAddKeywordToList}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addKeywordBtn} onPress={handleAddKeywordToList}>
                <Ionicons name="add-circle" size={32} color="#8B5CF6" />
              </TouchableOpacity>
            </View>

            {newKeywords.length > 0 && (
              <View style={styles.keywordChips}>
                {newKeywords.map((kw) => (
                  <View key={kw} style={styles.keywordChip}>
                    <Text style={styles.keywordChipText}>{kw}</Text>
                    <TouchableOpacity onPress={() => handleRemoveFromNewList(kw)}>
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, (!newGroupName.trim() || newKeywords.length === 0) && { opacity: 0.5 }]}
              onPress={handleCreateGroup}
              disabled={!newGroupName.trim() || newKeywords.length === 0}
            >
              <LinearGradient colors={['#6C5CE7', '#A855F7']} style={styles.saveBtnGrad}>
                <Text style={styles.saveBtnText}>그룹 생성 ({newKeywords.length}개 키워드)</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ─── App Modal ───
  function renderAppModal() {
    return (
      <Modal visible={showAppModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>앱 직접 추가</Text>
              <TouchableOpacity onPress={() => setShowAppModal(false)}>
                <Ionicons name="close" size={24} color="#A0A0C0" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>앱 이름</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 게임 앱 이름"
              placeholderTextColor="#6B6B8D"
              value={customAppName}
              onChangeText={setCustomAppName}
            />

            <Text style={styles.inputLabel}>패키지명 (선택)</Text>
            <TextInput
              style={styles.input}
              placeholder="예: com.example.app"
              placeholderTextColor="#6B6B8D"
              value={customAppPackage}
              onChangeText={setCustomAppPackage}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>일일 사용 제한 (분, 선택)</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 30"
              placeholderTextColor="#6B6B8D"
              value={appDailyLimit}
              onChangeText={setAppDailyLimit}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.saveBtn, !customAppName.trim() && { opacity: 0.5 }]}
              onPress={handleAddCustomApp}
              disabled={!customAppName.trim()}
            >
              <LinearGradient colors={['#6C5CE7', '#A855F7']} style={styles.saveBtnGrad}>
                <Text style={styles.saveBtnText}>앱 차단 추가</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 20 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statNumber: { fontSize: 22, fontWeight: '700', color: '#8B5CF6' },
  statLabel: { fontSize: 11, color: '#6B6B8D', marginTop: 4 },

  // Tab Switcher
  tabSwitcher: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 4, marginBottom: 20,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  tabActive: { backgroundColor: 'rgba(139,92,246,0.2)' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B6B8D' },
  tabTextActive: { color: '#8B5CF6' },

  // Section
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#6B6B8D', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },

  // Empty
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#6B6B8D', marginTop: 6 },

  // Keyword Group Card
  groupCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14,
  },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  groupEmoji: { fontSize: 28 },
  groupTitleInfo: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  groupMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  riskBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  riskBadgeText: { fontSize: 11, fontWeight: '600' },
  keywordCount: { fontSize: 12, color: '#6B6B8D' },
  groupActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Expanded Group
  groupExpanded: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  keywordChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  keywordChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  keywordChipText: { fontSize: 13, color: '#FFFFFF' },
  addKeywordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  addKeywordInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#FFFFFF',
  },
  addKeywordBtn: { padding: 2 },
  deleteGroupBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8,
  },
  deleteGroupText: { fontSize: 13, color: '#EF4444', fontWeight: '500' },

  // Popular Apps
  popularAppsScroll: { marginBottom: 4 },
  popularAppChip: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, marginRight: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  popularAppChipAdded: { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)' },
  popularAppName: { fontSize: 13, fontWeight: '500', color: '#FFFFFF' },

  // App Card
  appCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  appInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  appIcon: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  appIconText: { fontSize: 20 },
  appDetails: { flex: 1 },
  appName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  appPackage: { fontSize: 11, color: '#6B6B8D', marginTop: 2 },
  appLimit: { fontSize: 12, color: '#FBBF24', marginTop: 2 },
  appActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  toggleBtnText: { fontSize: 12, fontWeight: '600' },

  // FAB
  fab: { position: 'absolute', bottom: 100, right: 20 },
  fabGrad: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1A1A35', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#A0A0C0', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#FFFFFF',
  },
  riskRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  riskChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  riskChipText: { fontSize: 12, fontWeight: '600', color: '#A0A0C0' },
  saveBtn: { marginTop: 24 },
  saveBtnGrad: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  bottomSpacer: { height: 120 },
});
