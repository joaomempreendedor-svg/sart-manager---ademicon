export type CandidateStatus =
  | 'Entrevista'
  | 'Aguardando Prévia'
  | 'Onboarding Online'
  | 'Integração Presencial'
  | 'Acompanhamento 90 Dias'
  | 'Autorizado'
  | 'Reprovado'
  | 'Triagem'
  | 'Desqualificado'
  | 'Faltou';

export interface InterviewScores {
  basicProfile: number;
  commercialSkills: number;
  behavioralProfile: number;
  jobFit: number;
  notes: string;
  [key: string]: number | string;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  points: number;
}

export interface InterviewSection {
  id: string;
  title: string;
  maxPoints: number;
  questions: InterviewQuestion[];
}

export interface ChecklistTaskState {
  completed: boolean;
  dueDate?: string;
}

export interface Feedback {
  id: string;
  date: string;
  title: string;
  notes: string;
}

export interface Candidate {
  id: string;
  db_id?: string;
  name: string;
  phone: string;
  email?: string;
  interviewDate: string;
  interviewer: string;
  origin?: string;
  status: CandidateStatus;
  screeningStatus?: 'Pending Contact' | 'Contacted' | 'No Fit';
  interviewScores: InterviewScores;
  interviewConducted?: boolean;
  checkedQuestions?: Record<string, boolean>;
  checklistProgress?: Record<string, ChecklistTaskState>;
  consultantGoalsProgress?: Record<string, boolean>;
  feedbacks?: Feedback[];
  createdAt: string;
  lastUpdatedAt?: string;
  responsibleUserId?: string;
}

export interface ChecklistResource {
  type: 'pdf' | 'image' | 'link';
  name: string;
  url?: string;
}

export interface CommunicationTemplate {
  id: string;
  label: string;
  text?: string;
  resource?: ChecklistResource;
}

export interface ChecklistItem {
  id: string;
  label: string;
  isHeader?: boolean;
  whatsappTemplate?: string;
  resource?: ChecklistResource;
  responsibleRole?: 'GESTOR' | 'SECRETARIA'; // NOVO: Define quem é o responsável pela tarefa
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
  paidDate?: string;
  competenceMonth?: string;
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
  id: string;
  db_id?: string;
  date: string;
  clientName: string;
  type: 'Imóvel' | 'Veículo';
  group: string;
  quota: string;
  consultant: string;
  managerName: string;
  angelName?: string;
  pv: string;
  value: number;
  taxRate: number;
  netValue: number;
  installments: number;
  status: CommissionStatus;
  installmentDetails: Record<string, InstallmentInfo>;
  consultantValue: number;
  managerValue: number;
  angelValue: number;
  receivedValue: number;
  customRules?: CommissionRule[];
  criado_em?: string;
  _synced?: boolean;
}

export type SupportMaterialContentType = 'link' | 'text' | 'image' | 'pdf';

export interface SupportMaterialV2 {
  id: string;
  db_id?: string;
  user_id: string;
  title: string;
  description?: string;
  category?: string;
  content_type: SupportMaterialContentType;
  content: string;
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

export type TeamRole = 'Prévia' | 'Autorizado' | 'Gestor' | 'Anjo' | 'Secretaria';

export interface TeamMember {
  id: string;
  db_id?: string;
  authUserId?: string | null;
  name: string;
  email?: string;
  roles: TeamRole[];
  isActive: boolean;
  cpf?: string;
  dateOfBirth?: string;
  feedbacks?: Feedback[];
  hasLogin?: boolean;
  isLegacy?: boolean;
  tempPassword?: string;
  user_id?: string;
}

export type UserRole = 'GESTOR' | 'CONSULTOR' | 'ADMIN' | 'SECRETARIA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  login?: string;
  hasLogin?: boolean;
  needs_password_change?: boolean;
}

export interface CommissionReport {
  month: string;
  totalSold: number;
  totalCommissions: {
    consultant: number;
    manager: number;
    angel: number;
    total: number;
  };
  commissions: Commission[];
}

export interface CutoffPeriod {
  id: string;
  db_id?: string;
  name: string;
  startDate: string;
  endDate: string;
  competenceMonth: string;
}

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
  consultant_id: string | null;
  stage_id: string;
  user_id: string;
  name?: string;
  data: Record<string, any>;
  proposalValue?: number;
  proposalClosingDate?: string;
  soldCreditValue?: number;
  soldGroup?: string;
  soldQuota?: string;
  saleDate?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadTask {
  id: string;
  db_id?: string;
  lead_id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  type: 'task' | 'meeting';
  meeting_start_time?: string;
  meeting_end_time?: string;
  manager_id?: string;
  manager_invitation_status?: 'pending' | 'accepted' | 'declined';
  updated_at?: string;
}

export interface GestorTask {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  is_completed: boolean;
  created_at: string;
  recurrence_pattern?: {
    type: 'none' | 'daily' | 'every_x_days';
    interval?: number;
  };
}

export interface GestorTaskCompletion {
  id: string;
  gestor_task_id: string;
  user_id: string;
  date: string;
  done: boolean;
  updated_at: string;
}

export type DailyChecklistItemResourceType = 'link' | 'text' | 'image' | 'pdf' | 'video' | 'audio' | 'text_audio' | 'text_audio_image' | 'none';

export interface DailyChecklistItemResource {
  type: DailyChecklistItemResourceType;
  content: string | { text: string; audioUrl: string; imageUrl?: string; };
  name?: string;
}

export interface FinancialEntry {
  id: string;
  db_id?: string;
  user_id: string;
  entry_date: string;
  type: 'income' | 'expense';
  description?: string;
  amount: number;
  created_at: string;
}

export interface FormCadastro {
  id: string;
  user_id: string;
  submission_date: string;
  data: Record<string, any>;
  internal_notes?: string;
  is_complete: boolean;
}

export interface FormFile {
  id: string;
  submission_id: string;
  field_name: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

export type NotificationType = 'birthday' | 'form_submission' | 'new_sale' | 'onboarding_complete';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  description: string;
  date: string;
  link?: string;
  isRead: boolean;
}

export interface DailyChecklist {
  id: string;
  user_id: string;
  title: string;
  is_active: boolean;
  created_at: string;
}

export interface DailyChecklistItem {
  id: string;
  daily_checklist_id: string;
  text: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  resource?: DailyChecklistItemResource;
}

export interface DailyChecklistAssignment {
  id: string;
  daily_checklist_id: string;
  consultant_id: string;
  created_at: string;
}

export interface DailyChecklistCompletion {
  id: string;
  daily_checklist_item_id: string;
  consultant_id: string;
  date: string;
  done: boolean;
  updated_at: string;
}

export interface WeeklyTarget {
  id: string;
  user_id: string;
  title: string;
  week_start: string;
  week_end: string;
  is_active: boolean;
  created_at: string;
}

export interface WeeklyTargetItem {
  id: string;
  weekly_target_id: string;
  metric_key: string;
  label: string;
  target_value: number;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface WeeklyTargetAssignment {
  id: string;
  weekly_target_id: string;
  consultant_id: string;
  created_at: string;
}

export interface MetricLog {
  id: string;
  consultant_id: string;
  metric_key: string;
  date: string;
  value: number;
  created_at: string;
}

export interface TeamProductionGoal {
  id: string;
  user_id: string;
  target_team_size: number;
  target_production_value: number;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
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
  teamProductionGoals: TeamProductionGoal[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  addCandidate: (candidate: Omit<Candidate, 'id' | 'createdAt' | 'db_id'>) => Promise<Candidate>;
  getCandidate: (id: string) => Candidate | undefined;
  updateCandidate: (id: string, updates: Partial<Candidate>) => Promise<void>;
  deleteCandidate: (id: string) => Promise<void>;
  toggleChecklistItem: (candidateId: string, itemId: string) => Promise<void>;
  setChecklistDueDate: (candidateId: string, itemId: string, dueDate: string) => Promise<void>;
  toggleConsultantGoal: (candidateId: string, goalId: string) => Promise<void>;
  addChecklistItem: (stageId: string, label: string, responsibleRole?: 'GESTOR' | 'SECRETARIA') => void;
  updateChecklistItem: (stageId: string, itemId: string, updates: Partial<ChecklistItem>) => void;
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
  deleteCrmLead: (id: string) => Promise<void>;
  addDailyChecklist: (title: string) => Promise<DailyChecklist>;
  updateDailyChecklist: (id: string, updates: Partial<DailyChecklist>) => Promise<DailyChecklist>;
  deleteDailyChecklist: (id: string) => Promise<void>;
  addDailyChecklistItem: (daily_checklist_id: string, text: string, order_index: number, resource?: DailyChecklistItemResource, audioFile?: File, imageFile?: File) => Promise<DailyChecklistItem>;
  updateDailyChecklistItem: (id: string, updates: Partial<DailyChecklistItem>, audioFile?: File, imageFile?: File) => Promise<DailyChecklistItem>;
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
  updateLeadTask: (id: string, updates: Partial<LeadTask>) => Promise<LeadTask>;
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
  addTeamMember: (member: Omit<TeamMember, 'id'> & { email: string }) => Promise<{ success: boolean; member: TeamMember; tempPassword: string; wasExistingUser: boolean; }>;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<{ success: boolean; message?: string }>;
  deleteTeamMember: (id: string) => Promise<void>;
  addTeamProductionGoal: (goal: Omit<TeamProductionGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<TeamProductionGoal>;
  updateTeamProductionGoal: (id: string, updates: Partial<TeamProductionGoal>) => Promise<TeamProductionGoal>;
  deleteTeamProductionGoal: (id: string) => Promise<void>;
}