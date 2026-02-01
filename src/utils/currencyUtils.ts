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