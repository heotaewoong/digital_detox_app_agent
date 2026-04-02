import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { DetectionEvent } from '@/types';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/utils/theme';

interface DetectionLogProps {
  events: DetectionEvent[];
}

const ACTION_CONFIG: Record<
  DetectionEvent['action'],
  { label: string; color: string; bgColor: string }
> = {
  logged: {
    label: '기록됨',
    color: colors.info,
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
  warned: {
    label: '경고됨',
    color: colors.warning,
    bgColor: 'rgba(251, 191, 36, 0.15)',
  },
  blocked: {
    label: '차단됨',
    color: colors.danger,
    bgColor: 'rgba(239, 68, 68, 0.15)',
  },
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

function DetectionItem({ event }: { event: DetectionEvent }) {
  const actionCfg = ACTION_CONFIG[event.action];

  return (
    <View style={[styles.item, { borderLeftColor: actionCfg.color }]}>
      <View style={styles.itemHeader}>
        <Text style={styles.appName}>{event.appName}</Text>
        <View style={[styles.actionBadge, { backgroundColor: actionCfg.bgColor }]}>
          <Text style={[styles.actionText, { color: actionCfg.color }]}>
            {actionCfg.label}
          </Text>
        </View>
      </View>

      <Text style={styles.keywords} numberOfLines={1}>
        {event.matchedKeywords.join(', ')}
      </Text>

      <Text style={styles.timestamp}>{formatTimestamp(event.timestamp)}</Text>
    </View>
  );
}

export default function DetectionLog({ events }: DetectionLogProps) {
  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛡️</Text>
        <Text style={styles.emptyTitle}>탐지 기록 없음</Text>
        <Text style={styles.emptySubtitle}>
          모니터링을 시작하면 탐지된 콘텐츠가 여기에 표시됩니다.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>최근 탐지 기록</Text>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {events.map((event) => (
          <DetectionItem key={event.id} event={event} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  item: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  appName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  actionBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  actionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  keywords: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  timestamp: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
