import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUserStore } from '@/store/useUserStore';
import { useMonitorStore } from '@/store/useMonitorStore';
import { BLOCK_STRENGTH_OPTIONS, APP_VERSION } from '@/utils/constants';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useSettingsStore();
  const profile = useUserStore((s) => s.profile);
  const clearDetections = useMonitorStore((s) => s.clearDetections);

  const handleClearData = () => {
    Alert.alert(
      '데이터 초기화',
      '모든 감지 기록을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => clearDetections(),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>설정</Text>

      {/* Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>프로필</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.name?.[0] || '?'}
              </Text>
            </View>
            <View>
              <Text style={styles.profileName}>{profile?.name || '사용자'}</Text>
              <Text style={styles.profileSub}>
                {profile?.dreams?.[0] || '꿈을 설정해주세요'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Monitoring Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>모니터링</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="shield" size={20} color="#8B5CF6" />
              <Text style={styles.settingLabel}>모니터링 활성화</Text>
            </View>
            <Switch
              value={settings.monitoringEnabled}
              onValueChange={(v) => updateSettings({ monitoringEnabled: v })}
              trackColor={{ false: '#333', true: 'rgba(139,92,246,0.4)' }}
              thumbColor={settings.monitoringEnabled ? '#8B5CF6' : '#666'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={20} color="#00D2FF" />
              <Text style={styles.settingLabel}>알림</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(v) => updateSettings({ notificationsEnabled: v })}
              trackColor={{ false: '#333', true: 'rgba(0,210,255,0.4)' }}
              thumbColor={settings.notificationsEnabled ? '#00D2FF' : '#666'}
            />
          </View>
        </View>
      </View>

      {/* Block Strength */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>차단 강도</Text>
        <View style={styles.card}>
          {BLOCK_STRENGTH_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.strengthOption,
                settings.blockStrength === opt.value && styles.strengthOptionActive,
              ]}
              onPress={() => updateSettings({ blockStrength: opt.value })}
            >
              <View style={styles.strengthInfo}>
                <Text
                  style={[
                    styles.strengthLabel,
                    settings.blockStrength === opt.value && styles.strengthLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.strengthDesc}>{opt.description}</Text>
              </View>
              {settings.blockStrength === opt.value && (
                <Ionicons name="checkmark-circle" size={22} color="#8B5CF6" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Cooldown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>쿨다운 시간</Text>
        <View style={styles.card}>
          <View style={styles.cooldownRow}>
            {[10, 30, 60, 300].map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[
                  styles.cooldownChip,
                  settings.cooldownSeconds === sec && styles.cooldownChipActive,
                ]}
                onPress={() => updateSettings({ cooldownSeconds: sec })}
              >
                <Text
                  style={[
                    styles.cooldownText,
                    settings.cooldownSeconds === sec && styles.cooldownTextActive,
                  ]}
                >
                  {sec < 60 ? `${sec}초` : `${sec / 60}분`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.cooldownHint}>
            차단 화면에서 돌아가기까지 대기 시간
          </Text>
        </View>
      </View>

      {/* Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>데이터</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleClearData}>
            <Ionicons name="trash" size={20} color="#EF4444" />
            <Text style={styles.dangerText}>감지 기록 초기화</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>정보</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>버전</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>개인정보 처리</Text>
            <Text style={styles.infoValue}>온디바이스 우선</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>데이터 보유</Text>
            <Text style={styles.infoValue}>90일</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 28,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B8D',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileSub: {
    fontSize: 13,
    color: '#6B6B8D',
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
  },
  strengthOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  strengthOptionActive: {
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  strengthInfo: {},
  strengthLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  strengthLabelActive: {
    color: '#8B5CF6',
  },
  strengthDesc: {
    fontSize: 12,
    color: '#6B6B8D',
    marginTop: 2,
  },
  cooldownRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  cooldownChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cooldownChipActive: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  cooldownText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B8D',
  },
  cooldownTextActive: {
    color: '#8B5CF6',
  },
  cooldownHint: {
    fontSize: 12,
    color: '#6B6B8D',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  dangerText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#EF4444',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  infoLabel: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  infoValue: {
    fontSize: 15,
    color: '#6B6B8D',
  },
  bottomSpacer: {
    height: 100,
  },
});
