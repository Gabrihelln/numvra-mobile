import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const LandingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, loading } = useAuth();
  const [isSplashing, setIsSplashing] = useState(true);

  const logoYAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(1.15)).current;
  const buttonOpacityAnim = useRef(new Animated.Value(0)).current;
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
        Animated.timing(buttonOpacityAnim, {
          toValue: 1,
          duration: 400,
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
  }, [user, loading, logoYAnim, logoScaleAnim, buttonOpacityAnim, buttonYAnim]);

  return (
    <View style={styles.container}>
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
          <Logo width={144} height={144} />
        </Animated.View>
      </View>

      {/* Bottom buttons */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonOpacityAnim,
            transform: [{ translateY: buttonYAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.9}
        >
          <Text style={styles.loginButtonText}>Entrar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.9}
        >
          <Text style={styles.registerButtonText}>Cadastrar</Text>
        </TouchableOpacity>
      </Animated.View>
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
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  registerButton: {
    width: '100%',
    height: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#111827',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
});
