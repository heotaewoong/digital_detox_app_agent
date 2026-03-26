import React, { useEffect, useState, useRef } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { colors, fontSize } from '@/utils/theme';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
}

export default function AnimatedCounter({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  style,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = Date.now();

    const targetValue = value;
    const fromValue = startValueRef.current;
    const interval = 16; // ~60fps

    const animate = () => {
      const now = Date.now();
      const elapsed = now - (startTimeRef.current ?? now);
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromValue + (targetValue - fromValue) * eased;

      setDisplayValue(Math.round(current));

      if (progress < 1) {
        timerRef.current = setTimeout(animate, interval);
      } else {
        setDisplayValue(targetValue);
      }
    };

    animate();

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
    // Only re-run when target value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <Text style={[defaultStyle, style]}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </Text>
  );
}

const defaultStyle: TextStyle = {
  color: colors.textPrimary,
  fontSize: fontSize.xxl,
  fontWeight: '700',
};
