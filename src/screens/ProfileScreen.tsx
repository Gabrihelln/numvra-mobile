import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bell,
  Building2,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Crown,
  FileText,
  Globe2,
  Landmark,
  LogOut,
  Palette,
  Pencil,
  PieChart,
  Shield,
  Target,
  UserCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import { auth, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { ModalBottomSheet } from '../components/common';
import { NotificationsModal } from '../components/modals/NotificationsModal';
import { profileService } from '../services/profileService';
import { pushNotificationService, type SystemNotification } from '../services/pushNotificationService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PlanLabel = 'Gratuito' | 'Pro' | 'Premium';

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/adventurer/png?seed=Mika',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Sasha',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Bento',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Leo',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Clara',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Sofia',
];


const getNotificationCreatedAtMs = (notification: SystemNotification) => {
  const value = notification.createdAt;
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  return 0;
};

const getPlanLabel = (plan?: string | null): PlanLabel => {
  if (plan === 'premium') return 'Premium';
  if (plan === 'pro') return 'Pro';
  return 'Gratuito';
};

const getThemeLabel = (themeMode: 'light' | 'dark' | 'system') => {
  if (themeMode === 'light') return 'Claro';
  if (themeMode === 'dark') return 'Escuro';
  return 'Sistema';
};

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  currentName: string;
  currentPhoto: string;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  uid,
  currentName,
  currentPhoto,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [name, setName] = useState(currentName);
  const [photo, setPhoto] = useState(currentPhoto);
  const [selectedPhotoAsset, setSelectedPhotoAsset] = useState<Asset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setPhoto(currentPhoto);
      setSelectedPhotoAsset(null);
    }
  }, [isOpen, currentName, currentPhoto]);

  const handleChoosePhoto = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });

    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert('Erro', result.errorMessage || 'Não foi possível selecionar a foto.');
      return;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('Erro', 'Não foi possível selecionar a foto.');
      return;
    }

    setSelectedPhotoAsset(asset);
    setPhoto(asset.uri);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      let nextPhotoURL = photo.trim();

      if (selectedPhotoAsset?.uri) {
        nextPhotoURL = await profileService.uploadAvatar(selectedPhotoAsset);
      }

      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        displayName: name.trim(),
        photoURL: nextPhotoURL,
      });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: name.trim(),
          photoURL: nextPhotoURL || null,
        });
      }

      setSelectedPhotoAsset(null);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível atualizar o perfil.';
      const status = err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined;

      console.error('Failed to update profile:', {
        status,
        message,
        error: err,
      });

      Alert.alert('Erro', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewAvatarUrl =
    photo || `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(name || 'U')}`;

  return (
    <ModalBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Perfil"
      maxHeight="88%"
    >
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.previewContainer}>
          <View
            style={[
              styles.previewAvatarBox,
              {
                backgroundColor: isDarkMode ? '#121214' : '#F8FAFC',
                borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
              },
            ]}
          >
            <Image source={{ uri: previewAvatarUrl }} style={styles.previewAvatarImage} />
          </View>
          <TouchableOpacity
            style={styles.uploadPhotoButton}
            onPress={handleChoosePhoto}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Camera size={16} color="#FFFFFF" />
            <Text style={styles.uploadPhotoButtonText}>Escolher foto</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>SELECIONE UM AVATAR</Text>
          <View style={styles.presetsGrid}>
            {AVATAR_PRESETS.map((preset, index) => {
              const isSelected = photo === preset;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.presetCircle,
                    {
                      borderColor: isSelected ? '#5748FF' : 'transparent',
                      borderWidth: isSelected ? 2.5 : 1,
                    },
                  ]}
                  onPress={() => {
                    setSelectedPhotoAsset(null);
                    setPhoto(preset);
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: preset }} style={styles.presetImage} />
                  {isSelected && (
                    <View style={styles.presetSelectedOverlay}>
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>FOTO URL PERSONALIZADA</Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: isDarkMode ? '#121214' : '#F8FAFC',
                color: colors.text,
                borderColor: isDarkMode ? '#2D2D3A' : '#E2E8F0',
              },
            ]}
            placeholder="https://sua-foto-url..."
            placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
            value={photo}
            onChangeText={(value) => {
              setSelectedPhotoAsset(null);
              setPhoto(value);
            }}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>NOME DE EXIBIÇÃO</Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: isDarkMode ? '#121214' : '#F8FAFC',
                color: colors.text,
                borderColor: isDarkMode ? '#2D2D3A' : '#E2E8F0',
              },
            ]}
            placeholder="Seu nome"
            placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
            value={name}
            onChangeText={setName}
            maxLength={40}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { opacity: isSubmitting ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Check size={20} color="#FFFFFF" strokeWidth={3} />
              <Text style={styles.saveButtonText}>Salvar Alterações</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ModalBottomSheet>
  );
};

interface ProfileIconBoxProps {
  icon: LucideIcon;
  color?: string;
  backgroundColor: string;
}

const ProfileIconBox: React.FC<ProfileIconBoxProps> = ({ icon: Icon, color = '#5748FF', backgroundColor }) => (
  <View style={[styles.menuIconBox, { backgroundColor }]}>
    <Icon size={25} color={color} strokeWidth={2.35} />
  </View>
);

interface ProfileMenuItemProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onPress: () => void;
  rightText?: string;
  isLast?: boolean;
  isDarkMode: boolean;
}

const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightText,
  isLast = false,
  isDarkMode,
}) => (
  <TouchableOpacity
    style={[
      styles.menuItemRow,
      !isLast && {
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#2A2A32' : '#E9ECF6',
      },
    ]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <View style={styles.menuItemLeft}>
      <ProfileIconBox icon={icon} backgroundColor={isDarkMode ? 'rgba(87,72,255,0.16)' : '#F1EEFF'} />
      <View style={styles.menuCopy}>
        <Text style={[styles.menuTitle, { color: isDarkMode ? '#F8FAFC' : '#080D2D' }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.menuSubtitle, { color: isDarkMode ? '#A1A1AA' : '#687292' }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </View>

    <View style={styles.menuRight}>
      {rightText ? <Text style={[styles.menuRightText, { color: isDarkMode ? '#A1A1AA' : '#687292' }]}>{rightText}</Text> : null}
      <ChevronRight size={25} color={isDarkMode ? '#F4F4F5' : '#080D2D'} strokeWidth={2.7} />
    </View>
  </TouchableOpacity>
);

interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
  isDarkMode: boolean;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ title, children, isDarkMode }) => (
  <View style={styles.sectionBlock}>
    <Text style={[styles.sectionTitle, { color: isDarkMode ? '#F8FAFC' : '#080D2D' }]}>{title}</Text>
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
          borderColor: isDarkMode ? '#2A2A32' : '#E9ECF6',
        },
      ]}
    >
      {children}
    </View>
  </View>
);

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode, themeMode } = useTheme();
  const { user, profile, signOut, activePlan } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [notificationBadgeCount, setNotificationBadgeCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotificationBadgeCount(0);
      return;
    }

    let notifications: SystemNotification[] = [];
    let readIds = new Set<string>();

    const refreshBadge = () => {
      setNotificationBadgeCount(notifications.filter((item) => !item.read && !readIds.has(item.id)).length);
    };

    const unsubscribeNotifications = pushNotificationService.listenToSystemNotifications(
      user.uid,
      (items) => {
        notifications = items;
        refreshBadge();
      },
      () => setNotificationBadgeCount(0)
    );

    const unsubscribeReads = pushNotificationService.listenToNotificationReads(
      user.uid,
      (ids) => {
        readIds = ids;
        refreshBadge();
      },
      () => setNotificationBadgeCount(0)
    );

    return () => {
      unsubscribeNotifications();
      unsubscribeReads();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Erro', 'Não foi possível encerrar a sessão.');
    }
  };

  const handleOpenNotifications = () => setIsNotificationsOpen(true);

  const displayName = profile?.displayName || user?.displayName || 'Usuário';
  const email = user?.email || '';
  const photoURL =
    profile?.photoURL ||
    user?.photoURL ||
    `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(displayName || 'U')}`;
  const planLabel = getPlanLabel(activePlan || profile?.plan);
  const isPremium = planLabel === 'Premium';
  const planSubtitle = isPremium
    ? 'Aproveite todos os recursos do Numvra.'
    : planLabel === 'Pro'
      ? 'Veja os recursos disponíveis no seu plano.'
      : 'Conheça os benefícios dos planos do Numvra.';
  const iconBackground = isDarkMode ? 'rgba(87,72,255,0.16)' : '#F1EEFF';
  const pageBackground = isDarkMode ? '#121214' : '#FFFFFF';
  const cardBackground = isDarkMode ? '#1E1E26' : '#F7F5FF';
  const borderColor = isDarkMode ? '#2A2A32' : '#E9ECF6';

  return (
    <View style={[styles.mainContainer, { backgroundColor: pageBackground }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16) + 10,
            paddingBottom: Math.max(insets.bottom, 16) + 128,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.screenTitle, { color: isDarkMode ? '#F8FAFC' : '#080D2D' }]}>Meu Perfil</Text>
            <Text style={[styles.screenSubtitle, { color: isDarkMode ? '#A1A1AA' : '#687292' }]}>
              Gerencie suas informações e Preferências.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.notificationButton, { backgroundColor: pageBackground, borderColor }]}
            onPress={handleOpenNotifications}
            activeOpacity={0.82}
          >
            <Bell size={26} color={isDarkMode ? '#F8FAFC' : '#080D2D'} strokeWidth={2.45} />
            {notificationBadgeCount > 0 && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: cardBackground, borderColor }]}
          onPress={() => setIsEditModalOpen(true)}
          activeOpacity={0.86}
        >
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: photoURL }} style={styles.avatarImage} />
            <TouchableOpacity style={styles.editAvatarButton} onPress={() => setIsEditModalOpen(true)} activeOpacity={0.85}>
              <Pencil size={16} color="#FFFFFF" strokeWidth={2.7} />
            </TouchableOpacity>
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.userNameText, { color: isDarkMode ? '#F8FAFC' : '#080D2D' }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.userEmailText, { color: isDarkMode ? '#A1A1AA' : '#687292' }]} numberOfLines={1}>
              {email}
            </Text>
            <View style={styles.planBadge}>
              <Crown size={17} color="#5748FF" fill="#5748FF" strokeWidth={2.3} />
              <Text style={styles.planBadgeText}>Plano {planLabel}</Text>
            </View>
          </View>

          <ChevronRight size={29} color={isDarkMode ? '#F8FAFC' : '#080D2D'} strokeWidth={2.6} />
        </TouchableOpacity>

        <View style={[styles.planCard, { backgroundColor: cardBackground, borderColor }]}>
          <View style={styles.planCardLeft}>
            <ProfileIconBox icon={Crown} backgroundColor={iconBackground} />
            <View style={styles.planCardCopy}>
              <Text style={styles.planTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>
                Você está no plano {planLabel}
              </Text>
              <Text style={[styles.planDescription, { color: isDarkMode ? '#A1A1AA' : '#687292' }]} numberOfLines={2}>
                {planSubtitle}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.planButton} onPress={() => navigation.navigate('Plan')} activeOpacity={0.82}>
            <Text style={styles.planButtonText}>Ver meu plano</Text>
            <ChevronRight size={20} color="#5748FF" strokeWidth={2.8} />
          </TouchableOpacity>
        </View>

        <ProfileSection title="Conta" isDarkMode={isDarkMode}>
          <ProfileMenuItem icon={UserCircle} title="Meus dados" subtitle="Nome, e-mail, telefone e foto" onPress={() => setIsEditModalOpen(true)} isDarkMode={isDarkMode} />
          <ProfileMenuItem icon={Shield} title="Segurança" subtitle="Senha, biometria e sessões" onPress={() => navigation.navigate('Settings', { section: 'security' })} isDarkMode={isDarkMode} />
          <ProfileMenuItem icon={CreditCard} title="Meu plano" subtitle="Gerencie sua assinatura" onPress={() => navigation.navigate('Plan')} isLast isDarkMode={isDarkMode} />
        </ProfileSection>

        <ProfileSection title="Finanças" isDarkMode={isDarkMode}>
          <ProfileMenuItem icon={Landmark} title="Minhas contas" subtitle="Bancos, carteiras e Open Finance" onPress={() => navigation.navigate('Accounts')} isDarkMode={isDarkMode} />
          <ProfileMenuItem icon={CreditCard} title="Meus cartões" subtitle="Gerencie seus cartões de crédito" onPress={() => navigation.navigate('MainTabs', { screen: 'Cards' })} isDarkMode={isDarkMode} />
          <ProfileMenuItem icon={Target} title="Minhas metas" subtitle="Acompanhe seus objetivos" onPress={() => navigation.navigate('Goals')} isDarkMode={isDarkMode} />
          <ProfileMenuItem icon={PieChart} title="Limites por categoria" subtitle="Defina seus orçamentos" onPress={() => navigation.navigate('CategoryLimits')} isLast isDarkMode={isDarkMode} />
        </ProfileSection>

        <ProfileSection title="preferências" isDarkMode={isDarkMode}>
          <ProfileMenuItem icon={Palette} title="Aparência" subtitle="Tema, cores e visual" rightText={getThemeLabel(themeMode)} onPress={() => navigation.navigate('Settings', { section: 'appearance' })} isDarkMode={isDarkMode} />
          <ProfileMenuItem icon={Bell} title="Notificações" subtitle="Alertas e lembretes" onPress={() => navigation.navigate('Settings', { section: 'notifications' })} isDarkMode={isDarkMode} />
          <ProfileMenuItem icon={Globe2} title="Idioma" subtitle="Português (Brasil)" onPress={() => navigation.navigate('Settings', { section: 'language' })} isLast isDarkMode={isDarkMode} />
        </ProfileSection>

        <ProfileSection title="Suporte" isDarkMode={isDarkMode}>
          <ProfileMenuItem icon={CircleHelp} title="Ajuda e suporte" subtitle="FAQ, contato e termos" onPress={() => navigation.navigate('Help')} isDarkMode={isDarkMode} />
          <ProfileMenuItem icon={FileText} title="Termos e privacidade" subtitle="Política de privacidade e termos de uso" onPress={() => navigation.navigate('Help')} isLast isDarkMode={isDarkMode} />
        </ProfileSection>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={26} color="#E11919" strokeWidth={2.5} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>

      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

      {user && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          uid={user.uid}
          currentName={displayName}
          currentPhoto={profile?.photoURL || user.photoURL || ''}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  screenTitle: {
    fontSize: 31,
    lineHeight: 37,
    fontFamily: 'Inter-Bold',
  },
  screenSubtitle: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  notificationButton: {
    width: 58,
    height: 58,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E11919',
  },
  userCard: {
    minHeight: 132,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingVertical: 17,
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 88,
    height: 88,
    marginRight: 20,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8ECF4',
  },
  editAvatarButton: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5748FF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userNameText: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Inter-Bold',
  },
  userEmailText: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  planBadge: {
    alignSelf: 'flex-start',
    minHeight: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#8A70FF',
    backgroundColor: 'rgba(87,72,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 13,
    marginTop: 12,
  },
  planBadgeText: {
    color: '#5748FF',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Inter-Bold',
  },
  planCard: {
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 23,
  },
  planCardLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  planCardCopy: {
    flex: 1,
    minWidth: 0,
  },
  planTitle: {
    color: '#5748FF',
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Inter-Bold',
  },
  planDescription: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  planButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(87,72,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 13,
  },
  planButtonText: {
    color: '#5748FF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Inter-Bold',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontFamily: 'Inter-Bold',
    marginBottom: 9,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItemRow: {
    minHeight: 73,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuItemLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginRight: 10,
  },
  menuIconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCopy: {
    flex: 1,
    minWidth: 0,
  },
  menuTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Inter-Bold',
  },
  menuSubtitle: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
    marginTop: 1,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuRightText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  logoutButton: {
    height: 54,
    borderRadius: 13,
    backgroundColor: '#FFF0F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: -3,
  },
  logoutText: {
    color: '#E11919',
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Inter-Bold',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewAvatarBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarImage: {
    width: '100%',
    height: '100%',
  },
  uploadPhotoButton: {
    height: 38,
    borderRadius: 14,
    backgroundColor: '#5748FF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  uploadPhotoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  fieldSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  presetsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  presetCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  presetImage: {
    width: '100%',
    height: '100%',
  },
  presetSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formInput: {
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    borderWidth: 1,
  },
  saveButton: {
    height: 54,
    backgroundColor: '#5748FF',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
    shadowColor: '#5748FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
});

