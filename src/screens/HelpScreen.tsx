import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Linking,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  CreditCard,
  QrCode,
  Shield,
  Wallet,
  HelpCircle,
  X,
  MessageSquare,
  FileText,
} from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FAQItem {
  id: string;
  category: 'transactions' | 'plans' | 'notifications' | 'accounts';
  question: string;
  answer: string;
}

export const HelpScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const categories = [
    {
      id: 'card',
      title: 'Cartão',
      subtitle: 'Limite e faturas',
      icon: CreditCard,
      bgColor: isDarkMode ? 'rgba(108, 92, 231, 0.2)' : '#E6E2FF',
      iconColor: '#6C5CE7',
      details: [
        'Ajuste de limite diário e emergencial',
        'Como parcelar a fatura atual',
        'Ativação de cartão virtual temporário',
        'Bloqueio temporário por segurança',
      ],
    },
    {
      id: 'pix',
      title: 'Pix',
      subtitle: 'Envios e chaves',
      icon: QrCode,
      bgColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#FFEAD5',
      iconColor: '#E28743',
      details: [
        'Gerenciar minhas chaves Pix',
        'Como alterar os limites diários do Pix',
        'Pix no Crédito com taxa reduzida',
        'Como contestar um Pix incorreto',
      ],
    },
    {
      id: 'security',
      title: 'Segurança',
      subtitle: 'Acessos e senhas',
      icon: Shield,
      bgColor: isDarkMode ? 'rgba(71, 85, 105, 0.25)' : '#E2E8F0',
      iconColor: '#475569',
      details: [
        'Alterar senha de acesso (6 dígitos)',
        'Trocar senha de autorização (4 dígitos)',
        'Gerenciar dispositivos autorizados',
        'Dicas de segurança e proteção contra golpes',
      ],
    },
    {
      id: 'loans',
      title: 'Empréstimos',
      subtitle: 'Taxas e prazos',
      icon: Wallet,
      bgColor: isDarkMode ? 'rgba(88, 86, 214, 0.2)' : '#E2E0FF',
      iconColor: '#5856D6',
      details: [
        'Simular Empréstimo Pessoal',
        'Antecipar parcelas com desconto',
        'Taxas de juros aplicadas e carência',
        'Portabilidade de crédito ativo',
      ],
    },
  ];

  const faqs: FAQItem[] = [
    {
      id: '1',
      category: 'transactions',
      question: 'Como editar uma movimentação?',
      answer: 'Abra o extrato, selecione a movimentação desejada e use a ação de edição para ajustar valor, categoria, data ou descrição.',
    },
    {
      id: '2',
      category: 'accounts',
      question: 'Como gerenciar minhas contas?',
      answer: 'Acesse Perfil > Minhas contas para ver contas cadastradas, adicionar novas, editar informações ou desativar uma conta manual.',
    },
    {
      id: '3',
      category: 'plans',
      question: 'Como faço upgrade de plano?',
      answer: 'Acesse Meu plano, escolha Pro ou Premium e conclua o checkout seguro pelo Stripe. A atualização aparece no app após a confirmação da assinatura.',
    },
    {
      id: '4',
      category: 'notifications',
      question: 'Por que não recebo notificações?',
      answer: 'Confira se as notificações estão ativadas nos ajustes do Numvra e se o sistema do dispositivo permitiu alertas para o aplicativo.',
    },
    {
      id: '5',
      category: 'plans',
      question: 'Como cancelar uma assinatura paga?',
      answer: 'Use Meu plano > Gerenciar assinatura para abrir o portal seguro do Stripe, quando houver assinatura paga ativa vinculada à sua conta.',
    },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory
      ? faq.category === selectedCategory
      : true;
    return matchesSearch && matchesCategory;
  });

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
          Ajuda e privacidade
        </Text>

        <TouchableOpacity
          onPress={() => setShowTermsModal(true)}
          style={[
            styles.termsButton,
            {
              backgroundColor: isDarkMode ? '#1E1E26' : '#F1F1F5',
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FileText size={18} color={isDarkMode ? '#94A3B8' : '#64748B'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text
          style={[
            styles.mainHeroTitle,
            { color: isDarkMode ? '#F8FAFC' : '#1C1C28' },
          ]}
        >
          Como podemos te{'\n'}ajudar hoje?
        </Text>

        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
              borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
            },
          ]}
        >
          <Search size={20} color={isDarkMode ? '#94A3B8' : '#9CA3AF'} />
          <TextInput
            style={[
              styles.searchInput,
              { color: isDarkMode ? '#F8FAFC' : '#111827' },
            ]}
            placeholder="Busque por tópicos de ajuda..."
            placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={isDarkMode ? '#94A3B8' : '#9CA3AF'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories Grid */}
        <View style={styles.grid}>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard,
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
                onPress={() =>
                  setSelectedCategory(isSelected ? null : cat.id)
                }
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.catIconBox,
                    { backgroundColor: cat.bgColor },
                  ]}
                >
                  <Icon size={22} color={cat.iconColor} strokeWidth={2.5} />
                </View>
                <Text
                  style={[
                    styles.catTitle,
                    { color: isDarkMode ? '#F8FAFC' : '#1C1C28' },
                  ]}
                >
                  {cat.title}
                </Text>
                <Text
                  style={[
                    styles.catSubtitle,
                    { color: isDarkMode ? '#94A3B8' : '#9CA3AF' },
                  ]}
                >
                  {cat.subtitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Category Details */}
        {selectedCategory && (
          <View
            style={[
              styles.categoryDetailsBox,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(108, 92, 231, 0.15)'
                  : '#EEF2FF',
                borderColor: isDarkMode
                  ? 'rgba(108, 92, 231, 0.3)'
                  : 'rgba(108, 92, 231, 0.2)',
              },
            ]}
          >
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>
                ASSUNTOS POPULARES:{' '}
                {categories.find((c) => c.id === selectedCategory)?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                <Text style={styles.detailsClose}>Fechar</Text>
              </TouchableOpacity>
            </View>

            {categories
              .find((c) => c.id === selectedCategory)
              ?.details.map((detail, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.detailItem}
                  onPress={() => setSearchQuery(detail)}
                >
                  <View style={styles.detailBullet} />
                  <Text
                    style={[
                      styles.detailText,
                      { color: isDarkMode ? '#CBD5E1' : '#475569' },
                    ]}
                  >
                    {detail}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* FAQs */}
        <View style={styles.faqHeader}>
          <Text
            style={[
              styles.faqTitle,
              { color: isDarkMode ? '#F8FAFC' : '#1C1C28' },
            ]}
          >
            Perguntas frequentes
          </Text>
          {selectedCategory && (
            <TouchableOpacity onPress={() => setSelectedCategory(null)}>
              <Text style={styles.clearFilterText}>Limpar Filtro</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.faqList}>
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedFaqId === faq.id;

            return (
              <View
                key={faq.id}
                style={[
                  styles.faqCard,
                  {
                    backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
                    borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  onPress={() =>
                    setExpandedFaqId(isExpanded ? null : faq.id)
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.faqIconAndText}>
                    <View
                      style={[
                        styles.faqIconBox,
                        {
                          backgroundColor: isDarkMode
                            ? 'rgba(108, 92, 231, 0.2)'
                            : '#EEF2FF',
                        },
                      ]}
                    >
                      <HelpCircle size={18} color="#6C5CE7" strokeWidth={2.5} />
                    </View>
                    <Text
                      style={[
                        styles.faqQuestion,
                        { color: isDarkMode ? '#F8FAFC' : '#1C1C28' },
                      ]}
                    >
                      {faq.question}
                    </Text>
                  </View>
                  <ChevronRight
                    size={18}
                    color={isDarkMode ? '#64748B' : '#9CA3AF'}
                    style={{
                      transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
                    }}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View
                    style={[
                      styles.faqAnswerBox,
                      {
                        borderTopColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
                        backgroundColor: isDarkMode
                          ? 'rgba(0,0,0,0.2)'
                          : '#FAFAFC',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.faqAnswer,
                        { color: isDarkMode ? '#CBD5E1' : '#64748B' },
                      ]}
                    >
                      {faq.answer}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Support Box */}
        <View
          style={[
            styles.supportCard,
            {
              backgroundColor: isDarkMode
                ? 'rgba(108, 92, 231, 0.12)'
                : '#EEF2FF',
              borderColor: isDarkMode
                ? 'rgba(108, 92, 231, 0.25)'
                : 'rgba(108, 92, 231, 0.15)',
            },
          ]}
        >
          <View style={styles.supportIconBox}>
            <MessageSquare size={22} color="#6C5CE7" strokeWidth={2.5} />
          </View>
          <Text
            style={[
              styles.supportTitle,
              { color: isDarkMode ? '#F8FAFC' : '#1C1C28' },
            ]}
          >
            Ainda precisa de assistência?
          </Text>
          <Text
            style={[
              styles.supportSubtitle,
              { color: isDarkMode ? '#94A3B8' : '#64748B' },
            ]}
          >
            Nosso time de especialistas de atendimento ao cliente está disponível
            para te ajudar.
          </Text>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => Linking.openURL('mailto:suporte@numvra.com')}
            activeOpacity={0.85}
          >
            <Text style={styles.supportButtonText}>Falar com Suporte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Terms Modal */}
      <Modal visible={showTermsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF' },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: isDarkMode ? '#F8FAFC' : '#111827' },
                ]}
              >
                Termos de Uso
              </Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <X size={20} color={isDarkMode ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                style={[
                  styles.termsSectionTitle,
                  { color: isDarkMode ? '#F8FAFC' : '#111827' },
                ]}
              >
                1. Termos
              </Text>
              <Text
                style={[
                  styles.termsText,
                  { color: isDarkMode ? '#94A3B8' : '#64748B' },
                ]}
              >
                Ao acessar o aplicativo Numvra, você concorda em cumprir estes
                termos de serviço, todas as leis e regulamentos aplicáveis.
              </Text>

              <Text
                style={[
                  styles.termsSectionTitle,
                  { color: isDarkMode ? '#F8FAFC' : '#111827' },
                ]}
              >
                2. Privacidade e Proteção de Dados
              </Text>
              <Text
                style={[
                  styles.termsText,
                  { color: isDarkMode ? '#94A3B8' : '#64748B' },
                ]}
              >
                Seus dados pessoais, informações financeiras e movimentações são
                armazenados em ambiente de nuvem altamente criptografado e seguro
                no Firebase Firestore com total respeito à LGPD.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowTermsModal(false)}
            >
              <Text style={styles.modalButtonText}>Concordar e Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  termsButton: {
    padding: 10,
    borderRadius: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  mainHeroTitle: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  categoryCard: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  catIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  catTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  catSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryDetailsBox: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#6C5CE7',
    letterSpacing: 0.5,
  },
  detailsClose: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6C5CE7',
  },
  detailText: {
    fontSize: 13,
    fontWeight: '600',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6C5CE7',
  },
  faqList: {
    gap: 10,
    marginBottom: 24,
  },
  faqCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqIconAndText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  faqIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  faqAnswerBox: {
    padding: 16,
    borderTopWidth: 1,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  supportCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
    gap: 10,
  },
  supportIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  supportSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  supportButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 6,
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  termsSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 4,
  },
  termsText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  modalButton: {
    backgroundColor: '#6C5CE7',
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
