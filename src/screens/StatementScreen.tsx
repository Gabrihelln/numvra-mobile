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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Plus,
  Trash2,
  Search,
  X,
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
import { getCategoryVisual } from '../constants/iconRegistry';
import { useBudgets } from '../hooks/useBudgets';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type StatementSection = 'transactions' | 'subscriptions' | 'goals';
type TransactionFilter = 'all' | 'income' | 'expense' | 'subscriptions' | 'card';

const transactionFilters: { key: TransactionFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'income', label: 'Receitas' },
  { key: 'expense', label: 'Despesas' },
  { key: 'subscriptions', label: 'Assinaturas' },
  { key: 'card', label: 'Cartão' },
];

const normalizeSearch = (value?: string | null) => (value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .trim();

const transactionMatchesFilter = (transaction: Transaction, filter: TransactionFilter) => {
  if (filter === 'all') return true;
  if (filter === 'income') return transaction.type === 'income';
  if (filter === 'expense') return transaction.type === 'expense' && !transaction.isCardCharge;
  if (filter === 'subscriptions') {
    return transaction.isRecurring === true || normalizeSearch(transaction.category) === 'assinaturas';
  }
  if (filter === 'card') {
    return transaction.isCardCharge === true || !!transaction.cardId || transaction.paymentMethod === 'credit_card';
  }
  return true;
};

const transactionMatchesSearch = (transaction: Transaction, query: string) => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;

  const fields = [
    transaction.title,
    transaction.description,
    transaction.category,
    transaction.cardName,
    transaction.paymentMethod,
  ];

  return fields.some((field) => normalizeSearch(field).includes(normalizedQuery));
};

interface StatementScreenProps {
  section?: StatementSection;
}

export const StatementScreen: React.FC<StatementScreenProps> = ({ section = 'transactions' }) => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user, checkLimit, triggerUpgrade } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { budgetCategories } = useBudgets();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');

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

  const { totalMonthlySubs, totalYearlySubs } = useMemo(
    () => ({
      totalMonthlySubs: subscriptions
        .filter((s) => s.period === 'Mensal')
        .reduce((acc, s) => acc + s.amount, 0),
      totalYearlySubs: subscriptions
        .filter((s) => s.period === 'Anual')
        .reduce((acc, s) => acc + s.amount, 0),
    }),
    [subscriptions]
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
      transactionMatchesSearch(transaction, transactionSearch)
    ),
    [sortedTransactions, transactionFilter, transactionSearch]
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#121214' : '#FAF9FF' },
      ]}
    >
      {/* Top Title */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
        {section !== 'transactions' && (
          <View style={styles.headerBackButton}>
            <BackButton onPress={() => navigation.goBack()} />
          </View>
        )}
        <Text
          style={[
            styles.headerTitle,
            { color: isDarkMode ? '#F8FAFC' : '#1C1C28' },
          ]}
        >
          {section === 'transactions' ? 'Extrato' : section === 'subscriptions' ? 'Assinaturas' : 'Metas'}
        </Text>
        {section !== 'transactions' && (
          <TouchableOpacity
            onPress={section === 'subscriptions' ? handleCreateSubscription : handleCreateGoal}
            style={[styles.headerActionButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={section === 'subscriptions' ? 'Criar nova assinatura' : 'Criar nova meta'}
          >
            <Plus size={20} color="#ffffff" strokeWidth={3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C5CE7" />
          </View>
        ) : section === 'transactions' ? (
          <View style={styles.tabContent}>
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                value={transactionSearch}
                onChangeText={setTransactionSearch}
                placeholder="Pesquisar lançamento"
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Pesquisar lançamentos"
              />
              {!!transactionSearch && (
                <TouchableOpacity onPress={() => setTransactionSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              {transactionFilters.map((filter) => {
                const selected = transactionFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    onPress={() => setTransactionFilter(filter.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.filterChipText, { color: selected ? '#ffffff' : colors.textSecondary }]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {visibleTransactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhum lançamento encontrado.</Text>
              </View>
            ) : (
              visibleTransactions.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.txCard,
                    {
                      backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
                      borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
                    },
                  ]}
                >
                  <View style={styles.txLeft}>
                    <TransactionIcon
                      icon={item.icon || categoriesByName.get(item.category?.trim().toLowerCase())?.icon || 'tag'}
                      category={item.category}
                      categoryColor={item.categoryColor || categoriesByName.get(item.category?.trim().toLowerCase())?.color}
                      type={item.type}
                    />
                    <View style={styles.txInfo}>
                      <Text
                        style={[
                          styles.txTitle,
                          { color: isDarkMode ? '#F8FAFC' : '#111827' },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[
                          styles.txSubtitle,
                          { color: isDarkMode ? '#94A3B8' : '#6B7280' },
                        ]}
                      >
                        {item.date || 'Hoje'} • {item.category}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        {
                          color: item.amount > 0 ? '#10B981' : '#EF4444',
                        },
                      ]}
                    >
                      {item.amount > 0 ? '+' : '-'} R${' '}
                      {Math.abs(item.amount).toFixed(2).replace('.', ',')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteTransaction(item)}
                      style={styles.deleteIconButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={16} color={isDarkMode ? '#64748B' : '#9CA3AF'} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : section === 'subscriptions' ? (
          <View style={styles.tabContent}>
            {/* Total */}
            <View style={styles.subsSummary}>
              <Text style={[styles.subsLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                Seu pagamento mensal de assinaturas
              </Text>
              <Text
                style={[
                  styles.subsTotal,
                  { color: isDarkMode ? '#F8FAFC' : '#1C1C28' },
                ]}
              >
                R$ {totalMonthlySubs.toFixed(2).replace('.', ',')}
              </Text>
              <Text style={[styles.subsYearly, { color: isDarkMode ? '#CBD5E1' : '#475569' }]}>
                Total Anual: R$ {totalYearlySubs.toFixed(2).replace('.', ',')}
              </Text>
            </View>

            {subscriptions.map((sub) => (
              <View
                key={sub.id}
                style={[
                  styles.subCard,
                  {
                    backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
                    borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
                  },
                ]}
              >
                <View style={styles.subHeader}>
                  <View style={styles.subIdentity}>
                    {(() => {
                      const visual = getCategoryVisual(sub.icon, sub.color, isDarkMode);
                      const FallbackIcon = visual.Icon;
                      return (
                        <View style={[styles.subIconBox, { backgroundColor: visual.backgroundColor }]}>
                          <RemoteIcon
                            uri={sub.iconUrl || sub.icon}
                            size={28}
                            fallback={<FallbackIcon size={22} color={visual.color} />}
                          />
                        </View>
                      );
                    })()}
                    <View style={styles.subTitleRow}>
                      <Text
                        style={[
                          styles.subName,
                          { color: isDarkMode ? '#F8FAFC' : '#111827' },
                        ]}
                      >
                        {sub.name}
                      </Text>
                      <Text
                        style={[
                          styles.subBilling,
                          { color: isDarkMode ? '#94A3B8' : '#64748B' },
                        ]}
                      >
                        Cobrança: {sub.nextBilling || '15/05'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteSubscription(sub)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={18} color={isDarkMode ? '#64748B' : '#9CA3AF'} />
                  </TouchableOpacity>
                </View>

                <View style={styles.subFooter}>
                  <Text
                    style={[
                      styles.subAmount,
                      { color: isDarkMode ? '#F8FAFC' : '#111827' },
                    ]}
                  >
                    R$ {sub.amount.toFixed(2).replace('.', ',')}{' '}
                    <Text style={styles.subPeriod}>/ {sub.period}</Text>
                  </Text>
                </View>
              </View>
            ))}


            {subscriptions.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma assinatura cadastrada.</Text>
              </View>
            )}
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
                      <Text style={styles.goalDate}>{goal.estimatedDate}</Text>
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
