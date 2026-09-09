import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type DimensionValue,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Banknote,
  Building2,
  ChevronDown,
  Landmark,
  Lightbulb,
  List,
  Pencil,
  Search,
  TrendingUp,
  Wallet,
  CreditCard,
} from 'lucide-react-native';
import { BackButton } from '../components/common/BackButton';
import { ModalBottomSheet } from '../components/common/ModalBottomSheet';
import { useTheme } from '../contexts/ThemeContext';
import { accountService } from '../services/accountService';
import { Account, AccountKind, BankAccountType } from '../types';
import { useAccounts } from '../hooks/useAccounts';

const PRIMARY = '#5748FF';
const TEXT = '#10152F';
const MUTED = '#6F7894';
const BORDER = '#E5E8F2';
const SOFT = '#F5F6FC';

const accountKinds: { key: AccountKind; title: string; subtitle: string; icon: React.ComponentType<any> }[] = [
  { key: 'bank', title: 'Conta bancária', subtitle: 'Conta corrente, poupança, salário etc.', icon: Landmark },
  { key: 'wallet', title: 'Carteira digital', subtitle: 'Pix, carteiras online e apps de pagamento', icon: Wallet },
  { key: 'cash', title: 'Dinheiro', subtitle: 'Dinheiro em espécie', icon: Banknote },
  { key: 'investment', title: 'Investimento', subtitle: 'CDB, Tesouro, Ações etc.', icon: TrendingUp },
];

const banks = [
  { id: 'nubank', name: 'Nubank', mark: 'nu', bg: '#7B1FD1', fg: '#FFFFFF' },
  { id: 'itau', name: 'Itaú', mark: 'itaú', bg: '#FF6A00', fg: '#FFFFFF' },
  { id: 'bradesco', name: 'Bradesco', mark: 'bra', bg: '#D70A38', fg: '#FFFFFF' },
  { id: 'caixa', name: 'Caixa', mark: 'X', bg: '#006BB6', fg: '#F6A800' },
  { id: 'santander', name: 'Santander', mark: 'S', bg: '#EA0000', fg: '#FFFFFF' },
  { id: 'bb', name: 'Banco do Brasil', mark: 'BB', bg: '#FFE000', fg: '#174B9A' },
  { id: 'inter', name: 'Inter', mark: 'in', bg: '#FF6B00', fg: '#FFFFFF' },
  { id: 'c6', name: 'C6 Bank', mark: 'C6', bg: '#111111', fg: '#FFFFFF' },
  { id: 'btg', name: 'BTG Pactual', mark: 'btg', bg: '#08244B', fg: '#FFFFFF' },
  { id: 'sicoob', name: 'Sicoob', mark: 'V', bg: '#004C45', fg: '#B9D532' },
  { id: 'original', name: 'Original', mark: '□', bg: '#10B981', fg: '#FFFFFF' },
  { id: 'pagbank', name: 'PagBank', mark: 'pb', bg: '#C9F94B', fg: '#111827' },
  { id: 'mercado-pago', name: 'Mercado Pago', mark: 'mp', bg: '#DFF4FF', fg: '#0284C7' },
  { id: 'picpay', name: 'PicPay', mark: 'P', bg: '#11C76F', fg: '#FFFFFF' },
  { id: 'other', name: 'Outros', mark: '...', bg: '#ECEBFA', fg: '#6F7894' },
];

const accountTypes: { key: BankAccountType; label: string }[] = [
  { key: 'checking', label: 'Conta corrente' },
  { key: 'savings', label: 'Conta poupança' },
  { key: 'salary', label: 'Conta salário' },
  { key: 'payment', label: 'Conta pagamento' },
  { key: 'investment', label: 'Investimento' },
  { key: 'cash', label: 'Dinheiro' },
];

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export const AddAccountScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const { accounts } = useAccounts();
  const accountToEdit = accounts.find((account) => account.id === route.params?.accountId);
  const isEditing = !!accountToEdit;

  const [kind, setKind] = useState<AccountKind>('bank');
  const [selectedBankId, setSelectedBankId] = useState('nubank');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [agency, setAgency] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState<BankAccountType>('checking');
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountToEdit) return;
    setKind(accountToEdit.accountKind || 'bank');
    setSelectedBankId(accountToEdit.institutionId || 'other');
    setName(accountToEdit.name || '');
    setAgency(accountToEdit.agency || '');
    setAccountNumber(accountToEdit.accountNumber || '');
    setAccountType(accountToEdit.accountType || 'checking');
  }, [accountToEdit]);

  const selectedBank = banks.find((bank) => bank.id === selectedBankId) || banks[0];
  const selectedAccountType = accountTypes.find((type) => type.key === accountType) || accountTypes[0];
  const visibleBanks = useMemo(() => {
    const query = normalize(search.trim());
    if (!query) return banks;
    return banks.filter((bank) => normalize(bank.name).includes(query));
  }, [search]);
  const columns = compact ? 4 : 5;
  const bankWidth = `${(100 - (columns - 1) * 2.25) / columns}%` as DimensionValue;

  const selectBank = (bank: typeof banks[number]) => {
    setSelectedBankId(bank.id);
    if (!name.trim()) setName(bank.name === 'Outros' ? '' : bank.name);
  };

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Nome obrigatório', 'Informe um nome para identificar a conta.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && accountToEdit) {
        await accountService.updateAccount(accountToEdit.id, {
          name: trimmedName,
          accountType,
          accountKind: kind,
          institutionId: selectedBank.id,
          institutionName: selectedBank.name,
          institutionIcon: selectedBank.mark,
          agency: agency.trim() || undefined,
          accountNumber: accountNumber.trim() || undefined,
        } as Partial<Account>);
      } else {
        await accountService.addAccount({
        name: trimmedName,
        accountType,
        accountKind: kind,
        institutionId: selectedBank.id,
        institutionName: selectedBank.name,
        institutionIcon: selectedBank.mark,
        agency: agency.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        balance: 0,
        currency: 'BRL',
        source: 'manual',
        openFinanceStatus: 'not_connected',
        isManual: true,
        isActive: true,
        });
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro ao salvar', error?.message || (isEditing ? 'Não foi possível atualizar a conta.' : 'Não foi possível adicionar a conta.'));
    } finally {
      setLoading(false);
    }
  };

  const FieldIcon = ({ children }: { children: React.ReactNode }) => <View style={styles.fieldIcon}>{children}</View>;

  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={[styles.safe, { backgroundColor: isDarkMode ? '#121214' : '#FAF9FF' }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 8) + 10, paddingBottom: Math.max(insets.bottom, 16) + 26 }]}
        >
          <View style={styles.header}>
            <BackButton onPress={() => navigation.goBack()} />
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{isEditing ? 'Editar conta' : 'Adicionar conta'}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{isEditing ? 'Atualize as informações desta conta.' : 'Cadastre um novo banco, carteira ou conta para organizar suas finanças no Numvra.'}</Text>
            </View>
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Tipo de conta</Text>
            <Text style={styles.sectionSubtitle}>Selecione o tipo de conta que deseja adicionar.</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindList}>
            {accountKinds.map((item) => {
              const selected = kind === item.key;
              const Icon = item.icon;
              return (
                <TouchableOpacity key={item.key} onPress={() => setKind(item.key)} style={[styles.kindCard, selected && styles.kindCardSelected]} activeOpacity={0.84}>
                  <View style={styles.kindIcon}><Icon size={30} color={PRIMARY} strokeWidth={2.3} /></View>
                  <Text style={styles.kindTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.kindSubtitle} numberOfLines={3}>{item.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Selecione seu banco</Text>
            <Text style={styles.sectionSubtitle}>Escolha o banco da sua conta.</Text>
          </View>
          <View style={styles.searchBox}>
            <Search size={21} color="#8A93AC" />
            <TextInput value={search} onChangeText={setSearch} placeholder="Buscar banco..." placeholderTextColor="#929AB1" style={styles.searchInput} autoCapitalize="none" autoCorrect={false} />
          </View>
          <View style={styles.bankGrid}>
            {visibleBanks.map((bank) => {
              const selected = selectedBankId === bank.id;
              return (
                <TouchableOpacity key={bank.id} onPress={() => selectBank(bank)} style={[styles.bankCard, { width: bankWidth }, selected && styles.bankSelected]} activeOpacity={0.84}>
                  <View style={[styles.bankLogo, { backgroundColor: bank.bg }]}>
                    <Text style={[styles.bankMark, { color: bank.fg }]} numberOfLines={1}>{bank.mark}</Text>
                  </View>
                  <Text style={styles.bankName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>{bank.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Dados da conta</Text>
            <Text style={styles.sectionSubtitle}>Preencha as informações da sua conta.</Text>
          </View>
          <View style={styles.formCard}>
            <View style={styles.fieldRow}>
              <FieldIcon><Pencil size={23} color={PRIMARY} /></FieldIcon>
              <View style={styles.fieldBody}>
                <Text style={styles.fieldLabel}>Nome da conta</Text>
                <TextInput value={name} onChangeText={setName} placeholder="Ex.: Conta principal, Salário, Poupança" placeholderTextColor="#9AA2B6" style={styles.input} />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <FieldIcon><Building2 size={23} color={PRIMARY} /></FieldIcon>
              <View style={styles.fieldBody}>
                <Text style={styles.fieldLabel}>Número da agência (opcional)</Text>
                <TextInput value={agency} onChangeText={setAgency} placeholder="Ex.: 0001" placeholderTextColor="#9AA2B6" keyboardType="numeric" style={styles.input} />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <FieldIcon><CreditCard size={23} color={PRIMARY} /></FieldIcon>
              <View style={styles.fieldBody}>
                <Text style={styles.fieldLabel}>Número da conta (opcional)</Text>
                <TextInput value={accountNumber} onChangeText={setAccountNumber} placeholder="Ex.: 12345-6" placeholderTextColor="#9AA2B6" style={styles.input} />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <FieldIcon><List size={23} color={PRIMARY} /></FieldIcon>
              <View style={styles.fieldBody}>
                <Text style={styles.fieldLabel}>Tipo de conta</Text>
                <TouchableOpacity onPress={() => setIsTypePickerOpen(true)} style={styles.selectInput} activeOpacity={0.84}>
                  <Text style={styles.selectText}>{selectedAccountType.label}</Text>
                  <ChevronDown size={18} color={TEXT} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipIcon}><Lightbulb size={30} color={PRIMARY} strokeWidth={2.2} /></View>
            <View style={styles.tipCopy}>
              <Text style={styles.tipTitle}>Dica do Numvra</Text>
              <Text style={styles.tipText}>Dê um nome fácil de identificar para sua conta. Isso ajuda na hora de registrar suas movimentações.</Text>
            </View>
          </View>

          <TouchableOpacity onPress={save} disabled={loading} style={[styles.submit, loading && styles.submitDisabled]} activeOpacity={0.86}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{isEditing ? 'Salvar alterações' : 'Adicionar conta'}</Text>}
          </TouchableOpacity>
        </ScrollView>

        <ModalBottomSheet isOpen={isTypePickerOpen} onClose={() => setIsTypePickerOpen(false)} title="Tipo de conta">
          <View style={styles.sheetList}>
            {accountTypes.map((type) => {
              const selected = accountType === type.key;
              return (
                <TouchableOpacity key={type.key} onPress={() => { setAccountType(type.key); setIsTypePickerOpen(false); }} style={[styles.sheetOption, selected && styles.sheetOptionSelected]} activeOpacity={0.84}>
                  <Text style={[styles.sheetOptionText, selected && styles.sheetOptionTextSelected]}>{type.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ModalBottomSheet>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  safe: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  headerCopy: { flex: 1, minWidth: 0, paddingTop: 2 },
  title: { fontSize: 25, lineHeight: 31, fontWeight: '800', letterSpacing: 0 },
  subtitle: { marginTop: 3, maxWidth: 320, fontSize: 14, lineHeight: 18, fontWeight: '400' },
  sectionHead: { gap: 2, marginTop: 2 },
  sectionTitle: { color: TEXT, fontSize: 16, lineHeight: 20, fontWeight: '800' },
  sectionSubtitle: { color: MUTED, fontSize: 13, lineHeight: 17, fontWeight: '400' },
  kindList: { gap: 12, paddingRight: 2 },
  kindCard: { width: 92, minHeight: 104, borderRadius: 15, borderWidth: 1, borderColor: 'transparent', backgroundColor: SOFT, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12 },
  kindCardSelected: { borderColor: PRIMARY, backgroundColor: '#F5F1FF' },
  kindIcon: { width: 46, height: 42, borderRadius: 13, backgroundColor: '#EEE9FF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kindTitle: { color: TEXT, fontSize: 12, lineHeight: 15, fontWeight: '800', textAlign: 'center' },
  kindSubtitle: { marginTop: 5, color: MUTED, fontSize: 10, lineHeight: 13, fontWeight: '500', textAlign: 'center' },
  searchBox: { height: 45, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, minWidth: 0, color: TEXT, fontSize: 14, lineHeight: 18, fontWeight: '500', paddingVertical: 0 },
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  bankCard: { height: 68, borderRadius: 12, backgroundColor: SOFT, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, gap: 5 },
  bankSelected: { borderColor: PRIMARY, backgroundColor: '#F5F1FF' },
  bankLogo: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bankMark: { fontSize: 14, lineHeight: 17, fontWeight: '900', textTransform: 'lowercase' },
  bankName: { color: TEXT, fontSize: 10, lineHeight: 12, fontWeight: '800', textAlign: 'center' },
  formCard: { borderRadius: 18, borderWidth: 1, borderColor: '#E8EBF4', backgroundColor: '#FFFFFF', padding: 12, gap: 12 },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  fieldIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#F0EDFF', alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  fieldBody: { flex: 1, minWidth: 0 },
  fieldLabel: { color: MUTED, fontSize: 11, lineHeight: 14, fontWeight: '600', marginBottom: 4 },
  input: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, color: TEXT, fontSize: 13, lineHeight: 17, fontWeight: '500', paddingVertical: 0 },
  selectInput: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { color: TEXT, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  tipCard: { minHeight: 76, borderRadius: 17, backgroundColor: '#F0EDFF', paddingHorizontal: 13, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 13 },
  tipIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: '#E7E2FF', alignItems: 'center', justifyContent: 'center' },
  tipCopy: { flex: 1, minWidth: 0 },
  tipTitle: { color: PRIMARY, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  tipText: { marginTop: 3, color: MUTED, fontSize: 13, lineHeight: 17, fontWeight: '500' },
  submit: { height: 56, borderRadius: 16, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', shadowColor: PRIMARY, shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 7, marginTop: 6 },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', fontSize: 16, lineHeight: 20, fontWeight: '800' },
  sheetList: { gap: 10 },
  sheetOption: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', paddingHorizontal: 14, justifyContent: 'center' },
  sheetOptionSelected: { borderColor: PRIMARY, backgroundColor: '#F0EDFF' },
  sheetOptionText: { color: TEXT, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  sheetOptionTextSelected: { color: PRIMARY, fontWeight: '800' },
});