import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Logo } from '../common/Logo';

export const GoogleLogo = ({ size = 28 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Google">
    <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <Path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </Svg>
);

export const AppleLogo = ({ size = 28 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 384 512" accessibilityLabel="Apple">
    <Path fill="#000000" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.2-39.4.6-72.2 23-92.4 57.8-39.9 69.1-10.2 171.4 28.1 227.6 18.9 27.1 41 57.4 70.3 56.3 28.1-1.1 38.6-18.1 72.5-18.1 33.6 0 42.8 18.1 72.4 17.5 30.6-.5 49.9-27.2 68.1-54.6 21.8-31.5 30.7-62.4 31.1-64-.7-.3-50.1-19.2-50.5-75.6zM260.8 101.2c15.2-18.4 25.5-44 22.7-69.2-22 .9-48.6 14.7-64.4 33.1-14.3 16.4-26.7 42.5-23.3 67.5 24.6 1.9 49.7-12.5 65-31.4z" />
  </Svg>
);

export const TopBlob = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.topBlob} pointerEvents="none">
    <Svg width="100%" height="70%" viewBox="0 0 190 265" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="blobGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#EEF0FF" />
          <Stop offset="1" stopColor="#DADBFF" />
        </LinearGradient>
      </Defs>
      <Path d="M66.4 0H190v265c-62 3.7-92.8-25.2-112.1-78.6-17.6-48.9-46.7-63.6-67.6-87.2C-22.6 62 9.4 13.4 66.4 0z" fill="url(#blobGradient)" />
    </Svg>
    <View style={styles.blobCopy}>{children}</View>
  </View>
);

export const BottomWaves = () => (
  <View style={styles.bottomWaves} pointerEvents="none">
    <Svg width="100%" height="100%" viewBox="0 0 430 145" preserveAspectRatio="none">
      <Path d="M0 62c54-41 105-36 160-12 38 17 70 36 115 31 58-6 103-24 155-56v120H0V62z" fill="#EAECFF" />
      <Path d="M0 92c52-48 109-55 174-20 69 37 99 45 157 13 42-24 70-34 99-15v75H0V92z" fill="#D9DCFF" />
    </Svg>
  </View>
);

export const BrandLockup = () => (
  <View style={styles.brand}>
    <Logo width={44} height={44} />
    <View>
      <Text style={styles.brandName}>Numvra</Text>
      <Text style={styles.brandTagline}>Mais controle para o seu amanhã.</Text>
    </View>
  </View>
);

export const BlobCopy = ({ light, strong }: { light: string; strong: string }) => (
  <>
    <Text style={styles.blobLight}>{light}</Text>
    <Text style={styles.blobStrong}>{strong}</Text>
    <View style={styles.blobDash} />
  </>
);

interface AuthInputProps {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  right?: React.ReactNode;
}

export const AuthInput = ({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  right,
}: AuthInputProps) => (
  <View style={styles.inputShell}>
    <View style={styles.inputIcon}>{icon}</View>
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#707A9B"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
    {right}
  </View>
);

export const PrimaryAuthButton = ({
  label,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [styles.submitButton, { opacity: disabled && !loading ? 0.72 : pressed ? 0.9 : 1 }]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
  >
    {loading ? (
      <ActivityIndicator size="small" color="#FFFFFF" />
    ) : (
      <View style={styles.submitContent}>
        <Text style={styles.submitButtonText}>{label}</Text>
        <ArrowRight size={24} color="#FFFFFF" strokeWidth={1.8} />
      </View>
    )}
  </Pressable>
);

export const SocialButton = ({
  provider,
  loading,
  disabled,
  onPress,
}: {
  provider: 'google' | 'apple';
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [styles.socialButton, { opacity: disabled && !loading ? 0.7 : pressed ? 0.86 : 1 }]}
    onPress={onPress}
    disabled={disabled}
  >
    {loading ? <ActivityIndicator size="small" color="#5748FF" /> : provider === 'google' ? <GoogleLogo /> : <AppleLogo />}
    <Text style={styles.socialText}>{provider === 'google' ? 'Google' : 'Apple'}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topBlob: { position: 'absolute', top: 0, right: 0, width: '42%', height: 248 },
  blobCopy: { position: 'absolute', top: 35, right: 10, alignItems: 'flex-start' },
  blobLight: { color: '#7B74D9', fontSize: 17, lineHeight: 20, fontFamily: 'Inter-Regular', textAlign: 'left' },
  blobStrong: { color: '#5748FF', fontSize: 17, lineHeight: 20, fontFamily: 'Inter-Bold', textAlign: 'left' },
  blobDash: { width: 38, height: 3, borderRadius: 999, backgroundColor: '#5748FF', marginTop: 8 },
  bottomWaves: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 112 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 34 },
  brandName: { color: '#090F2D', fontSize: 31, lineHeight: 36, fontFamily: 'Inter-Bold' },
  brandTagline: { color: '#6F789B', fontSize: 13, lineHeight: 17, fontFamily: 'Inter-Regular' },
  hero: { marginBottom: 24 },
  eyebrow: { color: '#5748FF', fontSize: 12, lineHeight: 16, fontFamily: 'Inter-Bold', marginBottom: 10 },
  title: { color: '#080E2D', fontSize: 30, lineHeight: 36, fontFamily: 'Inter-Bold', marginBottom: 12 },
  subtitle: { color: '#697292', fontSize: 17, lineHeight: 23, fontFamily: 'Inter-Regular', maxWidth: 340 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 12, marginBottom: 12, padding: 10 },
  errorText: { color: '#EF4444', fontSize: 12, fontFamily: 'Inter-SemiBold' },
  formGroup: { gap: 12, marginBottom: 14 },
  registerFormGroup: { gap: 10, marginBottom: 20 },
  inputShell: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#DCE3F0', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  inputIcon: { width: 32, alignItems: 'flex-start' },
  input: { flex: 1, color: '#101832', fontSize: 15, lineHeight: 19, fontFamily: 'Inter-Regular', paddingVertical: 0 },
  eyeButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  loginOptions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 18 },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  checkbox: { width: 25, height: 25, borderRadius: 6, borderWidth: 2, borderColor: '#5748FF', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  keepText: { color: '#606B8C', fontSize: 12, lineHeight: 16, fontFamily: 'Inter-Regular' },
  forgotText: { color: '#5748FF', fontSize: 12, lineHeight: 16, fontFamily: 'Inter-Bold' },
  submitButton: { height: 50, borderRadius: 25, backgroundColor: '#5748FF', alignItems: 'center', justifyContent: 'center', shadowColor: '#5748FF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 7, marginBottom: 26 },
  submitContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, lineHeight: 23, fontFamily: 'Inter-SemiBold' },
  socialSection: { marginBottom: 26 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  divider: { flex: 1, height: 1, backgroundColor: '#DCE3F0' },
  dividerText: { color: '#687292', fontSize: 14, lineHeight: 18, fontFamily: 'Inter-Regular' },
  socialRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  socialButton: { flex: 1, minHeight: 60, borderRadius: 10, borderWidth: 1, borderColor: '#DCE3F0', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 2 },
  socialText: { color: '#596382', fontSize: 12, lineHeight: 16, fontFamily: 'Inter-Regular' },
  footer: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 54 },
  footerText: { color: '#0A102B', fontSize: 13, lineHeight: 18, fontFamily: 'Inter-Regular' },
  footerLink: { color: '#5748FF', fontSize: 13, lineHeight: 18, fontFamily: 'Inter-Regular' },
  backButton: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: '#DCE3F0', backgroundColor: '#FAFBFF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
});

export const authStyles = styles;
