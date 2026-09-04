import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Award,
  Bell,
  Calendar,
  ChevronRight,
  Shield,
  VolumeX,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { pushNotificationService, SystemNotification } from '../../services/pushNotificationService';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getCreatedAtMs = (notification: SystemNotification) => {
  const value = notification.createdAt;
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'string') return new Date(value).getTime();
  return 0;
};

const getTimeLabel = (notification: SystemNotification) => {
  if (notification.time) return notification.time;

  const createdAtMs = getCreatedAtMs(notification);
  if (!createdAtMs) return 'Agora';

  return formatDistanceToNow(new Date(createdAtMs), {
    addSuffix: true,
    locale: ptBR,
  });
};

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [silentMode, setSilentMode] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    const unsubscribe = pushNotificationService.listenToSystemNotifications(user.uid, (items) => {
      setNotifications(items);
      setLoading(false);
    });

    return unsubscribe;
  }, [isOpen, user]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDarkMode ? '#121214' : '#faf9ff',
            },
          ]}
        >
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0' },
            ]}
          />

          <View
            style={[
              styles.header,
              {
                borderBottomColor: isDarkMode ? '#27272a' : '#f1f5f9',
              },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.headerIconButton,
                {
                  backgroundColor: isDarkMode ? '#1e1e26' : '#ffffff',
                  borderColor: isDarkMode ? '#27272a' : '#f1f5f9',
                },
              ]}
              activeOpacity={0.7}
            >
              <X size={18} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: isDarkMode ? '#f4f4f5' : '#1c1c28' }]}>
              Notificacoes
            </Text>

            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.recentHeaderRow}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? '#71717a' : '#94a3b8' }]}>
                RECENTES
              </Text>
              {notifications.length > 0 && (
                <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
                  <Text style={styles.markReadText}>Marcar todas como lidas</Text>
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color="#6c5ce7" />
                <Text style={[styles.emptyText, { color: isDarkMode ? '#a1a1aa' : '#64748b' }]}>
                  Carregando notificacoes
                </Text>
              </View>
            ) : notifications.length === 0 ? (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: isDarkMode ? '#1e1e26' : '#ffffff',
                    borderColor: isDarkMode ? '#27272a' : '#f1f5f9',
                  },
                ]}
              >
                <Bell size={26} color="#6c5ce7" />
                <Text style={[styles.emptyTitle, { color: isDarkMode ? '#f4f4f5' : '#1c1c28' }]}>
                  Nenhuma notificacao
                </Text>
                <Text style={[styles.emptyText, { color: isDarkMode ? '#a1a1aa' : '#64748b' }]}>
                  Os avisos do Numvra aparecerao aqui quando estiverem disponiveis.
                </Text>
              </View>
            ) : (
              <View style={styles.notificationsList}>
                {notifications.map((notif) => {
                  let borderLeftColor = '#5856D6';
                  let iconBg = isDarkMode ? 'rgba(91, 76, 216, 0.2)' : '#eef2ff';
                  let iconColor = '#5856D6';
                  let IconComponent = Shield;

                  if (notif.type === 'bill') {
                    borderLeftColor = '#FF3B30';
                    iconBg = isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2';
                    iconColor = '#FF3B30';
                    IconComponent = Calendar;
                  } else if (notif.type === 'goal') {
                    borderLeftColor = '#E28743';
                    iconBg = isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7';
                    iconColor = '#E28743';
                    IconComponent = Award;
                  }

                  return (
                    <View
                      key={notif.id}
                      style={[
                        styles.notificationCard,
                        {
                          backgroundColor: isDarkMode ? '#1e1e26' : '#ffffff',
                          borderColor: isDarkMode ? '#27272a' : '#f1f5f9',
                          borderLeftColor,
                          borderLeftWidth: 4,
                          opacity: notif.read ? 0.75 : 1,
                        },
                      ]}
                    >
                      {!notif.read && <View style={styles.unreadDot} />}

                      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                        <IconComponent size={20} color={iconColor} strokeWidth={2} />
                      </View>

                      <View style={styles.notificationTextContainer}>
                        <View style={styles.notificationTitleRow}>
                          <Text
                            style={[
                              styles.notificationTitle,
                              { color: isDarkMode ? '#f4f4f5' : '#1c1c28' },
                            ]}
                            numberOfLines={1}
                          >
                            {notif.title}
                          </Text>
                          <Text
                            style={[
                              styles.notificationTime,
                              { color: isDarkMode ? '#71717a' : '#94a3b8' },
                            ]}
                          >
                            {getTimeLabel(notif)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.notificationBody,
                            { color: isDarkMode ? '#a1a1aa' : '#64748b' },
                          ]}
                        >
                          {notif.text}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.settingsSection}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? '#71717a' : '#94a3b8' }]}>
                CONFIGURACOES
              </Text>

              <View
                style={[
                  styles.settingsGroup,
                  {
                    backgroundColor: isDarkMode ? '#1e1e26' : '#ffffff',
                    borderColor: isDarkMode ? '#27272a' : '#f1f5f9',
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.settingsRow,
                    { borderBottomColor: isDarkMode ? '#27272a' : '#f8fafc' },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIconBox, { backgroundColor: '#f3e8ff' }]}>
                      <Bell size={18} color="#6c5ce7" />
                    </View>
                    <Text
                      style={[
                        styles.settingsRowText,
                        { color: isDarkMode ? '#f4f4f5' : '#1c1c28' },
                      ]}
                    >
                      Gerenciar Notificacoes
                    </Text>
                  </View>
                  <ChevronRight size={18} color={isDarkMode ? '#71717a' : '#cbd5e1'} />
                </TouchableOpacity>

                <View style={styles.settingsRow}>
                  <View style={styles.settingsRowLeft}>
                    <View
                      style={[
                        styles.settingsIconBox,
                        { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' },
                      ]}
                    >
                      <VolumeX
                        size={18}
                        color={isDarkMode ? '#a1a1aa' : '#64748b'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.settingsRowText,
                        { color: isDarkMode ? '#f4f4f5' : '#1c1c28' },
                      ]}
                    >
                      Modo Silencioso
                    </Text>
                  </View>
                  <Switch
                    value={silentMode}
                    onValueChange={setSilentMode}
                    trackColor={{ false: isDarkMode ? '#27272a' : '#e2e8f0', true: '#6c5ce7' }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    height: '90%',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  dragHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6c5ce7',
  },
  notificationsList: {
    gap: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    alignItems: 'flex-start',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6c5ce7',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingRight: 10,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  notificationTime: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 8,
  },
  notificationBody: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  emptyState: {
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  settingsSection: {
    marginTop: 24,
  },
  settingsGroup: {
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
