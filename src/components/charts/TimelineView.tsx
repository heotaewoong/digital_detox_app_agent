import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SiteVisit } from '@/types';
import { CATEGORY_DISPLAY } from '@/services/ai/ContentClassifier';

/**
 * Rize 벤치마킹 - 타임라인 뷰
 * 시간대별로 어떤 사이트/앱을 사용했는지 시각적으로 보여줍니다.
 * 각 시간대의 생산적/비생산적 비율도 색상으로 표시합니다.
 */

interface TimelineViewProps {
  visits: SiteVisit[];
  startHour?: number;
  endHour?: number;
}

interface HourBlock {
  hour: number;
  visits: SiteVisit[];
  totalMinutes: number;
  productiveMinutes: number;
  distractingMinutes: number;
  dominantCategory: string;
  dominantColor: string;
}

export default function TimelineView({ visits, startHour = 6, endHour = 24 }: TimelineViewProps) {
  const hours: HourBlock[] = [];

  for (let h = startHour; h < endHour; h++) {
    const hourVisits = visits.filter((v) => {
      const visitHour = new Date(v.startTime).getHours();
      return visitHour === h;
    });

    let totalMin = 0;
    let prodMin = 0;
    let distMin = 0;
    const catCount = new Map<string, number>();

    for (const v of hourVisits) {
      const min = v.durationSeconds / 60;
      totalMin += min;
      const display = CATEGORY_DISPLAY[v.classLabel];
      if (display?.isProductive) prodMin += min;
      else distMin += min;
      catCount.set(v.classLabel, (catCount.get(v.classLabel) || 0) + min);
    }

    let dominantCat = 'other';
    let maxMin = 0;
    for (const [cat, min] of catCount) {
      if (min > maxMin) { dominantCat = cat; maxMin = min; }
    }

    const display = CATEGORY_DISPLAY[dominantCat as keyof typeof CATEGORY_DISPLAY];

    hours.push({
      hour: h,
      visits: hourVisits,
      totalMinutes: Math.round(totalMin),
      productiveMinutes: Math.round(prodMin),
      distractingMinutes: Math.round(distMin),
      dominantCategory: display?.name || '없음',
      dominantColor: display?.color || '#374151',
    });
  }

  const maxMinutes = Math.max(...hours.map((h) => h.totalMinutes), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>시간대별 사용 타임라인</Text>
      <Text style={styles.subtitle}>Rize 스타일 · 생산적(초록) vs 비생산적(빨강)</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.timeline}>
          {hours.map((block) => {
            const barHeight = block.totalMinutes > 0
              ? Math.max(8, (block.totalMinutes / maxMinutes) * 120)
              : 4;
            const prodRatio = block.totalMinutes > 0
              ? block.productiveMinutes / block.totalMinutes
              : 0;

            return (
              <View key={block.hour} style={styles.hourColumn}>
                {/* Bar */}
                <View style={styles.barContainer}>
                  {block.totalMinutes > 0 ? (
                    <View style={[styles.bar, { height: barHeight }]}>
                      <View style={[styles.barProductive, { flex: prodRatio }]} />
                      <View style={[styles.barDistracting, { flex: 1 - prodRatio }]} />
                    </View>
                  ) : (
                    <View style={[styles.barEmpty, { height: barHeight }]} />
                  )}
                </View>

                {/* Minutes label */}
                {block.totalMinutes > 0 && (
                  <Text style={styles.minuteLabel}>{block.totalMinutes}분</Text>
                )}

                {/* Hour label */}
                <Text style={styles.hourLabel}>{block.hour}시</Text>

                {/* Category dot */}
                {block.totalMinutes > 0 && (
                  <View style={[styles.catDot, { backgroundColor: block.dominantColor }]} />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>생산적</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>비생산적</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#6B6B8D', marginBottom: 16 },
  scrollView: { marginBottom: 12 },
  timeline: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingBottom: 4 },
  hourColumn: { alignItems: 'center', width: 36 },
  barContainer: { justifyContent: 'flex-end', height: 120, marginBottom: 4 },
  bar: { width: 20, borderRadius: 4, overflow: 'hidden', flexDirection: 'column' },
  barProductive: { backgroundColor: '#10B981' },
  barDistracting: { backgroundColor: '#EF4444' },
  barEmpty: { width: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 },
  minuteLabel: { fontSize: 9, color: '#6B6B8D', marginBottom: 2 },
  hourLabel: { fontSize: 10, color: '#A0A0C0', fontWeight: '500' },
  catDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#A0A0C0' },
});
