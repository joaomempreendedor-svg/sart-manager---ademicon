export function normalizeText(input?: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function isAnswered(result?: string): boolean {
  const r = normalizeText(result);
  // Consideramos 'não atendeu' e 'número inválido' como NÃO atendidas
  return !(r === 'nao atendeu' || r === 'numero invalido');
}

export function isConversation(result?: string): boolean {
  const r = normalizeText(result);
  // Conversas/interesse: conversou, demonstrou interesse, agendar reunião
  return r === 'conversou' || r === 'demonstrou interesse' || r === 'agendar reuniao';
}

export function isMeeting(result?: string): boolean {
  const r = normalizeText(result);
  return r === 'agendar reuniao';
}