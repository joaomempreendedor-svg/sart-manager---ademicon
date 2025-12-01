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
  installmentDetails: Record<string, InstallmentStatus>; // e.g. { '1': 'Pago', '2': 'Pendente' }
  
  // Split Values (Calculated per installment rules - Tax)
  consultantValue: number; // Valor para o consultor
  managerValue: number; // Valor para o gestor
  angelValue: number; // Valor para o anjo
  receivedValue: number; // Soma ou valor total da nota
  
  customRules?: CommissionRule[]; // Se presente, ignora cálculo padrão
}

export interface SupportMaterial {
  id: string; // Client-side UUID
  db_id?: string; // Database primary key
  title: string;
  category: string;
  type: 'pdf' | 'image';
  content: string; // Base64
  fileName: string;
}

// TEAM MANAGEMENT
export type TeamRole = 'Prévia' | 'Autorizado' | 'Gestor' | 'Anjo';

export interface TeamMember {
  id: string; // Client-side UUID
  db_id?: string; // Database primary key
  name: string;
  roles: TeamRole[];
  isActive: boolean;
}

// AUTHENTICATION
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AppContextType {
  // Auth
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  candidates: Candidate[];
  templates: Record<string, CommunicationTemplate>;
  checklistStructure: ChecklistStage[];
  consultantGoalsStructure: GoalStage[]; // New Dynamic Structure
  interviewStructure: InterviewSection[];
  commissions: Commission[];
  supportMaterials: SupportMaterial[];
  theme: 'light' | 'dark';
  
  // Dynamic Lists
  origins: string[];
  interviewers: string[];
  pvs: string[];
  
  // Team Management
  teamMembers: TeamMember[];
  addTeamMember: (member: TeamMember) => Promise<void>;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;

  addOrigin: (origin: string) => void;
  deleteOrigin: (origin: string) => void;
  addInterviewer: (interviewer: string) => void;
  deleteInterviewer: (interviewer: string) => void;
  addPV: (pv: string) => void;
  
  // Theme Action
  toggleTheme: () => void;
  
  // Candidate Actions
  addCandidate: (candidate: Candidate) => Promise<void>;
  updateCandidate: (id: string, updates: Partial<Candidate>) => Promise<void>;
  deleteCandidate: (id: string) => Promise<void>;
  toggleChecklistItem: (candidateId: string, itemId: string) => Promise<void>;
  toggleConsultantGoal: (candidateId: string, goalId: string) => Promise<void>;
  setChecklistDueDate: (candidateId: string, itemId: string, date: string) => Promise<void>;
  getCandidate: (id: string) => Candidate | undefined;
  
  // Template Actions
  saveTemplate: (id: string, template: Partial<CommunicationTemplate>) => void;

  // Structure Actions (Checklist)
  addChecklistItem: (stageId: string, label: string) => void;
  updateChecklistItem: (stageId: string, itemId: string, label: string) => void;
  deleteChecklistItem: (stageId: string, itemId: string) => void;
  moveChecklistItem: (stageId: string, itemId: string, direction: 'up' | 'down') => void;
  resetChecklistToDefault: () => void;

  // Structure Actions (Consultant Goals)
  addGoalItem: (stageId: string, label: string) => void;
  updateGoalItem: (stageId: string, itemId: string, label: string) => void;
  deleteGoalItem: (stageId: string, itemId: string) => void;
  moveGoalItem: (stageId: string, itemId: string, direction: 'up' | 'down') => void;
  resetGoalsToDefault: () => void;

  // Structure Actions (Interview)
  updateInterviewSection: (sectionId: string, updates: Partial<InterviewSection>) => void;
  addInterviewQuestion: (sectionId: string, text: string, points: number) => void;
  updateInterviewQuestion: (sectionId: string, questionId: string, updates: Partial<InterviewQuestion>) => void;
  deleteInterviewQuestion: (sectionId: string, questionId: string) => void;
  moveInterviewQuestion: (sectionId: string, questionId: string, direction: 'up' | 'down') => void;
  resetInterviewToDefault: () => void;

  // Commission Actions
  addCommission: (commission: Commission) => Promise<void>;
  updateCommission: (id: string, updates: Partial<Commission>) => Promise<void>;
  deleteCommission: (id: string) => Promise<void>;
  updateInstallmentStatus: (commissionId: string, installmentNumber: number, status: InstallmentStatus) => Promise<void>;

  // Support Material Actions
  addSupportMaterial: (material: SupportMaterial) => Promise<void>;
  deleteSupportMaterial: (id: string) => Promise<void>;
}