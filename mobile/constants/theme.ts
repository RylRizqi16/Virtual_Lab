// Color palette matching web version (light theme)
export const colors = {
  // Primary colors (from web CSS variables)
  primary: '#0a58ca',
  primaryDark: '#084298',
  primaryLight: '#3d7dd9',
  accent: '#0dcaf0',

  // Background colors
  background: '#f5f9ff',
  surface: '#ffffff',
  surfaceLight: '#f7faff',

  // Border colors
  border: '#dbe6ff',
  borderLight: '#e7efff',

  // Text colors
  text: '#1b2a4e',
  textSecondary: '#3e4a6b',
  textMuted: '#54648c',

  // Status colors
  success: '#1abc9c',
  warning: '#f39c12',
  error: '#e74c3c',
  info: '#0dcaf0',

  // Accent colors
  accent1: '#0dcaf0',
  accent2: '#1abc9c',
  accent3: '#f39c12',
  
  // Badge/Pill colors
  badgeBg: 'rgba(10, 88, 202, 0.12)',
  pillBg: '#f0f7ff',
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

// Border radius (matching web --radius: 16px)
export const borderRadius = {
  sm: 4,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 18,
  full: 9999,
};

// Shadows (matching web shadow-light and shadow-heavy)
export const shadows = {
  sm: {
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1b2a4e',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
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
