import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, CheckCircle2, CreditCard } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { CreditCardType } from '../../types';
import { spacing, borderRadius, typography } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CardFormData = Partial<CreditCardType> & {
  expirationDate?: string;
  limit?: number;
};

interface AddEditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (cardData: CardFormData) => Promise<void>;
  cardToEdit?: CreditCardType | null;
}

const BRAND_OPTIONS = [
  { label: 'Mastercard', value: 'mastercard' },
  { label: 'Visa', value: 'visa' },
  { label: 'Elo', value: 'elo' },
  { label: 'Amex', value: 'amex' },
  { label: 'Hipercard', value: 'hipercard' },
];

const COLOR_THEMES = [
  { label: 'Roxo Ultravioleta', gradient: ['#5B2CFF', '#8C52FF'] },
  { label: 'Verde Esmeralda', gradient: ['#15E2B0', '#0A9684'] },
  { label: 'Preto Black', gradient: ['#1E1B4B', '#4338CA'] },
  { label: 'Laranja / Dourado', gradient: ['#FF2D55', '#FF9500'] },
];

export const AddEditCardModal: React.FC<AddEditCardModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  cardToEdit,
}) => {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('mastercard');
  const [finalDigits, setFinalDigits] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [bestDay, setBestDay] = useState('10');
  const [limitInput, setLimitInput] = useState('');
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (cardToEdit) {
        setName(cardToEdit.name);
        setBrand(cardToEdit.brand || 'mastercard');
        setFinalDigits(cardToEdit.finalDigits || '');
        setExpirationDate((cardToEdit as CardFormData).expirationDate || '');
        setBestDay(cardToEdit.bestDay ? cardToEdit.bestDay.toString() : '10');
        setLimitInput(
          (cardToEdit as CardFormData).limit
            ? ((cardToEdit as CardFormData).limit! * 100).toString()
            : ''
        );
      } else {
        setName('');
        setBrand('mastercard');
        setFinalDigits('');
        setExpirationDate('');
        setBestDay('10');
        setLimitInput('');
        setSelectedThemeIndex(0);
      }
    }
  }, [isOpen, cardToEdit]);

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

  const getNumericLimit = (): number => {
    if (!limitInput) return 0;
    return parseFloat(limitInput.replace(/\D/g, '')) / 100;
  };

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) {
      setError('Por favor, informe o nome do cartão.');
      return;
    }
    if (finalDigits.length < 4) {
      setError('Informe os 4 últimos dígitos do cartão.');
      return;
    }
    const numLimit = getNumericLimit();
    if (numLimit <= 0) {
      setError('Informe um limite total válido para o cartão.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        brand,
        finalDigits: finalDigits.slice(-4),
        expirationDate: expirationDate || '12/28',
        bestDay: bestDay || '10',
        limit: numLimit,
        totalLimit: numLimit,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar cartão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.bottomSheet,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.md),
                },
              ]}
            >
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: isDarkMode ? '#27272a' : '#e4e4e7' },
                ]}
              />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIcon}>
                    <CreditCard size={20} color="#ffffff" />
                  </View>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {cardToEdit ? 'Editar Cartão' : 'Novo Cartão'}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
              >
                {/* Erro */}
                {!!error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Nome do Cartão */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    NOME DO CARTÃO
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex: Nubank Ultravioleta ou Inter Black"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                </View>

                {/* Bandeira */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    BANDEIRA
                  </Text>
                  <View style={styles.brandRow}>
                    {BRAND_OPTIONS.map((item) => {
                      const isSelected = brand === item.value;
                      return (
                        <TouchableOpacity
                          key={item.value}
                          onPress={() => setBrand(item.value)}
                          style={[
                            styles.brandChip,
                            {
                              backgroundColor: isSelected
                                ? isDarkMode
                                  ? '#1e1b4b'
                                  : '#e0e7ff'
                                : colors.surface,
                              borderColor: isSelected
                                ? colors.primary
                                : colors.border,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.brandChipText,
                              {
                                color: isSelected
                                  ? colors.primary
                                  : colors.textSecondary,
                                fontWeight: isSelected ? '800' : '600',
                              },
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 4 Últimos Dígitos & Vencimento */}
                <View style={styles.rowTwoCols}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      ÚLTIMOS 4 DÍGITOS
                    </Text>
                    <TextInput
                      value={finalDigits}
                      onChangeText={(val) =>
                        setFinalDigits(val.replace(/\D/g, '').slice(0, 4))
                      }
                      keyboardType="numeric"
                      placeholder="1234"
                      placeholderTextColor={colors.textMuted}
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      MELHOR DIA DE COMPRA
                    </Text>
                    <TextInput
                      value={bestDay}
                      onChangeText={(val) =>
                        setBestDay(val.replace(/\D/g, '').slice(0, 2))
                      }
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor={colors.textMuted}
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Limite Total */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    LIMITE TOTAL (R$)
                  </Text>
                  <TextInput
                    value={formatDisplayAmount(limitInput)}
                    onChangeText={(val) =>
                      setLimitInput(val.replace(/\D/g, ''))
                    }
                    keyboardType="numeric"
                    placeholder="0,00"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                        fontWeight: '800',
                        fontSize: 18,
                      },
                    ]}
                  />
                </View>

                {/* Botões */}
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
                          {cardToEdit ? 'Salvar Alterações' : 'Criar Cartão'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
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
    maxHeight: '88%',
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
  closeButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  errorBox: {
    padding: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.sm,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textInput: {
    height: 48,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    borderWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  brandChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  brandChipText: {
    fontSize: 11,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: spacing.sm,
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
