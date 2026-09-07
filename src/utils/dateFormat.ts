const pad2 = (value: number | string) => String(value).padStart(2, '0');

export const toApiDate = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export const formatBrazilianDate = (value?: string | Date | null, fallback = ''): string => {
  if (!value) return fallback;

  if (value instanceof Date) {
    return `${pad2(value.getDate())}/${pad2(value.getMonth() + 1)}/${value.getFullYear()}`;
  }

  const trimmed = value.trim();
  const isoLike = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoLike) {
    return `${pad2(isoLike[3])}/${pad2(isoLike[2])}/${isoLike[1]}`;
  }

  const brFull = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brFull) {
    return `${pad2(brFull[1])}/${pad2(brFull[2])}/${brFull[3]}`;
  }

  const brShort = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (brShort) {
    return `${pad2(brShort[1])}/${pad2(brShort[2])}/${new Date().getFullYear()}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatBrazilianDate(parsed, fallback);
  }

  return trimmed;
};
