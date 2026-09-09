import type { LucideIcon } from 'lucide-react-native';
import {
  Banknote, BarChart3, Bot, Briefcase, Bus, Calendar, Car, Cloud, CreditCard, Film, Gift,
  Gamepad2, GraduationCap, Heart, HeartPulse, Home, MoreHorizontal, Music, PlayCircle, Plus, ReceiptText, Send, ShoppingBag, ShoppingCart,
  Tag, Theater, Trophy, Tv, Utensils, Wallet, Wrench,
} from 'lucide-react-native';

const FALLBACK_COLOR = '#6b7280';

export const normalizeIconName = (value?: string) =>
  (value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const icons: Record<string, LucideIcon> = {
  home: Home, house: Home, casa: Home, moradia: Home, aluguel: Home,
  utensils: Utensils, comida: Utensils, alimentacao: Utensils,
  heart: Heart, heartpulse: HeartPulse, saude: Heart,
  bus: Bus, transporte: Car, trans: Car, car: Car,
  theater: Theater, film: Film, lazer: Gamepad2, gamepad2: Gamepad2,
  graduationcap: GraduationCap, educacao: GraduationCap,
  banknote: Banknote, salario: Banknote, trophy: Trophy, calendar: Calendar,
  gift: Gift, wallet: Wallet, creditcard: CreditCard, tv: Tv, music: Music,
  shoppingcart: ShoppingCart, shoppingbag: ShoppingBag, compras: ShoppingBag, playcircle: PlayCircle, cloud: Cloud, bot: Bot,
  wrench: Wrench, servicos: Wrench, morehorizontal: MoreHorizontal, receipttext: ReceiptText, impostos: ReceiptText,
  barchart3: BarChart3, investimentos: BarChart3, briefcase: Briefcase, freelancer: Briefcase, send: Send, pix: Send,
  tag: Tag, plus: Plus,
};

export const getIconComponent = (iconName?: string): LucideIcon =>
  icons[normalizeIconName(iconName)] || Tag;

export const isValidColor = (value?: string): value is string =>
  !!value && /^#[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/i.test(value.trim());

const withOpacity = (color: string, opacity: number) => {
  const value = color.trim();
  const hex = value.length === 4
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
    : value.slice(0, 7);
  return `rgba(${Number.parseInt(hex.slice(1, 3), 16)}, ${Number.parseInt(hex.slice(3, 5), 16)}, ${Number.parseInt(hex.slice(5, 7), 16)}, ${opacity})`;
};

export const getCategoryVisual = (iconName?: string, color?: string, isDarkMode = false) => {
  const accentColor = isValidColor(color) ? color : FALLBACK_COLOR;
  return {
    Icon: getIconComponent(iconName),
    color: accentColor,
    backgroundColor: withOpacity(accentColor, isDarkMode ? 0.24 : 0.12),
  };
};

export const CATEGORY_ICON_PRESETS = [
  { key: 'utensils', label: 'Alimentação', color: '#FF3B5F' },
  { key: 'car', label: 'Transporte', color: '#0B73F6' },
  { key: 'home', label: 'Moradia', color: '#6C2EFF' },
  { key: 'heart', label: 'Saúde', color: '#F43F68' },
  { key: 'graduation-cap', label: 'Educação', color: '#16C784' },
  { key: 'gamepad-2', label: 'Lazer', color: '#FF8A00' },
  { key: 'shopping-bag', label: 'Compras', color: '#F43F76' },
  { key: 'wrench', label: 'Serviços', color: '#0B73F6' },
  { key: 'credit-card', label: 'Assinaturas', color: '#7B2CFF' },
  { key: 'banknote', label: 'Salário', color: '#16C784' },
  { key: 'briefcase', label: 'Freelancer', color: '#16C784' },
  { key: 'more-horizontal', label: 'Outros', color: '#9AA0C3' },
];
