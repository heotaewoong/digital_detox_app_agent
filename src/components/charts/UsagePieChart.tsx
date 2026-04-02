import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { colors, fontSize, fontWeight } from '@/utils/theme';

interface PieData {
  category: string;
  minutes: number;
  color: string;
}

interface UsagePieChartProps {
  data: PieData[];
}

const CHART_SIZE = 200;
const RADIUS = 80;
const CENTER = CHART_SIZE / 2;
const INNER_RADIUS = 50;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function createArcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = endAngle - startAngle;
  const largeArc = sweep > 180 ? 1 : 0;

  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

const UsagePieChart: React.FC<UsagePieChartProps> = ({ data }) => {
  const total = data.reduce((sum, d) => sum + d.minutes, 0);

  if (total === 0) {
    return (
      <View style={styles.container}>
        <Svg width={CHART_SIZE} height={CHART_SIZE}>
          <Path
            d={createArcPath(CENTER, CENTER, RADIUS, INNER_RADIUS, 0, 359.99)}
            fill={colors.surfaceLight}
          />
          <SvgText
            x={CENTER}
            y={CENTER + 4}
            fill={colors.textMuted}
            fontSize={fontSize.sm}
            fontWeight={fontWeight.medium}
            textAnchor="middle"
          >
            No data
          </SvgText>
        </Svg>
      </View>
    );
  }

  let currentAngle = 0;
  const slices = data.map((item) => {
    const sliceAngle = (item.minutes / total) * 360;
    const startAngle = currentAngle;
    // Clamp to avoid full-circle rounding issues
    const endAngle = Math.min(currentAngle + sliceAngle, 359.99);
    currentAngle += sliceAngle;

    return {
      ...item,
      startAngle,
      endAngle,
      percentage: Math.round((item.minutes / total) * 100),
    };
  });

  const totalHours = Math.floor(total / 60);
  const totalMins = total % 60;
  const centerLabel = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

  return (
    <View style={styles.container}>
      <Svg width={CHART_SIZE} height={CHART_SIZE}>
        <G>
          {slices.map((slice, index) => (
            <Path
              key={index}
              d={createArcPath(
                CENTER,
                CENTER,
                RADIUS,
                INNER_RADIUS,
                slice.startAngle,
                slice.endAngle,
              )}
              fill={slice.color}
            />
          ))}
        </G>
        <SvgText
          x={CENTER}
          y={CENTER - 4}
          fill={colors.textPrimary}
          fontSize={fontSize.lg}
          fontWeight={fontWeight.bold}
          textAnchor="middle"
        >
          {centerLabel}
        </SvgText>
        <SvgText
          x={CENTER}
          y={CENTER + 14}
          fill={colors.textMuted}
          fontSize={fontSize.xs}
          fontWeight={fontWeight.regular}
          textAnchor="middle"
        >
          Total
        </SvgText>
      </Svg>

      <View style={styles.legend}>
        {slices.map((slice, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
            <Text style={styles.legendCategory}>{slice.category}</Text>
            <Text style={styles.legendValue}>
              {slice.minutes}m ({slice.percentage}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  legend: {
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendCategory: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  legendValue: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});

export default UsagePieChart;
