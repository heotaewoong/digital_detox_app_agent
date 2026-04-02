import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

interface Partner {
  id: string;
  name: string;
  phone: string;
  notifyOnUnblock: boolean;
  notifyOnFail: boolean;
  notifyWeekly: boolean;
}

interface WhitelistApp {
  id: string;
  name: string;
  reason: string;
}

const DEFAULT_WHITELIST: WhitelistApp[] = [
  { id: 'w1', name: '전화', reason: '긴급 연락' },
  { id: 'w2', name: '메시지', reason: '긴급 연락' },
  { id: 'w3', name: '지도', reason: '네비게이션' },
  { id: 'w4', name: '카메라', reason: '기본 기능' },
];

export default function PartnersScreen() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistApp[]>(DEFAULT_WHITELIST);
  const [tab, setTab] = useState<'partners' | 'whitelist'>('partners');
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [showAddWhitelist, setShowAddWhitelist] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAppName, setNewAppName] = useState('');
  const [newAppReason, setNewAppReason] = useState('');

  const addPartner = useCallback(() => {
    if (!newName.trim()) return;
    setPartners((prev) => [...prev, {
      id: `p_${Date.now()}`, name: newName.trim(), phone: newPhone.trim(),
      notifyOnUnblock: true, notifyOnFail: true, notifyWeekly: false,
    }]);
    setNewName(''); setNewPhone(''); setShowAddPartner(false);
  }, [newName, newPhone]);

  const removePartner = useCallback((id: string) => {
    Alert.alert('삭제', '이 파트너를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => setPartners((p) => p.filter((x) => x.id !== id)) },
    ]);
  }, []);

  const togglePartnerSetting = useCallback((id: string, key: keyof Partner) => {
    setPartners((prev) => prev.map((p) => p.id === id ? { ...p, [key]: !p[key] } : p));
  }, []);

  const addWhitelistApp = useCallback(() => {
    if (!newAppName.trim()) return;
    setWhitelist((prev) => [...prev, { id: `wl_${Date.now()}`, name: newAppName.trim(), reason: newAppReason.trim() || '사용자 추가' }]);
    setNewAppName(''); setNewAppReason(''); setShowAddWhitelist(false);
  }, [newAppName, newAppReason]);

  const removeWhitelistApp = useCallback((id: string) => {
    setWhitelist((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return (
    <View style={st.container}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard')}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={st.title}>파트너 & 화이트리스트</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Tab Switcher */}
        <View style={st.tabs}>
          <TouchableOpacity style={[st.tab, tab === 'partners' && st.tabActive]} onPress={() => setTab('partners')}>
            <Ionicons name="people" size={16} color={tab === 'partners' ? '#8B5CF6' : '#6B6B8D'} />
            <Text style={[st.tabText, tab === 'partners' && st.tabTextActive]}>책임 파트너</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.tab, tab === 'whitelist' && st.tabActive]} onPress={() => setTab('whitelist')}>
            <Ionicons name="checkmark-circle" size={16} color={tab === 'whitelist' ? '#8B5CF6' : '#6B6B8D'} />
            <Text style={[st.tabText, tab === 'whitelist' && st.tabTextActive]}>화이트리스트</Text>
          </TouchableOpacity>
        </View>

        {tab === 'partners' ? (
          <View>
            <View style={st.infoCard}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={st.infoText}>
                책임 파트너를 등록하면 차단 해제, 목표 실패 시 파트너에게 알림이 전송됩니다.
                서로 응원하며 디지털 디톡스를 함께 해보세요!
              </Text>
            </View>

            {partners.length === 0 ? (
              <View style={st.emptyCard}>
                <Ionicons name="people-outline" size={48} color="#6B6B8D" />
                <Text style={st.emptyText}>등록된 파트너가 없어요</Text>
                <Text style={st.emptySub}>함께 디톡스할 친구나 가족을 추가하세요</Text>
              </View>
            ) : (
              partners.map((p) => (
                <View key={p.id} style={st.partnerCard}>
                  <View style={st.partnerHeader}>
                    <View style={st.partnerAvatar}><Text style={st.partnerAvatarText}>{p.name[0]}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.partnerName}>{p.name}</Text>
                      <Text style={st.partnerPhone}>{p.phone || '번호 미등록'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removePartner(p.id)}>
                      <Ionicons name="trash-outline" size={18} color="#6B6B8D" />
                    </TouchableOpacity>
                  </View>
                  <View style={st.partnerSettings}>
                    <View style={st.pSettingRow}>
                      <Text style={st.pSettingLabel}>차단 해제 시 알림</Text>
                      <Switch value={p.notifyOnUnblock} onValueChange={() => togglePartnerSetting(p.id, 'notifyOnUnblock')}
                        trackColor={{ false: '#333', true: 'rgba(239,68,68,0.4)' }} thumbColor={p.notifyOnUnblock ? '#EF4444' : '#666'} />
                    </View>
                    <View style={st.pSettingRow}>
                      <Text style={st.pSettingLabel}>목표 실패 시 알림</Text>
                      <Switch value={p.notifyOnFail} onValueChange={() => togglePartnerSetting(p.id, 'notifyOnFail')}
                        trackColor={{ false: '#333', true: 'rgba(251,191,36,0.4)' }} thumbColor={p.notifyOnFail ? '#FBBF24' : '#666'} />
                    </View>
                    <View style={st.pSettingRow}>
                      <Text style={st.pSettingLabel}>주간 리포트 공유</Text>
                      <Switch value={p.notifyWeekly} onValueChange={() => togglePartnerSetting(p.id, 'notifyWeekly')}
                        trackColor={{ false: '#333', true: 'rgba(139,92,246,0.4)' }} thumbColor={p.notifyWeekly ? '#8B5CF6' : '#666'} />
                    </View>
                  </View>
                </View>
              ))
            )}

            <TouchableOpacity style={st.addBtn} onPress={() => setShowAddPartner(true)}>
              <Ionicons name="person-add" size={20} color="#8B5CF6" />
              <Text style={st.addBtnText}>파트너 추가</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={st.infoCard}>
              <Ionicons name="information-circle" size={20} color="#10B981" />
              <Text style={st.infoText}>
                화이트리스트에 등록된 앱은 긴급 차단 모드에서도 항상 사용할 수 있습니다.
              </Text>
            </View>

            {whitelist.map((w) => (
              <View key={w.id} style={st.wlItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={st.wlName}>{w.name}</Text>
                  <Text style={st.wlReason}>{w.reason}</Text>
                </View>
                <TouchableOpacity onPress={() => removeWhitelistApp(w.id)}>
                  <Ionicons name="close-circle" size={20} color="#6B6B8D" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={st.addBtn} onPress={() => setShowAddWhitelist(true)}>
              <Ionicons name="add-circle" size={20} color="#10B981" />
              <Text style={[st.addBtnText, { color: '#10B981' }]}>앱 추가</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={st.spacer} />
      </ScrollView>

      {/* Add Partner Modal */}
      <Modal visible={showAddPartner} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>파트너 추가</Text>
              <TouchableOpacity onPress={() => setShowAddPartner(false)}>
                <Ionicons name="close" size={24} color="#A0A0C0" />
              </TouchableOpacity>
            </View>
            <Text style={st.inputLabel}>이름</Text>
            <TextInput style={st.input} placeholder="파트너 이름" placeholderTextColor="#6B6B8D" value={newName} onChangeText={setNewName} />
            <Text style={st.inputLabel}>전화번호 (선택)</Text>
            <TextInput style={st.input} placeholder="010-0000-0000" placeholderTextColor="#6B6B8D" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
            <TouchableOpacity style={[st.saveBtn, !newName.trim() && { opacity: 0.5 }]} onPress={addPartner} disabled={!newName.trim()}>
              <LinearGradient colors={['#6C5CE7', '#A855F7']} style={st.saveBtnGrad}>
                <Text style={st.saveBtnText}>추가하기</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Whitelist Modal */}
      <Modal visible={showAddWhitelist} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>화이트리스트 추가</Text>
              <TouchableOpacity onPress={() => setShowAddWhitelist(false)}>
                <Ionicons name="close" size={24} color="#A0A0C0" />
              </TouchableOpacity>
            </View>
            <Text style={st.inputLabel}>앱 이름</Text>
            <TextInput style={st.input} placeholder="예: 은행 앱" placeholderTextColor="#6B6B8D" value={newAppName} onChangeText={setNewAppName} />
            <Text style={st.inputLabel}>허용 사유 (선택)</Text>
            <TextInput style={st.input} placeholder="예: 금융 거래" placeholderTextColor="#6B6B8D" value={newAppReason} onChangeText={setNewAppReason} />
            <TouchableOpacity style={[st.saveBtn, !newAppName.trim() && { opacity: 0.5 }]} onPress={addWhitelistApp} disabled={!newAppName.trim()}>
              <LinearGradient colors={['#10B981', '#059669']} style={st.saveBtnGrad}>
                <Text style={st.saveBtnText}>추가하기</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabActive: { backgroundColor: 'rgba(139,92,246,0.2)' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B6B8D' },
  tabTextActive: { color: '#8B5CF6' },
  infoCard: { flexDirection: 'row', backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 12, padding: 14, gap: 10, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  infoText: { flex: 1, fontSize: 13, color: '#A0A0C0', lineHeight: 20 },
  emptyCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#FFF', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#6B6B8D', marginTop: 6 },
  partnerCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  partnerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  partnerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  partnerAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  partnerName: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  partnerPhone: { fontSize: 13, color: '#6B6B8D', marginTop: 2 },
  partnerSettings: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
  pSettingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  pSettingLabel: { fontSize: 14, color: '#A0A0C0' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', marginTop: 12 },
  addBtnText: { fontSize: 15, fontWeight: '600', color: '#8B5CF6' },
  wlItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  wlName: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  wlReason: { fontSize: 12, color: '#6B6B8D', marginTop: 2 },
  spacer: { height: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1A1A35', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#A0A0C0', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#FFF' },
  saveBtn: { marginTop: 24 },
  saveBtnGrad: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
