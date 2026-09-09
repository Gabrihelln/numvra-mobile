import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Plus,
  Trash2,
  Search,
  X,
  Calendar as CalendarIcon,
  Check,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Lightbulb,
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { transactionService, getTransactionTimestamp } from '../services/transactionService';
import { subscriptionService } from '../services/subscriptionService';
import { goalService } from '../services/goalService';
import { Transaction, Subscription, Goal } from '../types';
import { TransactionIcon } from '../components/common/TransactionIcon';
import { RemoteIcon } from '../components/common/RemoteIcon';
import { BackButton } from '../components/common/BackButton';
import { CalendarPicker, ModalBottomSheet } from '../components/common';
import { getCategoryVisual } from '../constants/iconRegistry';
import { useBudgets } from '../hooks/useBudgets';
import { RootStackParamList } from '../navigation/types';
import {
  formatBrazilianDate,
  formatStatementGroupDate,
  formatStatementMonthLabel,
  getDatePartsWithoutTimezoneShift,
} from '../utils/dateFormat';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type StatementSection = 'transactions' | 'subscriptions' | 'goals';
type TransactionFilter = 'all' | 'income' | 'expense' | 'transfer';
type SubscriptionStatusFilter = 'active' | 'canceled';

const transactionFilters: { key: TransactionFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'income', label: 'Receitas' },
  { key: 'expense', label: 'Despesas' },
  { key: 'transfer', label: 'Transferências' },
];

const STATEMENT_TYPE = {
  caption: 11,
  small: 12,
  secondary: 13,
  body: 14,
  medium: 15,
  sectionTitle: 18,
  screenTitle: 28,
};
const PRIMARY = '#5748FF';
const INCOME = '#10B981';
const EXPENSE = '#EF123A';
const getPagePadding = (width: number) => width < 360 ? 16 : width < 400 ? 18 : 22;
const formatCurrency = (value: number) => `R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const isTransferTransaction = (transaction: Transaction) => {
  const tx = transaction as Transaction & { transferId?: string; transferGroupId?: string; transferType?: string };
  return (tx.type as string) === 'transfer' || tx.paymentMethod === 'transfer' || !!tx.transferId || !!tx.transferGroupId || tx.transferType === 'transfer';
};
const getTransactionDateKey = (value?: string | Date | null) => {
  const parts = getDatePartsWithoutTimezoneShift(value);
  if (!parts) return '';
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};
const isSameStatementMonth = (value: string, month: Date) => {
  const parts = getDatePartsWithoutTimezoneShift(value);
  return !!parts && parts.month === month.getMonth() + 1 && parts.year === month.getFullYear();
};
const getTransactionTimeLabel = (transaction: Transaction) => {
  const raw = transaction.date || '';
  const timeMatch = raw.match(/(?:T|\s)(\d{2}):(\d{2})/);
  if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;
  const ms = getTransactionTimestamp(transaction);
  if (!ms) return '';
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const normalizeSearch = (value?: string | null) => (value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .trim();

const transactionMatchesFilter = (transaction: Transaction, filter: TransactionFilter) => {
  if (filter === 'all') return true;
  if (filter === 'income') return transaction.type === 'income';
  if (filter === 'expense') return transaction.type === 'expense' && !isTransferTransaction(transaction);
  if (filter === 'transfer') return isTransferTransaction(transaction);
  return true;
};

const getSubscriptionStatus = (subscription: Subscription): SubscriptionStatusFilter =>
  subscription.status === 'canceled' ? 'canceled' : 'active';

const getSubscriptionCycleLabel = (subscription: Subscription) => subscription.period || 'Mensal';

const getMonthlyEquivalent = (subscription: Subscription) => {
  const amount = Number(subscription.amount) || 0;
  const period = getSubscriptionCycleLabel(subscription);
  if (period === 'Anual') return amount / 12;
  if (period === 'Semestral') return amount / 6;
  if (period === 'Trimestral') return amount / 3;
  return amount;
};

const getAnnualEquivalent = (subscription: Subscription) => getMonthlyEquivalent(subscription) * 12;

const transactionMatchesSearch = (transaction: Transaction, query: string) => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;

  const fields = [
    transaction.title,
    transaction.description,
    transaction.category,
    transaction.cardName,
    transaction.paymentMethod,
    (transaction as Transaction & { merchant?: string; establishment?: string }).merchant,
    (transaction as Transaction & { merchant?: string; establishment?: string }).establishment,
  ];

  return fields.some((field) => normalizeSearch(field).includes(normalizedQuery));
};

const formatAmountInput = (raw: string) => {
  const cleanNumbers = raw.replace(/\D/g, '');
  if (!cleanNumbers) return '0,00';

  return (parseFloat(cleanNumbers) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getAmountFromRaw = (raw: string) => {
  const cleanNumbers = raw.replace(/\D/g, '');
  if (!cleanNumbers) return 0;
  return parseFloat(cleanNumbers) / 100;
};

const getSubscriptionDate = (value?: string) => {
  if (!value) return new Date();

  const apiMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (apiMatch) {
    return new Date(Number(apiMatch[1]), Number(apiMatch[2]) - 1, Number(apiMatch[3]));
  }

  const brazilianMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brazilianMatch) {
    return new Date(Number(brazilianMatch[3]), Number(brazilianMatch[2]) - 1, Number(brazilianMatch[1]));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

interface StatementScreenProps {
  section?: StatementSection;
}

export const StatementScreen: React.FC<StatementScreenProps> = ({ section = 'transactions' }) => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user, checkLimit, triggerUpgrade } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { budgetCategories } = useBudgets();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [isStatementMonthPickerOpen, setIsStatementMonthPickerOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editSubscriptionAmountRaw, setEditSubscriptionAmountRaw] = useState('');
  const [editSubscriptionDate, setEditSubscriptionDate] = useState(new Date());
  const [isEditSubscriptionCalendarOpen, setIsEditSubscriptionCalendarOpen] = useState(false);
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<SubscriptionStatusFilter>('active');

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubTx = transactionService.subscribeToTransactions((data) => {
      setTransactions(data);
      setLoading(false);
    });

    const unsubSub = subscriptionService.subscribeToSubscriptions((data) => {
      setSubscriptions(data);
    });

    const unsubGoals = goalService.subscribeToGoals((data) => {
      setGoals(data);
    });

    return () => {
      unsubTx();
      unsubSub();
      unsubGoals();
    };
  }, [user]);

  const handleDeleteTransaction = (tx: Transaction) => {
    Alert.alert(
      'Confirmar exclusão',
      `Deseja realmente excluir "${tx.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionService.deleteTransaction(tx.id, {
                cardId: tx.cardId,
                amount: tx.amount,
                isCardCharge: tx.isCardCharge,
              });
            } catch (err) {
              console.error('Error deleting transaction:', err);
            }
          },
        },
      ]
    );
  };

  const handleDeleteSubscription = (sub: Subscription) => {
    Alert.alert(
      'Confirmar exclusão',
      `Deseja realmente excluir "${sub.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await subscriptionService.deleteSubscription(sub.id);
            } catch (err) {
              console.error('Error deleting subscription:', err);
            }
          },
        },
      ]
    );
  };

  const handleCreateSubscription = () => {
    const check = checkLimit('subscription');
    if (!check.allowed && triggerUpgrade) {
      triggerUpgrade('subscription', check.reason);
      return;
    }
    navigation.navigate('AddSubscriptionModal');
  };

  const handleEditSubscription = (sub: Subscription) => {
    setEditingSubscription(sub);
    setEditSubscriptionAmountRaw(String(Math.round((sub.amount || 0) * 100)));
    setEditSubscriptionDate(getSubscriptionDate(sub.nextBilling || sub.renewalDate));
  };

  const handleCloseEditSubscription = () => {
    if (isSavingSubscription) return;
    setEditingSubscription(null);
    setIsEditSubscriptionCalendarOpen(false);
  };

  const handleSaveEditedSubscription = async () => {
    if (!editingSubscription) return;

    const amount = getAmountFromRaw(editSubscriptionAmountRaw);
    if (amount <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero para a assinatura.');
      return;
    }

    setIsSavingSubscription(true);
    try {
      const nextBilling = format(editSubscriptionDate, 'yyyy-MM-dd');
      await subscriptionService.updateSubscription(editingSubscription.id, {
        amount,
        nextBilling,
        renewalDate: nextBilling,
      });
      setEditingSubscription(null);
      setIsEditSubscriptionCalendarOpen(false);
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err?.message || 'Não foi possível atualizar a assinatura.');
    } finally {
      setIsSavingSubscription(false);
    }
  };

  const handleCreateGoal = () => {
    const check = checkLimit('goal');
    if (!check.allowed && triggerUpgrade) {
      triggerUpgrade('goal', check.reason);
      return;
    }
    navigation.navigate('AddGoalModal');
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert(
      'Confirmar exclusão',
      `Deseja realmente excluir "${goal.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await goalService.deleteGoal(goal.id);
            } catch (err) {
              console.error('Error deleting goal:', err);
            }
          },
        },
      ]
    );
  };

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => getSubscriptionStatus(subscription) === 'active'),
    [subscriptions]
  );

  const canceledSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => getSubscriptionStatus(subscription) === 'canceled'),
    [subscriptions]
  );

  const visibleSubscriptions = subscriptionStatusFilter === 'active' ? activeSubscriptions : canceledSubscriptions;

  const { totalMonthlySubs, totalYearlySubs } = useMemo(
    () => activeSubscriptions.reduce(
      (totals, subscription) => ({
        totalMonthlySubs: totals.totalMonthlySubs + getMonthlyEquivalent(subscription),
        totalYearlySubs: totals.totalYearlySubs + getAnnualEquivalent(subscription),
      }),
      { totalMonthlySubs: 0, totalYearlySubs: 0 }
    ),
    [activeSubscriptions]
  );

  const categoriesByName = useMemo(
    () => new Map(budgetCategories.map((category) => [category.name?.trim().toLowerCase(), category])),
    [budgetCategories],
  );

  // Group transactions
  const sortedTransactions = useMemo(
    () =>
      [...transactions]
        .filter((t) => t.status !== 'pending')
        .sort((a, b) => {
          const msA = getTransactionTimestamp(a);
          const msB = getTransactionTimestamp(b);
          if (msB !== msA) return msB - msA;
          return (b.date || '').localeCompare(a.date || '');
        }),
    [transactions]
  );

  const visibleTransactions = useMemo(
    () => sortedTransactions.filter((transaction) =>
      transactionMatchesFilter(transaction, transactionFilter) &&
      transactionMatchesSearch(transaction, transactionSearch) &&
      isSameStatementMonth(transaction.date, selectedMonth)
    ),
    [sortedTransactions, transactionFilter, transactionSearch, selectedMonth]
  );

  const transactionGroups = useMemo(() => {
    const grouped = new Map<string, { date: string; total: number; data: Transaction[] }>();
    visibleTransactions.forEach((transaction) => {
      const key = getTransactionDateKey(transaction.date);
      if (!key) return;
      const current = grouped.get(key) || { date: transaction.date, total: 0, data: [] };
      current.total += transaction.type === 'income' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount);
      current.data.push(transaction);
      grouped.set(key, current);
    });
    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, group]) => ({ ...group, data: group.data.sort((a, b) => getTransactionTimestamp(b) - getTransactionTimestamp(a)) }));
  }, [visibleTransactions]);

  const statementPagePadding = getPagePadding(screenWidth);
  const compactStatement = screenWidth < 360;

  const cycleTransactionFilter = () => {
    const currentIndex = transactionFilters.findIndex((filter) => filter.key === transactionFilter);
    const next = transactionFilters[(currentIndex + 1) % transactionFilters.length];
    setTransactionFilter(next.key);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#121214' : '#FAF9FF' },
      ]}
    >
      {/* Top Title */}
      {section === 'transactions' ? (
        <View style={[styles.statementHeader, { paddingTop: Math.max(insets.top, 16) + 12, paddingHorizontal: statementPagePadding }]}>
          <View style={styles.statementHeaderRow}>
            <View style={styles.statementTitleWrap}>
              <Text style={[styles.statementTitle, { color: colors.text }]} maxFontSizeMultiplier={1.15}>Extrato</Text>
              <Text style={[styles.statementSubtitle, { color: colors.textSecondary }]} maxFontSizeMultiplier={1.2}>Acompanhe todas as suas movimentações.</Text>
            </View>
            <TouchableOpacity onPress={() => setIsStatementMonthPickerOpen(true)} style={[styles.monthSelector, compactStatement && styles.monthSelectorCompact]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Selecionar mês do extrato">
              <CalendarIcon size={compactStatement ? 19 : 21} color={PRIMARY} />
              <Text style={styles.monthSelectorText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.88}>{formatStatementMonthLabel(selectedMonth)}</Text>
              <ChevronDown size={19} color="#6F7894" />
            </TouchableOpacity>
          </View>
        </View>
      ) : section === 'subscriptions' ? (
        <View style={[styles.subscriptionsHeader, { paddingTop: Math.max(insets.top, 16) + 12, paddingHorizontal: statementPagePadding }]}>
          <View style={styles.subscriptionsHeaderRow}>
            <BackButton onPress={() => navigation.goBack()} />
            <TouchableOpacity onPress={handleCreateSubscription} style={styles.subscriptionsAddTopButton} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Criar nova assinatura">
              <Plus size={25} color={PRIMARY} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
          <View style={styles.subscriptionsTitleBlock}>
            <Text style={[styles.subscriptionsTitle, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.84}>Assinaturas</Text>
            <Text style={[styles.subscriptionsSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>Gerencie suas assinaturas recorrentes.</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
          <View style={styles.headerBackButton}><BackButton onPress={() => navigation.goBack()} /></View>
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#F8FAFC' : '#1C1C28' }]}>Metas</Text>
          <TouchableOpacity onPress={handleCreateGoal} style={[styles.headerActionButton, { backgroundColor: colors.primary }]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Criar nova meta">
            <Plus size={20} color="#ffffff" strokeWidth={3} />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <ScrollView
        contentContainerStyle={[
          section === 'transactions' ? styles.statementScrollContent : styles.scrollContent,
          section === 'transactions' && { paddingBottom: Math.max(insets.bottom, 12) + 108 },
          section === 'subscriptions' && { paddingBottom: Math.max(insets.bottom, 12) + 118, paddingHorizontal: statementPagePadding, paddingTop: 0 },
          section === 'goals' && { paddingBottom: Math.max(insets.bottom, 12) + 118 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C5CE7" />
          </View>
        ) : section === 'transactions' ? (
          <View style={[styles.statementContent, { paddingHorizontal: statementPagePadding }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFiltersRow}>
              {transactionFilters.map((filter) => {
                const selected = transactionFilter === filter.key;
                return (
                  <TouchableOpacity key={filter.key} onPress={() => setTransactionFilter(filter.key)} style={[styles.typeFilterChip, selected && styles.typeFilterChipActive]} activeOpacity={0.85}>
                    <Text style={[styles.typeFilterText, selected && styles.typeFilterTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.88}>{filter.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.searchFilterRow}>
              <View style={styles.statementSearchBar}>
                <Search size={22} color="#6F7894" />
                <TextInput value={transactionSearch} onChangeText={setTransactionSearch} placeholder="Buscar transações..." placeholderTextColor="#8A93AC" style={styles.statementSearchInput} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Buscar transações" />
                {!!transactionSearch && <TouchableOpacity onPress={() => setTransactionSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><X size={16} color="#8A93AC" /></TouchableOpacity>}
              </View>
              <TouchableOpacity style={styles.advancedFilterButton} onPress={cycleTransactionFilter} activeOpacity={0.85}>
                <SlidersHorizontal size={22} color="#596174" />
                <Text style={styles.advancedFilterText}>Filtros</Text>
              </TouchableOpacity>
            </View>
            {transactionGroups.length === 0 ? (
              <View style={styles.statementEmptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>{transactionSearch || transactionFilter !== 'all' ? 'Nenhuma transação encontrada' : 'Nenhuma movimentação encontrada'}</Text>
                <Text style={[styles.statementEmptySubtext, { color: colors.textSecondary }]}>{transactionSearch || transactionFilter !== 'all' ? 'Tente alterar sua busca ou seus filtros.' : 'Suas receitas e despesas aparecerão aqui.'}</Text>
              </View>
            ) : transactionGroups.map((group) => {
              const dayPositive = group.total >= 0;
              return (
                <View key={getTransactionDateKey(group.date)} style={styles.dayGroup}>
                  <View style={styles.dayHeader}>
                    <Text style={[styles.dayTitle, { color: colors.text }]} numberOfLines={1}>{formatStatementGroupDate(group.date)}</Text>
                    <Text style={[styles.dayTotal, { color: group.total === 0 ? colors.textSecondary : dayPositive ? INCOME : EXPENSE }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>{dayPositive ? '' : '- '}{formatCurrency(group.total)}</Text>
                  </View>
                  <View style={styles.dayTransactionsList}>
                    {group.data.map((item) => {
                      const category = item.type === 'income' ? 'Receita' : item.category;
                      const positive = item.type === 'income';
                      const categoryVisual = positive ? { color: INCOME, backgroundColor: '#E7F8EF' } : { color: '#E43A57', backgroundColor: '#FDE7EC' };
                      return (
                        <TouchableOpacity key={item.id} style={[styles.statementTxCard, { backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF', borderColor: isDarkMode ? '#2D2D3A' : '#E9ECF5' }]} activeOpacity={0.85} onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })} onLongPress={() => handleDeleteTransaction(item)}>
                          <View style={styles.statementTxLeft}>
                            <TransactionIcon transaction={item} icon={item.icon || categoriesByName.get(item.category?.trim().toLowerCase())?.icon || 'tag'} category={item.category} categoryColor={item.categoryColor || categoriesByName.get(item.category?.trim().toLowerCase())?.color} type={item.type} />
                            <View style={styles.statementTxInfo}>
                              <Text style={[styles.statementTxTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                              <Text style={[styles.statementTxDescription, { color: colors.textSecondary }]} numberOfLines={1}>{item.description || item.cardName || item.category}</Text>
                              <Text style={[styles.statementTxTime, { color: colors.textSecondary }]} numberOfLines={1}>{getTransactionTimeLabel(item)}</Text>
                            </View>
                          </View>
                          <View style={styles.statementTxRight}>
                            <View style={styles.statementTxRightContent}>
                              <Text style={[styles.statementTxAmount, { color: positive ? INCOME : EXPENSE }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{positive ? '+ ' : '- '}{formatCurrency(item.amount)}</Text>
                              <View style={[styles.categoryBadge, { backgroundColor: categoryVisual.backgroundColor }]}><Text style={[styles.categoryBadgeText, { color: categoryVisual.color }]} numberOfLines={1}>{category}</Text></View>
                            </View>
                            <ChevronRight size={20} color="#6F7894" />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        ) : section === 'subscriptions' ? (
          <View style={styles.subscriptionsContent}>
            <View style={styles.subscriptionTabs}>
              {(['active', 'canceled'] as SubscriptionStatusFilter[]).map((tab) => {
                const selected = subscriptionStatusFilter === tab;
                return (
                  <TouchableOpacity key={tab} onPress={() => setSubscriptionStatusFilter(tab)} style={styles.subscriptionTabButton} activeOpacity={0.82}>
                    <Text style={[styles.subscriptionTabText, selected && styles.subscriptionTabTextActive]}>{tab === 'active' ? 'Ativas' : 'Canceladas'}</Text>
                    <View style={[styles.subscriptionTabLine, selected && styles.subscriptionTabLineActive]} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.subsSummaryCard}>
              <View style={styles.subsSummaryIconBox}>
                <BarChart3 size={31} color={PRIMARY} strokeWidth={2.5} />
              </View>
              <View style={styles.subsSummaryCopy}>
                <Text style={styles.subsSummaryLabel}>Seu gasto mensal de assinaturas</Text>
                <Text style={styles.subsSummaryTotal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{formatCurrency(totalMonthlySubs)}</Text>
                <Text style={styles.subsSummaryYearly} numberOfLines={1}>Valor anual: <Text style={styles.subsSummaryYearlyStrong}>{formatCurrency(totalYearlySubs)}</Text></Text>
              </View>
              <View style={styles.subsSummaryNeutralBadge}>
                <Text style={styles.subsSummaryNeutralText}>Sem histórico</Text>
                <Text style={styles.subsSummaryNeutralSubtext}>mês anterior</Text>
              </View>
            </View>

            <TouchableOpacity onPress={handleCreateSubscription} style={styles.addSubscriptionButton} activeOpacity={0.86} accessibilityRole="button" accessibilityLabel="Adicionar assinatura">
              <Plus size={31} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.addSubscriptionButtonText}>Adicionar Assinatura</Text>
            </TouchableOpacity>

            {visibleSubscriptions.length === 0 ? (
              <View style={styles.subscriptionsEmptyCard}>
                <Text style={styles.subscriptionsEmptyTitle}>{subscriptionStatusFilter === 'active' ? 'Nenhuma assinatura ativa' : 'Nenhuma assinatura cancelada.'}</Text>
                {subscriptionStatusFilter === 'active' && <Text style={styles.subscriptionsEmptySubtitle}>Adicione suas assinaturas para acompanhar seus gastos recorrentes.</Text>}
                {subscriptionStatusFilter === 'active' && (
                  <TouchableOpacity onPress={handleCreateSubscription} style={styles.subscriptionsEmptyButton} activeOpacity={0.82}>
                    <Text style={styles.subscriptionsEmptyButtonText}>Adicionar assinatura</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : visibleSubscriptions.map((sub) => {
              const visual = getCategoryVisual(sub.icon, sub.color, isDarkMode);
              const FallbackIcon = visual.Icon;
              const nextBilling = formatBrazilianDate(sub.nextBilling || sub.renewalDate, '--/--/----');
              return (
                <TouchableOpacity
                  key={sub.id}
                  style={[styles.subscriptionListCard, { backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF', borderColor: isDarkMode ? '#2D2D3A' : '#E8EBF4' }]}
                  onPress={() => handleEditSubscription(sub)}
                  onLongPress={() => handleDeleteSubscription(sub)}
                  activeOpacity={0.86}
                >
                  <View style={[styles.subscriptionLogoBox, { backgroundColor: visual.backgroundColor }]}>
                    <RemoteIcon uri={sub.iconUrl || sub.icon} size={38} fallback={<FallbackIcon size={27} color={visual.color} />} />
                  </View>
                  <View style={styles.subscriptionCardCopy}>
                    <Text style={[styles.subscriptionCardName, { color: colors.text }]} numberOfLines={1}>{sub.name}</Text>
                    <View style={styles.subscriptionAmountRow}>
                      <Text style={[styles.subscriptionCardAmount, { color: colors.text }]} numberOfLines={1}>{formatCurrency(sub.amount)}</Text>
                      <Text style={styles.subscriptionCardPeriod} numberOfLines={1}>/ {getSubscriptionCycleLabel(sub)}</Text>
                    </View>
                    <Text style={styles.subscriptionCardDate} numberOfLines={1}>Próxima cobrança: {nextBilling}</Text>
                  </View>
                  <ChevronRight size={22} color="#10152F" strokeWidth={2.5} />
                </TouchableOpacity>
              );
            })}

            <View style={styles.subscriptionTipCard}>
              <View style={styles.subscriptionTipIcon}>
                <Lightbulb size={28} color={PRIMARY} strokeWidth={2.2} />
              </View>
              <View style={styles.subscriptionTipCopy}>
                <Text style={styles.subscriptionTipTitle}>Dica do Numvra</Text>
                <Text style={styles.subscriptionTipText}>Revise suas assinaturas regularmente e cancele o que não usa mais. Isso pode gerar uma grande economia!</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.tabContent}>
            {goals.map((goal) => {
              const progress = Math.min(
                100,
                Math.round((goal.currentAmount / (goal.targetAmount || 1)) * 100)
              );

              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    {
                      backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
                      borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
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
                  <View style={styles.goalHeader}>
                    <View style={styles.goalInfo}>
                      <Text
                        style={[
                          styles.goalTitle,
                          { color: isDarkMode ? '#F8FAFC' : '#111827' },
                        ]}
                      >
                        {goal.title}
                      </Text>
                      <Text
                        style={[
                          styles.goalSubtitle,
                          { color: isDarkMode ? '#94A3B8' : '#64748B' },
                        ]}
                      >
                        {goal.subtitle || 'Meta Financeira'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteGoal(goal)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={18} color={isDarkMode ? '#64748B' : '#9CA3AF'} />
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={[
                      styles.goalAmounts,
                      { color: isDarkMode ? '#F8FAFC' : '#111827' },
                    ]}
                  >
                    R$ {goal.currentAmount.toFixed(2).replace('.', ',')}{' '}
                    <Text style={{ fontSize: 13, color: isDarkMode ? '#94A3B8' : '#64748B' }}>
                      / R$ {goal.targetAmount.toFixed(2).replace('.', ',')}
                    </Text>
                  </Text>

                  {/* Progress bar */}
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progress}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.goalFooter}>
                    <Text style={styles.progressPercent}>{progress}% completo</Text>
                    {!!goal.estimatedDate && (
                      <Text style={styles.goalDate}>{formatBrazilianDate(goal.estimatedDate)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}


            {goals.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma meta cadastrada.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <ModalBottomSheet
        isOpen={!!editingSubscription}
        onClose={handleCloseEditSubscription}
        title="Editar Assinatura"
        maxHeight="72%"
      >
        <View style={styles.editSubscriptionContent}>
          <View style={styles.editField}>
            <Text style={[styles.editLabel, { color: colors.textMuted }]}>VALOR</Text>
            <View style={[styles.editAmountBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.editCurrency, { color: colors.primary }]}>R$</Text>
              <TextInput
                value={formatAmountInput(editSubscriptionAmountRaw)}
                onChangeText={(value) => setEditSubscriptionAmountRaw(value.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                style={[styles.editAmountInput, { color: colors.text }]}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setIsEditSubscriptionCalendarOpen(true)}
            style={[styles.editDateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <View style={styles.editDateLeft}>
              <CalendarIcon size={20} color={colors.primary} />
              <View>
                <Text style={[styles.editLabel, { color: colors.textMuted }]}>DATA DE VENCIMENTO</Text>
                <Text style={[styles.editDateText, { color: colors.text }]}>
                  {formatBrazilianDate(editSubscriptionDate)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSaveEditedSubscription}
            disabled={isSavingSubscription}
            style={[styles.editSaveButton, { backgroundColor: colors.primary, opacity: isSavingSubscription ? 0.7 : 1 }]}
            activeOpacity={0.85}
          >
            {isSavingSubscription ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Check size={20} color="#ffffff" strokeWidth={3} />
                <Text style={styles.editSaveButtonText}>Salvar Alterações</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ModalBottomSheet>

      <CalendarPicker
        isOpen={isStatementMonthPickerOpen}
        onClose={() => setIsStatementMonthPickerOpen(false)}
        selectedDate={selectedMonth}
        onSelect={(date) => {
          setSelectedMonth(date);
          setIsStatementMonthPickerOpen(false);
        }}
      />

      <CalendarPicker
        isOpen={isEditSubscriptionCalendarOpen}
        onClose={() => setIsEditSubscriptionCalendarOpen(false)}
        selectedDate={editSubscriptionDate}
        onSelect={setEditSubscriptionDate}
      />
    </View>
  );
};

/** Reuse the existing subscription and goal content outside the Statement tab. */
export const SubscriptionsScreen: React.FC = () => <StatementScreen section="subscriptions" />;
export const GoalsScreen: React.FC = () => <StatementScreen section="goals" />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackButton: {
    position: 'absolute',
    left: 16,
    bottom: 12,
  },
  headerActionButton: {
    position: 'absolute',
    right: 16,
    bottom: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statementScrollContent: {
    paddingTop: 0,
    paddingBottom: 108,
  },
  statementHeader: {
    paddingBottom: 18,
  },
  statementHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  statementTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  statementTitle: {
    fontSize: STATEMENT_TYPE.screenTitle,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: 0,
  },
  statementSubtitle: {
    marginTop: 1,
    fontSize: STATEMENT_TYPE.secondary,
    lineHeight: 18,
    fontWeight: '400',
  },
  monthSelector: {
    height: 44,
    minWidth: 150,
    maxWidth: 178,
    paddingHorizontal: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7F3',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  monthSelectorCompact: {
    minWidth: 132,
    maxWidth: 146,
    paddingHorizontal: 10,
    gap: 7,
  },
  monthSelectorText: {
    flex: 1,
    color: '#111733',
    fontSize: STATEMENT_TYPE.body,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  statementContent: {
    gap: 16,
  },
  typeFiltersRow: {
    gap: 8,
    paddingRight: 2,
  },
  typeFilterChip: {
    height: 45,
    minWidth: 88,
    paddingHorizontal: 16,
    borderRadius: 15,
    backgroundColor: '#F4F5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeFilterChipActive: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  typeFilterText: {
    color: '#6F7894',
    fontSize: STATEMENT_TYPE.secondary,
    lineHeight: 17,
    fontWeight: '500',
  },
  typeFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statementSearchBar: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F4F5FB',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statementSearchInput: {
    flex: 1,
    minWidth: 0,
    color: '#111733',
    fontSize: STATEMENT_TYPE.body,
    lineHeight: 18,
    fontWeight: '400',
    paddingVertical: 0,
  },
  advancedFilterButton: {
    width: 96,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F4F5FB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  advancedFilterText: {
    color: '#596174',
    fontSize: STATEMENT_TYPE.body,
    lineHeight: 18,
    fontWeight: '500',
  },
  dayGroup: {
    gap: 10,
    marginTop: 4,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dayTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: STATEMENT_TYPE.medium,
    lineHeight: 20,
    fontWeight: '700',
  },
  dayTotal: {
    maxWidth: 150,
    textAlign: 'right',
    fontSize: STATEMENT_TYPE.medium,
    lineHeight: 20,
    fontWeight: '700',
  },
  dayTransactionsList: {
    gap: 9,
  },
  statementTxCard: {
    minHeight: 86,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statementTxLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  statementTxInfo: {
    flex: 1,
    minWidth: 0,
  },
  statementTxTitle: {
    fontSize: STATEMENT_TYPE.medium,
    lineHeight: 19,
    fontWeight: '700',
  },
  statementTxDescription: {
    marginTop: 2,
    fontSize: STATEMENT_TYPE.secondary,
    lineHeight: 17,
    fontWeight: '400',
  },
  statementTxTime: {
    marginTop: 1,
    fontSize: STATEMENT_TYPE.small,
    lineHeight: 16,
    fontWeight: '400',
  },
  statementTxRight: {
    width: 138,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  statementTxRightContent: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  statementTxAmount: {
    maxWidth: '100%',
    fontSize: STATEMENT_TYPE.medium,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'right',
  },
  categoryBadge: {
    marginTop: 7,
    maxWidth: '100%',
    minHeight: 28,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgeText: {
    fontSize: STATEMENT_TYPE.small,
    lineHeight: 15,
    fontWeight: '500',
  },
  statementEmptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 6,
  },
  statementEmptySubtext: {
    fontSize: STATEMENT_TYPE.secondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  tabContent: {
    gap: 12,
  },
  searchBar: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  filterChips: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  txSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  deleteIconButton: {
    padding: 4,
  },
  subsSummary: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  subsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  subsTotal: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 2,
  },
  subsYearly: {
    fontSize: 12,
    fontWeight: '700',
  },
  subCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    paddingRight: 12,
  },
  subIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  subTitleRow: {
    flex: 1,
  },
  subActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subBilling: {
    fontSize: 12,
    fontWeight: '500',
  },
  subFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    paddingTop: 10,
  },
  subAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  subPeriod: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  addDashedButton: {
    borderWidth: 2,
    borderColor: '#6C5CE7',
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: 'rgba(108, 92, 231, 0.04)',
  },
  plusCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDashedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  subscriptionsHeader: {
    paddingBottom: 12,
  },
  subscriptionsHeaderRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subscriptionsAddTopButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F0EDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionsTitleBlock: {
    marginTop: 6,
    paddingLeft: 74,
    paddingRight: 58,
  },
  subscriptionsTitle: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subscriptionsSubtitle: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '400',
  },
  subscriptionsContent: {
    gap: 14,
  },
  subscriptionTabs: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 18,
  },
  subscriptionTabButton: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  subscriptionTabText: {
    color: '#596174',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
  },
  subscriptionTabTextActive: {
    color: PRIMARY,
    fontWeight: '800',
  },
  subscriptionTabLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E8F2',
  },
  subscriptionTabLineActive: {
    height: 2,
    backgroundColor: PRIMARY,
  },
  subsSummaryCard: {
    minHeight: 96,
    borderRadius: 18,
    backgroundColor: '#F4F6FC',
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  subsSummaryIconBox: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#E7E2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subsSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  subsSummaryLabel: {
    color: '#6F7894',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
  },
  subsSummaryTotal: {
    marginTop: 3,
    color: '#10152F',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
  },
  subsSummaryYearly: {
    marginTop: 3,
    color: '#6F7894',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
  },
  subsSummaryYearlyStrong: {
    color: '#10152F',
    fontWeight: '800',
  },
  subsSummaryNeutralBadge: {
    minWidth: 78,
    maxWidth: 90,
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  subsSummaryNeutralText: {
    color: '#6F7894',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  subsSummaryNeutralSubtext: {
    color: '#8A93AC',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  addSubscriptionButton: {
    height: 56,
    borderRadius: 17,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: PRIMARY,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  addSubscriptionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  subscriptionListCard: {
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  subscriptionLogoBox: {
    width: 55,
    height: 55,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  subscriptionCardCopy: {
    flex: 1,
    minWidth: 0,
  },
  subscriptionCardName: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
  },
  subscriptionAmountRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  subscriptionCardAmount: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
  },
  subscriptionCardPeriod: {
    flexShrink: 1,
    color: '#6F7894',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
  },
  subscriptionCardDate: {
    marginTop: 4,
    color: '#6F7894',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  subscriptionsEmptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 8,
  },
  subscriptionsEmptyTitle: {
    color: '#10152F',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  subscriptionsEmptySubtitle: {
    color: '#6F7894',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  subscriptionsEmptyButton: {
    marginTop: 5,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionsEmptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  subscriptionTipCard: {
    minHeight: 78,
    borderRadius: 18,
    backgroundColor: '#F2EFFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 10,
  },
  subscriptionTipIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#E7E2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionTipCopy: {
    flex: 1,
    minWidth: 0,
  },
  subscriptionTipTitle: {
    color: PRIMARY,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  subscriptionTipText: {
    marginTop: 3,
    color: '#6F7894',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
  },
  editSubscriptionContent: {
    gap: 16,
    paddingBottom: 8,
  },
  editField: {
    gap: 8,
  },
  editLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  editAmountBox: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editCurrency: {
    fontSize: 18,
    fontWeight: '900',
  },
  editAmountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    paddingVertical: 0,
  },
  editDateButton: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  editDateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editDateText: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  editSaveButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  editSaveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  goalCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  goalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  goalAmounts: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6C5CE7',
    borderRadius: 3,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C5CE7',
    textTransform: 'uppercase',
  },
  goalDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
});
