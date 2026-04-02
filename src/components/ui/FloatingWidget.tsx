import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder, Dimensions, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSiteTrackingStore } from '@/store/useSiteTrackingStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const WIDGET_W = 120;
const WIDGET_H = 44;

/**
 * YourHour 벤치마킹 - 플로팅 타이머 위젯
 * 모든 화면 위에 떠있으며 실시간 사용시간, 픽업 횟수를 표시합니다.
 * 드래그로 위치 이동 가능, 사용량에 따라 색상이 자동 변경됩니다.
 */
export default function FloatingWidget() {
  const { widgetConfig, todayScreenMinutes, todayPickups } = useSiteTrackingStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_W - WIDGET_W - 16, y: 100 })).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // 사용량에 따른 색상 결정 (YourHour 스타일)
  const getStatusColor = () => {
    if (widgetConfig.colorMode !== 'auto') {
      const colors: Record<string, string> = { green: '#10B981', yellow: '#FBBF24', red: '#EF4444' };
      return colors[widgetConfig.colorMode] || '#10B981';
    }
    if (todayScreenMinutes > widgetConfig.limitWarningMinutes) return '#EF4444';
    if (todayScreenMinutes > widgetConfig.limitWarningMinutes * 0.7) return '#FBBF24';
    return '#10B981';
  };

  const statusColor = getStatusColor();

  // 드래그 핸들러
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
        Animated.spring(scaleAnim, { toValue: 1.1, useNativeDriver: true }).start();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        // 짧은 탭이면 확장/축소 토글
        if (Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5) {
          setIsExpanded((prev) => !prev);
        }
      },
    })
  ).current;

  if (!widgetConfig.enabled) return null;

  const formatTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scaleAnim }],
          opacity: widgetConfig.opacity,
          borderColor: statusColor,
          backgroundColor: `${statusColor}15`,
        },
        isExpanded && styles.containerExpanded,
      ]}
      {...panResponder.panHandlers}
    >
      {/* Compact View */}
      <View style={styles.compactRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        {widgetConfig.showScreenTime && (
          <Text style={[styles.timeText, { color: statusColor }]}>{formatTime(todayScreenMinutes)}</Text>
        )}
        {widgetConfig.showPickupCount && (
          <Text style={styles.pickupText}>📱{todayPickups}</Text>
        )}
      </View>

      {/* Expanded View */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.expandedRow}>
            <Ionicons name="time-outline" size={14} color="#A0A0C0" />
            <Text style={styles.expandedLabel}>사용시간</Text>
            <Text style={[styles.expandedValue, { color: statusColor }]}>{formatTime(todayScreenMinutes)}</Text>
          </View>
          <View style={styles.expandedRow}>
            <Ionicons name="hand-left-outline" size={14} color="#A0A0C0" />
            <Text style={styles.expandedLabel}>픽업</Text>
            <Text style={styles.expandedValue}>{todayPickups}회</Text>
          </View>
          <View style={styles.expandedRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#A0A0C0" />
            <Text style={styles.expandedLabel}>제한</Text>
            <Text style={styles.expandedValue}>{formatTime(widgetConfig.limitWarningMinutes)}</Text>
          </View>
          {/* Progress bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, {
              width: `${Math.min(100, (todayScreenMinutes / widgetConfig.limitWarningMinutes) * 100)}%`,
              backgroundColor: statusColor,
            }]} />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: WIDGET_W,
  },
  containerExpanded: {
    minWidth: 180,
    borderRadius: 16,
    paddingVertical: 12,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  pickupText: {
    fontSize: 12,
    color: '#A0A0C0',
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 10,
    gap: 6,
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandedLabel: {
    flex: 1,
    fontSize: 12,
    color: '#A0A0C0',
  },
  expandedValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
