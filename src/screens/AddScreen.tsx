import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowDown, ArrowUp, Banknote, Calculator, Calendar as CalendarIcon, ChevronDown, ChevronRight, CreditCard, Info, Layers } from 'lucide-react-native';
import { BackButton } from '../components/common/BackButton';
import { CalendarPicker } from '../components/common/CalendarPicker';
import { ModalBottomSheet } from '../components/common/ModalBottomSheet';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useBudgets } from '../hooks/useBudgets';
import { transactionService } from '../services/transactionService';
import { cardService } from '../services/cardService';
import { getCategoryVisual } from '../constants/iconRegistry';
import { CreditCardType, Transaction } from '../types';
import { toApiDate } from '../utils/dateFormat';

const PRIMARY = '#5748FF';
const TEXT = '#10152F';
const MUTED = '#6F7894';
const BORDER = '#E5E8F2';
const SOFT = '#F5F6FC';
const DESC_LIMIT = 60;
const NOTES_LIMIT = 120;
const MAX_INSTALLMENTS = 12;
type PaymentMethod = 'cash' | 'credit_card' | 'pix' | 'debit' | 'transfer' | 'boleto' | 'other';

const incomeFallback = [
  { id: 'salary', label: 'Salário', icon: 'banknote', color: '#10B981' },
  { id: 'gift', label: 'Presente', icon: 'gift', color: '#EC4899' },
  { id: 'other-income', label: 'Outros', icon: 'plus', color: '#6B7280' },
];
const expenseFallback = [
  { id: 'home', label: 'Moradia', icon: 'home', color: PRIMARY },
  { id: 'food', label: 'Alimentação', icon: 'utensils', color: '#EF5B3F' },
  { id: 'transport', label: 'Transporte', icon: 'car', color: '#F59E0B' },
  { id: 'health', label: 'Saúde', icon: 'heartpulse', color: '#10B981' },
  { id: 'leisure', label: 'Lazer', icon: 'theater', color: '#2D9CDB' },
  { id: 'education', label: 'Educação', icon: 'graduationcap', color: '#7C3AED' },
  { id: 'other', label: 'Outros', icon: 'plus', color: '#6B7280' },
];
const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Conta corrente', credit_card: 'Cartão de crédito', pix: 'PIX', debit: 'Débito', transfer: 'Transferência', boleto: 'Boleto', other: 'Outros',
};
const paymentMethods: PaymentMethod[] = ['cash', 'credit_card', 'pix', 'debit', 'transfer', 'boleto', 'other'];

const normalize = (value?: string) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const formatMoney = (value: number) => `R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatRawAmount = (raw: string) => ((Number(raw.replace(/\D/g, '') || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const amountFromRaw = (raw: string) => Number(raw.replace(/\D/g, '') || 0) / 100;
const rawFromAmount = (value?: number) => String(Math.round(Math.abs(value || 0) * 100));
const parseLocalDate = (value?: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};
const formatLongDate = (value: Date | string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(value instanceof Date ? value : parseLocalDate(value));
const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
const splitInstallments = (total: number, count: number) => {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const rest = cents % count;
  return Array.from({ length: count }, (_, index) => (base + (index < rest ? 1 : 0)) / 100);
};
const groupId = () => `inst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const AddScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editTx = route.params?.transaction as Transaction | undefined;
  const isEditing = !!editTx?.id;
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const { user, checkLimit, triggerUpgrade } = useAuth();
  const { activeBudgetCategories, loading: categoriesLoading } = useBudgets();
  const { width } = useWindowDimensions();
  const compact = width < 360;

  const [type, setType] = useState<'expense' | 'income'>(editTx?.type || 'expense');
  const [description, setDescription] = useState((editTx?.description || editTx?.title || '').slice(0, DESC_LIMIT));
  const [amountRaw, setAmountRaw] = useState(rawFromAmount(editTx?.amount));
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [date, setDate] = useState(parseLocalDate(editTx?.date));
  const [firstDate, setFirstDate] = useState(parseLocalDate(editTx?.date));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>((editTx?.paymentMethod as PaymentMethod) || (editTx?.isCardCharge ? 'credit_card' : 'cash'));
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [selectedCardId, setSelectedCardId] = useState(editTx?.cardId || '');
  const [installmentEnabled, setInstallmentEnabled] = useState((editTx?.installments || 1) > 1);
  const [installments, setInstallments] = useState(Math.min(editTx?.installments || 3, MAX_INSTALLMENTS));
  const [notes, setNotes] = useState((editTx?.notes || '').slice(0, NOTES_LIMIT));
  const [openDate, setOpenDate] = useState(false);
  const [openFirstDate, setOpenFirstDate] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [openInstallments, setOpenInstallments] = useState(false);
  const [openCards, setOpenCards] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardAccess = checkLimit('card');

  useEffect(() => cardService.subscribeToCards((next) => {
    setCards(next);
    if (!selectedCardId && next[0]) setSelectedCardId(next[0].id);
  }), [selectedCardId]);

  const categories = useMemo(() => {
    const configured = activeBudgetCategories.filter((cat) => cat.type === type || (type === 'expense' && !cat.type)).map((cat) => ({ id: cat.id, label: cat.name || 'Sem categoria', icon: cat.icon, color: cat.color }));
    return configured.length ? configured : type === 'income' ? incomeFallback : expenseFallback;
  }, [activeBudgetCategories, type]);

  useEffect(() => {
    if (!editTx) return;
    const found = categories.findIndex((cat) => normalize(cat.label) === normalize(editTx.category));
    if (found >= 0) setCategoryIndex(found);
  }, [categories, editTx]);

  const selectedCategory = categories[categoryIndex] || categories[0];
  const selectedCard = cards.find((card) => card.id === selectedCardId);
  const amount = amountFromRaw(amountRaw);
  const isCard = type === 'expense' && paymentMethod === 'credit_card';
  const totalInstallments = isCard && installmentEnabled ? Math.max(2, installments) : 1;
  const parts = splitInstallments(amount, totalInstallments);

  const selectType = (next: 'expense' | 'income') => {
    setType(next);
    setCategoryIndex(0);
    if (next === 'income') {
      setPaymentMethod('cash');
      setInstallmentEnabled(false);
    }
  };

  const selectPayment = (method: PaymentMethod) => {
    if (method === 'credit_card' && !cardAccess.allowed) {
      triggerUpgrade?.('card', cardAccess.reason);
      return;
    }
    setPaymentMethod(method);
    if (method !== 'credit_card') setInstallmentEnabled(false);
    setOpenPayment(false);
  };

  const save = async () => {
    if (amount <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero para a movimentação.');
      return;
    }
    if (isCard && !selectedCard) {
      Alert.alert('Cartão necessário', 'Selecione um cartão válido para registrar uma compra no cartão.');
      return;
    }
    const visual = getCategoryVisual(selectedCategory?.icon, selectedCategory?.color, isDarkMode);
    const category = selectedCategory?.label || (type === 'expense' ? 'Outros' : 'Salário');
    const desc = description.trim() || (type === 'expense' ? `Gasto com ${category}` : `Receita de ${category}`);
    setLoading(true);
    try {
      if (user) {
        if (isEditing && editTx) {
          await transactionService.updateTransaction(editTx.id, {
            title: desc, description: desc, notes: notes.trim() || undefined, amount: type === 'expense' ? -amount : amount,
            date: toApiDate(date), category, categoryColor: selectedCategory?.color || visual.color, icon: selectedCategory?.icon,
            type, paymentMethod, sourceType: isCard ? 'card' : 'account', sourceName: isCard && selectedCard ? selectedCard.name : 'Conta principal',
            isCardCharge: isCard, cardId: isCard ? selectedCard?.id : '',
            cardName: isCard && selectedCard ? `${selectedCard.name} • Cartão final ${selectedCard.finalDigits || selectedCard.lastFourDigits || '----'}` : '',
            status: editTx.status || 'completed',
            transactionEvents: [...(editTx.transactionEvents || []), { id: `evt-${Date.now()}`, type: 'updated', title: 'Movimentação atualizada', description: 'Dados atualizados no Numvra.', createdMs: Date.now(), createdAt: new Date().toISOString() }],
          });
          if (editTx.isCardCharge && editTx.cardId && editTx.type === 'expense') await cardService.adjustUsedLimit(editTx.cardId, -Math.abs(editTx.amount));
          if (isCard && selectedCard) await cardService.adjustUsedLimit(selectedCard.id, amount);
        } else {
          const installmentGroupId = totalInstallments > 1 ? groupId() : undefined;
          for (let index = 0; index < totalInstallments; index++) {
            const part = parts[index] || amount;
            await transactionService.addTransaction({
              title: totalInstallments > 1 ? `${desc} (${index + 1}/${totalInstallments})` : desc,
              description: desc, notes: notes.trim() || undefined, amount: type === 'expense' ? -part : part,
              date: toApiDate(totalInstallments > 1 ? addMonths(firstDate, index) : date), category, categoryColor: selectedCategory?.color || visual.color, icon: selectedCategory?.icon,
              type, paymentMethod, sourceType: isCard ? 'card' : 'account', sourceName: isCard && selectedCard ? selectedCard.name : 'Conta principal', isCardCharge: isCard,
              ...(isCard && selectedCard ? { cardId: selectedCard.id, cardName: `${selectedCard.name} • Cartão final ${selectedCard.finalDigits || selectedCard.lastFourDigits || '----'}` } : {}),
              installments: totalInstallments, currentInstallment: totalInstallments > 1 ? index + 1 : undefined, installmentGroupId, installmentNumber: totalInstallments > 1 ? index + 1 : undefined, installmentTotal: totalInstallments > 1 ? totalInstallments : undefined, status: 'completed',
            });
          }
        }
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro ao salvar', error?.message || 'Não foi possível salvar a movimentação.');
    } finally {
      setLoading(false);
    }
  };

  const TypeButton = ({ value, label }: { value: 'expense' | 'income'; label: string }) => {
    const selected = type === value;
    const Icon = value === 'expense' ? ArrowDown : ArrowUp;
    return <TouchableOpacity onPress={() => selectType(value)} style={[styles.typeButton, selected && styles.typeActive]}><View style={styles.typeIcon}><Icon size={22} color={selected ? PRIMARY : TEXT} strokeWidth={3} /></View><Text style={[styles.typeText, selected && styles.typeTextActive]}>{label}</Text></TouchableOpacity>;
  };

  return <SafeAreaView style={[styles.safe, { backgroundColor: isDarkMode ? '#121214' : '#FAF9FF' }]}><ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 8) + 10, paddingBottom: Math.max(insets.bottom, 16) + 26 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><BackButton onPress={() => navigation.goBack()} /><View style={styles.headerText}><Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{isEditing ? 'Editar movimentação' : 'Nova movimentação'}</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>Registre uma receita ou despesa no seu controle.</Text></View></View>
    <View style={styles.typeRow}><TypeButton value="expense" label="Despesa" /><TypeButton value="income" label="Receita" /></View>
    <View style={styles.card}><Text style={styles.cardTitle}>Valor</Text><View style={styles.amountBox}><Text style={styles.currency}>R$</Text><TextInput value={formatRawAmount(amountRaw)} onChangeText={(v) => setAmountRaw(v.replace(/\D/g, ''))} keyboardType="numeric" style={styles.amountInput} placeholder="0,00" placeholderTextColor="#A5ABBE" /><View style={styles.calc}><Calculator size={22} color={TEXT} /></View></View></View>
    <View style={styles.card}><View style={styles.rowBetween}><Text style={styles.cardTitle}>Categoria</Text><Text style={styles.link}>Ver todas</Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catList}>{categories.map((cat, index) => { const selected = index === categoryIndex; const visual = getCategoryVisual(cat.icon, cat.color, isDarkMode); const Icon = visual.Icon; return <TouchableOpacity key={cat.id} onPress={() => setCategoryIndex(index)} style={[styles.cat, selected && styles.catSelected]}><View style={[styles.catIcon, { backgroundColor: selected ? '#EEE9FF' : visual.backgroundColor }]}>{categoriesLoading ? <ActivityIndicator size="small" color={PRIMARY} /> : <Icon size={compact ? 22 : 24} color={selected ? PRIMARY : visual.color} />}</View><Text style={[styles.catText, selected && styles.catTextSelected]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{cat.label}</Text></TouchableOpacity>; })}</ScrollView></View>
    <View style={styles.card}><Text style={styles.cardTitle}>Descrição</Text><View style={styles.inputBox}><TextInput value={description} onChangeText={(v) => v.length <= DESC_LIMIT && setDescription(v)} placeholder="Ex.: Almoço no restaurante, mensalidade..." placeholderTextColor="#9AA2B6" style={styles.input} /><Text style={styles.counter}>{description.length}/{DESC_LIMIT}</Text></View></View>
    <View style={styles.card}><View style={styles.rowBetween}><Text style={styles.cardTitle}>Conta / Cartão</Text><TouchableOpacity onPress={() => navigation.navigate('Accounts')}><Text style={styles.link}>Gerenciar contas</Text></TouchableOpacity></View><TouchableOpacity style={styles.source} onPress={() => isCard ? setOpenCards(true) : setOpenPayment(true)}><View style={styles.sourceIcon}>{isCard ? <CreditCard size={25} color="#FFF" /> : <Banknote size={25} color="#FFF" />}</View><View style={{ flex: 1 }}><Text style={styles.sourceTitle}>{isCard && selectedCard ? selectedCard.name : 'Conta principal'}</Text><Text style={styles.sourceSub}>{isCard && selectedCard ? `Cartão final ${selectedCard.finalDigits || selectedCard.lastFourDigits || '----'}` : 'Conta corrente'}</Text></View><ChevronRight size={22} color={TEXT} /></TouchableOpacity></View>
    <View style={styles.two}><TouchableOpacity style={styles.selectCard} onPress={() => setOpenDate(true)}><View style={styles.smallIcon}><CalendarIcon size={22} color={PRIMARY} /></View><View style={{ flex: 1 }}><Text style={styles.selectLabel}>Data da movimentação</Text><Text style={styles.selectValue}>{formatLongDate(date)}</Text></View><ChevronDown size={18} color={TEXT} /></TouchableOpacity><TouchableOpacity style={styles.selectCard} onPress={() => setOpenPayment(true)}><View style={styles.smallIcon}><CreditCard size={22} color={PRIMARY} /></View><View style={{ flex: 1 }}><Text style={styles.selectLabel}>Tipo de pagamento</Text><Text style={styles.selectValue}>{paymentLabels[paymentMethod]}</Text></View><ChevronRight size={18} color={TEXT} /></TouchableOpacity></View>
    {isCard && <View style={styles.card}><View style={styles.rowBetween}><Text style={styles.cardTitle}>Parcelamento <Text style={styles.optional}>(opcional)</Text></Text><Switch value={installmentEnabled} onValueChange={setInstallmentEnabled} trackColor={{ false: '#DDE1EE', true: PRIMARY }} thumbColor="#FFF" /></View>{installmentEnabled && <><View style={styles.two}><TouchableOpacity style={styles.installSelect} onPress={() => setOpenInstallments(true)}><Text style={styles.selectLabel}>Número de parcelas</Text><Text style={styles.selectValue}>{installments} parcelas</Text></TouchableOpacity><TouchableOpacity style={styles.installSelect} onPress={() => setOpenFirstDate(true)}><Text style={styles.selectLabel}>Primeira parcela</Text><Text style={styles.selectValue} numberOfLines={1}>{formatLongDate(firstDate)}</Text></TouchableOpacity></View>{amount > 0 && <View style={styles.info}><Info size={17} color={PRIMARY} /><Text style={styles.infoText}>Serão criadas {totalInstallments} movimentações de {formatMoney(parts[0] || 0)}</Text></View>}</>}</View>}
    <View style={styles.card}><Text style={styles.cardTitle}>Observações <Text style={styles.optional}>(opcional)</Text></Text><View style={styles.notesBox}><TextInput value={notes} onChangeText={(v) => v.length <= NOTES_LIMIT && setNotes(v)} placeholder="Adicione alguma observação..." placeholderTextColor="#9AA2B6" multiline textAlignVertical="top" style={styles.notesInput} /><Text style={styles.notesCounter}>{notes.length}/{NOTES_LIMIT}</Text></View></View>
    <TouchableOpacity id="btn-confirm-add-movement" disabled={loading} onPress={save} style={[styles.submit, loading && { opacity: 0.7 }]}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>{isEditing ? 'Salvar alterações' : 'Salvar movimentação'}</Text>}</TouchableOpacity>
  </ScrollView><CalendarPicker isOpen={openDate} onClose={() => setOpenDate(false)} selectedDate={date} onSelect={setDate} /><CalendarPicker isOpen={openFirstDate} onClose={() => setOpenFirstDate(false)} selectedDate={firstDate} onSelect={setFirstDate} />
  <ModalBottomSheet isOpen={openPayment} onClose={() => setOpenPayment(false)} title="Tipo de pagamento"><View style={styles.sheet}>{paymentMethods.map((method) => type === 'income' && method === 'credit_card' ? null : <TouchableOpacity key={method} onPress={() => selectPayment(method)} style={[styles.sheetOption, paymentMethod === method && styles.sheetSelected]}><Text style={[styles.sheetText, paymentMethod === method && styles.sheetTextSelected]}>{paymentLabels[method]}</Text></TouchableOpacity>)}</View></ModalBottomSheet>
  <ModalBottomSheet isOpen={openInstallments} onClose={() => setOpenInstallments(false)} title="Número de parcelas"><View style={styles.sheetGrid}>{Array.from({ length: MAX_INSTALLMENTS - 1 }, (_, i) => i + 2).map((count) => <TouchableOpacity key={count} onPress={() => { setInstallments(count); setOpenInstallments(false); }} style={[styles.pill, installments === count && styles.pillSelected]}><Text style={[styles.pillText, installments === count && styles.pillTextSelected]}>{count}x</Text></TouchableOpacity>)}</View></ModalBottomSheet>
  <ModalBottomSheet isOpen={openCards} onClose={() => setOpenCards(false)} title="Escolher cartão"><View style={styles.sheet}>{cards.map((card) => <TouchableOpacity key={card.id} onPress={() => { setSelectedCardId(card.id); setOpenCards(false); }} style={[styles.sheetOption, selectedCardId === card.id && styles.sheetSelected]}><Text style={[styles.sheetText, selectedCardId === card.id && styles.sheetTextSelected]}>{card.name} • final {card.finalDigits || card.lastFourDigits || '----'}</Text></TouchableOpacity>)}</View></ModalBottomSheet>
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  safe: { flex: 1 }, content: { paddingHorizontal: 18, gap: 16 }, header: { flexDirection: 'row', alignItems: 'center', gap: 16 }, headerText: { flex: 1, minWidth: 0 }, title: { fontSize: 25, lineHeight: 31, fontWeight: '800' }, subtitle: { fontSize: 13, lineHeight: 17 },
  typeRow: { flexDirection: 'row', gap: 12 }, typeButton: { flex: 1, height: 54, borderRadius: 16, backgroundColor: SOFT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }, typeActive: { backgroundColor: PRIMARY }, typeIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }, typeText: { color: '#596174', fontSize: 15, fontWeight: '700' }, typeTextActive: { color: '#FFF' },
  card: { borderRadius: 18, borderWidth: 1, borderColor: '#E8EBF4', backgroundColor: '#FFF', padding: 14, gap: 12 }, cardTitle: { color: TEXT, fontSize: 15, fontWeight: '800' }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, link: { color: PRIMARY, fontSize: 13, fontWeight: '700' }, optional: { color: MUTED, fontWeight: '600' },
  amountBox: { height: 58, borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, currency: { color: TEXT, fontSize: 20, fontWeight: '800' }, amountInput: { flex: 1, color: '#A5ABBE', fontSize: 28, fontWeight: '800', padding: 0 }, calc: { width: 40, height: 40, borderRadius: 12, backgroundColor: SOFT, alignItems: 'center', justifyContent: 'center' },
  catList: { gap: 12, paddingRight: 4 }, cat: { width: 66, alignItems: 'center', gap: 6, borderRadius: 13, borderWidth: 1, borderColor: 'transparent', paddingVertical: 7 }, catSelected: { borderColor: PRIMARY, backgroundColor: '#F4F0FF' }, catIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, catText: { width: '100%', color: '#596174', fontSize: 11, fontWeight: '600', textAlign: 'center' }, catTextSelected: { color: PRIMARY, fontWeight: '800' },
  inputBox: { height: 46, borderRadius: 13, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, input: { flex: 1, color: TEXT, fontSize: 13, padding: 0 }, counter: { color: '#929AB1', fontSize: 12, fontWeight: '700' },
  source: { minHeight: 58, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }, sourceIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#6D28D9', alignItems: 'center', justifyContent: 'center' }, sourceTitle: { color: TEXT, fontSize: 15, fontWeight: '800' }, sourceSub: { color: MUTED, fontSize: 12, marginTop: 2 },
  two: { flexDirection: 'row', gap: 12 }, selectCard: { flex: 1, minHeight: 66, borderRadius: 16, borderWidth: 1, borderColor: '#E8EBF4', backgroundColor: '#FFF', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, smallIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#F0EDFF', alignItems: 'center', justifyContent: 'center' }, selectLabel: { color: MUTED, fontSize: 11, fontWeight: '600' }, selectValue: { color: TEXT, fontSize: 13, fontWeight: '800', marginTop: 3 },
  installSelect: { flex: 1, minHeight: 58, borderRadius: 13, borderWidth: 1, borderColor: BORDER, padding: 12, justifyContent: 'center' }, info: { minHeight: 40, borderRadius: 12, backgroundColor: '#F0EDFF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 }, infoText: { flex: 1, color: PRIMARY, fontSize: 12, fontWeight: '600' },
  notesBox: { minHeight: 86, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12, paddingBottom: 22 }, notesInput: { minHeight: 48, color: TEXT, fontSize: 13, padding: 0 }, notesCounter: { position: 'absolute', right: 12, bottom: 8, color: '#929AB1', fontSize: 12, fontWeight: '700' }, submit: { height: 56, borderRadius: 16, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, submitText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  sheet: { gap: 10 }, sheetOption: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFF', paddingHorizontal: 14, justifyContent: 'center' }, sheetSelected: { borderColor: PRIMARY, backgroundColor: '#F0EDFF' }, sheetText: { color: TEXT, fontSize: 14, fontWeight: '700' }, sheetTextSelected: { color: PRIMARY }, sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, pill: { width: '22.6%', height: 44, borderRadius: 13, backgroundColor: SOFT, alignItems: 'center', justifyContent: 'center' }, pillSelected: { backgroundColor: PRIMARY }, pillText: { color: TEXT, fontSize: 14, fontWeight: '800' }, pillTextSelected: { color: '#FFF' },
});