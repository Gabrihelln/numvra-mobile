import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { spacing, borderRadius, typography } from '../theme';
import { Sun, Moon, ShieldCheck, ArrowRight, Wallet, CreditCard, PieChart, User } from 'lucide-react-native';

interface PlaceholderScreenProps {
  title: string;
  subtitle?: string;
  iconName?: 'wallet' | 'card' | 'chart' | 'user';
  onAction?: () => void;
  actionTitle?: string;
}

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({
  title,
  subtitle = 'Estrutura base do projeto configurada com sucesso.',
  iconName = 'wallet',
  onAction,
  actionTitle,
}) => {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { user, activePlan } = useAuth();

  const renderIcon = () => {
    const iconProps = { size: 40, color: colors.primary };
    switch (iconName) {
      case 'card':
        return <CreditCard {...iconProps} />;
      case 'chart':
        return <PieChart {...iconProps} />;
      case 'user':
        return <User {...iconProps} />;
      default:
        return <Wallet {...iconProps} />;
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.primaryLight }]}>
          {renderIcon()}
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Status:</Text>
          <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.badgeText, { color: colors.success }]}>Pronto para Migração</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Usuário:</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {user ? user.email : 'Desconectado'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Plano:</Text>
          <Text style={[styles.infoValue, { color: colors.primary, textTransform: 'uppercase' }]}>
            {activePlan}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Tema:</Text>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.themeButton, { backgroundColor: colors.surface }]}
          >
            {isDarkMode ? (
              <Moon size={16} color={colors.primary} />
            ) : (
              <Sun size={16} color={colors.warning} />
            )}
            <Text style={[styles.themeButtonText, { color: colors.text }]}>
              {isDarkMode ? 'Escuro' : 'Claro'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {onAction && actionTitle && (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.actionButtonText}>{actionTitle}</Text>
          <ArrowRight size={18} color="#ffffff" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  headerCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMedium,
    textAlign: 'center',
    maxWidth: 280,
  },
  infoCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    ...typography.bodyMedium,
  },
  infoValue: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  themeButtonText: {
    ...typography.caption,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    ...typography.button,
    color: '#ffffff',
  },
});
