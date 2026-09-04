import React, { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { Logo } from '../components/common/Logo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AuthStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const { colors, isDarkMode } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    setLoading(true);
    setError('');

    try {
      await signUp(name.trim(), email.trim(), password);
      // Auth state update handles the redirection automatically
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
          Olá! Cadastre-se para começar.
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

        {/* Form fields */}
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
            placeholder="Seu Nome"
            placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkMode ? '#1E1E26' : '#F8FAFC',
                color: colors.text,
                borderColor: isDarkMode ? '#2D2D3A' : '#E2E8F0',
              },
            ]}
            placeholder="Seu Email"
            placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkMode ? '#1E1E26' : '#F8FAFC',
                color: colors.text,
                borderColor: isDarkMode ? '#2D2D3A' : '#E2E8F0',
              },
            ]}
            placeholder="Sua senha (mínimo 6 caracteres)"
            placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkMode ? '#1E1E26' : '#F8FAFC',
                color: colors.text,
                borderColor: isDarkMode ? '#2D2D3A' : '#E2E8F0',
              },
            ]}
            placeholder="Confirme sua senha"
            placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: isDarkMode ? '#FFFFFF' : '#111827',
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={handleRegister}
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
              Cadastrar
            </Text>
          )}
        </TouchableOpacity>

        {/* Login footer link */}
        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              { color: isDarkMode ? '#CBD5E1' : '#4B5563' },
            ]}
          >
            Já tem uma conta?{' '}
            <Text
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              Faça login agora.
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
    marginBottom: 24,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
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
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loginLink: {
    color: '#6C5CE7',
    fontWeight: '700',
  },
});
