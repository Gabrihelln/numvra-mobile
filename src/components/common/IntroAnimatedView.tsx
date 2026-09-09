import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface IntroAnimatedViewProps {
  children: React.ReactNode;
  play: boolean;
  delay?: number;
  duration?: number;
  translateY?: number;
  translateX?: number;
  scaleFrom?: number;
  holdInitialState?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const IntroAnimatedView: React.FC<IntroAnimatedViewProps> = ({
  children,
  play,
  delay = 0,
  duration = 360,
  translateY = 12,
  translateX = 0,
  scaleFrom,
  holdInitialState = false,
  style,
}) => {
  const progress = useRef(new Animated.Value(play || holdInitialState ? 0 : 1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (holdInitialState && !play) {
      progress.stopAnimation();
      progress.setValue(0);
      return undefined;
    }

    if (!play || reduceMotion) {
      progress.stopAnimation();
      progress.setValue(1);
      return undefined;
    }

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [delay, duration, holdInitialState, play, progress, reduceMotion]);

  const transforms: any[] = [
    {
      translateY: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [translateY, 0],
      }),
    },
  ];

  if (translateX) {
    transforms.push({
      translateX: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [translateX, 0],
      }),
    });
  }

  if (scaleFrom) {
    transforms.push({
      scale: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [scaleFrom, 1],
      }),
    });
  }

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: transforms,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};