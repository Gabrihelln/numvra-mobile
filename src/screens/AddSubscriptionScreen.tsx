import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowRight,
  Banknote,
  Bell,
  Calendar as CalendarIcon,
  ChevronDown,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  Music,
  PlayCircle,
  Search,
  Tag,
  Tv,
  Wallet,
} from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../services/subscriptionService';
import { templateService } from '../services/templateService';
import { pushNotificationService } from '../services/pushNotificationService';
import { CalendarPicker } from '../components/common/CalendarPicker';
import { ModalBottomSheet } from '../components/common/ModalBottomSheet';
import { BackButton } from '../components/common/BackButton';
import { spacing, borderRadius } from '../theme';
import { SubscriptionTemplate } from '../types';
import { getCategoryVisual } from '../constants/iconRegistry';
import { RemoteIcon } from '../components/common/RemoteIcon';
import { toApiDate } from '../utils/dateFormat';

interface StreamingService {
  id: string;
  label: string;
  icon?: string;
  iconUrl?: string;
  color?: string;
  category?: string;
  defaultAmount?: number;
  featured?: boolean;
  priority?: number;
  searchTerms?: string[];
}

type SubscriptionPeriod = 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
type BillingCycle = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

const PRIMARY = '#5748FF';
const TEXT = '#10152F';
const MUTED = '#6F7894';
const BORDER = '#E5E8F2';
const SOFT = '#F4F5FB';

const periods: { label: SubscriptionPeriod; cycle: BillingCycle }[] = [
  { label: 'Mensal', cycle: 'monthly' },
  { label: 'Trimestral', cycle: 'quarterly' },
  { label: 'Semestral', cycle: 'semiannual' },
  { label: 'Anual', cycle: 'annual' },
];

const categories = [
  { key: 'Entretenimento', icon: Tv },
  { key: 'Streaming', icon: PlayCircle },
  { key: 'Música', icon: Music },
  { key: 'Produtividade', icon: CalendarIcon },
  { key: 'Saúde', icon: HeartPulse },
  { key: 'Educação', icon: GraduationCap },
  { key: 'Finanças', icon: Banknote },
  { key: 'Outros', icon: Tag },
];

const normalizeSearchTerm = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .trim();

const formatDisplayAmount = (raw: string) => {
  const cleanNumbers = raw.replace(/\D/g, '');
  if (!cleanNumbers) return '0,00';
  return (parseFloat(cleanNumbers) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getNumericValue = (raw: string): number => {
  const cleanNumbers = raw.replace(/\D/g, '');
  if (!cleanNumbers) return 0;
  return parseFloat(cleanNumbers) / 100;
};

const daysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();

const getNextBillingDate = (billingDay: number) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let year = now.getFullYear();
  let month = now.getMonth();
  let day = Math.min(Math.max(1, billingDay), daysInMonth(year, month));
  let candidate = new Date(year, month, day);

  if (candidate < today) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    day = Math.min(Math.max(1, billingDay), daysInMonth(year, month));
    candidate = new Date(year, month, day);
  }

  return candidate;
};

export const AddSubscriptionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const { user, checkLimit, triggerUpgrade } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 360;

  const [description, setDescription] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<SubscriptionPeriod>('Mensal');
  const [selectedCategory, setSelectedCategory] = useState('Entretenimento');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<SubscriptionTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    templateService.getTemplates().then((nextTemplates) => {
      if (mounted) {
        setTemplates(nextTemplates);
        setTemplatesLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const services = useMemo<StreamingService[]>(() => templates
    .filter((template) => template.active !== false && template.isActive !== false && template.enabled !== false)
    .map((template) => ({
      id: template.id,
      label: template.name || 'Assinatura',
      icon: template.icon,
      iconUrl: template.iconUrl,
      color: template.color,
      category: template.category,
      defaultAmount: template.defaultAmount,
      featured: template.featured === true || template.isFeatured === true || template.popular === true,
      priority: template.priority ?? template.order ?? template.sortOrder ?? template.position,
      searchTerms: template.searchTerms,
    })), [templates]);

  const popularServices = useMemo(() => {
    const normalizedSearch = normalizeSearchTerm(serviceSearch);
    const source = normalizedSearch
      ? services.filter((service) => [service.label, ...(service.searchTerms || [])]
        .some((term) => normalizeSearchTerm(term).includes(normalizedSearch)))
      : (services.some((service) => service.featured) ? services.filter((service) => service.featured) : services);

    return [...source]
      .sort((first, second) => (first.priority ?? Number.MAX_SAFE_INTEGER) - (second.priority ?? Number.MAX_SAFE_INTEGER))
      .slice(0, normalizedSearch ? 8 : 5);
  }, [serviceSearch, services]);

  const selectedPeriodConfig = periods.find((period) => period.label === selectedPeriod) || periods[0];
  const billingDay = selectedDate.getDate();
  const canSubmit = getNumericValue(amountRaw) > 0 && !loading;

  const handleAmountChange = (text: string) => setAmountRaw(text.replace(/\D/g, ''));

  const handleSelectService = (service: StreamingService) => {
    setSelectedServiceId(service.id);
    setDescription(service.label);
    if (service.category) setSelectedCategory(service.category);
  };

  const handleReminderChange = async (value: boolean) => {
    setReminderEnabled(value);
    if (!user) return;
    try {
      if (value) await pushNotificationService.enable(user.uid);
      else await pushNotificationService.disable(user.uid);
    } catch (error) {
      console.warn('Unable to update push preference for subscription reminder:', error);
    }
  };

  const handleSaveSubscription = async () => {
    const planCheck = checkLimit('subscription');
    if (!planCheck.allowed) {
      triggerUpgrade?.('subscription', planCheck.reason);
      return;
    }

    const numericAmount = getNumericValue(amountRaw);
    if (numericAmount <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero para a assinatura.');
      return;
    }

    const selectedService = services.find((service) => service.id === selectedServiceId) || null;
    const name = description.trim() || selectedService?.label || 'Assinatura';
    const nextBilling = toApiDate(getNextBillingDate(billingDay));

    setLoading(true);
    try {
      if (user) {
        await subscriptionService.addSubscription({
          name,
          amount: numericAmount,
          period: selectedPeriod,
          billingCycle: selectedPeriodConfig.cycle,
          renewalDate: nextBilling,
          nextBilling,
          icon: selectedService?.iconUrl || selectedService?.icon || 'tag',
          ...(selectedService?.iconUrl ? { iconUrl: selectedService.iconUrl } : {}),
          ...(selectedService?.color ? { color: selectedService.color } : {}),
          category: selectedService?.category || selectedCategory,
          status: 'active',
          reminderEnabled,
        });
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro ao salvar', error?.message || 'Não foi possível salvar a assinatura.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#121214' : '#FAF9FF' }]}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.contentContainer, { paddingTop: Math.max(insets.top, 10) + 10, paddingBottom: Math.max(insets.bottom, 16) + 22 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <BackButton onPress={() => navigation.goBack()} />
            <TouchableOpacity style={styles.helpLink} activeOpacity={0.8} onPress={() => Alert.alert('Como funciona?', 'Cadastre uma assinatura recorrente, escolha a periodicidade e o Numvra acompanha a próxima cobrança para você.')}>
              <HelpCircle size={18} color={PRIMARY} />
              <Text style={styles.helpText}>Como funciona?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroBlock}>
            <Text style={[styles.screenTitle, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>Nova Assinatura</Text>
            <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>Adicione suas assinaturas recorrentes para nunca mais perder o controle.</Text>
          </View>

          <View style={styles.searchBox}>
            <Search size={compact ? 20 : 22} color={MUTED} />
            <TextInput
              placeholder="Buscar serviço (ex: Netflix, Spotify, etc)"
              placeholderTextColor="#929AB1"
              value={serviceSearch}
              onChangeText={setServiceSearch}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
              accessibilityLabel="Buscar serviço"
            />
          </View>

          <View style={styles.rowHeader}>
            <Text style={[styles.inlineTitle, { color: colors.text }]}>Ou escolha um serviço popular</Text>
            <TouchableOpacity onPress={() => setServiceSearch('')} activeOpacity={0.8}>
              <Text style={styles.linkText}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularList}>
            {popularServices.map((service) => {
              const selected = selectedServiceId === service.id;
              const visual = getCategoryVisual(service.icon, service.color, isDarkMode);
              const FallbackIcon = visual.Icon;
              return (
                <TouchableOpacity key={service.id} onPress={() => handleSelectService(service)} style={[styles.popularCard, selected && styles.popularCardSelected]} activeOpacity={0.82}>
                  <View style={[styles.popularIconBox, selected && styles.popularIconBoxSelected]}>
                    <RemoteIcon uri={service.iconUrl} size={31} fallback={<FallbackIcon size={28} color={selected ? '#FFFFFF' : visual.color} />} />
                  </View>
                  <Text style={[styles.popularLabel, selected && styles.popularLabelSelected]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>{service.label}</Text>
                </TouchableOpacity>
              );
            })}
            {templatesLoading && <ActivityIndicator size="small" color={PRIMARY} style={styles.servicesLoading} />}
            {!templatesLoading && popularServices.length === 0 && <Text style={styles.emptyServicesText}>Nenhum serviço encontrado.</Text>}
          </ScrollView>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Nome da assinatura</Text>
            <View style={styles.inputShell}>
              <Tag size={21} color="#5F687E" />
              <TextInput
                placeholder="Ex: Netflix, Spotify, etc"
                placeholderTextColor="#9AA2B6"
                value={description}
                onChangeText={setDescription}
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.twoColumns}>
            <View style={styles.columnField}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Valor mensal</Text>
              <View style={styles.inputShell}>
                <Wallet size={21} color="#5F687E" />
                <TextInput
                  placeholder="R$ 0,00"
                  placeholderTextColor="#9AA2B6"
                  keyboardType="numeric"
                  value={`R$ ${formatDisplayAmount(amountRaw)}`}
                  onChangeText={handleAmountChange}
                  style={styles.input}
                />
              </View>
            </View>
            <View style={styles.columnField}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Periodicidade</Text>
              <TouchableOpacity style={styles.inputShell} activeOpacity={0.82} onPress={() => setIsPeriodOpen(true)}>
                <CalendarIcon size={21} color={PRIMARY} />
                <Text style={styles.selectText} numberOfLines={1}>{selectedPeriod}</Text>
                <ChevronDown size={18} color="#737B92" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Data de cobrança</Text>
            <TouchableOpacity style={styles.inputShell} activeOpacity={0.82} onPress={() => setIsCalendarOpen(true)}>
              <CalendarIcon size={21} color={PRIMARY} />
              <Text style={styles.selectText}>Todo dia {billingDay}</Text>
              <ChevronDown size={18} color="#737B92" />
            </TouchableOpacity>
          </View>

          <View style={styles.rowHeader}>
            <Text style={[styles.inlineTitle, { color: colors.text }]}>Categoria</Text>
            <Text style={styles.linkText}>Ver todas</Text>
          </View>

          <View style={styles.categoryGrid}>
            {categories.map((category) => {
              const selected = selectedCategory === category.key;
              const Icon = category.icon;
              return (
                <TouchableOpacity key={category.key} onPress={() => setSelectedCategory(category.key)} style={[styles.categoryCard, selected && styles.categoryCardSelected]} activeOpacity={0.84}>
                  <Icon size={compact ? 20 : 22} color={selected ? '#FFFFFF' : '#5F687E'} strokeWidth={2.2} />
                  <Text style={[styles.categoryText, selected && styles.categoryTextSelected]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{category.key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.reminderCard}>
            <View style={styles.reminderIcon}>
              <Bell size={22} color={PRIMARY} />
            </View>
            <View style={styles.reminderCopy}>
              <Text style={[styles.reminderTitle, { color: colors.text }]}>Ativar lembrete</Text>
              <Text style={[styles.reminderSubtitle, { color: colors.textSecondary }]}>Receba uma notificação antes da cobrança.</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={handleReminderChange}
              trackColor={{ false: '#DDE1EE', true: PRIMARY }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity id="btn-confirm-add-subscription" onPress={handleSaveSubscription} disabled={!canSubmit} style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} activeOpacity={0.86}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Adicionar Assinatura</Text>
                <ArrowRight size={22} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        <CalendarPicker
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />

        <ModalBottomSheet isOpen={isPeriodOpen} onClose={() => setIsPeriodOpen(false)} title="Periodicidade">
          <View style={styles.periodSheetContent}>
            {periods.map((period) => {
              const selected = selectedPeriod === period.label;
              return (
                <TouchableOpacity
                  key={period.label}
                  style={[styles.periodOption, selected && styles.periodOptionSelected]}
                  onPress={() => {
                    setSelectedPeriod(period.label);
                    setIsPeriodOpen(false);
                  }}
                  activeOpacity={0.82}
                >
                  <CalendarIcon size={20} color={selected ? PRIMARY : MUTED} />
                  <Text style={[styles.periodOptionText, selected && styles.periodOptionTextSelected]}>{period.label}</Text>
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
  keyboardAvoidingView: { flex: 1 },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 20,
    gap: 18,
  },
  topRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
  },
  helpText: {
    color: PRIMARY,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  heroBlock: {
    marginTop: 2,
    marginBottom: 2,
  },
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: 0,
  },
  screenSubtitle: {
    marginTop: 5,
    maxWidth: 360,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  searchBox: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F8F9FD',
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: TEXT,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    paddingVertical: 0,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: -5,
  },
  inlineTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  linkText: {
    color: PRIMARY,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  popularList: {
    gap: 11,
    paddingRight: 4,
  },
  popularCard: {
    width: 70,
    height: 72,
    borderRadius: 14,
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  popularCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: '#F2EFFF',
  },
  popularIconBox: {
    width: 36,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  popularIconBoxSelected: {
    backgroundColor: PRIMARY,
  },
  popularLabel: {
    width: '100%',
    paddingHorizontal: 4,
    color: '#5F687E',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
  },
  popularLabelSelected: {
    color: PRIMARY,
    fontWeight: '700',
  },
  servicesLoading: {
    width: 70,
    height: 72,
  },
  emptyServicesText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 22,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  inputShell: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: TEXT,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '500',
    paddingVertical: 0,
  },
  selectText: {
    flex: 1,
    minWidth: 0,
    color: TEXT,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  columnField: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  categoryCard: {
    width: '23.1%',
    height: 62,
    borderRadius: 14,
    backgroundColor: SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  categoryCardSelected: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  categoryText: {
    maxWidth: '92%',
    color: '#5F687E',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  reminderCard: {
    minHeight: 68,
    borderRadius: 16,
    backgroundColor: '#F2EFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E7E2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderCopy: {
    flex: 1,
    minWidth: 0,
  },
  reminderTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  reminderSubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '400',
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 7,
    marginTop: 2,
  },
  submitButtonDisabled: {
    opacity: 0.62,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  periodSheetContent: {
    gap: 10,
  },
  periodOption: {
    minHeight: 50,
    borderRadius: borderRadius.lg,
    backgroundColor: '#F8F9FD',
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  periodOptionSelected: {
    borderColor: PRIMARY,
    backgroundColor: '#F2EFFF',
  },
  periodOptionText: {
    color: TEXT,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
  },
  periodOptionTextSelected: {
    color: PRIMARY,
    fontWeight: '800',
  },
});