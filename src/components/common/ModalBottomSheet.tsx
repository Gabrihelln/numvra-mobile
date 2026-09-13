import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ModalBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string | number;
  headerRight?: React.ReactNode;
  contentStyle?: ViewStyle;
}

export const ModalBottomSheet: React.FC<ModalBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '88%',
  headerRight,
  contentStyle,
}) => {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
              borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
              maxHeight: maxHeight as any,
              paddingBottom: Math.max(36, insets.bottom + 16),
            },
            contentStyle,
          ]}
        >
          {/* Handle bar */}
          <View
            style={[
              styles.handle,
              { backgroundColor: isDarkMode ? '#2D2D3A' : '#E2E8F0' },
            ]}
          />

          {/* Header */}
          {(title || headerRight) && (
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={isDarkMode ? '#94A3B8' : '#9CA3AF'} />
              </TouchableOpacity>
              {title && (
                <Text style={[styles.title, { color: colors.text }]}>
                  {title}
                </Text>
              )}
              <View style={styles.headerRightContainer}>
                {headerRight || <View style={{ width: 28 }} />}
              </View>
            </View>
          )}

          {/* Body */}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 15, 25, 0.42)',
  },
  modalContent: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  closeButton: {
    padding: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerRightContainer: {
    minWidth: 28,
    alignItems: 'flex-end',
  },
});
