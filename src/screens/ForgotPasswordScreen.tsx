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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Mail, CheckCircle } from 'lucide-react-native';
import { Logo } from '../components/common/Logo';
import { useAuth } from '../contexts/AuthContext';
import { lightColors } from '../theme/colors';
import { AuthStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { sendPasswordReset } = useAuth();
  const colors = lightColors;
  const isDarkMode = false;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Por favor, informe seu e-mail.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await sendPasswordReset(email.trim());
      setSentSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('Não encontramos uma conta associada a este e-mail.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail em formato inválido.');
      } else {
        setError('Falha ao enviar e-mail de recuperação. Tente novamente.');
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
          Recuperar Senha
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: isDarkMode ? '#94A3B8' : '#64748B' },
          ]}
        >
          Informe seu e-mail de cadastro e enviaremos um link seguro para redefinição de senha.
        </Text>

        {/* Success State */}
        {sentSuccess ? (
          <View
            style={[
              styles.successBox,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(16, 185, 129, 0.12)'
                  : '#ECFDF5',
                borderColor: isDarkMode ? '#065F46' : '#A7F3D0',
              },
            ]}
          >
            <CheckCircle size={36} color="#10B981" />
            <Text
              style={[
                styles.successTitle,
                { color: isDarkMode ? '#34D399' : '#065F46' },
              ]}
            >
              E-mail enviado com sucesso!
            </Text>
            <Text
              style={[
                styles.successMessage,
                { color: isDarkMode ? '#A7F3D0' : '#047857' },
              ]}
            >
              Verifique sua caixa de entrada (e pasta de spam) em{' '}
              <Text style={{ fontWeight: '700' }}>{email}</Text> e siga as instruções para redefinir sua senha.
            </Text>

            <TouchableOpacity
              style={styles.backToLoginBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={styles.backToLoginBtnText}>Voltar para o Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
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

            {/* Input field */}
            <View style={styles.formGroup}>
              <View style={styles.inputWrapper}>
                <Mail
                  size={20}
                  color={isDarkMode ? '#64748B' : '#9CA3AF'}
                  style={styles.inputIcon}
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
                  placeholder="Seu e-mail cadastrado"
                  placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoFocus
                />
              </View>
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
              onPress={handleResetPassword}
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
                  Enviar Link de Recuperação
                </Text>
              )}
            </TouchableOpacity>

            {/* Back to Login link */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={styles.cancelLinkContainer}
            >
              <Text
                style={[
                  styles.cancelLinkText,
                  { color: isDarkMode ? '#94A3B8' : '#6B7280' },
                ]}
              >
                Lembrou sua senha?{' '}
                <Text style={styles.loginHighlight}>Fazer Login</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
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
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
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
    marginBottom: 24,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingLeft: 48,
    paddingRight: 16,
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
    marginBottom: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cancelLinkContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginHighlight: {
    color: '#6C5CE7',
    fontWeight: '700',
  },
  successBox: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  backToLoginBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backToLoginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
