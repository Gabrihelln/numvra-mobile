import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import { Logo } from '../components/common/Logo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AuthStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;
const GoogleSigninButton = Platform.OS === 'android'
  ? require('@react-native-google-signin/google-signin').GoogleSigninButton
  : null;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const { colors, isDarkMode } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err?.message || 'Falha ao entrar com Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithApple();
    } catch (err: any) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple login error:', err);
        setError(err?.message || 'Falha ao entrar com Apple. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#121214' : '#FFFFFF' },
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
                borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
                backgroundColor: isDarkMode ? '#1E1E26' : '#FAFAFC',
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft
              size={20}
              color={isDarkMode ? '#E2E8F0' : '#374151'}
            />
          </TouchableOpacity>

          <Logo width={36} height={36} />
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            { color: isDarkMode ? '#F8FAFC' : '#111827' },
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
                backgroundColor: isDarkMode
                  ? 'rgba(239, 68, 68, 0.15)'
                  : '#FEF2F2',
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
                backgroundColor: isDarkMode ? '#1E1E26' : '#F8FAFC',
                color: colors.text,
                borderColor: isDarkMode ? '#2D2D3A' : '#E2E8F0',
              },
            ]}
            placeholder="Seu email"
            placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
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
                  backgroundColor: isDarkMode ? '#1E1E26' : '#F8FAFC',
                  color: colors.text,
                  borderColor: isDarkMode ? '#2D2D3A' : '#E2E8F0',
                },
              ]}
              placeholder="Sua senha"
              placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
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
                  color={isDarkMode ? '#94A3B8' : '#9CA3AF'}
                />
              ) : (
                <Eye size={20} color={isDarkMode ? '#94A3B8' : '#9CA3AF'} />
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
              { color: isDarkMode ? '#94A3B8' : '#6B7280' },
            ]}
          >
            Esqueceu sua senha?
          </Text>
        </TouchableOpacity>

        {/* Submit button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: isDarkMode ? '#FFFFFF' : '#111827',
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={isDarkMode ? '#111827' : '#FFFFFF'}
            />
          ) : (
            <Text
              style={[
                styles.submitButtonText,
                { color: isDarkMode ? '#111827' : '#FFFFFF' },
              ]}
            >
              Entrar
            </Text>
          )}
        </TouchableOpacity>

        {(Platform.OS === 'android' || isAppleAvailable) && (
          <View style={styles.socialSection}>
            <View style={styles.divider} />
            <Text style={[styles.dividerText, { backgroundColor: isDarkMode ? '#121214' : '#FFFFFF', color: isDarkMode ? '#64748B' : '#9CA3AF' }]}>
              Ou entre com
            </Text>

            {GoogleSigninButton && (
              <GoogleSigninButton
                style={styles.googleButton}
                size={GoogleSigninButton.Size.Wide}
                color={GoogleSigninButton.Color.Light}
                onPress={handleGoogleLogin}
                disabled={loading}
              />
            )}

            {isAppleAvailable && (
              <AppleButton
                buttonType={AppleButton.Type.SIGN_IN}
                buttonStyle={AppleButton.Style.BLACK}
                cornerRadius={14}
                style={styles.appleButton}
                onPress={handleAppleLogin}
              />
            )}
          </View>
        )}

        {/* Register footer link */}
        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              { color: isDarkMode ? '#CBD5E1' : '#4B5563' },
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
