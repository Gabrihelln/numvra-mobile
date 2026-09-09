import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import {
  Bell,
  Globe,
  Info,
  Moon,
  Shield,
  Sun,
} from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { BackButton } from '../components/common/BackButton';
import { useAuth } from '../contexts/AuthContext';
import { pushNotificationService, PushPermissionStatus } from '../services/pushNotificationService';

const SECTION_TITLE: Record<string, string> = {
  appearance: 'Aparência',
  notifications: 'Notificações',
  language: 'Idioma',
  security: 'Segurança',
  general: 'Ajustes',
};

const SECTION_SUBTITLE: Record<string, string> = {
  appearance: 'Tema e conforto visual.',
  notifications: 'Preferências de alertas e lembretes.',
  language: 'Português (Brasil) é o idioma disponível nesta versão.',
  security: 'Privacidade e controles de conta disponíveis.',
  general: 'Preferências do aplicativo.',
};

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme } = useTheme();
  const route = useRoute<any>();
  const section = route.params?.section || 'general';
  const { user, checkLimit } = useAuth();
  const notificationAccess = checkLimit('notification');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus>('notDetermined');
  const [notificationsSaving, setNotificationsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotificationsEnabled(false);
      setPermissionStatus('unavailable');
      return;
    }

    return pushNotificationService.listenToPreference(
      user.uid,
      (preference) => {
        setNotificationsEnabled(preference.enabled);
        setPermissionStatus(preference.permissionStatus);
      },
      () => {
        setNotificationsEnabled(false);
        setPermissionStatus('unavailable');
      }
    );
  }, [user]);

  const getNotificationSubtitle = () => {
    if (!user) return 'Entre na sua conta para ativar notificações';
    if (notificationsSaving) return 'Salvando preferências';
    if (notificationsEnabled) return 'Notificações e alertas ativos';
    if (permissionStatus === 'denied') return 'Permissão negada nas configurações do sistema';
    return 'Receba avisos importantes no dispositivo';
  };

  const handleNotificationsChange = async (value: boolean) => {
    if (!notificationAccess.allowed) {
      Alert.alert('Recurso indisponível', notificationAccess.reason);
      return;
    }

    if (!user) {
      Alert.alert('Login necessário', 'Entre na sua conta para ativar notificações.');
      return;
    }

    try {
      setNotificationsSaving(true);
      const preference = value
        ? await pushNotificationService.enable(user.uid)
        : await pushNotificationService.disable(user.uid);

      setNotificationsEnabled(preference.enabled);
      setPermissionStatus(preference.permissionStatus);

      if (value && preference.permissionStatus !== 'authorized') {
        Alert.alert(
          'Permissão negada',
          'Não foi possivel ativar notificações. Libere as notificações nas configurações do sistema.'
        );
      }
    } catch (err) {
      console.error('Failed to update push notifications:', err);
      Alert.alert('Erro', 'Não foi possível atualizar as notificações agora.');
    } finally {
      setNotificationsSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#121214' : '#FAF9FF' },
      ]}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
        <BackButton />

        <Text
          style={[
            styles.headerTitle,
            { color: isDarkMode ? '#F8FAFC' : '#111827' },
          ]}
        >
          {SECTION_TITLE[section]}
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#94A3B8' : '#6B7280' }]}>{SECTION_SUBTITLE[section]}</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
            APARÊNCIA
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
                borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
              },
            ]}
          >
            <View style={styles.cardRow}>
              <View style={styles.iconAndText}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(108, 92, 231, 0.2)'
                        : '#EEF2FF',
                    },
                  ]}
                >
                  {isDarkMode ? (
                    <Moon size={22} color="#6C5CE7" />
                  ) : (
                    <Sun size={22} color="#6C5CE7" />
                  )}
                </View>
                <View>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: isDarkMode ? '#F8FAFC' : '#111827' },
                    ]}
                  >
                    Modo Noturno
                  </Text>
                  <Text
                    style={[
                      styles.rowSubtitle,
                      { color: isDarkMode ? '#94A3B8' : '#6B7280' },
                    ]}
                  >
                    Melhora o conforto visual
                  </Text>
                </View>
              </View>

              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: '#E2E8F0', true: '#6C5CE7' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
            GERAL
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
                borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
              },
            ]}
          >
            <View style={[styles.cardRow, styles.divider]}>
              <View style={styles.iconAndText}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(245, 158, 11, 0.15)'
                        : '#FEF3C7',
                    },
                  ]}
                >
                  <Globe size={22} color="#F59E0B" />
                </View>
                <View>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: isDarkMode ? '#F8FAFC' : '#111827' },
                    ]}
                  >
                    Idioma
                  </Text>
                  <Text
                    style={[
                      styles.rowSubtitle,
                      { color: isDarkMode ? '#94A3B8' : '#6B7280' },
                    ]}
                  >
                    Português (Brasil)
                  </Text>
                </View>
              </View>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>PT-BR</Text>
              </View>
            </View>

            <View style={[styles.cardRow, styles.divider]}>
              <View style={styles.iconAndText}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(20, 184, 166, 0.15)'
                        : '#CCFBF1',
                    },
                  ]}
                >
                  <Bell size={22} color="#14B8A6" />
                </View>
                <View style={styles.rowTextBlock}>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: isDarkMode ? '#F8FAFC' : '#111827' },
                    ]}
                  >
                    Notificações
                  </Text>
                  <Text
                    style={[
                      styles.rowSubtitle,
                      { color: isDarkMode ? '#94A3B8' : '#6B7280' },
                    ]}
                  >
                    {getNotificationSubtitle()}
                  </Text>
                </View>
              </View>

              <Switch
                value={notificationsEnabled}
                disabled={notificationsSaving || !user}
                onValueChange={handleNotificationsChange}
                trackColor={{ false: '#E2E8F0', true: '#6C5CE7' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.cardRow}>
              <View style={styles.iconAndText}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(59, 130, 246, 0.15)'
                        : '#DBEAFE',
                    },
                  ]}
                >
                  <Shield size={22} color="#3B82F6" />
                </View>
                <View>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: isDarkMode ? '#F8FAFC' : '#111827' },
                    ]}
                  >
                    Privacidade
                  </Text>
                  <Text
                    style={[
                      styles.rowSubtitle,
                      { color: isDarkMode ? '#94A3B8' : '#6B7280' },
                    ]}
                  >
                    Controles de segurança
                  </Text>
                </View>
              </View>

              <Text style={styles.activeLabel}>Ativo</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
            INFORMAÇÕES
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
                borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
              },
            ]}
          >
            <View style={styles.cardRow}>
              <View style={styles.iconAndText}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(244, 63, 94, 0.15)'
                        : '#FFE4E6',
                    },
                  ]}
                >
                  <Info size={22} color="#F43F5E" />
                </View>
                <View>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: isDarkMode ? '#F8FAFC' : '#111827' },
                    ]}
                  >
                    Versão v1.4.2
                  </Text>
                  <Text
                    style={[
                      styles.rowSubtitle,
                      { color: isDarkMode ? '#94A3B8' : '#6B7280' },
                    ]}
                  >
                    Todos os direitos reservados - 2026
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    marginTop: -8,
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 8,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
    paddingBottom: 14,
    marginBottom: 14,
  },
  iconAndText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextBlock: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: 'rgba(108, 92, 231, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6C5CE7',
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    marginRight: 4,
  },
});
