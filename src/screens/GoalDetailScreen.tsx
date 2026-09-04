import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Pencil,
  Bell,
  Calendar,
  TrendingUp,
  TrendingDown,
  Plus,
  CircleDollarSign,
  Repeat,
  Landmark,
  Wallet,
  Check,
} from 'lucide-react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Goal, GoalHistoryItem } from '../types';
import { goalService } from '../services/goalService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { AddFundsModal } from '../components/modals/AddFundsModal';
import { NotificationsModal } from '../components/modals/NotificationsModal';
import { CurvedHeader, LoadingState, ModalBottomSheet } from '../components/common';

type GoalDetailRouteProp = RouteProp<RootStackParamList, 'GoalDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Helper icon component for history items
const HistoryItemIcon: React.FC<{ description: string; type: 'deposit' | 'withdraw'; isDarkMode: boolean }> = ({
  description,
  type,
  isDarkMode,
}) => {
  const descLower = (description || '').toLowerCase();

  if (type === 'withdraw') {
    return (
      <View style={[styles.historyIconBox, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
        <TrendingDown size={20} color="#EF4444" />
      </View>
    );
  }

  if (descLower.includes('pix')) {
    return (
      <View style={[styles.historyIconBox, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
        <Landmark size={20} color="#3B82F6" />
      </View>
    );
  }

  if (descLower.includes('arredondamento')) {
    return (
      <View style={[styles.historyIconBox, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
        <Wallet size={20} color="#F59E0B" />
      </View>
    );
  }

  return (
    <View style={[styles.historyIconBox, { backgroundColor: isDarkMode ? 'rgba(108, 92, 231, 0.15)' : '#EEF2FF' }]}>
      <Repeat size={20} color="#6C5CE7" />
    </View>
  );
};

// Modal for editing goal details
interface EditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal;
  onSave: (updated: Partial<Goal>) => Promise<void>;
}

const EditGoalModal: React.FC<EditGoalModalProps> = ({ isOpen, onClose, goal, onSave }) => {
  const { colors, isDarkMode } = useTheme();
  const [title, setTitle] = useState(goal.title);
  const [subtitle, setSubtitle] = useState(goal.subtitle || '');
  const [targetAmount, setTargetAmount] = useState((goal.targetAmount || 0).toString());
  const [estimatedDate, setEstimatedDate] = useState(goal.estimatedDate || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(goal.title);
      setSubtitle(goal.subtitle || '');
      setTargetAmount((goal.targetAmount || 0).toString());
      setEstimatedDate(goal.estimatedDate || '');
    }
  }, [isOpen, goal]);

  const handleSubmit = async () => {
    if (!title.trim() || !targetAmount) return;

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        subtitle: subtitle.trim(),
        targetAmount: parseFloat(targetAmount) || goal.targetAmount,
        estimatedDate: estimatedDate.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Meta"
      maxHeight="88%"
    >
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.inputGroup}>
          <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
            TÍTULO DO OBJETIVO
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: isDarkMode ? '#121214' : '#F8FAFC',
                color: colors.text,
                borderColor: isDarkMode ? '#2D2D3A' : '#E2E8F0',
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Viagem de Férias"
            placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
            SUBTÍTULO / DESCRIÇÃO
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: isDarkMode ? '#121214' : '#F8FAFC',
                color: colors.text,
                borderColor: isDarkMode ? '#2D2D3A' : '#E2E8F0',
              },
            ]}
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder="Ex: Tailândia e Camboja"
            placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
            VALOR ALVO (R$)
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: isDarkMode ? '#121214' : '#F8FAFC',
                color: colors.text,
                borderColor: isDarkMode ? '#2D2D3A' : '#E2E8F0',
              },
            ]}
            value={targetAmount}
            onChangeText={setTargetAmount}
            keyboardType="numeric"
            placeholder="Ex: 5000"
            placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.fieldLabel, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
            PREVISÃO
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: isDarkMode ? '#121214' : '#F8FAFC',
                color: colors.text,
                borderColor: isDarkMode ? '#2D2D3A' : '#E2E8F0',
              },
            ]}
            value={estimatedDate}
            onChangeText={setEstimatedDate}
            placeholder="Ex: Nov 2024"
            placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { opacity: isSaving ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Check size={20} color="#FFFFFF" strokeWidth={3} />
              <Text style={styles.saveButtonText}>Salvar Alterações</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ModalBottomSheet>
  );
};

export const GoalDetailScreen: React.FC = () => {
  const route = useRoute<GoalDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDarkMode } = useTheme();
  const { checkLimit, triggerUpgrade } = useAuth();
  const goalId = route.params?.goalId;
  const notificationAccess = checkLimit('notification');

  const [goal, setGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [isWithdrawFundsOpen, setIsWithdrawFundsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    if (!goalId) {
      setIsLoading(false);
      return;
    }

    const docRef = doc(db, 'goals', goalId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setGoal({
            id: snapshot.id,
            ...snapshot.data(),
          } as Goal);
        } else {
          setGoal(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to goal:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [goalId]);

  if (isLoading) {
    return <LoadingState message="Carregando detalhes..." />;
  }

  if (!goal) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: isDarkMode ? '#121214' : '#FAF9FF', padding: 24 }]}>
        <Text style={styles.notFoundText}>Meta não encontrada!</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Voltar para Metas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculations
  const current = goal.currentAmount || 0;
  const target = goal.targetAmount || 1;
  const percentage = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);

  // SVG Circular progress dimensions
  const radius = 76;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const handleEditSave = async (updatedFields: Partial<Goal>) => {
    if (!goal.id) return;
    await goalService.updateGoal(goal.id, updatedFields);
  };

  const handleAddFunds = async (amount: number, description: string) => {
    if (!goal.id) return;
    await goalService.addGoalFunds(goal.id, amount, description, goal);
  };

  const handleWithdrawFunds = async (amount: number, description: string) => {
    if (!goal.id) return;
    await goalService.withdrawGoalFunds(goal.id, amount, description, goal);
  };

  const sortedHistory = [...(goal.history || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const displayHistory = showAllHistory ? sortedHistory : sortedHistory.slice(0, 3);

  const formatHistoryDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `Hoje, ${hh}:${mm}`;
      }
      const day = d.getDate();
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return 'Data indisponível';
    }
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: isDarkMode ? '#121214' : '#F8FAFC' }]}>
      {/* Top Header */}
      <CurvedHeader
        title={goal.title}
        onBack={() => navigation.goBack()}
        rightActions={
          <>
            <TouchableOpacity
              onPress={() => setIsEditModalOpen(true)}
              style={styles.headerIconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Pencil size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (!notificationAccess.allowed) {
                  triggerUpgrade?.('notification', notificationAccess.reason);
                  return;
                }
                setIsNotificationsOpen(true);
              }}
              style={styles.headerIconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Bell size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main interactive circular progress card */}
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
              borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
            },
          ]}
        >
          {/* Circular Progress Gauge */}
          <View style={styles.progressContainer}>
            <Svg height={radius * 2} width={radius * 2}>
              <G rotation="-90" origin={`${radius}, ${radius}`}>
                {/* Background track circle */}
                <Circle
                  stroke={isDarkMode ? '#2D2D3A' : '#EFEFFF'}
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                />
                {/* Progress bar circle */}
                <Circle
                  stroke="#4D41CC"
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                />
              </G>
            </Svg>
            <View style={styles.progressTextOverlay}>
              <Text style={[styles.progressPercentage, { color: colors.text }]}>
                {percentage}%
              </Text>
              <Text style={[styles.progressLabel, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
                COMPLETO
              </Text>
            </View>
          </View>

          <Text style={[styles.savingsSubtitle, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
            Você já poupou
          </Text>
          <Text style={[styles.currentAmountText, { color: colors.text }]}>
            R$ {current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={[styles.targetAmountText, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
            Objetivo:{' '}
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              R$ {target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </Text>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: isDarkMode ? '#2D2D3A' : '#F1F5F9' }]} />

          {/* Sub forecasting section */}
          <View style={styles.forecastingGrid}>
            <View style={styles.forecastColumn}>
              <View style={[styles.forecastIconBox, { backgroundColor: isDarkMode ? 'rgba(108, 92, 231, 0.15)' : '#EEF2FF' }]}>
                <Calendar size={18} color="#6C5CE7" />
              </View>
              <View style={styles.forecastInfo}>
                <Text style={[styles.forecastLabel, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
                  PREVISÃO
                </Text>
                <Text style={[styles.forecastValue, { color: colors.text }]} numberOfLines={1}>
                  {goal.estimatedDate || 'Sem Estimativa'}
                </Text>
              </View>
            </View>

            <View style={[styles.forecastDivider, { backgroundColor: isDarkMode ? '#2D2D3A' : '#F1F5F9' }]} />

            <View style={styles.forecastColumn}>
              <View style={[styles.forecastIconBox, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
                <TrendingUp size={18} color="#D97706" />
              </View>
              <View style={styles.forecastInfo}>
                <Text style={[styles.forecastLabel, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
                  FALTAM
                </Text>
                <Text style={[styles.forecastValue, { color: colors.text }]} numberOfLines={1}>
                  R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons Grid */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.primaryActionButton, { backgroundColor: '#4D41CC' }]}
            onPress={() => setIsAddFundsOpen(true)}
            activeOpacity={0.85}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={3} />
            <Text style={styles.primaryActionText}>Adicionar Valor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryActionButton,
              {
                backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
                borderColor: isDarkMode ? '#2D2D3A' : '#E2E8F0',
              },
            ]}
            onPress={() => setIsWithdrawFundsOpen(true)}
            activeOpacity={0.85}
          >
            <CircleDollarSign size={18} color="#4D41CC" strokeWidth={2.5} />
            <Text style={[styles.secondaryActionText, { color: '#4D41CC' }]}>Resgatar</Text>
          </TouchableOpacity>
        </View>

        {/* Historical contributions list */}
        <View
          style={[
            styles.historyCard,
            {
              backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF',
              borderColor: isDarkMode ? '#2D2D3A' : '#F1F1F5',
            },
          ]}
        >
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: colors.text }]}>
              Histórico de Depósitos
            </Text>
            {sortedHistory.length > 3 && (
              <TouchableOpacity onPress={() => setShowAllHistory(!showAllHistory)}>
                <Text style={styles.toggleHistoryText}>
                  {showAllHistory ? 'VER MENOS' : 'VER TUDO'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.historyList}>
            {displayHistory.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.historyItemRow,
                  {
                    backgroundColor: isDarkMode ? '#17171C' : '#F8FAFC',
                    borderColor: isDarkMode ? '#2D2D3A' : '#F1F5F9',
                  },
                ]}
              >
                <View style={styles.historyItemLeft}>
                  <HistoryItemIcon
                    description={item.description}
                    type={item.type}
                    isDarkMode={isDarkMode}
                  />
                  <View style={styles.historyItemTexts}>
                    <Text style={[styles.historyItemDesc, { color: colors.text }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <Text style={[styles.historyItemDate, { color: isDarkMode ? '#94A3B8' : '#9CA3AF' }]}>
                      {formatHistoryDate(item.date)}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.historyItemAmount,
                    { color: item.type === 'deposit' ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {item.type === 'deposit' ? '+' : '-'} R${' '}
                  {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            ))}

            {displayHistory.length === 0 && (
              <View style={styles.emptyHistoryBox}>
                <Text style={[styles.emptyHistoryText, { color: isDarkMode ? '#64748B' : '#9CA3AF' }]}>
                  Nenhum depósito ou resgate realizado ainda.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Edit Details modal */}
      <EditGoalModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        goal={goal}
        onSave={handleEditSave}
      />

      {/* Add funds modal */}
      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
        onSubmit={handleAddFunds}
        title="Adicionar valor"
        mode="deposit"
      />

      {/* Redeem funds modal */}
      <AddFundsModal
        isOpen={isWithdrawFundsOpen}
        onClose={() => setIsWithdrawFundsOpen(false)}
        onSubmit={handleWithdrawFunds}
        title="Resgatar valor"
        mode="withdraw"
      />

      {/* Notifications modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    paddingBottom: 28,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#4D41CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  headerIconButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginHorizontal: 8,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  statsCard: {
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressTextOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentage: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  savingsSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentAmountText: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  targetAmountText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 20,
  },
  forecastingGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  forecastColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  forecastDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 12,
  },
  forecastIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forecastInfo: {
    flex: 1,
  },
  forecastLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  forecastValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryActionButton: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4D41CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  secondaryActionButton: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  historyCard: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  toggleHistoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4D41CC',
  },
  historyList: {
    gap: 10,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyItemTexts: {
    flex: 1,
  },
  historyItemDesc: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  historyItemDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyItemAmount: {
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 8,
  },
  emptyHistoryBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  editModalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '85%',
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 4,
  },
  formInput: {
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
  },
  saveButton: {
    height: 52,
    backgroundColor: '#6C5CE7',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
