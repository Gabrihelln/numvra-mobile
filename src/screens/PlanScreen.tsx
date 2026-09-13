import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { initStripe, useStripe } from '@stripe/stripe-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowUp, CalendarDays, Check, ChevronLeft, ChevronRight, CircleX, CreditCard, Crown, Gem, Gift, Headphones, Infinity, Lightbulb, PieChart, Send, Settings, Shield, Star, Target, type LucideIcon } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { checkoutService, CheckoutError } from '../services/checkoutService';
import { planService } from '../services/planService';
import { RootStackParamList } from '../navigation/types';
import { SubscriptionPlan } from '../types';
import { BillingPeriod, PlanId, normalizePlanId } from '../config/planCatalog';
import { MOBILE_PAYMENT_SHEET_ENABLED, resolveStripePublishableKey, STRIPE_RETURN_URL } from '../config/subscriptionConfig';
import { mobileSubscriptionService, MobileSubscriptionError } from '../services/mobileSubscriptionService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenMode = 'current' | 'upgrade';

const MONTHS: Record<BillingPeriod, number> = { monthly: 1, semiannual: 6, annual: 12 };
const PERIOD_TITLE: Record<BillingPeriod, string> = { monthly: 'Mensal', semiannual: 'Semestral', annual: 'Anual' };
const PERIOD_UNIT: Record<BillingPeriod, string> = { monthly: 'mês', semiannual: 'semestre', annual: 'ano' };
const VISUALS: Record<PlanId, { title: string; description: string; current: string; icon: LucideIcon }> = {
  basic: { title: 'Gratuito', description: 'O essencial para começar', current: 'Recursos essenciais para começar sua organização financeira.', icon: Send },
  pro: { title: 'Pro', description: 'Mais controle para sua vida financeira', current: 'Mais controle, mais organização, mais conquistas.', icon: Crown },
  premium: { title: 'Premium', description: 'O máximo de inteligência e praticidade', current: 'Automação, inteligência e recursos completos para suas finanças.', icon: Gem },
};
const BENEFIT_ICONS = [Infinity, PieChart, Target, CreditCard, Shield, Headphones];
const normalizePlan = normalizePlanId;
const money = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const unitPrice = (plan: SubscriptionPlan, period: BillingPeriod) => period === 'annual' ? plan.annualPrice : period === 'semiannual' ? plan.semiannualPrice : plan.monthlyPrice;
const displayPrice = (plan: SubscriptionPlan, period: BillingPeriod) => unitPrice(plan, period) * MONTHS[period];
const discount = (plan: SubscriptionPlan | undefined, period: BillingPeriod) => {
  if (!plan || period === 'monthly' || plan.monthlyPrice <= 0) return 0;
  return Math.max(0, Math.round((1 - displayPrice(plan, period) / (plan.monthlyPrice * MONTHS[period])) * 100));
};
const dateLabel = (value?: string | null) => {
  if (!value) return 'Sem renovação agendada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem renovação agendada';
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
};
const daysLabel = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diff = Math.ceil((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
  if (diff < 0) return 'expirado';
  if (diff === 0) return 'hoje';
  return `em ${diff} ${diff === 1 ? 'dia' : 'dias'}`;
};
const statusLabel = (status?: string | null, expired?: boolean) => expired ? 'Expirado' : status === 'canceled' ? 'Cancelamento pendente' : 'Ativo';
const Header: React.FC<{ title: string; subtitle: string; onBack: () => void; top: number; dark: boolean }> = ({ title, subtitle, onBack, top, dark }) => (
  <View style={[styles.header, { paddingTop: Math.max(top, 16) + 10 }]}>
    <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: dark ? '#1E1E26' : '#FFFFFF', borderColor: dark ? '#2A2A32' : '#E9ECF6' }]} activeOpacity={0.82}>
      <ChevronLeft size={27} color={dark ? '#F8FAFC' : '#080D2D'} strokeWidth={2.7} />
    </TouchableOpacity>
    <View style={styles.headerCopy}>
      <Text style={[styles.headerTitle, { color: dark ? '#F8FAFC' : '#080D2D' }]}>{title}</Text>
      <Text style={[styles.headerSubtitle, { color: dark ? '#A1A1AA' : '#687292' }]}>{subtitle}</Text>
    </View>
  </View>
);

const IconBox: React.FC<{ icon: LucideIcon; dark: boolean; size?: number }> = ({ icon: Icon, dark, size = 29 }) => (
  <View style={[styles.iconBox, { backgroundColor: dark ? 'rgba(87,72,255,0.16)' : '#F1EEFF' }]}>
    <Icon size={size} color="#5748FF" strokeWidth={2.45} />
  </View>
);

const InfoStrip: React.FC<{ icon: LucideIcon; title: string; text: string; dark: boolean }> = ({ icon, title, text, dark }) => (
  <View style={[styles.infoStrip, { backgroundColor: dark ? '#1E1E26' : '#F7F5FF', borderColor: dark ? '#2A2A32' : '#E9ECF6' }]}>
    <IconBox icon={icon} dark={dark} size={28} />
    <View style={styles.infoStripCopy}>
      <Text style={styles.infoStripTitle}>{title}</Text>
      <Text style={[styles.infoStripText, { color: dark ? '#A1A1AA' : '#687292' }]}>{text}</Text>
    </View>
    <ChevronRight size={24} color={dark ? '#F8FAFC' : '#080D2D'} strokeWidth={2.6} />
  </View>
);

const LoadingBlock: React.FC<{ dark: boolean }> = ({ dark }) => (
  <View style={[styles.loadingCard, { backgroundColor: dark ? '#1E1E26' : '#F7F5FF', borderColor: dark ? '#2A2A32' : '#E9ECF6' }]}>
    <ActivityIndicator color="#5748FF" />
    <Text style={[styles.loadingText, { color: dark ? '#A1A1AA' : '#687292' }]}>Carregando plano...</Text>
  </View>
);

export const PlanScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { activePlan, profile, isPlanExpired } = useAuth();
  const { isDarkMode } = useTheme();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [mode, setMode] = useState<ScreenMode>('current');
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('pro');
  const [submitting, setSubmitting] = useState(false);

  const currentPlanId = normalizePlan(activePlan || profile?.plan);
  const currentPlan = plans.find((plan) => normalizePlan(plan.id) === currentPlanId);
  const proPlan = plans.find((plan) => normalizePlan(plan.id) === 'pro');
  const premiumPlan = plans.find((plan) => normalizePlan(plan.id) === 'premium');
  const selectedIsCurrent = selectedPlanId === currentPlanId;
  const maxDiscount = Math.max(discount(proPlan, 'semiannual'), discount(proPlan, 'annual'), discount(premiumPlan, 'semiannual'), discount(premiumPlan, 'annual'));
  const bg = isDarkMode ? '#121214' : '#FFFFFF';
  const card = isDarkMode ? '#1E1E26' : '#FFFFFF';
  const soft = isDarkMode ? '#1E1E26' : '#F7F5FF';
  const border = isDarkMode ? '#2A2A32' : '#E9ECF6';
  const text = isDarkMode ? '#F8FAFC' : '#080D2D';
  const muted = isDarkMode ? '#A1A1AA' : '#687292';
  const bottomPadding = Math.max(insets.bottom, 16) + (mode === 'upgrade' ? 102 : 28);

  useEffect(() => {
    async function load() {
      try {
        const data = await planService.getSubscriptionPlans();
        setPlans(data);
        const normalized = normalizePlan(activePlan);
        setSelectedPlanId(normalized === 'premium' ? 'premium' : 'pro');
      } catch (err) {
        console.error('Error loading plans:', err);
        Alert.alert('Erro', 'Não foi possível carregar os planos. Tente novamente em alguns instantes.');
      } finally {
        setLoadingPlans(false);
      }
    }
    load();
  }, [activePlan]);

  const handleBack = () => mode === 'upgrade' ? setMode('current') : navigation.goBack();
  const handleManage = async () => {
    if (!profile?.stripeSubscriptionId && currentPlanId === 'basic') {
      Alert.alert('Sem assinatura paga', 'Você ainda não possui uma assinatura paga ativa para gerenciar.');
      return;
    }

    setSubmitting(true);
    try {
      await checkoutService.openCustomerPortal();
    } catch (err) {
      Alert.alert('Erro', err instanceof CheckoutError ? err.message : 'Não foi possível abrir o gerenciamento da assinatura.');
    } finally {
      setSubmitting(false);
    }
  };
  const handleSubscribe = async (planId = selectedPlanId) => {
    const plan = plans.find((item) => normalizePlan(item.id) === planId);
    if (!plan) return;
    if (planId === currentPlanId) return Alert.alert('Plano atual', `Você já utiliza o plano ${VISUALS[planId].title}.`);
    if (planId === 'basic') return handleManage();
    setSubmitting(true);
    try {
      if (MOBILE_PAYMENT_SHEET_ENABLED && Platform.OS !== 'web') {
        const session = await mobileSubscriptionService.create(plan.id, selectedPeriod);
        const publishableKey = resolveStripePublishableKey(session as unknown as Record<string, unknown>);
        if (!publishableKey || !publishableKey.startsWith('pk_')) throw new MobileSubscriptionError('A chave pública do Stripe não está configurada.');
        await initStripe({ publishableKey, urlScheme: 'numvra', setReturnUrlSchemeOnAndroid: true });
        const customerKey = session.customerEphemeralKeySecret || session.ephemeralKeySecret;
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: session.merchantDisplayName || 'Numvra',
          customerId: session.customerId,
          customerEphemeralKeySecret: customerKey,
          customerSessionClientSecret: customerKey ? undefined : session.customerSessionClientSecret,
          paymentIntentClientSecret: session.paymentIntentClientSecret,
          allowsDelayedPaymentMethods: false,
          returnURL: STRIPE_RETURN_URL,
          appearance: { colors: { primary: '#5748FF', background: isDarkMode ? '#121214' : '#FFFFFF', componentBackground: isDarkMode ? '#1E1E26' : '#FFFFFF', componentBorder: isDarkMode ? '#2A2A32' : '#E9ECF6', componentDivider: isDarkMode ? '#2A2A32' : '#E9ECF6', primaryText: isDarkMode ? '#F8FAFC' : '#080D2D', secondaryText: isDarkMode ? '#A1A1AA' : '#687292', componentText: isDarkMode ? '#F8FAFC' : '#080D2D', placeholderText: isDarkMode ? '#71717A' : '#687292', icon: isDarkMode ? '#F8FAFC' : '#080D2D', error: '#E11919' }, shapes: { borderRadius: 14 } },
        });
        if (initError) throw new MobileSubscriptionError(initError.localizedMessage || 'Não foi possível preparar o formulário de pagamento.');
        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code === 'Canceled') return;
          throw new MobileSubscriptionError(presentError.localizedMessage || 'O pagamento não foi concluído.');
        }
        Alert.alert('Pagamento enviado', 'Estamos confirmando seu pagamento. Seu plano será atualizado automaticamente após a confirmação do Stripe.');
      } else {
        await checkoutService.startCheckout(plan.id, selectedPeriod);
        Alert.alert('Checkout aberto', 'Conclua o pagamento no Stripe. Seu plano será atualizado automaticamente após a confirmação.');
      }
    } catch (err) {
      console.error('Checkout failed:', err);
      if (err instanceof MobileSubscriptionError && err.status === 409) Alert.alert('Assinatura já ativa', 'Você já possui uma assinatura ativa. Gerencie-a pelo botão “Gerenciar assinatura”.');
      else Alert.alert('Erro no pagamento', err instanceof CheckoutError || err instanceof MobileSubscriptionError ? err.message : 'Não foi possível iniciar o pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const planPriceText = useMemo(() => {
    if (!currentPlan || currentPlanId === 'basic') return 'R$ 0,00';
    const profilePrice = Number(profile?.planPrice || 0);
    const price = profilePrice > 0 ? profilePrice : unitPrice(currentPlan, profile?.planBillingPeriod || 'monthly');
    return `R$ ${money(price)}`;
  }, [currentPlan, currentPlanId, profile?.planBillingPeriod, profile?.planPrice]);

  const renderCurrent = () => {
    if (loadingPlans || !currentPlan) return <LoadingBlock dark={isDarkMode} />;
    const visual = VISUALS[currentPlanId];
    const StatusIcon = visual.icon;
    const benefits = currentPlan.features.slice(0, 6);
    const status = statusLabel(profile?.planStatus, isPlanExpired);
    const tip = currentPlanId === 'premium' ? 'você já tem acesso ao plano mais completo do Numvra. Aproveite todos os recursos disponíveis.' : currentPlanId === 'pro' ? 'Faça o upgrade para Premium e tenha acesso a recursos exclusivos como Cartões, limites e Open Finance.' : 'Conheça os planos Pro e Premium para desbloquear mais controle, alertas e recursos avançados.';
    const billing = profile?.planBillingPeriod || 'monthly';
    return (
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.currentPlanCard, { backgroundColor: soft, borderColor: border }]}>
          <IconBox icon={StatusIcon} dark={isDarkMode} size={34} />
          <View style={styles.currentPlanCopy}>
            <Text style={[styles.eyebrow, { color: muted }]}>Plano Atual</Text>
            <Text style={[styles.currentPlanName, { color: text }]}>{visual.title}</Text>
            <Text style={[styles.currentPlanDescription, { color: muted }]}>{visual.current}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status === 'Ativo' ? '#DDF8EA' : '#FFF0F0' }]}><Text style={[styles.statusBadgeText, { color: status === 'Ativo' ? '#0FBF64' : '#E11919' }]}>{status}</Text></View>
        </View>
        <View style={styles.subscriptionInfoRow}>
          <View style={styles.subscriptionInfoItem}><IconBox icon={CalendarDays} dark={isDarkMode} size={25} /><View style={styles.infoCopy}><Text style={[styles.infoLabel, { color: muted }]}>Renova em</Text><Text style={[styles.infoValue, { color: text }]}>{dateLabel(profile?.planActiveUntil)}</Text><Text style={[styles.infoHint, { color: muted }]}>{daysLabel(profile?.planActiveUntil)}</Text></View></View>
          <View style={[styles.infoDivider, { backgroundColor: border }]} />
          <View style={styles.subscriptionInfoItem}><IconBox icon={CreditCard} dark={isDarkMode} size={25} /><View style={styles.infoCopy}><Text style={[styles.infoLabel, { color: muted }]}>Cobrança</Text><Text style={[styles.infoValue, { color: text }]}>{planPriceText}/{PERIOD_UNIT[billing]}</Text><Text style={[styles.infoHint, { color: muted }]}>{currentPlanId === 'basic' ? 'Sem cobrança ativa' : 'Método gerenciado pelo Stripe'}</Text></View></View>
        </View>
        <TouchableOpacity style={[styles.manageCard, { backgroundColor: card, borderColor: border }]} onPress={handleManage} activeOpacity={0.82}><IconBox icon={Settings} dark={isDarkMode} size={25} /><Text style={[styles.manageText, { color: text }]}>Gerenciar assinatura</Text><ChevronRight size={25} color={text} strokeWidth={2.7} /></TouchableOpacity>
        <Text style={[styles.sectionTitle, { color: text }]}>Seus benefícios</Text>
        <View style={[styles.benefitsCard, { backgroundColor: card, borderColor: border }]}>
          {benefits.map((benefit, index) => { const Icon = BENEFIT_ICONS[index] || Check; return <View key={benefit} style={[styles.benefitRow, index < benefits.length - 1 && { borderBottomColor: border, borderBottomWidth: 1 }]}><IconBox icon={Icon} dark={isDarkMode} size={25} /><View style={styles.benefitCopy}><Text style={[styles.benefitTitle, { color: text }]}>{benefit}</Text></View><View style={styles.checkCircle}><Check size={16} color="#FFFFFF" strokeWidth={3} /></View></View>; })}
        </View>
        <View style={[styles.tipCard, { backgroundColor: soft, borderColor: border }]}><IconBox icon={Lightbulb} dark={isDarkMode} size={29} /><View style={styles.tipCopy}><Text style={styles.tipTitle}>Dica do Numvra</Text><Text style={[styles.tipText, { color: muted }]}>{tip}</Text></View></View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setMode('upgrade')} activeOpacity={0.86}><ArrowUp size={24} color="#FFFFFF" strokeWidth={2.5} /><Text style={styles.primaryButtonText}>{currentPlanId === 'premium' ? 'Ver planos disponíveis' : 'Ver planos e fazer upgrade'}</Text></TouchableOpacity>
      </ScrollView>
    );
  };
  const renderUpgrade = () => {
    if (loadingPlans) return <LoadingBlock dark={isDarkMode} />;
    return (
      <View style={styles.upgradeContainer}>
        <ScrollView contentContainerStyle={[styles.upgradeScrollContent, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
          <View style={styles.periodSelector}>
            {(['monthly', 'semiannual', 'annual'] as BillingPeriod[]).map((period) => {
              const selected = selectedPeriod === period;
              const off = Math.max(discount(proPlan, period), discount(premiumPlan, period));
              return <TouchableOpacity key={period} style={[styles.periodButton, { backgroundColor: selected ? card : soft, borderColor: selected ? '#8A70FF' : 'transparent' }]} onPress={() => setSelectedPeriod(period)} activeOpacity={0.82}><Text style={[styles.periodText, { color: selected ? '#5748FF' : muted }]}>{PERIOD_TITLE[period]}</Text>{off > 0 && <View style={styles.discountBadge}><Text style={styles.discountText}>-{off}%</Text></View>}</TouchableOpacity>;
            })}
          </View>
          <View style={styles.planCardsRow}>
            {(['basic', 'pro', 'premium'] as PlanId[]).map((planId) => {
              const plan = plans.find((item) => normalizePlan(item.id) === planId);
              const visual = VISUALS[planId];
              const selected = selectedPlanId === planId;
              const current = currentPlanId === planId;
              const price = plan ? displayPrice(plan, selectedPeriod) : 0;
              return (
                <TouchableOpacity key={planId} style={[styles.upgradePlanCard, { backgroundColor: card, borderColor: selected || planId === 'pro' ? '#8A70FF' : border, borderWidth: selected || planId === 'pro' ? 1.6 : 1 }]} onPress={() => setSelectedPlanId(planId)} activeOpacity={0.86}>
                  <IconBox icon={visual.icon} dark={isDarkMode} size={28} />
                  <Text style={[styles.upgradePlanName, { color: text }]}>{visual.title}</Text>
                  <Text style={[styles.upgradePlanDescription, { color: muted }]} numberOfLines={3}>{visual.description}</Text>
                  <Text style={[styles.upgradePrice, { color: text }]}>R$ {money(price)}</Text>
                  <Text style={[styles.upgradePeriod, { color: muted }]}>{planId === 'basic' ? 'para sempre' : `por ${PERIOD_UNIT[selectedPeriod]}`}</Text>
                  <View style={[styles.planActionButton, current ? styles.planActionCurrent : selected ? styles.planActionSelected : styles.planActionOutline]}><Text style={[styles.planActionText, current ? styles.planActionTextCurrent : selected ? styles.planActionTextSelected : styles.planActionTextOutline]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{current ? 'Plano atual' : planId === 'basic' ? 'Gerenciar' : `Escolher ${visual.title}`}</Text></View>
                  <View style={styles.featureList}>{(plan?.features || []).map((feature) => <View key={feature} style={styles.upgradeFeatureRow}><Check size={14} color={planId === 'premium' ? '#0FBF64' : '#174DFF'} strokeWidth={3} /><Text style={[styles.upgradeFeatureText, { color: text }]} numberOfLines={2}>{feature}</Text></View>)}</View>
                  {planId === 'pro' && <View style={styles.popularBadge}><Star size={13} color="#5748FF" fill="#5748FF" /><Text style={styles.popularText}>Mais popular</Text></View>}
                </TouchableOpacity>
              );
            })}
          </View>
          <InfoStrip icon={Gift} title="Garanta mais economia!" text={`Escolha o plano semestral ou anual e economize até ${maxDiscount}% no valor da sua assinatura.`} dark={isDarkMode} />
          <InfoStrip icon={Shield} title="Compra 100% segura" text="Seus dados são protegidos e você pode cancelar quando quiser." dark={isDarkMode} />
        </ScrollView>
        <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: bg }]}>
          <TouchableOpacity style={[styles.stickyButton, (submitting || selectedIsCurrent) && { opacity: 0.68 }]} onPress={() => handleSubscribe()} disabled={submitting || selectedIsCurrent} activeOpacity={0.86}>{submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.stickyButtonText}>{selectedIsCurrent ? 'Plano atual' : `Escolher plano ${VISUALS[selectedPlanId].title}`}</Text>}</TouchableOpacity>
        </View>
      </View>
    );
  };

  return <View style={[styles.container, { backgroundColor: bg }]}><Header title={mode === 'current' ? 'Meu plano' : 'Upgrade de plano'} subtitle={mode === 'current' ? 'Gerencie seu plano e veja seus benefícios.' : 'Escolha o plano ideal para você.'} onBack={handleBack} top={insets.top} dark={isDarkMode} />{mode === 'current' ? renderCurrent() : renderUpgrade()}</View>;
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 22, paddingBottom: 18 },
  backButton: { width: 50, height: 50, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 25, lineHeight: 30, fontFamily: 'Inter-Bold' },
  headerSubtitle: { fontSize: 15, lineHeight: 20, fontFamily: 'Inter-Regular', marginTop: 2 },
  scrollContent: { paddingHorizontal: 22 },
  loadingCard: { marginHorizontal: 22, borderWidth: 1, borderRadius: 16, padding: 28, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Inter-Regular' },
  currentPlanCard: { minHeight: 112, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, marginBottom: 18 },
  iconBox: { width: 58, height: 58, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  currentPlanCopy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 14, lineHeight: 18, fontFamily: 'Inter-Regular' },
  currentPlanName: { fontSize: 25, lineHeight: 31, fontFamily: 'Inter-Bold', marginTop: 3 },
  currentPlanDescription: { fontSize: 15, lineHeight: 20, fontFamily: 'Inter-Regular', marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 9 },
  statusBadgeText: { fontSize: 13, lineHeight: 16, fontFamily: 'Inter-Bold' },
  subscriptionInfoRow: { minHeight: 80, flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  subscriptionInfoItem: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 },
  infoCopy: { flex: 1, minWidth: 0 },
  infoLabel: { fontSize: 13, lineHeight: 17, fontFamily: 'Inter-Regular' },
  infoValue: { fontSize: 15, lineHeight: 19, fontFamily: 'Inter-Bold', marginTop: 3 },
  infoHint: { fontSize: 13, lineHeight: 17, fontFamily: 'Inter-Regular', marginTop: 1 },
  infoDivider: { width: 1, height: 52, marginHorizontal: 13 },
  manageCard: { minHeight: 65, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, marginBottom: 27 },
  manageText: { flex: 1, fontSize: 16, lineHeight: 21, fontFamily: 'Inter-Bold' },
  sectionTitle: { fontSize: 21, lineHeight: 26, fontFamily: 'Inter-Bold', marginBottom: 12 },
  benefitsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 22 },
  benefitRow: { minHeight: 71, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 9 },
  benefitCopy: { flex: 1, minWidth: 0 },
  benefitTitle: { fontSize: 15, lineHeight: 20, fontFamily: 'Inter-Bold' },
  benefitDescription: { fontSize: 13, lineHeight: 17, fontFamily: 'Inter-Regular', marginTop: 1 },
  checkCircle: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#0FBF64', alignItems: 'center', justifyContent: 'center' },
  tipCard: { borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15, marginBottom: 22 },
  tipCopy: { flex: 1, minWidth: 0 },
  tipTitle: { color: '#5748FF', fontSize: 15, lineHeight: 20, fontFamily: 'Inter-Bold' },
  tipText: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter-Regular', marginTop: 2 },
  primaryButton: { height: 62, borderRadius: 13, backgroundColor: '#5748FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, lineHeight: 23, fontFamily: 'Inter-Bold' },
  upgradeContainer: { flex: 1 },
  upgradeScrollContent: { paddingHorizontal: 20 },
  periodSelector: { flexDirection: 'row', gap: 9, marginBottom: 18 },
  periodButton: { flex: 1, minHeight: 50, borderRadius: 10, borderWidth: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 5 },
  periodText: { fontSize: 13, lineHeight: 17, fontFamily: 'Inter-Bold' },
  discountBadge: { borderRadius: 12, backgroundColor: '#5748FF', paddingHorizontal: 6, paddingVertical: 3 },
  discountText: { color: '#FFFFFF', fontSize: 10, lineHeight: 13, fontFamily: 'Inter-Bold' },
  planCardsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  upgradePlanCard: { flex: 1, minHeight: 592, borderRadius: 14, borderWidth: 1, alignItems: 'center', paddingHorizontal: 7, paddingVertical: 20 },
  upgradePlanName: { fontSize: 20, lineHeight: 25, fontFamily: 'Inter-Bold', marginTop: 13 },
  upgradePlanDescription: { minHeight: 56, textAlign: 'center', fontSize: 12, lineHeight: 17, fontFamily: 'Inter-Regular', marginTop: 5 },
  upgradePrice: { textAlign: 'center', fontSize: 20, lineHeight: 26, fontFamily: 'Inter-Bold', marginTop: 10 },
  upgradePeriod: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter-Regular', marginTop: 2, marginBottom: 14 },
  planActionButton: { width: '100%', minHeight: 47, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginBottom: 18 },
  planActionSelected: { backgroundColor: '#5748FF' },
  planActionCurrent: { backgroundColor: '#E8E8F4' },
  planActionOutline: { borderWidth: 1.4, borderColor: '#8A70FF', backgroundColor: 'transparent' },
  planActionText: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter-Bold' },
  planActionTextSelected: { color: '#FFFFFF' },
  planActionTextCurrent: { color: '#080D2D' },
  planActionTextOutline: { color: '#5748FF' },
  featureList: { alignSelf: 'stretch', gap: 11 },
  upgradeFeatureRow: { minHeight: 25, flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  upgradeFeatureText: { flex: 1, fontSize: 11, lineHeight: 16, fontFamily: 'Inter-Regular' },
  popularBadge: { minHeight: 31, borderRadius: 15, backgroundColor: '#F1EEFF', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, marginTop: 'auto' },
  popularText: { color: '#5748FF', fontSize: 12, lineHeight: 16, fontFamily: 'Inter-Bold' },
  infoStrip: { minHeight: 80, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 8 },
  infoStripCopy: { flex: 1, minWidth: 0 },
  infoStripTitle: { color: '#5748FF', fontSize: 15, lineHeight: 20, fontFamily: 'Inter-Bold' },
  infoStripText: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter-Regular', marginTop: 2 },
  stickyFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12 },
  stickyButton: { height: 58, borderRadius: 12, backgroundColor: '#5748FF', alignItems: 'center', justifyContent: 'center' },
  stickyButtonText: { color: '#FFFFFF', fontSize: 17, lineHeight: 22, fontFamily: 'Inter-Bold' },
});



