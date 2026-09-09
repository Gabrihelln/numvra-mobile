import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Text,
  TextStyle,
} from 'react-native';

interface AnimatedCurrencyProps {
  value: number;
  shouldAnimate: boolean;
  isVisible?: boolean;
  duration?: number;
  delay?: number;
  prefix?: string;
  hiddenValue?: string;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
}

const formatMoney = (value: number) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const AnimatedCurrency: React.FC<AnimatedCurrencyProps> = ({
  value,
  shouldAnimate,
  isVisible = true,
  duration = 850,
  delay = 0,
  prefix = '',
  hiddenValue = '••••••',
  style,
  numberOfLines,
  adjustsFontSizeToFit,
  minimumFontScale,
}) => {
  const animatedValue = useRef(new Animated.Value(shouldAnimate ? 0 : value)).current;
  const [displayValue, setDisplayValue] = useState(shouldAnimate ? 0 : value);
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
    const shouldRun = shouldAnimate && isVisible && !reduceMotion && !hasAnimatedRef.current;

    if (!shouldRun) {
      animatedValue.stopAnimation();
      animatedValue.setValue(value);
      setDisplayValue(value);
      return undefined;
    }

    hasAnimatedRef.current = true;
    animatedValue.stopAnimation();
    animatedValue.setValue(0);
    setDisplayValue(0);

    const listenerId = animatedValue.addListener(({ value: nextValue }) => {
      setDisplayValue(nextValue);
    });

    const animation = Animated.timing(animatedValue, {
      toValue: value,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      animatedValue.removeListener(listenerId);
      if (finished) setDisplayValue(value);
    });

    return () => {
      animation.stop();
      animatedValue.removeListener(listenerId);
    };
  }, [animatedValue, delay, duration, isVisible, reduceMotion, shouldAnimate, value]);

  return (
    <Text
      style={style}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
    >
      {isVisible ? `${prefix}${formatMoney(displayValue)}` : hiddenValue}
    </Text>
  );
};

