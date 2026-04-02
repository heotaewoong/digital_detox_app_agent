import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, Line, G } from 'react-native-svg';
import { colors, fontSize, fontWeight } from '@/utils/theme';

interface TimelineData {
  hour: number;
  minutes: number;
}

interface TimelineChartProps {
  data: TimelineData[];
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 180;
const PADDING_LEFT = 30;
const PADDING_RIGHT = 10;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 28;
const USABLE_WIDTH = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const USABLE_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

const TimelineChart: React.FC<TimelineChartProps> = ({ data }) => {
  const maxMinutes = Math.max(...data.map((d) => d.minutes), 1);
  const peakThreshold = maxMinutes * 0.75;
  const barWidth = Math.max((USABLE_WIDTH / 24) - 2, 4);
  const barGap = (USABLE_WIDTH - barWidth * 24) / 23;

  // Y-axis ticks
  const yTicks = [0, Math.round(maxMinutes / 2), maxMinutes];

  return (
    <View style={styles.container}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick, i) => {
          const y = PADDING_TOP + USABLE_HEIGHT - (tick / maxMinutes) * USABLE_HEIGHT;
          return (
            <G key={`ytick-${i}`}>
              <Line
                x1={PADDING_LEFT}
                y1={y}
                x2={CHART_WIDTH - PADDING_RIGHT}
                y2={y}
                stroke={colors.glassBorder}
                strokeWidth={1}
              />
              <SvgText
                x={PADDING_LEFT - 6}
                y={y + 4}
                fill={colors.textMuted}
                fontSize={9}
                fontWeight={fontWeight.regular}
                textAnchor="end"
              >
                {tick}m
              </SvgText>
            </G>
          );
        })}

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.minutes / maxMinutes) * USABLE_HEIGHT;
          const x = PADDING_LEFT + index * (barWidth + barGap);
          const y = PADDING_TOP + USABLE_HEIGHT - barHeight;
          const isPeak = item.minutes >= peakThreshold && item.minutes > 0;
          const barColor = isPeak ? colors.accentRed : colors.primary;

          return (
            <G key={`bar-${index}`}>
              {/* Bar background */}
              <Rect
                x={x}
                y={PADDING_TOP}
                width={barWidth}
                height={USABLE_HEIGHT}
                fill={colors.surfaceLight}
                rx={2}
              />
              {/* Actual bar */}
              {item.minutes > 0 && (
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  fill={barColor}
                  rx={2}
                  opacity={isPeak ? 1 : 0.8}
                />
              )}
            </G>
          );
        })}

        {/* X-axis hour labels (show every 3 hours) */}
        {data.map((item, index) => {
          if (index % 3 !== 0) return null;
          const x = PADDING_LEFT + index * (barWidth + barGap) + barWidth / 2;
          const label = `${String(item.hour).padStart(2, '0')}`;
          return (
            <SvgText
              key={`label-${index}`}
              x={x}
              y={CHART_HEIGHT - 6}
              fill={colors.textMuted}
              fontSize={9}
              fontWeight={fontWeight.regular}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>

      {/* Peak indicator legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendLabel}>Normal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accentRed }]} />
          <Text style={styles.legendLabel}>Peak</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
});

export default TimelineChart;
