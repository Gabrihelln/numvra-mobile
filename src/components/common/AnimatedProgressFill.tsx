import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleProp, ViewStyle } from 'react-native';

interface AnimatedProgressFillProps {
  progress: number;
  shouldAnimate: boolean;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedProgressFill: React.FC<AnimatedProgressFillProps> = ({
  progress,
  shouldAnimate,
  delay = 420,
  duration = 650,
  style,
}) => {
  const animatedProgress = useRef(new Animated.Value(shouldAnimate ? 0 : progress)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const hasAnimatedRef = useRef(false);

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
    const shouldRun = shouldAnimate && !reduceMotion && !hasAnimatedRef.current;

    if (!shouldRun) {
      animatedProgress.stopAnimation();
      animatedProgress.setValue(progress);
      return undefined;
    }

    hasAnimatedRef.current = true;
    animatedProgress.stopAnimation();
    animatedProgress.setValue(0);

    const animation = Animated.timing(animatedProgress, {
      toValue: progress,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [animatedProgress, delay, duration, progress, reduceMotion, shouldAnimate]);

  const width = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return <Animated.View style={[style, { width }]} />;
};
