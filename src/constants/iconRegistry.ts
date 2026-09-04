import type { LucideIcon } from 'lucide-react-native';
import {
  Banknote, Bot, Bus, Calendar, Car, Cloud, CreditCard, Film, Gift,
  GraduationCap, HeartPulse, Home, Music, PlayCircle, Plus, ShoppingCart,
  Tag, Theater, Trophy, Tv, Utensils, Wallet,
} from 'lucide-react-native';

const FALLBACK_COLOR = '#6b7280';

export const normalizeIconName = (value?: string) =>
  (value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const icons: Record<string, LucideIcon> = {
  home: Home, house: Home, casa: Home, moradia: Home, aluguel: Home,
  utensils: Utensils, comida: Utensils, alimentacao: Utensils,
  heartpulse: HeartPulse, saude: HeartPulse,
  bus: Bus, transporte: Bus, trans: Bus, car: Car,
  theater: Theater, film: Film, lazer: Theater,
  graduationcap: GraduationCap, educacao: GraduationCap,
  banknote: Banknote, salario: Banknote, trophy: Trophy, calendar: Calendar,
  gift: Gift, wallet: Wallet, creditcard: CreditCard, tv: Tv, music: Music,
  shoppingcart: ShoppingCart, playcircle: PlayCircle, cloud: Cloud, bot: Bot,
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
  { key: 'home', label: 'Moradia / Casa', color: '#f97316' },
  { key: 'utensils', label: 'Alimentação', color: '#3b82f6' },
  { key: 'heart-pulse', label: 'Saúde', color: '#14b8a6' },
  { key: 'bus', label: 'Transporte', color: '#f59e0b' },
  { key: 'theater', label: 'Lazer', color: '#a855f7' },
  { key: 'graduation-cap', label: 'Educação', color: '#f43f5e' },
];
