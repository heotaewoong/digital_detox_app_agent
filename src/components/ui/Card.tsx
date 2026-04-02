import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/utils/theme';

type CardVariant = 'default' | 'glass' | 'elevated';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
  onPress?: () => void;
}

export default function Card({
  children,
  style,
  variant = 'default',
  onPress,
}: CardProps) {
  const cardStyles: ViewStyle[] = [
    styles.base,
    variant === 'default' && styles.default,
    variant === 'glass' && styles.glass,
    variant === 'elevated' && styles.elevated,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[cardStyles, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyles, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: colors.card,
  },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  elevated: {
    backgroundColor: colors.card,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
