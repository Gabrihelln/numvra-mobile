import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Calendar as CalendarIcon, ChevronRight, Check, Banknote, CreditCard, Layers } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { transactionService } from '../services/transactionService';
import { cardService } from '../services/cardService';
import { CalendarPicker } from '../components/common/CalendarPicker';
import { spacing, borderRadius, typography } from '../theme';
import { CreditCardType } from '../types';
import { useBudgets } from '../hooks/useBudgets';
import { getCategoryVisual } from '../constants/iconRegistry';

const LEGACY_INCOME_CATEGORIES = [
  { id: 'legacy-salary', label: 'Salário', icon: 'banknote', color: '#10b981' },
  { id: 'legacy-investments', label: 'Invest.', icon: 'trophy', color: '#14b8a6' },
  { id: 'legacy-gift', label: 'Presente', icon: 'gift', color: '#ec4899' },
  { id: 'legacy-other-income', label: 'Outros', icon: 'plus', color: '#6b7280' },
];

export const AddScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useTheme();
  const { user, checkLimit, triggerUpgrade } = useAuth();
  const { activeBudgetCategories, loading: categoriesLoading } = useBudgets();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [description, setDescription] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card'>('cash');
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [installments, setInstallments] = useState(1);
  const cardAccess = checkLimit('card');

  React.useEffect(() => {
    const unsubscribeCards = cardService.subscribeToCards((cardList) => {
      setCards(cardList);
      if (!selectedCardId && cardList.length > 0) setSelectedCardId(cardList[0].id);
    });
    return () => {
      unsubscribeCards();
    };
  }, []);

  const configuredCategories = activeBudgetCategories
    .filter((category) => category.type === type || (type === 'expense' && !category.type))
    .map((category) => ({
      id: category.id,
      label: category.name || 'Sem categoria',
      icon: category.icon,
      color: category.color,
    }));
  const categories = configuredCategories.length > 0
    ? configuredCategories
    : type === 'income'
      ? LEGACY_INCOME_CATEGORIES
      : [];

  const formatDate = (date: Date) => {
    if (isToday(date)) {
      return `Hoje, ${format(date, "d 'de' MMMM", { locale: ptBR })}`;
    }
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  // Format integer cents into BRL display e.g. "12,50"
  const formatDisplayAmount = (raw: string) => {
    if (!raw) return '0,00';
    const cleanNumbers = raw.replace(/\D/g, '');
    if (!cleanNumbers) return '0,00';
    const num = parseFloat(cleanNumbers) / 100;
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAmountChange = (text: string) => {
    const cleanNumbers = text.replace(/\D/g, '');
    setAmountRaw(cleanNumbers);
  };

  const getNumericValue = (): number => {
    if (!amountRaw) return 0;
    return parseFloat(amountRaw) / 100;
  };

  const installmentValue = installments > 0 ? getNumericValue() / installments : 0;

  const handleSaveTransaction = async () => {
    const numericAmount = getNumericValue();
    if (numericAmount <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero para a movimentação.');
      return;
    }

    const selectedCategoryData = categories[selectedCategoryIndex];
    const selectedCategory = selectedCategoryData?.label || (type === 'expense' ? 'Outros' : 'Salário');
    const desc = description.trim() || (type === 'expense' ? `Gasto com ${selectedCategory}` : `Receita de ${selectedCategory}`);
    const isCard = type === 'expense' && paymentMethod === 'credit_card';
    const selectedCard = cards.find((card) => card.id === selectedCardId);

    if (isCard && !cardAccess.allowed) {
      triggerUpgrade?.('card', cardAccess.reason);
      return;
    }

    if (isCard && !selectedCard) {
      Alert.alert('Cartão necessário', 'Selecione um cartão válido para registrar uma compra no cartão.');
      return;
    }

    setLoading(true);
    try {
      if (user) {
        await transactionService.addTransaction({
          title: desc,
          description: desc,
          amount: type === 'expense' ? -numericAmount : numericAmount,
          date: format(selectedDate, 'yyyy-MM-dd'),
          category: selectedCategory,
          type: type,
          isCardCharge: isCard,
          ...(isCard && selectedCard ? {
            cardId: selectedCard.id,
            cardName: `${selectedCard.name} (•••• ${selectedCard.finalDigits})`,
            installments,
            currentInstallment: 1,
          } : {}),
          status: 'completed',
        });
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro ao salvar', error?.message || 'Não foi possível salvar a movimentação.');
    } finally {
      setLoading(false);
    }
  };

  // Cores dinâmicas para Despesa e Receita
  const isExpense = type === 'expense';
  const accentColor = isExpense ? '#ef4444' : '#10b981';
  const accentBgLight = isExpense
    ? (isDarkMode ? '#450a0a' : '#fee2e2')
    : (isDarkMode ? '#064e3b' : '#d1fae5');
  const accentBorderColor = isExpense
    ? (isDarkMode ? '#f87171' : '#fca5a5')
    : (isDarkMode ? '#34d399' : '#86efac');

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.modalBackdrop} />
      <View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            maxHeight: height * 0.84,
            paddingBottom: Math.max(spacing.lg, insets.bottom + spacing.sm),
          },
        ]}
      >
      <View style={[styles.handle, { backgroundColor: isDarkMode ? '#3f3f46' : '#d4d4d8' }]} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header com X e Título */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <X size={28} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Nova movimentação
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Seletor Despesa / Receita */}
        <View style={[styles.typeSelectorContainer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            onPress={() => {
              setType('expense');
              setSelectedCategoryIndex(0);
            }}
            style={[
              styles.typeButton,
              isExpense && { backgroundColor: accentBgLight },
            ]}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.typeIconBadge,
                {
                  borderColor: isExpense ? accentBorderColor : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeIconSign,
                  { color: isExpense ? accentColor : colors.textMuted },
                ]}
              >
                -
              </Text>
            </View>
            <Text
              style={[
                styles.typeButtonText,
                {
                  color: isExpense ? accentColor : colors.textSecondary,
                  fontWeight: isExpense ? '700' : '600',
                },
              ]}
            >
              Despesa
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setType('income');
              setSelectedCategoryIndex(0);
              setPaymentMethod('cash');
              setInstallments(1);
            }}
            style={[
              styles.typeButton,
              !isExpense && { backgroundColor: accentBgLight },
            ]}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.typeIconBadge,
                {
                  borderColor: !isExpense ? accentBorderColor : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeIconSign,
                  { color: !isExpense ? accentColor : colors.textMuted },
                ]}
              >
                +
              </Text>
            </View>
            <Text
              style={[
                styles.typeButtonText,
                {
                  color: !isExpense ? accentColor : colors.textSecondary,
                  fontWeight: !isExpense ? '700' : '600',
                },
              ]}
            >
              Receita
            </Text>
          </TouchableOpacity>
        </View>

        {isExpense && (
          <View style={[styles.paymentSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Forma de pagamento</Text>
            <View style={styles.paymentOptions}>
              {(['cash', 'credit_card'] as const).map((method) => (
                <TouchableOpacity
                  key={method}
                  onPress={() => {
                    if (method === 'credit_card' && !cardAccess.allowed) {
                      triggerUpgrade?.('card', cardAccess.reason);
                      setPaymentMethod('cash');
                      setInstallments(1);
                      return;
                    }
                    setPaymentMethod(method);
                    if (method === 'cash') setInstallments(1);
                  }}
                  style={[styles.paymentButton, paymentMethod === method && { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                >
                  {method === 'cash' ? <Banknote size={18} color={paymentMethod === method ? '#ffffff' : colors.textMuted} /> : <CreditCard size={18} color={paymentMethod === method ? '#ffffff' : colors.textMuted} />}
                  <Text style={[styles.paymentButtonText, { color: paymentMethod === method ? '#ffffff' : colors.textSecondary }]}>
                    {method === 'cash' ? 'Conta' : 'Cartão'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {paymentMethod === 'credit_card' && (
              <View style={styles.cardOptions}>
                {cards.length === 0 ? (
                  <Text style={[styles.cardHint, { color: colors.textMuted }]}>Cadastre um cartão para lançar esta compra.</Text>
                ) : (
                  <>
                    <Text style={[styles.cardHint, { color: colors.textSecondary }]}>Cartão</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardList}>
                      {cards.map((card) => (
                        <TouchableOpacity
                          key={card.id}
                          onPress={() => setSelectedCardId(card.id)}
                          style={[styles.cardChoice, { borderColor: selectedCardId === card.id ? colors.primary : colors.border }]}
                        >
                          <CreditCard size={16} color={colors.primary} />
                          <Text style={[styles.cardChoiceText, { color: colors.text }]} numberOfLines={1}>{card.name}</Text>
                          <Text style={[styles.cardDigits, { color: colors.textMuted }]}>•••• {card.finalDigits}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <Text style={[styles.cardHint, { color: colors.textSecondary }]}>Parcelamento</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.installmentList}>
                      {[1, 2, 3, 4, 5, 6, 10, 12].map((count) => (
                        <TouchableOpacity
                          key={count}
                          onPress={() => setInstallments(count)}
                          style={[styles.installmentChoice, { backgroundColor: installments === count ? colors.primary : colors.card }]}
                        >
                          <Layers size={14} color={installments === count ? '#ffffff' : colors.textMuted} />
                          <Text style={{ color: installments === count ? '#ffffff' : colors.text, fontWeight: '700' }}>{count}x</Text>
                          <Text style={{ color: installments === count ? '#ffffff' : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                            de R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {installments > 1 && getNumericValue() > 0 && (
                      <Text style={[styles.cardHint, { color: colors.primary }]}>Serão lançadas {installments} parcelas de R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.</Text>
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Campos Descrição e Valor */}
        <View style={styles.inputsSection}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Descrição</Text>
            <TextInput
              placeholder="Ex: Compras no mercado"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              style={[
                styles.descriptionInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                },
              ]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Valor</Text>
            <View style={styles.amountDisplayRow}>
              <Text
                style={[
                  styles.amountCurrency,
                  { color: isExpense ? (isDarkMode ? '#f87171' : '#7f1d1d') : (isDarkMode ? '#34d399' : '#14532d') },
                ]}
              >
                R$
              </Text>
              <TextInput
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={formatDisplayAmount(amountRaw)}
                onChangeText={handleAmountChange}
                style={[
                  styles.amountInput,
                  {
                    color: isExpense
                      ? (isDarkMode ? '#f87171' : '#7f1d1d')
                      : (isDarkMode ? '#34d399' : '#14532d'),
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Seção Categorias */}
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Text style={[styles.categorySectionTitle, { color: colors.text }]}>
              Categoria
            </Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>
                Ver todas
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesGrid}>
            {categories.map((cat, i) => {
              const isSelected = selectedCategoryIndex === i;
              const categoryVisual = getCategoryVisual(cat.icon, cat.color, isDarkMode);
              const CategoryIcon = categoryVisual.Icon;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategoryIndex(i)}
                  activeOpacity={0.8}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {categoriesLoading && type === 'expense' ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <CategoryIcon size={26} color={isSelected ? '#ffffff' : categoryVisual.color} />
                  )}
                  <Text
                    style={[
                      styles.categoryLabel,
                      {
                        color: isSelected ? '#ffffff' : colors.text,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {!categoriesLoading && categories.length === 0 && (
              <Text style={[styles.emptyCategoriesText, { color: colors.textMuted }]}>Nenhuma categoria ativa disponível.</Text>
            )}
          </View>
        </View>

        {/* Botão Seletor de Data */}
        <TouchableOpacity
          onPress={() => setIsCalendarOpen(true)}
          style={[styles.dateSelectorButton, { backgroundColor: colors.surface }]}
          activeOpacity={0.7}
        >
          <View style={styles.dateSelectorLeft}>
            <View
              style={[
                styles.calendarIconContainer,
                { backgroundColor: colors.card },
              ]}
            >
              <CalendarIcon size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.dateSubLabel, { color: colors.textMuted }]}>
                DATA DA MOVIMENTAÇÃO
              </Text>
              <Text style={[styles.dateMainText, { color: colors.text }]}>
                {formatDate(selectedDate)}
              </Text>
            </View>
          </View>
          <ChevronRight size={24} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Botão Confirmar / Adicionar Movimentação */}
        <TouchableOpacity
          id="btn-confirm-add-movement"
          onPress={handleSaveTransaction}
          disabled={loading}
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
          ]}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <View style={styles.submitCheckCircle}>
                <Check size={20} color="#ffffff" strokeWidth={3} />
              </View>
              <Text style={styles.submitButtonText}>
                Adicionar Movimentação
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Modal de Calendário */}
        <CalendarPicker
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />
      </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 9, 11, 0.45)',
  },
  bottomSheet: {
    marginTop: 'auto',
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 18,
    overflow: 'hidden',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  container: {
    flexGrow: 0,
    flexShrink: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 32,
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  typeIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconSign: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  typeButtonText: {
    fontSize: 14,
  },
  paymentSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  paymentButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardOptions: {
    gap: spacing.sm,
  },
  cardHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardList: {
    gap: spacing.sm,
  },
  cardChoice: {
    width: 150,
    minHeight: 58,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: 2,
  },
  cardChoiceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardDigits: {
    fontSize: 10,
  },
  installmentList: {
    gap: spacing.xs,
  },
  installmentChoice: {
    minWidth: 52,
    height: 36,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: spacing.xs,
  },
  inputsSection: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  descriptionInput: {
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    fontSize: 16,
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  amountCurrency: {
    fontSize: 28,
    fontWeight: '700',
  },
  amountInput: {
    flex: 1,
    fontSize: 38,
    fontWeight: '700',
    padding: 0,
    margin: 0,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  categorySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryCard: {
    width: '30.5%',
    height: 78,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
  },
  emptyCategoriesText: {
    width: '100%',
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: spacing.md,
  },
  categoryLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  dateSelectorButton: {
    width: '100%',
    height: 64,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  dateSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  calendarIconContainer: {
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateSubLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateMainText: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  submitButton: {
    width: '100%',
    height: 58,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 'auto',
  },
  submitCheckCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
