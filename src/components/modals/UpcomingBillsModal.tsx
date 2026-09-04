import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Subscription, CreditCardType } from '../../types';
import { X, AlertCircle, CreditCard, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RemoteIcon } from '../common/RemoteIcon';

interface UpcomingBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  upcomingSubs: Subscription[];
  upcomingCards?: CreditCardType[];
  onPay: (sub: Subscription) => Promise<void>;
  onPayCard?: (card: CreditCardType) => void;
}

export const UpcomingBillsModal: React.FC<UpcomingBillsModalProps> = ({
  isOpen,
  onClose,
  upcomingSubs,
  upcomingCards = [],
  onPay,
  onPayCard,
}) => {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [payingId, setPayingId] = useState<string | null>(null);

  const handlePaySub = async (sub: Subscription) => {
    setPayingId(`sub-${sub.id}`);
    try {
      await onPay(sub);
    } finally {
      setPayingId(null);
    }
  };

  const totalBillsCount = upcomingSubs.length + upcomingCards.length;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderTopColor: isDarkMode ? '#27272a' : '#f1f5f9',
              paddingBottom: Math.max(32, insets.bottom + 16),
            },
          ]}
        >
          {/* Drag handle */}
          <View style={[styles.dragHandle, { backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0' }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <AlertCircle size={20} color="#ef4444" strokeWidth={2.5} />
              <Text style={[styles.headerTitle, { color: isDarkMode ? '#f4f4f5' : '#111118' }]}>
                Contas a Pagar
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
              activeOpacity={0.7}
            >
              <X size={18} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: isDarkMode ? '#a1a1aa' : '#64748b' }]}>
            Faturas de cartão de crédito e assinaturas recorrentes com vencimento próximo. Ao confirmar o pagamento, o limite é restabelecido.
          </Text>

          <ScrollView
            contentContainerStyle={styles.scrollList}
            showsVerticalScrollIndicator={false}
          >
            {/* Credit Card Bills */}
            {upcomingCards.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>
                  FATURAS DE CARTÃO DE CRÉDITO ({upcomingCards.length})
                </Text>
                {upcomingCards.map((card) => (
                  <View
                    key={card.id}
                    style={[
                      styles.billCard,
                      {
                        backgroundColor: isDarkMode ? 'rgba(91, 76, 216, 0.12)' : '#f5f3ff',
                        borderColor: isDarkMode ? 'rgba(91, 76, 216, 0.3)' : '#ede9fe',
                      },
                    ]}
                  >
                    <View style={styles.billCardLeft}>
                      <View style={styles.cardIconBox}>
                        <CreditCard size={20} color="#ffffff" />
                      </View>
                      <View style={styles.billDetails}>
                        <Text
                          style={[styles.billName, { color: isDarkMode ? '#f4f4f5' : '#111118' }]}
                          numberOfLines={1}
                        >
                          Fatura {card.name} (•••• {card.finalDigits})
                        </Text>
                        <Text style={[styles.billDate, { color: isDarkMode ? '#a1a1aa' : '#64748b' }]}>
                          Vencimento: {card.dueDate || `${card.bestDay || 10}/${String(new Date().getMonth() + 1).padStart(2, '0')}`}
                        </Text>
                        <Text style={styles.billAmount}>
                          R$ {(card.usedLimit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.payBillButton}
                      onPress={() => {
                        if (onPayCard) onPayCard(card);
                      }}
                      activeOpacity={0.85}
                    >
                      <Sparkles size={13} color="#ffffff" />
                      <Text style={styles.payBillButtonText}>Pagar Fatura</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Subscriptions */}
            {upcomingSubs.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>
                  ASSINATURAS RECORRENTES ({upcomingSubs.length})
                </Text>
                {upcomingSubs.map((sub) => {
                  const isPaying = payingId === `sub-${sub.id}`;
                  return (
                    <View
                      key={sub.id}
                      style={[
                        styles.billCard,
                        {
                          backgroundColor: isDarkMode ? '#27272a' : '#ffffff',
                          borderColor: isDarkMode ? '#3f3f46' : '#f1f5f9',
                        },
                      ]}
                    >
                      <View style={styles.billCardLeft}>
                        <View style={[styles.subIconBox, { backgroundColor: isDarkMode ? '#18181b' : '#f8fafc' }]}>
                          <RemoteIcon
                            uri={sub.iconUrl || sub.icon}
                            size={26}
                            fallback={
                              <Image
                                source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${sub.name}` }}
                                style={styles.subIconImage}
                                resizeMode="contain"
                              />
                            }
                          />
                        </View>
                        <View style={styles.billDetails}>
                          <Text
                            style={[styles.billName, { color: isDarkMode ? '#f4f4f5' : '#111118' }]}
                            numberOfLines={1}
                          >
                            {sub.name}
                          </Text>
                          <Text style={[styles.billDate, { color: isDarkMode ? '#a1a1aa' : '#64748b' }]}>
                            Próx: {sub.nextBilling}
                          </Text>
                          <Text style={styles.billAmount}>
                            R$ {sub.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.paySubButton, isPaying && styles.payButtonDisabled]}
                        onPress={() => handlePaySub(sub)}
                        disabled={isPaying}
                        activeOpacity={0.85}
                      >
                        {isPaying ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <CheckCircle2 size={13} color="#ffffff" />
                            <Text style={styles.paySubButtonText}>Pagar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {totalBillsCount === 0 && (
              <View style={styles.emptyContainer}>
                <CheckCircle2 size={40} color="#10b981" />
                <Text style={[styles.emptyText, { color: isDarkMode ? '#a1a1aa' : '#64748b' }]}>
                  Tudo em dia! Nenhuma conta com vencimento próximo.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    maxHeight: '80%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 16,
  },
  scrollList: {
    gap: 16,
    paddingBottom: 16,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6c5ce7',
    letterSpacing: 0.8,
  },
  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  billCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#5b4cd8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subIconImage: {
    width: 26,
    height: 26,
  },
  billDetails: {
    flex: 1,
  },
  billName: {
    fontSize: 13,
    fontWeight: '800',
  },
  billDate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  billAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#5b4cd8',
    marginTop: 2,
  },
  payBillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#5b4cd8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  payBillButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
  },
  paySubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  paySubButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 240,
  },
});
