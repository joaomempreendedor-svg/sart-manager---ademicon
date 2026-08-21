export const formatLargeCurrency = (value: number): string => {
  if (value === 0) {
    return 'R$ 0,00';
  }

  const absValue = Math.abs(value);
  let formattedValue: string;
  let suffix = '';

  if (absValue >= 1_000_000) {
    formattedValue = (absValue / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    suffix = 'M';
  } else if (absValue >= 1_000) {
    formattedValue = (absValue / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    suffix = 'K';
  } else {
    formattedValue = absValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return `${value < 0 ? '-' : ''}R$ ${formattedValue}${suffix}`;
};

export const formatBRLFromCents = (cents: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(cents / 100);

export const parseBRLInputToCents = (value: string): number => {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

export const formatBRLInput = (value: string): string =>
  formatBRLFromCents(parseBRLInputToCents(value));