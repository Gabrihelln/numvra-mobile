import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

/** White background with the same soft, peripheral color treatment used by entry screens. */
export const PeripheralGlowBackground: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const radius = Math.hypot(width, height) * 0.72;

  return (
  <Svg
    pointerEvents="none"
    style={styles.background}
    width={width}
    height={height}
    viewBox={`0 0 ${width} ${height}`}
  >
    <Defs>
      <RadialGradient id="numvraPurpleGlow" gradientUnits="userSpaceOnUse" cx={0} cy={0} r={radius}>
        <Stop offset="0%" stopColor="#7B61FF" stopOpacity="0.38" />
        <Stop offset="42%" stopColor="#7B61FF" stopOpacity="0.15" />
        <Stop offset="100%" stopColor="#7B61FF" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="numvraMintGlow" gradientUnits="userSpaceOnUse" cx={width} cy={height} r={radius}>
        <Stop offset="0%" stopColor="#45F1C5" stopOpacity="0.36" />
        <Stop offset="42%" stopColor="#45F1C5" stopOpacity="0.14" />
        <Stop offset="100%" stopColor="#45F1C5" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#numvraPurpleGlow)" />
    <Rect width="100%" height="100%" fill="url(#numvraMintGlow)" />
  </Svg>
  );
};

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
  },
});
