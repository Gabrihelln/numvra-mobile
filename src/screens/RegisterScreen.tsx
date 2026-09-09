import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
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

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { signUp, signInWithGoogle, signInWithApple } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingType, setLoadingType] = useState<AuthLoadingType>(null);
  const [error, setError] = useState('');
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    setIsAppleAvailable(appleAuth.isSupported);
  }, []);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoadingType('email');
    setError('');

    try {
      await signUp(name.trim(), email.trim(), password);
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Falha ao criar conta. Tente novamente.');
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
      console.error('Google register error:', err);
      setError(err?.message || 'Falha ao cadastrar com Google. Tente novamente.');
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
        console.error('Apple register error:', err);
        setError(err?.message || 'Falha ao cadastrar com Apple. Tente novamente.');
      }
    } finally {
      setLoadingType(null);
    }
  };

  const isLoading = loadingType !== null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBlob>
        <BlobCopy light={'Pequenos\npassos,'} strong={'grandes\nconquistas.'} />
      </TopBlob>
      <BottomWaves />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 22) + 4,
            paddingBottom: Math.max(insets.bottom, 18) + 56,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
          <ChevronLeft size={20} color="#090F2D" strokeWidth={2.4} />
        </TouchableOpacity>

        <BrandLockup />

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>CRIE SUA CONTA</Text>
          <Text style={styles.title}>É rápido e gratuito.</Text>
          <Text style={styles.subtitle}>Vamos começar? Preencha os dados abaixo para criar sua conta.</Text>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.registerFormGroup}>
          <AuthInput
            icon={<Lock size={21} color="#111936" strokeWidth={2.1} />}
            placeholder="Seu nome completo"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
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
          <AuthInput
            icon={<Lock size={21} color="#111936" strokeWidth={2.1} />}
            placeholder="Confirme sua senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            right={
              <Pressable onPress={() => setShowConfirmPassword((current) => !current)} style={styles.eyeButton} hitSlop={8}>
                {showConfirmPassword ? <EyeOff size={22} color="#111936" /> : <Eye size={22} color="#111936" />}
              </Pressable>
            }
          />
        </View>

        <PrimaryAuthButton label="Cadastrar" loading={loadingType === 'email'} disabled={isLoading} onPress={handleRegister} />

        <View style={styles.socialSection}>
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Ou cadastre com</Text>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
