import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Switch, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppControlStore, ScheduleRule } from '@/store/useAppControlStore';
import { useUserStore } from '@/store/useUserStore';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const MODE_INFO = {
  block_all:      { label: '전체 차단',    color: '#EF4444', desc: '모든 앱/사이트 차단', icon: 'lock-closed' as const },
  block_selected: { label: '선택 차단',    color: '#F97316', desc: '선택한 앱/사이트만 차단', icon: 'ban' as const },
  focus_only:     { label: '집중 모드',    color: '#10B981', desc: '알림 무음 + 선택 앱 차단', icon: 'leaf' as const },
  keyword_only:   { label: '키워드 차단',  color: '#8B5CF6', desc: '선택한 키워드 그룹만 차단', icon: 'text' as const },
};

const POPULAR_APPS = [
  { name: 'YouTube', emoji: '📺' },
  { name: 'Instagram', emoji: '📸' },
  { name: 'TikTok', emoji: '🎵' },
  { name: 'Twitter/X', emoji: '🐦' },
  { name: 'Facebook', emoji: '👤' },
  { name: '카카오톡', emoji: '💛' },
  { name: '네이버', emoji: '🟢' },
  { name: '쿠팡', emoji: '🛒' },
  { name: '게임', emoji: '🎮' },
  { name: 'Netflix', emoji: '🎬' },
  { name: 'Twitch', emoji: '🟣' },
  { name: '배달의민족', emoji: '🍔' },
];

const POPULAR_DOMAINS = [
  'youtube.com', 'instagram.com', 'tiktok.com', 'twitter.com',
  'facebook.com', 'reddit.com', 'twitch.tv', 'netflix.com',
  'coupang.com', 'naver.com', 'op.gg', 'steam.com',
];

export default function ScheduleScreen() {
  const {
    schedules, addSchedule, updateSchedule,
    removeSchedule: removeScheduleFromStore,
    toggleSchedule: toggleScheduleFromStore,
    isCurrentlyScheduleBlocked, loadData,
  } = useAppControlStore();
  const profile = useUserStore((s) => s.profile);
  const keywordGroups = profile?.blockedKeywords || [];

  useEffect(() => { loadData(); }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('18:00');
  const [formDays, setFormDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formMode, setFormMode] = useState<ScheduleRule['mode']>('block_selected');
  const [formBlockedApps, setFormBlockedApps] = useState<string[]>([]);
  const [formBlockedDomains, setFormBlockedDomains] = useState<string[]>([]);
  const [formBlockedKeywordGroups, setFormBlockedKeywordGroups] = useState<string[]>([]);
  const [formAllowedDomains, setFormAllowedDomains] = useState<string[]>([]);
  const [formNotifyBefore, setFormNotifyBefore] = useState<number>(5);
  const [formStrictMode, setFormStrictMode] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [customAllowInput, setCustomAllowInput] = useState('');

  const resetForm = () => {
    setEditingId(null); setFormName(''); setFormStart('09:00'); setFormEnd('18:00');
    setFormDays([1, 2, 3, 4, 5]); setFormMode('block_selected');
    setFormBlockedApps([]); setFormBlockedDomains([]); setFormBlockedKeywordGroups([]);
    setFormAllowedDomains([]); setFormNotifyBefore(5); setFormStrictMode(false);
    setCustomDomainInput(''); setCustomAllowInput('');
  };

  const openNewModal = () => { resetForm(); setShowModal(true); };

  const openEditModal = (rule: ScheduleRule) => {
    setEditingId(rule.id); setFormName(rule.name);
    setFormStart(rule.startTime); setFormEnd(rule.endTime);
    setFormDays([...rule.days]); setFormMode(rule.mode);
    setFormBlockedApps(rule.blockedAppNames || []);
    setFormBlockedDomains(rule.blockedDomains || []);
    setFormBlockedKeywordGroups(rule.blockedKeywordGroupIds || []);
    setFormAllowedDomains(rule.allowedDomains || []);
    setFormNotifyBefore(rule.notifyBefore ?? 5);
    setFormStrictMode(rule.strictMode ?? false);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    const data: Omit<ScheduleRule, 'id'> = {
      name: formName, enabled: true,
      startTime: formStart, endTime: formEnd,
      days: formDays, mode: formMode,
      blockedAppNames: formBlockedApps,
      blockedDomains: formBlockedDomains,
      blockedKeywordGroupIds: formBlockedKeywordGroups,
      allowedDomains: formAllowedDomains,
      notifyBefore: formNotifyBefore,
      strictMode: formStrictMode,
    };
    if (editingId) updateSchedule(editingId, data);
    else addSchedule(data);
    setShowModal(false);
  };

  const toggleApp = (name: string) => {
    setFormBlockedApps(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);
  };
  const toggleDomain = (d: string) => {
    setFormBlockedDomains(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };
  const toggleKwGroup = (id: string) => {
    setFormBlockedKeywordGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const activeNow = isCurrentlyScheduleBlocked();
  const activeCount = schedules.filter(s => s.enabled).length;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>스케줄 차단</Text>
          <TouchableOpacity style={s.addBtn} onPress={openNewModal}>
            <Ionicons name="add" size={24} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        {/* Status */}
        <LinearGradient
          colors={activeNow ? ['#EF4444', '#DC2626'] : ['#1E293B', '#0F172A']}
          style={s.statusCard}
        >
          <Ionicons name={activeNow ? 'lock-closed' : 'lock-open'} size={28} color="#FFF" />
          <View style={s.statusInfo}>
            <Text style={s.statusTitle}>{activeNow ? `${activeNow.name} 활성 중` : '현재 차단 없음'}</Text>
            <Text style={s.statusSub}>
              {activeNow
                ? `${activeNow.startTime}~${activeNow.endTime} · ${MODE_INFO[activeNow.mode].label}`
                : `${activeCount}개 스케줄 설정됨`}
            </Text>
          </View>
        </LinearGradient>

        {/* Schedule List */}
        {schedules.map((rule) => {
          const modeInfo = MODE_INFO[rule.mode];
          const isExpanded = showDetailPanel === rule.id;
          return (
            <View key={rule.id} style={s.scheduleCard}>
              <View style={s.scheduleHeader}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowDetailPanel(isExpanded ? null : rule.id)}>
                  <Text style={s.scheduleName}>{rule.name}</Text>
                  <View style={s.scheduleTimeLine}>
                    <Ionicons name="time-outline" size={14} color="#A0A0C0" />
                    <Text style={s.scheduleTimeText}>{rule.startTime} ~ {rule.endTime}</Text>
                    <View style={[s.modeBadge, { backgroundColor: `${modeInfo.color}20` }]}>
                      <Text style={[s.modeBadgeText, { color: modeInfo.color }]}>{modeInfo.label}</Text>
                    </View>
                    {rule.strictMode && (
                      <View style={s.strictBadge}><Text style={s.strictBadgeText}>🔒 엄격</Text></View>
                    )}
                  </View>
                </TouchableOpacity>
                <Switch
                  value={rule.enabled}
                  onValueChange={() => toggleScheduleFromStore(rule.id)}
                  trackColor={{ false: '#333', true: `${modeInfo.color}40` }}
                  thumbColor={rule.enabled ? modeInfo.color : '#666'}
                />
              </View>

              {/* Day dots */}
              <View style={s.scheduleDays}>
                {DAY_LABELS.map((label, i) => (
                  <View key={i} style={[s.dayDot, rule.days.includes(i) && s.dayDotActive]}>
                    <Text style={[s.dayDotText, rule.days.includes(i) && s.dayDotTextActive]}>{label}</Text>
                  </View>
                ))}
              </View>

              {/* Expanded detail */}
              {isExpanded && (
                <View style={s.detailPanel}>
                  {(rule.blockedAppNames?.length ?? 0) > 0 && (
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>차단 앱</Text>
                      <Text style={s.detailValue}>{rule.blockedAppNames!.join(', ')}</Text>
                    </View>
                  )}
                  {(rule.blockedDomains?.length ?? 0) > 0 && (
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>차단 사이트</Text>
                      <Text style={s.detailValue}>{rule.blockedDomains!.join(', ')}</Text>
                    </View>
                  )}
                  {(rule.blockedKeywordGroupIds?.length ?? 0) > 0 && (
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>차단 키워드</Text>
                      <Text style={s.detailValue}>
                        {rule.blockedKeywordGroupIds!.map(id => keywordGroups.find(g => g.id === id)?.name || id).join(', ')}
                      </Text>
                    </View>
                  )}
                  {(rule.allowedDomains?.length ?? 0) > 0 && (
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>허용 사이트</Text>
                      <Text style={[s.detailValue, { color: '#10B981' }]}>{rule.allowedDomains!.join(', ')}</Text>
                    </View>
                  )}
                  {rule.notifyBefore && rule.notifyBefore > 0 && (
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>사전 알림</Text>
                      <Text style={s.detailValue}>{rule.notifyBefore}분 전</Text>
                    </View>
                  )}
                  <View style={s.detailActions}>
                    <TouchableOpacity style={s.editBtn} onPress={() => { setShowDetailPanel(null); openEditModal(rule); }}>
                      <Ionicons name="create-outline" size={16} color="#8B5CF6" />
                      <Text style={s.editBtnText}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => {
                      Alert.alert('삭제', '이 스케줄을 삭제하시겠습니까?', [
                        { text: '취소', style: 'cancel' },
                        { text: '삭제', style: 'destructive', onPress: () => removeScheduleFromStore(rule.id) },
                      ]);
                    }}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={s.deleteBtnText}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {schedules.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color="#6B6B8D" />
            <Text style={s.emptyText}>스케줄이 없어요</Text>
            <Text style={s.emptySubtext}>+ 버튼으로 시간대별 차단을 설정하세요</Text>
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── 스케줄 편집 모달 ── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modalScroll} contentContainerStyle={s.modalContent} showsVerticalScrollIndicator={false}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingId ? '스케줄 수정' : '새 스케줄'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#A0A0C0" />
              </TouchableOpacity>
            </View>

            {/* 이름 */}
            <Text style={s.inputLabel}>이름</Text>
            <TextInput style={s.input} placeholder="예: 공부 시간" placeholderTextColor="#6B6B8D"
              value={formName} onChangeText={setFormName} />

            {/* 시간 */}
            <View style={s.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.inputLabel}>시작</Text>
                <TextInput style={s.input} placeholder="09:00" placeholderTextColor="#6B6B8D"
                  value={formStart} onChangeText={setFormStart} />
              </View>
              <Text style={s.timeSep}>~</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.inputLabel}>종료</Text>
                <TextInput style={s.input} placeholder="18:00" placeholderTextColor="#6B6B8D"
                  value={formEnd} onChangeText={setFormEnd} />
              </View>
            </View>

            {/* 요일 */}
            <Text style={s.inputLabel}>요일</Text>
            <View style={s.daySelector}>
              {DAY_LABELS.map((label, i) => (
                <TouchableOpacity key={i}
                  style={[s.daySelectorItem, formDays.includes(i) && s.daySelectorItemActive]}
                  onPress={() => setFormDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}>
                  <Text style={[s.daySelectorText, formDays.includes(i) && s.daySelectorTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 차단 모드 */}
            <Text style={s.inputLabel}>차단 모드</Text>
            <View style={s.modeGrid}>
              {(Object.entries(MODE_INFO) as [ScheduleRule['mode'], typeof MODE_INFO['block_all']][]).map(([key, info]) => (
                <TouchableOpacity key={key}
                  style={[s.modeChip, formMode === key && { borderColor: info.color, backgroundColor: `${info.color}15` }]}
                  onPress={() => setFormMode(key)}>
                  <Ionicons name={info.icon} size={18} color={formMode === key ? info.color : '#6B6B8D'} />
                  <Text style={[s.modeChipLabel, formMode === key && { color: info.color }]}>{info.label}</Text>
                  <Text style={s.modeChipDesc}>{info.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 앱 선택 (block_selected, focus_only) */}
            {(formMode === 'block_selected' || formMode === 'focus_only') && (
              <>
                <Text style={s.inputLabel}>차단할 앱 선택</Text>
                <View style={s.appGrid}>
                  {POPULAR_APPS.map((app) => {
                    const selected = formBlockedApps.includes(app.name);
                    return (
                      <TouchableOpacity key={app.name}
                        style={[s.appChip, selected && s.appChipSelected]}
                        onPress={() => toggleApp(app.name)}>
                        <Text style={s.appChipEmoji}>{app.emoji}</Text>
                        <Text style={[s.appChipName, selected && { color: '#EF4444' }]}>{app.name}</Text>
                        {selected && <Ionicons name="checkmark-circle" size={14} color="#EF4444" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* 사이트 선택 (block_selected, keyword_only) */}
            {(formMode === 'block_selected' || formMode === 'keyword_only') && (
              <>
                <Text style={s.inputLabel}>차단할 사이트</Text>
                <View style={s.domainGrid}>
                  {POPULAR_DOMAINS.map((d) => {
                    const selected = formBlockedDomains.includes(d);
                    return (
                      <TouchableOpacity key={d}
                        style={[s.domainChip, selected && s.domainChipSelected]}
                        onPress={() => toggleDomain(d)}>
                        <Text style={[s.domainChipText, selected && { color: '#F97316' }]}>{d}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={s.addRow}>
                  <TextInput style={[s.input, { flex: 1 }]} placeholder="직접 입력 (예: op.gg)"
                    placeholderTextColor="#6B6B8D" value={customDomainInput} onChangeText={setCustomDomainInput} />
                  <TouchableOpacity style={s.addSmBtn} onPress={() => {
                    const d = customDomainInput.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
                    if (d && !formBlockedDomains.includes(d)) {
                      setFormBlockedDomains(prev => [...prev, d]);
                      setCustomDomainInput('');
                    }
                  }}>
                    <Text style={s.addSmBtnText}>추가</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* 키워드 그룹 선택 */}
            {(formMode === 'keyword_only' || formMode === 'block_selected') && keywordGroups.length > 0 && (
              <>
                <Text style={s.inputLabel}>차단할 키워드 그룹</Text>
                {keywordGroups.map((group) => {
                  const selected = formBlockedKeywordGroups.includes(group.id);
                  return (
                    <TouchableOpacity key={group.id}
                      style={[s.kwGroupRow, selected && s.kwGroupRowSelected]}
                      onPress={() => toggleKwGroup(group.id)}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.kwGroupName}>{group.name}</Text>
                        <Text style={s.kwGroupCount}>{group.keywords.length}개 키워드</Text>
                      </View>
                      {selected && <Ionicons name="checkmark-circle" size={20} color="#8B5CF6" />}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* 허용 사이트 (화이트리스트) */}
            {formMode !== 'block_all' && (
              <>
                <Text style={s.inputLabel}>허용 사이트 (화이트리스트)</Text>
                <Text style={s.inputHint}>이 사이트들은 차단에서 제외됩니다</Text>
                <View style={s.addRow}>
                  <TextInput style={[s.input, { flex: 1 }]} placeholder="예: github.com"
                    placeholderTextColor="#6B6B8D" value={customAllowInput} onChangeText={setCustomAllowInput} />
                  <TouchableOpacity style={[s.addSmBtn, { backgroundColor: 'rgba(16,185,129,0.2)' }]} onPress={() => {
                    const d = customAllowInput.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
                    if (d && !formAllowedDomains.includes(d)) {
                      setFormAllowedDomains(prev => [...prev, d]);
                      setCustomAllowInput('');
                    }
                  }}>
                    <Text style={[s.addSmBtnText, { color: '#10B981' }]}>추가</Text>
                  </TouchableOpacity>
                </View>
                {formAllowedDomains.length > 0 && (
                  <View style={s.tagRow}>
                    {formAllowedDomains.map((d) => (
                      <TouchableOpacity key={d} style={s.allowTag} onPress={() => setFormAllowedDomains(prev => prev.filter(x => x !== d))}>
                        <Text style={s.allowTagText}>{d} ✕</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* 고급 설정 */}
            <Text style={[s.inputLabel, { marginTop: 20 }]}>고급 설정</Text>
            <View style={s.advancedCard}>
              <View style={s.advancedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.advancedLabel}>사전 알림</Text>
                  <Text style={s.advancedDesc}>차단 시작 전 알림</Text>
                </View>
                <View style={s.notifyRow}>
                  {[0, 5, 10, 15].map((n) => (
                    <TouchableOpacity key={n}
                      style={[s.notifyChip, formNotifyBefore === n && s.notifyChipActive]}
                      onPress={() => setFormNotifyBefore(n)}>
                      <Text style={[s.notifyChipText, formNotifyBefore === n && s.notifyChipTextActive]}>
                        {n === 0 ? '없음' : `${n}분`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={s.divider} />
              <View style={s.advancedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.advancedLabel}>🔒 엄격 모드</Text>
                  <Text style={s.advancedDesc}>활성화 중 해제 불가</Text>
                </View>
                <Switch value={formStrictMode} onValueChange={setFormStrictMode}
                  trackColor={{ false: '#333', true: 'rgba(239,68,68,0.4)' }}
                  thumbColor={formStrictMode ? '#EF4444' : '#666'} />
              </View>
            </View>

            <TouchableOpacity style={[s.saveBtn, !formName.trim() && { opacity: 0.5 }]}
              onPress={handleSave} disabled={!formName.trim()}>
              <LinearGradient colors={['#6C5CE7', '#A855F7']} style={s.saveBtnGrad}>
                <Text style={s.saveBtnText}>{editingId ? '수정하기' : '추가하기'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center' },
  statusCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, gap: 14, marginBottom: 24 },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  statusSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  scheduleCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  scheduleName: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 4 },
  scheduleTimeLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scheduleTimeText: { fontSize: 13, color: '#A0A0C0' },
  modeBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  modeBadgeText: { fontSize: 10, fontWeight: '600' },
  strictBadge: { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  strictBadgeText: { fontSize: 10, fontWeight: '600', color: '#EF4444' },
  scheduleDays: { flexDirection: 'row', gap: 5 },
  dayDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  dayDotActive: { backgroundColor: 'rgba(139,92,246,0.3)' },
  dayDotText: { fontSize: 11, fontWeight: '600', color: '#6B6B8D' },
  dayDotTextActive: { color: '#8B5CF6' },
  detailPanel: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  detailRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  detailLabel: { fontSize: 12, color: '#6B6B8D', width: 70 },
  detailValue: { flex: 1, fontSize: 12, color: '#A0A0C0' },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#8B5CF6' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  emptyCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#FFF', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#6B6B8D', marginTop: 6 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalScroll: { maxHeight: '92%' },
  modalContent: { backgroundColor: '#1A1A35', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#A0A0C0', marginBottom: 6, marginTop: 14 },
  inputHint: { fontSize: 11, color: '#6B6B8D', marginBottom: 6, marginTop: -4 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#FFF' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  timeSep: { fontSize: 18, color: '#6B6B8D', paddingBottom: 12 },
  daySelector: { flexDirection: 'row', gap: 5 },
  daySelectorItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  daySelectorItemActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.2)' },
  daySelectorText: { fontSize: 13, fontWeight: '600', color: '#6B6B8D' },
  daySelectorTextActive: { color: '#8B5CF6' },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeChip: { width: '48%', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', gap: 4 },
  modeChipLabel: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  modeChipDesc: { fontSize: 11, color: '#6B6B8D' },
  appGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  appChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  appChipSelected: { borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.08)' },
  appChipEmoji: { fontSize: 16 },
  appChipName: { fontSize: 12, fontWeight: '500', color: '#FFF' },
  domainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  domainChip: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  domainChipSelected: { borderColor: 'rgba(249,115,22,0.4)', backgroundColor: 'rgba(249,115,22,0.08)' },
  domainChipText: { fontSize: 12, color: '#A0A0C0' },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  addSmBtn: { backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center' },
  addSmBtnText: { fontSize: 13, fontWeight: '600', color: '#8B5CF6' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  allowTag: { backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  allowTagText: { fontSize: 12, color: '#10B981' },
  kwGroupRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  kwGroupRowSelected: { borderColor: 'rgba(139,92,246,0.4)', backgroundColor: 'rgba(139,92,246,0.08)' },
  kwGroupName: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  kwGroupCount: { fontSize: 11, color: '#6B6B8D', marginTop: 2 },
  advancedCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  advancedRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  advancedLabel: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  advancedDesc: { fontSize: 11, color: '#6B6B8D', marginTop: 2 },
  notifyRow: { flexDirection: 'row', gap: 5 },
  notifyChip: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  notifyChipActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.2)' },
  notifyChipText: { fontSize: 11, fontWeight: '600', color: '#6B6B8D' },
  notifyChipTextActive: { color: '#8B5CF6' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  saveBtn: { marginTop: 24 },
  saveBtnGrad: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
