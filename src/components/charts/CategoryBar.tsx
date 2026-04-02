import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { colors, fontSize, fontWeight, spacing, borderRadius } from '@/utils/theme';

interface CategoryBarData {
  category: string;
  percentage: number;
  color: string;
  label: string;
}

interface CategoryBarProps {
  data: CategoryBarData[];
}

const BAR_HEIGHT = 28;
const BAR_WIDTH = 260;
const LABEL_WIDTH = 70;
const PERCENT_WIDTH = 50;
const ROW_HEIGHT = 52;

const AnimatedBar: React.FC<{
  percentage: number;
  color: string;
  width: number;
  delay: number;
}> = ({ percentage, color, width, delay }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: percentage,
      duration: 800,
      delay,
      useNativeDriver: false,
    }).start();
  }, [percentage, delay]);

  const animatedWidth = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: [0, width],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        height: BAR_HEIGHT,
        width: animatedWidth,
        backgroundColor: color,
        borderRadius: borderRadius.sm,
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  );
};

const CategoryBar: React.FC<CategoryBarProps> = ({ data }) => {
  const sorted = [...data].sort((a, b) => b.percentage - a.percentage);

  return (
    <View style={styles.container}>
      {sorted.map((item, index) => (
        <View key={item.category} style={styles.row}>
          <View style={styles.labelContainer}>
            <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
            <Animated.Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Animated.Text>
          </View>

          <View style={styles.barContainer}>
            {/* Background track */}
            <View style={styles.barTrack} />
            {/* Animated fill */}
            <AnimatedBar
              percentage={item.percentage}
              color={item.color}
              width={BAR_WIDTH}
              delay={index * 100}
            />
          </View>

          <Animated.Text style={styles.percentLabel}>
            {item.percentage}%
          </Animated.Text>
        </View>
      ))}

      {/* Stacked summary bar at bottom */}
      <View style={styles.stackedContainer}>
        <Svg width={BAR_WIDTH + LABEL_WIDTH + PERCENT_WIDTH} height={20}>
          <G>
            {(() => {
              let offsetX = 0;
              const totalWidth = BAR_WIDTH + LABEL_WIDTH + PERCENT_WIDTH;
              return sorted.map((item, index) => {
                const segmentWidth = (item.percentage / 100) * totalWidth;
                const x = offsetX;
                offsetX += segmentWidth;
                return (
                  <Rect
                    key={`stack-${index}`}
                    x={x}
                    y={2}
                    width={Math.max(segmentWidth, 1)}
                    height={16}
                    fill={item.color}
                    rx={index === 0 ? 4 : 0}
                    ry={index === 0 ? 4 : 0}
                  />
                );
              });
            })()}
          </G>
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    height: BAR_HEIGHT,
  },
  labelContainer: {
    width: LABEL_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  colorIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  barContainer: {
    flex: 1,
    height: BAR_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
  },
  barTrack: {
    height: BAR_HEIGHT,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    width: '100%',
  },
  percentLabel: {
    width: PERCENT_WIDTH,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'right',
  },
  stackedContainer: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    paddingTop: spacing.md,
  },
});

export default CategoryBar;
