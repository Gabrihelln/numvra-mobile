import { Platform, TextStyle } from 'react-native';

export const fontFamilies = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export type FontWeightToken = keyof typeof fontFamilies;

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
    fontSize: 28,
    lineHeight: 34,
  }, 'bold') as TextStyle,
  h2: withFont({
    fontSize: 22,
    lineHeight: 28,
  }, 'bold') as TextStyle,
  h3: withFont({
    fontSize: 18,
    lineHeight: 24,
  }, 'semibold') as TextStyle,
  bodyLarge: withFont({
    fontSize: 16,
    lineHeight: 22,
  }) as TextStyle,
  bodyMedium: withFont({
    fontSize: 14,
    lineHeight: 20,
  }) as TextStyle,
  bodySmall: withFont({
    fontSize: 12,
    lineHeight: 16,
  }) as TextStyle,
  caption: withFont({
    fontSize: 11,
    lineHeight: 14,
  }, 'medium') as TextStyle,
  label: withFont({
    fontSize: 12,
    lineHeight: 16,
  }, 'semibold') as TextStyle,
  button: withFont({
    fontSize: 15,
    lineHeight: 20,
  }, 'semibold') as TextStyle,
  subtitle: withFont({
    fontSize: 16,
    lineHeight: 22,
  }, 'semibold') as TextStyle,
  title: withFont({
    fontSize: 18,
    lineHeight: 24,
  }, 'bold') as TextStyle,
  heading: withFont({
    fontSize: 22,
    lineHeight: 28,
  }, 'bold') as TextStyle,
  amount: withFont({
    fontSize: 18,
    lineHeight: 22,
  }, 'semibold') as TextStyle,
};

export type TypographyVariant = keyof typeof typography;
