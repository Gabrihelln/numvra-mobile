import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Calculator,
  ChevronDown,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { CreditCardType } from '../../types';
import { spacing, borderRadius, typography } from '../../theme';
import { SwipeableBottomSheet } from '../common/SwipeableBottomSheet';

export interface PayCardBillData {
  card: CreditCardType;
  paymentType: 'total' | 'partial';
  paidAmount: number;
  remainingAmount: number;
  isInstallmentRest: boolean;
  installmentCount?: number;
  installmentValue?: number;
}

interface PayCardBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCardType | null;
  onConfirm: (data: PayCardBillData) => Promise<void>;
}

export const PayCardBillModal: React.FC<PayCardBillModalProps> = ({
  isOpen,
  onClose,
  card,
  onConfirm,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [paymentType, setPaymentType] = useState<'total' | 'partial'>('total');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [isInstallmentRest, setIsInstallmentRest] = useState<boolean>(false);
  const [installmentCount, setInstallmentCount] = useState<number>(2);
  const [installmentValueInput, setInstallmentValueInput] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalBill = card ? Math.max(0, card.usedLimit || 0) : 0;

  useEffect(() => {
    if (isOpen && card) {
      setPaymentType('total');
      setPaidAmountInput('');
      setIsInstallmentRest(false);
      setInstallmentCount(2);
      setInstallmentValueInput('');
      setErrorMessage(null);
      setLoading(false);
    }
  }, [isOpen, card]);

  if (!card) return null;

  const parsedPaidAmount =
    paymentType === 'total'
      ? totalBill
      : parseFloat(paidAmountInput.replace(/\./g, '').replace(',', '.')) || 0;

  const remainingAmount = Math.max(0, totalBill - parsedPaidAmount);

  const parsedInstallmentValue =
    parseFloat(installmentValueInput.replace(/\./g, '').replace(',', '.')) || 0;
  const totalInstallmentPlan = parsedInstallmentValue * installmentCount;
  const interestAmount = Math.max(0, totalInstallmentPlan - remainingAmount);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (paymentType === 'partial') {
      if (parsedPaidAmount <= 0) {
        setErrorMessage('Informe um valor válido pago na fatura.');
        return;
      }
      if (parsedPaidAmount >= totalBill) {
        setErrorMessage(
          "O valor parcial deve ser menor que o total da fatura. Para quitar tudo, selecione 'Valor Total'."
        );
        return;
      }

      if (isInstallmentRest) {
        if (parsedInstallmentValue <= 0) {
          setErrorMessage('Informe o valor de cada parcela do saldo restante.');
          return;
        }
      }
    }

    try {
      setLoading(true);
      await onConfirm({
        card,
        paymentType,
        paidAmount: parsedPaidAmount,
        remainingAmount,
        isInstallmentRest: paymentType === 'partial' && isInstallmentRest,
        installmentCount:
          paymentType === 'partial' && isInstallmentRest
            ? installmentCount
            : undefined,
        installmentValue:
          paymentType === 'partial' && isInstallmentRest
            ? parsedInstallmentValue
            : undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar pagamento da fatura.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SwipeableBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      backgroundColor={colors.card}
      borderColor={colors.border}
      handleColor={isDarkMode ? '#27272a' : '#e4e4e7'}
      maxHeight="90%"
      contentStyle={styles.bottomSheet}
      scrollContentStyle={styles.scrollContent}
    >

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIcon}>
                    <CreditCard size={20} color="#ffffff" />
                  </View>
                  <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                      Pagamento de Fatura
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                      {card.name} (•••• {card.finalDigits})
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>


                {/* Total Open Bill Banner */}
                <View
                  style={[
                    styles.billBanner,
                    {
                      backgroundColor: isDarkMode ? '#1e1b4b35' : '#e0e7ff50',
                      borderColor: isDarkMode ? '#312e81' : '#c7d2fe',
                    },
                  ]}
                >
                  <View>
                    <Text style={styles.bannerLabel}>VALOR TOTAL DA FATURA</Text>
                    <Text style={[styles.bannerAmount, { color: colors.text }]}>
                      R${' '}
                      {totalBill.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                  <View style={styles.bannerRight}>
                    <Text style={[styles.dueLabel, { color: colors.textSecondary }]}>
                      Vencimento
                    </Text>
                    <Text style={styles.dueValue}>
                      Dia {card.dueDate || card.bestDay || '10'}
                    </Text>
                  </View>
                </View>

                {/* Tipo de Pagamento: Total ou Parcial */}
                <View style={styles.sectionGroup}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    COMO VOCÊ DESEJA PAGAR?
                  </Text>
                  <View style={styles.typeSwitcherRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setPaymentType('total');
                        setErrorMessage(null);
                      }}
                      style={[
                        styles.typeCard,
                        paymentType === 'total'
                          ? {
                              backgroundColor: isDarkMode ? '#6C5CE725' : '#6C5CE715',
                              borderColor: '#6C5CE7',
                            }
                          : {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                      ]}
                      activeOpacity={0.8}
                    >
                      <View style={styles.typeTopRow}>
                        <Text style={[styles.typeTitle, { color: colors.text }]}>
                          Valor Total
                        </Text>
                        {paymentType === 'total' && (
                          <CheckCircle2 size={16} color="#6C5CE7" />
                        )}
                      </View>
                      <Text style={[styles.typeAmount, { color: colors.text }]}>
                        R${' '}
                        {totalBill.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                      <Text style={[styles.typeDesc, { color: colors.textMuted }]}>
                        Quita 100% da fatura
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setPaymentType('partial');
                        setErrorMessage(null);
                      }}
                      style={[
                        styles.typeCard,
                        paymentType === 'partial'
                          ? {
                              backgroundColor: isDarkMode ? '#6C5CE725' : '#6C5CE715',
                              borderColor: '#6C5CE7',
                            }
                          : {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                      ]}
                      activeOpacity={0.8}
                    >
                      <View style={styles.typeTopRow}>
                        <Text style={[styles.typeTitle, { color: colors.text }]}>
                          Valor Parcial
                        </Text>
                        {paymentType === 'partial' && (
                          <CheckCircle2 size={16} color="#6C5CE7" />
                        )}
                      </View>
                      <Text style={[styles.typeAmount, { color: colors.text }]}>
                        {parsedPaidAmount > 0
                          ? `R$ ${parsedPaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : 'Definir valor'}
                      </Text>
                      <Text style={[styles.typeDesc, { color: colors.textMuted }]}>
                        Pagar uma parte agora
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Opções de Pagamento Parcial */}
                {paymentType === 'partial' && (
                  <View style={styles.partialSection}>
                    <View style={styles.inputBlock}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>
                        Quanto você pagou agora? (R$)
                      </Text>
                      <View style={styles.inputPrefixWrapper}>
                        <Text style={[styles.inputPrefix, { color: colors.textMuted }]}>
                          R$
                        </Text>
                        <TextInput
                          value={paidAmountInput}
                          onChangeText={setPaidAmountInput}
                          keyboardType="numeric"
                          placeholder="Ex: 500,00"
                          placeholderTextColor={colors.textMuted}
                          style={[
                            styles.partialInput,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              color: colors.text,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Card de Saldo Restante */}
                    <View
                      style={[
                        styles.remainingCard,
                        {
                          backgroundColor: isDarkMode ? '#451a0330' : '#fffbeb',
                          borderColor: isDarkMode ? '#78350f' : '#fde68a',
                        },
                      ]}
                    >
                      <View>
                        <Text style={styles.remainingLabel}>
                          SALDO RESTANTE DA FATURA
                        </Text>
                        <Text style={[styles.remainingAmount, { color: isDarkMode ? '#fde68a' : '#92400e' }]}>
                          R${' '}
                          {remainingAmount.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                      </View>
                      <Calculator size={20} color="#d97706" />
                    </View>

                    {/* Parcelar Restante com Juros */}
                    {remainingAmount > 0 && (
                      <View
                        style={[
                          styles.installmentBlock,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.switchRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.switchTitle, { color: colors.text }]}>
                              Parcelar saldo restante com juros?
                            </Text>
                            <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>
                              Se você negociou o parcelamento com o banco
                            </Text>
                          </View>
                          <Switch
                            value={isInstallmentRest}
                            onValueChange={setIsInstallmentRest}
                            trackColor={{ false: '#71717a', true: '#6C5CE7' }}
                            thumbColor="#ffffff"
                          />
                        </View>

                        {isInstallmentRest && (
                          <View style={styles.installmentDetails}>
                            <View style={styles.installmentInputsRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>
                                  Quantas vezes?
                                </Text>
                                <View style={styles.pickerFake}>
                                  <Text style={[styles.pickerText, { color: colors.text }]}>
                                    {installmentCount}x parcelas
                                  </Text>
                                  <View style={styles.counterButtons}>
                                    <TouchableOpacity
                                      onPress={() =>
                                        setInstallmentCount((prev) =>
                                          Math.max(2, prev - 1)
                                        )
                                      }
                                      style={styles.stepBtn}
                                    >
                                      <Text style={styles.stepBtnText}>-</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() =>
                                        setInstallmentCount((prev) =>
                                          Math.min(24, prev + 1)
                                        )
                                      }
                                      style={styles.stepBtn}
                                    >
                                      <Text style={styles.stepBtnText}>+</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>

                              <View style={{ flex: 1 }}>
                                <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>
                                  Valor da parcela
                                </Text>
                                <TextInput
                                  value={installmentValueInput}
                                  onChangeText={setInstallmentValueInput}
                                  keyboardType="numeric"
                                  placeholder="Ex: 350,00"
                                  placeholderTextColor={colors.textMuted}
                                  style={[
                                    styles.installmentInput,
                                    {
                                      backgroundColor: colors.card,
                                      borderColor: colors.border,
                                      color: colors.text,
                                    },
                                  ]}
                                />
                              </View>
                            </View>

                            {parsedInstallmentValue > 0 && (
                              <View style={styles.installmentSummary}>
                                <Text style={styles.summaryLine}>
                                  Total parcelado: R${' '}
                                  {totalInstallmentPlan.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                  })}
                                </Text>
                                {interestAmount > 0 && (
                                  <Text style={styles.summaryInterest}>
                                    Juros embutidos: + R${' '}
                                    {interestAmount.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Mensagem de Erro */}
                {!!errorMessage && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={16} color="#ef4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Botões de Ação */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={onClose}
                    disabled={loading}
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    style={[styles.confirmBtn, { backgroundColor: '#6C5CE7' }]}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} color="#ffffff" />
                        <Text style={styles.confirmBtnText}>
                          Confirmar Pagamento
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
    </SwipeableBottomSheet>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  bottomSheet: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  billBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6C5CE7',
    letterSpacing: 0.5,
  },
  bannerAmount: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  bannerRight: {
    alignItems: 'flex-end',
  },
  dueLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  dueValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ef4444',
    marginTop: 2,
  },
  sectionGroup: {
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  typeSwitcherRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  typeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  typeAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  typeDesc: {
    fontSize: 9,
    fontWeight: '600',
  },
  partialSection: {
    gap: spacing.sm,
  },
  inputBlock: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputPrefixWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputPrefix: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
    fontWeight: '800',
    fontSize: 14,
  },
  partialInput: {
    height: 48,
    borderRadius: borderRadius.md,
    paddingLeft: 42,
    paddingRight: spacing.md,
    fontSize: 14,
    fontWeight: '800',
    borderWidth: 1,
  },
  remainingCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#d97706',
  },
  remainingAmount: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  installmentBlock: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  switchSubtitle: {
    fontSize: 10,
  },
  installmentDetails: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  installmentInputsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  smallLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  pickerFake: {
    height: 44,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#71717a50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  pickerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  counterButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  installmentInput: {
    height: 44,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '800',
  },
  installmentSummary: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    gap: 2,
  },
  summaryLine: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryInterest: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.sm,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
