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
//   url: string;
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
}

// NOVO: Tipos para Daily Checklist Item Resource
export type DailyChecklistItemResourceType = 'link' | 'text' | 'image' | 'pdf' | 'video';

export interface DailyChecklistItemResource {
  type: DailyChecklistItemResourceType;
  content: string; // URL para link/vídeo/arquivo, ou o próprio texto
  name?: string; // Nome do arquivo, se aplicável
}

export interface DailyChecklistItem {
  id: string;
  daily_checklist_id: string;
  text: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  resource?: DailyChecklistItemResource; // NOVO: Recurso de apoio para o item
}

// --- FIM DOS NOVOS TIPOS ---