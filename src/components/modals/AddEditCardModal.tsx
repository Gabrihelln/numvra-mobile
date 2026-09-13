import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Lightbulb,
  MoreHorizontal,
  Tag,
  Wallet,
  WalletCards,
} from 'lucide-react-native';
import { CreditCardType } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

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

type BrandOption = {
  label: string;
  value: string;
  short: string;
};

const PRIMARY = '#5748FF';
const TEXT = '#111733';
const MUTED = '#6F7894';
const SURFACE = '#F7F7FD';
const BORDER = '#E5E7F3';
const BRAND_OPTIONS: BrandOption[] = [
  { label: 'Visa', value: 'visa', short: 'VISA' },
  { label: 'Mastercard', value: 'mastercard', short: 'MC' },
  { label: 'Elo', value: 'elo', short: 'elo' },
  { label: 'Amex', value: 'amex', short: 'AMERICAN\nEXPRESS' },
  { label: 'Hipercard', value: 'hipercard', short: 'Hipercard' },
  { label: 'Outros', value: 'other', short: '...' },
];

const getPagePadding = (width: number) => width < 360 ? 16 : width < 400 ? 18 : 22;
const formatMoneyInput = (raw: string) => {
  const clean = raw.replace(/\D/g, '');
  if (!clean) return '';
  const amount = Number(clean) / 100;
  return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const moneyToNumber = (raw: string) => Number(raw.replace(/\D/g, '') || 0) / 100;
const normalizeDay = (raw: string) => {
  const clean = raw.replace(/\D/g, '').slice(0, 2);
  const day = Number(clean);
  if (!clean) return '';
  if (day < 1) return '1';
  if (day > 31) return '31';
  return String(day);
};
const getBrandShort = (brand: string) => BRAND_OPTIONS.find((item) => item.value === brand)?.short || '...';
const getLastDigits = (finalDigits: string) => finalDigits.replace(/\D/g, '').slice(0, 4);

const BrandMark: React.FC<{ brand: string; selected?: boolean }> = ({ brand }) => {
  const { colors } = useTheme();
  if (brand === 'mastercard') {
    return (
      <View style={styles.mastercardMark}>
        <View style={[styles.mcCircle, { backgroundColor: '#FF4040' }]} />
        <View style={[styles.mcCircle, styles.mcCircleOverlap, { backgroundColor: '#FFB238' }]} />
      </View>
    );
  }
  if (brand === 'other') return <MoreHorizontal size={25} color={colors.textSecondary} />;
  return <Text style={[styles.brandLogoText, brand === 'amex' && styles.amexText, brand === 'hipercard' && styles.hipercardText]} numberOfLines={2}>{getBrandShort(brand)}</Text>;
};

const FieldRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  compact?: boolean;
}> = ({ icon, label, children, compact }) => (
  <ThemedFieldRow icon={icon} label={label} compact={compact}>{children}</ThemedFieldRow>
);

const ThemedFieldRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  compact?: boolean;
}> = ({ icon, label, children, compact }) => {
  const { colors } = useTheme();
  return <View style={[styles.fieldRow, compact && styles.fieldRowCompact]}>
    <View style={[styles.fieldIconBox, { backgroundColor: colors.primaryLight }]}>{icon}</View>
    <View style={styles.fieldBody}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
      {children}
    </View>
  </View>;
};

export const AddEditCardModal: React.FC<AddEditCardModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  cardToEdit,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const pagePadding = getPagePadding(width);
  const compact = width < 360;
  const inputStyle = [styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }];

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('visa');
  const [finalDigits, setFinalDigits] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [bestDay, setBestDay] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (cardToEdit) {
      const totalLimit = Number(cardToEdit.totalLimit ?? cardToEdit.creditLimit ?? (cardToEdit as CardFormData).limit ?? 0);
      setName(cardToEdit.name || '');
      setBrand(cardToEdit.brand || 'visa');
      setFinalDigits(cardToEdit.finalDigits || cardToEdit.lastFourDigits || '');
      setLimitInput(totalLimit > 0 ? String(Math.round(totalLimit * 100)) : '');
      setClosingDay(cardToEdit.closingDay ? String(cardToEdit.closingDay) : '');
      setDueDay(cardToEdit.dueDay ? String(cardToEdit.dueDay) : '');
      setBestDay(cardToEdit.bestDay ? String(cardToEdit.bestDay) : '');
    } else {
      setName('');
      setBrand('visa');
      setFinalDigits('');
      setLimitInput('');
      setClosingDay('');
      setDueDay('');
      setBestDay('');
    }
  }, [isOpen, cardToEdit]);

  const previewDigits = useMemo(() => {
    const digits = finalDigits.replace(/\D/g, '').slice(0, 4);
    return `••••  ••••  ••••  ${digits.padStart(4, '•')}`;
  }, [finalDigits]);

  const submit = async () => {
    setError('');
    const lastDigits = getLastDigits(finalDigits);
    const limit = moneyToNumber(limitInput);
    if (!name.trim()) {
      setError('Por favor, informe o nome do cartão.');
      return;
    }
    if (lastDigits.length < 4) {
      setError('Informe os 4 últimos dígitos do cartão.');
      return;
    }
    if (limit <= 0) {
      setError('Informe um limite total válido para o cartão.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        brand,
        finalDigits: lastDigits,
        lastFourDigits: lastDigits,
        expirationDate: (cardToEdit as CardFormData | null)?.expirationDate || cardToEdit?.expiration || '12/28',
        expiration: (cardToEdit as CardFormData | null)?.expirationDate || cardToEdit?.expiration || '12/28',
        closingDay: closingDay || undefined,
        dueDay: dueDay || undefined,
        bestDay: bestDay || undefined,
        limit,
        totalLimit: limit,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar cartão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 14) + 6, paddingHorizontal: pagePadding, paddingBottom: Math.max(insets.bottom, 16) + 22 }]}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Voltar">
              <ChevronLeft size={24} color={colors.text} strokeWidth={2.8} />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: colors.text }]}>{cardToEdit ? 'Editar cartão' : 'Adicionar cartão'}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{cardToEdit ? 'Atualize as informações do seu cartão.' : 'Cadastre um novo cartão de crédito no Numvra.'}</Text>
            </View>
          </View>

          <View style={[styles.previewCard, { maxWidth: compact ? undefined : 580 }]}>
            <View style={styles.previewShape} />
            <View style={styles.previewTop}>
              <Text style={styles.previewBadge}>Pré-visualização</Text>
              <View style={styles.previewBrandMark}><BrandMark brand={brand} /></View>
            </View>
            <View style={styles.previewMiddle}>
              <Text style={styles.previewNumber} numberOfLines={1}>{previewDigits}</Text>
              <View style={styles.previewChip}><View style={styles.chipLine} /><View style={styles.chipLine} /></View>
            </View>
            <View style={styles.previewBottom}>
              <Text style={styles.previewName} numberOfLines={1}>{name.trim() ? name.trim().toUpperCase() : 'SEU NOME AQUI'}</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandScroller}>
            {BRAND_OPTIONS.map((item) => {
              const selected = brand === item.value;
              return (
                <TouchableOpacity key={item.value} onPress={() => setBrand(item.value)} style={[styles.brandOption, { backgroundColor: selected ? colors.primaryLight : colors.surface, borderColor: selected ? PRIMARY : 'transparent' }]} activeOpacity={0.85}>
                  <View style={[styles.brandVisual, { backgroundColor: selected ? colors.primaryLight : colors.card }]}><BrandMark brand={item.value} /></View>
                  <Text style={[styles.brandLabel, { color: selected ? PRIMARY : colors.textSecondary }]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados do cartão</Text>
            <FieldRow icon={<CreditCard size={22} color={PRIMARY} />} label="Nome do cartão (opcional)">
              <TextInput value={name} onChangeText={setName} placeholder="Nubank" placeholderTextColor={colors.textMuted} style={inputStyle} />
            </FieldRow>
            <FieldRow icon={<CreditCard size={22} color={PRIMARY} />} label="Últimos 4 dígitos do cartão">
              <TextInput value={finalDigits} onChangeText={(value) => setFinalDigits(value.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="1234" placeholderTextColor={colors.textMuted} style={inputStyle} maxLength={4} />
            </FieldRow>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Configurações</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Defina as informações e limites do seu cartão.</Text>
            <View style={styles.configGrid}>
              <FieldRow compact icon={<WalletCards size={21} color={PRIMARY} />} label="Limite total">
                <TextInput value={formatMoneyInput(limitInput)} onChangeText={(value) => setLimitInput(value.replace(/\D/g, ''))} keyboardType="numeric" placeholder="R$ 0,00" placeholderTextColor={colors.textMuted} style={inputStyle} />
              </FieldRow>
              <FieldRow compact icon={<CalendarDays size={21} color={PRIMARY} />} label="Dia de fechamento">
                <TextInput value={closingDay} onChangeText={(value) => setClosingDay(normalizeDay(value))} keyboardType="number-pad" placeholder="Selecione" placeholderTextColor={colors.textMuted} style={inputStyle} />
              </FieldRow>
              <FieldRow compact icon={<CalendarDays size={21} color={PRIMARY} />} label="Dia de vencimento">
                <TextInput value={dueDay} onChangeText={(value) => setDueDay(normalizeDay(value))} keyboardType="number-pad" placeholder="Selecione" placeholderTextColor={colors.textMuted} style={inputStyle} />
              </FieldRow>
              <FieldRow compact icon={<Tag size={21} color={PRIMARY} />} label="Melhor dia de compra (opcional)">
                <TextInput value={bestDay} onChangeText={(value) => setBestDay(normalizeDay(value))} keyboardType="number-pad" placeholder="Selecione" placeholderTextColor={colors.textMuted} style={inputStyle} />
              </FieldRow>
            </View>
            <View style={[styles.tipCard, { backgroundColor: colors.primaryLight }]}>
              <View style={[styles.tipIcon, { backgroundColor: colors.surfaceVariant }]}><Lightbulb size={28} color={PRIMARY} /></View>
              <View style={styles.tipTextWrap}>
                <Text style={styles.tipTitle}>Dica do Numvra</Text>
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>O melhor dia de compra é a data em que você tem mais dias para pagar a fatura e manter o controle do seu limite.</Text>
              </View>
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Conta para pagamento</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Selecione a conta que será usada para pagar a fatura.</Text>
            <TouchableOpacity style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.85}>
              <View style={styles.accountIcon}><Wallet size={27} color="#FFFFFF" /></View>
              <View style={styles.accountInfo}>
                <Text style={[styles.accountName, { color: colors.text }]}>Conta padrão</Text>
                <Text style={[styles.accountMeta, { color: colors.textSecondary }]}>Conta principal • Saldo indisponível</Text>
              </View>
              <ChevronRight size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={submit} disabled={loading} style={[styles.submitButton, loading && styles.submitButtonDisabled]} activeOpacity={0.88}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{cardToEdit ? 'Salvar alterações' : 'Adicionar cartão'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: TEXT, fontSize: 25, lineHeight: 30, fontWeight: '700', letterSpacing: 0 },
  subtitle: { marginTop: 1, color: MUTED, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  previewCard: { width: '100%', aspectRatio: 1.586, alignSelf: 'center', borderRadius: 20, overflow: 'hidden', backgroundColor: '#20212A', padding: 22 },
  previewShape: { position: 'absolute', top: -32, right: 116, width: 190, height: 300, transform: [{ rotate: '16deg' }], backgroundColor: 'rgba(255,255,255,0.05)' },
  previewTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  previewBadge: { marginTop: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 17, overflow: 'hidden', color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '600', backgroundColor: 'rgba(255,255,255,0.16)' },
  previewBrandMark: { minWidth: 74, minHeight: 38, alignItems: 'flex-end', justifyContent: 'center' },
  previewMiddle: { marginTop: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewNumber: { flex: 1, color: '#FFFFFF', fontSize: 21, lineHeight: 25, fontWeight: '700', letterSpacing: 2.5 },
  previewChip: { width: 47, height: 35, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(255,255,255,0.54)', justifyContent: 'space-evenly', paddingHorizontal: 6, marginLeft: 12 },
  chipLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.55)' },
  previewBottom: { marginTop: 'auto', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  previewName: { flex: 1, color: '#FFFFFF', fontSize: 14, lineHeight: 18, fontWeight: '600' },
  brandScroller: { gap: 10, paddingRight: 4 },
  brandOption: { width: 84, height: 84, borderRadius: 13, borderWidth: 1, borderColor: 'transparent', backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center', gap: 7 },
  brandOptionSelected: { borderColor: PRIMARY, backgroundColor: '#F2F0FF' },
  brandVisual: { width: 58, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  brandVisualSelected: { backgroundColor: '#ECE9FF' },
  brandLabel: { color: MUTED, fontSize: 12, lineHeight: 15, fontWeight: '500' },
  brandLabelSelected: { color: PRIMARY, fontWeight: '600' },
  brandLogoText: { color: '#1260D6', fontSize: 20, lineHeight: 21, fontWeight: '900', fontStyle: 'italic', textAlign: 'center' },
  amexText: { fontSize: 9, lineHeight: 10, fontStyle: 'normal' },
  hipercardText: { color: '#D71920', fontSize: 13, lineHeight: 16, fontStyle: 'italic' },
  mastercardMark: { width: 44, height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  mcCircle: { width: 28, height: 28, borderRadius: 14 },
  mcCircleOverlap: { marginLeft: -10, opacity: 0.9 },
  errorText: { color: '#EF123A', fontSize: 12, lineHeight: 16, fontWeight: '600', textAlign: 'center' },
  sectionCard: { borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', padding: 15, gap: 14 },
  sectionTitle: { color: TEXT, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  sectionSubtitle: { marginTop: -11, color: MUTED, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  fieldRowCompact: { flex: 1, minWidth: 0, gap: 9 },
  fieldIconBox: { width: 42, height: 42, borderRadius: 11, backgroundColor: '#F2F0FF', alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  fieldBody: { flex: 1, minWidth: 0 },
  inputLabel: { color: MUTED, fontSize: 12, lineHeight: 16, fontWeight: '400', marginBottom: 4 },
  input: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#DDE1EF', backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: TEXT, fontSize: 14, lineHeight: 18, fontWeight: '500', paddingVertical: 0 },
  twoColumns: { flexDirection: 'row', gap: 12 },
  configGrid: { gap: 12 },
  tipCard: { minHeight: 74, borderRadius: 15, backgroundColor: '#F2F0FF', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tipIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#ECE9FF', alignItems: 'center', justifyContent: 'center' },
  tipTextWrap: { flex: 1, minWidth: 0 },
  tipTitle: { color: PRIMARY, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  tipText: { marginTop: 2, color: MUTED, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  accountCard: { height: 66, borderRadius: 14, borderWidth: 1, borderColor: '#DDE1EF', flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  accountIcon: { width: 46, height: 46, borderRadius: 11, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  accountInfo: { flex: 1, minWidth: 0 },
  accountName: { color: TEXT, fontSize: 15, lineHeight: 19, fontWeight: '700' },
  accountMeta: { marginTop: 1, color: MUTED, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  submitButton: { height: 56, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY, shadowColor: PRIMARY, shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  submitButtonDisabled: { opacity: 0.72 },
  submitText: { color: '#FFFFFF', fontSize: 16, lineHeight: 20, fontWeight: '600' },
});
