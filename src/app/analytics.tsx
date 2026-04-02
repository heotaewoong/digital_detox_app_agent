import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSiteTrackingStore } from '@/store/useSiteTrackingStore';
import { useFocusStore } from '@/store/useFocusStore';
import { useMonitorStore } from '@/store/useMonitorStore';
import { CATEGORY_DISPLAY } from '@/services/ai/ContentClassifier';
import { FocusScoreEngine } from '@/services/ai/FocusScoreEngine';
import { ChromeExtensionBridge, ExtensionReport } from '@/services/ChromeExtensionBridge';
import TimelineView from '@/components/charts/TimelineView';
import { ContentClassLabel, SiteVisit } from '@/types';

type AnalyticsTab = 'overview' | 'sites' | 'youtube' | 'blocked' | 'bypass';

export default function AnalyticsScreen() {
  const router = useRouter();
  const {
    todayVisits, blockedSites, bypassRules, widgetConfig,
    todayScreenMinutes, todayPickups, todayProductiveMinutes, todayDistractingMinutes,
    addBlockedSite, removeBlockedSite, toggleBlockedSite, toggleBypassRule,
    updateWidgetConfig, getSiteStats, getCategoryStats, getProductiveRatio,
    generateSimulationData, loadData,
  } = useSiteTrackingStore();
  const { getTodaySessions, focusStreak } = useFocusStore();
  const { detectionLog } = useMonitorStore();

  const [tab, setTab] = useState<AnalyticsTab>('overview');
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [newSiteReason, setNewSiteReason] = useState('');
  const [extensionReport, setExtensionReport] = useState<ExtensionReport | null>(null);
  const [extensionConnected, setExtensionConnected] = useState(false);

  useEffect(() => {
    loadData();
    if (todayVisits.length === 0) generateSimulationData();

    // 크롬 확장 프로그램 데이터 로드
    const extReport = ChromeExtensionBridge.getExtensionReport();
    const connected = ChromeExtensionBridge.isConnected();
    setExtensionReport(extReport);
    setExtensionConnected(connected);

    // 30초마다 확장 프로그램 데이터 갱신
    const interval = setInterval(() => {
      const r = ChromeExtensionBridge.getExtensionReport();
      const c = ChromeExtensionBridge.isConnected();
      setExtensionReport(r);
      setExtensionConnected(c);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const categoryStats = getCategoryStats();
  const siteStats = getSiteStats();
  const productiveRatio = getProductiveRatio();
  const youtubeVisits = todayVisits.filter((v) => v.domain.includes('youtube'));

  const handleAddBlockedSite = useCallback(() => {
    if (!newSiteUrl.trim()) return;
    addBlockedSite(newSiteUrl.trim(), newSiteReason.trim() || '사용자 차단', 'custom');
    setNewSiteUrl('');
    setNewSiteReason('');
    setShowAddSiteModal(false);
  }, [newSiteUrl, newSiteReason, addBlockedSite]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard')}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>사용 분석</Text>
          <TouchableOpacity onPress={generateSimulationData}>
            <Ionicons name="refresh" size={22} color="#6B6B8D" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {([
            { key: 'overview' as AnalyticsTab, label: '개요', icon: 'pie-chart-outline' },
            { key: 'sites' as AnalyticsTab, label: '사이트별', icon: 'globe-outline' },
            { key: 'youtube' as AnalyticsTab, label: 'YouTube', icon: 'logo-youtube' },
            { key: 'blocked' as AnalyticsTab, label: '사이트 차단', icon: 'ban-outline' },
            { key: 'bypass' as AnalyticsTab, label: '우회 방지', icon: 'shield-outline' },
          ]).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabChip, tab === t.key && styles.tabChipActive]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons name={t.icon as any} size={14} color={tab === t.key ? '#8B5CF6' : '#6B6B8D'} />
              <Text style={[styles.tabChipText, tab === t.key && styles.tabChipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {tab === 'overview' && renderOverview()}
        {tab === 'sites' && renderSites()}
        {tab === 'youtube' && renderYouTube()}
        {tab === 'blocked' && renderBlocked()}
        {tab === 'bypass' && renderBypass()}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Add Blocked Site Modal */}
      <Modal visible={showAddSiteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>사이트 차단 추가</Text>
              <TouchableOpacity onPress={() => setShowAddSiteModal(false)}>
                <Ionicons name="close" size={24} color="#A0A0C0" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>URL / 도메인</Text>
            <TextInput style={styles.input} placeholder="예: tiktok.com" placeholderTextColor="#6B6B8D"
              value={newSiteUrl} onChangeText={setNewSiteUrl} autoCapitalize="none" />
            <Text style={styles.inputLabel}>차단 사유 (선택)</Text>
            <TextInput style={styles.input} placeholder="예: 시간 낭비" placeholderTextColor="#6B6B8D"
              value={newSiteReason} onChangeText={setNewSiteReason} />
            <TouchableOpacity
              style={[styles.saveBtn, !newSiteUrl.trim() && { opacity: 0.5 }]}
              onPress={handleAddBlockedSite} disabled={!newSiteUrl.trim()}
            >
              <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.saveBtnGrad}>
                <Text style={styles.saveBtnText}>차단 추가</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  // ─── Overview Tab ───
  function renderOverview() {
    // 포커스 스코어 계산
    const focusScore = FocusScoreEngine.calculate({
      todayVisits,
      todaySessions: getTodaySessions(),
      todayDetections: detectionLog.filter((d) => d.timestamp.startsWith(new Date().toISOString().split('T')[0])),
      pickupCount: todayPickups,
      streak: focusStreak,
      screenTimeMinutes: todayScreenMinutes,
      screenTimeLimit: widgetConfig.limitWarningMinutes,
    });

    // 확장 프로그램 데이터 우선 사용
    const displayReport = extensionReport || null;
    const extStats = ChromeExtensionBridge.getExtensionStats();

    return (
      <View>
        {/* 크롬 확장 프로그램 연결 상태 */}
        <View style={[styles.extensionBadge, { borderColor: extensionConnected ? 'rgba(16,185,129,0.3)' : 'rgba(107,107,141,0.3)' }]}>
          <View style={[styles.extensionDot, { backgroundColor: extensionConnected ? '#10B981' : '#6B6B8D' }]} />
          <Text style={[styles.extensionText, { color: extensionConnected ? '#10B981' : '#6B6B8D' }]}>
            {extensionConnected ? '크롬 확장 프로그램 연결됨 · 실제 데이터' : '크롬 확장 프로그램 미연결 · 시뮬레이션 데이터'}
          </Text>
          {extStats && (
            <Text style={styles.extensionStats}>오늘 {extStats.todayBlocked}건 차단</Text>
          )}
        </View>

        {/* 확장 프로그램 실제 리포트 */}
        {displayReport && displayReport.totalMinutes > 0 && (
          <View style={styles.extReportCard}>
            <Text style={styles.extReportTitle}>📊 오늘 실제 사용 현황</Text>
            <View style={styles.extReportRow}>
              <View style={styles.extReportStat}>
                <Text style={styles.extReportNum}>{displayReport.totalMinutes}분</Text>
                <Text style={styles.extReportLabel}>총 사용</Text>
              </View>
              <View style={styles.extReportStat}>
                <Text style={[styles.extReportNum, { color: '#10B981' }]}>{displayReport.productiveRatio}%</Text>
                <Text style={styles.extReportLabel}>생산적</Text>
              </View>
              <View style={styles.extReportStat}>
                <Text style={[styles.extReportNum, { color: '#EF4444' }]}>{100 - displayReport.productiveRatio}%</Text>
                <Text style={styles.extReportLabel}>비생산적</Text>
              </View>
            </View>
            <View style={styles.extRatioBar}>
              <View style={[styles.extRatioProd, { flex: displayReport.productiveRatio || 1 }]} />
              <View style={[styles.extRatioDist, { flex: (100 - displayReport.productiveRatio) || 1 }]} />
            </View>
            {/* 카테고리별 */}
            {displayReport.categories.slice(0, 5).map((cat) => (
              <View key={cat.label} style={styles.extCatRow}>
                <Text style={styles.extCatEmoji}>{cat.emoji}</Text>
                <View style={styles.extCatInfo}>
                  <Text style={styles.extCatName}>{cat.labelDisplay}</Text>
                  <View style={styles.extCatBarBg}>
                    <View style={[styles.extCatBarFill, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
                  </View>
                </View>
                <Text style={styles.extCatTime}>{cat.minutes}분</Text>
              </View>
            ))}
          </View>
        )}
        {/* Focus Score Card */}
        <View style={styles.focusScoreCard}>
          <View style={styles.focusScoreHeader}>
            <View>
              <Text style={styles.focusScoreTitle}>포커스 스코어</Text>
              <Text style={styles.focusScoreComparison}>{focusScore.comparison}</Text>
            </View>
            <View style={[styles.gradeCircle, { borderColor: focusScore.gradeColor }]}>
              <Text style={[styles.gradeText, { color: focusScore.gradeColor }]}>{focusScore.grade}</Text>
              <Text style={styles.gradeEmoji}>{focusScore.gradeEmoji}</Text>
            </View>
          </View>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNum, { color: focusScore.gradeColor }]}>{focusScore.totalScore}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          {/* Score Breakdown */}
          <View style={styles.breakdownGrid}>
            {[
              { label: '생산성', score: focusScore.breakdown.productivityScore, color: '#10B981' },
              { label: '집중', score: focusScore.breakdown.focusSessionScore, color: '#3B82F6' },
              { label: '픽업', score: focusScore.breakdown.pickupScore, color: '#FBBF24' },
              { label: '차단', score: focusScore.breakdown.blockScore, color: '#EF4444' },
              { label: '연속', score: focusScore.breakdown.streakScore, color: '#8B5CF6' },
            ].map((item) => (
              <View key={item.label} style={styles.breakdownItem}>
                <View style={styles.breakdownBarBg}>
                  <View style={[styles.breakdownBarFill, { height: `${item.score}%`, backgroundColor: item.color }]} />
                </View>
                <Text style={styles.breakdownScore}>{item.score}</Text>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
          {/* Insights */}
          {focusScore.insights.length > 0 && (
            <View style={styles.insightsBox}>
              {focusScore.insights.map((insight, i) => (
                <Text key={i} style={styles.insightItem}>💡 {insight}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Timeline View */}
        <TimelineView visits={todayVisits} />
        {/* Productive vs Distracting */}
        <View style={styles.ratioCard}>
          <Text style={styles.ratioTitle}>생산성 비율</Text>
          <View style={styles.ratioBar}>
            <View style={[styles.ratioFillGood, { flex: productiveRatio || 1 }]} />
            <View style={[styles.ratioFillBad, { flex: (100 - productiveRatio) || 1 }]} />
          </View>
          <View style={styles.ratioLabels}>
            <Text style={styles.ratioLabelGood}>✅ 생산적 {productiveRatio}%</Text>
            <Text style={styles.ratioLabelBad}>⚠️ 비생산적 {100 - productiveRatio}%</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{todayScreenMinutes}분</Text>
            <Text style={styles.statLabel}>총 사용</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{todayPickups}회</Text>
            <Text style={styles.statLabel}>픽업</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{todayProductiveMinutes}분</Text>
            <Text style={styles.statLabel}>생산적</Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <Text style={styles.sectionLabel}>카테고리별 사용 시간</Text>
        {categoryStats.map((cat) => {
          const display = CATEGORY_DISPLAY[cat.label];
          return (
            <View key={cat.label} style={styles.categoryRow}>
              <Text style={styles.categoryEmoji}>{display.emoji}</Text>
              <View style={styles.categoryInfo}>
                <View style={styles.categoryNameRow}>
                  <Text style={styles.categoryName}>{display.name}</Text>
                  <View style={[styles.productiveBadge, { backgroundColor: cat.isProductive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                    <Text style={[styles.productiveBadgeText, { color: cat.isProductive ? '#10B981' : '#EF4444' }]}>
                      {cat.isProductive ? '생산적' : '비생산적'}
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryBarBg}>
                  <View style={[styles.categoryBarFill, { width: `${cat.percentage}%`, backgroundColor: display.color }]} />
                </View>
              </View>
              <Text style={styles.categoryTime}>{cat.totalMinutes}분</Text>
            </View>
          );
        })}

        {/* Floating Widget Config */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>플로팅 위젯 (YourHour)</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="layers" size={18} color="#8B5CF6" />
              <Text style={styles.settingLabel}>플로팅 타이머 표시</Text>
            </View>
            <Switch value={widgetConfig.enabled}
              onValueChange={(v) => updateWidgetConfig({ enabled: v })}
              trackColor={{ false: '#333', true: 'rgba(139,92,246,0.4)' }}
              thumbColor={widgetConfig.enabled ? '#8B5CF6' : '#666'} />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="time" size={18} color="#00D2FF" />
              <Text style={styles.settingLabel}>사용시간 표시</Text>
            </View>
            <Switch value={widgetConfig.showScreenTime}
              onValueChange={(v) => updateWidgetConfig({ showScreenTime: v })}
              trackColor={{ false: '#333', true: 'rgba(0,210,255,0.4)' }}
              thumbColor={widgetConfig.showScreenTime ? '#00D2FF' : '#666'} />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="hand-left" size={18} color="#FBBF24" />
              <Text style={styles.settingLabel}>픽업 횟수 표시</Text>
            </View>
            <Switch value={widgetConfig.showPickupCount}
              onValueChange={(v) => updateWidgetConfig({ showPickupCount: v })}
              trackColor={{ false: '#333', true: 'rgba(251,191,36,0.4)' }}
              thumbColor={widgetConfig.showPickupCount ? '#FBBF24' : '#666'} />
          </View>
        </View>

        {/* Widget Preview */}
        {widgetConfig.enabled && (
          <View style={styles.widgetPreview}>
            <Text style={styles.widgetPreviewTitle}>위젯 미리보기</Text>
            <View style={styles.widgetMock}>
              {widgetConfig.showScreenTime && (
                <Text style={styles.widgetMockText}>⏱️ {todayScreenMinutes}분</Text>
              )}
              {widgetConfig.showPickupCount && (
                <Text style={styles.widgetMockText}>📱 {todayPickups}회</Text>
              )}
              {widgetConfig.showBlockedCount && (
                <Text style={styles.widgetMockText}>🛡️ {blockedSites.filter((s) => s.enabled).length}건</Text>
              )}
            </View>
          </View>
        )}
      </View>
    );
  }

  // ─── Sites Tab ───
  function renderSites() {
    return (
      <View>
        <Text style={styles.sectionLabel}>사이트별 접속 시간 (오늘)</Text>
        {siteStats.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="globe-outline" size={48} color="#6B6B8D" />
            <Text style={styles.emptyText}>접속 기록이 없어요</Text>
          </View>
        ) : (
          siteStats.map((site) => {
            const display = CATEGORY_DISPLAY[site.classLabel];
            return (
              <View key={site.domain} style={styles.siteRow}>
                <View style={[styles.siteDot, { backgroundColor: display.color }]} />
                <View style={styles.siteInfo}>
                  <Text style={styles.siteDomain}>{site.domain}</Text>
                  <View style={styles.siteMetaRow}>
                    <Text style={styles.siteMeta}>{display.emoji} {display.name}</Text>
                    <Text style={styles.siteMeta}>•</Text>
                    <Text style={styles.siteMeta}>{site.visitCount}회 방문</Text>
                  </View>
                </View>
                <Text style={styles.siteTime}>{Math.round(site.totalMinutes)}분</Text>
              </View>
            );
          })
        )}
      </View>
    );
  }

  // ─── YouTube Tab ───
  function renderYouTube() {
    // 유튜브 영상을 카테고리별로 그룹화
    const grouped = new Map<ContentClassLabel, SiteVisit[]>();
    for (const v of youtubeVisits) {
      const list = grouped.get(v.classLabel) || [];
      list.push(v);
      grouped.set(v.classLabel, list);
    }

    // 유튜브 공부 vs 게임 비율 계산
    const studyYtMin = youtubeVisits.filter((v) => v.classLabel === 'study').reduce((s, v) => s + v.durationSeconds / 60, 0);
    const gameYtMin = youtubeVisits.filter((v) => v.classLabel === 'gaming').reduce((s, v) => s + v.durationSeconds / 60, 0);
    const totalYtMin = youtubeVisits.reduce((s, v) => s + v.durationSeconds / 60, 0);
    const studyRatio = totalYtMin > 0 ? Math.round((studyYtMin / totalYtMin) * 100) : 0;

    return (
      <View>
        {/* YouTube Study vs Game Ratio */}
        {totalYtMin > 0 && (
          <View style={styles.ytRatioCard}>
            <Text style={styles.ytRatioTitle}>📚 공부 vs 🎮 게임 비율</Text>
            <View style={styles.ytRatioBar}>
              <View style={[styles.ytRatioStudy, { flex: studyRatio || 1 }]} />
              <View style={[styles.ytRatioGame, { flex: (100 - studyRatio) || 1 }]} />
            </View>
            <View style={styles.ytRatioLabels}>
              <Text style={styles.ytRatioLabelStudy}>📚 공부 {studyRatio}% ({Math.round(studyYtMin)}분)</Text>
              <Text style={styles.ytRatioLabelGame}>🎮 게임 {100 - studyRatio}% ({Math.round(gameYtMin)}분)</Text>
            </View>
            <Text style={styles.ytRatioAdvice}>
              {studyRatio >= 60 ? '✅ 유튜브를 학습에 잘 활용하고 있어요!' :
               studyRatio >= 30 ? '💪 공부 영상 비율을 더 높여보세요.' :
               '⚠️ 게임/엔터 영상이 대부분이에요. 학습 채널을 구독해보세요.'}
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>YouTube 영상 AI 분류</Text>
        <Text style={styles.sectionHint}>
          유튜브 영상을 제목 기반으로 공부/게임/엔터 등으로 자동 분류합니다
        </Text>

        {/* YouTube Category Summary */}
        <View style={styles.ytSummary}>
          {Array.from(grouped.entries()).map(([label, visits]) => {
            const display = CATEGORY_DISPLAY[label];
            const totalMin = Math.round(visits.reduce((s, v) => s + v.durationSeconds / 60, 0));
            return (
              <View key={label} style={styles.ytSummaryItem}>
                <Text style={styles.ytSummaryEmoji}>{display.emoji}</Text>
                <Text style={styles.ytSummaryLabel}>{display.name}</Text>
                <Text style={styles.ytSummaryCount}>{visits.length}개</Text>
                <Text style={styles.ytSummaryTime}>{totalMin}분</Text>
              </View>
            );
          })}
        </View>

        {/* Individual Videos */}
        {youtubeVisits.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="logo-youtube" size={48} color="#6B6B8D" />
            <Text style={styles.emptyText}>유튜브 시청 기록이 없어요</Text>
          </View>
        ) : (
          youtubeVisits.map((v) => {
            const display = CATEGORY_DISPLAY[v.classLabel];
            return (
              <View key={v.id} style={styles.ytVideoCard}>
                <View style={styles.ytVideoHeader}>
                  <View style={[styles.ytCategoryBadge, { backgroundColor: `${display.color}20` }]}>
                    <Text style={[styles.ytCategoryText, { color: display.color }]}>
                      {display.emoji} {display.name}
                    </Text>
                  </View>
                  <Text style={styles.ytConfidence}>
                    {Math.round(v.confidence * 100)}% 확신
                  </Text>
                </View>
                <Text style={styles.ytVideoTitle} numberOfLines={2}>{v.title}</Text>
                <View style={styles.ytVideoMeta}>
                  <Text style={styles.ytVideoMetaText}>
                    {Math.round(v.durationSeconds / 60)}분 시청
                  </Text>
                  <Text style={styles.ytVideoMetaText}>•</Text>
                  <Text style={styles.ytVideoMetaText}>{v.appSource}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  }

  // ─── Blocked Sites Tab (BlockP 벤치마킹) ───
  function renderBlocked() {
    return (
      <View>
        <View style={styles.blockedHeader}>
          <Text style={styles.sectionLabel}>차단된 사이트</Text>
          <TouchableOpacity style={styles.addSiteBtn} onPress={() => setShowAddSiteModal(true)}>
            <Ionicons name="add-circle" size={28} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {blockedSites.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="ban-outline" size={48} color="#6B6B8D" />
            <Text style={styles.emptyText}>차단된 사이트가 없어요</Text>
          </View>
        ) : (
          blockedSites.map((site) => (
            <View key={site.id} style={styles.blockedSiteRow}>
              <View style={styles.blockedSiteInfo}>
                <Text style={styles.blockedSiteUrl}>{site.url}</Text>
                <Text style={styles.blockedSiteReason}>{site.reason}</Text>
              </View>
              <Switch value={site.enabled}
                onValueChange={() => toggleBlockedSite(site.id)}
                trackColor={{ false: '#333', true: 'rgba(239,68,68,0.4)' }}
                thumbColor={site.enabled ? '#EF4444' : '#666'} />
              <TouchableOpacity onPress={() => {
                Alert.alert('삭제', `${site.url}을(를) 삭제하시겠습니까?`, [
                  { text: '취소', style: 'cancel' },
                  { text: '삭제', style: 'destructive', onPress: () => removeBlockedSite(site.id) },
                ]);
              }}>
                <Ionicons name="trash-outline" size={18} color="#6B6B8D" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    );
  }

  // ─── Bypass Prevention Tab (카카오톡 우회 방지) ───
  function renderBypass() {
    return (
      <View>
        <Text style={styles.sectionLabel}>앱 내 브라우저 우회 방지</Text>
        <Text style={styles.sectionHint}>
          카카오톡, 네이버 등 앱 내 브라우저를 통해 차단된 사이트에 접속하는 것을 방지합니다
        </Text>

        {bypassRules.map((rule) => (
          <View key={rule.id} style={styles.bypassCard}>
            <View style={styles.bypassHeader}>
              <View style={styles.bypassInfo}>
                <Text style={styles.bypassApp}>{rule.appName}</Text>
                <View style={[styles.bypassTypeBadge, {
                  backgroundColor: rule.bypassType === 'in_app_browser' ? 'rgba(59,130,246,0.15)' :
                    rule.bypassType === 'link_redirect' ? 'rgba(249,115,22,0.15)' : 'rgba(139,92,246,0.15)',
                }]}>
                  <Text style={[styles.bypassTypeText, {
                    color: rule.bypassType === 'in_app_browser' ? '#3B82F6' :
                      rule.bypassType === 'link_redirect' ? '#F97316' : '#8B5CF6',
                  }]}>
                    {rule.bypassType === 'in_app_browser' ? '내장 브라우저' :
                      rule.bypassType === 'link_redirect' ? '링크 리다이렉트' : '웹뷰'}
                  </Text>
                </View>
              </View>
              <Switch value={rule.enabled}
                onValueChange={() => toggleBypassRule(rule.id)}
                trackColor={{ false: '#333', true: 'rgba(239,68,68,0.4)' }}
                thumbColor={rule.enabled ? '#EF4444' : '#666'} />
            </View>
            <Text style={styles.bypassDesc}>{rule.description}</Text>
          </View>
        ))}

        {/* How it works */}
        <View style={styles.howItWorks}>
          <Text style={styles.howItWorksTitle}>🔒 작동 방식</Text>
          <Text style={styles.howItWorksText}>
            1. 카카오톡에서 링크를 클릭하면 내장 브라우저가 열립니다{'\n'}
            2. 이 때 차단된 사이트/키워드가 감지되면 자동으로 차단합니다{'\n'}
            3. 외부 브라우저로 리다이렉트되는 경우도 감지합니다{'\n'}
            4. 인스타그램, 네이버 등 다른 앱의 웹뷰도 지원합니다
          </Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },

  // Tabs
  tabScroll: { marginBottom: 20 },
  tabChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  tabChipActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.15)' },
  tabChipText: { fontSize: 13, fontWeight: '600', color: '#6B6B8D' },
  tabChipTextActive: { color: '#8B5CF6' },

  // Section
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#6B6B8D', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  sectionHint: { fontSize: 13, color: '#6B6B8D', marginBottom: 16, lineHeight: 20 },

  // Ratio Card
  ratioCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  ratioTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
  ratioBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  ratioFillGood: { backgroundColor: '#10B981', borderRadius: 6 },
  ratioFillBad: { backgroundColor: '#EF4444', borderRadius: 6 },
  ratioLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  ratioLabelGood: { fontSize: 13, color: '#10B981', fontWeight: '600' },
  ratioLabelBad: { fontSize: 13, color: '#EF4444', fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statNum: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: '#6B6B8D', marginTop: 4 },

  // Category
  categoryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  categoryEmoji: { fontSize: 24 },
  categoryInfo: { flex: 1 },
  categoryNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  categoryName: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  productiveBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  productiveBadgeText: { fontSize: 10, fontWeight: '600' },
  categoryBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  categoryBarFill: { height: '100%', borderRadius: 3 },
  categoryTime: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', width: 50, textAlign: 'right' },

  // Widget
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 16,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingLabel: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 14 },
  widgetPreview: { marginBottom: 20 },
  widgetPreviewTitle: { fontSize: 13, color: '#6B6B8D', marginBottom: 8 },
  widgetMock: {
    flexDirection: 'row', gap: 12, backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 12,
    padding: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  widgetMockText: { fontSize: 13, fontWeight: '600', color: '#10B981' },

  // Sites
  siteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  siteDot: { width: 10, height: 10, borderRadius: 5 },
  siteInfo: { flex: 1 },
  siteDomain: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  siteMetaRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  siteMeta: { fontSize: 12, color: '#6B6B8D' },
  siteTime: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // YouTube
  ytSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  ytSummaryItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  ytSummaryEmoji: { fontSize: 16 },
  ytSummaryLabel: { fontSize: 12, color: '#A0A0C0' },
  ytSummaryCount: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  ytSummaryTime: { fontSize: 12, color: '#6B6B8D' },
  ytVideoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  ytVideoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ytCategoryBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  ytCategoryText: { fontSize: 12, fontWeight: '600' },
  ytConfidence: { fontSize: 11, color: '#6B6B8D' },
  ytVideoTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', lineHeight: 20, marginBottom: 6 },
  ytVideoMeta: { flexDirection: 'row', gap: 6 },
  ytVideoMetaText: { fontSize: 12, color: '#6B6B8D' },

  // Blocked Sites
  blockedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addSiteBtn: { padding: 4 },
  blockedSiteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  blockedSiteInfo: { flex: 1 },
  blockedSiteUrl: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  blockedSiteReason: { fontSize: 12, color: '#6B6B8D', marginTop: 2 },

  // Bypass
  bypassCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  bypassHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bypassInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bypassApp: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  bypassTypeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  bypassTypeText: { fontSize: 11, fontWeight: '600' },
  bypassDesc: { fontSize: 13, color: '#6B6B8D', lineHeight: 18 },
  howItWorks: {
    backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 14, padding: 16, marginTop: 16,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  howItWorksTitle: { fontSize: 15, fontWeight: '600', color: '#8B5CF6', marginBottom: 8 },
  howItWorksText: { fontSize: 13, color: '#A0A0C0', lineHeight: 22 },

  // Empty
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginTop: 12 },

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
  saveBtn: { marginTop: 24 },
  saveBtnGrad: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  bottomSpacer: { height: 120 },

  // Focus Score
  focusScoreCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  focusScoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  focusScoreTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  focusScoreComparison: { fontSize: 12, color: '#6B6B8D', marginTop: 4 },
  gradeCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontSize: 20, fontWeight: '700' },
  gradeEmoji: { fontSize: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  scoreNum: { fontSize: 48, fontWeight: '700' },
  scoreMax: { fontSize: 18, color: '#6B6B8D', marginLeft: 4 },
  breakdownGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  breakdownItem: { alignItems: 'center', gap: 4 },
  breakdownBarBg: { width: 24, height: 60, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  breakdownBarFill: { width: '100%', borderRadius: 4 },
  breakdownScore: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  breakdownLabel: { fontSize: 10, color: '#6B6B8D' },
  insightsBox: { backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 12, padding: 12, gap: 6 },
  insightItem: { fontSize: 13, color: '#A0A0C0', lineHeight: 18 },

  // YouTube Ratio
  ytRatioCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  ytRatioTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
  ytRatioBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  ytRatioStudy: { backgroundColor: '#10B981' },
  ytRatioGame: { backgroundColor: '#EF4444' },
  ytRatioLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ytRatioLabelStudy: { fontSize: 12, fontWeight: '600', color: '#10B981' },
  ytRatioLabelGame: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  ytRatioAdvice: { fontSize: 13, color: '#A0A0C0', lineHeight: 18 },

  // Extension Bridge
  extensionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1 },
  extensionDot: { width: 8, height: 8, borderRadius: 4 },
  extensionText: { flex: 1, fontSize: 12, fontWeight: '500' },
  extensionStats: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  extReportCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  extReportTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
  extReportRow: { flexDirection: 'row', marginBottom: 10 },
  extReportStat: { flex: 1, alignItems: 'center' },
  extReportNum: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  extReportLabel: { fontSize: 11, color: '#6B6B8D', marginTop: 2 },
  extRatioBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  extRatioProd: { backgroundColor: '#10B981' },
  extRatioDist: { backgroundColor: '#EF4444' },
  extCatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  extCatEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  extCatInfo: { flex: 1 },
  extCatName: { fontSize: 12, fontWeight: '500', color: '#FFFFFF', marginBottom: 3 },
  extCatBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  extCatBarFill: { height: '100%', borderRadius: 2 },
  extCatTime: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', minWidth: 36, textAlign: 'right' },
});
