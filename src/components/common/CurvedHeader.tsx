import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

interface CurvedHeaderProps {
  title: string;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const CurvedHeader: React.FC<CurvedHeaderProps> = ({
  title,
  onBack,
  rightActions,
  backgroundColor,
  style,
}) => {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const bgColor = backgroundColor || (isDarkMode ? '#3730A3' : '#4D41CC');
  const dynamicPaddingTop = Math.max(insets.top, 16) + 12;

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: bgColor,
          paddingTop: dynamicPaddingTop,
        },
        style,
      ]}
    >
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.headerIconButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerPlaceholder} />
      )}

      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.headerRightActions}>
        {rightActions || <View style={styles.headerPlaceholder} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingBottom: 28,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#4D41CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  headerIconButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerPlaceholder: {
    width: 38,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginHorizontal: 8,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 38,
    justifyContent: 'flex-end',
    gap: 4,
  },
});
