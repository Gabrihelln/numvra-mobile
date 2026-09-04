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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Calendar as CalendarIcon, ChevronRight, Check, Search } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../services/subscriptionService';
import { templateService } from '../services/templateService';
import { CalendarPicker } from '../components/common/CalendarPicker';
import { spacing, borderRadius, typography } from '../theme';
import { SubscriptionTemplate } from '../types';
import { getCategoryVisual } from '../constants/iconRegistry';
import { RemoteIcon } from '../components/common/RemoteIcon';

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

const normalizeSearchTerm = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .trim();

export const AddSubscriptionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useTheme();
  const { user, checkLimit, triggerUpgrade } = useAuth();

  const [description, setDescription] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
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
      priority: template.priority,
      searchTerms: template.searchTerms,
    })), [templates]);

  const visibleServices = useMemo(() => {
    const normalizedSearch = normalizeSearchTerm(serviceSearch);

    if (normalizedSearch) {
      return services.filter((service) => [service.label, ...(service.searchTerms || [])]
        .some((term) => normalizeSearchTerm(term).includes(normalizedSearch)));
    }

    const featuredServices = services.filter((service) => service.featured);
    const initialServices = featuredServices.length > 0 ? featuredServices : services;

    return [...initialServices]
      .sort((first, second) => (first.priority ?? Number.MAX_SAFE_INTEGER) - (second.priority ?? Number.MAX_SAFE_INTEGER))
      .slice(0, 6);
  }, [serviceSearch, services]);

  const formatDate = (date: Date) => {
    if (isToday(date)) return `Hoje, ${format(date, "d 'de' MMMM", { locale: ptBR })}`;
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  const formatDisplayAmount = (raw: string) => {
    if (!raw) return '0,00';
    const cleanNumbers = raw.replace(/\D/g, '');
    if (!cleanNumbers) return '0,00';
    const num = parseFloat(cleanNumbers) / 100;
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAmountChange = (text: string) => {
    const cleanNumbers = text.replace(/\D/g, '');
    setAmountRaw(cleanNumbers);
  };

  const getNumericValue = (): number => {
    if (!amountRaw) return 0;
    return parseFloat(amountRaw) / 100;
  };

  const handleSelectService = (service: StreamingService) => {
    setSelectedServiceId(service.id);
    setDescription(service.label);
    if (service.defaultAmount && !amountRaw) {
      setAmountRaw(String(Math.round(service.defaultAmount * 100)));
    }
  };

  const handleSaveSubscription = async () => {
    const planCheck = checkLimit('subscription');
    if (!planCheck.allowed) {
      triggerUpgrade?.('subscription', planCheck.reason);
      return;
    }

    const numericAmount = getNumericValue();
    if (numericAmount <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero para a assinatura.');
      return;
    }

    const selectedService = services.find((service) => service.id === selectedServiceId) || null;
    const name = description.trim() || (selectedService ? `Assinatura ${selectedService.label}` : 'Assinatura Mensal');

    setLoading(true);
    try {
      if (user) {
        await subscriptionService.addSubscription({
          name: name,
          amount: numericAmount,
          period: 'Mensal',
          billingCycle: 'monthly',
          renewalDate: format(selectedDate, 'yyyy-MM-dd'),
          nextBilling: format(selectedDate, 'yyyy-MM-dd'),
          // Preserve the configured brand URL (including SVG) on the saved subscription.
          icon: selectedService?.iconUrl || selectedService?.icon || '⭐',
          ...(selectedService?.iconUrl ? { iconUrl: selectedService.iconUrl } : {}),
          ...(selectedService?.color ? { color: selectedService.color } : {}),
          ...(selectedService?.category ? { category: selectedService.category } : {}),
          status: 'active',
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header: X, Título e Spacer */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <X size={28} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Nova Assinatura
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Serviços de Streaming */}
        <View style={styles.servicesSection}>
          <Text style={[styles.servicesTitle, { color: colors.text }]}>
            Serviços de Streaming
          </Text>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={20} color={colors.textMuted} />
            <TextInput
              placeholder="Pesquisar serviço"
              placeholderTextColor={colors.textMuted}
              value={serviceSearch}
              onChangeText={setServiceSearch}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.searchInput, { color: colors.text }]}
              accessibilityLabel="Pesquisar serviço"
            />
          </View>
          <View style={styles.servicesGrid}>
            {visibleServices.map((service) => {
              const isSelected = selectedServiceId === service.id;
              const serviceVisual = getCategoryVisual(service.icon, service.color, isDarkMode);
              const ServiceIcon = serviceVisual.Icon;
              return (
                <TouchableOpacity
                  key={service.id}
                  onPress={() => handleSelectService(service)}
                  style={styles.serviceItem}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.serviceIconContainer,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <RemoteIcon
                      uri={service.iconUrl}
                      size={24}
                      fallback={<ServiceIcon size={24} color={isSelected ? '#ffffff' : serviceVisual.color} />}
                    />
                  </View>
                  <Text
                    style={[
                      styles.serviceLabel,
                      {
                        color: isSelected ? colors.primary : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                  >
                    {service.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {templatesLoading && <ActivityIndicator size="small" color={colors.primary} style={styles.templatesLoading} />}
            {!templatesLoading && services.length === 0 && (
              <Text style={[styles.emptyTemplatesText, { color: colors.textMuted }]}>Nenhum modelo de assinatura disponível.</Text>
            )}
            {!templatesLoading && services.length > 0 && visibleServices.length === 0 && (
              <Text style={[styles.emptyTemplatesText, { color: colors.textMuted }]}>Nenhum serviço encontrado.</Text>
            )}
          </View>
        </View>

        {/* Input Descrição */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>
            Descrição
          </Text>
          <TextInput
            placeholder="Ex: Assinatura Mensal"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            style={[
              styles.descriptionInput,
              {
                backgroundColor: colors.surface,
                color: colors.text,
              },
            ]}
          />
        </View>

        {/* Bloco de Valor */}
        <View style={styles.amountSection}>
          <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
            VALOR
          </Text>
          <View style={styles.amountDisplayRow}>
            <Text style={[styles.amountCurrency, { color: colors.primary }]}>
              R$
            </Text>
            <TextInput
              placeholder="0,00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={formatDisplayAmount(amountRaw)}
              onChangeText={handleAmountChange}
              style={[styles.amountInput, { color: colors.text }]}
            />
          </View>
        </View>

        {/* Botão de Data de Cobrança */}
        <TouchableOpacity
          onPress={() => setIsCalendarOpen(true)}
          style={[styles.dateButton, { backgroundColor: colors.surface }]}
          activeOpacity={0.7}
        >
          <View style={styles.dateLeft}>
            <View
              style={[
                styles.calendarIconWrapper,
                { backgroundColor: colors.card },
              ]}
            >
              <CalendarIcon size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.dateSubLabel, { color: colors.textMuted }]}>
                DATA DE COBRANÇA
              </Text>
              <Text style={[styles.dateMainText, { color: colors.text }]}>
                {formatDate(selectedDate)}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Botão Salvar Assinatura */}
        <TouchableOpacity
          id="btn-confirm-add-subscription"
          onPress={handleSaveSubscription}
          disabled={loading}
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
          ]}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <View style={styles.submitCheckCircle}>
                <Check size={20} color="#ffffff" strokeWidth={3} />
              </View>
              <Text style={styles.submitButtonText}>
                Adicionar Assinatura
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Modal de Calendário */}
        <CalendarPicker
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />
      </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 32,
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  amountCurrency: {
    fontSize: 28,
    fontWeight: '700',
    opacity: 0.6,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: '700',
    padding: 0,
    margin: 0,
    minWidth: 100,
    textAlign: 'center',
  },
  inputGroup: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  descriptionInput: {
    height: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    fontSize: 16,
  },
  servicesSection: {
    marginBottom: spacing.xl,
  },
  servicesTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  searchContainer: {
    height: 46,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  serviceItem: {
    width: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  serviceIconContainer: {
    width: 56,
    height: 46,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  templatesLoading: {
    width: '100%',
    paddingVertical: spacing.md,
  },
  emptyTemplatesText: {
    width: '100%',
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: spacing.md,
  },
  serviceLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  dateButton: {
    width: '100%',
    height: 64,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  dateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  calendarIconWrapper: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateSubLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateMainText: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  submitButton: {
    width: '100%',
    height: 58,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 'auto',
  },
  submitCheckCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
