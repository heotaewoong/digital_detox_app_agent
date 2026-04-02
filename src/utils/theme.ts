export const colors = {
  // Base
  background: '#0A0A1A',
  surface: '#141428',
  surfaceLight: '#1E1E3A',
  card: '#1A1A35',
  cardHover: '#222245',

  // Primary gradient
  primaryStart: '#6C5CE7',
  primaryEnd: '#A855F7',
  primary: '#8B5CF6',

  // Accent
  accent: '#00D2FF',
  accentGreen: '#10B981',
  accentYellow: '#FBBF24',
  accentRed: '#EF4444',
  accentOrange: '#F97316',
  accentPink: '#EC4899',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0C0',
  textMuted: '#6B6B8D',
  textAccent: '#8B5CF6',

  // Status
  success: '#10B981',
  warning: '#FBBF24',
  danger: '#EF4444',
  dangerDark: '#3B1111',
  info: '#3B82F6',

  // Category colors
  categories: {
    gambling: '#EF4444',
    gaming: '#F97316',
    adult: '#EC4899',
    social_media: '#3B82F6',
    shopping: '#FBBF24',
    news: '#10B981',
    custom: '#8B5CF6',
  } as Record<string, string>,

  // Glass effect
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  hero: 48,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 4,
  },
  lg: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  glow: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
};
