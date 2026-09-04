import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Transaction, Subscription } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Utensils,
  Bus,
  Film,
  HeartPulse,
  GraduationCap,
  Home,
  Banknote,
  Trophy,
  Calendar,
  Gift,
  Wallet,
  Play,
  CreditCard,
} from 'lucide-react-native';
import { getCategoryVisual } from '../../constants/iconRegistry';
import { RemoteIcon } from './RemoteIcon';

interface TransactionIconProps {
  transaction?: Transaction;
  subscriptions?: Subscription[];
  icon?: string;
  category?: string;
  categoryColor?: string;
  type?: 'income' | 'expense';
}

export const TransactionIcon: React.FC<TransactionIconProps> = ({
  transaction,
  subscriptions = [],
  icon,
  category,
  categoryColor,
  type,
}) => {
  const { isDarkMode } = useTheme();
  const txCategory = transaction?.category || category || '';
  const txTitle = transaction?.title || '';
  const txType = transaction?.type || type || 'expense';
  const isCardCharge = transaction?.isCardCharge;
  const configuredIcon = transaction?.icon || icon;
  const configuredColor = transaction?.categoryColor || categoryColor;

  const titleLower = txTitle.toLowerCase();
  const categoryLower = txCategory.toLowerCase();

  // Credit card charge or payment
  if (
    isCardCharge ||
    categoryLower.includes('cartão') ||
    categoryLower.includes('cartao') ||
    titleLower.includes('fatura')
  ) {
    return (
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isDarkMode ? 'rgba(91, 76, 216, 0.2)' : '#eef2ff',
            borderColor: isDarkMode ? 'rgba(91, 76, 216, 0.4)' : '#ede9fe',
          },
        ]}
      >
        <CreditCard size={20} color="#6c5ce7" />
      </View>
    );
  }

  if (configuredIcon && configuredIcon !== 'tag') {
    const visual = getCategoryVisual(configuredIcon, configuredColor, isDarkMode);
    const ConfiguredIcon = visual.Icon;
    return (
      <View style={[styles.iconCircle, { backgroundColor: visual.backgroundColor }]}>
        <ConfiguredIcon size={18} color={visual.color} />
      </View>
    );
  }

  // Brand mappings
  if (titleLower.includes('paypal')) {
    return (
      <View style={[styles.iconCircle, { backgroundColor: '#f2f5fa' }]}>
        <Image
          source={{ uri: 'https://logo.clearbit.com/paypal.com' }}
          style={styles.brandImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (titleLower.includes('netflix') || titleLower.includes('assinatura')) {
    return (
      <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
        <Image
          source={{ uri: 'https://logo.clearbit.com/netflix.com' }}
          style={styles.brandImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  // Matching subscription icon
  const matchingSub = subscriptions.find((sub) => {
    const subNameLower = sub.name.toLowerCase();
    return (
      titleLower.includes(subNameLower) ||
      subNameLower.includes(titleLower) ||
      (titleLower.startsWith('pagamento:') && titleLower.includes(subNameLower))
    );
  });

  if (matchingSub && matchingSub.icon && matchingSub.icon.startsWith('http')) {
    return (
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
            borderColor: isDarkMode ? '#27272a' : '#f1f5f9',
          },
        ]}
      >
        <RemoteIcon
          uri={matchingSub.iconUrl || matchingSub.icon}
          size={26}
          fallback={<Wallet size={18} color={isDarkMode ? '#a1a1aa' : '#64748b'} />}
        />
      </View>
    );
  }

  // Category fallback mappings
  if (
    categoryLower.includes('aliment') ||
    categoryLower.includes('comida') ||
    categoryLower.includes('restaurante') ||
    categoryLower.includes('mercado')
  ) {
    return (
      <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
        <Utensils size={18} color="#d97706" />
      </View>
    );
  }

  if (
    categoryLower.includes('transporte') ||
    categoryLower.includes('uber') ||
    categoryLower.includes('combustivel') ||
    categoryLower.includes('gasolina')
  ) {
    return (
      <View style={[styles.iconCircle, { backgroundColor: '#e0f2fe' }]}>
        <Bus size={18} color="#0284c7" />
      </View>
    );
  }

  if (
    categoryLower.includes('lazer') ||
    categoryLower.includes('entretenimento') ||
    categoryLower.includes('cinema')
  ) {
    return (
      <View style={[styles.iconCircle, { backgroundColor: '#f3e8ff' }]}>
        <Film size={18} color="#7c3aed" />
      </View>
    );
  }

  if (categoryLower.includes('saúde') || categoryLower.includes('saude') || categoryLower.includes('farmacia')) {
    return (
      <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
        <HeartPulse size={18} color="#dc2626" />
      </View>
    );
  }

  if (categoryLower.includes('educação') || categoryLower.includes('educacao') || categoryLower.includes('curso')) {
    return (
      <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
        <GraduationCap size={18} color="#ca8a04" />
      </View>
    );
  }

  if (categoryLower.includes('moradia') || categoryLower.includes('aluguel') || categoryLower.includes('casa')) {
    return (
      <View style={[styles.iconCircle, { backgroundColor: '#e0e7ff' }]}>
        <Home size={18} color="#4f46e5" />
      </View>
    );
  }

  if (txType === 'income') {
    return (
      <View style={[styles.iconCircle, { backgroundColor: '#ecfdf5' }]}>
        <Banknote size={18} color="#059669" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.iconCircle,
        {
          backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
          borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
        },
      ]}
    >
      <Wallet size={18} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
    </View>
  );
};

const styles = StyleSheet.create({
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  brandImage: {
    width: 26,
    height: 26,
  },
});
