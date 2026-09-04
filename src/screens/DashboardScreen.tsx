import React, { useCallback, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  useWindowDimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { transactionService, getTransactionTimestamp } from '../services/transactionService';
import { subscriptionService } from '../services/subscriptionService';
import { goalService } from '../services/goalService';
import { cardService } from '../services/cardService';
import { Transaction, Subscription, Goal, CreditCardType } from '../types';
import { UpcomingBillsModal } from '../components/modals/UpcomingBillsModal';
import { PayCardBillModal } from '../components/modals/PayCardBillModal';
import { NotificationsModal } from '../components/modals/NotificationsModal';
import { pushNotificationService, type SystemNotification } from '../services/pushNotificationService';
import { TransactionIcon } from '../components/common/TransactionIcon';
import { BalanceSummaryCard } from '../components/common/BalanceSummaryCard';
import { getGreetingForDate } from '../utils/greeting';
import { RemoteIcon } from '../components/common/RemoteIcon';
import {
  Bell,
  ChevronRight,
  Eye,
  EyeOff,
  TrendingUp,
  AlertCircle,
  CreditCard,
} from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const parseNextBilling = (nextBilling: string): Date => {
  const match = nextBilling.match(/^(\d{2})\/(\d{2})$/);
  const now = new Date();
  const currentYear = now.getFullYear();
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    return new Date(currentYear, month, day);
  }
  const dayMatch = nextBilling.match(/\d+/);
  if (dayMatch) {
    const day = parseInt(dayMatch[0], 10);
    return new Date(currentYear, now.getMonth(), day);
  }
  return new Date();
};

const getUpcomingSubscriptions = (subs: Subscription[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return subs.filter((sub) => {
    const dueDate = parseNextBilling(sub.nextBilling || '15/01');
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 5;
  });
};

const getUpcomingCardBills = (cards: CreditCardType[]) => {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return cards.filter(
    (card) => (card.usedLimit || 0) > 0 && card.lastPaidMonth !== currentMonthStr
  );
};

const getNextBillingDate = (
  currentBilling: string,
  period: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual'
): string => {
  const match = currentBilling.match(/^(\d{2})\/(\d{2})$/);
  const now = new Date();
  let day = 15;
  let month = now.getMonth();
  let year = now.getFullYear();

  if (match) {
    day = parseInt(match[1], 10);
    month = parseInt(match[2], 10) - 1;
  }

  const billingDate = new Date(year, month, day);

  if (period === 'Anual') {
    billingDate.setFullYear(billingDate.getFullYear() + 1);
  } else if (period === 'Trimestral') {
    billingDate.setMonth(billingDate.getMonth() + 3);
  } else if (period === 'Semestral') {
    billingDate.setMonth(billingDate.getMonth() + 6);
  } else {
    billingDate.setMonth(billingDate.getMonth() + 1);
  }

  const nextDay = String(billingDate.getDate()).padStart(2, '0');
  const nextMonth = String(billingDate.getMonth() + 1).padStart(2, '0');
  return `${nextDay}/${nextMonth}`;
};

const formatTransactionDateTime = (item: Transaction): string => {
  if (item.createdAt) {
    try {
      let dateObj: Date;
      if (typeof item.createdAt.toDate === 'function') {
        dateObj = item.createdAt.toDate();
      } else if (item.createdAt instanceof Date) {
        dateObj = item.createdAt;
      } else if (typeof item.createdAt === 'string') {
        dateObj = new Date(item.createdAt);
      } else if (item.createdAt.seconds) {
        dateObj = new Date(item.createdAt.seconds * 1000);
      } else {
        dateObj = new Date();
      }

      const hh = String(dateObj.getHours()).padStart(2, '0');
      const mm = String(dateObj.getMinutes()).padStart(2, '0');
      const timeStr = `${hh}:${mm}`;

      const now = new Date();
      if (dateObj.toDateString() === now.toDateString()) {
        return `Hoje, ${timeStr}`;
      }

      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      if (dateObj.toDateString() === yesterday.toDateString()) {
        return `Ontem, ${timeStr}`;
      }

      const day = dateObj.getDate();
      const monthNames = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
      ];
      const month = monthNames[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      return `${day} de ${month} de ${year}, ${timeStr}`;
    } catch (e) {
      // fallback
    }
  }

  if (item.date) {
    try {
      const [year, m, day] = item.date.split('-').map(Number);
      const dateObj = new Date(year, m - 1, day);
      const now = new Date();

      if (dateObj.toDateString() === now.toDateString()) {
        return 'Hoje';
      }

      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      if (dateObj.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
      }

      const monthNames = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
      ];
      const displayMonth = monthNames[dateObj.getMonth()];
      return `${day} de ${displayMonth} de ${year}`;
    } catch (e) {
      return item.date;
    }
  }

  return 'Hoje';
};

const formatDashboardAmount = (value: number, isVisible: boolean, options?: Intl.NumberFormatOptions) =>
  isVisible ? value.toLocaleString('pt-BR', options) : '••••••';
const DASHBOARD_NOTIFICATIONS_LAST_SEEN_PREFIX = '@numvra:notifications:lastSeen:';

const getNotificationCreatedAtMs = (notification: SystemNotification) => {
  const value = notification.createdAt;
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  return 0;
};

const getNotificationBadgeLabel = (count: number) => (count > 99 ? '99+' : String(count));

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { isDarkMode } = useTheme();
  const { user, profile, checkLimit, triggerUpgrade } = useAuth();

  const [showBalance, setShowBalance] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [isUpcomingModalOpen, setIsUpcomingModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationBadgeCount, setNotificationBadgeCount] = useState(0);
  const [selectedCardForPayment, setSelectedCardForPayment] = useState<CreditCardType | null>(null);
  const [isPayCardModalOpen, setIsPayCardModalOpen] = useState(false);
  const [greeting, setGreeting] = useState(() => getGreetingForDate(new Date()));

  const refreshGreeting = useCallback(() => {
    setGreeting(getGreetingForDate(new Date()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshGreeting();
    }, [refreshGreeting])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refreshGreeting();
    });
    return () => subscription.remove();
  }, [refreshGreeting]);

  useEffect(() => {
    if (!user) {
      setNotificationBadgeCount(0);
      return;
    }

    const lastSeenKey = `${DASHBOARD_NOTIFICATIONS_LAST_SEEN_PREFIX}${user.uid}`;
    let active = true;
    let lastSeenMs = 0;
    let latestItems: SystemNotification[] = [];

    const updateBadge = () => {
      const unseenCount = latestItems.filter((item) => getNotificationCreatedAtMs(item) > lastSeenMs).length;
      setNotificationBadgeCount(unseenCount);
    };

    AsyncStorage.getItem(lastSeenKey).then((value) => {
      if (!active) return;
      lastSeenMs = Number(value || 0);
      updateBadge();
    });

    const unsubscribe = pushNotificationService.listenToSystemNotifications(
      user.uid,
      (items) => {
        if (!active) return;
        latestItems = items;
        updateBadge();
      },
      () => {
        if (active) setNotificationBadgeCount(0);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  const handleOpenNotifications = async () => {
    if (!notificationAccess.allowed) {
      triggerUpgrade?.('notification', notificationAccess.reason);
      return;
    }

    if (user) {
      await AsyncStorage.setItem(`${DASHBOARD_NOTIFICATIONS_LAST_SEEN_PREFIX}${user.uid}`, String(Date.now()));
    }

    setNotificationBadgeCount(0);
    setIsNotificationsOpen(true);
  };

  useEffect(() => {
    if (user) {
      const unsubTransactions = transactionService.subscribeToTransactions(setTransactions);
      const unsubSubscriptions = subscriptionService.subscribeToSubscriptions(setSubscriptions);
      const unsubGoals = goalService.subscribeToGoals(setGoals);
      const unsubCards = cardService.subscribeToCards(setCards);
      return () => {
        unsubTransactions();
        unsubSubscriptions();
        unsubGoals();
        unsubCards();
      };
    }
  }, [user]);

  // Receitas
  const totalIncome = transactions
    .filter((t) => t.type === 'income' && t.status !== 'pending')
    .reduce((acc, t) => acc + t.amount, 0);

  // Despesas da conta corrente (débito, pix, dinheiro, transferências - SEM cartão de crédito)
  const accountExpenses = transactions
    .filter((t) => t.type === 'expense' && !t.isCardCharge && t.status !== 'pending')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  // Despesas no cartão de crédito
  const cardExpenses = transactions
    .filter((t) => t.type === 'expense' && t.isCardCharge && t.status !== 'pending')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  // Total de Despesas
  const totalExpense = accountExpenses + cardExpenses;

  // Saldo da Conta Corrente
  const balance = totalIncome - accountExpenses;
  const alertAccess = checkLimit('alert');
  const cardAccess = checkLimit('card');
  const notificationAccess = checkLimit('notification');

  // Contas e Faturas Próximas ao Vencimento
  const upcomingSubs = getUpcomingSubscriptions(subscriptions);
  const upcomingCards = cardAccess.allowed ? getUpcomingCardBills(cards) : [];
  const totalUpcomingCount = upcomingSubs.length + upcomingCards.length;
  const totalUpcomingAmount =
    upcomingSubs.reduce((acc, sub) => acc + sub.amount, 0) +
    upcomingCards.reduce((acc, card) => acc + (card.usedLimit || 0), 0);

  let latestDueDate = '';
  const allDueDates = [
    ...upcomingSubs.map((s) => s.nextBilling || ''),
    ...upcomingCards.map(
      (c) =>
        c.dueDate ||
        `${c.bestDay || 10}/${String(new Date().getMonth() + 1).padStart(2, '0')}`
    ),
  ];
  if (allDueDates.length > 0) {
    latestDueDate = allDueDates[0];
  }

  const handlePaySubscription = async (sub: Subscription) => {
    try {
      const now = new Date();
      const currentBilling =
        sub.nextBilling || `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
      const nextBillingDate = getNextBillingDate(currentBilling, sub.period || 'Mensal');

      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      await transactionService.addTransaction({
        title: `Pagamento: ${sub.name}`,
        amount: -sub.amount,
        date: dateStr,
        category: 'Assinaturas',
        type: 'expense',
        status: 'paid',
        isCardCharge: false,
      });

      await subscriptionService.updateSubscription(sub.id, {
        nextBilling: nextBillingDate,
      });
    } catch (err) {
      console.error('Erro ao registrar pagamento da assinatura:', err);
    }
  };

  const handlePayCardBill = (card: CreditCardType) => {
    if (!cardAccess.allowed) {
      triggerUpgrade?.('card', cardAccess.reason);
      return;
    }

    setSelectedCardForPayment(card);
    setIsUpcomingModalOpen(false);
    setIsPayCardModalOpen(true);
  };

  const handleConfirmPayCardBill = async (data: any) => {
    if (!cardAccess.allowed) {
      triggerUpgrade?.('card', cardAccess.reason);
      return;
    }

    const {
      card,
      paymentType,
      paidAmount,
      remainingAmount,
      isInstallmentRest,
      installmentCount,
      installmentValue,
    } = data;
    if (paidAmount <= 0) return;

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Registrar transação de pagamento da fatura saindo da conta corrente
    await transactionService.addTransaction({
      title:
        paymentType === 'total'
          ? `Pagamento Fatura: ${card.name} (•••• ${card.finalDigits})`
          : `Pagamento Parcial Fatura: ${card.name} (•••• ${card.finalDigits})`,
      amount: -paidAmount,
      date: dateStr,
      category: 'Cartão de Crédito',
      type: 'expense',
      isCardCharge: false,
      status: 'paid',
      cardId: card.id,
      cardName: `${card.name} (•••• ${card.finalDigits})`,
      installments: 1,
      currentInstallment: 1,
    });

    // 2. Se optou por parcelar o saldo restante com juros
    if (isInstallmentRest && installmentCount && installmentValue && installmentValue > 0) {
      for (let i = 1; i <= installmentCount; i++) {
        const installmentDate = new Date();
        installmentDate.setMonth(installmentDate.getMonth() + i);
        const instDateStr = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}-${String(installmentDate.getDate()).padStart(2, '0')}`;

        await transactionService.addTransaction({
          title: `Parcelamento Fatura: ${card.name} (${i}/${installmentCount})`,
          amount: -installmentValue,
          date: instDateStr,
          category: 'Cartão de Crédito',
          type: 'expense',
          isCardCharge: true,
          status: 'paid',
          cardId: card.id,
          cardName: `${card.name} (•••• ${card.finalDigits})`,
          installments: installmentCount,
          currentInstallment: i,
        });
      }

      const newUsedLimit = installmentCount * installmentValue;
      await cardService.updateCard(card.id, {
        usedLimit: newUsedLimit,
        lastPaidMonth: currentMonthStr,
      });
    } else {
      const newUsedLimit = paymentType === 'total' ? 0 : Math.max(0, remainingAmount);
      await cardService.updateCard(card.id, {
        usedLimit: newUsedLimit,
        lastPaidMonth: currentMonthStr,
      });
    }
  };

  const monthYearLabel = new Date().toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  const displayName = profile?.displayName || user?.displayName || '';

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#121214' : '#f8fafc' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Purple Background Banner */}
      <View style={[styles.purpleBanner, { height: 410 + insets.top }]} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greetingText}>{greeting}</Text>
              {!!displayName && (
                <Text style={styles.userNameText}>
                  {displayName}
                </Text>
              )}
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.bellButton}
                onPress={handleOpenNotifications}
                activeOpacity={0.8}
              >
                <Bell size={20} color="#ffffff" />
                {notificationBadgeCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText} numberOfLines={1}>
                      {getNotificationBadgeLabel(notificationBadgeCount)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
                activeOpacity={0.8}
              >
                <View style={styles.avatarBorder}>
                  <Image
                    source={{
                      uri:
                        profile?.photoURL ||
                        user?.photoURL ||
                        'https://api.dicebear.com/7.x/initials/png?seed=' +
                          (profile?.displayName || user?.displayName || 'User'),
                    }}
                    style={styles.avatarImage}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Balance Card Section */}
          <BalanceSummaryCard
            period={monthYearLabel}
            balance={balance}
            income={totalIncome}
            expense={totalExpense}
            isBalanceVisible={showBalance}
            isDarkMode={isDarkMode}
            onToggleBalance={() => setShowBalance((visible) => !visible)}
          />
          {/* Legacy balance markup retained below only during migration */}
          {false && <View style={styles.balanceCard}>
            <View style={styles.balanceHeaderRow}>
              <View style={styles.balanceHeaderLeft}>
                <Text style={styles.balanceLabel}>Saldo em Conta</Text>
                <TouchableOpacity
                  onPress={() => setShowBalance(!showBalance)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  {showBalance ? (
                    <Eye size={16} color="rgba(255, 255, 255, 0.85)" />
                  ) : (
                    <EyeOff size={16} color="rgba(255, 255, 255, 0.85)" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.monthLabel}>{monthYearLabel}</Text>
            </View>

            <Text style={styles.balanceAmount}>
              R$ {showBalance ? balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••••'}
            </Text>

            {/* Incomes & Expenses Split Box */}
            <View
              style={[
                styles.splitStatsBox,
                {
                  backgroundColor: isDarkMode ? '#1e1e26' : '#ffffff',
                  borderColor: isDarkMode ? '#27272a' : '#f1f5f9',
                },
              ]}
            >
              <View
                style={[
                  styles.statCol,
                  styles.statColBorder,
                  { borderRightColor: isDarkMode ? '#27272a' : '#f1f5f9' },
                ]}
              >
                <View style={styles.incomeIconBox}>
                  <TrendingUp size={16} color="#10b981" style={{ transform: [{ rotate: '180deg' }] }} />
                </View>
                <View style={styles.statInfo}>
                  <Text style={[styles.statLabel, { color: isDarkMode ? '#71717a' : '#94a3b8' }]}>
                    RECEITAS
                  </Text>
                  <Text
                    style={[styles.statValue, { color: isDarkMode ? '#f4f4f5' : '#111118' }]}
                    numberOfLines={1}
                  >
                    R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <View style={styles.statCol}>
                <View style={styles.expenseIconBox}>
                  <TrendingUp size={16} color="#ef4444" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={[styles.statLabel, { color: isDarkMode ? '#71717a' : '#94a3b8' }]}>
                    DESPESAS
                  </Text>
                  <Text
                    style={[styles.statValue, { color: isDarkMode ? '#f4f4f5' : '#111118' }]}
                    numberOfLines={1}
                  >
                    R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            </View>
          </View>}

          {/* Overlapping Warning Card for upcoming bills */}
          {totalUpcomingCount > 0 && (
            <TouchableOpacity
              onPress={() => {
                if (!alertAccess.allowed) {
                  triggerUpgrade?.('alert', alertAccess.reason);
                  return;
                }
                setIsUpcomingModalOpen(true);
              }}
              style={[
                styles.upcomingBillsCard,
                {
                  backgroundColor: isDarkMode ? '#1e1e26' : '#ffffff',
                  borderColor: isDarkMode ? '#27272a' : '#f1f5f9',
                },
              ]}
              activeOpacity={0.9}
            >
              <View style={styles.warningAlertBadge}>
                <AlertCircle size={12} color="#ffffff" strokeWidth={3} />
              </View>

              <View style={styles.upcomingBillsContent}>
                <View style={styles.upcomingBillsTitleRow}>
                  <Text
                    style={[
                      styles.upcomingBillsTitle,
                      { color: isDarkMode ? '#f4f4f5' : '#1c1c28' },
                    ]}
                  >
                    {totalUpcomingCount}{' '}
                    {totalUpcomingCount === 1 ? 'conta a pagar' : 'contas a pagar'}
                  </Text>
                  {upcomingCards.length > 0 && (
                    <View style={styles.faturaBadge}>
                      <Text style={styles.faturaBadgeText}>
                        Cartao {upcomingCards.length}{' '}
                        {upcomingCards.length === 1 ? 'fatura' : 'faturas'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.upcomingBillsDetails, { color: isDarkMode ? '#71717a' : '#94a3b8' }]}>
                  R$ {showBalance ? totalUpcomingAmount.toFixed(2).replace('.', ',') : '••••••'}{' '}
                  {latestDueDate ? `| Vencimento: ${latestDueDate}` : ''}
                </Text>
              </View>

              <View
                style={[
                  styles.upcomingBillsChevron,
                  { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' },
                ]}
              >
                <ChevronRight size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} />
              </View>
            </TouchableOpacity>
          )}

          {/* Content Area */}
          <View
            style={[
              styles.contentSheet,
              {
                backgroundColor: isDarkMode ? '#121214' : '#ffffff',
              },
            ]}
          >
            <View
              style={[
                styles.sheetHandle,
                { backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0' },
              ]}
            />

            {/* Section 1: Recent Transactions */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text
                  style={[
                    styles.sectionTitleText,
                    { color: isDarkMode ? '#f4f4f5' : '#111118' },
                  ]}
                >
                  Últimas Transações
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('MainTabs', { screen: 'Statement' })
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>Ver todas</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.itemsList}>
                {[...transactions]
                  .filter((t) => t.status !== 'pending')
                  .sort((a, b) => {
                    const msA = getTransactionTimestamp(a);
                    const msB = getTransactionTimestamp(b);
                    if (msB !== msA) return msB - msA;
                    return (b.date || '').localeCompare(a.date || '');
                  })
                  .slice(0, 5)
                  .map((item) => {
                    const isIncome = item.type === 'income';
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.transactionCard,
                          {
                            backgroundColor: isDarkMode ? '#1e1e26' : '#ffffff',
                            borderColor: isDarkMode ? '#27272a' : '#f1f5f9',
                          },
                        ]}
                      >
                        <View style={styles.transactionLeft}>
                          <TransactionIcon
                            transaction={item}
                            subscriptions={subscriptions}
                          />
                          <View style={styles.transactionInfo}>
                            <View style={styles.transactionTitleRow}>
                              <Text
                                style={[
                                  styles.transactionTitle,
                                  { color: isDarkMode ? '#f4f4f5' : '#111118' },
                                ]}
                                numberOfLines={1}
                              >
                                {item.title}
                              </Text>
                              <View
                                style={[
                                  styles.trendDot,
                                  {
                                    backgroundColor: isIncome ? '#10b981' : '#ef4444',
                                  },
                                ]}
                              >
                                <TrendingUp
                                  size={9}
                                  color="#ffffff"
                                  style={isIncome ? { transform: [{ rotate: '180deg' }] } : {}}
                                />
                              </View>
                            </View>

                            <View style={styles.transactionMetaRow}>
                              <Text
                                style={[
                                  styles.transactionDate,
                                  { color: isDarkMode ? '#71717a' : '#94a3b8' },
                                ]}
                              >
                                {formatTransactionDateTime(item)}
                              </Text>
                              {item.isCardCharge && (
                                <View style={styles.cardTagBadge}>
                                  <Text style={styles.cardTagBadgeText}>
                                    Cartao {item.cardName ? item.cardName.split(' ')[0] : 'Cartão'}{' '}
                                    {item.installments && item.installments > 1
                                      ? `• Parcela ${item.currentInstallment || 1}/${item.installments}`
                                      : '• À vista'}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>

                        <View style={styles.transactionRight}>
                          <Text
                            style={[
                              styles.transactionAmount,
                              { color: isIncome ? '#10b981' : '#ef4444' },
                            ]}
                          >
                            {isIncome ? '+ ' : '- '}R${' '}
                            {formatDashboardAmount(Math.abs(item.amount), showBalance, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                          <Text
                            style={[
                              styles.transactionCategory,
                              { color: isDarkMode ? '#71717a' : '#94a3b8' },
                            ]}
                          >
                            {item.category?.toLowerCase()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                {transactions.filter((t) => t.status !== 'pending').length === 0 && (
                  <View style={styles.emptyCard}>
                    <Text style={[styles.emptyCardText, { color: isDarkMode ? '#71717a' : '#94a3b8' }]}>
                      Nenhuma transação encontrada
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Section 2: Subscriptions */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text
                  style={[
                    styles.sectionTitleText,
                    { color: isDarkMode ? '#f4f4f5' : '#111118' },
                  ]}
                >
                  Assinaturas Recorrentes
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('Subscriptions')
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>Ver todas</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.itemsList}>
                {subscriptions.slice(0, 3).map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.subscriptionCard,
                      {
                        backgroundColor: isDarkMode ? '#1e1e26' : '#ffffff',
                        borderColor: isDarkMode ? '#27272a' : '#f1f5f9',
                      },
                    ]}
                  >
                    <View style={styles.subLeft}>
                      <View
                        style={[
                          styles.subIconContainer,
                          {
                            backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                            borderColor: isDarkMode ? '#27272a' : '#f1f5f9',
                          },
                        ]}
                      >
                        <RemoteIcon
                          uri={item.iconUrl || item.icon}
                          size={26}
                          fallback={
                            <Image
                              source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${item.name}` }}
                              style={styles.subIcon}
                              resizeMode="contain"
                            />
                          }
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.subName,
                            { color: isDarkMode ? '#f4f4f5' : '#1f2937' },
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.subNextDate,
                            { color: isDarkMode ? '#71717a' : '#94a3b8' },
                          ]}
                        >
                          Próx. Pagamento:{' '}
                          <Text style={{ color: '#4f46e5', fontWeight: '800' }}>
                            {item.nextBilling}
                          </Text>
                        </Text>
                      </View>
                    </View>

                    <View style={styles.subRight}>
                      <Text
                        style={[
                          styles.subAmount,
                          { color: isDarkMode ? '#f4f4f5' : '#111118' },
                        ]}
                      >
                        R${' '}
                        {formatDashboardAmount(item.amount, showBalance, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                      <Text
                        style={[
                          styles.subPeriod,
                          { color: isDarkMode ? '#71717a' : '#94a3b8' },
                        ]}
                      >
                        {item.period}
                      </Text>
                    </View>
                  </View>
                ))}

                {subscriptions.length === 0 && (
                  <View style={styles.emptyCard}>
                    <Text style={[styles.emptyCardText, { color: isDarkMode ? '#71717a' : '#94a3b8' }]}>
                      Nenhuma assinatura encontrada
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Section 3: Goals */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text
                  style={[
                    styles.sectionTitleText,
                    { color: isDarkMode ? '#f4f4f5' : '#111118' },
                  ]}
                >
                  Metas
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('Goals')
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>Ver todas</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.goalsHorizontalList}
              >
                {goals.map((goal) => {
                  const progressPct = Math.min(
                    100,
                    Math.max(0, (goal.currentAmount / (goal.targetAmount || 1)) * 100)
                  );
                  return (
                    <TouchableOpacity
                      key={goal.id}
                      style={[
                        styles.goalCard,
                        {
                          backgroundColor: isDarkMode ? '#1e1e26' : '#ffffff',
                          borderColor: isDarkMode ? '#27272a' : '#f1f5f9',
                        },
                      ]}
                      onPress={() =>
                        navigation.navigate('GoalDetail', {
                          goalId: goal.id,
                          title: goal.title,
                        })
                      }
                      activeOpacity={0.85}
                    >
                      <View style={styles.goalHeaderRow}>
                        <Text
                          style={[
                            styles.goalTitle,
                            { color: isDarkMode ? '#71717a' : '#94a3b8' },
                          ]}
                          numberOfLines={1}
                        >
                          {goal.title}
                        </Text>
                        <ChevronRight size={14} color={isDarkMode ? '#52525b' : '#cbd5e1'} />
                      </View>

                      <Text
                        style={[
                          styles.goalCurrentAmount,
                          { color: isDarkMode ? '#f4f4f5' : '#1c1c28' },
                        ]}
                      >
                        R$ {formatDashboardAmount(goal.currentAmount, showBalance)}
                      </Text>

                      {/* Progress bar */}
                      <View style={styles.goalProgressBarBg}>
                        <View
                          style={[styles.goalProgressBarFill, { width: `${progressPct}%` }]}
                        />
                      </View>

                      <Text
                        style={[
                          styles.goalTargetText,
                          { color: isDarkMode ? '#71717a' : '#94a3b8' },
                        ]}
                      >
                        META: R$ {formatDashboardAmount(goal.targetAmount, showBalance)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {goals.length === 0 && (
                  <View
                    style={[
                      styles.emptyGoalsContainer,
                      {
                        borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                        width: Math.max(0, screenWidth - 40),
                      },
                    ]}
                  >
                    <Text style={[styles.emptyCardText, { color: isDarkMode ? '#71717a' : '#94a3b8' }]}>
                      Nenhuma meta cadastrada
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Modals */}
      <UpcomingBillsModal
        isOpen={isUpcomingModalOpen}
        onClose={() => setIsUpcomingModalOpen(false)}
        upcomingSubs={upcomingSubs}
        upcomingCards={upcomingCards}
        onPay={handlePaySubscription}
        onPayCard={handlePayCardBill}
      />

      <PayCardBillModal
        isOpen={isPayCardModalOpen}
        onClose={() => {
          setIsPayCardModalOpen(false);
          setSelectedCardForPayment(null);
        }}
        card={selectedCardForPayment}
        onConfirm={handleConfirmPayCardBill}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  purpleBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
    backgroundColor: '#4F46E5',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    color: '#ffffff',
  },
  avatarBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  balanceCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  balanceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  eyeButton: {
    padding: 2,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    textTransform: 'capitalize',
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  splitStatsBox: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  statColBorder: {
    borderRightWidth: 1,
  },
  incomeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  upcomingBillsCard: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  warningAlertBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  upcomingBillsContent: {
    flex: 1,
  },
  upcomingBillsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  upcomingBillsTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  faturaBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  faturaBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6c5ce7',
  },
  upcomingBillsDetails: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  upcomingBillsChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 60,
    minHeight: 500,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  sectionContainer: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '800',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4f46e5',
  },
  itemsList: {
    gap: 10,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionTitle: {
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  trendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  transactionDate: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardTagBadge: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  cardTagBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6c5ce7',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 12,
    fontWeight: '900',
  },
  transactionCategory: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  subLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  subIcon: {
    width: 26,
    height: 26,
  },
  subName: {
    fontSize: 12,
    fontWeight: '800',
  },
  subNextDate: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  subRight: {
    alignItems: 'flex-end',
  },
  subAmount: {
    fontSize: 12,
    fontWeight: '900',
  },
  subPeriod: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
  goalsHorizontalList: {
    gap: 12,
    paddingRight: 10,
  },
  goalCard: {
    width: 170,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  goalCurrentAmount: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  goalProgressBarBg: {
    height: 4,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  goalProgressBarFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 2,
  },
  goalTargetText: {
    fontSize: 9,
    fontWeight: '800',
  },
  emptyGoalsContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
  },
});







