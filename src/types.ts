export type CandidateStatus =
  | 'Entrevista'
  | 'Aguardando Prévia'
  | 'Onboarding Online'
  | 'Integração Presencial'
  | 'Acompanhamento 90 Dias'
  | 'Autorizado'
  | 'Reprovado'
  | 'Triagem'; // NOVO: Status para a fase inicial de triagem

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
  email?: string; // NOVO: Adicionado email para triagem
  interviewDate: string;
  interviewer: string;
  origin?: string; // Indicação, Prospecção, etc. - REVERTIDO
  status: CandidateStatus;
  screeningStatus?: 'Pending Contact' | 'Contacted' | 'No Fit'; // NOVO: Status de triagem
  interviewScores: InterviewScores;
  checkedQuestions?: Record<string, boolean>; // questionId -> boolean
  checklistProgress: Record<string, ChecklistTaskState>; // map of taskId -> state
  consultantGoalsProgress: Record<string, boolean>; // map of goalId -> completed
  feedbacks?: Feedback[];
  createdAt: string;
  lastUpdatedAt?: string; // NOVO: Adicionado para controle de atualização
  responsibleUserId?: string; // NOVO: ID do gestor/anjo responsável pelo candidato
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
export type SupportMaterialContentType = 'link' | 'text' | 'image' | 'pdf'; // Updated to include image/pdf

export interface SupportMaterialV2 {
  id: string;
  db_id?: string; // Database primary key
  user_id: string; // ID do gestor que criou
  title: string;
  description?: string;
  category?: string; // NEW: Added category field
  content_type: SupportMaterialContentType;
  content: string; // URL se for link/arquivo, ou o próprio texto se for texto
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


// export interface ImportantLink { // REMOVIDO
//   id: string; // Client-side UUID
//   db_id?: string; // Database primary key
//   title: string;
//   url: string; // URL from Supabase Storage
//   description: string;
//   category: string;
// }

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
  dateOfBirth?: string; // NOVO: Data de nascimento (YYYY-MM-DD)
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
  consultant_id: string | null; // ⚠️ CORREÇÃO: Pode ser null
  stage_id: string;
  user_id: string; // ID do gestor que gerencia este lead
  name?: string; // Tornando 'name' opcional
  data: Record<string, any>; // Campos dinâmicos
  proposalValue?: number; // NOVO: Valor da proposta
  proposalClosingDate?: string; // NOVO: Data de fechamento da proposta (YYYY-MM-DD)
  
  // NOVO: Campos para venda finalizada
  soldCreditValue?: number; // Valor do crédito vendido
  soldGroup?: string;       // Grupo da venda
  soldQuota?: string;       // Cota da venda
  saleDate?: string;        // Data da venda (YYYY-MM-DD)

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
  manager_id?: string; // NOVO: ID do gestor convidado para a reunião
  manager_invitation_status?: 'pending' | 'accepted' | 'declined'; // NOVO: Status do convite
}

// NOVO: Tipo para tarefas pessoais do Gestor
export interface GestorTask {
  id: string;
  user_id: string; // ID do gestor que criou a tarefa
  title: string;
  description?: string;
  due_date?: string; // YYYY-MM-DD
  is_completed: boolean;
  // is_recurring?: boolean; // REMOVIDO: Substituído por recurrence_pattern
  created_at: string;
  recurrence_pattern?: { // NOVO: Padrão de recorrência
    type: 'none' | 'daily' | 'every_x_days';
    interval?: number; // Usado para 'every_x_days'
  };
}

// NOVO: Tipo para conclusões de tarefas recorrentes do Gestor
export interface GestorTaskCompletion {
  id: string;
  gestor_task_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  updated_at: string;
}

// NOVO: Tipo para eventos pessoais do Consultor
export interface ConsultantEvent {
  id: string;
  user_id: string; // ID do consultor que criou o evento
  title: string;
  description?: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  event_type: 'personal_task' | 'training' | 'other';
  created_at: string;
}

// NOVO: Tipos para Daily Checklist Item Resource
export type DailyChecklistItemResourceType = 'link' | 'text' | 'image' | 'pdf' | 'video' | 'audio' | 'text_audio' | 'none'; // Adicionado 'text_audio'

export interface DailyChecklistItemResource {
  type: DailyChecklistItemResourceType;
  content: string | { text: string; audioUrl: string; }; // 'content' pode ser string ou objeto para 'text_audio'
  name?: string; // Nome do arquivo, se aplicável
}

// NOVO: Tipo para Entradas e Saídas Financeiras
export interface FinancialEntry {
  id: string;
  db_id?: string; // ID do banco de dados
  user_id: string; // ID do usuário (gestor) que criou a entrada
  entry_date: string; // YYYY-MM-DD
  type: 'income' | 'expense';
  description?: string;
  amount: number;
  created_at: string;
}

// NOVO: Tipos para Cadastros de Formulário Público
export interface FormCadastro {
  id: string;
  user_id: string; // ID do gestor que gerencia este formulário
  submission_date: string; // TIMESTAMP WITH TIME ZONE
  data: Record<string, any>; // Dados do formulário
  internal_notes?: string;
  is_complete: boolean; // Se todos os documentos foram enviados/verificados
}

export interface FormFile {
  id: string;
  submission_id: string;
  field_name: string; // Nome do campo do formulário (ex: 'documento_identificacao')
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

// NOVO: Tipos para Notificações
export type NotificationType = 'birthday' | 'form_submission' | 'new_sale' | 'onboarding_complete';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  link?: string; // Link para a página relevante
  isRead: boolean; // Para controle futuro de "lido"
}

export interface AppContextType {
  isDataLoading: boolean;
  candidates: Candidate[];
  teamMembers: TeamMember[];
  commissions: Commission[];
  supportMaterials: SupportMaterial[];
  cutoffPeriods: CutoffPeriod[];
  onboardingSessions: OnboardingSession[];
  onboardingTemplateVideos: OnboardingVideoTemplate[];
  checklistStructure: ChecklistStage[];
  setChecklistStructure: React.Dispatch<React.SetStateAction<ChecklistStage[]>>;
  consultantGoalsStructure: GoalStage[];
  interviewStructure: InterviewSection[];
  templates: Record<string, CommunicationTemplate>;
  hiringOrigins: string[];
  salesOrigins: string[];
  interviewers: string[];
  pvs: string[];
  crmPipelines: CrmPipeline[];
  crmStages: CrmStage[];
  crmFields: CrmField[];
  crmLeads: CrmLead[];
  crmOwnerUserId: string | null;
  dailyChecklists: DailyChecklist[];
  dailyChecklistItems: DailyChecklistItem[];
  dailyChecklistAssignments: DailyChecklistAssignment[];
  dailyChecklistCompletions: DailyChecklistCompletion[];
  weeklyTargets: WeeklyTarget[];
  weeklyTargetItems: WeeklyTargetItem[];
  weeklyTargetAssignments: WeeklyTargetAssignment[];
  metricLogs: MetricLog[];
  supportMaterialsV2: SupportMaterialV2[];
  supportMaterialAssignments: SupportMaterialAssignment[];
  leadTasks: LeadTask[];
  gestorTasks: GestorTask[];
  gestorTaskCompletions: GestorTaskCompletion[];
  financialEntries: FinancialEntry[];
  formCadastros: FormCadastro[];
  formFiles: FormFile[];
  notifications: Notification[];
  consultantEvents: ConsultantEvent[]; // NOVO: Estado para eventos do consultor
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  addCandidate: (candidate: Omit<Candidate, 'id' | 'createdAt' | 'db_id'>) => Promise<Candidate>;
  getCandidate: (id: string) => Candidate | undefined;
  updateCandidate: (id: string, updates: Partial<Candidate>) => Promise<void>;
  deleteCandidate: (id: string) => Promise<void>;
  toggleChecklistItem: (candidateId: string, itemId: string) => Promise<void>;
  setChecklistDueDate: (candidateId: string, itemId: string, dueDate: string) => Promise<void>;
  toggleConsultantGoal: (candidateId: string, goalId: string) => Promise<void>;
  addChecklistItem: (stageId: string, label: string) => void;
  updateChecklistItem: (stageId: string, itemId: string, newLabel: string) => void;
  deleteChecklistItem: (stageId: string, itemId: string) => void;
  moveChecklistItem: (stageId: string, itemId: string, direction: 'up' | 'down') => void;
  resetChecklistToDefault: () => void;
  addGoalItem: (stageId: string, label: string) => void;
  updateGoalItem: (stageId: string, itemId: string, newLabel: string) => void;
  deleteGoalItem: (stageId: string, itemId: string) => void;
  moveGoalItem: (stageId: string, itemId: string, direction: 'up' | 'down') => void;
  resetGoalsToDefault: () => void;
  updateInterviewSection: (sectionId: string, updates: Partial<InterviewSection>) => void;
  addInterviewQuestion: (sectionId: string, text: string, points: number) => void;
  updateInterviewQuestion: (sectionId: string, questionId: string, updates: Partial<InterviewQuestion>) => void;
  deleteInterviewQuestion: (sectionId: string, questionId: string) => void;
  moveInterviewQuestion: (sectionId: string, questionId: string, direction: 'up' | 'down') => void;
  resetInterviewToDefault: () => void;
  saveTemplate: (itemId: string, updates: Partial<CommunicationTemplate>) => void;
  addOrigin: (newOrigin: string, type: 'sales' | 'hiring') => void;
  deleteOrigin: (originToDelete: string, type: 'sales' | 'hiring') => void;
  resetOriginsToDefault: () => void;
  addPV: (newPV: string) => void;
  addCommission: (commission: Omit<Commission, 'id' | 'db_id' | 'criado_em'>) => Promise<{ success: boolean }>;
  updateCommission: (id: string, updates: Partial<Commission>) => Promise<void>;
  deleteCommission: (id: string) => Promise<void>;
  updateInstallmentStatus: (commissionId: string, installmentNumber: number, newStatus: InstallmentStatus, paidDate?: string, saleType?: 'Imóvel' | 'Veículo') => Promise<void>;
  addCutoffPeriod: (period: Omit<CutoffPeriod, 'id' | 'db_id'>) => Promise<void>;
  updateCutoffPeriod: (id: string, updates: Partial<CutoffPeriod>) => Promise<void>;
  deleteCutoffPeriod: (id: string) => Promise<void>;
  addOnlineOnboardingSession: (consultantName: string) => Promise<void>;
  deleteOnlineOnboardingSession: (sessionId: string) => Promise<void>;
  addVideoToTemplate: (title: string, video_url: string) => Promise<void>;
  deleteVideoFromTemplate: (videoId: string) => Promise<void>;
  addCrmPipeline: (name: string) => Promise<CrmPipeline>;
  updateCrmPipeline: (id: string, updates: Partial<CrmPipeline>) => Promise<CrmPipeline>;
  deleteCrmPipeline: (id: string) => Promise<void>;
  addCrmStage: (stage: Omit<CrmStage, 'id' | 'user_id' | 'created_at'>) => Promise<CrmStage>;
  updateCrmStage: (id: string, updates: Partial<CrmStage>) => Promise<CrmStage>;
  updateCrmStageOrder: (orderedStages: CrmStage[]) => Promise<void>;
  deleteCrmStage: (id: string) => Promise<void>;
  addCrmField: (field: Omit<CrmField, 'id' | 'user_id' | 'created_at'>) => Promise<CrmField>;
  updateCrmField: (id: string, updates: Partial<CrmField>) => Promise<CrmField>;
  addCrmLead: (lead: Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by' | 'updated_by'>) => Promise<CrmLead>;
  updateCrmLead: (id: string, updates: Partial<CrmLead>) => Promise<CrmLead>;
  updateCrmLeadStage: (leadId: string, newStageId: string) => Promise<void>;
  deleteCrmLead: (id: string) => Promise<void>;
  addDailyChecklist: (title: string) => Promise<DailyChecklist>;
  updateDailyChecklist: (id: string, updates: Partial<DailyChecklist>) => Promise<DailyChecklist>;
  deleteDailyChecklist: (id: string) => Promise<void>;
  addDailyChecklistItem: (daily_checklist_id: string, text: string, order_index: number, resource?: DailyChecklistItemResource, file?: File) => Promise<DailyChecklistItem>;
  updateDailyChecklistItem: (id: string, updates: Partial<DailyChecklistItem>, file?: File) => Promise<DailyChecklistItem>;
  deleteDailyChecklistItem: (id: string) => Promise<void>;
  moveDailyChecklistItem: (checklistId: string, itemId: string, direction: 'up' | 'down') => Promise<void>;
  assignDailyChecklistToConsultant: (daily_checklist_id: string, consultant_id: string) => Promise<DailyChecklistAssignment>;
  unassignDailyChecklistFromConsultant: (daily_checklist_id: string, consultant_id: string) => Promise<void>;
  toggleDailyChecklistCompletion: (daily_checklist_item_id: string, date: string, done: boolean, consultant_id: string) => Promise<void>;
  addWeeklyTarget: (target: Omit<WeeklyTarget, 'id' | 'user_id' | 'created_at'>) => Promise<WeeklyTarget>;
  updateWeeklyTarget: (id: string, updates: Partial<WeeklyTarget>) => Promise<WeeklyTarget>;
  deleteWeeklyTarget: (id: string) => Promise<void>;
  addWeeklyTargetItem: (item: Omit<WeeklyTargetItem, 'id' | 'created_at'>) => Promise<WeeklyTargetItem>;
  updateWeeklyTargetItem: (id: string, updates: Partial<WeeklyTargetItem>) => Promise<WeeklyTargetItem>;
  deleteWeeklyTargetItem: (id: string) => Promise<void>;
  updateWeeklyTargetItemOrder: (orderedItems: WeeklyTargetItem[]) => Promise<void>;
  assignWeeklyTargetToConsultant: (weekly_target_id: string, consultant_id: string) => Promise<WeeklyTargetAssignment>;
  unassignWeeklyTargetFromConsultant: (weekly_target_id: string, consultant_id: string) => Promise<void>;
  addMetricLog: (log: Omit<MetricLog, 'id' | 'created_at'>) => Promise<MetricLog>;
  updateMetricLog: (id: string, updates: Partial<MetricLog>) => Promise<MetricLog>;
  deleteMetricLog: (id: string) => Promise<void>;
  addSupportMaterialV2: (material: Omit<SupportMaterialV2, 'id' | 'user_id' | 'created_at'>, file?: File) => Promise<SupportMaterialV2>;
  updateSupportMaterialV2: (id: string, updates: Partial<SupportMaterialV2>, file?: File) => Promise<SupportMaterialV2>;
  deleteSupportMaterialV2: (id: string) => Promise<void>;
  assignSupportMaterialToConsultant: (material_id: string, consultant_id: string) => Promise<SupportMaterialAssignment>;
  unassignSupportMaterialFromConsultant: (material_id: string, consultant_id: string) => Promise<void>;
  addLeadTask: (task: Omit<LeadTask, 'id' | 'created_at' | 'completed_at' | 'updated_at'> & { user_id: string; manager_id?: string | null; }) => Promise<LeadTask>;
  updateLeadTask: (id: string, updates: Partial<LeadTask> & { user_id?: string; manager_id?: string | null; }) => Promise<LeadTask>;
  deleteLeadTask: (id: string) => Promise<void>;
  toggleLeadTaskCompletion: (id: string, is_completed: boolean) => Promise<LeadTask>;
  updateLeadMeetingInvitationStatus: (taskId: string, status: 'accepted' | 'declined') => Promise<LeadTask>;
  addGestorTask: (task: Omit<GestorTask, 'id' | 'user_id' | 'created_at' | 'is_completed'>) => Promise<GestorTask>;
  updateGestorTask: (id: string, updates: Partial<GestorTask>) => Promise<GestorTask>;
  deleteGestorTask: (id: string) => Promise<void>;
  toggleGestorTaskCompletion: (gestor_task_id: string, done: boolean, date: string) => Promise<void>;
  isGestorTaskDueOnDate: (task: GestorTask, checkDate: string) => boolean;
  addFinancialEntry: (entry: Omit<FinancialEntry, 'id' | 'user_id' | 'created_at'>) => Promise<FinancialEntry>;
  updateFinancialEntry: (id: string, updates: Partial<FinancialEntry>) => Promise<FinancialEntry>;
  deleteFinancialEntry: (id: string) => Promise<void>;
  getFormFilesForSubmission: (submissionId: string) => FormFile[];
  updateFormCadastro: (id: string, updates: Partial<FormCadastro>) => Promise<FormCadastro>;
  deleteFormCadastro: (id: string) => Promise<void>;
  addFeedback: (personId: string, feedback: Omit<Feedback, 'id'>) => Promise<Feedback>;
  updateFeedback: (personId: string, feedback: Feedback) => Promise<Feedback>;
  deleteFeedback: (personId: string, feedbackId: string) => Promise<void>;
  addTeamMemberFeedback: (teamMemberId: string, feedback: Omit<Feedback, 'id'>) => Promise<Feedback>;
  updateTeamMemberFeedback: (teamMemberId: string, feedback: Feedback) => Promise<Feedback>;
  deleteTeamMemberFeedback: (teamMemberId: string, feedbackId: string) => Promise<void>;
  refetchCommissions: () => Promise<void>;
  addTeamMember: (member: Omit<TeamMember, 'id'> & { email: string }) => Promise<{ success: boolean; member: TeamMember; tempPassword: string; wasExistingUser: boolean; }>;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<{ success: boolean }>;
  deleteTeamMember: (id: string) => Promise<void>;
  addConsultantEvent: (event: Omit<ConsultantEvent, 'id' | 'user_id' | 'created_at'>) => Promise<ConsultantEvent>; // NOVO: Função para adicionar evento do consultor
  updateConsultantEvent: (id: string, updates: Partial<ConsultantEvent>) => Promise<ConsultantEvent>; // NOVO: Função para atualizar evento do consultor
  deleteConsultantEvent: (id: string) => Promise<void>; // NOVO: Função para deletar evento do consultor
}

// --- FIM DOS NOVOS TIPOS ---