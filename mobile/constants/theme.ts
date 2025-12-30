// Color palette based on original Virtual Lab design
export const colors = {
  // Primary colors
  primary: '#00d4ff',
  primaryDark: '#00a8cc',
  primaryLight: '#4de3ff',

  // Background colors
  background: '#1a1a2e',
  surface: '#16213e',
  surfaceLight: '#1f2b47',

  // Border colors
  border: '#0f3460',
  borderLight: '#1a3a5c',

  // Text colors
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#666666',

  // Status colors
  success: '#4ecdc4',
  warning: '#ffd93d',
  error: '#ff6b6b',
  info: '#6c5ce7',

  // Accent colors
  accent1: '#ff6b6b',
  accent2: '#4ecdc4',
  accent3: '#ffd93d',
};

// Typography
export const typography = {
  fontSizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 32,
    '5xl': 36,
  },
  fontWeights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
};

// Border radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

// Shadows (for web)
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Theme object
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export type Theme = typeof theme;
