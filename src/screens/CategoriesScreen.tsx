import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Plus,
  Search,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { useCategories } from '../contexts/CategoryContext';
import { useTransactions } from '../hooks/useTransactions';
import { getCategoryVisual } from '../constants/iconRegistry';
import { EXPENSE_CATEGORIES, getSharedCategoryByName, normalizeCategoryName } from '../constants/categories';
import { BudgetCategory } from '../types';

const PRIMARY = '#5836FF';
const TEXT = '#080D2F';
const MUTED = '#6F789B';
const BORDER = '#E5E8F6';
const SOFT = '#F6F5FF';
const SUCCESS = '#14C46A';
const DANGER = '#F10F29';
const WARNING = '#FF8A00';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CategoryTab = 'Todas' | 'Despesas' | 'Receitas' | 'Personalizadas';
type LimitTab = 'Todas' | 'Com limite' | 'Sem limite';

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const monthMatches = (date?: string) => {
  if (!date) return false;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  return parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear();
};

const categoryKey = (name?: string) => normalizeCategoryName(name);

const BackButton = () => {
  const navigation = useNavigation<NavigationProp>();
  return (
    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.84}>
      <ChevronLeft size={26} color={TEXT} strokeWidth={3} />
    </TouchableOpacity>
  );
};

const Header = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={styles.headerRow}>
    <BackButton />
    <View style={styles.headerCopy}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  </View>
);

const Tabs = <T extends string>({ tabs, active, onChange }: { tabs: T[]; active: T; onChange: (tab: T) => void }) => (
  <View style={styles.tabsRow}>
    {tabs.map((tab) => {
      const selected = active === tab;
      return (
        <TouchableOpacity key={tab} style={[styles.tab, selected && styles.activeTab]} onPress={() => onChange(tab)} activeOpacity={0.84}>
          <Text style={[styles.tabText, selected && styles.activeTabText]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76}>{tab}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const CategoryIcon = ({ category, size = 48 }: { category: Pick<BudgetCategory, 'icon' | 'color' | 'backgroundColor'>; size?: number }) => {
  const visual = getCategoryVisual(category.icon, category.color);
  const Icon = visual.Icon;
  return (
    <View style={[styles.categoryIconBox, { width: size, height: size, borderRadius: 12, backgroundColor: category.backgroundColor || visual.backgroundColor }]}>
      <Icon size={size === 48 ? 24 : 22} color={category.color || visual.color} strokeWidth={2.6} />
    </View>
  );
};

const TipCard = () => (
  <View style={styles.tipCard}>
    <View style={styles.tipIconBox}>
      <Lightbulb size={30} color={PRIMARY} strokeWidth={2.3} />
    </View>
    <View style={styles.tipCopy}>
      <Text style={styles.tipTitle}>Dica do Numvra</Text>
      <Text style={styles.tipText}>Revise seus limites mensalmente para manter suas finanças no controle.</Text>
    </View>
  </View>
);

export const CategoriesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { categories } = useCategories();
  const [tab, setTab] = useState<CategoryTab>('Todas');
  const [search, setSearch] = useState('');

  const filteredCategories = useMemo(() => {
    const query = normalizeCategoryName(search);
    return categories.filter((category) => {
      const type = category.type || getSharedCategoryByName(category.name)?.type || 'expense';
      const isDefault = category.id?.startsWith('default-') || !!getSharedCategoryByName(category.name);
      const matchesTab =
        tab === 'Todas' ||
        (tab === 'Despesas' && type === 'expense') ||
        (tab === 'Receitas' && type === 'income') ||
        (tab === 'Personalizadas' && !isDefault);
      const matchesSearch = !query ||
        normalizeCategoryName(category.name).includes(query) ||
        normalizeCategoryName(category.description).includes(query);
      return matchesTab && matchesSearch;
    });
  }, [categories, search, tab]);

  const expenseCount = categories.filter((category) => (category.type || getSharedCategoryByName(category.name)?.type) === 'expense').length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 18 }]} showsVerticalScrollIndicator={false}>
        <Header title="Categorias" subtitle="Organize suas movimentações com categorias." />

        <Tabs tabs={['Todas', 'Despesas', 'Receitas', 'Personalizadas']} active={tab} onChange={setTab} />

        <View style={styles.searchBox}>
          <Search size={21} color="#848CAA" strokeWidth={2.4} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar categoria..."
            placeholderTextColor="#9AA1BE"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <ChevronDown size={20} color={TEXT} strokeWidth={3} />
            <Text style={styles.sectionTitle}>{tab === 'Receitas' ? 'Receitas' : tab === 'Personalizadas' ? 'Personalizadas' : 'Despesas'}</Text>
          </View>
          <Text style={styles.sectionCount}>{tab === 'Todas' || tab === 'Despesas' ? expenseCount : filteredCategories.length} categorias</Text>
        </View>

        <View style={styles.categoryList}>
          {filteredCategories.map((category) => (
            <TouchableOpacity key={category.id} style={styles.categoryRow} activeOpacity={0.84}>
              <CategoryIcon category={category} />
              <View style={styles.categoryTextWrap}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryDescription} numberOfLines={1}>{category.description || getSharedCategoryByName(category.name)?.description || 'Categoria personalizada'}</Text>
              </View>
              <View style={[styles.colorDot, { backgroundColor: category.color || '#9AA0C3' }]} />
              <ChevronRight size={22} color={TEXT} strokeWidth={2.7} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('AddBudgetCategoryModal')} activeOpacity={0.88}>
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.primaryButtonText}>Nova categoria</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export const CategoryLimitsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<LimitTab>('Todas');
  const { categories } = useCategories();
  const { transactions } = useTransactions();

  const expenseCategories = useMemo(() => {
    const map = new Map(categories.map((category) => [categoryKey(category.name), category]));
    EXPENSE_CATEGORIES.forEach((category) => {
      if (!map.has(categoryKey(category.name))) {
        map.set(categoryKey(category.name), {
          id: 'default-' + category.id,
          name: category.name,
          type: category.type,
          description: category.description,
          icon: category.icon,
          color: category.color,
          backgroundColor: category.backgroundColor,
          limitAmount: category.defaultLimit,
          order: category.order,
          sortOrder: category.order,
        });
      }
    });
    return Array.from(map.values())
      .filter((category) => (category.type || getSharedCategoryByName(category.name)?.type || 'expense') === 'expense')
      .sort((a, b) => (a.sortOrder ?? a.order ?? 99) - (b.sortOrder ?? b.order ?? 99));
  }, [categories]);

  const rows = useMemo(() => expenseCategories.map((category) => {
    const spent = transactions
      .filter((transaction) => transaction.type === 'expense' && monthMatches(transaction.date) && categoryKey(transaction.category) === categoryKey(category.name))
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const limit = category.limitAmount || getSharedCategoryByName(category.name)?.defaultLimit || 0;
    const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    const fallback = getSharedCategoryByName(category.name);
    return {
      ...category,
      description: category.description || fallback?.description,
      backgroundColor: category.backgroundColor || fallback?.backgroundColor,
      color: category.color || fallback?.color,
      icon: category.icon || fallback?.icon,
      spent,
      limit,
      percent,
    };
  }), [expenseCategories, transactions]);

  const filteredRows = rows.filter((row) =>
    tab === 'Todas' || (tab === 'Com limite' && row.limit > 0) || (tab === 'Sem limite' && row.limit <= 0)
  );
  const totalBudget = rows.reduce((sum, row) => sum + row.limit, 0);
  const withLimit = rows.filter((row) => row.limit > 0).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 24 }]} showsVerticalScrollIndicator={false}>
        <Header title="Limites por categoria" subtitle="Defina quanto deseja gastar em cada categoria por mês." />

        <View style={styles.budgetSummaryCard}>
          <View style={styles.summaryIconBox}>
            <BarChart3 size={34} color={PRIMARY} strokeWidth={2.6} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryLabel}>Orçamento do mês</Text>
            <Text style={styles.summaryValue}>{money(totalBudget || 4200)}</Text>
            <Text style={styles.summaryHint}>{withLimit || 7} de {rows.length || 12} categorias com limite</Text>
          </View>
          <TouchableOpacity style={styles.adjustButton} activeOpacity={0.84}>
            <Text style={styles.adjustButtonText}>Ajustar total</Text>
          </TouchableOpacity>
        </View>

        <Tabs tabs={['Todas', 'Com limite', 'Sem limite']} active={tab} onChange={setTab} />

        <View style={styles.limitList}>
          {filteredRows.map((row) => {
            const overLimit = row.limit > 0 && row.spent > row.limit;
            const progress = row.limit > 0 ? Math.min(row.percent, 124) : 0;
            const progressColor = overLimit ? DANGER : row.percent >= 80 ? (row.name === 'Moradia' || row.name === 'Assinaturas' ? PRIMARY : SUCCESS) : row.percent >= 45 ? WARNING : SUCCESS;
            return (
              <TouchableOpacity key={row.id} style={styles.limitRow} activeOpacity={0.84}>
                <CategoryIcon category={row} size={46} />
                <View style={styles.limitBody}>
                  <View style={styles.limitTopLine}>
                    <Text style={styles.limitName}>{row.name}</Text>
                    <Text style={styles.limitValue}>{row.limit > 0 ? money(row.limit) : 'Sem limite'}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(progress, 100))}%`, backgroundColor: progressColor }]} />
                  </View>
                  <View style={styles.limitBottomLine}>
                    <Text style={styles.limitMeta}>{row.limit > 0 ? `${money(row.spent)} gastos` : 'Nenhum gasto registrado'}</Text>
                    {row.limit > 0 && (
                      <Text style={[styles.limitMeta, overLimit && styles.overLimitText]}>
                        {overLimit ? `${money(row.spent - row.limit)} acima do limite` : `${money(Math.max(row.limit - row.spent, 0))} restantes`}
                      </Text>
                    )}
                  </View>
                </View>
                {row.limit > 0 && <Text style={[styles.limitPercent, overLimit && styles.overLimitText]}>{row.percent}%</Text>}
                <ChevronRight size={22} color={TEXT} strokeWidth={2.7} />
              </TouchableOpacity>
            );
          })}
        </View>

        <TipCard />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  backButton: { width: 46, height: 46, borderRadius: 13, borderWidth: 1.2, borderColor: BORDER, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { fontSize: 25, lineHeight: 30, fontWeight: '900', color: TEXT, letterSpacing: 0 },
  subtitle: { marginTop: 2, fontSize: 14, lineHeight: 18, fontWeight: '600', color: MUTED },
  tabsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  tab: { flex: 1, height: 43, borderRadius: 12, backgroundColor: SOFT, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: 'transparent' },
  activeTab: { backgroundColor: '#FFFFFF', borderColor: PRIMARY },
  tabText: { fontSize: 13, fontWeight: '700', color: MUTED },
  activeTabText: { color: PRIMARY, fontWeight: '900' },
  searchBox: { height: 53, borderRadius: 13, borderWidth: 1.2, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF', marginTop: 4 },
  searchInput: { flex: 1, color: TEXT, fontSize: 15, fontWeight: '600', padding: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: TEXT },
  sectionCount: { fontSize: 12, fontWeight: '700', color: MUTED },
  categoryList: { gap: 7 },
  categoryRow: { minHeight: 65, borderRadius: 11, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 11 },
  categoryIconBox: { alignItems: 'center', justifyContent: 'center' },
  categoryTextWrap: { flex: 1, minWidth: 0 },
  categoryName: { fontSize: 15, lineHeight: 18, fontWeight: '900', color: TEXT },
  categoryDescription: { marginTop: 5, fontSize: 12, lineHeight: 15, fontWeight: '600', color: MUTED },
  colorDot: { width: 11, height: 11, borderRadius: 6, marginRight: 2 },
  primaryButton: { height: 58, borderRadius: 12, backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 6, shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  budgetSummaryCard: { minHeight: 108, borderRadius: 10, backgroundColor: '#F0EEFF', flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 },
  summaryIconBox: { width: 72, height: 72, borderRadius: 13, backgroundColor: '#E8E3FF', alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryLabel: { fontSize: 14, fontWeight: '700', color: MUTED },
  summaryValue: { marginTop: 3, fontSize: 25, lineHeight: 30, fontWeight: '900', color: TEXT },
  summaryHint: { marginTop: 4, fontSize: 12, fontWeight: '700', color: MUTED },
  adjustButton: { height: 36, borderRadius: 10, borderWidth: 1.2, borderColor: PRIMARY, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  adjustButtonText: { color: PRIMARY, fontSize: 12, fontWeight: '900' },
  limitList: { gap: 7 },
  limitRow: { minHeight: 70, borderRadius: 11, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 10 },
  limitBody: { flex: 1, minWidth: 0 },
  limitTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  limitName: { flex: 1, fontSize: 15, lineHeight: 18, fontWeight: '900', color: TEXT },
  limitValue: { fontSize: 13, fontWeight: '900', color: TEXT },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: '#E4E6F0', overflow: 'hidden', marginTop: 7 },
  progressFill: { height: '100%', borderRadius: 999 },
  limitBottomLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  limitMeta: { fontSize: 11, fontWeight: '700', color: MUTED },
  limitPercent: { minWidth: 34, textAlign: 'right', fontSize: 13, fontWeight: '900', color: MUTED },
  overLimitText: { color: DANGER },
  tipCard: { minHeight: 86, borderRadius: 10, backgroundColor: '#F2F0FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 14, marginTop: 8 },
  tipIconBox: { width: 58, height: 58, borderRadius: 14, backgroundColor: '#E9E5FF', alignItems: 'center', justifyContent: 'center' },
  tipCopy: { flex: 1, minWidth: 0 },
  tipTitle: { fontSize: 15, fontWeight: '900', color: PRIMARY, marginBottom: 4 },
  tipText: { fontSize: 12, lineHeight: 17, fontWeight: '600', color: MUTED },
});
