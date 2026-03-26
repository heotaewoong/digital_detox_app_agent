import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMonitorStore } from '@/store/useMonitorStore';
import { useUserStore } from '@/store/useUserStore';
import { ContentMonitor } from '@/services/monitoring/ContentMonitor';
import { CATEGORY_LABELS } from '@/utils/constants';
import { DetectionEvent, ContentCategory } from '@/types';

const ACTION_COLORS = {
  logged: '#3B82F6',
  warned: '#FBBF24',
  blocked: '#EF4444',
};

const ACTION_LABELS = {
  logged: '기록됨',
  warned: '경고',
  blocked: '차단됨',
};

export default function MonitorScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const { monitoring, detectionLog, startMonitoring, stopMonitoring, addDetection, toggleSimulationMode } =
    useMonitorStore();

  const [isSimRunning, setIsSimRunning] = useState(false);

  const handleToggleMonitoring = () => {
    if (monitoring.isActive) {
      stopMonitoring();
      setIsSimRunning(false);
      ContentMonitor.getInstance().stopSimulation();
    } else {
      startMonitoring();
    }
  };

  const handleStartSimulation = () => {
    if (!monitoring.isActive) {
      Alert.alert('알림', '먼저 모니터링을 활성화해주세요.');
      return;
    }

    if (isSimRunning) {
      ContentMonitor.getInstance().stopSimulation();
      setIsSimRunning(false);
      return;
    }

    const monitor = ContentMonitor.getInstance();
    if (profile?.blockedKeywords) {
      monitor.initialize(profile.blockedKeywords);
    }

    monitor.startSimulation((event: DetectionEvent) => {
      addDetection(event);
      if (event.action === 'blocked') {
        router.push('/block/intervention');
      }
    });
    setIsSimRunning(true);
  };

  useEffect(() => {
    return () => {
      ContentMonitor.getInstance().stopSimulation();
    };
  }, []);

  const todayDetections = detectionLog.filter((d) => {
    const today = new Date().toISOString().split('T')[0];
    return d.timestamp.startsWith(today);
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>모니터링</Text>
        <View style={styles.modeBadge}>
          <View
            style={[
              styles.modeIndicator,
              { backgroundColor: monitoring.isSimulationMode ? '#FBBF24' : '#10B981' },
            ]}
          />
          <Text style={styles.modeText}>
            {monitoring.isSimulationMode ? '시뮬레이션' : '실시간'}
          </Text>
        </View>
      </View>

      {/* Main Control */}
      <TouchableOpacity onPress={handleToggleMonitoring} activeOpacity={0.8}>
        <LinearGradient
          colors={
            monitoring.isActive
              ? ['#10B981', '#059669']
              : ['#374151', '#1F2937']
          }
          style={styles.controlCard}
        >
          <Ionicons
            name={monitoring.isActive ? 'shield-checkmark' : 'shield-outline'}
            size={48}
            color="#FFF"
          />
          <Text style={styles.controlTitle}>
            {monitoring.isActive ? '보호 활성화됨' : '보호 비활성화'}
          </Text>
          <Text style={styles.controlSubtitle}>
            {monitoring.isActive ? '탭하여 중지' : '탭하여 시작'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Simulation Button */}
      <TouchableOpacity
        style={[styles.simButton, isSimRunning && styles.simButtonActive]}
        onPress={handleStartSimulation}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isSimRunning ? 'pause-circle' : 'play-circle'}
          size={24}
          color={isSimRunning ? '#EF4444' : '#8B5CF6'}
        />
        <Text
          style={[styles.simButtonText, isSimRunning && styles.simButtonTextActive]}
        >
          {isSimRunning ? '시뮬레이션 중지' : '시뮬레이션 시작'}
        </Text>
      </TouchableOpacity>

      {/* Today's Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{todayDetections.length}</Text>
          <Text style={styles.statLabel}>오늘 감지</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {todayDetections.filter((d) => d.action === 'blocked').length}
          </Text>
          <Text style={styles.statLabel}>차단</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {todayDetections.filter((d) => d.action === 'warned').length}
          </Text>
          <Text style={styles.statLabel}>경고</Text>
        </View>
      </View>

      {/* Detection Log */}
      <Text style={styles.sectionTitle}>감지 기록</Text>
      {todayDetections.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle" size={48} color="#10B981" />
          <Text style={styles.emptyText}>오늘은 감지된 항목이 없습니다</Text>
          <Text style={styles.emptySubtext}>
            시뮬레이션을 시작하면 테스트 데이터가 생성됩니다
          </Text>
        </View>
      ) : (
        todayDetections
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
          .slice(0, 20)
          .map((event) => (
            <View key={event.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={styles.logApp}>
                  <Ionicons name="apps" size={16} color="#A0A0C0" />
                  <Text style={styles.logAppName}>{event.appName}</Text>
                </View>
                <View
                  style={[
                    styles.actionBadge,
                    { backgroundColor: ACTION_COLORS[event.action] + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.actionText,
                      { color: ACTION_COLORS[event.action] },
                    ]}
                  >
                    {ACTION_LABELS[event.action]}
                  </Text>
                </View>
              </View>
              <Text style={styles.logKeywords}>
                키워드: {event.matchedKeywords.join(', ')}
              </Text>
              <View style={styles.logFooter}>
                <Text style={styles.logCategory}>
                  {CATEGORY_LABELS[event.category as ContentCategory]}
                </Text>
                <Text style={styles.logTime}>
                  {new Date(event.timestamp).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))
      )}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  modeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A0A0C0',
  },
  controlCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  controlTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  controlSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  simButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 24,
  },
  simButtonActive: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  simButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  simButtonTextActive: {
    color: '#EF4444',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B6B8D',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B6B8D',
    marginTop: 6,
    textAlign: 'center',
  },
  logCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logApp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logAppName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logKeywords: {
    fontSize: 13,
    color: '#A0A0C0',
    marginBottom: 8,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logCategory: {
    fontSize: 12,
    color: '#6B6B8D',
  },
  logTime: {
    fontSize: 12,
    color: '#6B6B8D',
  },
  bottomSpacer: {
    height: 100,
  },
});
