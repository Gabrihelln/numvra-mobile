import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Logo } from '../components/common/Logo';
import { PeripheralGlowBackground } from '../components/common/PeripheralGlowBackground';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { lightColors } from '../theme/colors';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const LandingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, loading } = useAuth();
  const colors = lightColors;
  const isDarkMode = false;
  const [isSplashing, setIsSplashing] = useState(true);

  const logoYAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(1.15)).current;
  const buttonYAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (!loading && user) {
      // User is already logged in, handled by RootNavigator
      return;
    }

    const timer = setTimeout(() => {
      setIsSplashing(false);
      Animated.parallel([
        Animated.spring(logoYAnim, {
          toValue: -20,
          friction: 7,
          tension: 30,
          useNativeDriver: true,
        }),
        Animated.spring(logoScaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 30,
          useNativeDriver: true,
        }),
        Animated.spring(buttonYAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, loading, logoYAnim, logoScaleAnim, buttonYAnim]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PeripheralGlowBackground />
      {/* Center of the screen - Logo container */}
      <View style={styles.logoSection}>
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              transform: [{ translateY: logoYAnim }, { scale: logoScaleAnim }],
            },
          ]}
        >
          <Logo width={200} height={200} />
        </Animated.View>
      </View>

      {/* Bottom buttons */}
      {!isSplashing && (
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              transform: [{ translateY: buttonYAnim }],
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.loginButton, { backgroundColor: isDarkMode ? colors.primary : '#111827' },
              pressed && styles.loginButtonPressed,
            ]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Entrar</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.registerButton, { backgroundColor: colors.card, borderColor: isDarkMode ? colors.primary : '#111827' },
              pressed && styles.registerButtonPressed,
            ]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={[styles.registerButtonText, { color: colors.text }]}>Cadastrar</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 8,
  },
  loginButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#111827',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  loginButtonPressed: {
    backgroundColor: '#0F172A',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  registerButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#111827',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonPressed: {
    backgroundColor: '#F8FAFC',
  },
  registerButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
});
