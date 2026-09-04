import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Logo } from '../components/common/Logo';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PROGRESS_BAR_WIDTH = 144;

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, loading } = useAuth();
  const logoScale = useRef(new Animated.Value(2.2)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const barOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 1300,
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
        Animated.delay(1300),
        Animated.timing(barOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(progress, {
          toValue: 1,
          duration: 2400,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.05,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, [barOpacity, logoOpacity, logoScale, progress, pulseScale]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (user) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Auth', params: { screen: 'Landing' } as any }],
          });
        }
      }, 3200);

      return () => clearTimeout(timer);
    }
  }, [user, loading, navigation]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PROGRESS_BAR_WIDTH],
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <GradientBackground />

      <View style={styles.brandArea}>
        <View style={styles.ambientGlow} />
        <Animated.View
          style={[
            styles.logoIntro,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoPulse,
              {
                transform: [{ scale: pulseScale }],
              },
            ]}
          >
            <Logo width={196} height={196} />
          </Animated.View>
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

const GradientBackground = () => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View style={[styles.gradientStop, styles.gradientTop]} />
    <View style={[styles.gradientStop, styles.gradientLavender]} />
    <View style={[styles.gradientStop, styles.gradientSoft]} />
    <View style={[styles.gradientStop, styles.gradientWhite]} />
    <View style={[styles.gradientStop, styles.gradientMintSoft]} />
    <View style={[styles.gradientStop, styles.gradientMint]} />
    <View style={[styles.gradientStop, styles.gradientTeal]} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  gradientStop: {
    flex: 1,
  },
  gradientTop: {
    flex: 14,
    backgroundColor: '#B7A1FB',
  },
  gradientLavender: {
    flex: 14,
    backgroundColor: '#D1C3FC',
  },
  gradientSoft: {
    flex: 20,
    backgroundColor: '#EDE8FD',
  },
  gradientWhite: {
    flex: 24,
    backgroundColor: '#FFFFFF',
  },
  gradientMintSoft: {
    flex: 14,
    backgroundColor: '#E3FBF5',
  },
  gradientMint: {
    flex: 16,
    backgroundColor: '#A6FAE3',
  },
  gradientTeal: {
    flex: 12,
    backgroundColor: '#65F1CF',
  },
  brandArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ambientGlow: {
    position: 'absolute',
    width: 288,
    height: 288,
    borderRadius: 144,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    transform: [{ scale: 1.08 }],
  },
  logoIntro: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPulse: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B8DEF',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 25,
    elevation: 6,
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