import moment from 'moment';
import 'moment/locale/pt-br'; // Importa o locale para português do Brasil

moment.locale('pt-br');

export const formatRelativeDate = (dateString: string): string => {
  const date = moment(dateString);
  const now = moment();

  // Se for hoje, mostra "há X horas/minutos"
  if (date.isSame(now, 'day')) {
    return date.fromNow();
  }
  // Se for ontem
  if (date.isSame(now.clone().subtract(1, 'day'), 'day')) {
    return 'Ontem';
  }
  // Se for nos últimos 7 dias, mostra "há X dias"
  if (date.isSame(now, 'week')) {
    return date.fromNow();
  }
  // Caso contrário, mostra a data completa
  return date.format('DD/MM/YYYY');
};