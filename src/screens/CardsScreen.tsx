import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CalendarDays, ChevronRight, CreditCard, FileText, Lightbulb, Lock, PieChart, Plus, Settings } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { cardService } from '../services/cardService';
import { transactionService } from '../services/transactionService';
import { CreditCardType, Transaction } from '../types';
import { PayCardBillModal, PayCardBillData } from '../components/modals/PayCardBillModal';
import { AddEditCardModal } from '../components/modals/AddEditCardModal';
import { formatCardTransactionDate } from '../utils/dateFormat';
import { TransactionIcon } from '../components/common/TransactionIcon';
import { useCategories } from '../contexts/CategoryContext';

type LegacyCreditCardFields = CreditCardType & { limit?: number; isMonthPaid?: boolean; expirationDate?: string; isMain?: boolean; isPrimary?: boolean; bankName?: string; };
type CardTab = 'Resumo' | 'Faturas' | 'Transações' | 'Limite' | 'Configurações';

const CARD_SCREEN_TYPE = {
  caption: 11,
  small: 12,
  secondary: 13,
  body: 14,
  button: 14,
  cardTitle: 16,
  sectionTitle: 18,
  screenTitle: 28,
  financialValue: 27,
};
const getPagePadding = (width: number) => width < 360 ? 16 : width < 400 ? 18 : 22;

const PRIMARY = '#5748FF';
const MASKED_CARD_DIGITS = '\u2022\u2022\u2022\u2022';
const TABS: CardTab[] = ['Resumo', 'Faturas', 'Transações', 'Limite', 'Configurações'];
const toFiniteNumber = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const getTimestamp = (tx: Transaction) => {
  const createdAt = tx.createdAt;
  if (typeof createdAt?.toMillis === 'function') return createdAt.toMillis();
  if (typeof createdAt?.seconds === 'number') return createdAt.seconds * 1000;
  return new Date(tx.date || 0).getTime() || 0;
};
const getCardDayLabel = (value: unknown, fallback = '10') => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(8, 10).replace(/^0/, '') || fallback;
  if (/^\d{1,2}\/\d{1,2}/.test(raw)) return raw.split('/')[0].replace(/^0/, '') || fallback;
  return raw.replace(/^0+(?=\d)/, '') || fallback;
};
const getDueMonthLabel = (day: string) => {
  const today = new Date();
  const dueDate = new Date(today.getFullYear(), today.getMonth(), Number(day) || today.getDate());
  return dueDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
};
const getBrandLabel = (brand?: string) => {
  const normalized = (brand || 'other').toLowerCase();
  if (normalized.includes('master')) return 'mastercard';
  if (normalized.includes('amex') || normalized.includes('american')) return 'AMEX';
  if (normalized.includes('hiper')) return 'HIPERCARD';
  if (normalized.includes('visa')) return 'VISA';
  if (normalized.includes('elo')) return 'ELO';
  return 'CARTÃO';
};
const getCardBgColor = (card: LegacyCreditCardFields, index: number) => {
  const color = card.color || card.colorClass || card.theme;
  if (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) return color;
  return ['#5B2CFF', '#1F1D2B', '#4B5563', '#0F766E', '#9A3412'][index % 5];
};
const getCardFinancials = (card: LegacyCreditCardFields, transactions: Transaction[]) => {
  const totalLimit = Math.max(0, toFiniteNumber(card.totalLimit ?? card.creditLimit ?? card.limit));
  const txTotal = transactions.reduce((total, tx) => tx.type === 'expense' && tx.cardId === card.id ? total + Math.abs(toFiniteNumber(tx.amount)) : total, 0);
  const usedLimit = Math.max(0, toFiniteNumber(card.usedLimit ?? txTotal));
  const usedPercent = totalLimit > 0 ? Math.min(Math.max((usedLimit / totalLimit) * 100, 0), 100) : 0;
  return { totalLimit, usedLimit, availableLimit: Math.max(0, totalLimit - usedLimit), usedPercent, availablePercent: totalLimit > 0 ? Math.max(0, 100 - usedPercent) : 0, isMonthPaid: card.isMonthPaid || false };
};

export const CardsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const { user, checkLimit, triggerUpgrade } = useAuth();
  const { categories } = useCategories();
  const listRef = useRef<FlatList<CreditCardType>>(null);
  const compactScreen = screenWidth < 360;
  const pagePadding = getPagePadding(screenWidth);
  const cardWidth = Math.min(276, Math.max(compactScreen ? 210 : 224, screenWidth * 0.62));
  const cardGap = compactScreen ? 14 : 18;
  const snapInterval = cardWidth + cardGap;
  const carouselPadding = Math.max(20, (screenWidth - cardWidth) / 2);
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<CardTab>('Resumo');
  const [loading, setLoading] = useState(true);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<CreditCardType | null>(null);
  const cardAccess = checkLimit('card');
  const activeCard = (cards[selectedCardIndex] || null) as LegacyCreditCardFields | null;

  useEffect(() => {
    if (!user) { setCards([]); setTransactions([]); setLoading(false); return; }
    const unsubCards = cardService.subscribeToCards((cardsList) => {
      setCards(cardsList);
      setSelectedCardIndex((current) => current >= cardsList.length ? Math.max(0, cardsList.length - 1) : current);
      setLoading(false);
    });
    const unsubTx = transactionService.subscribeToTransactions(setTransactions);
    return () => { unsubCards(); unsubTx(); };
  }, [user]);

  const cardTransactions = useMemo(() => transactions
    .filter((tx) => (tx.isCardCharge || tx.cardId) && (activeCard?.id ? tx.cardId === activeCard.id : true))
    .sort((a, b) => getTimestamp(b) - getTimestamp(a)), [transactions, activeCard?.id]);
  const latestCardTransactions = cardTransactions.slice(0, 5);
  const categoriesByName = useMemo(() => new Map(categories.map((category) => [category.name?.trim().toLowerCase(), category])), [categories]);
  const activeCardFinancials = activeCard ? getCardFinancials(activeCard, transactions) : null;
  const dueDay = activeCard ? getCardDayLabel(activeCard.dueDay ?? activeCard.dueDate ?? activeCard.bestDay) : '10';
  const bestPurchaseDay = activeCard ? getCardDayLabel(activeCard.bestDay) : '10';
  const holderName = (user?.displayName || user?.email?.split('@')[0] || 'NUMVRA').toUpperCase();

  const openAddCard = () => { setCardToEdit(null); setIsAddEditModalOpen(true); };
  const openEditCard = () => { if (activeCard) { setCardToEdit(activeCard); setIsAddEditModalOpen(true); } };

  const handlePayBillConfirm = async (data: PayCardBillData) => {
    if (!cardAccess.allowed) { triggerUpgrade?.('card', cardAccess.reason); return; }
    try {
      const paymentDate = new Date().toISOString().split('T')[0];
      const cardLabel = `${data.card.name} (${MASKED_CARD_DIGITS} ${data.card.finalDigits})`;
      await transactionService.addTransaction({ title: `Pagamento Fatura - ${data.card.name}`, description: `Pagamento Fatura - ${data.card.name}`, amount: -data.paidAmount, type: 'expense', category: 'Cart\u00E3o de Cr\u00E9dito', date: paymentDate, isCardCharge: false, cardId: data.card.id, cardName: cardLabel, status: 'completed' });
      if (data.isInstallmentRest && data.installmentCount && data.installmentValue) {
        for (let index = 0; index < data.installmentCount; index++) {
          const installmentDate = new Date();
          installmentDate.setMonth(installmentDate.getMonth() + index + 1);
          await transactionService.addTransaction({ title: `Parcelamento Fatura - ${data.card.name} (${index + 1}/${data.installmentCount})`, description: `Parcelamento Fatura - ${data.card.name}`, amount: -data.installmentValue, type: 'expense', category: 'Cart\u00E3o de Cr\u00E9dito', date: installmentDate.toISOString().split('T')[0], isCardCharge: true, cardId: data.card.id, cardName: cardLabel, installments: data.installmentCount, currentInstallment: index + 1, status: 'completed' });
        }
      }
      const finalUsedLimit = data.isInstallmentRest && data.installmentCount && data.installmentValue ? data.installmentCount * data.installmentValue : data.remainingAmount;
      await cardService.updateCard(data.card.id, { usedLimit: finalUsedLimit, isMonthPaid: finalUsedLimit === 0 } as Partial<LegacyCreditCardFields>);
      Alert.alert('Sucesso', 'Pagamento de fatura processado com sucesso!');
    } catch (err: any) { Alert.alert('Erro', err?.message || 'Falha ao processar pagamento.'); }
  };

  const handleSaveCard = async (cardData: Partial<CreditCardType>) => {
    if (!cardAccess.allowed) { triggerUpgrade?.('card', cardAccess.reason); return; }
    const legacy = cardData as Partial<LegacyCreditCardFields>;
    if (cardToEdit) await cardService.updateCard(cardToEdit.id, cardData);
    else await cardService.addCard({ name: cardData.name || 'Novo Cart\u00E3o', brand: cardData.brand || 'mastercard', finalDigits: cardData.finalDigits || '1234', expirationDate: legacy.expirationDate || '12/28', expiration: legacy.expirationDate || cardData.expiration || '12/28', bestDay: cardData.bestDay || 10, limit: legacy.limit || 1000, totalLimit: cardData.totalLimit || 1000, usedLimit: 0, isMonthPaid: false } as Omit<LegacyCreditCardFields, 'id'>);
  };

  const onCarouselEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
    setSelectedCardIndex(Math.max(0, Math.min(cards.length - 1, next)));
  };

  const renderPhysicalCard = ({ item, index }: { item: CreditCardType; index: number }) => {
    const card = item as LegacyCreditCardFields;
    const isSelected = selectedCardIndex === index;
    const isMainCard = card.isMain || card.isPrimary || index === 0;
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => { setSelectedCardIndex(index); listRef.current?.scrollToIndex({ index, animated: true }); }} style={[styles.carouselItem, { width: cardWidth, marginRight: index === cards.length - 1 ? 0 : cardGap, transform: [{ scale: isSelected ? 1 : 0.93 }], opacity: isSelected ? 1 : 0.78 }]} accessibilityLabel={`Cartão ${card.name}`}>
        <View style={[styles.creditCardVisual, { backgroundColor: getCardBgColor(card, index) }]}>
          <View style={styles.cardSheen} />
          <View style={styles.cardVisualTop}>{isMainCard ? <Text style={styles.mainCardBadge}>Cartão principal</Text> : <View />}<Text style={styles.brandGenericText}>{getBrandLabel(card.brand)}</Text></View>
          <Text style={styles.bankMark} numberOfLines={1}>{card.bankName || card.name || 'nu'}</Text>
          <View style={styles.cardDigitsRow}><Text style={styles.cardDigitsText}>{MASKED_CARD_DIGITS} {card.finalDigits || '1234'}</Text><View style={styles.cardChip}><View style={styles.chipLine} /><View style={styles.chipLine} /></View></View>
          <Text style={styles.cardHolderName} numberOfLines={1}>{holderName}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!cardAccess.allowed) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.lockedState}>
          <View style={styles.lockedIconWrap}><Lock size={34} color={PRIMARY} /></View>
          <Text style={[styles.lockedTitle, { color: colors.text }]}>Cartões indisponíveis</Text>
          <Text style={[styles.lockedText, { color: colors.textSecondary }]}>{cardAccess.reason || 'Atualize seu plano para gerenciar cartões.'}</Text>
          <TouchableOpacity style={styles.primaryButtonSmall} onPress={() => triggerUpgrade?.('card', cardAccess.reason)} activeOpacity={0.85}>
            <Text style={styles.primaryButtonSmallText}>Atualizar plano</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 78 + insets.bottom }]}>
        <View style={[styles.header, { paddingHorizontal: pagePadding }]}>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.text }]} maxFontSizeMultiplier={1.15}>Cartões</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} maxFontSizeMultiplier={1.2}>Gerencie seus cartões e tenha mais controle.</Text>
          </View>
          <TouchableOpacity style={[styles.addCardButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={openAddCard} activeOpacity={0.85}>
            <View style={styles.addCardIcon}><Plus size={18} color="#FFFFFF" strokeWidth={2.5} /></View>
            <Text style={styles.addCardText} maxFontSizeMultiplier={1.15}>Adicionar cartão</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingState}><ActivityIndicator color={PRIMARY} /></View>
        ) : cards.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CreditCard size={30} color={PRIMARY} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum cartão cadastrado</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Adicione seu primeiro cartão para acompanhar faturas e limites.</Text>
            <TouchableOpacity style={styles.primaryButtonSmall} onPress={openAddCard} activeOpacity={0.85}>
              <Text style={styles.primaryButtonSmallText}>Adicionar cartão</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              ref={listRef}
              data={cards}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={snapInterval}
              decelerationRate="fast"
              bounces={false}
              onMomentumScrollEnd={onCarouselEnd}
              renderItem={renderPhysicalCard}
              contentContainerStyle={{ paddingHorizontal: carouselPadding }}
              getItemLayout={(_, index) => ({ length: snapInterval, offset: snapInterval * index, index })}
            />
            <View style={styles.dotsRow}>
              {cards.map((card, index) => <View key={card.id} style={[styles.dot, selectedCardIndex === index && styles.dotActive]} />)}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabsRow, { paddingHorizontal: pagePadding }]}>
              {TABS.map((tab) => (
                <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} activeOpacity={0.85} style={[styles.tabPill, { backgroundColor: activeTab === tab ? PRIMARY : colors.surface }, activeTab === tab && styles.tabPillActive]}>
                  <Text style={[styles.tabText, { color: activeTab === tab ? '#FFFFFF' : colors.textSecondary }, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {activeCard && activeCardFinancials && (
              <View style={[styles.summaryCard, { marginHorizontal: pagePadding, padding: compactScreen ? 11 : 13, gap: compactScreen ? 7 : 8, backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.invoiceColumn}>
                  <Text style={[styles.sectionOverline, { color: colors.text }]}>Fatura atual</Text>
                  <Text style={[styles.invoiceAmount, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>{formatCurrency(activeCardFinancials.usedLimit)}</Text>
                  <Text style={[styles.invoiceDue, { color: colors.textSecondary }]}>Vence em {getDueMonthLabel(dueDay)}</Text>
                  <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}><View style={[styles.progressFill, { width: `${activeCardFinancials.usedPercent}%` }]} /></View>
                  <View style={styles.limitsRow}>
                    <View style={styles.limitBlock}>
                      <Text style={[styles.limitLabel, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>Utilizado</Text>
                      <Text style={[styles.limitValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>{formatCurrency(activeCardFinancials.usedLimit)}</Text>
                      <View style={styles.limitMetaRow}>
                        <Text style={[styles.limitMeta, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>de {formatCurrency(activeCardFinancials.totalLimit)}</Text>
                        <Text style={styles.usedPercent}>{Math.round(activeCardFinancials.usedPercent)}%</Text>
                      </View>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.limitBlock}>
                      <Text style={[styles.limitLabel, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>Disponível</Text>
                      <Text style={[styles.limitValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>{formatCurrency(activeCardFinancials.availableLimit)}</Text>
                      <View style={styles.limitMetaRow}><View /><Text style={styles.availablePercent}>{Math.round(activeCardFinancials.availablePercent)}%</Text></View>
                    </View>
                  </View>
                </View>
                <View style={styles.dateColumn}>
                  <View style={styles.dateInfoRow}>
                    <View style={styles.dateIconBox}><CalendarDays size={compactScreen ? 18 : 20} color={PRIMARY} /></View>
                    <View style={styles.dateTextWrap}>
                      <Text style={[styles.dateLabel, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>Melhor dia de compra</Text>
                      <Text style={[styles.dateValue, { color: colors.text }]}>Dia {bestPurchaseDay}</Text>
                      {/* <Text style={[styles.dateMeta, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>Mais dias para pagar</Text> */}
                    </View>
                  </View>
                  <View style={styles.dateDivider} />
                  <View style={styles.dateInfoRow}>
                    <View style={styles.dateIconBox}><CreditCard size={compactScreen ? 18 : 20} color={PRIMARY} /></View>
                    <View style={styles.dateTextWrap}>
                      <Text style={[styles.dateLabel, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>Dia de vencimento</Text>
                      <Text style={[styles.dateValue, { color: colors.text }]}>Dia {dueDay}</Text>
                      {/* <Text style={[styles.dateMeta, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>Todo mês</Text> */}
                    </View>
                  </View>
                </View>
              </View>
            )}

            <View style={[styles.quickActionsRow, { paddingHorizontal: pagePadding, gap: compactScreen ? 8 : 12 }]}>
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surface }]} onPress={() => setIsPayModalOpen(true)} activeOpacity={0.85}>
                <FileText size={compactScreen ? 23 : 25} color={PRIMARY} />
                <Text style={[styles.quickActionText, { color: colors.text }]}>Pagar fatura</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surface }]} onPress={openEditCard} activeOpacity={0.85}>
                <PieChart size={compactScreen ? 23 : 25} color={PRIMARY} />
                <Text style={[styles.quickActionText, { color: colors.text }]}>Ajustar limite</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surface }]} activeOpacity={0.85}>
                <Lock size={compactScreen ? 23 : 25} color={PRIMARY} />
                <Text style={[styles.quickActionText, { color: colors.text }]}>Bloquear cartão</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surface }]} onPress={openEditCard} activeOpacity={0.85}>
                <Settings size={compactScreen ? 23 : 25} color={PRIMARY} />
                <Text style={[styles.quickActionText, { color: colors.text }]}>Configurações</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.transactionsCard, { marginHorizontal: pagePadding, backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Últimas transações</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Statement')} activeOpacity={0.85}>
                  <Text style={styles.viewAllText}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              {latestCardTransactions.length === 0 ? (
                <Text style={[styles.noTransactionsText, { color: colors.textSecondary }]}>Nenhuma transação encontrada para este cartão.</Text>
              ) : latestCardTransactions.map((tx, index) => (
                <TouchableOpacity key={tx.id || `${tx.title}-${index}`} style={[styles.transactionRow, { borderBottomColor: colors.border }, index === latestCardTransactions.length - 1 && styles.transactionRowLast]} activeOpacity={0.8}>
                  <TransactionIcon
                    transaction={tx}
                    icon={tx.icon || categoriesByName.get(tx.category?.trim().toLowerCase())?.icon || 'tag'}
                    category={tx.category}
                    categoryColor={tx.categoryColor || categoriesByName.get(tx.category?.trim().toLowerCase())?.color}
                    type={tx.type}
                  />
                  <View style={styles.transactionInfo}>
                    <Text style={[styles.transactionTitle, { color: colors.text }]} numberOfLines={1}>{tx.title}</Text>
                    <Text style={[styles.transactionDate, { color: colors.textSecondary }]} numberOfLines={1}>{formatCardTransactionDate(tx.date)}</Text>
                  </View>
                  <Text style={[styles.transactionAmount, { color: colors.text }]}>{formatCurrency(Math.abs(toFiniteNumber(tx.amount)))}</Text>
                  <ChevronRight size={19} color={colors.text} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.tipCard, { marginHorizontal: pagePadding, backgroundColor: colors.primaryLight }]} activeOpacity={0.85}>
              <View style={[styles.tipIconBox, { backgroundColor: colors.surfaceVariant }]}><Lightbulb size={26} color={PRIMARY} /></View>
              <View style={styles.tipTextWrap}>
                <Text style={styles.tipTitle}>Dica do Numvra</Text>
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>Concentre seus gastos no melhor dia de compra e tenha mais tempo para pagar a fatura.</Text>
              </View>
              <ChevronRight size={22} color={PRIMARY} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {activeCard && activeCardFinancials && (
        <PayCardBillModal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          card={{ ...activeCard, usedLimit: activeCardFinancials.usedLimit }}
          onConfirm={handlePayBillConfirm}
        />
      )}
      <AddEditCardModal isOpen={isAddEditModalOpen} onClose={() => setIsAddEditModalOpen(false)} onSubmit={handleSaveCard} cardToEdit={cardToEdit} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 10 },
  header: { marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  headerTextWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: CARD_SCREEN_TYPE.screenTitle, lineHeight: 32, fontWeight: '700', letterSpacing: 0 },
  subtitle: { marginTop: 1, fontSize: CARD_SCREEN_TYPE.secondary, lineHeight: 18, fontWeight: '400' },
  addCardButton: { marginTop: 2, height: 42, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#DDDDFC', backgroundColor: '#FAFAFF', flexDirection: 'row', alignItems: 'center', gap: 8 },
  addCardIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY },
  addCardText: { color: PRIMARY, fontSize: CARD_SCREEN_TYPE.secondary, lineHeight: 18, fontWeight: '500' },
  loadingState: { minHeight: 280, alignItems: 'center', justifyContent: 'center' },
  emptyState: { marginHorizontal: 18, marginTop: 24, padding: 20, borderRadius: 18, borderWidth: 1, borderColor: '#E3E5F1', alignItems: 'center', backgroundColor: '#FFFFFF' },
  emptyTitle: { marginTop: 10, fontSize: CARD_SCREEN_TYPE.cardTitle, fontWeight: '700' },
  emptyText: { marginTop: 4, fontSize: CARD_SCREEN_TYPE.secondary, lineHeight: 18, textAlign: 'center' },
  lockedState: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  lockedIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F0EEFF', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  lockedTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  lockedText: { marginTop: 6, fontSize: CARD_SCREEN_TYPE.body, lineHeight: 20, textAlign: 'center' },
  primaryButtonSmall: { marginTop: 14, height: 44, paddingHorizontal: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY },
  primaryButtonSmallText: { color: '#FFFFFF', fontSize: CARD_SCREEN_TYPE.button, fontWeight: '700' },
  carouselItem: { aspectRatio: 1.586, marginBottom: 10 },
  creditCardVisual: { flex: 1, borderRadius: 17, overflow: 'hidden', padding: 18, shadowColor: '#3324C7', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 7 },
  cardSheen: { position: 'absolute', top: -62, right: -28, width: 150, height: 230, borderRadius: 80, transform: [{ rotate: '24deg' }], backgroundColor: 'rgba(255,255,255,0.12)' },
  cardVisualTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mainCardBadge: { maxWidth: 124, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, overflow: 'hidden', color: '#FFFFFF', fontSize: CARD_SCREEN_TYPE.small, lineHeight: 16, fontWeight: '600', backgroundColor: 'rgba(255,255,255,0.16)' },
  brandGenericText: { color: '#FFFFFF', fontSize: 24, lineHeight: 28, fontWeight: '900', fontStyle: 'italic' },
  bankMark: { marginTop: 20, color: '#FFFFFF', fontSize: CARD_SCREEN_TYPE.cardTitle, lineHeight: 20, fontWeight: '900', letterSpacing: 0 },
  cardDigitsRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardDigitsText: { color: '#FFFFFF', fontSize: 18, lineHeight: 23, fontWeight: '700' },
  cardChip: { width: 39, height: 29, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'space-evenly', paddingHorizontal: 5 },
  chipLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.55)' },
  cardHolderName: { marginTop: 'auto', color: '#FFFFFF', fontSize: CARD_SCREEN_TYPE.small, lineHeight: 16, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 0, marginBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E3E4F3' },
  dotActive: { width: 9, height: 9, borderRadius: 5, backgroundColor: PRIMARY },
  tabsRow: { gap: 8, paddingBottom: 12 },
  tabPill: { height: 44, minWidth: 88, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#F6F7FC', alignItems: 'center', justifyContent: 'center' },
  tabPillActive: { backgroundColor: PRIMARY, shadowColor: '#3B2DDB', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  tabText: { color: '#6F7894', fontSize: CARD_SCREEN_TYPE.small, lineHeight: 16, fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '600' },
  summaryCard: { marginHorizontal: 18, borderRadius: 17, borderWidth: 1, borderColor: '#E5E7F3', backgroundColor: '#FFFFFF', padding: 13, flexDirection: 'row', gap: 8, shadowColor: '#8792B4', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  invoiceColumn: { flex: 0.98, minWidth: 0 },
  sectionOverline: { color: '#111733', fontSize: CARD_SCREEN_TYPE.secondary, lineHeight: 17, fontWeight: '500', marginBottom: 4 },
  invoiceAmount: { fontSize: CARD_SCREEN_TYPE.financialValue, lineHeight: 32, fontWeight: '700' },
  invoiceDue: { fontSize: CARD_SCREEN_TYPE.small, lineHeight: 16, fontWeight: '400' },
  progressTrack: { marginTop: 8, height: 7, borderRadius: 7, overflow: 'hidden', backgroundColor: '#ECEEF6' },
  progressFill: { height: '100%', borderRadius: 7, backgroundColor: PRIMARY },
  limitsRow: { marginTop: 12, flexDirection: 'row', alignItems: 'stretch' },
  limitBlock: { flex: 1, minWidth: 0 },
  limitLabel: { fontSize: CARD_SCREEN_TYPE.caption, lineHeight: 14, fontWeight: '400' },
  limitValue: { marginTop: 3, fontSize: CARD_SCREEN_TYPE.cardTitle, lineHeight: 20, fontWeight: '700' },
  limitMeta: { flex: 1, marginTop: 1, fontSize: CARD_SCREEN_TYPE.caption, lineHeight: 14, fontWeight: '400' },
  limitMetaRow: { minHeight: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  usedPercent: { marginTop: 1, color: PRIMARY, fontSize: CARD_SCREEN_TYPE.secondary, lineHeight: 17, fontWeight: '700' },
  availablePercent: { marginTop: 1, color: '#14B85A', fontSize: CARD_SCREEN_TYPE.secondary, lineHeight: 17, fontWeight: '700' },
  verticalDivider: { width: 1, marginHorizontal: 8, backgroundColor: '#E2E5F0' },
  dateColumn: { flex: 1.02, borderLeftWidth: 1, borderLeftColor: '#E4E7F2', paddingLeft: 9, justifyContent: 'center' },
  dateInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dateIconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#F2F1FF', alignItems: 'center', justifyContent: 'center' },
  dateTextWrap: { flex: 1, minWidth: 0 },
  dateLabel: { fontSize: CARD_SCREEN_TYPE.caption, lineHeight: 14, fontWeight: '400' },
  dateValue: { marginTop: 1, fontSize: CARD_SCREEN_TYPE.cardTitle, lineHeight: 20, fontWeight: '700' },
  dateMeta: { marginTop: 1, fontSize: CARD_SCREEN_TYPE.caption, lineHeight: 14, fontWeight: '400' },
  dateDivider: { height: 1, backgroundColor: '#E4E7F2', marginVertical: 13 },
  quickActionsRow: { paddingHorizontal: 18, marginTop: 14, flexDirection: 'row', gap: 12 },
  quickAction: { flex: 1, height: 76, borderRadius: 14, backgroundColor: '#F8F8FD', alignItems: 'center', justifyContent: 'center', gap: 7 },
  quickActionText: { fontSize: CARD_SCREEN_TYPE.small, lineHeight: 16, fontWeight: '500', textAlign: 'center' },
  transactionsCard: { marginHorizontal: 18, marginTop: 14, borderRadius: 17, borderWidth: 1, borderColor: '#E5E7F3', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, shadowColor: '#8792B4', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: CARD_SCREEN_TYPE.sectionTitle, lineHeight: 23, fontWeight: '700' },
  viewAllText: { color: PRIMARY, fontSize: CARD_SCREEN_TYPE.secondary, lineHeight: 17, fontWeight: '500' },
  noTransactionsText: { paddingVertical: 16, fontSize: CARD_SCREEN_TYPE.secondary, lineHeight: 18, textAlign: 'center' },
  transactionRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEF0F7', gap: 10 },
  transactionRowLast: { borderBottomWidth: 0 },
  transactionIconBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#F4F5FA', alignItems: 'center', justifyContent: 'center' },
  transactionInfo: { flex: 1, minWidth: 0 },
  transactionTitle: { fontSize: CARD_SCREEN_TYPE.body, lineHeight: 18, fontWeight: '600' },
  transactionDate: { marginTop: 1, fontSize: CARD_SCREEN_TYPE.small, lineHeight: 16, fontWeight: '400' },
  transactionAmount: { minWidth: 82, textAlign: 'right', fontSize: CARD_SCREEN_TYPE.body, lineHeight: 18, fontWeight: '600' },
  tipCard: { marginHorizontal: 18, marginTop: 18, minHeight: 76, borderRadius: 17, backgroundColor: '#F2F0FF', paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tipIconBox: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#ECE9FF', alignItems: 'center', justifyContent: 'center' },
  tipTextWrap: { flex: 1, minWidth: 0 },
  tipTitle: { color: PRIMARY, fontSize: CARD_SCREEN_TYPE.body, lineHeight: 18, fontWeight: '600' },
  tipText: { marginTop: 2, fontSize: CARD_SCREEN_TYPE.small, lineHeight: 16, fontWeight: '400' },
});
