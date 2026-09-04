import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Logo } from '../components/common/Logo';
import { PeripheralGlowBackground } from '../components/common/PeripheralGlowBackground';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PROGRESS_BAR_WIDTH = 144;

export const SplashVisual: React.FC = () => {
  const logoScale = useRef(new Animated.Value(1.15)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const barOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 900,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(logoOpacity, {
          toValue: 0.9,
          duration: 325,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 975,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(barOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(progress, {
          toValue: 1,
          duration: 1700,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, [barOpacity, logoOpacity, logoScale, progress]);


  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PROGRESS_BAR_WIDTH],
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <PeripheralGlowBackground />

      <View style={styles.brandArea}>
        <Animated.View
          style={[
            styles.logoIntro,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Logo width={144} height={144} />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Animated.View style={[styles.progressTrack, { opacity: barOpacity }]}>
          <Animated.View style={[styles.progressFillClip, { width: progressWidth }]}>
            <View style={styles.progressGradient}>
              <View style={[styles.progressSegment, styles.progressPurple]} />
              <View style={[styles.progressSegment, styles.progressBlue]} />
              <View style={[styles.progressSegment, styles.progressTeal]} />
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
};

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    navigation.reset({
      index: 0,
      routes: user
        ? [{ name: 'MainTabs' }]
        : [{ name: 'Auth', params: { screen: 'Landing' } as any }],
    });
  }, [user, loading, navigation]);

  return <SplashVisual />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  brandArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoIntro: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 48,
    paddingTop: 16,
    paddingHorizontal: 32,
  },
  progressTrack: {
    width: PROGRESS_BAR_WIDTH,
    height: 4,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  progressFillClip: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: 999,
  },
  progressGradient: {
    width: PROGRESS_BAR_WIDTH,
    height: '100%',
    flexDirection: 'row',
  },
  progressSegment: {
    flex: 1,
  },
  progressPurple: {
    backgroundColor: '#8B5CF6',
  },
  progressBlue: {
    backgroundColor: '#3B82F6',
  },
  progressTeal: {
    backgroundColor: '#2DD4BF',
  },
});
