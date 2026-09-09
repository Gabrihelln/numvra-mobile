import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Clipboard, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowDown, ArrowUp, Calendar as CalendarIcon, CheckCircle2, ChevronRight, Copy, CreditCard, FileText, Hash, MoreHorizontal, Pencil, ReceiptText, RefreshCw, Tag, Trash2 } from 'lucide-react-native';
import { BackButton } from '../components/common/BackButton';
import { TransactionIcon } from '../components/common/TransactionIcon';
import { useTheme } from '../contexts/ThemeContext';
import { transactionService, getTransactionTimestamp } from '../services/transactionService';
import { Transaction, TransactionEvent } from '../types';

const PRIMARY = '#5748FF';
const TEXT = '#10152F';
const MUTED = '#6F7894';
const DANGER = '#EF123A';
const SUCCESS = '#10B981';
const BORDER = '#E8EBF4';

type StatusConfig = { label: string; color: string; bg: string; helper: string };
const statusConfig: Record<string, StatusConfig> = {
  completed: { label: 'Concluída', color: SUCCESS, bg: '#DDF8E9', helper: 'Pagamento realizado' },
  pending: { label: 'Pendente', color: '#F59E0B', bg: '#FEF3C7', helper: 'Aguardando processamento' },
  scheduled: { label: 'Agendada', color: PRIMARY, bg: '#F0EDFF', helper: 'Movimentação agendada' },
  canceled: { label: 'Cancelada', color: MUTED, bg: '#EEF1F7', helper: 'Movimentação cancelada' },
  failed: { label: 'Falhou', color: DANGER, bg: '#FDE7EC', helper: 'Falha no processamento' },
};
const paymentLabels: Record<string, string> = { cash: 'Conta corrente', credit_card: 'Cartão de crédito', pix: 'PIX', debit: 'Débito', transfer: 'Transferência', boleto: 'Boleto', other: 'Outros' };
const recurrenceLabels: Record<string, string> = { weekly: 'semanal', monthly: 'mensal', quarterly: 'trimestral', semiannual: 'semestral', annual: 'anual' };
const formatMoney = (value: number) => `${value < 0 ? '- ' : '+ '}R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const parseLocalDate = (value?: string) => { const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); const d = value ? new Date(value) : new Date(); return Number.isNaN(d.getTime()) ? new Date() : d; };
const formatLongDate = (value?: string | Date) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(value instanceof Date ? value : parseLocalDate(value));
const formatEventDate = (value?: string | Date | number) => { const date = typeof value === 'number' ? new Date(value) : value instanceof Date ? value : value ? new Date(value) : new Date(); return `${formatLongDate(date)} às ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; };
const relativeDate = (value?: string) => { const d = parseLocalDate(value); const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const diff = Math.round((today.getTime() - day.getTime()) / 86400000); if (diff === 0) return 'Hoje'; if (diff === 1) return 'Ontem'; if (diff < 30) return `Há ${diff} dias`; const months = Math.max(1, Math.round(diff / 30)); return `Há ${months} ${months === 1 ? 'mês' : 'meses'}`; };
const publicIdFor = (tx: Transaction) => tx.publicId || String(Math.abs(tx.id.split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0))).padStart(9, '0').slice(0, 9);
const eventTimestamp = (event: TransactionEvent) => { if (event.createdMs) return event.createdMs; if (typeof event.createdAt === 'string') return new Date(event.createdAt).getTime(); if (typeof event.createdAt?.toMillis === 'function') return event.createdAt.toMillis(); return 0; };

export const TransactionDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const transactionId = route.params?.transactionId as string | undefined;

  useEffect(() => transactionService.subscribeToTransactions((next) => { setTransactions(next); setLoading(false); }), []);
  const transaction = useMemo(() => transactions.find((item) => item.id === transactionId), [transactions, transactionId]);
  const events = useMemo(() => {
    if (!transaction) return [] as TransactionEvent[];
    if (transaction.transactionEvents?.length) return [...transaction.transactionEvents].sort((a, b) => eventTimestamp(b) - eventTimestamp(a));
    const ms = getTransactionTimestamp(transaction) || Date.now();
    return [{ id: 'legacy-created', type: 'created', title: 'Movimentação criada', description: 'Transação registrada no Numvra.', createdMs: ms } as TransactionEvent];
  }, [transaction]);

  if (loading) return <View style={[styles.center, { backgroundColor: isDarkMode ? '#121214' : '#FAF9FF' }]}><ActivityIndicator color={PRIMARY} /></View>;
  if (!transaction) return <View style={[styles.center, { backgroundColor: isDarkMode ? '#121214' : '#FAF9FF' }]}><Text style={{ color: colors.text }}>Movimentação não encontrada.</Text></View>;

  const positive = transaction.type === 'income';
  const status = statusConfig[transaction.status || 'completed'] || statusConfig.completed;
  const isRecurring = !!transaction.isRecurring || !!transaction.nextBilling;
  const recurrence = isRecurring ? `Sim, ${recurrenceLabels[transaction.recurrencePeriod || 'monthly'] || 'mensal'}` : 'Não';
  const source = transaction.cardName || transaction.sourceName || (transaction.isCardCharge ? 'Cartão' : 'Conta principal • Conta corrente');

  const copyPublicId = (value: string) => { Clipboard.setString(value); Alert.alert('ID copiado', `#${value} foi copiado.`); };
  const remove = () => Alert.alert('Excluir movimentação?', 'Essa ação não poderá ser desfeita.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: async () => { await transactionService.deleteTransaction(transaction.id, { cardId: transaction.cardId, amount: transaction.amount, isCardCharge: transaction.isCardCharge }); navigation.goBack(); } }]);
  const duplicate = async () => { await transactionService.duplicateTransaction(transaction); Alert.alert('Movimentação duplicada', 'Uma nova movimentação foi criada com base nesta.'); navigation.goBack(); };

  const DetailRow = ({ icon, label, value, right, chevron = true, copy = false }: { icon: React.ReactNode; label: string; value: string; right?: string; chevron?: boolean; copy?: boolean }) => <View style={styles.detailRow}><View style={styles.detailIcon}>{icon}</View><View style={styles.detailCopy}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>{right && <Text style={styles.detailRight}>{right}</Text>}{copy ? <TouchableOpacity onPress={() => copyPublicId(value.replace('#', ''))}><Copy size={18} color={TEXT} /></TouchableOpacity> : chevron ? <ChevronRight size={20} color={TEXT} /> : null}</View>;

  return <SafeAreaView style={[styles.safe, { backgroundColor: isDarkMode ? '#121214' : '#FAF9FF' }]}><ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 8) + 10, paddingBottom: Math.max(insets.bottom, 16) + 26 }]} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><BackButton onPress={() => navigation.goBack()} /><View style={styles.headerText}><Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Detalhes da movimentação</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>Veja todas as informações desta transação.</Text></View><TouchableOpacity style={styles.more}><MoreHorizontal size={22} color={TEXT} /></TouchableOpacity></View>
    <View style={[styles.hero, { backgroundColor: positive ? '#ECFDF5' : '#FFF1F3' }]}><TransactionIcon transaction={transaction} icon={transaction.icon} category={transaction.category} categoryColor={transaction.categoryColor} type={transaction.type} /><View style={styles.heroCopy}><Text style={styles.heroTitle} numberOfLines={1}>{transaction.title || transaction.description}</Text><Text style={styles.heroSub}>{transaction.category}</Text><View style={[styles.typeBadge, { backgroundColor: positive ? '#DDF8E9' : '#FDE2E7' }]}>{positive ? <ArrowUp size={15} color={SUCCESS} /> : <ArrowDown size={15} color={DANGER} />}<Text style={[styles.typeBadgeText, { color: positive ? SUCCESS : DANGER }]}>{positive ? 'Receita' : 'Despesa'}</Text></View></View><View style={styles.heroRight}><Text style={[styles.heroAmount, { color: positive ? SUCCESS : DANGER }]}>{formatMoney(transaction.amount)}</Text><Text style={styles.statusHelper}>{status.helper}</Text><View style={[styles.statusBadge, { backgroundColor: status.bg }]}><CheckCircle2 size={15} color={status.color} /><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View></View></View>
    <View style={styles.detailCard}><DetailRow icon={<CalendarIcon size={22} color={PRIMARY} />} label="Data da movimentação" value={formatLongDate(transaction.date)} right={relativeDate(transaction.date)} chevron={false} /><DetailRow icon={<CreditCard size={22} color={PRIMARY} />} label="Conta / Cartão" value={source} /><DetailRow icon={<Tag size={22} color={PRIMARY} />} label="Categoria" value={transaction.category} /><DetailRow icon={<FileText size={22} color={PRIMARY} />} label="Descrição" value={transaction.description || transaction.title || '-'} /><DetailRow icon={<ReceiptText size={22} color={PRIMARY} />} label="Tipo de pagamento" value={paymentLabels[transaction.paymentMethod || 'cash'] || transaction.paymentMethod || 'Conta corrente'} /><DetailRow icon={<RefreshCw size={22} color={PRIMARY} />} label="É recorrente?" value={recurrence} /><DetailRow icon={<Hash size={22} color={PRIMARY} />} label="ID da transação" value={`#${publicIdFor(transaction)}`} chevron={false} copy /></View>
    {isRecurring && transaction.nextBilling && <TouchableOpacity style={styles.nextCard}><View style={styles.nextIcon}><RefreshCw size={25} color={PRIMARY} /></View><View style={{ flex: 1 }}><Text style={styles.nextTitle}>Próxima cobrança</Text><Text style={styles.nextDate}>{formatLongDate(transaction.nextBilling)}</Text></View><ChevronRight size={24} color={PRIMARY} /></TouchableOpacity>}
    <View style={styles.historyWrap}><Text style={styles.historyTitle}>Histórico da transação</Text><View style={styles.timeline}>{events.map((event, index) => <View key={event.id} style={styles.eventRow}><View style={styles.eventRail}><View style={[styles.dot, index === 0 && styles.dotActive]} />{index < events.length - 1 && <View style={styles.rail} />}</View><View style={styles.eventCopy}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventDate}>{formatEventDate(event.createdMs || event.createdAt)}</Text>{event.description && <Text style={styles.eventDesc}>{event.description}</Text>}</View></View>)}</View></View>
    <View style={styles.actions}><TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AddTransactionModal', { transaction })}><Pencil size={22} color={PRIMARY} /><Text style={styles.actionText}>Editar</Text></TouchableOpacity><TouchableOpacity style={styles.actionButton} onPress={duplicate}><Copy size={22} color={PRIMARY} /><Text style={styles.actionText}>Duplicar</Text></TouchableOpacity><TouchableOpacity style={[styles.actionButton, styles.deleteAction]} onPress={remove}><Trash2 size={22} color={DANGER} /><Text style={[styles.actionText, { color: DANGER }]}>Excluir</Text></TouchableOpacity></View>
  </ScrollView></SafeAreaView>;
};

const styles = StyleSheet.create({
  safe: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { paddingHorizontal: 18, gap: 16 }, header: { flexDirection: 'row', alignItems: 'center', gap: 14 }, headerText: { flex: 1, minWidth: 0 }, title: { fontSize: 22, lineHeight: 28, fontWeight: '800' }, subtitle: { fontSize: 13, lineHeight: 17 }, more: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  hero: { minHeight: 118, borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13 }, heroCopy: { flex: 1, minWidth: 0 }, heroTitle: { color: TEXT, fontSize: 20, fontWeight: '800' }, heroSub: { color: MUTED, fontSize: 13, marginTop: 3 }, typeBadge: { marginTop: 8, alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, height: 28, flexDirection: 'row', alignItems: 'center', gap: 6 }, typeBadgeText: { fontSize: 12, fontWeight: '800' }, heroRight: { alignItems: 'flex-end', gap: 7 }, heroAmount: { fontSize: 20, fontWeight: '800' }, statusHelper: { color: MUTED, fontSize: 12, fontWeight: '600' }, statusBadge: { height: 27, borderRadius: 11, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }, statusText: { fontSize: 12, fontWeight: '800' },
  detailCard: { borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFF', paddingHorizontal: 14 }, detailRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#EDF0F7' }, detailIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#F0EDFF', alignItems: 'center', justifyContent: 'center' }, detailCopy: { flex: 1, minWidth: 0 }, detailLabel: { color: MUTED, fontSize: 13, fontWeight: '600' }, detailValue: { color: TEXT, fontSize: 14, fontWeight: '800', marginTop: 4 }, detailRight: { color: MUTED, fontSize: 13, fontWeight: '600' },
  nextCard: { minHeight: 72, borderRadius: 17, backgroundColor: '#F0EDFF', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, nextIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#E7E2FF', alignItems: 'center', justifyContent: 'center' }, nextTitle: { color: PRIMARY, fontSize: 14, fontWeight: '800' }, nextDate: { color: TEXT, fontSize: 15, fontWeight: '800', marginTop: 5 },
  historyWrap: { borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFF', padding: 14, gap: 12 }, historyTitle: { color: TEXT, fontSize: 16, fontWeight: '800' }, timeline: { borderRadius: 16, borderWidth: 1, borderColor: '#EDF0F7', padding: 14 }, eventRow: { flexDirection: 'row', gap: 12 }, eventRail: { width: 18, alignItems: 'center' }, dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#9AA2B6' }, dotActive: { backgroundColor: SUCCESS }, rail: { flex: 1, width: 1, backgroundColor: '#DDE2EE', marginTop: 3 }, eventCopy: { flex: 1, paddingBottom: 22 }, eventTitle: { color: TEXT, fontSize: 14, fontWeight: '800' }, eventDate: { color: MUTED, fontSize: 12, marginTop: 5 }, eventDesc: { color: MUTED, fontSize: 12, marginTop: 5, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 }, actionButton: { flex: 1, height: 56, borderRadius: 15, backgroundColor: '#F3F1FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, deleteAction: { backgroundColor: '#FFF1F3' }, actionText: { color: PRIMARY, fontSize: 15, fontWeight: '800' },
});