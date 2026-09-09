import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import { IntroAnimatedView } from '../components/common/IntroAnimatedView';
import { AnimatedProgressFill } from '../components/common/AnimatedProgressFill';
import { formatBrazilianDate, toApiDate } from '../utils/dateFormat';
import {
  AlertCircle,
  Bell,
  ChevronRight,
  CreditCard,
  Home,
  MoreHorizontal,
  Plane,
  Plus,
  Repeat2,
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
      return `${formatBrazilianDate(dateObj)}, ${hh}:${mm}`;
    } catch (e) {
      // fallback
    }
  }

  return formatBrazilianDate(item.date, 'Hoje');
};
const MASKED_AMOUNT = '\u2022\u2022\u2022\u2022\u2022\u2022';
const MASKED_CARD_DIGITS = '\u2022\u2022\u2022\u2022';
const formatDashboardAmount = (value: number, isVisible: boolean, options?: Intl.NumberFormatOptions) =>
  isVisible ? value.toLocaleString('pt-BR', options) : MASKED_AMOUNT;
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
  const { user, profile, checkLimit, triggerUpgrade, homeIntroPlayed, markHomeIntroPlayed } = useAuth();

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
  const [hasTransactionsSnapshot, setHasTransactionsSnapshot] = useState(false);
  const [hasSubscriptionsSnapshot, setHasSubscriptionsSnapshot] = useState(false);
  const [hasGoalsSnapshot, setHasGoalsSnapshot] = useState(false);
  const [hasCardsSnapshot, setHasCardsSnapshot] = useState(false);
  const [playHomeIntro, setPlayHomeIntro] = useState(false);
  const [homeIntroFallbackReady, setHomeIntroFallbackReady] = useState(false);

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
    setHasTransactionsSnapshot(false);
    setHasSubscriptionsSnapshot(false);
    setHasGoalsSnapshot(false);
    setHasCardsSnapshot(false);

    if (user) {
      const unsubTransactions = transactionService.subscribeToTransactions((items) => {
        setTransactions(items);
        setHasTransactionsSnapshot(true);
      });
      const unsubSubscriptions = subscriptionService.subscribeToSubscriptions((items) => {
        setSubscriptions(items);
        setHasSubscriptionsSnapshot(true);
      });
      const unsubGoals = goalService.subscribeToGoals((items) => {
        setGoals(items);
        setHasGoalsSnapshot(true);
      });
      const unsubCards = cardService.subscribeToCards((items) => {
        setCards(items);
        setHasCardsSnapshot(true);
      });
      return () => {
        unsubTransactions();
        unsubSubscriptions();
        unsubGoals();
        unsubCards();
      };
    }

    setTransactions([]);
    setSubscriptions([]);
    setGoals([]);
    setCards([]);
  }, [user]);

  // Receitas
  const totalIncome = transactions
    .filter((t) => t.type === 'income' && t.status !== 'pending')
    .reduce((acc, t) => acc + t.amount, 0);

  // Despesas da conta corrente (debito, pix, dinheiro, transferencias - sem cartao de credito)
  const accountExpenses = transactions
    .filter((t) => t.type === 'expense' && !t.isCardCharge && t.status !== 'pending')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  // Despesas no cartao de credito
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

  // Contas e faturas proximas ao vencimento
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

      const dateStr = toApiDate(now);

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
    const dateStr = toApiDate(now);
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Registrar transacao de pagamento da fatura saindo da conta corrente
    await transactionService.addTransaction({
      title:
        paymentType === 'total'
          ? `Pagamento Fatura: ${card.name} (${MASKED_CARD_DIGITS} ${card.finalDigits})`
          : `Pagamento Parcial Fatura: ${card.name} (${MASKED_CARD_DIGITS} ${card.finalDigits})`,
      amount: -paidAmount,
      date: dateStr,
      category: 'Cart\u00E3o de Cr\u00E9dito',
      type: 'expense',
      isCardCharge: false,
      status: 'paid',
      cardId: card.id,
      cardName: `${card.name} (${MASKED_CARD_DIGITS} ${card.finalDigits})`,
      installments: 1,
      currentInstallment: 1,
    });

    // 2. Se optou por parcelar o saldo restante com juros
    if (isInstallmentRest && installmentCount && installmentValue && installmentValue > 0) {
      for (let i = 1; i <= installmentCount; i++) {
        const installmentDate = new Date();
        installmentDate.setMonth(installmentDate.getMonth() + i);
        const instDateStr = toApiDate(installmentDate);

        await transactionService.addTransaction({
          title: `Parcelamento Fatura: ${card.name} (${i}/${installmentCount})`,
          amount: -installmentValue,
          date: instDateStr,
          category: 'Cart\u00E3o de Cr\u00E9dito',
          type: 'expense',
          isCardCharge: true,
          status: 'paid',
          cardId: card.id,
          cardName: `${card.name} (${MASKED_CARD_DIGITS} ${card.finalDigits})`,
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

  const isDashboardDataReady = hasTransactionsSnapshot && hasSubscriptionsSnapshot && hasGoalsSnapshot && hasCardsSnapshot;
  const canStartHomeIntro = isDashboardDataReady || homeIntroFallbackReady;

  useEffect(() => {
    if (!canStartHomeIntro || homeIntroPlayed || playHomeIntro) return;

    setPlayHomeIntro(true);
    markHomeIntroPlayed();
  }, [canStartHomeIntro, homeIntroPlayed, markHomeIntroPlayed, playHomeIntro]);

  useEffect(() => {
    if (homeIntroPlayed) return undefined;
    setHomeIntroFallbackReady(false);
    const timer = setTimeout(() => setHomeIntroFallbackReady(true), 1800);
    return () => clearTimeout(timer);
  }, [homeIntroPlayed, user?.uid]);

  useEffect(() => {
    if (!playHomeIntro) return undefined;

    const timeout = setTimeout(() => {
      setPlayHomeIntro(false);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [playHomeIntro]);

  const monthYearLabel = new Date().toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  const displayName = profile?.displayName || user?.displayName || '';

  const firstName = (displayName || user?.email?.split('@')[0] || 'John').trim().split(/\s+/)[0];
  const latestTransactions = [...transactions]
    .filter((t) => t.status !== 'pending')
    .sort((a, b) => {
      const msA = getTransactionTimestamp(a);
      const msB = getTransactionTimestamp(b);
      if (msB !== msA) return msB - msA;
      return (b.date || '').localeCompare(a.date || '');
    })
    .slice(0, 3);
  const visibleGoals = goals.slice(0, 2);
  const goalCardWidth = Math.max(150, Math.floor((screenWidth - 56) / 2));
  const shouldHoldHomeIntro = !homeIntroPlayed && !playHomeIntro;

  const openUpcomingBills = () => {
    if (!alertAccess.allowed) {
      triggerUpgrade?.('alert', alertAccess.reason);
      return;
    }
    setIsUpcomingModalOpen(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#121214' : '#FFFFFF' }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#121214' : '#FFFFFF'} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 60 }]}
          showsVerticalScrollIndicator={false}
        >
          <IntroAnimatedView play={playHomeIntro} holdInitialState={shouldHoldHomeIntro} duration={320} translateY={-8}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.homeTitle, { color: isDarkMode ? '#F8FAFC' : '#0A102B' }]} numberOfLines={1} adjustsFontSizeToFit>
                {'Ol\u00E1, '}{firstName}! {'\uD83D\uDC4B'}
              </Text>
              <Text style={[styles.homeSubtitle, { color: isDarkMode ? '#A1A1AA' : '#687292' }]} numberOfLines={1}>
                Que bom te ver de novo!
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity style={[styles.bellButton, { backgroundColor: isDarkMode ? '#1E1E26' : '#F3F5FA' }]} onPress={handleOpenNotifications} activeOpacity={0.82}>
                <Bell size={22} color={isDarkMode ? '#E5E7EB' : '#545D78'} />
                {notificationBadgeCount > 0 && (
                  <View style={styles.notificationDot}>
                    <Text style={styles.notificationBadgeText} numberOfLines={1}>
                      {notificationBadgeCount > 9 ? '9+' : getNotificationBadgeLabel(notificationBadgeCount)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })} activeOpacity={0.82}>
                <Image
                  source={{
                    uri:
                      profile?.photoURL ||
                      user?.photoURL ||
                      'https://api.dicebear.com/7.x/initials/png?seed=' +
                        (profile?.displayName || user?.displayName || user?.email || 'User'),
                  }}
                  style={styles.avatarImage}
                />
              </TouchableOpacity>
            </View>
          </View>
          </IntroAnimatedView>

          <IntroAnimatedView play={playHomeIntro} holdInitialState={shouldHoldHomeIntro} delay={100} duration={430} translateY={15} scaleFrom={0.96}>
          <BalanceSummaryCard
            period={monthYearLabel}
            balance={balance}
            income={totalIncome}
            expense={totalExpense}
            isBalanceVisible={showBalance}
            isDarkMode={isDarkMode}
            onToggleBalance={() => setShowBalance((visible) => !visible)}
            shouldAnimateAmounts={playHomeIntro}
          />
          </IntroAnimatedView>

          <View style={styles.quickActionsRow}>
            <IntroAnimatedView play={playHomeIntro} holdInitialState={shouldHoldHomeIntro} delay={300} duration={360} translateY={12} style={styles.quickActionAnimatedSlot}>
            <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: isDarkMode ? '#1E1E26' : '#F7F7FF' }]} onPress={() => navigation.navigate('AddTransactionModal')} activeOpacity={0.86}>
              <View style={styles.quickActionIconCircle}><Plus size={25} color="#FFFFFF" strokeWidth={2.6} /></View>
              <Text style={[styles.quickActionLabel, { color: isDarkMode ? '#D4D4D8' : '#687292' }]}>Adicionar</Text>
            </TouchableOpacity>
            </IntroAnimatedView>
            <IntroAnimatedView play={playHomeIntro} holdInitialState={shouldHoldHomeIntro} delay={350} duration={360} translateY={12} style={styles.quickActionAnimatedSlot}>
            <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: isDarkMode ? '#1E1E26' : '#F7F7FF' }]} onPress={() => navigation.navigate('MainTabs', { screen: 'Statement' })} activeOpacity={0.86}>
              <Repeat2 size={28} color="#5748FF" strokeWidth={2.4} />
              <Text style={[styles.quickActionLabel, { color: isDarkMode ? '#D4D4D8' : '#687292' }]}>Transferir</Text>
            </TouchableOpacity>
            </IntroAnimatedView>
            <IntroAnimatedView play={playHomeIntro} holdInitialState={shouldHoldHomeIntro} delay={400} duration={360} translateY={12} style={styles.quickActionAnimatedSlot}>
            <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: isDarkMode ? '#1E1E26' : '#F7F7FF' }]} onPress={openUpcomingBills} activeOpacity={0.86}>
              <CreditCard size={27} color="#5748FF" strokeWidth={2.2} />
              <Text style={[styles.quickActionLabel, { color: isDarkMode ? '#D4D4D8' : '#687292' }]}>Pagar</Text>
            </TouchableOpacity>
            </IntroAnimatedView>
            <IntroAnimatedView play={playHomeIntro} holdInitialState={shouldHoldHomeIntro} delay={450} duration={360} translateY={12} style={styles.quickActionAnimatedSlot}>
            <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: isDarkMode ? '#1E1E26' : '#F7F7FF' }]} onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })} activeOpacity={0.86}>
              <MoreHorizontal size={30} color="#5748FF" strokeWidth={2.6} />
              <Text style={[styles.quickActionLabel, { color: isDarkMode ? '#D4D4D8' : '#687292' }]}>Mais</Text>
            </TouchableOpacity>
            </IntroAnimatedView>
          </View>

          {totalUpcomingCount > 0 && (
            <IntroAnimatedView play={playHomeIntro} holdInitialState={shouldHoldHomeIntro} delay={500} duration={380} translateY={12}>
            <TouchableOpacity style={styles.upcomingBillsCard} onPress={openUpcomingBills} activeOpacity={0.9}>
              <View style={styles.warningOuter}><View style={styles.warningAlertBadge}><AlertCircle size={26} color="#E11919" fill="#E11919" strokeWidth={2.6} /></View></View>
              <View style={styles.upcomingBillsContent}>
                <Text style={styles.upcomingBillsTitle} numberOfLines={1}>
                  {totalUpcomingCount} {totalUpcomingCount === 1 ? 'conta a pagar' : 'contas a pagar'}
                </Text>
                <Text style={styles.upcomingBillsDetails} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  R$ {showBalance ? totalUpcomingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : MASKED_AMOUNT}
                  {latestDueDate ? ` | Vencimento: ${formatBrazilianDate(latestDueDate)}` : ''}
                </Text>
              </View>
              <ChevronRight size={28} color={isDarkMode ? '#E5E7EB' : '#0A102B'} strokeWidth={2.6} />
            </TouchableOpacity>
            </IntroAnimatedView>
          )}

          <IntroAnimatedView play={playHomeIntro} holdInitialState={shouldHoldHomeIntro} delay={540} duration={400} translateY={12}>
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitleText, { color: isDarkMode ? '#F4F4F5' : '#0A102B' }]}>{'\u00DAltimas transa\u00E7\u00F5es'}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Statement' })} activeOpacity={0.75}>
                <Text style={styles.seeAllText}>Ver todas</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.transactionsGroupCard, { backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF', borderColor: isDarkMode ? '#2A2A32' : '#E8ECF4' }]}>
              {latestTransactions.map((item, index) => {
                const isIncome = item.type === 'income';
                return (
                  <View key={item.id} style={[styles.transactionRow, index < latestTransactions.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#2A2A32' : '#EEF1F6' }]}>
                    <View style={styles.transactionLeft}>
                      <TransactionIcon transaction={item} subscriptions={subscriptions} />
                      <View style={styles.transactionInfo}>
                        <Text style={[styles.transactionTitle, { color: isDarkMode ? '#F4F4F5' : '#0A102B' }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.transactionDate} numberOfLines={1}>{formatTransactionDateTime(item)}</Text>
                      </View>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={[styles.transactionAmount, { color: isIncome ? '#0FBF64' : '#E11919' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76}>
                        {isIncome ? '+ ' : '- '}R$ {formatDashboardAmount(Math.abs(item.amount), showBalance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.transactionCategory} numberOfLines={1}>{item.category}</Text>
                    </View>
                  </View>
                );
              })}

              {latestTransactions.length === 0 && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>{'Nenhuma transa\u00E7\u00E3o encontrada'}</Text>
                </View>
              )}
            </View>
          </View>
          </IntroAnimatedView>

          <IntroAnimatedView play={playHomeIntro} holdInitialState={shouldHoldHomeIntro} delay={620} duration={400} translateY={12}>
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitleText, { color: isDarkMode ? '#F4F4F5' : '#0A102B' }]}>Metas</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Goals')} activeOpacity={0.75}>
                <Text style={styles.seeAllText}>Ver todas</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.goalsRow}>
              {visibleGoals.map((goal, index) => {
                const progressPct = Math.min(100, Math.max(0, (goal.currentAmount / (goal.targetAmount || 1)) * 100));
                const GoalIcon = index % 2 === 0 ? Plane : Home;
                const tone = index % 2 === 0 ? '#377DFF' : '#E11919';
                const toneBg = index % 2 === 0 ? '#EEF3FF' : '#FFE9EA';
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles.goalCard, { width: goalCardWidth, backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF', borderColor: isDarkMode ? '#2A2A32' : '#E8ECF4' }]}
                    onPress={() => navigation.navigate('GoalDetail', { goalId: goal.id, title: goal.title })}
                    activeOpacity={0.86}
                  >
                    <View style={[styles.goalIconBox, { backgroundColor: toneBg }]}>
                      <GoalIcon size={24} color={tone} strokeWidth={2.5} />
                    </View>
                    <View style={styles.goalTextBlock}>
                      <Text style={[styles.goalTitle, { color: isDarkMode ? '#F4F4F5' : '#0A102B' }]} numberOfLines={1}>{goal.title}</Text>
                      <Text style={[styles.goalCurrentAmount, { color: isDarkMode ? '#F4F4F5' : '#0A102B' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76}>
                        R$ {formatDashboardAmount(goal.currentAmount, showBalance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.goalProgressText}>{Math.round(progressPct)}% completo</Text>
                      <View style={styles.goalProgressBarBg}>
                        <AnimatedProgressFill progress={progressPct} shouldAnimate={playHomeIntro} style={styles.goalProgressBarFill} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {visibleGoals.length === 0 && (
                <View style={[styles.emptyGoalsContainer, { borderColor: isDarkMode ? '#2A2A32' : '#E8ECF4', width: Math.max(0, screenWidth - 44) }]}>
                  <Text style={styles.emptyCardText}>Nenhuma meta cadastrada</Text>
                </View>
              )}
            </View>
          </View>
          </IntroAnimatedView>
        </ScrollView>
      </SafeAreaView>

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
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  homeTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Inter-Bold',
  },
  homeSubtitle: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Inter-Regular',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bellButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 11,
    right: 10,
    minWidth: 10,
    height: 10,
    borderRadius: 5,
    paddingHorizontal: 2,
    backgroundColor: '#E11919',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 7,
    lineHeight: 8,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8ECF4',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  quickActionAnimatedSlot: {
    flex: 1,
  },
  quickActionCard: {
    flex: 1,
    height: 76,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  quickActionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5748FF',
  },
  quickActionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Inter-Regular',
  },
  upcomingBillsCard: {
    marginHorizontal: 22,
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#FFF0F0',
    marginBottom: 22,
  },
  warningOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD8DD',
    marginRight: 12,
  },
  warningAlertBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingBillsContent: {
    flex: 1,
    minWidth: 0,
  },
  upcomingBillsTitle: {
    color: '#0A102B',
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Inter-Bold',
    marginBottom: 3,
  },
  upcomingBillsDetails: {
    color: '#687292',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  sectionContainer: {
    marginBottom: 22,
    paddingHorizontal: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 20,
    lineHeight: 25,
    fontFamily: 'Inter-Bold',
  },
  seeAllText: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Inter-Bold',
    color: '#5748FF',
  },
  transactionsGroupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  transactionRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  transactionLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Inter-Bold',
  },
  transactionDate: {
    color: '#687292',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    maxWidth: '43%',
  },
  transactionAmount: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Inter-Bold',
  },
  transactionCategory: {
    color: '#687292',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
    textAlign: 'right',
  },
  emptyCard: {
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    color: '#687292',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  goalsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  goalCard: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  goalIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  goalTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Inter-Regular',
  },
  goalCurrentAmount: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 2,
  },
  goalProgressText: {
    color: '#687292',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Inter-Regular',
    marginTop: 1,
  },
  goalProgressBarBg: {
    height: 6,
    backgroundColor: '#E7EAF0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  goalProgressBarFill: {
    height: '100%',
    backgroundColor: '#5748FF',
    borderRadius: 3,
  },
  emptyGoalsContainer: {
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
});
