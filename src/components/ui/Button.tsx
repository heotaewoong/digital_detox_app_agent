import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize } from '@/utils/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    fullWidth && styles.fullWidth,
  ].filter(Boolean) as ViewStyle[];

  const textStyle: TextStyle[] = [
    styles.text,
    variant === 'ghost' && styles.ghostText,
    variant === 'danger' && styles.dangerText,
    variant === 'secondary' && styles.secondaryText,
    isDisabled && styles.disabledText,
  ].filter(Boolean) as TextStyle[];

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.textPrimary : colors.primary}
          style={styles.loader}
        />
      ) : icon ? (
        <View style={styles.icon}>{icon}</View>
      ) : null}
      <Text style={textStyle}>{title}</Text>
    </View>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[fullWidth && styles.fullWidth]}
      >
        <LinearGradient
          colors={
            isDisabled
              ? [colors.surfaceLight, colors.surface]
              : [colors.primaryStart, colors.primaryEnd]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[...containerStyle, styles.primaryContainer]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantContainerStyle: ViewStyle[] = [
    ...containerStyle,
    variant === 'secondary' && styles.secondaryContainer,
    variant === 'danger' && styles.dangerContainer,
    variant === 'ghost' && styles.ghostContainer,
    isDisabled && styles.disabledContainer,
  ].filter(Boolean) as ViewStyle[];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={variantContainerStyle}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  icon: {
    marginRight: spacing.sm,
  },
  loader: {
    marginRight: spacing.sm,
  },

  // Primary
  primaryContainer: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // Secondary (glass)
  secondaryContainer: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  secondaryText: {
    color: colors.textSecondary,
  },

  // Danger
  dangerContainer: {
    backgroundColor: colors.dangerDark,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerText: {
    color: colors.danger,
  },

  // Ghost
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.primary,
  },

  // Disabled
  disabledContainer: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});
