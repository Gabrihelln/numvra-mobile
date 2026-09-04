import React from 'react';
import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { typography, type TypographyVariant } from '../theme/typography';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  style?: StyleProp<TextStyle>;
}

export const AppText: React.FC<AppTextProps> = ({
  variant = 'bodyMedium',
  style,
  children,
  ...props
}) => {
  return (
    <Text {...props} style={[typography[variant], style]}>
      {children}
    </Text>
  );
};
