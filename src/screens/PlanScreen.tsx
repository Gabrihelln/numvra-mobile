import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Check, Sparkles } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { planService } from '../services/planService';
import { checkoutService, CheckoutError } from '../services/checkoutService';
import { SubscriptionPlan } from '../types';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type BillingPeriod = 'monthly' | 'semiannual' | 'annual';

export const PlanScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { isDarkMode } = useTheme();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await planService.getSubscriptionPlans();
        setPlans(data);
      } catch (err) {
        console.error('Error loading plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    }
    load();
  }, []);

  const handleSubscribe = async () => {
    const selectedPlan = plans.find((p) => p.id === selectedPlanId);
    if (!selectedPlan) return;

    if (selectedPlanId === 'basic') {
      const isCurrentlyPaid = profile?.plan === 'pro' || profile?.plan === 'premium';
      Alert.alert(
        isCurrentlyPaid ? 'Gerenciamento da assinatura' : 'Plano Basic',
        isCurrentlyPaid
          ? 'O cancelamento será disponibilizado pelo portal seguro de assinaturas.'
          : 'Você já utiliza o plano Basic gratuito.',
      );
      return;
    }

    let price = selectedPlan.monthlyPrice;
    if (selectedPeriod === 'semiannual') price = selectedPlan.semiannualPrice;
    else if (selectedPeriod === 'annual') price = selectedPlan.annualPrice;

    setSubmitting(true);
    try {
      await checkoutService.startCheckout(selectedPlanId, selectedPlan.name, selectedPeriod, price);
      Alert.alert(
        'Checkout aberto',
        'Conclua o pagamento no Stripe. Seu plano será atualizado automaticamente após a confirmação.',
      );
    } catch (err) {
      const message = err instanceof CheckoutError ? err.message : 'Não foi possível iniciar o checkout.';
      Alert.alert('Erro no pagamento', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#121214' : '#FAF9FF' },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backButton,
            {
              borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
              backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={20} color={isDarkMode ? '#F8FAFC' : '#111827'} />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            { color: isDarkMode ? '#F8FAFC' : '#111827' },
          ]}
        >
          Planos Numvra
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text
            style={[
              styles.mainTitle,
              { color: isDarkMode ? '#F8FAFC' : '#111827' },
            ]}
          >
            Escolha o plano ideal para suas finanças
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: isDarkMode ? '#94A3B8' : '#6B7280' },
            ]}
          >
            Sem taxas ocultas. Cancele a qualquer momento.
          </Text>
        </View>

        {/* Period Selector */}
        <View
          style={[
            styles.periodSelector,
            {
              backgroundColor: isDarkMode ? '#1E1E26' : '#F1F1F5',
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.periodOption,
              selectedPeriod === 'monthly' && {
                backgroundColor: isDarkMode ? '#2D2D3A' : '#FFFFFF',
              },
            ]}
            onPress={() => setSelectedPeriod('monthly')}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === 'monthly'
                  ? { color: '#6C5CE7', fontWeight: '800' }
                  : { color: isDarkMode ? '#94A3B8' : '#64748B' },
              ]}
            >
              Mensal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodOption,
              selectedPeriod === 'semiannual' && {
                backgroundColor: isDarkMode ? '#2D2D3A' : '#FFFFFF',
              },
            ]}
            onPress={() => setSelectedPeriod('semiannual')}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === 'semiannual'
                  ? { color: '#6C5CE7', fontWeight: '800' }
                  : { color: isDarkMode ? '#94A3B8' : '#64748B' },
              ]}
            >
              Semestral
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodOption,
              selectedPeriod === 'annual' && {
                backgroundColor: isDarkMode ? '#2D2D3A' : '#FFFFFF',
              },
            ]}
            onPress={() => setSelectedPeriod('annual')}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === 'annual'
                  ? { color: '#6C5CE7', fontWeight: '800' }
                  : { color: isDarkMode ? '#94A3B8' : '#64748B' },
              ]}
            >
              Anual (-20%)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plans */}
        {loadingPlans ? (
          <ActivityIndicator
            size="large"
            color="#6C5CE7"
            style={{ marginVertical: 32 }}
          />
        ) : (
          <View style={styles.plansContainer}>
            {plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const isCurrent =
                (profile?.plan || 'basic') === plan.id;

              let displayPrice = plan.monthlyPrice;
              let periodLabel = '/mês';
              if (selectedPeriod === 'semiannual') {
                displayPrice = plan.semiannualPrice;
                periodLabel = '/semestre';
              } else if (selectedPeriod === 'annual') {
                displayPrice = plan.annualPrice;
                periodLabel = '/ano';
              }

              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
                      borderColor: isSelected
                        ? '#6C5CE7'
                        : isDarkMode
                        ? '#2D2D3A'
                        : '#F1F1F5',
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedPlanId(plan.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.planHeader}>
                    <View>
                      <View style={styles.planNameRow}>
                        <Text
                          style={[
                            styles.planName,
                            { color: isDarkMode ? '#F8FAFC' : '#111827' },
                          ]}
                        >
                          {plan.name}
                        </Text>
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>
                              Plano Atual
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.planDescription,
                          { color: isDarkMode ? '#94A3B8' : '#6B7280' },
                        ]}
                      >
                        {plan.description}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.priceText,
                      { color: isDarkMode ? '#F8FAFC' : '#111827' },
                    ]}
                  >
                    {plan.id === 'basic' ? (
                      'Grátis'
                    ) : (
                      <>
                        R$ {displayPrice.toFixed(2).replace('.', ',')}{' '}
                        <Text style={styles.periodLabel}>{periodLabel}</Text>
                      </>
                    )}
                  </Text>

                  {/* Features */}
                  <View style={styles.featuresList}>
                    {plan.features.map((feat, idx) => (
                      <View key={idx} style={styles.featureRow}>
                        <Check size={16} color="#10B981" strokeWidth={3} />
                        <Text
                          style={[
                            styles.featureText,
                            { color: isDarkMode ? '#CBD5E1' : '#475569' },
                          ]}
                        >
                          {feat}
                        </Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Subscribe Action Button */}
        <TouchableOpacity
          style={[
            styles.subscribeButton,
            { opacity: submitting ? 0.7 : 1 },
          ]}
          onPress={handleSubscribe}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              {selectedPlanId === 'basic'
                ? 'Continuar com Basic'
                : `Assinar ${plans.find((p) => p.id === selectedPlanId)?.name || 'Plano'}`}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  titleSection: {
    alignItems: 'center',
    textAlign: 'center',
    gap: 6,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  periodOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
  },
  currentBadge: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  planDescription: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 28,
    fontWeight: '900',
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  featuresList: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    paddingTop: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subscribeButton: {
    height: 52,
    backgroundColor: '#6C5CE7',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
