import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface EmptyStateProps {
  icon?: React.ComponentType<{ size: number; color: string }>;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  style,
}) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {Icon && (
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: isDarkMode ? '#27272A' : '#F1F5F9',
            },
          ]}
        >
          <Icon size={24} color={isDarkMode ? '#94A3B8' : '#64748B'} />
        </View>
      )}

      {title && (
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      )}

      <Text
        style={[
          styles.message,
          { color: isDarkMode ? '#64748B' : '#9CA3AF' },
          !title && styles.messageOnly,
        ]}
      >
        {message}
      </Text>

      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  messageOnly: {
    fontWeight: '600',
  },
  actionButton: {
    marginTop: 14,
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
