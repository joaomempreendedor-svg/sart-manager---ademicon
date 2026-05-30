import { Candidate, CandidateStatus, HiringPipelineColumn, HiringPipelineStageKey } from '@/types';

export const DEFAULT_HIRING_PIPELINE_STAGE_KEY: HiringPipelineStageKey = 'candidatos';

export const DEFAULT_HIRING_PIPELINE_COLUMNS: HiringPipelineColumn[] = [
  { id: 'candidatos', stageKey: 'candidatos', title: 'Candidatos', color: 'gray', ownerRole: 'SECRETARIA' },
  { id: 'contatados', stageKey: 'contatados', title: 'Contatados', color: 'blue', ownerRole: 'SECRETARIA' },
  { id: 'respondeu', stageKey: 'respondeu', title: 'Respondeu', color: 'green', ownerRole: 'SECRETARIA' },
  { id: 'entrevista-agendada', stageKey: 'entrevista-agendada', title: 'Entrevista Agendada', color: 'blue', ownerRole: 'SECRETARIA' },
  { id: 'compareceu-entrevista', stageKey: 'compareceu-entrevista', title: 'Compareceu na Entrevista', color: 'purple', ownerRole: 'GESTOR' },
  { id: 'faltou-entrevista', stageKey: 'faltou-entrevista', title: 'Faltou na Entrevista', color: 'red', ownerRole: 'SECRETARIA' },
  { id: 'aprovado-gestor', stageKey: 'aprovado-gestor', title: 'Aprovado pelo Gestor', color: 'green', ownerRole: 'GESTOR' },
  { id: 'reprovado-gestor', stageKey: 'reprovado-gestor', title: 'Reprovado pelo Gestor', color: 'red', ownerRole: 'GESTOR' },
  { id: 'aprovacao-d1', stageKey: 'aprovacao-d1', title: 'Aprovação D+1', color: 'yellow', ownerRole: 'SECRETARIA' },
  { id: 'documentacao-enviada', stageKey: 'documentacao-enviada', title: 'Enviou a Documentação', color: 'green', ownerRole: 'SECRETARIA' },
  { id: 'documentacao-nao-enviada', stageKey: 'documentacao-nao-enviada', title: 'Não Enviou a Documentação', color: 'orange', ownerRole: 'SECRETARIA' },
  { id: 'previa-cadastrada', stageKey: 'previa-cadastrada', title: 'Prévia Cadastrada', color: 'yellow', ownerRole: 'SECRETARIA' },
  { id: 'onboarding-liberado', stageKey: 'onboarding-liberado', title: 'Onboarding Liberado', color: 'blue', ownerRole: 'SECRETARIA' },
  { id: 'onboarding-finalizado', stageKey: 'onboarding-finalizado', title: 'Onboarding Finalizado', color: 'green', ownerRole: 'SECRETARIA' },
  { id: 'onboarding-nao-finalizado', stageKey: 'onboarding-nao-finalizado', title: 'Onboarding Não Finalizado', color: 'orange', ownerRole: 'SECRETARIA' },
  { id: 'integracao-agendada', stageKey: 'integracao-agendada', title: 'Integração Agendada', color: 'blue', ownerRole: 'SECRETARIA' },
  { id: 'integracao-nao-compareceu', stageKey: 'integracao-nao-compareceu', title: 'Não Compareceu à Integração', color: 'red', ownerRole: 'SECRETARIA' },
  { id: 'integracao-compareceu', stageKey: 'integracao-compareceu', title: 'Compareceu à Integração', color: 'purple', ownerRole: 'SECRETARIA' },
  { id: 'integracao-finalizada', stageKey: 'integracao-finalizada', title: 'Integração Finalizada', color: 'green', ownerRole: 'SECRETARIA' },
  { id: 'candidato-em-previa', stageKey: 'candidato-em-previa', title: 'Candidato em Prévia', color: 'yellow', ownerRole: 'SECRETARIA' },
  { id: 'autorizado', stageKey: 'autorizado', title: 'Autorizado', color: 'green', ownerRole: 'GESTOR' },
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

  if (candidate.status === 'Faltou') return 'faltou-entrevista';
  if (candidate.status === 'Desqualificado' || candidate.status === 'Reprovado') return 'reprovado-gestor';
  if (candidate.status === 'Autorizado' || candidate.authorizedDate) return 'autorizado';
  if (candidate.integrationFinishedDate) return 'integracao-finalizada';
  if (candidate.integrationAttendedDate) return 'integracao-compareceu';
  if (candidate.integrationNoShowDate) return 'integracao-nao-compareceu';
  if (candidate.integrationScheduledDate || candidate.integrationPresencialDate) return 'integracao-agendada';
  if (candidate.onboardingFinishedDate) return 'onboarding-finalizado';
  if (candidate.onboardingNotFinishedDate) return 'onboarding-nao-finalizado';
  if (candidate.onboardingReleasedDate || candidate.onboardingOnlineDate) return 'onboarding-liberado';
  if (candidate.status === 'Aguardando Prévia') return 'candidato-em-previa';
  if (candidate.previewRegisteredDate) return 'previa-cadastrada';
  if (candidate.documentationNotSentDate) return 'documentacao-nao-enviada';
  if (candidate.documentationSentDate) return 'documentacao-enviada';
  if (candidate.d1ApprovalDate) return 'aprovacao-d1';
  if (candidate.managerApprovedDate || candidate.awaitingPreviewDate) return 'aprovado-gestor';
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
      updates.awaitingPreviewDate = candidate.awaitingPreviewDate || now;
      break;
    case 'reprovado-gestor':
      updates.managerRejectedDate = candidate.managerRejectedDate || now;
      updates.disqualifiedDate = candidate.disqualifiedDate || now;
      updates.withdrawalReason = reason || candidate.withdrawalReason;
      break;
    case 'aprovacao-d1':
      updates.d1ApprovalDate = candidate.d1ApprovalDate || now;
      updates.awaitingPreviewDate = candidate.awaitingPreviewDate || now;
      break;
    case 'documentacao-enviada':
      updates.documentationSentDate = candidate.documentationSentDate || now;
      updates.awaitingPreviewDate = candidate.awaitingPreviewDate || now;
      break;
    case 'documentacao-nao-enviada':
      updates.documentationNotSentDate = candidate.documentationNotSentDate || now;
      updates.awaitingPreviewDate = candidate.awaitingPreviewDate || now;
      break;
    case 'previa-cadastrada':
      updates.previewRegisteredDate = candidate.previewRegisteredDate || now;
      updates.awaitingPreviewDate = candidate.awaitingPreviewDate || now;
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
    case 'candidato-em-previa':
      updates.awaitingPreviewDate = candidate.awaitingPreviewDate || now;
      break;
    case 'autorizado':
      updates.authorizedDate = candidate.authorizedDate || now;
      break;
  }

  return updates;
};
