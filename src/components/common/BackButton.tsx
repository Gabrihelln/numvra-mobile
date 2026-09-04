import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';

interface BackButtonProps {
  onPress?: () => void;
}

/** Shared secondary-screen back control, matching the original Settings header. */
export const BackButton: React.FC<BackButtonProps> = ({ onPress }) => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress || (() => navigation.goBack())}
      style={[
        styles.button,
        {
          borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
          backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
        },
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
    >
      <ChevronLeft size={20} color={isDarkMode ? '#F8FAFC' : '#111827'} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
});
