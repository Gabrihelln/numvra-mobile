import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Plus,
  BarChart3,
  Trash2,
  ChevronRight,
  Sparkles,
  Edit2,
} from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { transactionService } from '../services/transactionService';
import { BudgetCategory, Transaction } from '../types';
import { AddBudgetCategoryModal } from '../components/modals/AddBudgetCategoryModal';
import { spacing, borderRadius, typography } from '../theme';
import { useBudgets } from '../hooks/useBudgets';
import { getCategoryVisual } from '../constants/iconRegistry';
import { BackButton } from '../components/common/BackButton';

export const BudgetScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useTheme();
  const { user, checkLimit } = useAuth();
  const {
    budgetCategories: categories,
    loading,
    addBudgetCategory,
    updateBudgetCategory,
    deleteBudgetCategory,
  } = useBudgets();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);

  const budgetAccess = checkLimit('budget');

  // The shared category provider owns the single Firestore category listener.
  useEffect(() => {
    const unsubTransactions = transactionService.subscribeToTransactions((txs) => {
      setTransactions(txs);
    });

    return () => {
      unsubTransactions();
    };
  }, [user]);

  // Tela de Upgrade Premium se o plano for básico/grátis
  if (!budgetAccess.allowed) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {/* Top Header */}
        <View style={[styles.headerFixed, styles.secondaryHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <BackButton />
          <View style={styles.secondaryHeaderContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Orçamento</Text>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>Recurso Premium</Text>
            </View>
          </View>
          <View style={styles.headerBackSpacer} />
        </View>

        <View style={styles.premiumLockedContainer}>
          <Text style={[styles.premiumLockedTitle, { color: colors.text }]}>
            Orçamento de Gastos
          </Text>
          <Text style={[styles.premiumLockedSubtitle, { color: colors.textSecondary }]}>
            {budgetAccess.reason}
          </Text>
          <Text style={[styles.premiumLockedSubtitle, { color: colors.textSecondary }]}>
            Divida as frentes de custo da sua carteira (Saúde, Lazer, Aluguel) com metas percentuais inteligentes e controle os consumos mês a mês!
          </Text>

          <View style={[styles.premiumPerksCard, { backgroundColor: isDarkMode ? '#1e1b4b30' : '#e0e7ff40', borderColor: isDarkMode ? '#312e81' : '#c7d2fe' }]}>
            <Text style={[styles.perksHeader, { color: isDarkMode ? '#a5b4fc' : '#3730a3' }]}>
              Por que assinar o Premium?
            </Text>
            <Text style={[styles.perkItem, { color: isDarkMode ? '#c7d2fe' : '#4338ca' }]}>
              ✓ Categorias customizadas ilimitadas
            </Text>
            <Text style={[styles.perkItem, { color: isDarkMode ? '#c7d2fe' : '#4338ca' }]}>
              ✓ Percentuais dinâmicos em tempo real
            </Text>
            <Text style={[styles.perkItem, { color: isDarkMode ? '#c7d2fe' : '#4338ca' }]}>
              ✓ Alertas automáticos de teto de gastos
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Plan')}
            style={[styles.upgradeButton, { backgroundColor: '#6C5CE7' }]}
            activeOpacity={0.8}
          >
            <Text style={styles.upgradeButtonText}>Fazer Upgrade para Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Cálculos matemáticos do orçamento
  const totalIncome = transactions
    .filter((t) => t.type === 'income' && t.status !== 'pending')
    .reduce((acc, t) => acc + t.amount, 0);

  const accountExpenses = transactions
    .filter((t) => t.type === 'expense' && !t.isCardCharge && t.status !== 'pending')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const accountBalance = totalIncome - accountExpenses;
  const positiveBalance = Math.max(0, accountBalance);

  const getCategorySpend = (categoryName: string) => {
    const matches = transactions.filter(
      (t) =>
        t.type === 'expense' &&
        t.status !== 'pending' &&
        t.category?.toLowerCase() === categoryName?.toLowerCase()
    );
    return matches.reduce((sum, current) => sum + Math.abs(current.amount), 0);
  };

  const getCategoryLimit = (percentage: number) => {
    return positiveBalance * ((percentage ?? 0) / 100);
  };

  const totalAllocatedPercentage = categories.reduce(
    (sum, item) => sum + (item.percentage ?? 0),
    0
  );
  const totalBudget = positiveBalance * (totalAllocatedPercentage / 100);
  const totalSpent = categories.reduce(
    (sum, item) => sum + getCategorySpend(item.name),
    0
  );
  const budgetUtilizationPercent =
    totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const freeAmount = Math.max(0, totalBudget - totalSpent);

  // Ações de Criar/Editar/Excluir Categoria
  const handleSaveCategory = async (name: string, percentage: number, icon: string) => {
    if (!budgetAccess.allowed) {
      Alert.alert('Recurso Premium', budgetAccess.reason);
      return;
    }

    try {
      if (editingCategory) {
        await updateBudgetCategory(editingCategory.id, {
          name,
          percentage,
          icon,
        });
      } else {
        await addBudgetCategory({
          name,
          percentage,
          icon,
        });
      }
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err?.message || 'Não foi possível salvar o orçamento.');
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (!budgetAccess.allowed) {
      Alert.alert('Recurso Premium', budgetAccess.reason);
      return;
    }

    Alert.alert(
      'Excluir Categoria',
      `Deseja realmente excluir a categoria "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBudgetCategory(id);
            } catch (err: any) {
              Alert.alert('Erro', 'Não foi possível excluir a categoria.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header Superior Fixo */}
      <View style={[styles.headerFixed, styles.secondaryHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <BackButton />
        <View style={styles.secondaryHeaderContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Orçamento</Text>
          <View style={styles.allocationBadge}>
            <Text style={styles.allocationText}>{totalAllocatedPercentage}% definidos</Text>
            <Text style={styles.bulletSeparator}>•</Text>
            {100 - totalAllocatedPercentage > 0 ? (
              <Text style={styles.remainingGreen}>Restam {100 - totalAllocatedPercentage}% livres</Text>
            ) : (
              <Text style={styles.limitRed}>Limite atingido (100%)</Text>
            )}
          </View>
        </View>
        <View style={styles.headerBackSpacer} />
      </View>

      {/* Conteúdo Rolável */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Principal: Total Reservado */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroSubLabel}>Total Reservado</Text>
              <Text style={styles.heroAllocatedInfo}>
                {totalAllocatedPercentage}% alocado do saldo
              </Text>
            </View>
            <View style={styles.heroIconBadge}>
              <BarChart3 size={18} color="#ffffff" />
            </View>
          </View>

          <Text style={styles.heroAmount}>
            R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>

          {/* Barra de Progresso de Utilização */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${budgetUtilizationPercent}%` },
              ]}
            />
          </View>

          <View style={styles.heroBottomRow}>
            <Text style={styles.heroFreeAmount}>
              Você ainda tem R$ {freeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} livres.
            </Text>
            <Text style={styles.heroPercentText}>{budgetUtilizationPercent}%</Text>
          </View>
        </View>

        {/* Seção Meus Gastos */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Meus Gastos
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Statement')}
            style={styles.detailsLink}
            activeOpacity={0.7}
          >
            <Text style={[styles.detailsText, { color: '#6C5CE7' }]}>Ver Detalhes</Text>
            <ChevronRight size={14} color="#6C5CE7" />
          </TouchableOpacity>
        </View>

        {/* Lista de Categorias de Orçamento */}
        <View style={styles.categoriesList}>
          {categories.map((item) => {
            const spent = getCategorySpend(item.name);
            const limit = getCategoryLimit(item.percentage ?? 0);
            const percentConsumed =
              limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
            const isOver = spent > limit && limit > 0;
            const iconConfig = getCategoryVisual(item.icon, item.color, isDarkMode);
            const IconComp = iconConfig.Icon;

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setEditingCategory(item);
                  setIsNewCategoryOpen(true);
                }}
                activeOpacity={0.7}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.categoryTopRow}>
                  <View style={styles.categoryLeft}>
                    <View
                      style={[
                        styles.categoryIconSquare,
                        { backgroundColor: iconConfig.backgroundColor },
                      ]}
                    >
                      <IconComp size={20} color={iconConfig.color} />
                    </View>
                    <View>
                      <Text style={[styles.categoryName, { color: colors.text }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.categoryMeta, { color: colors.textSecondary }]}>
                        Meta: {item.percentage ?? 0}% (
                        {limit > 0
                          ? `R$ ${limit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
                          : 'R$ 0'}
                        )
                      </Text>
                    </View>
                  </View>

                  <View style={styles.categoryRight}>
                    <Text style={[styles.categorySpent, { color: colors.text }]}>
                      R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                    <Text
                      style={[
                        styles.categoryConsumed,
                        { color: isOver ? '#ef4444' : '#6C5CE7' },
                      ]}
                    >
                      {percentConsumed}% consumido
                    </Text>
                  </View>
                </View>

                {/* Barra de Progresso da Categoria */}
                <View
                  style={[
                    styles.categoryProgressTrack,
                    { backgroundColor: isDarkMode ? '#27272a' : '#f3f4f6' },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryProgressBar,
                      {
                        width: `${percentConsumed}%`,
                        backgroundColor: isOver ? '#ef4444' : iconConfig.color,
                      },
                    ]}
                  />
                </View>

                {/* Botões de Ação no Card */}
                <View style={styles.categoryActionsRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingCategory(item);
                      setIsNewCategoryOpen(true);
                    }}
                    style={styles.actionIconButton}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={15} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteCategory(item.id, item.name)}
                    style={styles.actionIconButton}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={15} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Estado Vazio */}
          {categories.length === 0 && !loading && (
            <View
              style={[
                styles.emptyStateCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Sparkles size={32} color="#6C5CE7" style={styles.emptyIcon} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum orçamento configurado ainda.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingCategory(null);
                  setIsNewCategoryOpen(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.emptyButtonLink}>
                  Configurar primeiro orçamento
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Indicador de Carregamento */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6C5CE7" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Carregando categorias...
              </Text>
            </View>
          )}
        </View>

        {/* Botão Tracejado: Criar Nova Categoria */}
        <TouchableOpacity
          onPress={() => {
            setEditingCategory(null);
            setIsNewCategoryOpen(true);
          }}
          style={[
            styles.createCategoryDashedButton,
            {
              borderColor: '#6C5CE7',
              backgroundColor: isDarkMode ? '#6C5CE715' : '#6C5CE708',
            },
          ]}
          activeOpacity={0.8}
        >
          <View style={styles.plusIconCircle}>
            <Plus size={20} color="#6C5CE7" strokeWidth={2.5} />
          </View>
          <Text style={styles.createCategoryText}>Criar Nova Categoria</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Adicionar / Editar Categoria */}
      <AddBudgetCategoryModal
        isOpen={isNewCategoryOpen}
        onClose={() => {
          setIsNewCategoryOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleSaveCategory}
        categoryToEdit={editingCategory}
        totalAllocated={totalAllocatedPercentage}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  headerFixed: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  secondaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryHeaderContent: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerBackSpacer: {
    width: 40,
  },
  headerTitle: {
    ...typography.h3,
  },
  allocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderRadius: 12,
  },
  allocationText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6C5CE7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bulletSeparator: {
    fontSize: 10,
    color: '#6C5CE7',
    opacity: 0.5,
  },
  remainingGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  limitRed: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ef4444',
  },
  heroCard: {
    backgroundColor: '#5B4CD8',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#5B4CD8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  heroSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  heroAllocatedInfo: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EAE8FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginVertical: spacing.md,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroFreeAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  heroPercentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoriesList: {
    gap: spacing.md,
  },
  categoryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: spacing.sm,
  },
  categoryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  categoryIconSquare: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '800',
  },
  categoryMeta: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categorySpent: {
    fontSize: 14,
    fontWeight: '800',
  },
  categoryConsumed: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  categoryProgressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  categoryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingTop: 2,
  },
  actionIconButton: {
    padding: 6,
    borderRadius: 8,
  },
  createCategoryDashedButton: {
    width: '100%',
    paddingVertical: spacing.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  plusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCategoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  emptyStateCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyButtonLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6C5CE7',
    textDecorationLine: 'underline',
    textTransform: 'uppercase',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  premiumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6C5CE7',
    textTransform: 'uppercase',
  },
  premiumLockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  premiumLockedTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  premiumLockedSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  premiumPerksCard: {
    width: '100%',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    marginBottom: spacing.xxl,
  },
  perksHeader: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  perkItem: {
    fontSize: 12,
    fontWeight: '600',
  },
  upgradeButton: {
    width: '100%',
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
