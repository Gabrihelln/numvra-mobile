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
import {
  X,
  Check,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { BudgetCategory } from '../../types';
import { spacing, borderRadius, typography } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORY_ICON_PRESETS, getIconComponent } from '../../constants/iconRegistry';

interface AddBudgetCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, percentage: number, icon: string) => Promise<void>;
  categoryToEdit?: BudgetCategory | null;
  totalAllocated: number;
}

export const AddBudgetCategoryModal: React.FC<AddBudgetCategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categoryToEdit = null,
  totalAllocated,
}) => {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [percentStr, setPercentStr] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('home');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const maxAllocatable = Math.max(
    0,
    Math.min(100, 100 - (totalAllocated - (categoryToEdit ? categoryToEdit.percentage ?? 0 : 0)))
  );

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (categoryToEdit) {
        setName(categoryToEdit.name);
        setPercentStr((categoryToEdit.percentage ?? 0).toString());
        setSelectedIcon(categoryToEdit.icon || 'home');
      } else {
        setName('');
        setPercentStr('');
        setSelectedIcon('home');
      }
    }
  }, [isOpen, categoryToEdit]);

  const handleSubmit = async () => {
    setError('');

    const parsedPercent = parseFloat(percentStr.replace(/\./g, '').replace(',', '.'));
    if (!name.trim()) {
      setError('Por favor, preencha o nome da categoria.');
      return;
    }
    if (isNaN(parsedPercent) || parsedPercent < 0 || parsedPercent > 100) {
      setError('Por favor, digite uma porcentagem válida entre 0 e 100%.');
      return;
    }
    if (parsedPercent > maxAllocatable) {
      setError(`Você não pode exceder o limite total de 100%. Restam apenas ${maxAllocatable}% livres.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name.trim(), parsedPercent, selectedIcon);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar categoria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePercentChange = (val: string) => {
    const clean = val.replace(/[^0-9,.]/g, '');
    setPercentStr(clean);
  };

  const isEditMode = !!categoryToEdit;

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
              {/* Handle Bar */}
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: isDarkMode ? '#27272a' : '#e4e4e7' },
                ]}
              />

              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>
                  {isEditMode ? 'Editar Categoria' : 'Nova Categoria'}
                </Text>
                <View style={styles.headerSpacer} />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
              >
                {/* Mensagem de Erro */}
                {!!error && (
                  <View
                    style={[
                      styles.errorContainer,
                      {
                        backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2',
                        borderColor: isDarkMode ? '#7f1d1d' : '#fecaca',
                      },
                    ]}
                  >
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Input Nome da Categoria */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    NOME DA CATEGORIA
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex: Assinaturas ou Farmácia"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.surface,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                  />
                </View>

                {/* Input Porcentagem */}
                <View style={styles.percentSection}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    PORCENTAGEM DO SALDO (%)
                  </Text>
                  <View style={styles.percentInputRow}>
                    <TextInput
                      value={percentStr}
                      onChangeText={handlePercentChange}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.percentInput, { color: colors.text }]}
                    />
                    <Text style={[styles.percentSign, { color: colors.textMuted }]}>
                      %
                    </Text>
                  </View>
                  <Text style={[styles.percentHelper, { color: colors.textSecondary }]}>
                    Define quanto do saldo total será reservado para esta categoria.
                  </Text>
                  <Text style={[styles.percentMaxAvailable, { color: colors.primary }]}>
                    Máximo disponível: {maxAllocatable}%
                  </Text>
                </View>

                {/* Seletor de Ícones */}
                <View style={styles.iconSection}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    SELECIONE UM ÍCONE
                  </Text>
                  <View style={styles.iconGrid}>
                    {CATEGORY_ICON_PRESETS.map((item) => {
                      const IconComp = getIconComponent(item.key);
                      const isSelected = selectedIcon === item.key;
                      return (
                        <TouchableOpacity
                          key={item.key}
                          onPress={() => setSelectedIcon(item.key)}
                          activeOpacity={0.7}
                          style={[
                            styles.iconItem,
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
                        >
                          <View
                            style={[
                              styles.iconBadge,
                              {
                                backgroundColor: isDarkMode
                                  ? `${item.color}33`
                                  : `${item.color}1f`,
                              },
                            ]}
                          >
                            <IconComp size={18} color={item.color} />
                          </View>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.iconLabel,
                              {
                                color: isSelected
                                  ? colors.primary
                                  : colors.textSecondary,
                                fontWeight: isSelected ? '700' : '500',
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

                {/* Botão de Confirmação */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Check size={18} color="#ffffff" strokeWidth={3} />
                      <Text style={styles.submitButtonText}>
                        {isEditMode ? 'Salvar Alterações' : 'Criar Categoria'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  errorContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  textInput: {
    height: 48,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    borderWidth: 1,
  },
  percentSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  percentInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  percentInput: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    minWidth: 80,
    padding: 0,
    margin: 0,
  },
  percentSign: {
    fontSize: 22,
    fontWeight: '900',
  },
  percentHelper: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  percentMaxAvailable: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  iconSection: {
    marginBottom: spacing.xl,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconItem: {
    width: '31%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    fontSize: 9,
    textAlign: 'center',
  },
  submitButton: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: spacing.sm,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
