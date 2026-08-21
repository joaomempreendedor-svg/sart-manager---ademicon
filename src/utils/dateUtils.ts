import moment from 'moment';
import 'moment/locale/pt-br'; // Importa o locale para português do Brasil

moment.locale('pt-br');

export const formatRelativeDate = (dateString: string): string => {
  const date = moment(dateString);
  const now = moment();
  const diffSeconds = now.diff(date, 'seconds');
  const diffMinutes = now.diff(date, 'minutes');
  const diffHours = now.diff(date, 'hours');
  const diffDays = now.diff(date, 'days');

  if (diffSeconds < 60) {
    return 'agora mesmo';
  }
  if (diffMinutes < 60) {
    return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  }
  if (diffHours < 24) {
    return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  }
  if (diffDays === 1) {
    return 'ontem';
  }
  if (diffDays < 7) {
    return `há ${diffDays} dias`;
  }
  return date.format('DD/MM/YYYY');
};