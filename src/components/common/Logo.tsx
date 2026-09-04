import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface LogoProps {
  size?: number;
  width?: number;
  height?: number;
  showText?: boolean;
  tintColor?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 36,
  width,
  height,
  showText: _showText = true,
  tintColor,
}) => {
  const finalWidth = width || size;
  const finalHeight = height || size;

  return (
    <View style={styles.container}>
      <Image
        source={require('../../logo_app.png')}
        style={{ width: finalWidth, height: finalHeight, tintColor }}
        resizeMode="contain"
        accessibilityLabel="Numvra"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
