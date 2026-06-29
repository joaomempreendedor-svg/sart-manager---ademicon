import { Candidate, CandidateStatus, HiringPipelineColumn, HiringPipelineStageKey } from '@/types';

export const DEFAULT_HIRING_PIPELINE_STAGE_KEY: HiringPipelineStageKey = 'candidatos';

export const DEFAULT_HIRING_PIPELINE_COLUMNS: HiringPipelineColumn[] = [
  { id: 'candidatos', stageKey: 'candidatos', title: 'Candidatos', color: 'gray', ownerRole: 'SECRETARIA',
    description: 'Entrada inicial dos candidatos no processo.',
    suggestedMessage: 'Olá! Vi seu currículo/perfil e gostaria de conversar sobre uma oportunidade na nossa equipe comercial. Você teria disponibilidade para um breve bate-papo?' },
  { id: 'contatados', stageKey: 'contatados', title: 'Contatados', color: 'blue', ownerRole: 'SECRETARIA',
    description: 'Candidato recebeu o primeiro contato e aguardamos retorno.',
    suggestedMessage: 'Oi! Passando para saber se você recebeu minha mensagem anterior sobre a oportunidade na nossa equipe. Posso te passar mais detalhes?' },
  { id: 'respondeu', stageKey: 'respondeu', title: 'Respondeu', color: 'green', ownerRole: 'SECRETARIA',
    description: 'Candidato respondeu e demonstrou interesse, seguir para agendamento de entrevista.',
    suggestedMessage: 'Que ótimo que você tem interesse! Vamos agendar uma entrevista? Me diga quais dias e horários funcionam melhor para você.' },
  { id: 'entrevista-agendada', stageKey: 'entrevista-agendada', title: 'Entrevista Agendada', color: 'blue', ownerRole: 'SECRETARIA',
    description: 'Entrevista marcada com data e horário definidos. Confirmar presença com o candidato.',
    suggestedMessage: 'Sua entrevista está confirmada! Vou te enviar os detalhes de data, horário e local (ou link, se for online). Qualquer imprevisto, me avise com antecedência.' },
  { id: 'compareceu-entrevista', stageKey: 'compareceu-entrevista', title: 'Compareceu na Entrevista', color: 'purple', ownerRole: 'GESTOR',
    description: 'Candidato compareceu à entrevista. Gestor deve avaliar e decidir aprovação.',
    suggestedMessage: 'Foi um prazer te conhecer na entrevista! Em breve retornamos com o resultado da avaliação.' },
  { id: 'faltou-entrevista', stageKey: 'faltou-entrevista', title: 'Faltou na Entrevista', color: 'red', ownerRole: 'SECRETARIA',
    description: 'Candidato não compareceu. Tentar reagendar ou encerrar o contato.',
    suggestedMessage: 'Notei que você não pôde comparecer à entrevista. Gostaria de reagendar para outro dia/horário?' },
  { id: 'aprovado-gestor', stageKey: 'aprovado-gestor', title: 'Aprovado pelo Gestor', color: 'green', ownerRole: 'GESTOR',
    description: 'Gestor aprovou o candidato. Seguir para validação D+1 e início da documentação.',
    suggestedMessage: 'Parabéns! Você foi aprovado(a) na entrevista. Agora vamos seguir com os próximos passos da documentação.' },
  { id: 'reprovado-gestor', stageKey: 'reprovado-gestor', title: 'Reprovado pelo Gestor', color: 'red', ownerRole: 'GESTOR',
    description: 'Gestor reprovou o candidato nesta etapa do processo.',
    suggestedMessage: 'Agradecemos sua participação no processo. Neste momento optamos por seguir com outro perfil, mas ficaremos com seu contato para futuras oportunidades.' },
  { id: 'aprovacao-d1', stageKey: 'aprovacao-d1', title: 'Aprovação D+1', color: 'yellow', ownerRole: 'SECRETARIA',
    description: 'Candidato em validação de D+1 antes de avançar para documentação.',
    suggestedMessage: 'Estamos finalizando a validação do seu processo. Em breve te passamos os próximos passos!' },
  { id: 'documentacao-enviada', stageKey: 'documentacao-enviada', title: 'Enviou a Documentação', color: 'green', ownerRole: 'SECRETARIA',
    description: 'Documentação recebida pelo time. Seguir para cadastro da prévia.',
    suggestedMessage: 'Recebemos sua documentação, muito obrigado! Vamos seguir com o cadastro da sua prévia.' },
  { id: 'documentacao-nao-enviada', stageKey: 'documentacao-nao-enviada', title: 'Não Enviou a Documentação', color: 'orange', ownerRole: 'SECRETARIA',
    description: 'Documentação pendente. Cobrar o envio com o candidato.',
    suggestedMessage: 'Notamos que ainda está pendente o envio da sua documentação. Pode nos enviar o quanto antes para seguirmos com seu processo?' },
  { id: 'previa-cadastrada', stageKey: 'previa-cadastrada', title: 'Prévia Cadastrada', color: 'yellow', ownerRole: 'SECRETARIA',
    description: 'Prévia cadastrada no sistema. Aguardar liberação do onboarding.',
    suggestedMessage: 'Sua prévia já foi cadastrada em nosso sistema! Em breve liberamos o acesso ao onboarding.' },
  { id: 'previa-retificada', stageKey: 'previa-retificada', title: 'Prévia Retificada', color: 'orange', ownerRole: 'SECRETARIA',
    description: 'Houve um problema na prévia cadastrada e ela precisa ser corrigida/recadastrada.',
    suggestedMessage: 'Identificamos um ajuste necessário na sua prévia. Estamos corrigindo e te atualizamos em breve.' },
  { id: 'onboarding-liberado', stageKey: 'onboarding-liberado', title: 'Onboarding Liberado', color: 'blue', ownerRole: 'SECRETARIA',
    description: 'Onboarding liberado para o candidato iniciar a trilha de integração.',
    suggestedMessage: 'Seu onboarding já está liberado! Você pode começar a trilha de integração pelo nosso sistema.' },
  { id: 'onboarding-finalizado', stageKey: 'onboarding-finalizado', title: 'Onboarding Finalizado', color: 'green', ownerRole: 'SECRETARIA',
    description: 'Onboarding concluído com sucesso. Seguir para agendamento da integração presencial.',
    suggestedMessage: 'Parabéns por concluir o onboarding! Agora vamos agendar sua integração presencial.' },
  { id: 'onboarding-nao-finalizado', stageKey: 'onboarding-nao-finalizado', title: 'Onboarding Não Finalizado', color: 'orange', ownerRole: 'SECRETARIA',
    description: 'Onboarding ainda não foi concluído. Fazer follow-up com o candidato.',
    suggestedMessage: 'Notamos que seu onboarding ainda não foi concluído. Precisa de alguma ajuda para finalizar?' },
  { id: 'integracao-agendada', stageKey: 'integracao-agendada', title: 'Integração Agendada', color: 'blue', ownerRole: 'SECRETARIA',
    description: 'Integração presencial agendada. Confirmar presença com o candidato.',
    suggestedMessage: 'Sua integração presencial está agendada! Vou te confirmar a data, horário e endereço.' },
  { id: 'integracao-nao-compareceu', stageKey: 'integracao-nao-compareceu', title: 'Não Compareceu à Integração', color: 'red', ownerRole: 'SECRETARIA',
    description: 'Candidato não compareceu à integração presencial.',
    suggestedMessage: 'Notei que você não pôde comparecer à integração. Vamos reagendar para outra data?' },
  { id: 'integracao-compareceu', stageKey: 'integracao-compareceu', title: 'Compareceu à Integração', color: 'purple', ownerRole: 'SECRETARIA',
    description: 'Candidato compareceu à integração presencial.',
    suggestedMessage: 'Foi ótimo te receber na integração! Seguimos agora para a finalização do processo.' },
  { id: 'integracao-finalizada', stageKey: 'integracao-finalizada', title: 'Integração Finalizada', color: 'green', ownerRole: 'SECRETARIA',
    description: 'Integração presencial concluída. Seguir para assinatura do contrato.',
    suggestedMessage: 'Sua integração foi concluída com sucesso! Agora vamos para a etapa de assinatura do contrato.' },
  { id: 'assinatura-contrato', stageKey: 'assinatura-contrato', title: 'Assinatura do Contrato', color: 'blue', ownerRole: 'GESTOR',
    description: 'Contrato enviado para assinatura do candidato.',
    suggestedMessage: 'Seu contrato já está disponível para assinatura. Pode revisar e assinar pelo link que vou te enviar.' },
  { id: 'contrato-assinado', stageKey: 'contrato-assinado', title: 'Contrato Assinado', color: 'green', ownerRole: 'GESTOR',
    description: 'Contrato assinado pelo candidato. Processo de contratação concluído.',
    suggestedMessage: 'Recebemos seu contrato assinado! Seja muito bem-vindo(a) à equipe.' },
  { id: 'contrato-nao-assinado', stageKey: 'contrato-nao-assinado', title: 'Contrato Não Assinado', color: 'red', ownerRole: 'GESTOR',
    description: 'Contrato ainda não foi assinado pelo candidato.',
    suggestedMessage: 'Notamos que o contrato ainda não foi assinado. Posso te ajudar com alguma dúvida sobre ele?' },
  { id: 'candidato-em-previa', stageKey: 'candidato-em-previa', title: 'Candidato em Prévia', color: 'yellow', ownerRole: 'SECRETARIA',
    description: 'Candidato na etapa final de acompanhamento de prévia.',
    suggestedMessage: 'Você está na etapa final do processo! Em breve finalizamos sua autorização.' },
  { id: 'autorizado', stageKey: 'autorizado', title: 'Autorizado', color: 'green', ownerRole: 'GESTOR',
    description: 'Candidato autorizado e ativo na equipe comercial.',
    suggestedMessage: 'Você está autorizado(a) e oficialmente ativo na equipe! Qualquer dúvida, estou à disposição.' },
];

const HIRING_STAGE_KEY_SET = new Set<HiringPipelineStageKey>(
  DEFAULT_HIRING_PIPELINE_COLUMNS.map((column) => column.stageKey),
);

export const getHiringStageLabel = (stageKey: HiringPipelineStageKey) => {
  return DEFAULT_HIRING_PIPELINE_COLUMNS.find((column) => column.stageKey === stageKey)?.title || 'Etapa';
};

export const isValidHiringPipelineStageKey = (value: unknown): value is HiringPipelineStageKey => {
  return typeof value === 'string' && HIRING_STAGE_KEY_SET.has(value as HiringPipelineStageKey);
};

export const getCandidateStageKey = (candidate: Candidate): HiringPipelineStageKey => {
  if (isValidHiringPipelineStageKey(candidate.pipelineStageKey)) {
    return candidate.pipelineStageKey;
  }

  // Fallback legado
  if (candidate.status === 'Faltou') return 'faltou-entrevista';
  if (candidate.status === 'Desqualificado' || candidate.status === 'Reprovado') return 'reprovado-gestor';
  if (candidate.status === 'Autorizado' || candidate.authorizedDate) return 'autorizado';
  if (candidate.contractSignedDate) return 'contrato-assinado';
  if (candidate.contractNotSignedDate) return 'contrato-nao-assinado';
  if (candidate.contractSignatureDate) return 'assinatura-contrato';
  if (candidate.integrationFinishedDate) return 'integracao-finalizada';
  if (candidate.integrationAttendedDate) return 'integracao-compareceu';
  if (candidate.integrationNoShowDate) return 'integracao-nao-compareceu';
  if (candidate.integrationScheduledDate || candidate.integrationPresencialDate) return 'integracao-agendada';
  if (candidate.onboardingFinishedDate) return 'onboarding-finalizado';
  if (candidate.onboardingNotFinishedDate) return 'onboarding-nao-finalizado';
  if (candidate.onboardingReleasedDate || candidate.onboardingOnlineDate) return 'onboarding-liberado';
  if (candidate.previewRectifiedDate) return 'previa-retificada';
  if (candidate.previewRegisteredDate) return 'previa-cadastrada';
  if (candidate.documentationNotSentDate) return 'documentacao-nao-enviada';
  if (candidate.documentationSentDate) return 'documentacao-enviada';
  if (candidate.d1ApprovalDate) return 'aprovacao-d1';
  if (candidate.managerApprovedDate) return 'aprovado-gestor';
  if (candidate.interviewNoShowDate || candidate.faltouDate) return 'faltou-entrevista';
  if (candidate.interviewAttendedDate || candidate.interviewConductedDate || candidate.interviewConducted) return 'compareceu-entrevista';
  if (candidate.interviewScheduledDate || candidate.status === 'Entrevista') return 'entrevista-agendada';
  if (candidate.respondedDate) return 'respondeu';
  if (candidate.contactedDate || candidate.screeningStatus === 'Contacted' || candidate.screeningStatus === 'No Response') return 'contatados';

  return DEFAULT_HIRING_PIPELINE_STAGE_KEY;
};

export const normalizeHiringPipelineColumns = (columns?: HiringPipelineColumn[]) => {
  if (!Array.isArray(columns) || columns.length === 0) {
    return DEFAULT_HIRING_PIPELINE_COLUMNS;
  }

  const validColumns = columns.filter((column): column is HiringPipelineColumn => isValidHiringPipelineStageKey(column?.stageKey));

  if (validColumns.length === 0) {
    return DEFAULT_HIRING_PIPELINE_COLUMNS;
  }

  const defaultsByKey = new Map(DEFAULT_HIRING_PIPELINE_COLUMNS.map((column) => [column.stageKey, column]));
  const normalized: HiringPipelineColumn[] = [];
  const usedKeys = new Set<HiringPipelineStageKey>();

  validColumns.forEach((column) => {
    const fallback = defaultsByKey.get(column.stageKey);
    if (!fallback || usedKeys.has(column.stageKey)) return;
    usedKeys.add(column.stageKey);
    normalized.push({
      ...fallback,
      id: column.id || fallback.id,
      title: column.title || fallback.title,
      color: column.color || fallback.color,
      ownerRole: column.ownerRole || fallback.ownerRole,
      description: column.description !== undefined ? column.description : fallback.description,
      suggestedMessage: column.suggestedMessage !== undefined ? column.suggestedMessage : fallback.suggestedMessage,
    });
  });

  DEFAULT_HIRING_PIPELINE_COLUMNS.forEach((column) => {
    if (usedKeys.has(column.stageKey)) return;
    normalized.push(column);
  });

  return normalized;
};

export const getLegacyStatusForStage = (stageKey: HiringPipelineStageKey): CandidateStatus => {
  switch (stageKey) {
    case 'candidatos':
    case 'contatados':
    case 'respondeu':
      return 'Triagem';
    case 'entrevista-agendada':
    case 'compareceu-entrevista':
      return 'Entrevista';
    case 'faltou-entrevista':
      return 'Faltou';
    case 'aprovado-gestor':
    case 'aprovacao-d1':
    case 'documentacao-enviada':
    case 'documentacao-nao-enviada':
    case 'previa-cadastrada':
    case 'previa-retificada':
    case 'candidato-em-previa':
      return 'Aguardando Prévia';
    case 'onboarding-liberado':
    case 'onboarding-finalizado':
    case 'onboarding-nao-finalizado':
      return 'Onboarding Online';
    case 'integracao-agendada':
    case 'integracao-nao-compareceu':
    case 'integracao-compareceu':
    case 'integracao-finalizada':
      return 'Integração Presencial';
    case 'assinatura-contrato':
    case 'contrato-assinado':
    case 'contrato-nao-assinado':
      return 'Integração Presencial';
    case 'autorizado':
      return 'Autorizado';
    case 'reprovado-gestor':
      return 'Desqualificado';
    default:
      return 'Triagem';
  }
};

export const buildCandidateStageUpdates = (
  candidate: Candidate,
  stageKey: HiringPipelineStageKey,
  reason?: string,
): Partial<Candidate> => {
  const now = new Date().toISOString();
  const status = getLegacyStatusForStage(stageKey);

  const updates: Partial<Candidate> = {
    pipelineStageKey: stageKey,
    status,
    lastUpdatedAt: now,
  };

  switch (stageKey) {
    case 'candidatos':
      updates.screeningStatus = 'Pending Contact';
      updates.interviewConducted = false;
      break;
    case 'contatados':
      updates.screeningStatus = 'Contacted';
      updates.contactedDate = candidate.contactedDate || now;
      break;
    case 'respondeu':
      updates.screeningStatus = 'Contacted';
      updates.contactedDate = candidate.contactedDate || now;
      updates.respondedDate = candidate.respondedDate || now;
      break;
    case 'entrevista-agendada':
      updates.interviewConducted = false;
      updates.interviewScheduledDate = candidate.interviewScheduledDate || now;
      break;
    case 'compareceu-entrevista':
      updates.interviewConducted = true;
      updates.interviewScheduledDate = candidate.interviewScheduledDate || now;
      updates.interviewConductedDate = candidate.interviewConductedDate || now;
      updates.interviewAttendedDate = candidate.interviewAttendedDate || now;
      break;
    case 'faltou-entrevista':
      updates.interviewConducted = false;
      updates.interviewNoShowDate = candidate.interviewNoShowDate || now;
      updates.faltouDate = candidate.faltouDate || now;
      break;
    case 'aprovado-gestor':
      updates.managerApprovedDate = candidate.managerApprovedDate || now;
      break;
    case 'reprovado-gestor':
      updates.managerRejectedDate = candidate.managerRejectedDate || now;
      updates.disqualifiedDate = candidate.disqualifiedDate || now;
      updates.withdrawalReason = reason || candidate.withdrawalReason;
      break;
    case 'aprovacao-d1':
      updates.d1ApprovalDate = candidate.d1ApprovalDate || now;
      break;
    case 'documentacao-enviada':
      updates.documentationSentDate = candidate.documentationSentDate || now;
      break;
    case 'documentacao-nao-enviada':
      updates.documentationNotSentDate = candidate.documentationNotSentDate || now;
      break;
    case 'previa-cadastrada':
      updates.previewRegisteredDate = candidate.previewRegisteredDate || now;
      break;
    case 'previa-retificada':
      updates.previewRectifiedDate = candidate.previewRectifiedDate || now;
      break;
    case 'onboarding-liberado':
      updates.onboardingReleasedDate = candidate.onboardingReleasedDate || now;
      updates.onboardingOnlineDate = candidate.onboardingOnlineDate || now;
      break;
    case 'onboarding-finalizado':
      updates.onboardingReleasedDate = candidate.onboardingReleasedDate || now;
      updates.onboardingFinishedDate = candidate.onboardingFinishedDate || now;
      updates.onboardingOnlineDate = candidate.onboardingOnlineDate || now;
      break;
    case 'onboarding-nao-finalizado':
      updates.onboardingReleasedDate = candidate.onboardingReleasedDate || now;
      updates.onboardingNotFinishedDate = candidate.onboardingNotFinishedDate || now;
      updates.onboardingOnlineDate = candidate.onboardingOnlineDate || now;
      break;
    case 'integracao-agendada':
      updates.integrationScheduledDate = candidate.integrationScheduledDate || now;
      updates.integrationPresencialDate = candidate.integrationPresencialDate || now;
      break;
    case 'integracao-nao-compareceu':
      updates.integrationNoShowDate = candidate.integrationNoShowDate || now;
      updates.integrationPresencialDate = candidate.integrationPresencialDate || now;
      break;
    case 'integracao-compareceu':
      updates.integrationAttendedDate = candidate.integrationAttendedDate || now;
      updates.integrationPresencialDate = candidate.integrationPresencialDate || now;
      break;
    case 'integracao-finalizada':
      updates.integrationFinishedDate = candidate.integrationFinishedDate || now;
      updates.integrationPresencialDate = candidate.integrationPresencialDate || now;
      break;
    case 'assinatura-contrato':
      updates.contractSignatureDate = candidate.contractSignatureDate || now;
      break;
    case 'contrato-assinado':
      updates.contractSignatureDate = candidate.contractSignatureDate || now;
      updates.contractSignedDate = candidate.contractSignedDate || now;
      break;
    case 'contrato-nao-assinado':
      updates.contractSignatureDate = candidate.contractSignatureDate || now;
      updates.contractNotSignedDate = candidate.contractNotSignedDate || now;
      break;
    case 'candidato-em-previa':
      updates.awaitingPreviewDate = candidate.awaitingPreviewDate || now;
      break;
    case 'autorizado':
      updates.authorizedDate = candidate.authorizedDate || now;
      break;
  }

  return updates;
};

export interface CandidateTimelineEvent {
  key: string;
  label: string;
  date?: string;
  isNegative?: boolean;
}

/**
 * Monta a lista cronológica de eventos de um candidato (somente os que têm data preenchida),
 * ordenada da mais antiga para a mais recente.
 */
export const buildCandidateTimeline = (candidate: Candidate): CandidateTimelineEvent[] => {
  const rawEvents: CandidateTimelineEvent[] = [
    { key: 'created', label: 'Cadastro do candidato', date: candidate.createdAt },
    { key: 'contacted', label: 'Contatado', date: candidate.contactedDate },
    { key: 'responded', label: 'Respondeu', date: candidate.respondedDate },
    { key: 'interviewScheduled', label: 'Entrevista agendada', date: candidate.interviewScheduledDate },
    { key: 'interviewAttended', label: 'Compareceu à entrevista', date: candidate.interviewAttendedDate || candidate.interviewConductedDate },
    { key: 'interviewNoShow', label: 'Faltou à entrevista', date: candidate.interviewNoShowDate || candidate.faltouDate, isNegative: true },
    { key: 'managerApproved', label: 'Aprovado pelo gestor', date: candidate.managerApprovedDate },
    { key: 'managerRejected', label: 'Reprovado pelo gestor', date: candidate.managerRejectedDate, isNegative: true },
    { key: 'd1Approval', label: 'Aprovação D+1', date: candidate.d1ApprovalDate },
    { key: 'docSent', label: 'Documentação enviada', date: candidate.documentationSentDate },
    { key: 'docNotSent', label: 'Documentação não enviada', date: candidate.documentationNotSentDate, isNegative: true },
    { key: 'previewRegistered', label: 'Prévia cadastrada', date: candidate.previewRegisteredDate },
    { key: 'previewRectified', label: 'Prévia retificada', date: candidate.previewRectifiedDate, isNegative: true },
    { key: 'onboardingReleased', label: 'Onboarding liberado', date: candidate.onboardingReleasedDate || candidate.onboardingOnlineDate },
    { key: 'onboardingFinished', label: 'Onboarding finalizado', date: candidate.onboardingFinishedDate },
    { key: 'onboardingNotFinished', label: 'Onboarding não finalizado', date: candidate.onboardingNotFinishedDate, isNegative: true },
    { key: 'integrationScheduled', label: 'Integração agendada', date: candidate.integrationScheduledDate || candidate.integrationPresencialDate },
    { key: 'integrationAttended', label: 'Compareceu à integração', date: candidate.integrationAttendedDate },
    { key: 'integrationNoShow', label: 'Não compareceu à integração', date: candidate.integrationNoShowDate, isNegative: true },
    { key: 'integrationFinished', label: 'Integração finalizada', date: candidate.integrationFinishedDate },
    { key: 'contractSignature', label: 'Contrato enviado para assinatura', date: candidate.contractSignatureDate },
    { key: 'contractSigned', label: 'Contrato assinado', date: candidate.contractSignedDate },
    { key: 'contractNotSigned', label: 'Contrato não assinado', date: candidate.contractNotSignedDate, isNegative: true },
    { key: 'awaitingPreview', label: 'Em prévia', date: candidate.awaitingPreviewDate },
    { key: 'authorized', label: 'Autorizado', date: candidate.authorizedDate },
    { key: 'reprovado', label: 'Desistência registrada', date: candidate.reprovadoDate, isNegative: true },
    { key: 'rescheduled', label: `Entrevista reagendada${(candidate.rescheduledCount || 0) > 1 ? ` (${candidate.rescheduledCount}x)` : ''}`, date: (candidate.rescheduledCount || 0) > 0 ? candidate.lastUpdatedAt : undefined },
  ];

  return rawEvents
    .filter((event) => !!event.date)
    .sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());
};