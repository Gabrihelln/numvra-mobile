import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ModalBottomSheet } from '../common/ModalBottomSheet';
import { useTheme } from '../../contexts/ThemeContext';
import { useCategories } from '../../contexts/CategoryContext';
import { budgetService } from '../../services/budgetService';
import { BudgetCategory } from '../../types';
import { CATEGORY_ICON_PRESETS, getIconComponent } from '../../constants/iconRegistry';
import { normalizeCategoryName } from '../../constants/categories';

export const CategoryLimitEditor = ({ isOpen, onClose, category }: {
  isOpen: boolean; onClose: () => void; category: BudgetCategory | null;
}) => {
  const { colors } = useTheme();
  const { categories } = useCategories();
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [icon, setIcon] = useState('home');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    setName(category?.name || '');
    setLimit(category?.limitAmount ? category.limitAmount.toFixed(2).replace('.', ',') : '');
    setIcon(category?.icon || 'home');
    setType(category?.type || 'expense');
    setError('');
  }, [isOpen, category]);
  const save = async () => {
    const amount = limit.trim() ? Number(limit.replace(/\./g, '').replace(',', '.')) : 0;
    if (!name.trim() || name.trim().length > 100) { setError('Informe um nome de até 100 caracteres.'); return; }
    if (!Number.isFinite(amount) || amount < 0) { setError('Informe um limite válido ou deixe vazio para não limitar.'); return; }
    if (categories.some((item) => item.id !== category?.id && normalizeCategoryName(item.name) === normalizeCategoryName(name))) {
      setError('Já existe uma categoria com esse nome.'); return;
    }
    setBusy(true);
    try {
      const data = { name: name.trim(), limitAmount: type === 'expense' ? amount : 0, icon, type };
      if (category) await budgetService.updateBudgetCategory(category.id, data);
      else await budgetService.addBudgetCategory({ ...data, percentage: 0, active: true });
      onClose();
    } catch { setError('Não foi possível salvar. Verifique a conexão e tente novamente.'); }
    finally { setBusy(false); }
  };
  const remove = () => Alert.alert('Excluir categoria', 'A categoria será removida das listas. As movimentações anteriores serão mantidas.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: async () => {
      if (!category) return;
      setBusy(true);
      try { await budgetService.deleteBudgetCategory(category.id); onClose(); }
      catch { setError('Não foi possível excluir a categoria. Tente novamente.'); }
      finally { setBusy(false); }
    } },
  ]);
  const inputStyle = { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text };
  return <ModalBottomSheet isOpen={isOpen} onClose={() => { if (!busy) onClose(); }} title={category ? 'Editar categoria' : 'Nova categoria'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Text style={{ color: colors.text }}>Nome da categoria</Text>
      <TextInput value={name} onChangeText={setName} maxLength={100} editable={!busy} style={inputStyle} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {(['expense', 'income'] as const).map((value) => <TouchableOpacity key={value} disabled={busy} onPress={() => setType(value)} style={{ ...inputStyle, flex: 1, borderColor: type === value ? colors.primary : colors.border }}>
          <Text style={{ color: colors.text }}>{value === 'expense' ? 'Despesa' : 'Receita'}</Text>
        </TouchableOpacity>)}
      </View>
      {type === 'expense' && <>
        <Text style={{ color: colors.text }}>Limite mensal (R$)</Text>
        <TextInput value={limit} onChangeText={(value) => setLimit(value.replace(/[^0-9,.]/g, ''))} editable={!busy} keyboardType="decimal-pad" placeholder="Sem limite" placeholderTextColor={colors.textMuted} style={inputStyle} />
        <Text style={{ color: colors.textSecondary }}>Vazio ou zero remove o limite. Cada categoria tem seu próprio valor, sem depender de porcentagens.</Text>
      </>}
      <Text style={{ color: colors.text }}>Ícone</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {CATEGORY_ICON_PRESETS.map((item) => { const Icon = getIconComponent(item.key); return <TouchableOpacity key={item.key} accessibilityLabel={item.label} disabled={busy} onPress={() => setIcon(item.key)} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: icon === item.key ? colors.primary : colors.border }}>
          <Icon size={22} color={item.color} />
        </TouchableOpacity>; })}
      </View>
      <TouchableOpacity disabled={busy} onPress={save} style={{ padding: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' }}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Salvar categoria</Text>}
      </TouchableOpacity>
      {category && <TouchableOpacity disabled={busy} onPress={remove} style={{ padding: 14, alignItems: 'center' }}><Text style={{ color: colors.danger }}>Excluir categoria</Text></TouchableOpacity>}
    </ScrollView>
  </ModalBottomSheet>;
};
