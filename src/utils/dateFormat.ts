const pad2 = (value: number | string) => String(value).padStart(2, '0');

const MONTHS_PT_BR = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const extractDateParts = (value?: string | Date | null) => {
  if (!value) return null;

  if (value instanceof Date) {
    return {
      day: value.getDate(),
      month: value.getMonth() + 1,
      year: value.getFullYear(),
    };
  }

  const trimmed = value.trim();
  const isoLike = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoLike) {
    return {
      day: Number(isoLike[3]),
      month: Number(isoLike[2]),
      year: Number(isoLike[1]),
    };
  }

  const brFull = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brFull) {
    return {
      day: Number(brFull[1]),
      month: Number(brFull[2]),
      year: Number(brFull[3]),
    };
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      day: parsed.getDate(),
      month: parsed.getMonth() + 1,
      year: parsed.getFullYear(),
    };
  }

  return null;
};

export const toApiDate = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export const formatBrazilianDate = (value?: string | Date | null, fallback = ''): string => {
  if (!value) return fallback;

  const parts = extractDateParts(value);
  if (!parts) return typeof value === 'string' ? value : fallback;

  return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year}`;
};

export const formatCardTransactionDate = (value?: string | Date | null, fallback = ''): string => {
  const parts = extractDateParts(value);
  if (!parts || parts.month < 1 || parts.month > 12) {
    return typeof value === 'string' ? value : fallback;
  }

  return `${pad2(parts.day)} de ${MONTHS_PT_BR[parts.month - 1]}, ${parts.year}`;
};


const capitalizeFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const getDatePartsWithoutTimezoneShift = extractDateParts;

export const formatStatementMonthLabel = (value: Date): string => {
  const month = MONTHS_PT_BR[value.getMonth()] || '';
  return capitalizeFirst(month) + ' ' + value.getFullYear();
};

export const formatStatementGroupDate = (value?: string | Date | null, now = new Date(), fallback = ''): string => {
  const parts = extractDateParts(value);
  if (!parts || parts.month < 1 || parts.month > 12) return fallback;

  const today = { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterday = { day: yesterdayDate.getDate(), month: yesterdayDate.getMonth() + 1, year: yesterdayDate.getFullYear() };
  const month = capitalizeFirst(MONTHS_PT_BR[parts.month - 1]);
  const base = parts.day + ' de ' + month;

  if (parts.day === today.day && parts.month === today.month && parts.year === today.year) {
    return 'Hoje, ' + base;
  }
  if (parts.day === yesterday.day && parts.month === yesterday.month && parts.year === yesterday.year) {
    return 'Ontem, ' + base;
  }
  return base;
};
