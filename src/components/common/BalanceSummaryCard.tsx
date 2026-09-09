import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff } from 'lucide-react-native';
import Svg, { Rect } from 'react-native-svg';

interface BalanceSummaryCardProps {
  period: string;
  balance: number;
  income: number;
  expense: number;
  isBalanceVisible: boolean;
  isDarkMode: boolean;
  onToggleBalance: () => void;
}

const money = (value: number) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const HiddenAmount = () => <Text style={styles.hiddenAmount}>••••••</Text>;

const DecorativeBars = () => (
  <View style={styles.bars} pointerEvents="none">
    <Svg width={118} height={56} viewBox="0 0 118 56">
      {[25, 17, 8, 20, 16, 4, 13].map((top, index) => (
        <Rect
          key={index}
          x={index * 16 + 2}
          y={top}
          width={10}
          height={48 - top}
          rx={5}
          fill="#FFFFFF"
          opacity={0.18 + (index % 3) * 0.04}
        />
      ))}
    </Svg>
  </View>
);

export const BalanceSummaryCard: React.FC<BalanceSummaryCardProps> = ({
  period,
  balance,
  income,
  expense,
  isBalanceVisible,
  isDarkMode,
  onToggleBalance,
}) => (
  <View style={styles.wrapper}>
    <View style={styles.card}>
      <View style={styles.periodRow}>
        <View />
        <View style={styles.periodPill}>
          <Text style={styles.period} numberOfLines={1}>{period}</Text>
          <ChevronDown size={18} color="#FFFFFF" strokeWidth={2.4} />
        </View>
      </View>

      <View style={styles.balanceBody}>
        <TouchableOpacity style={styles.balanceLabelRow} onPress={onToggleBalance} activeOpacity={0.75}>
          {isBalanceVisible ? <EyeOff size={15} color="#FFFFFF" /> : <Eye size={15} color="#FFFFFF" />}
          <Text style={styles.balanceLabel}>Saldo total</Text>
        </TouchableOpacity>

        <View style={styles.amountRow}>
          <Text style={styles.currency}>R$</Text>
          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
            {isBalanceVisible ? money(balance) : '••••••'}
          </Text>
        </View>
      </View>

      <DecorativeBars />

      <View style={[styles.summary, { backgroundColor: isDarkMode ? '#1E1E26' : '#FFFFFF' }]}>
        <Item
          label="Receitas"
          value={income}
          icon={<ArrowDown size={26} color="#0FBF64" strokeWidth={2.8} />}
          iconStyle={styles.incomeIconBox}
          valueColor="#0FBF64"
          isDarkMode={isDarkMode}
          isBalanceVisible={isBalanceVisible}
        />
        <View style={[styles.divider, { backgroundColor: isDarkMode ? '#3F3F4A' : '#E5E8F0' }]} />
        <Item
          label="Despesas"
          value={expense}
          icon={<ArrowUp size={26} color="#E11919" strokeWidth={2.8} />}
          iconStyle={styles.expenseIconBox}
          valueColor="#E11919"
          isDarkMode={isDarkMode}
          isBalanceVisible={isBalanceVisible}
        />
      </View>
    </View>
  </View>
);

const Item: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  iconStyle: object;
  valueColor: string;
  isDarkMode: boolean;
  isBalanceVisible: boolean;
}> = ({ label, value, icon, iconStyle, valueColor, isDarkMode, isBalanceVisible }) => (
  <View style={styles.item}>
    <View style={[styles.statIconBox, iconStyle]}>{icon}</View>
    <View style={styles.itemText}>
      <Text style={[styles.label, { color: isDarkMode ? '#D4D4D8' : '#707A99' }]} numberOfLines={1}>{label}</Text>
      {isBalanceVisible ? (
        <Text style={[styles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>
          R$ {money(value)}
        </Text>
      ) : (
        <HiddenAmount />
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 22,
    marginBottom: 16,
  },
  card: {
    minHeight: 178,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#5748FF',
    paddingHorizontal: 17,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#5748FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 7,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '58%',
  },
  period: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Inter-Medium',
    textTransform: 'capitalize',
  },
  balanceBody: {
    marginBottom: 20,
    maxWidth: '70%',
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  balanceLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  currency: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 28,
    lineHeight: 36,
    fontFamily: 'Inter-Bold',
  },
  amount: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 39,
    fontFamily: 'Inter-Bold',
  },
  hiddenAmount: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Inter-Bold',
  },
  bars: {
    position: 'absolute',
    right: 22,
    top: 82,
  },
  summary: {
    minHeight: 62,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#1C1C28',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeIconBox: {
    backgroundColor: '#D9F8E8',
  },
  expenseIconBox: {
    backgroundColor: '#FFE4E7',
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  divider: {
    width: 1,
    height: 42,
    marginHorizontal: 12,
  },
  label: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Inter-Bold',
  },
});
