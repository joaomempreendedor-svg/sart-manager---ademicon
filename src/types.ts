export type CandidateStatus =
  | 'Entrevista'
  | 'Aguardando Prévia'
  | 'Onboarding Online'
  | 'Integração Presencial'
  | 'Acompanhamento 90 Dias'
  | 'Autorizado'
  | 'Reprovado';

export interface InterviewScores {
  basicProfile: number; // Max 20
  commercialSkills: number; // Max 30
  behavioralProfile: number; // Max 30
  jobFit: number; // Max 20
  notes: string;
  [key: string]: number | string; // Allow dynamic keys
}

export interface InterviewQuestion {
  id: string;
  text: string;
  points: number;
}

export interface InterviewSection {
  id: string; // e.g., 'basicProfile'
  title: string;
  maxPoints: number;
  questions: InterviewQuestion[];
}

export interface ChecklistTaskState {
  completed: boolean;
  dueDate?: string; // ISO Date YYYY-MM-DD
}

export interface Feedback {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  notes: string;
}

export interface Candidate {
  id: string; // Client-side UUID
  db_id?: string; // Database primary key
  name: string;
  phone: string;
  interviewDate: string;
  interviewer: string;
  origin: string; // Indicação, Prospecção, etc.
  status: CandidateStatus;
  interviewScores: InterviewScores;
  checkedQuestions?: Record<string, boolean>; // questionId -> boolean
  checklistProgress: Record<string, ChecklistTaskState>; // map of taskId -> state
  consultantGoalsProgress: Record<string, boolean>; // map of goalId -> completed
  feedbacks?: Feedback[];
  createdAt: string;
}

export interface ChecklistResource {
  type: 'pdf' | 'image' | 'link';
  name: string; // e.g. "Apostila de Vendas.pdf"
  url?: string; // URL to download or view (or base64 if overridden)
}

export interface CommunicationTemplate {
  id: string; // matches checklist item id
  label: string; // name of the step
  text?: string; // The message template
  resource?: ChecklistResource; // Associated file
}

export interface ChecklistItem {
  id: string;
  label: string;
  isHeader?: boolean;
  whatsappTemplate?: string; // Default Pre-filled message text
  resource?: ChecklistResource; // Default File to be sent/used
}

export interface ChecklistStage {
  id: string;
  title: string;
  description?: string;
  items: ChecklistItem[];
}

export interface GoalItem {
  id: string;
  label: string;
}

export interface GoalStage {
  id: string;
  title: string;
  objective: string;
  color: 'blue' | 'green' | 'orange' | 'brown';
  items: GoalItem[];
}

export type CommissionStatus = 'Em Andamento' | 'Atraso' | 'Concluído' | 'Cancelado';
export type InstallmentStatus = 'Pendente' | 'Pago' | 'Atraso' | 'Cancelado';

export interface InstallmentInfo {
  status: InstallmentStatus;
  paidDate?: string; // YYYY-MM-DD - Data real do pagamento
  competenceMonth?: string; // YYYY-MM - Mês que a comissão entra (calculado)
}

export interface CommissionRule {
  id: string;
  startInstallment: number;
  endInstallment: number;
  consultantRate: number;
  managerRate: number;
  angelRate: number;
}

export interface Commission {
  id: string; // Client-side UUID
  db_id?: string; // Database primary key
  date: string; // YYYY-MM-DD
  clientName: string;
  type: 'Imóvel' | 'Veículo';
  group: string;
  quota: string;
  consultant: string;
  managerName: string; // Nome do Gestor
  angelName?: string; // Nome do Anjo (Opcional)

  pv: string; // e.g. 'SOARES E MORAES'
  value: number; // Valor Vendido / Crédito Base

  // Financials
  taxRate: number; // Imposto % (Descontado da comissão final)
  netValue: number; // Total Líquido R$
  installments: number; // Número de Parcelas Total
  status: CommissionStatus;
  installmentDetails: Record<string, InstallmentInfo>; // e.g. { '1': { status: 'Pago', paidDate: '2024-01-15' } }

  // Split Values (Calculated per installment rules - Tax)
  consultantValue: number; // Valor para o consultor
  managerValue: number; // Valor para o gestor
  angelValue: number; // Valor para o anjo
  receivedValue: number; // Soma ou valor total da nota

  customRules?: CommissionRule[]; // Se presente, ignora cálculo padrão
  criado_em?: string; // Timestamp from Supabase
  _synced?: boolean;
}

export interface SupportMaterial {
  id: string; // Client-side UUID
  db_id?: string; // Database primary key
  title: string;
  category: string;
  type: 'pdf' | 'image';
  url: string; // URL from Supabase Storage
  fileName: string;
}

// NOVO: Material de Apoio para links/texto (Módulo 5)
export type SupportMaterialContentType = 'link' | 'text';

export interface SupportMaterialV2 {
  id: string; // Client-side UUID
  db_id?: string; // Database primary key
  user_id: string; // ID do gestor que criou
  title: string;
  description?: string;
  content_type: SupportMaterialContentType;
  content: string; // URL se for link, ou o próprio texto se for texto
  is_active: boolean;
  created_at: string;
}

export interface SupportMaterialAssignment {
  id: string;
  db_id?: string;
  material_id: string;
  consultant_id: string;
  created_at: string;
}


export interface ImportantLink {
  id: string; // Client-side UUID
  db_id?: string; // Database primary key
  title: string;
  url: string;
  description: string;
  category: string;
}

// TEAM MANAGEMENT
export type TeamRole = 'Prévia' | 'Autorizado' | 'Gestor' | 'Anjo';

export interface TeamMember {
  id: string; // Client-side UUID (pode ser auth.uid() ou legacy_db_id)
  db_id?: string; // Database primary key
  name: string;
  email?: string; // NOVO: Adicionado para o TIPO 2
  roles: TeamRole[];
  isActive: boolean;
  cpf?: string; // NOVO: CPF do membro da equipe (criptografado)
  feedbacks?: Feedback[];
  hasLogin?: boolean; // NOVO: Indica se o membro tem um login associado (TIPO 2)
  isLegacy?: boolean; // NOVO: Indica se é um membro do TIPO 1 (antigo)
  tempPassword?: string; // NOVO: Senha temporária gerada para o primeiro acesso
}

// AUTHENTICATION
export type UserRole = 'GESTOR' | 'CONSULTOR' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean; // Adicionado para controlar o acesso de consultores
  login?: string; // NOVO: Últimos 4 dígitos do CPF para login
  hasLogin?: boolean; // NOVO: Indica se o usuário tem um login associado (criado pelo gestor)
  needs_password_change?: boolean; // NOVO: Força a troca de senha no primeiro login
}

// NOVO: Interface para relatório
export interface CommissionReport {
  month: string; // YYYY-MM
  totalSold: number;
  totalCommissions: {
    consultant: number;
    manager: number;
    angel: number;
    total: number;
  };
  commissions: Commission[]; // Comissões daquele mês
}

export interface CutoffPeriod {
  id: string; // Client-side UUID
  db_id?: string; // Database primary key
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  competenceMonth: string; // YYYY-MM
}

// NOVOS TIPOS PARA ONBOARDING ONLINE
export interface OnboardingVideoTemplate {
  id: string;
  user_id: string;
  title: string;
  video_url: string;
  order: number;
  created_at: string;
}

export interface OnboardingVideo {
  id: string;
  session_id: string;
  title: string;
  video_url: string;
  order: number;
  is_completed: boolean;
}

export interface OnboardingSession {
  id: string;
  user_id: string;
  consultant_name: string;
  created_at: string;
  videos: OnboardingVideo[];
}

// --- NOVOS TIPOS PARA O CRM ---
export interface CrmPipeline {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface CrmStage {
  id: string;
  pipeline_id: string;
  user_id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
}

export interface CrmField {
  id: string;
  user_id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'longtext';
  is_required: boolean;
  is_active: boolean;
  options?: string[];
  created_at: string;
}

export interface CrmLead {
  id: string;
  consultant_id: string;
  stage_id: string;
  user_id: string; // ID do gestor que gerencia este lead
  name?: string; // Tornando 'name' opcional
  data: Record<string, any>; // Campos dinâmicos
  created_at: string;
  updated_at: string;
}

// NOVO: Tipo para tarefas de Lead
export interface LeadTask {
  id: string;
  db_id?: string;
  lead_id: string;
  user_id: string; // ID do consultor que criou a tarefa
  title: string;
  description?: string;
  due_date?: string; // YYYY-MM-DD
  is_completed: boolean;
  completed_at?: string; // TIMESTAMP WITH TIME ZONE
  created_at: string;
  type: 'task' | 'meeting'; // NOVO: Tipo da tarefa
  meeting_start_time?: string; // NOVO: Data e hora de início da reunião (ISO string)
  meeting_end_time?: string;   // NOVO: Data e hora de fim da reunião (ISO string)
  manager_id?: string; // NOVO: ID do gestor convidado
  manager_invitation_status?: 'pending' | 'accepted' | 'declined'; // NOVO: Status do convite
}

// NOVO: Tipos para Checklist do Dia (Módulo 3)
export interface DailyChecklist {
  id: string;
  db_id?: string;
  user_id: string; // ID do gestor
  title: string;
  is_active: boolean;
  created_at: string;
}

export interface DailyChecklistItem {
  id: string;
  db_id?: string;
  daily_checklist_id: string;
  text: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface DailyChecklistAssignment {
  id: string;
  db_id?: string;
  daily_checklist_id: string;
  consultant_id: string;
  created_at: string;
}

export interface DailyChecklistCompletion {
  id: string;
  db_id?: string;
  daily_checklist_item_id: string;
  consultant_id: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  updated_at: string;
}

// NOVO: Tipos para Metas de Prospecção (Módulo 4)
export interface WeeklyTarget {
  id: string;
  db_id?: string;
  user_id: string; // ID do gestor
  title: string;
  week_start: string; // YYYY-MM-DD
  week_end: string;   // YYYY-MM-DD
  is_active: boolean;
  created_at: string;
}

export interface WeeklyTargetItem {
  id: string;
  db_id?: string;
  weekly_target_id: string;
  metric_key: string; // Ex: 'whatsapp_msgs'
  label: string;
  target_value: number;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface WeeklyTargetAssignment {
  id: string;
  db_id?: string;
  weekly_target_id: string;
  consultant_id: string;
  created_at: string;
}

export interface MetricLog {
  id: string;
  db_id?: string;
  consultant_id: string;
  metric_key: string;
  date: string; // YYYY-MM-DD
  value: number;
  created_at: string;
}

// --- FIM DOS NOVOS TIPOS ---


export interface AppContextType {
  isDataLoading: boolean;
  candidates: Candidate[];
  templates: Record<string, CommunicationTemplate>;
  checklistStructure: ChecklistStage[];
  consultantGoalsStructure: GoalStage[];
  interviewStructure: InterviewSection[];
  commissions: Commission[];
  supportMaterials: SupportMaterial[]; // Existing file-based materials
  importantLinks: ImportantLink[];
  theme: 'light' | 'dark';
  origins: string[];
  interviewers: string[];
  pvs: string[];
  teamMembers: TeamMember[];
  cutoffPeriods: CutoffPeriod[];
  onboardingSessions: OnboardingSession[];
  onboardingTemplateVideos: OnboardingVideoTemplate[];
  // CRM State
  crmPipelines: CrmPipeline[];
  crmStages: CrmStage[];
  crmFields: CrmField[];
  crmLeads: CrmLead[]; // NOVO: Leads do CRM
  crmOwnerUserId: string | null; // NEW: ID of the user who owns the CRM configuration
  addCrmLead: (leadData: Omit<CrmLead, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<CrmLead>;
  updateCrmLead: (id: string, updates: Partial<CrmLead>) => Promise<void>;
  deleteCrmLead: (id: string) => Promise<void>;
  updateCrmLeadStage: (leadId: string, newStageId: string) => Promise<void>; // NOVO: Mover lead para nova etapa
  addCrmStage: (stageData: Omit<CrmStage, 'id' | 'user_id' | 'created_at'>) => Promise<CrmStage>;
  updateCrmStage: (id: string, updates: Partial<CrmStage>) => Promise<void>;
  updateCrmStageOrder: (stages: CrmStage[]) => Promise<void>;
  addCrmField: (fieldData: Omit<CrmField, 'id' | 'user_id' | 'created_at'>) => Promise<CrmField>;
  updateCrmField: (id: string, updates: Partial<CrmField>) => Promise<void>;
  // End CRM State
  addCutoffPeriod: (period: CutoffPeriod) => Promise<void>;
  updateCutoffPeriod: (id: string, updates: Partial<CutoffPeriod>) => Promise<void>;
  deleteCutoffPeriod: (id: string) => Promise<void>;
  addTeamMember: (member: Omit<TeamMember, 'id'> & { email?: string }) => Promise<{ success: boolean; member: TeamMember; tempPassword?: string; message: string; wasExistingUser?: boolean; }>;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<{ tempPassword?: string }>; // Updated return type
  deleteTeamMember: (id: string) => Promise<void>;
  addOrigin: (origin: string) => void;
  deleteOrigin: (origin: string) => void;
  addInterviewer: (interviewer: string) => void;
  deleteInterviewer: (interviewer: string) => void;
  addPV: (pv: string) => void;
  toggleTheme: () => void;
  addCandidate: (candidate: Candidate) => Promise<void>;
  updateCandidate: (id: string, updates: Partial<Candidate>) => Promise<void>;
  deleteCandidate: (id: string) => Promise<void>;
  toggleChecklistItem: (candidateId: string, itemId: string) => Promise<void>;
  toggleConsultantGoal: (candidateId: string, goalId: string) => Promise<void>;
  setChecklistDueDate: (candidateId: string, itemId: string, date: string) => Promise<void>;
  getCandidate: (id: string) => Candidate | undefined;
  saveTemplate: (id: string, template: Partial<CommunicationTemplate>) => void;
  addChecklistItem: (stageId: string, label: string) => void;
  updateChecklistItem: (stageId: string, itemId: string, label: string) => void;
  deleteChecklistItem: (stageId: string, itemId: string) => void;
  moveChecklistItem: (stageId: string, itemId: string, direction: 'up' | 'down') => void;
  resetChecklistToDefault: () => void;
  addGoalItem: (stageId: string, label: string) => void;
  updateGoalItem: (stageId: string, itemId: string, label: string) => void;
  deleteGoalItem: (stageId: string, itemId: string) => void;
  moveGoalItem: (stageId: string, itemId: string, direction: 'up' | 'down') => void;
  resetGoalsToDefault: () => void;
  updateInterviewSection: (sectionId: string, updates: Partial<InterviewSection>) => void;
  addInterviewQuestion: (sectionId: string, text: string, points: number) => void;
  updateInterviewQuestion: (sectionId: string, questionId: string, updates: Partial<InterviewQuestion>) => void;
  deleteInterviewQuestion: (sectionId: string, questionId: string) => void;
  moveInterviewQuestion: (sectionId: string, questionId: string, direction: 'up' | 'down') => void;
  resetInterviewToDefault: () => void;
  addCommission: (commission: Commission) => Promise<Commission>;
  updateCommission: (id: string, updates: Partial<Commission>) => Promise<void>;
  deleteCommission: (id: string) => Promise<void>;
  updateInstallmentStatus: (commissionId: string, installmentNumber: number, status: InstallmentStatus, paidDate?: string, saleType?: 'Imóvel' | 'Veículo') => Promise<void>;
  addSupportMaterial: (material: Omit<SupportMaterial, 'id' | 'url'>, file: File) => Promise<void>;
  deleteSupportMaterial: (id: string) => Promise<void>;
  addImportantLink: (link: ImportantLink) => Promise<void>;
  updateImportantLink: (id: string, updates: Partial<ImportantLink>) => Promise<void>;
  deleteImportantLink: (id: string) => Promise<void>;
  addFeedback: (candidateId: string, feedback: Omit<Feedback, 'id'>) => Promise<void>;
  updateFeedback: (candidateId: string, feedback: Feedback) => Promise<void>;
  deleteFeedback: (candidateId: string, feedbackId: string) => Promise<void>;
  addTeamMemberFeedback: (memberId: string, feedback: Omit<Feedback, 'id'>) => Promise<void>;
  updateTeamMemberFeedback: (memberId: string, feedback: Feedback) => Promise<void>;
  deleteTeamMemberFeedback: (memberId: string, feedbackId: string) => Promise<void>;
  // Novas funções para onboarding
  addOnlineOnboardingSession: (consultantName: string) => Promise<OnboardingSession | null>;
  deleteOnlineOnboardingSession: (sessionId: string) => Promise<void>;
  addVideoToTemplate: (title: string, url: string) => Promise<void>;
  deleteVideoFromTemplate: (videoId: string) => Promise<void>;

  // NOVO: Estado e funções para Checklist do Dia (Módulo 3)
  dailyChecklists: DailyChecklist[];
  dailyChecklistItems: DailyChecklistItem[];
  dailyChecklistAssignments: DailyChecklistAssignment[];
  dailyChecklistCompletions: DailyChecklistCompletion[];
  addDailyChecklist: (title: string) => Promise<DailyChecklist>;
  updateDailyChecklist: (id: string, updates: Partial<DailyChecklist>) => Promise<void>;
  deleteDailyChecklist: (id: string) => Promise<void>;
  addDailyChecklistItem: (checklistId: string, text: string, order_index: number) => Promise<DailyChecklistItem>;
  updateDailyChecklistItem: (id: string, updates: Partial<DailyChecklistItem>) => Promise<void>;
  deleteDailyChecklistItem: (id: string) => Promise<void>;
  moveDailyChecklistItem: (checklistId: string, itemId: string, direction: 'up' | 'down') => Promise<void>;
  assignDailyChecklistToConsultant: (checklistId: string, consultantId: string) => Promise<void>;
  unassignDailyChecklistFromConsultant: (checklistId: string, consultantId: string) => Promise<void>;
  toggleDailyChecklistCompletion: (itemId: string, date: string, done: boolean, consultantId: string) => Promise<void>;

  // NOVO: Estado e funções para Metas de Prospecção (Módulo 4)
  weeklyTargets: WeeklyTarget[];
  weeklyTargetItems: WeeklyTargetItem[];
  weeklyTargetAssignments: WeeklyTargetAssignment[];
  metricLogs: MetricLog[];
  addWeeklyTarget: (title: string, week_start: string, week_end: string) => Promise<WeeklyTarget>;
  updateWeeklyTarget: (id: string, updates: Partial<WeeklyTarget>) => Promise<void>;
  deleteWeeklyTarget: (id: string) => Promise<void>;
  addWeeklyTargetItem: (targetId: string, metric_key: string, label: string, target_value: number, order_index: number) => Promise<WeeklyTargetItem>;
  updateWeeklyTargetItem: (id: string, updates: Partial<WeeklyTargetItem>) => Promise<void>;
  deleteWeeklyTargetItem: (id: string) => Promise<void>;
  moveWeeklyTargetItem: (targetId: string, itemId: string, direction: 'up' | 'down') => Promise<void>;
  assignWeeklyTargetToConsultant: (targetId: string, consultantId: string) => Promise<void>;
  unassignWeeklyTargetFromConsultant: (targetId: string, consultantId: string) => Promise<void>;
  addMetricLog: (metric_key: string, value: number, date: string) => Promise<MetricLog>;

  // NOVO: Estado e funções para Materiais de Apoio (v2)
  supportMaterialsV2: SupportMaterialV2[];
  supportMaterialAssignments: SupportMaterialAssignment[];
  addSupportMaterialV2: (material: Omit<SupportMaterialV2, 'id' | 'user_id' | 'created_at'>) => Promise<SupportMaterialV2>;
  updateSupportMaterialV2: (id: string, updates: Partial<SupportMaterialV2>) => Promise<void>;
  deleteSupportMaterialV2: (id: string) => Promise<void>;
  assignSupportMaterialToConsultant: (materialId: string, consultantId: string) => Promise<void>;
  unassignSupportMaterialFromConsultant: (materialId: string, consultantId: string) => Promise<void>;
  leadTasks: LeadTask[]; // NOVO: Adicionado para tarefas de Lead
  addLeadTask: (task: Omit<LeadTask, 'id' | 'user_id' | 'created_at'>) => Promise<LeadTask>;
  updateLeadTask: (id: string, updates: Partial<LeadTask>) => Promise<void>;
  deleteLeadTask: (id: string) => Promise<void>;
  toggleLeadTaskCompletion: (id: string, is_completed: boolean) => Promise<void>;
  updateLeadMeetingInvitationStatus: (taskId: string, status: 'pending' | 'accepted' | 'declined') => Promise<void>; // NOVO: Atualizar status do convite
}