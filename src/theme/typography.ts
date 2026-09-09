import { Platform, TextStyle } from 'react-native';

export const fontFamilies = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export const iconSizes = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export type FontWeightToken = keyof typeof fontFamilies;
export type IconSizeToken = keyof typeof iconSizes;

export const fontForWeight = (weight?: TextStyle['fontWeight']) => {
  const normalized = String(weight || '400');
  if (normalized === '700' || normalized === '800' || normalized === '900' || normalized === 'bold') {
    return fontFamilies.bold;
  }
  if (normalized === '600') return fontFamilies.semibold;
  if (normalized === '500' || normalized === 'medium') return fontFamilies.medium;
  return fontFamilies.regular;
};

export const withFont = (style: TextStyle, family: FontWeightToken = 'regular') => ({
  ...style,
  fontFamily: fontFamilies[family],
  ...(Platform.OS === 'android' ? { fontWeight: 'normal' as TextStyle['fontWeight'] } : {}),
});

export const typography = {
  h1: withFont({
    fontSize: 24,
    lineHeight: 30,
  }, 'bold') as TextStyle,
  h2: withFont({
    fontSize: 20,
    lineHeight: 26,
  }, 'bold') as TextStyle,
  h3: withFont({
    fontSize: 16,
    lineHeight: 22,
  }, 'semibold') as TextStyle,
  bodyLarge: withFont({
    fontSize: 15,
    lineHeight: 21,
  }) as TextStyle,
  bodyMedium: withFont({
    fontSize: 13,
    lineHeight: 19,
  }) as TextStyle,
  bodySmall: withFont({
    fontSize: 11,
    lineHeight: 15,
  }) as TextStyle,
  caption: withFont({
    fontSize: 10,
    lineHeight: 13,
  }, 'medium') as TextStyle,
  label: withFont({
    fontSize: 11,
    lineHeight: 15,
  }, 'semibold') as TextStyle,
  button: withFont({
    fontSize: 14,
    lineHeight: 18,
  }, 'semibold') as TextStyle,
  subtitle: withFont({
    fontSize: 15,
    lineHeight: 21,
  }, 'semibold') as TextStyle,
  title: withFont({
    fontSize: 16,
    lineHeight: 22,
  }, 'bold') as TextStyle,
  heading: withFont({
    fontSize: 20,
    lineHeight: 26,
  }, 'bold') as TextStyle,
  amount: withFont({
    fontSize: 16,
    lineHeight: 20,
  }, 'semibold') as TextStyle,
};

export type TypographyVariant = keyof typeof typography;
