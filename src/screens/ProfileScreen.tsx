import React, { useState } from 'react';
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
  UserCircle,
  Wallet,
  LayoutGrid,
  Repeat,
  Target,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Camera,
  Check,
} from 'lucide-react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import { auth, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { ModalBottomSheet } from '../components/common';
import { profileService } from '../services/profileService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/adventurer/png?seed=Mika',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Sasha',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Bento',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Leo',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Clara',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Sofia',
];
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
      const message = err instanceof Error ? err.message : 'N?o foi poss?vel atualizar o perfil.';
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
        {/* Avatar Preview */}
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

        {/* Avatar Presets */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
            SELECIONE UM AVATAR
          </Text>
          <View style={styles.presetsGrid}>
            {AVATAR_PRESETS.map((preset, index) => {
              const isSelected = photo === preset;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.presetCircle,
                    {
                      borderColor: isSelected ? '#6C5CE7' : 'transparent',
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

        {/* Custom Photo URL */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
            FOTO URL PERSONALIZADA
          </Text>
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

        {/* Display Name */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
            NOME DE EXIBIÇÃO
          </Text>
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

        {/* Save Button */}
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

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const { user, profile, signOut } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Erro', 'Não foi possível encerrar a sessão.');
    }
  };

  const displayName = profile?.displayName || user?.displayName || 'Usuário';
  const email = user?.email || '';
  const photoURL =
    profile?.photoURL ||
    user?.photoURL ||
    `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(displayName || 'U')}`;

  const menuGroups = [
    [
      {
        icon: UserCircle,
        label: 'Meus dados',
        onPress: () => setIsEditModalOpen(true),
        iconColor: '#6C5CE7',
        iconBg: isDarkMode ? 'rgba(108, 92, 231, 0.15)' : '#EEF2FF',
      },
      {
        icon: Wallet,
        label: 'Orçamento',
        onPress: () => navigation.navigate('Budget'),
        iconColor: '#6C5CE7',
        iconBg: isDarkMode ? 'rgba(108, 92, 231, 0.15)' : '#EEF2FF',
      },
      {
        icon: Repeat,
        label: 'Assinaturas',
        onPress: () => navigation.navigate('Subscriptions'),
        iconColor: '#6C5CE7',
        iconBg: isDarkMode ? 'rgba(108, 92, 231, 0.15)' : '#EEF2FF',
      },
      {
        icon: Target,
        label: 'Metas',
        onPress: () => navigation.navigate('Goals'),
        iconColor: '#6C5CE7',
        iconBg: isDarkMode ? 'rgba(108, 92, 231, 0.15)' : '#EEF2FF',
      },
      {
        icon: Settings,
        label: 'Limites por Categorias',
        onPress: () => navigation.navigate('Budget'),
        iconColor: '#6C5CE7',
        iconBg: isDarkMode ? 'rgba(108, 92, 231, 0.15)' : '#EEF2FF',
      },
    ],
    [
      {
        icon: LayoutGrid,
        label: 'Meu Plano',
        onPress: () => navigation.navigate('Plan'),
        iconColor: '#6C5CE7',
        iconBg: isDarkMode ? 'rgba(108, 92, 231, 0.15)' : '#EEF2FF',
      },
      {
        icon: Settings,
        label: 'Configurações',
        onPress: () => navigation.navigate('Settings'),
        iconColor: '#6C5CE7',
        iconBg: isDarkMode ? 'rgba(108, 92, 231, 0.15)' : '#EEF2FF',
      },
      {
        icon: HelpCircle,
        label: 'Ajuda e Termos de Uso',
        onPress: () => navigation.navigate('Help'),
        iconColor: '#6C5CE7',
        iconBg: isDarkMode ? 'rgba(108, 92, 231, 0.15)' : '#EEF2FF',
      },
    ],
    [
      {
        icon: LogOut,
        label: 'Sair',
        onPress: handleLogout,
        iconColor: '#EF4444',
        iconBg: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
      },
    ],
  ];

  return (
    <View style={[styles.mainContainer, { backgroundColor: isDarkMode ? '#121214' : '#FAF9FF' }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16) + 12,
            paddingBottom: Math.max(insets.bottom, 12) + 98,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={[styles.screenTitle, { color: colors.text }]}>Perfil</Text>

        {/* Profile Card / Avatar Info */}
        <View style={styles.profileHeaderSection}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: photoURL }} style={styles.avatarImage} />
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={() => setIsEditModalOpen(true)}
              activeOpacity={0.85}
            >
              <Camera size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.userNameText, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.userEmailText, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
            {email}
          </Text>

          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => setIsEditModalOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.editProfileButtonText}>Editar Perfil</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Groups */}
        <View style={styles.menuGroupsContainer}>
          {menuGroups.map((group, groupIndex) => (
            <View
              key={groupIndex}
              style={[
                styles.menuGroupCard,
                {
                  backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
                  borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
                },
              ]}
            >
              {group.map((item, itemIndex) => {
                const IconComponent = item.icon;
                const isLast = itemIndex === group.length - 1;

                return (
                  <TouchableOpacity
                    key={itemIndex}
                    style={[
                      styles.menuItemRow,
                      !isLast && {
                        borderBottomWidth: 1,
                        borderBottomColor: isDarkMode ? '#2D2D3A' : '#F8FAFC',
                      },
                    ]}
                    onPress={item.onPress}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.menuIconBox, { backgroundColor: item.iconBg }]}>
                        <IconComponent size={20} color={item.iconColor} strokeWidth={2.2} />
                      </View>
                      <Text
                        style={[
                          styles.menuItemLabel,
                          {
                            color: item.iconColor === '#EF4444' ? '#EF4444' : colors.text,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>

                    <ChevronRight
                      size={18}
                      color={isDarkMode ? '#64748B' : '#CBD5E1'}
                      strokeWidth={2.5}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

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
    paddingHorizontal: 20,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  profileHeaderSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#E2E8F0',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  userNameText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  userEmailText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  editProfileButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 28,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  editProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  menuGroupsContainer: {
    gap: 16,
  },
  menuGroupCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '88%',
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  closeButton: {
    padding: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
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
    backgroundColor: '#6C5CE7',
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
    fontWeight: '800',
  },
  fieldSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
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
    fontWeight: '600',
    borderWidth: 1,
  },
  saveButton: {
    height: 54,
    backgroundColor: '#6C5CE7',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
