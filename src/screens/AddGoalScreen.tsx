import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Check, X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { goalService } from '../services/goalService';
import { CalendarPicker } from '../components/common/CalendarPicker';

const formatAmount = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return (Number(digits || '0') / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
};

export const AddGoalScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { checkLimit, triggerUpgrade } = useAuth();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [currentRaw, setCurrentRaw] = useState('');
  const [targetRaw, setTargetRaw] = useState('');
  const [date, setDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const planCheck = checkLimit('goal');
    if (!planCheck.allowed) {
      triggerUpgrade?.('goal', planCheck.reason);
      return;
    }

    const targetAmount = Number(targetRaw || '0') / 100;
    if (!title.trim() || targetAmount <= 0) {
      Alert.alert('Dados incompletos', 'Informe o nome e um valor objetivo maior que zero.');
      return;
    }
    setSaving(true);
    try {
      await goalService.addGoal({
        title: title.trim(),
        subtitle: subtitle.trim() || 'Meta Financeira',
        currentAmount: Number(currentRaw || '0') / 100,
        targetAmount,
        estimatedDate: format(date, "MMM yyyy", { locale: ptBR }),
        icon: '🎯',
      });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro ao salvar', error?.message || 'Não foi possível criar a meta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.close}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Nova Meta</Text>
          <View style={styles.close} />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>O que você está planejando?</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Ex: Viagem para o Japão" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]} />
        <Text style={[styles.label, { color: colors.text }]}>Descrição (opcional)</Text>
        <TextInput value={subtitle} onChangeText={setSubtitle} placeholder="Ex: Para as férias de 2027" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]} />
        <View style={styles.amountRow}>
          <View style={styles.amountField}><Text style={[styles.label, { color: colors.text }]}>Já tenho</Text><TextInput value={formatAmount(currentRaw)} onChangeText={(value) => setCurrentRaw(value.replace(/\D/g, ''))} keyboardType="numeric" style={[styles.input, styles.amountInput, { color: colors.success, backgroundColor: colors.surface }]} /></View>
          <View style={styles.amountField}><Text style={[styles.label, { color: colors.text }]}>Preciso de</Text><TextInput value={formatAmount(targetRaw)} onChangeText={(value) => setTargetRaw(value.replace(/\D/g, ''))} keyboardType="numeric" style={[styles.input, styles.amountInput, { color: colors.primary, backgroundColor: colors.surface }]} /></View>
        </View>
        <TouchableOpacity onPress={() => setCalendarOpen(true)} style={[styles.dateButton, { backgroundColor: colors.surface }]}>
          <Calendar size={20} color={colors.primary} /><View><Text style={[styles.dateLabel, { color: colors.textMuted }]}>QUANDO DESEJA ALCANÇAR?</Text><Text style={[styles.dateValue, { color: colors.text }]}>{format(date, "MMMM 'de' yyyy", { locale: ptBR })}</Text></View>
        </TouchableOpacity>
        <TouchableOpacity onPress={save} disabled={saving} style={[styles.save, { backgroundColor: colors.primary }]}>
          {saving ? <ActivityIndicator color="#fff" /> : <><Check size={20} color="#fff" /><Text style={styles.saveText}>Criar Meta Estratégica</Text></>}
        </TouchableOpacity>
      </ScrollView>
      <CalendarPicker isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} selectedDate={date} onSelect={setDate} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({ safeArea: { flex: 1 }, content: { padding: 20, gap: 10, paddingBottom: 36 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, close: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }, title: { fontSize: 18, fontWeight: '800' }, label: { fontSize: 12, fontWeight: '700', marginTop: 4 }, input: { height: 48, borderRadius: 14, paddingHorizontal: 14, fontSize: 14, fontWeight: '600' }, amountRow: { flexDirection: 'row', gap: 12 }, amountField: { flex: 1 }, amountInput: { fontWeight: '800' }, dateButton: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, marginTop: 8 }, dateLabel: { fontSize: 9, fontWeight: '800' }, dateValue: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize', marginTop: 2 }, save: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 14 }, saveText: { color: '#fff', fontWeight: '800', fontSize: 14 } });
