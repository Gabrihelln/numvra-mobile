import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { appleAuth, AppleButton } from '@invertase/react-native-apple-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { Logo } from '../components/common/Logo';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;
type AuthLoadingType = 'email' | 'google' | 'apple' | null;

const GoogleLogo = () => (
  <Svg width={20} height={20} viewBox="0 0 48 48" accessibilityLabel="Google">
    <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <Path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </Svg>
);

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingType, setLoadingType] = useState<AuthLoadingType>(null);
  const [error, setError] = useState('');
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    setIsAppleAvailable(appleAuth.isSupported);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoadingType('email');
    setError('');

    try {
      await signIn(email.trim(), password);
      // Navigation is automatically updated by AuthContext state
    } catch (err: any) {
      console.error('Login error:', err);
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setError('Email ou senha incorretos.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else {
        setError('Falha ao entrar. Tente novamente.');
      }
    } finally {
      setLoadingType(null);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingType('google');
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err?.message || 'Falha ao entrar com Google. Tente novamente.');
    } finally {
      setLoadingType(null);
    }
  };

  const handleAppleLogin = async () => {
    setLoadingType('apple');
    setError('');
    try {
      await signInWithApple();
    } catch (err: any) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple login error:', err);
        setError(err?.message || 'Falha ao entrar com Apple. Tente novamente.');
      }
    } finally {
      setLoadingType(null);
    }
  };

  const isLoading = loadingType !== null;
  const isEmailLoading = loadingType === 'email';
  const isGoogleLoading = loadingType === 'google';

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: '#FFFFFF' },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16) + 8,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.backButton,
              {
                borderColor: '#F1F1F5',
                backgroundColor: '#FAFAFC',
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft
              size={20}
              color="#374151"
            />
          </TouchableOpacity>

          <Logo width={36} height={36} />
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            { color: '#111827' },
          ]}
        >
          Bem-vindo de volta!{'\n'}Que bom te ver novamente!
        </Text>

        {/* Error message */}
        {!!error && (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: '#FEF2F2',
              },
            ]}
          >
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.formGroup}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: '#F8FAFC',
                color: '#111827',
                borderColor: '#E2E8F0',
              },
            ]}
            placeholder="Seu email"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                {
                  backgroundColor: '#F8FAFC',
                  color: '#111827',
                  borderColor: '#E2E8F0',
                },
              ]}
              placeholder="Sua senha"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {showPassword ? (
                <EyeOff
                  size={20}
                  color="#9CA3AF"
                />
              ) : (
                <Eye size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot password */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotPasswordContainer}
        >
          <Text
            style={[
              styles.forgotPasswordText,
              { color: '#6B7280' },
            ]}
          >
            Esqueceu sua senha?
          </Text>
        </TouchableOpacity>

        {/* Submit button */}
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: '#6C5CE7',
              opacity: isLoading && !isEmailLoading ? 0.72 : pressed ? 0.9 : 1,
            },
          ]}
          onPress={handleLogin}
          disabled={isLoading}
          accessibilityRole="button"
        >
          {isEmailLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Entrar</Text>
          )}
        </Pressable>

        {(Platform.OS === 'android' || isAppleAvailable) && (
          <View style={styles.socialSection}>
            <View style={styles.divider} />
            <Text style={[styles.dividerText, { backgroundColor: '#FFFFFF', color: '#9CA3AF' }]}>
              Ou entre com
            </Text>

            {Platform.OS === 'android' && (
              <Pressable
                style={({ pressed }) => [
                  styles.googleButton,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    opacity: isLoading && !isGoogleLoading ? 0.72 : pressed ? 0.88 : 1,
                  },
                ]}
                onPress={handleGoogleLogin}
                disabled={isLoading}
                accessibilityRole="button"
              >
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color="#6C5CE7" />
                ) : (
                  <>
                    <GoogleLogo />
                    <Text style={[styles.googleButtonText, { color: '#111827' }]}>Entrar com Google</Text>
                  </>
                )}
              </Pressable>
            )}

            {isAppleAvailable && (
              <AppleButton
                buttonType={AppleButton.Type.SIGN_IN}
                buttonStyle={AppleButton.Style.BLACK}
                cornerRadius={14}
                style={styles.appleButton}
                onPress={() => { if (!isLoading) handleAppleLogin(); }}
              />
            )}
          </View>
        )}

        {/* Register footer link */}
        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              { color: '#4B5563' },
            ]}
          >
            Não tem uma conta?{' '}
            <Text
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
            >
              Cadastre-se agora.
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backButton: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 24,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  formGroup: {
    gap: 12,
    marginBottom: 12,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  socialSection: {
    marginBottom: 8,
    alignItems: 'center',
  },
  divider: {
    alignSelf: 'stretch',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: 20,
  },
  dividerText: {
    position: 'absolute',
    top: -5,
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '500',
  },
  googleButton: {
    width: '100%',
    height: 52,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  appleButton: {
    width: '100%',
    height: 52,
    marginBottom: 12,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  registerLink: {
    color: '#6C5CE7',
    fontWeight: '700',
  },
});
