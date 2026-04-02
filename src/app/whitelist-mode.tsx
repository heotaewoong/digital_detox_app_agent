import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAppControlStore } from '@/store/useAppControlStore';

export default function WhitelistModeScreen() {
  const router = useRouter();
  const { whitelist, whitelistActive, toggleWhitelistApp, toggleWhitelistMode, loadData } = useAppControlStore();
  const [searchText, setSearchText] = useState('');

  useEffect(() => { loadData(); }, []);

  const isActive = whitelistActive;
  const apps = whitelist;

  const toggleApp = useCallback((id: string) => {
    toggleWhitelistApp(id);
  }, [toggleWhitelistApp]);

  const activateMode = useCallback(() => {
    const allowedCount = apps.filter((a) => a.allowed).length;
    Alert.alert(
      '🔒 화이트리스트 모드',
      `${allowedCount}개 앱만 사용 가능합니다.\n나머지 앱은 모두 차단됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '활성화', onPress: () => toggleWhitelistMode() },
      ]
    );
  }, [apps, toggleWhitelistMode]);

  const deactivateMode = useCallback(() => {
    Alert.alert('모드 해제', '화이트리스트 모드를 해제하시겠습니까?', [
      { text: '유지', style: 'cancel' },
      { text: '해제', onPress: () => toggleWhitelistMode() },
    ]);
  }, [toggleWhitelistMode]);

  const filtered = searchText
    ? apps.filter((a) => a.name.toLowerCase().includes(searchText.toLowerCase()))
    : apps;
  const allowedApps = filtered.filter((a) => a.allowed);
  const blockedApps = filtered.filter((a) => !a.allowed);

  return (
    <View style={st.container}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard')}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={st.title}>화이트리스트 모드</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Status */}
        <LinearGradient
          colors={isActive ? ['#10B981', '#059669'] : ['#374151', '#1F2937']}
          style={st.statusCard}
        >
          <Ionicons name={isActive ? 'lock-closed' : 'lock-open'} size={32} color="#FFF" />
          <View style={st.statusInfo}>
            <Text style={st.statusTitle}>{isActive ? '화이트리스트 활성' : '비활성'}</Text>
            <Text style={st.statusSub}>
              {isActive
                ? `${apps.filter((a) => a.allowed).length}개 앱만 사용 가능`
                : '허용된 앱만 사용할 수 있는 모드'}
            </Text>
          </View>
          <TouchableOpacity
            style={[st.toggleBtn, isActive && st.toggleBtnActive]}
            onPress={isActive ? deactivateMode : activateMode}
          >
            <Text style={st.toggleBtnText}>{isActive ? '해제' : '활성화'}</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Search */}
        <View style={st.searchRow}>
          <Ionicons name="search" size={18} color="#6B6B8D" />
          <TextInput style={st.searchInput} placeholder="앱 검색..." placeholderTextColor="#6B6B8D"
            value={searchText} onChangeText={setSearchText} />
        </View>

        {/* Allowed Apps */}
        <Text style={st.sectionLabel}>✅ 허용된 앱 ({allowedApps.length})</Text>
        {allowedApps.map((app) => (
          <View key={app.id} style={st.appRow}>
            <Text style={st.appEmoji}>{app.emoji}</Text>
            <Text style={st.appName}>{app.name}</Text>
            <Switch value={app.allowed} onValueChange={() => toggleApp(app.id)}
              trackColor={{ false: '#333', true: 'rgba(16,185,129,0.4)' }}
              thumbColor={app.allowed ? '#10B981' : '#666'} />
          </View>
        ))}

        {/* Blocked Apps */}
        <Text style={[st.sectionLabel, { marginTop: 20 }]}>🚫 차단된 앱 ({blockedApps.length})</Text>
        {blockedApps.map((app) => (
          <View key={app.id} style={[st.appRow, st.appRowBlocked]}>
            <Text style={st.appEmoji}>{app.emoji}</Text>
            <Text style={[st.appName, { color: '#6B6B8D' }]}>{app.name}</Text>
            <Switch value={app.allowed} onValueChange={() => toggleApp(app.id)}
              trackColor={{ false: '#333', true: 'rgba(16,185,129,0.4)' }}
              thumbColor={app.allowed ? '#10B981' : '#666'} />
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  statusCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, gap: 14, marginBottom: 20 },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  statusSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  toggleBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  toggleBtnActive: { backgroundColor: 'rgba(239,68,68,0.3)' },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#FFF' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#6B6B8D', marginBottom: 10 },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  appRowBlocked: { opacity: 0.6 },
  appEmoji: { fontSize: 24 },
  appName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#FFF' },
});
