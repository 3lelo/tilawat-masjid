export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSecondary: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  text: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderLight: string;
  card: string;
  cardHighlight: string;
  patternFill: string;
  patternOpacity: number;
  danger: string;
  warning: string;
  success: string;
  gold: string;
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export const lightTheme: ThemeColors = {
  // Soft off-white main background (not pure #FFFFFF), warm and easy on the eyes
  background: '#F6F8F3',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSecondary: '#EEF3EA',
  // Rich mosque green primary palette
  primary: '#1B5E20',
  primaryLight: '#2E7D32',
  primaryDark: '#0E3A12',
  // Accent turquoise / teal
  accent: '#00897B',
  accentLight: '#26A69A',
  // High contrast deep green-gray text meeting WCAG AA
  text: '#17271D',
  textMuted: '#586E61',
  textInverse: '#FFFFFF',
  border: '#D8E2D4',
  borderLight: '#E8EFE5',
  card: '#FFFFFF',
  cardHighlight: '#F1F6EF',
  patternFill: '#2E7D32',
  patternOpacity: 0.04,
  danger: '#D32F2F',
  warning: '#F57C00',
  success: '#2E7D32',
  gold: '#D4AF37',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E0E7DD',
  tabBarActive: '#1B5E20',
  tabBarInactive: '#7D9386',
};

export const darkTheme: ThemeColors = {
  // Deep midnight blue backgrounds with green/turquoise accents
  background: '#0B1320',
  surface: '#121E32',
  surfaceElevated: '#1A2942',
  surfaceSecondary: '#16243C',
  // Vibrant emerald mosque green
  primary: '#38A169',
  primaryLight: '#48BB78',
  primaryDark: '#276749',
  // Bright turquoise accent
  accent: '#2DD4BF',
  accentLight: '#5EEAD4',
  // Soft crisp readable text
  text: '#EDF2F7',
  textMuted: '#94A3B8',
  textInverse: '#0B1320',
  border: '#1E2F4A',
  borderLight: '#283E5F',
  card: '#132036',
  cardHighlight: '#1E3152',
  patternFill: '#2DD4BF',
  patternOpacity: 0.04,
  danger: '#F87171',
  warning: '#FBBF24',
  success: '#34D399',
  gold: '#F6E05E',
  tabBarBackground: '#0F1A2C',
  tabBarBorder: '#1A2A44',
  tabBarActive: '#38A169',
  tabBarInactive: '#64748B',
};
