import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Banknote, ChevronRight, Landmark, Plus, ToggleLeft, ToggleRight, Trash2, Wallet } from 'lucide-react-native';
import { BackButton } from '../components/common/BackButton';
import { useAccounts } from '../hooks/useAccounts';
import { useTheme } from '../contexts/ThemeContext';
import { Account } from '../types';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PRIMARY = '#5748FF';
const DANGER = '#E11919';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getAccountIcon = (account: Account) => {
  if (account.accountKind === 'cash') return Banknote;
  if (account.accountKind === 'wallet') return Wallet;
  return Landmark;
};

export const AccountsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const { accounts, loading, error, updateAccount, deleteAccount } = useAccounts();
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeAccounts = useMemo(() => accounts.filter((account) => account.isActive !== false), [accounts]);
  const totalBalance = activeAccounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const cardBg = isDarkMode ? '#1E1E26' : '#FFFFFF';
  const border = isDarkMode ? '#2A2A32' : '#E9ECF6';
  const muted = isDarkMode ? '#A1A1AA' : '#687292';

  const handleToggleActive = async (account: Account) => {
    try {
      setBusyId(account.id);
      await updateAccount(account.id, { isActive: account.isActive === false });
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível atualizar a conta.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (account: Account) => {
    Alert.alert('Excluir conta', `Deseja excluir ${account.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyId(account.id);
            await deleteAccount(account.id);
          } catch (error) {
            Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível excluir a conta.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: isDarkMode ? '#121214' : '#FFFFFF' }]} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 8) + 8, paddingBottom: Math.max(insets.bottom, 16) + 32 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]}>Minhas contas</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Gerencie bancos, carteiras e contas manuais.</Text>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1E1E26' : '#F7F5FF', borderColor: border }]}>
          <View style={styles.summaryIcon}><Landmark size={30} color={PRIMARY} strokeWidth={2.5} /></View>
          <View style={styles.summaryCopy}>
            <Text style={[styles.summaryLabel, { color: muted }]}>Saldo total das contas ativas</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{money(totalBalance)}</Text>
            <Text style={[styles.summaryHint, { color: muted }]}>{activeAccounts.length} de {accounts.length} contas ativas</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddAccount')} activeOpacity={0.86}>
          <Plus size={22} color="#FFFFFF" strokeWidth={2.8} />
          <Text style={styles.addButtonText}>Adicionar nova conta</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={[styles.stateCard, { backgroundColor: cardBg, borderColor: border }]}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={[styles.stateText, { color: muted }]}>Carregando contas</Text>
          </View>
        ) : error ? (
          <View style={[styles.stateCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Wallet size={30} color={PRIMARY} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Contas indisponíveis</Text>
            <Text style={[styles.stateText, { color: muted }]}>Não foi possível carregar suas contas. Verifique as permissões do Firestore para a coleção accounts.</Text>
          </View>
        ) : accounts.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Wallet size={30} color={PRIMARY} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma conta cadastrada</Text>
            <Text style={[styles.stateText, { color: muted }]}>Adicione uma conta manual para organizar suas movimentações.</Text>
          </View>
        ) : (
          <View style={[styles.listCard, { backgroundColor: cardBg, borderColor: border }]}>
            {accounts.map((account, index) => {
              const Icon = getAccountIcon(account);
              const inactive = account.isActive === false;
              const busy = busyId === account.id;
              return (
                <View key={account.id} style={[styles.accountRow, index < accounts.length - 1 && { borderBottomColor: border, borderBottomWidth: 1 }, inactive && styles.inactiveRow]}>
                  <View style={styles.accountIcon}><Icon size={24} color={PRIMARY} strokeWidth={2.5} /></View>
                  <TouchableOpacity style={styles.accountCopy} onPress={() => navigation.navigate('AddAccount', { accountId: account.id })} activeOpacity={0.75}>
                    <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>{account.name}</Text>
                    <Text style={[styles.accountMeta, { color: muted }]} numberOfLines={1}>{account.institutionName} • {inactive ? 'Inativa' : 'Ativa'}</Text>
                    <Text style={[styles.accountBalance, { color: colors.text }]}>{money(Number(account.balance || 0))}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton} onPress={() => handleToggleActive(account)} disabled={busy} activeOpacity={0.75}>
                    {inactive ? <ToggleLeft size={25} color={muted} /> : <ToggleRight size={25} color={PRIMARY} />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton} onPress={() => handleDelete(account)} disabled={busy} activeOpacity={0.75}>
                    <Trash2 size={22} color={DANGER} />
                  </TouchableOpacity>
                  <ChevronRight size={22} color={muted} />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 22, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  headerCopy: { flex: 1, minWidth: 0, paddingTop: 2 },
  title: { fontSize: 26, lineHeight: 32, fontFamily: 'Inter-Bold' },
  subtitle: { marginTop: 3, fontSize: 14, lineHeight: 19, fontFamily: 'Inter-Regular' },
  summaryCard: { minHeight: 112, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 18, gap: 15 },
  summaryIcon: { width: 58, height: 58, borderRadius: 13, backgroundColor: '#F1EEFF', alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryLabel: { fontSize: 13, lineHeight: 17, fontFamily: 'Inter-Regular' },
  summaryValue: { marginTop: 3, fontSize: 25, lineHeight: 31, fontFamily: 'Inter-Bold' },
  summaryHint: { marginTop: 3, fontSize: 13, lineHeight: 17, fontFamily: 'Inter-Regular' },
  addButton: { height: 56, borderRadius: 14, backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  addButtonText: { color: '#FFFFFF', fontSize: 16, lineHeight: 21, fontFamily: 'Inter-Bold' },
  stateCard: { minHeight: 150, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 22 },
  stateText: { textAlign: 'center', fontSize: 13, lineHeight: 18, fontFamily: 'Inter-Regular' },
  emptyTitle: { fontSize: 16, lineHeight: 21, fontFamily: 'Inter-Bold' },
  listCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  accountRow: { minHeight: 86, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 12, gap: 11 },
  inactiveRow: { opacity: 0.62 },
  accountIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F1EEFF', alignItems: 'center', justifyContent: 'center' },
  accountCopy: { flex: 1, minWidth: 0 },
  accountName: { fontSize: 16, lineHeight: 21, fontFamily: 'Inter-Bold' },
  accountMeta: { marginTop: 1, fontSize: 13, lineHeight: 17, fontFamily: 'Inter-Regular' },
  accountBalance: { marginTop: 5, fontSize: 14, lineHeight: 18, fontFamily: 'Inter-Bold' },
  iconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
