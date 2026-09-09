import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AuthInput,
  BlobCopy,
  BottomWaves,
  BrandLockup,
  PrimaryAuthButton,
  SocialButton,
  TopBlob,
  authStyles as styles,
} from '../components/auth/AuthScaffold';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;
type AuthLoadingType = 'email' | 'google' | 'apple' | null;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepConnected, setKeepConnected] = useState(true);
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBlob>
        <BlobCopy light={'Organize\nConquiste'} strong="Viva melhor" />
      </TopBlob>
      <BottomWaves />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 22) + 42,
            paddingBottom: Math.max(insets.bottom, 18) + 56,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BrandLockup />

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>BEM-VINDO DE VOLTA!</Text>
          <Text style={styles.title}>Que bom te ver{`\n`}novamente!</Text>
          <Text style={styles.subtitle}>Acesse sua conta e continue cuidando da sua vida financeira.</Text>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.formGroup}>
          <AuthInput
            icon={<Mail size={20} color="#111936" strokeWidth={2.1} />}
            placeholder="Seu email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <AuthInput
            icon={<Lock size={21} color="#111936" strokeWidth={2.1} />}
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            right={
              <Pressable onPress={() => setShowPassword((current) => !current)} style={styles.eyeButton} hitSlop={8}>
                {showPassword ? <EyeOff size={22} color="#111936" /> : <Eye size={22} color="#111936" />}
              </Pressable>
            }
          />
        </View>

        <View style={styles.loginOptions}>
          <Pressable style={styles.keepRow} onPress={() => setKeepConnected((current) => !current)}>
            <View style={styles.checkbox}>{keepConnected && <Check size={19} color="#5748FF" strokeWidth={3} />}</View>
            <Text style={styles.keepText}>Manter-me conectado</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Esqueceu sua senha?</Text>
          </Pressable>
        </View>

        <PrimaryAuthButton label="Entrar" loading={loadingType === 'email'} disabled={isLoading} onPress={handleLogin} />

        <View style={styles.socialSection}>
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Ou entre com</Text>
            <View style={styles.divider} />
          </View>
          <View style={styles.socialRow}>
            <SocialButton provider="google" loading={loadingType === 'google'} disabled={isLoading} onPress={handleGoogleLogin} />
            <SocialButton
              provider="apple"
              loading={loadingType === 'apple'}
              disabled={isLoading || (Platform.OS === 'ios' && !isAppleAvailable)}
              onPress={handleAppleLogin}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem uma conta? </Text>
          <Text style={styles.footerLink} onPress={() => navigation.navigate('Register')}>
            Cadastre-se agora.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
