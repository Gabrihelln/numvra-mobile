import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  CreditCard,
  Plus,
  Eye,
  EyeOff,
  TrendingDown,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Utensils,
  Music,
  Smartphone,
  Home,
  Globe,
  Trash2,
  Edit2,
  Wifi,
  Lock,
} from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { cardService } from '../services/cardService';
import { transactionService } from '../services/transactionService';
import { CreditCardType, Transaction } from '../types';
import { PayCardBillModal, PayCardBillData } from '../components/modals/PayCardBillModal';
import { AddEditCardModal } from '../components/modals/AddEditCardModal';
import { spacing, borderRadius, typography } from '../theme';
import { formatBrazilianDate } from '../utils/dateFormat';

type LegacyCreditCardFields = CreditCardType & {
  limit?: number;
  isMonthPaid?: boolean;
  expirationDate?: string;
};

type LegacyTransactionFields = Transaction & {
  installmentTotal?: number;
  installmentNumber?: number;
  installmentAmount?: number;
};

const toFiniteNumber = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};
export const CardsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const CARD_WIDTH = screenWidth - spacing.lg * 2;
  const CARD_GAP = spacing.md;
  const CARD_ITEM_WIDTH = CARD_WIDTH + CARD_GAP;
  const { colors, isDarkMode } = useTheme();
  const { user, checkLimit, triggerUpgrade } = useAuth();

  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [showValues, setShowValues] = useState(true);
  const [loading, setLoading] = useState(true);

  // Modais
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<CreditCardType | null>(null);

  useEffect(() => {
    if (!user) {
      setCards([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    const unsubCards = cardService.subscribeToCards((cardsList) => {
      setCards(cardsList);
      setSelectedCardIndex((currentIndex) =>
        currentIndex >= cardsList.length ? Math.max(0, cardsList.length - 1) : currentIndex
      );
      setLoading(false);
    });

    const unsubTx = transactionService.subscribeToTransactions((txList) => {
      setTransactions(txList);
    });

    return () => {
      unsubCards();
      unsubTx();
    };
  }, [user]);

  const activeCard = (cards[selectedCardIndex] || null) as LegacyCreditCardFields | null;
  const cardAccess = checkLimit('card');

  const toFiniteNumber = (value: unknown) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  const cardTransactions = useMemo(
    () =>
      transactions.filter(
        (tx) =>
          (tx.isCardCharge || tx.cardId) &&
          (activeCard?.id ? tx.cardId === activeCard.id : true)
      ),
    [transactions, activeCard?.id]
  );

  const cardChargeTotal = useMemo(
    () =>
      cardTransactions.reduce((total, tx) => {
        if (tx.type !== 'expense') return total;
        return total + Math.abs(toFiniteNumber(tx.amount));
      }, 0),
    [cardTransactions]
  );

  // Lógica de cálculo de fatura e limites
  const rawUsedLimit = activeCard?.usedLimit;
  const usedLimit = Math.max(0, toFiniteNumber(rawUsedLimit ?? cardChargeTotal));
  const totalLimit = Math.max(
    0,
    toFiniteNumber(activeCard?.totalLimit ?? activeCard?.creditLimit ?? activeCard?.limit)
  );
  const availableLimit = Math.max(0, totalLimit - usedLimit);
  const limitUsedPercent = totalLimit > 0
    ? Math.min(Math.max((usedLimit / totalLimit) * 100, 0), 100)
    : 0;
  const limitUsedPercentLabel = Math.round(limitUsedPercent);
  const isMonthPaid = activeCard?.isMonthPaid || false;
  const latestCardTransactions = cardTransactions.slice(0, 10);
  // Handlers de Ações
  const handlePayBillConfirm = async (data: PayCardBillData) => {
    if (!cardAccess.allowed) {
      triggerUpgrade?.('card', cardAccess.reason);
      return;
    }

    try {
            const paymentDate = new Date().toISOString().split('T')[0];
      const cardLabel = `${data.card.name} (•••• ${data.card.finalDigits})`;

      await transactionService.addTransaction({
        title: `Pagamento Fatura - ${data.card.name}`,
        description: `Pagamento Fatura - ${data.card.name}`,
        amount: -data.paidAmount,
        type: 'expense',
        category: 'Cartão de Crédito',
        date: paymentDate,
        isCardCharge: false,
        cardId: data.card.id,
        cardName: cardLabel,
        status: 'completed',
      });

      if (data.isInstallmentRest && data.installmentCount && data.installmentValue) {
        for (let index = 0; index < data.installmentCount; index++) {
          const installmentDate = new Date();
          installmentDate.setMonth(installmentDate.getMonth() + index + 1);

          await transactionService.addTransaction({
            title: `Parcelamento Fatura - ${data.card.name} (${index + 1}/${data.installmentCount})`,
            description: `Parcelamento Fatura - ${data.card.name}`,
            amount: -data.installmentValue,
            type: 'expense',
            category: 'Cartão de Crédito',
            date: installmentDate.toISOString().split('T')[0],
            isCardCharge: true,
            cardId: data.card.id,
            cardName: cardLabel,
            installments: data.installmentCount,
            currentInstallment: index + 1,
            status: 'completed',
          });
        }
      }

      const finalUsedLimit = data.isInstallmentRest && data.installmentCount && data.installmentValue
        ? data.installmentCount * data.installmentValue
        : data.remainingAmount;

      await cardService.updateCard(data.card.id, {
        usedLimit: finalUsedLimit,
        isMonthPaid: finalUsedLimit === 0,
      } as Partial<LegacyCreditCardFields>);

      Alert.alert('Sucesso', 'Pagamento de fatura processado com sucesso!');
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Falha ao processar pagamento.');
    }
  };

  const handleSaveCard = async (cardData: Partial<CreditCardType>) => {
    if (!cardAccess.allowed) {
      triggerUpgrade?.('card', cardAccess.reason);
      return;
    }

    const legacyCardData = cardData as Partial<LegacyCreditCardFields>;
    if (cardToEdit) {
      await cardService.updateCard(cardToEdit.id, cardData);
    } else {
      await cardService.addCard({
        name: cardData.name || 'Novo Cartão',
        brand: cardData.brand || 'mastercard',
        finalDigits: cardData.finalDigits || '1234',
        expirationDate: legacyCardData.expirationDate || '12/28',
        expiration: legacyCardData.expirationDate || cardData.expiration || '12/28',
        bestDay: cardData.bestDay || 10,
        limit: legacyCardData.limit || 1000,
        totalLimit: cardData.totalLimit || 1000,
        usedLimit: 0,
        isMonthPaid: false,
      } as Omit<LegacyCreditCardFields, 'id'>);
    }
  };

  const handleDeleteCard = (card: CreditCardType) => {
    if (!cardAccess.allowed) {
      triggerUpgrade?.('card', cardAccess.reason);
      return;
    }

    Alert.alert(
      'Excluir Cartão',
      `Deseja realmente remover o cartão "${card.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await cardService.deleteCard(card.id);
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível excluir o cartão.');
            }
          },
        },
      ]
    );
  };

  // Helper para renderizar ícone de categoria
  const renderTxCategoryIcon = (category: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('shop') || cat.includes('compra')) return <ShoppingBag size={18} color="#f97316" />;
    if (cat.includes('rest') || cat.includes('comida') || cat.includes('ifood')) return <Utensils size={18} color="#3b82f6" />;
    if (cat.includes('spotify') || cat.includes('música') || cat.includes('show')) return <Music size={18} color="#10b981" />;
    if (cat.includes('tecn') || cat.includes('eletr')) return <Smartphone size={18} color="#8b5cf6" />;
    if (cat.includes('casa') || cat.includes('home')) return <Home size={18} color="#ec4899" />;
    return <Globe size={18} color="#6C5CE7" />;
  };

  // Helper para cor de gradiente do cartão físico
  const getCardBgColor = (brand: string, index: number) => {
    const themes = [
      '#4C1D95', // Nubank Ultravioleta Roxo Profundo
      '#065F46', // Emerald Green
      '#1E293B', // Slate Titanium
      '#9A3412', // Amber Sunset
    ];
    return themes[index % themes.length];
  };

  if (!cardAccess.allowed) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.headerFixed,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Cartões de Crédito
          </Text>
          <View style={styles.addCardHeaderBtn} />
        </View>

        <View style={styles.lockedContainer}>
          <View style={[styles.lockedIconBox, { backgroundColor: isDarkMode ? '#1e1b4b' : '#e0e7ff' }]}>
            <Lock size={34} color="#6C5CE7" />
          </View>
          <Text style={[styles.lockedTitle, { color: colors.text }]}>
            Recurso Premium
          </Text>
          <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
            {cardAccess.reason}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Plan')}
            style={styles.lockedButton}
            activeOpacity={0.8}
          >
            <Text style={styles.lockedButtonText}>Ver planos</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header Superior Fixo */}
      <View
        style={[
          styles.headerFixed,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Cartões de Crédito
        </Text>
        <TouchableOpacity
          onPress={() => {
            setCardToEdit(null);
            setIsAddEditModalOpen(true);
          }}
          style={styles.addCardHeaderBtn}
          activeOpacity={0.7}
        >
          <Plus size={20} color="#6C5CE7" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Carrossel de Cartões Físicos / Virtuais */}
        {cards.length > 0 ? (
          <View style={styles.cardsCarouselSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_ITEM_WIDTH}
              decelerationRate="fast"
              disableIntervalMomentum
              contentContainerStyle={styles.cardsScrollTrack}
              onMomentumScrollEnd={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const newIdx = Math.round(offsetX / CARD_ITEM_WIDTH);
                if (newIdx >= 0 && newIdx < cards.length) {
                  setSelectedCardIndex(newIdx);
                }
              }}
            >
              {cards.map((card, idx) => {
                const isSelected = selectedCardIndex === idx;
                const cardBg = getCardBgColor(card.brand, idx);

                return (
                  <TouchableOpacity
                    key={card.id}
                    onPress={() => setSelectedCardIndex(idx)}
                    activeOpacity={0.9}
                    style={[
                      styles.creditCardVisual,
                      {
                        backgroundColor: cardBg,
                        width: CARD_WIDTH,
                      },
                    ]}
                  >
                    {/* Top Row: Tag e NFC */}
                    <View style={styles.cardVisualTop}>
                      <View style={styles.cardSelectedTag}>
                        <Text style={styles.cardSelectedTagText}>
                          {isSelected ? 'CARTÃO SELECIONADO' : 'CLIQUE PARA SELECIONAR'}
                        </Text>
                      </View>
                      <Wifi size={20} color="rgba(255,255,255,0.7)" />
                    </View>

                    {/* Chip Metálico */}
                    <View style={styles.chipVisual}>
                      <View style={styles.chipInnerGrid} />
                    </View>

                    {/* Número mascarado */}
                    <Text style={styles.cardDigitsText}>
                      ••••  ••••  ••••  {card.finalDigits || '1234'}
                    </Text>

                    {/* Bottom Row: Nome, Validade e Bandeira */}
                    <View style={styles.cardVisualBottom}>
                      <View>
                        <Text style={styles.cardHolderName}>{card.name}</Text>
                        <View style={styles.cardDatesRow}>
                          <Text style={styles.cardDateInfo}>
                            EXP: {(card as LegacyCreditCardFields).expirationDate || '12/28'}
                          </Text>
                          <Text style={styles.cardDateInfo}>
                            MELHOR DIA: {card.bestDay || '10'}
                          </Text>
                        </View>
                      </View>

                      {/* Brand Tag / Logo */}
                      <View style={styles.brandBadgeWrapper}>
                        {card.brand === 'mastercard' ? (
                          <View style={styles.mastercardCircles}>
                            <View style={[styles.mcCircle, { backgroundColor: '#eb001b' }]} />
                            <View style={[styles.mcCircle, { backgroundColor: '#f79e1b', marginLeft: -10 }]} />
                          </View>
                        ) : (
                          <Text style={styles.brandGenericText}>
                            {(card.brand || 'CARD').toUpperCase()}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Dots Indicator & Ações do Cartão Selecionado */}
            <View style={styles.cardActionsBar}>
              {/* Dots */}
              <View style={styles.dotsRow}>
                {cards.map((_, dotIdx) => (
                  <View
                    key={dotIdx}
                    style={[
                      styles.dot,
                      selectedCardIndex === dotIdx
                        ? { backgroundColor: '#6C5CE7', width: 20 }
                        : { backgroundColor: colors.border },
                    ]}
                  />
                ))}
              </View>

              {/* Botões Editar / Excluir */}
              {activeCard && (
                <View style={styles.cardEditActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setCardToEdit(activeCard);
                      setIsAddEditModalOpen(true);
                    }}
                    style={styles.cardActionIconBtn}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteCard(activeCard)}
                    style={styles.cardActionIconBtn}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ) : !loading ? (
          /* Estado Vazio de Cartões */
          <TouchableOpacity
            onPress={() => {
              setCardToEdit(null);
              setIsAddEditModalOpen(true);
            }}
            style={[
              styles.emptyCardDashed,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
            activeOpacity={0.8}
          >
            <View style={[styles.emptyCardIconBox, { backgroundColor: isDarkMode ? '#1e1b4b' : '#e0e7ff' }]}>
              <CreditCard size={32} color="#6C5CE7" />
            </View>
            <Text style={[styles.emptyCardTitle, { color: colors.text }]}>
              Nenhum cartão cadastrado
            </Text>
            <Text style={[styles.emptyCardSubtitle, { color: colors.textSecondary }]}>
              Cadastre seu cartão para controlar faturas, limites e datas de corte automaticamente.
            </Text>
            <View style={[styles.addFirstCardBtn, { backgroundColor: '#6C5CE7' }]}>
              <Plus size={16} color="#ffffff" />
              <Text style={styles.addFirstCardText}>Cadastrar Primeiro Cartão</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Card: Fatura Atual */}
        {activeCard && (
          <View
            style={[
              styles.infoCardBlock,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Top Row Fatura */}
            <View style={styles.infoCardTopRow}>
              <View style={styles.iconAndTitleRow}>
                <View style={[styles.headerIconBadge, { backgroundColor: isDarkMode ? '#1e1b4b' : '#e0e7ff' }]}>
                  <CreditCard size={18} color="#6C5CE7" />
                </View>
                <View>
                  <Text style={[styles.infoBlockTitle, { color: colors.text }]}>
                    Fatura Atual
                  </Text>
                  <Text style={[styles.infoBlockSubtitle, { color: colors.textSecondary }]}>
                    Total a pagar
                  </Text>
                </View>
              </View>

              <View style={styles.infoCardTopRight}>
                <TouchableOpacity
                  onPress={() => setShowValues(!showValues)}
                  style={styles.eyeToggleBtn}
                  activeOpacity={0.7}
                >
                  {showValues ? (
                    <Eye size={18} color={colors.textSecondary} />
                  ) : (
                    <EyeOff size={18} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isMonthPaid
                        ? 'rgba(16, 185, 129, 0.15)'
                        : usedLimit > 0
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(16, 185, 129, 0.15)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color: isMonthPaid
                          ? '#10b981'
                          : usedLimit > 0
                          ? '#f59e0b'
                          : '#10b981',
                      },
                    ]}
                  >
                    {isMonthPaid ? 'Paga' : usedLimit > 0 ? 'Aberta' : 'Zerada'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Valor da Fatura */}
            <Text style={[styles.largeAmountText, { color: colors.text }]}>
              {showValues
                ? `R$ ${usedLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : 'R$ ••••••'}
            </Text>

            {/* Grid 2 colunas: Melhor dia e Status */}
            <View style={styles.twoColsCardGrid}>
              <View
                style={[
                  styles.smallStatCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.smallStatLabel, { color: colors.textSecondary }]}>
                  MELHOR DIA DE COMPRA
                </Text>
                <Text style={[styles.smallStatValue, { color: colors.text }]}>
                  Dia {activeCard.bestDay || '10'}
                </Text>
              </View>

              <View
                style={[
                  styles.smallStatCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.smallStatLabel, { color: colors.textSecondary }]}>
                  STATUS DO PAGAMENTO
                </Text>
                <Text
                  style={[
                    styles.smallStatValue,
                    { color: isMonthPaid ? '#10b981' : '#f59e0b' },
                  ]}
                >
                  {isMonthPaid ? 'Fatura paga' : usedLimit > 0 ? 'Em aberto' : 'Em dia'}
                </Text>
              </View>
            </View>

            {/* Botão Pagar Fatura */}
            {usedLimit > 0 && !isMonthPaid && (
              <TouchableOpacity
                onPress={() => setIsPayModalOpen(true)}
                style={[styles.payBillButton, { backgroundColor: '#6C5CE7' }]}
                activeOpacity={0.8}
              >
                <CreditCard size={18} color="#ffffff" />
                <Text style={styles.payBillButtonText}>Pagar Fatura</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Card: Limite Disponível */}
        {activeCard && (
          <View
            style={[
              styles.infoCardBlock,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.iconAndTitleRow}>
              <View
                style={[
                  styles.headerIconBadge,
                  { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5' },
                ]}
              >
                <TrendingDown size={18} color="#10b981" />
              </View>
              <View>
                <Text style={[styles.infoBlockTitle, { color: colors.text }]}>
                  Limite Disponível
                </Text>
                <Text style={[styles.infoBlockSubtitle, { color: colors.textSecondary }]}>
                  Disponível para compras
                </Text>
              </View>
            </View>

            {/* Valor Disponível */}
            <Text style={[styles.largeAmountText, { color: colors.text }]}>
              {showValues
                ? `R$ ${availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : 'R$ ••••••'}
            </Text>

            {/* Barra de Progresso de Limite Utilizado */}
            <View
              style={[
                styles.limitProgressTrack,
                { backgroundColor: isDarkMode ? '#27272a' : '#f3f4f6' },
              ]}
            >
              <View
                style={[
                  styles.limitProgressBar,
                  {
                    width: `${limitUsedPercent}%`,
                    backgroundColor: limitUsedPercent > 80 ? '#ef4444' : '#6C5CE7',
                  },
                ]}
              />
            </View>

            {/* Grid 2 colunas: Limite Total e Utilizado */}
            <View style={styles.twoColsCardGrid}>
              <View
                style={[
                  styles.smallStatCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.smallStatLabel, { color: colors.textSecondary }]}>
                  LIMITE TOTAL
                </Text>
                <Text style={[styles.smallStatValue, { color: colors.text }]}>
                  {showValues
                    ? `R$ ${totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '••••••'}
                </Text>
              </View>

              <View
                style={[
                  styles.smallStatCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.smallStatLabel, { color: colors.textSecondary }]}>
                  UTILIZADO
                </Text>
                <Text style={[styles.smallStatValue, { color: colors.text }]}>
                  {showValues
                    ? `R$ ${usedLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${limitUsedPercentLabel}%)`
                    : '••••••'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Últimos Lançamentos do Cartão */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Últimos Lançamentos
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

        {/* Lista de Transações */}
        {latestCardTransactions.length > 0 ? (
          <View style={styles.transactionsList}>
            {latestCardTransactions.map((tx) => (
              <View
                key={tx.id}
                style={[
                  styles.transactionItemCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.txLeft}>
                  <View
                    style={[
                      styles.txIconSquare,
                      { backgroundColor: isDarkMode ? '#27272a' : '#f3f4f6' },
                    ]}
                  >
                    {renderTxCategoryIcon(tx.category)}
                  </View>
                  <View>
                    <Text style={[styles.txTitle, { color: colors.text }]}>
                      {tx.description}
                    </Text>
                    <View style={styles.txSubRow}>
                      <Text style={[styles.txDate, { color: colors.textSecondary }]}>
                        {formatBrazilianDate(tx.date)}
                      </Text>
                      {(tx as LegacyTransactionFields).installmentTotal && (tx as LegacyTransactionFields).installmentTotal! > 1 ? (
                        <View style={styles.installmentBadge}>
                          <Text style={styles.installmentBadgeText}>
                            {(tx as LegacyTransactionFields).installmentNumber || 1}/{(tx as LegacyTransactionFields).installmentTotal ?? 0}x
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                <Text style={[styles.txAmount, { color: colors.text }]}>
                  - R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.emptyTransactionsCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Sparkles size={24} color="#6C5CE7" />
            <Text style={[styles.emptyTxText, { color: colors.textSecondary }]}>
              Nenhum lançamento no cartão neste período.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal Pagamento de Fatura */}
      <PayCardBillModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        card={activeCard}
        onConfirm={handlePayBillConfirm}
      />

      {/* Modal Adicionar / Editar Cartão */}
      <AddEditCardModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setCardToEdit(null);
        }}
        onSubmit={handleSaveCard}
        cardToEdit={cardToEdit}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.h3,
  },
  addCardHeaderBtn: {
    padding: spacing.xs,
  },
  cardsCarouselSection: {
    gap: spacing.md,
  },
  cardsScrollTrack: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  creditCardVisual: {
    height: 200,
    borderRadius: 24,
    padding: spacing.lg,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  cardVisualTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSelectedTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardSelectedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  chipVisual: {
    width: 38,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#eab308',
    borderWidth: 1,
    borderColor: '#ca8a04',
    padding: 3,
    justifyContent: 'center',
  },
  chipInnerGrid: {
    width: '100%',
    height: 1,
    backgroundColor: '#ca8a04',
  },
  cardDigitsText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  cardVisualBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardHolderName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  cardDatesRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 2,
  },
  cardDateInfo: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  brandBadgeWrapper: {
    justifyContent: 'center',
  },
  mastercardCircles: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mcCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  brandGenericText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
  cardActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardEditActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cardActionIconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  emptyCardDashed: {
    width: '100%',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyCardIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCardSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 260,
  },
  addFirstCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  addFirstCardText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  infoCardBlock: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  infoCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconAndTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBlockTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  infoBlockSubtitle: {
    fontSize: 11,
  },
  infoCardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyeToggleBtn: {
    padding: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  largeAmountText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  twoColsCardGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  smallStatCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 2,
  },
  smallStatLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  smallStatValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  payBillButton: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  payBillButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  limitProgressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  limitProgressBar: {
    height: '100%',
    borderRadius: 4,
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
  transactionsList: {
    gap: spacing.sm,
  },
  transactionItemCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  txIconSquare: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  txSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  txDate: {
    fontSize: 11,
  },
  installmentBadge: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  installmentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6C5CE7',
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyTransactionsCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyTxText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  lockedIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  lockedText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  lockedButton: {
    minWidth: 140,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C5CE7',
    paddingHorizontal: spacing.lg,
  },
  lockedButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
