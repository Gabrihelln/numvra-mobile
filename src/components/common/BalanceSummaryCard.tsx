import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowDown, ArrowUp, Eye, EyeOff } from 'lucide-react-native';

interface BalanceSummaryCardProps { period: string; balance: number; income: number; expense: number; isBalanceVisible: boolean; isDarkMode: boolean; onToggleBalance: () => void; }
const money = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const BalanceSummaryCard: React.FC<BalanceSummaryCardProps> = ({ period, balance, income, expense, isBalanceVisible, isDarkMode, onToggleBalance }) => (
  <View style={styles.wrapper}>
    <View style={styles.card}>
      <View style={styles.content}><View style={styles.header}><View style={styles.titleRow}><Text style={styles.title}>Saldo</Text><TouchableOpacity onPress={onToggleBalance} hitSlop={8}>{isBalanceVisible ? <EyeOff size={19} color="#fff" /> : <Eye size={19} color="#fff" />}</TouchableOpacity></View><Text style={styles.period}>{period}</Text></View><Text style={styles.amount}>R$ {isBalanceVisible ? money(balance) : '••••••'}</Text></View>
    </View>
    <View style={[styles.summary, { backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF' }]}>
      <Item label="Receitas" value={income} icon={<ArrowDown size={34} color="#49CE68" strokeWidth={2.8} />} isDarkMode={isDarkMode} isBalanceVisible={isBalanceVisible} />
      <View style={[styles.divider, { backgroundColor: isDarkMode ? '#3F3F4A' : '#D1D1D1' }]} />
      <Item label="Despesas" value={expense} icon={<ArrowUp size={34} color="#EC6269" strokeWidth={2.8} />} isDarkMode={isDarkMode} isBalanceVisible={isBalanceVisible} />
    </View>
  </View>
);

const Item: React.FC<{ label: string; value: number; icon: React.ReactNode; isDarkMode: boolean; isBalanceVisible: boolean }> = ({ label, value, icon, isDarkMode, isBalanceVisible }) => <View style={styles.item}>{icon}<View style={styles.itemText}><Text style={[styles.label, { color: isDarkMode ? '#D4D4D8' : '#17171C' }]}>{label}</Text><Text style={[styles.value, { color: isDarkMode ? '#FFFFFF' : '#111118' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>R$ {isBalanceVisible ? money(value) : '••••••'}</Text></View></View>;
const styles = StyleSheet.create({ wrapper: { marginHorizontal: 20, height: 182, marginBottom: 12 }, card: { height: 150, overflow: 'hidden', borderRadius: 30, backgroundColor: '#7561FF', shadowColor: '#7561FF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 5 }, content: { paddingHorizontal: 22, paddingTop: 22 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 }, title: { color: '#fff', fontSize: 16, fontWeight: '600' }, period: { color: '#fff', fontSize: 16, fontWeight: '600' }, amount: { color: '#fff', fontSize: 40, lineHeight: 48, fontWeight: '800', letterSpacing: -1, marginTop: 8 }, summary: { position: 'absolute', left: 12, right: 12, bottom: 0, height: 68, borderRadius: 26, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, shadowColor: '#1C1C28', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 }, item: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }, itemText: { flex: 1 }, divider: { width: 1, height: 52, marginHorizontal: 10 }, label: { fontSize: 14, fontWeight: '400', lineHeight: 18 }, value: { fontSize: 18, fontWeight: '800', lineHeight: 22 } });
