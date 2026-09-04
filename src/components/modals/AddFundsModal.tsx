import React, { FC, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Check, Landmark, Repeat, Wallet } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, description: string) => Promise<void>;
  title: string;
  mode: 'deposit' | 'withdraw';
}

const PRESET_DESCRIPTIONS = [
  { text: 'Depósito Automático', Icon: Repeat },
  { text: 'Transferência PIX', Icon: Landmark },
  { text: 'Arredondamento', Icon: Wallet },
];

export const AddFundsModal: FC<AddFundsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  mode,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setDescription(mode === 'deposit' ? PRESET_DESCRIPTIONS[0].text : 'Resgate total ou parcial');
    }
  }, [isOpen, mode]);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(parsedAmount, description.trim() || (mode === 'deposit' ? 'Depósito' : 'Resgate'));
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (val: string) => {
    const clean = val.replace(/[^0-9,.]/g, '');
    setAmountStr(clean);
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
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
              borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
            },
          ]}
        >
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: isDarkMode ? '#2D2D3A' : '#E2E8F0' }]} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={isDarkMode ? '#94A3B8' : '#9CA3AF'} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Amount input */}
            <View style={styles.amountContainer}>
              <Text style={[styles.label, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
                VALOR (R$)
              </Text>
              <View style={styles.amountRow}>
                <Text style={[styles.currencySymbol, { color: isDarkMode ? '#64748B' : '#9CA3AF' }]}>
                  R$
                </Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.text }]}
                  placeholder="0,00"
                  placeholderTextColor={isDarkMode ? '#475569' : '#D1D5DB'}
                  keyboardType="numeric"
                  value={amountStr}
                  onChangeText={handleAmountChange}
                  autoFocus
                />
              </View>
            </View>

            {/* Description input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDarkMode ? '#94A3B8' : '#9CA3AF', marginBottom: 6 }]}>
                DESCRIÇÃO / CATEGORIA
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDarkMode ? '#121214' : '#F8FAFC',
                    color: colors.text,
                    borderColor: isDarkMode ? '#2D2D3A' : '#E2E8F0',
                  },
                ]}
                placeholder={mode === 'deposit' ? 'Ex: Depósito Mensal' : 'Ex: Resgate Viagem'}
                placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
                value={description}
                onChangeText={setDescription}
              />

              {mode === 'deposit' && (
                <View style={styles.presetsGrid}>
                  {PRESET_DESCRIPTIONS.map((preset) => {
                    const isSelected = description === preset.text;
                    const IconComponent = preset.Icon;
                    return (
                      <TouchableOpacity
                        key={preset.text}
                        style={[
                          styles.presetButton,
                          {
                            backgroundColor: isSelected
                              ? (isDarkMode ? 'rgba(108, 92, 231, 0.15)' : '#F0EEFF')
                              : (isDarkMode ? '#121214' : '#F8FAFC'),
                            borderColor: isSelected ? '#6C5CE7' : (isDarkMode ? '#2D2D3A' : '#E2E8F0'),
                          },
                        ]}
                        onPress={() => setDescription(preset.text)}
                      >
                        <IconComponent
                          size={16}
                          color={isSelected ? '#6C5CE7' : (isDarkMode ? '#94A3B8' : '#64748B')}
                        />
                        <Text
                          style={[
                            styles.presetText,
                            {
                              color: isSelected ? '#6C5CE7' : (isDarkMode ? '#94A3B8' : '#64748B'),
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {preset.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: mode === 'deposit' ? '#6C5CE7' : '#00A878',
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.submitButtonText}>
                    {mode === 'deposit' ? 'Confirmar Depósito' : 'Confirmar Resgate'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '85%',
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  closeButton: {
    padding: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '900',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '900',
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
  },
  inputGroup: {
    marginBottom: 20,
  },
  textInput: {
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
  },
  presetsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 4,
  },
  presetText: {
    fontSize: 10,
    textAlign: 'center',
  },
  submitButton: {
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
