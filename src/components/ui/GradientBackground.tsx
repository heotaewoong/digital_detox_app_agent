import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function GradientBackground({
  children,
  style,
}: GradientBackgroundProps) {
  return (
    <LinearGradient
      colors={['#0A0A1A', '#141428', '#0A0A1A']}
      locations={[0, 0.5, 1]}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
