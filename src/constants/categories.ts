import { BudgetCategory } from '../types';

export type SharedCategoryType = 'expense' | 'income';

export interface SharedCategory {
  id: string;
  name: string;
  type: SharedCategoryType;
  description: string;
  icon: string;
  color: string;
  backgroundColor: string;
  defaultLimit?: number;
  aliases?: string[];
  order: number;
  isCustom?: boolean;
}

export const EXPENSE_CATEGORIES: SharedCategory[] = [
  { id: 'alimentacao', name: 'Alimentação', type: 'expense', description: 'Restaurantes, delivery, mercados...', icon: 'utensils', color: '#FF3B5F', backgroundColor: '#FFECEF', defaultLimit: 800, aliases: ['comida', 'mercado', 'supermercado', 'restaurante', 'delivery'], order: 1 },
  { id: 'transporte', name: 'Transporte', type: 'expense', description: 'Combustível, Uber, transporte público...', icon: 'car', color: '#0B73F6', backgroundColor: '#EAF2FF', defaultLimit: 600, aliases: ['uber', 'combustível', 'combustivel', 'ônibus', 'onibus', 'gasolina'], order: 2 },
  { id: 'moradia', name: 'Moradia', type: 'expense', description: 'Aluguel, condomínio, água, luz...', icon: 'home', color: '#6C2EFF', backgroundColor: '#F0E9FF', defaultLimit: 1200, aliases: ['aluguel', 'casa', 'condomínio', 'condominio', 'luz', 'água', 'agua'], order: 3 },
  { id: 'saude', name: 'Saúde', type: 'expense', description: 'Médicos, farmácias, planos de saúde...', icon: 'heart', color: '#F43F68', backgroundColor: '#FFECEF', defaultLimit: 300, aliases: ['farmácia', 'farmacia', 'médico', 'medico', 'hospital'], order: 4 },
  { id: 'educacao', name: 'Educação', type: 'expense', description: 'Cursos, mensalidades, livros...', icon: 'graduation-cap', color: '#16C784', backgroundColor: '#E9FAF1', defaultLimit: 400, aliases: ['curso', 'faculdade', 'livros', 'escola'], order: 5 },
  { id: 'lazer', name: 'Lazer', type: 'expense', description: 'Viagens, entretenimento, hobbies...', icon: 'gamepad-2', color: '#FF8A00', backgroundColor: '#FFF1E2', aliases: ['viagem', 'entretenimento', 'cinema', 'hobby'], order: 6 },
  { id: 'compras', name: 'Compras', type: 'expense', description: 'Roupas, eletrônicos, presentes...', icon: 'shopping-bag', color: '#F43F76', backgroundColor: '#FFEAF1', defaultLimit: 500, aliases: ['roupas', 'eletrônicos', 'eletronicos', 'presente', 'loja'], order: 7 },
  { id: 'servicos', name: 'Serviços', type: 'expense', description: 'Manutenção, serviços gerais...', icon: 'wrench', color: '#0B73F6', backgroundColor: '#EAF2FF', aliases: ['manutenção', 'manutencao', 'serviço', 'servico'], order: 8 },
  { id: 'assinaturas', name: 'Assinaturas', type: 'expense', description: 'Streaming, apps, softwares...', icon: 'credit-card', color: '#7B2CFF', backgroundColor: '#F0E9FF', defaultLimit: 200, aliases: ['streaming', 'netflix', 'spotify', 'software', 'apps'], order: 9 },
  { id: 'cartao-credito', name: 'Cartão de Crédito', type: 'expense', description: 'Faturas e pagamentos de cartão...', icon: 'credit-card', color: '#6C2EFF', backgroundColor: '#F0E9FF', aliases: ['cartão', 'cartao', 'fatura'], order: 10 },
  { id: 'impostos', name: 'Impostos', type: 'expense', description: 'Taxas, tributos e tarifas...', icon: 'receipt-text', color: '#64748B', backgroundColor: '#EEF2F7', aliases: ['taxa', 'tributo', 'tarifa'], order: 11 },
  { id: 'outros', name: 'Outros', type: 'expense', description: 'Outras despesas', icon: 'more-horizontal', color: '#9AA0C3', backgroundColor: '#F0F1FA', aliases: ['diversos', 'outro'], order: 12 },
];

export const INCOME_CATEGORIES: SharedCategory[] = [
  { id: 'salario', name: 'Salário', type: 'income', description: 'Recebimentos de salário...', icon: 'banknote', color: '#16C784', backgroundColor: '#E9FAF1', aliases: ['salario', 'renda', 'pagamento'], order: 101 },
  { id: 'freelancer', name: 'Freelancer', type: 'income', description: 'Projetos e trabalhos extras...', icon: 'briefcase', color: '#16C784', backgroundColor: '#E9FAF1', aliases: ['cliente', 'freela', 'serviço'], order: 102 },
  { id: 'pix-recebido', name: 'PIX recebido', type: 'income', description: 'Transferências recebidas via PIX...', icon: 'send', color: '#16C784', backgroundColor: '#E9FAF1', aliases: ['pix', 'transferência', 'transferencia'], order: 103 },
  { id: 'investimentos', name: 'Investimentos', type: 'income', description: 'Rendimentos e dividendos...', icon: 'bar-chart-3', color: '#16C784', backgroundColor: '#E9FAF1', aliases: ['rendimento', 'dividendo', 'cdb'], order: 104 },
  { id: 'outras-receitas', name: 'Outras receitas', type: 'income', description: 'Outros recebimentos', icon: 'more-horizontal', color: '#16C784', backgroundColor: '#E9FAF1', aliases: ['outros', 'receita'], order: 105 },
];

export const SHARED_CATEGORIES: SharedCategory[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const normalizeCategoryName = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const getSharedCategoryByName = (name?: string) => {
  const normalized = normalizeCategoryName(name);
  return SHARED_CATEGORIES.find((category) =>
    normalizeCategoryName(category.name) === normalized ||
    category.aliases?.some((alias) => normalizeCategoryName(alias) === normalized)
  );
};

export const getCategoriesByType = (type?: SharedCategoryType) =>
  type ? SHARED_CATEGORIES.filter((category) => category.type === type) : SHARED_CATEGORIES;

export const toBudgetCategory = (category: SharedCategory): BudgetCategory => ({
  id: 'default-' + category.id,
  name: category.name,
  percentage: 0,
  limitAmount: 0,
  icon: category.icon,
  color: category.color,
  backgroundColor: category.backgroundColor,
  description: category.description,
  aliases: category.aliases,
  type: category.type,
  active: true,
  isActive: true,
  enabled: true,
  order: category.order,
  sortOrder: category.order,
});

export const DEFAULT_BUDGET_CATEGORIES = SHARED_CATEGORIES.map(toBudgetCategory);

export const mergeWithDefaultCategories = (categories: BudgetCategory[]) => {
  const merged = new Map<string, BudgetCategory>();

  DEFAULT_BUDGET_CATEGORIES.forEach((category) => {
    merged.set(normalizeCategoryName(category.name), category);
  });

  categories.forEach((category) => {
    const original = DEFAULT_BUDGET_CATEGORIES.find((item) => item.id === category.defaultCategoryId);
    if (original) merged.delete(normalizeCategoryName(original.name));
    if (category.deleted) {
      merged.delete(normalizeCategoryName(category.name));
      return;
    }
    const visual = getSharedCategoryByName(category.name);
    const base = visual ? toBudgetCategory(visual) : undefined;
    const key = normalizeCategoryName(category.name);
    merged.set(key, {
      ...(base || {}),
      ...category,
      description: category.description || visual?.description,
      backgroundColor: category.backgroundColor || visual?.backgroundColor,
      color: category.color || visual?.color,
      icon: category.icon || visual?.icon,
      type: category.type || visual?.type || 'expense',
    });
  });

  return Array.from(merged.values()).sort((a, b) => {
    const orderA = a.sortOrder ?? a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.sortOrder ?? b.order ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
};
