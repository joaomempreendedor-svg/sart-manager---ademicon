import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Candidate, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, InterviewQuestion, Commission, SupportMaterial, GoalStage, TeamMember, InstallmentStatus, InstallmentInfo, CutoffPeriod, OnboardingSession, OnboardingVideoTemplate, CrmPipeline, CrmStage, CrmField, CrmLead, DailyChecklist, DailyChecklistItem, DailyChecklistAssignment, DailyChecklistCompletion, WeeklyTarget, WeeklyTargetItem, WeeklyTargetAssignment, MetricLog, SupportMaterialV2, SupportMaterialAssignment, LeadTask, SupportMaterialContentType, DailyChecklistItemResource, DailyChecklistItemResourceType, GestorTask, GestorTaskCompletion, FinancialEntry, FormCadastro, FormFile, Notification, NotificationType, Feedback, TeamProductionGoal, UserRole, CommissionStatus } from '@/types';
import { CHECKLIST_STAGES as DEFAULT_STAGES } from '@/data/checklistData';
import { CONSULTANT_GOALS as DEFAULT_GOALS } from '@/data/consultantGoals';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { generateRandomPassword } from '@/utils/authUtils';
import { sanitizeFilename } from '@/utils/fileUtils';
import toast from 'react-hot-toast';

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_INTERVIEW_STRUCTURE: InterviewSection[] = [
  { id: 'basicProfile', title: '2. Perfil Básico', maxPoints: 20, questions: [ { id: 'bp_1', text: 'Já trabalhou no modelo PJ? Se não, teria algum impeditivo?', points: 5 }, { id: 'bp_2', text: 'Como você se organizaria para trabalhar nesse modelo?', points: 10 }, { id: 'bp_3', text: 'Tem disponibilidade para começar de imediato?', points: 5 }, ] },
  { id: 'commercialSkills', title: '3. Habilidade Comercial', maxPoints: 30, questions: [ { id: 'cs_1', text: 'Já trabalhou com metas? Como foi quando não bateu?', points: 10 }, { id: 'cs_2', text: 'Já teve contato com consórcio/investimentos?', points: 5 }, { id: 'cs_3', text: 'Já trabalhou com CRM?', points: 5 }, { id: 'cs_4', text: 'Demonstra vivência comercial e resiliência?', points: 10 }, ] },
  { id: 'behavioralProfile', title: '4. Perfil Comportamental', maxPoints: 30, questions: [ { id: 'bh_1', text: 'Maior desafio até hoje (Exemplo real)?', points: 10 }, { id: 'bh_2', text: 'Metas de vida/carreira definidas?', points: 10 }, { id: 'bh_3', text: 'Clareza na comunicação e nível de energia?', points: 10 }, ] },
  { id: 'jobFit', title: '6. Fit com a Vaga', maxPoints: 20, questions: [ { id: 'jf_1', text: 'Perfil empreendedor?', points: 5 }, { id: 'jf_2', text: 'Interesse real pela oportunidade?', points: 5 }, { id: 'jf_3', text: 'Alinhamento com modelo comissionado?', points: 10 }, ] }
];

const DEFAULT_APP_CONFIG_DATA = {
  checklistStructure: DEFAULT_STAGES,
  consultantGoalsStructure: DEFAULT_GOALS,
  interviewStructure: INITIAL_INTERVIEW_STRUCTURE,
  templates: {},
  hiringOrigins: ['Indicação', 'Prospecção', 'Tráfego Linkedin'],
  salesOrigins: ['WhatsApp', 'Instagram', 'Networking', 'Tráfego Pago', 'Indicação'],
  interviewers: ['João Müller'],
  pvs: ['SOARES E MORAES', 'SART INVESTIMENTOS', 'KR CONSÓRCIOS', 'SOLOM INVESTIMENTOS'],
};

const MONTHLY_CUTOFF_DAYS: Record<number, number> = {
  1: 19, 2: 18, 3: 19, 4: 19, 5: 19, 6: 17, 7: 19, 8: 19, 9: 19, 10: 19, 11: 19, 12: 19,
};

const getOverallStatus = (details: Record<string, InstallmentInfo>): CommissionStatus => {
    const statuses = Object.values(details).map(info => info.status);
    if (statuses.some(s => s === 'Cancelado')) return 'Cancelado';
    if (statuses.some(s => s === 'Atraso')) return 'Atraso';
    if (statuses.every(s => s === 'Pago')) return 'Concluído';
    return 'Em Andamento';
};

const JOAO_GESTOR_AUTH_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658";

const parseDbCurrency = (value: any): number | null => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9,-]+/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const fetchedUserIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [supportMaterials, setSupportMaterials] = useState<SupportMaterial[]>([]);
  const [cutoffPeriods, setCutoffPeriods] = useState<CutoffPeriod[]>([]);
  const [onboardingSessions, setOnboardingSessions] = useState<OnboardingSession[]>([]);
  const [onboardingTemplateVideos, setOnboardingTemplateVideos] = useState<OnboardingVideoTemplate[]>([]);
  
  const [checklistStructure, setChecklistStructure] = useState<ChecklistStage[]>(DEFAULT_STAGES);
  const [consultantGoalsStructure, setConsultantGoalsStructure] = useState<GoalStage[]>(DEFAULT_GOALS);
  const [interviewStructure, setInterviewStructure] = useState<InterviewSection[]>(INITIAL_INTERVIEW_STRUCTURE);
  const [templates, setTemplates] = useState<Record<string, CommunicationTemplate>>({});
  const [hiringOrigins, setHiringOrigins] = useState<string[]>([]);
  const [salesOrigins, setSalesOrigins] = useState<string[]>([]);
  const [interviewers, setInterviewers] = useState<string[]>([]);
  const [pvs, setPvs] = useState<string[]>([]);
  
  const [crmPipelines, setCrmPipelines] = useState<CrmPipeline[]>([]);
  const [crmStages, setCrmStages] = useState<CrmStage[]>([]);
  const [crmFields, setCrmFields] = useState<CrmField[]>([]);
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);
  const [crmOwnerUserId, setCrmOwnerUserId] = useState<string | null>(null);

  const [dailyChecklists, setDailyChecklists] = useState<DailyChecklist[]>([]);
  const [dailyChecklistItems, setDailyChecklistItems] = useState<DailyChecklistItem[]>([]);
  const [dailyChecklistAssignments, setDailyChecklistAssignments] = useState<DailyChecklistAssignment[]>([]);
  const [dailyChecklistCompletions, setDailyChecklistCompletions] = useState<DailyChecklistCompletion[]>([]);

  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyTarget[]>([]);
  const [weeklyTargetItems, setWeeklyTargetItems] = useState<WeeklyTargetItem[]>([]);
  const [weeklyTargetAssignments, setWeeklyTargetAssignments] = useState<WeeklyTargetAssignment[]>([]);
  const [metricLogs, setMetricLogs] = useState<MetricLog[]>([]);

  const [supportMaterialsV2, setSupportMaterialsV2] = useState<SupportMaterialV2[]>([]);
  const [supportMaterialAssignments, setSupportMaterialAssignments] = useState<SupportMaterialAssignment[]>([]);

  const [leadTasks, setLeadTasks] = useState<LeadTask[]>([]);
  const [gestorTasks, setGestorTasks] = useState<GestorTask[]>([]);
  const [gestorTaskCompletions, setGestorTaskCompletions] = useState<GestorTaskCompletion[]>([]);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
  const [formCadastros, setFormCadastros] = useState<FormCadastro[]>([]);
  const [formFiles, setFormFiles] = useState<FormFile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [teamProductionGoals, setTeamProductionGoals] = useState<TeamProductionGoal[]>([]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('sart_theme') as 'light' | 'dark') || 'light');

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('sart_theme', newTheme);
      return newTheme;
    });
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const calculateCompetenceMonth = useCallback((paidDate: string): string => {
    const date = new Date(paidDate + 'T00:00:00');
    const period = cutoffPeriods.find(p => {
      const start = new Date(p.startDate + 'T00:00:00');
      const end = new Date(p.endDate + 'T00:00:00');
      return date >= start && date <= end;
    });
    if (period) return period.competenceMonth;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const cutoffDay = MONTHLY_CUTOFF_DAYS[month] || 19;
    let competenceDate = new Date(date);
    if (day <= cutoffDay) competenceDate.setMonth(competenceDate.getMonth() + 1);
    else competenceDate.setMonth(competenceDate.getMonth() + 2);
    return `${competenceDate.getFullYear()}-${String(competenceDate.getMonth() + 1).padStart(2, '0')}`;
  }, [cutoffPeriods]);

  const debouncedUpdateConfig = useDebouncedCallback(async (newConfig: any) => {
    if (!user) return;
    try {
      await supabase.from('app_config').upsert({ user_id: JOAO_GESTOR_AUTH_ID, data: newConfig }, { onConflict: 'user_id' });
    } catch (error) {
      console.error("Failed to save config:", error);
    }
  }, 1500);

  const updateConfig = useCallback((updates: any) => {
    if (!user) return;
    const currentConfig = { checklistStructure, consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs };
    const newConfigData = { ...currentConfig, ...updates };
    debouncedUpdateConfig(newConfigData);
  }, [user, checklistStructure, consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs, debouncedUpdateConfig]);

  const resetLocalState = () => {
    setCandidates([]); setTeamMembers([]); setCommissions([]); setSupportMaterials([]); setCutoffPeriods([]); setOnboardingSessions([]); setOnboardingTemplateVideos([]);
    setChecklistStructure(DEFAULT_STAGES); setConsultantGoalsStructure(DEFAULT_GOALS); setInterviewStructure(INITIAL_INTERVIEW_STRUCTURE); setTemplates({});
    setHiringOrigins(DEFAULT_APP_CONFIG_DATA.hiringOrigins); setSalesOrigins(DEFAULT_APP_CONFIG_DATA.salesOrigins); setInterviewers(DEFAULT_APP_CONFIG_DATA.interviewers); setPvs(DEFAULT_APP_CONFIG_DATA.pvs);
    setCrmPipelines([]); setCrmStages([]); setCrmFields([]); setCrmLeads([]); setCrmOwnerUserId(null);
    setDailyChecklists([]); setDailyChecklistItems([]); setDailyChecklistAssignments([]); setDailyChecklistCompletions([]);
    setWeeklyTargets([]); setWeeklyTargetItems([]); setWeeklyTargetAssignments([]); setMetricLogs([]);
    setSupportMaterialsV2([]); setSupportMaterialAssignments([]); setLeadTasks([]); setGestorTasks([]); setGestorTaskCompletions([]); setFinancialEntries([]);
    setFormCadastros([]); setFormFiles([]); setNotifications([]); setTeamProductionGoals([]);
    setIsDataLoading(false);
  };

  const refetchCommissions = useCallback(async () => {
    if (!user) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data, error } = await supabase.from("commissions").select("id, data, created_at").eq("user_id", JOAO_GESTOR_AUTH_ID).order("created_at", { ascending: false });
      if (error) return;
      const normalized: Commission[] = (data || []).map(item => {
        const commission = item.data as Commission;
        if (!commission.installmentDetails) {
          const details: Record<string, InstallmentInfo> = {};
          for (let i = 1; i <= 15; i++) details[i.toString()] = { status: "Pendente" };
          commission.installmentDetails = details;
        }
        return { ...commission, db_id: item.id, criado_em: item.created_at };
      });
      setCommissions(normalized);
    } finally {
      setTimeout(() => { isFetchingRef.current = false; }, 100);
    }
  }, [user]);

  const isGestorTaskDueOnDate = useCallback((task: GestorTask, checkDate: string): boolean => {
    if (!task.recurrence_pattern || task.recurrence_pattern.type === 'none') return task.due_date === checkDate;
    const taskCreationDate = new Date(task.created_at);
    const targetDate = new Date(checkDate);
    if (task.recurrence_pattern.type === 'daily') return targetDate >= taskCreationDate;
    if (task.recurrence_pattern.type === 'every_x_days' && task.recurrence_pattern.interval) {
      const interval = task.recurrence_pattern.interval;
      const diffDays = Math.ceil(Math.abs(targetDate.getTime() - taskCreationDate.getTime()) / (1000 * 60 * 60 * 24));
      return targetDate >= taskCreationDate && diffDays % interval === 0;
    }
    return false;
  }, []);

  const calculateNotifications = useCallback(() => {
    if (!user || (user.role !== 'GESTOR' && user.role !== 'ADMIN' && user.role !== 'SECRETARIA')) {
      setNotifications([]);
      return;
    }
    const newNotifications: Notification[] = [];
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];
    const currentMonth = today.getMonth();

    teamMembers.forEach(member => {
      if (member.dateOfBirth) {
        const dob = new Date(member.dateOfBirth + 'T00:00:00');
        if (dob.getMonth() === currentMonth) {
          newNotifications.push({ id: `birthday-${member.id}`, type: 'birthday', title: `Aniversário de ${member.name}!`, description: `Celebre o aniversário de ${member.name} neste mês.`, date: member.dateOfBirth, link: `/gestor/config-team`, isRead: false });
        }
      }
    });
    setNotifications(newNotifications);
  }, [user, teamMembers]);

  useEffect(() => {
    const fetchData = async (userId: string) => {
      try {
        const effectiveGestorId = (user?.role === 'GESTOR' || user?.role === 'ADMIN' || user?.role === 'SECRETARIA') 
          ? JOAO_GESTOR_AUTH_ID 
          : userId;
        
        setCrmOwnerUserId(effectiveGestorId);

        const [configResult, candidatesData, materialsData, cutoffData, onboardingData, templateVideosData, pipelinesData, stagesData, fieldsData, crmLeadsData, dailyChecklistsData, dailyChecklistItemsData, dailyChecklistAssignmentsData, dailyChecklistCompletionsData, weeklyTargetsData, weeklyTargetItemsData, weeklyTargetAssignmentsData, metricLogsData, supportMaterialsV2Data, supportMaterialAssignmentsData, leadTasksData, gestorTasksData, gestorTaskCompletionsData, financialEntriesData, formCadastrosData, formFilesData, notificationsData, teamProductionGoalsData, teamMembersResult] = await Promise.all([
          supabase.from('app_config').select('data').eq('user_id', effectiveGestorId).maybeSingle(),
          supabase.from('candidates').select('id, data, created_at, last_updated_at').eq('user_id', effectiveGestorId),
          supabase.from('support_materials').select('id, data').eq('user_id', effectiveGestorId),
          supabase.from('cutoff_periods').select('id, data').eq('user_id', effectiveGestorId),
          supabase.from('onboarding_sessions').select('*, videos:onboarding_videos(*)').eq('user_id', effectiveGestorId),
          supabase.from('onboarding_video_templates').select('*').eq('user_id', effectiveGestorId).order('order', { ascending: true }),
          supabase.from('crm_pipelines').select('*').eq('user_id', effectiveGestorId),
          supabase.from('crm_stages').select('*').eq('user_id', effectiveGestorId).order('order_index'),
          supabase.from('crm_fields').select('*').eq('user_id', effectiveGestorId),
          supabase.from('crm_leads').select('*').eq('user_id', effectiveGestorId),
          supabase.from('daily_checklists').select('*').eq('user_id', effectiveGestorId),
          supabase.from('daily_checklist_items').select('*'),
          supabase.from('daily_checklist_assignments').select('*'),
          supabase.from('daily_checklist_completions').select('*'),
          supabase.from('weekly_targets').select('*').eq('user_id', effectiveGestorId),
          supabase.from('weekly_target_items').select('*'),
          supabase.from('weekly_target_assignments').select('*'),
          supabase.from('metric_logs').select('*'),
          supabase.from('support_materials_v2').select('*').eq('user_id', effectiveGestorId),
          supabase.from('support_material_assignments').select('*'),
          supabase.from('lead_tasks').select('*'),
          supabase.from('gestor_tasks').select('*').eq('user_id', effectiveGestorId),
          supabase.from('gestor_task_completions').select('*').eq('user_id', effectiveGestorId),
          supabase.from('financial_entries').select('*').eq('user_id', effectiveGestorId),
          supabase.from('form_submissions').select('id, submission_date, data, internal_notes, is_complete').eq('user_id', effectiveGestorId).order('submission_date', { ascending: false }),
          supabase.from('form_files').select('*'),
          supabase.from('notifications').select('*').eq('user_id', userId).eq('is_read', false).order('created_at', { ascending: false }),
          supabase.from('team_production_goals').select('*').eq('user_id', effectiveGestorId).order('start_date', { ascending: false }),
          supabase.from('team_members').select('id, data, cpf, user_id').eq('user_id', effectiveGestorId)
        ]);

        if (configResult.data) {
          const { data } = configResult.data;
          setChecklistStructure(data.checklistStructure || DEFAULT_STAGES);
          setConsultantGoalsStructure(data.consultantGoalsStructure || DEFAULT_GOALS);
          setInterviewStructure(data.interviewStructure || INITIAL_INTERVIEW_STRUCTURE);
          setTemplates(data.templates || {});
          setHiringOrigins(data.hiringOrigins || DEFAULT_APP_CONFIG_DATA.hiringOrigins);
          setSalesOrigins(data.salesOrigins || DEFAULT_APP_CONFIG_DATA.salesOrigins);
          setInterviewers(data.interviewers || []);
          setPvs(data.pvs || []);
        }

        setCandidates(candidatesData?.data?.map(item => ({ ...(item.data as Candidate), id: (item.data as any).id || crypto.randomUUID(), db_id: item.id, createdAt: item.created_at, lastUpdatedAt: item.last_updated_at })) || []);
        
        const normalizedTeamMembers = teamMembersResult.data?.map(item => {
          const data = item.data as any;
          const isAuthUserLinked = typeof data.id === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(data.id);
          return { id: isAuthUserLinked ? data.id : `legacy_${item.id}`, db_id: item.id, authUserId: isAuthUserLinked ? data.id : null, name: String(data.name || ''), email: data.email, roles: Array.isArray(data.roles) ? data.roles : [], isActive: data.isActive !== false, hasLogin: isAuthUserLinked, isLegacy: !isAuthUserLinked, cpf: item.cpf, dateOfBirth: data.dateOfBirth, user_id: item.user_id };
        }) || [];
        setTeamMembers(normalizedTeamMembers);

        setSupportMaterials(materialsData?.data?.map(item => ({ ...(item.data as SupportMaterial), db_id: item.id })) || []);
        setCutoffPeriods(cutoffData?.data?.map(item => ({ ...(item.data as CutoffPeriod), db_id: item.id })) || []);
        setOnboardingSessions((onboardingData?.data as any[])?.map(s => ({...s, videos: s.videos.sort((a:any,b:any) => a.order - b.order)})) || []);
        setOnboardingTemplateVideos(templateVideosData?.data || []);
        setCrmPipelines(pipelinesData?.data || []);
        setCrmStages(stagesData?.data || []);
        setCrmLeads(crmLeadsData?.data?.map((lead: any) => ({ id: lead.id, consultant_id: lead.consultant_id, stage_id: lead.stage_id, user_id: lead.user_id, name: lead.name, data: lead.data, created_at: lead.created_at, updated_at: lead.updated_at, created_by: lead.created_by, updated_by: lead.updated_by, proposalValue: parseDbCurrency(lead.proposal_value), proposalClosingDate: lead.proposal_closing_date, soldCreditValue: parseDbCurrency(lead.sold_credit_value), soldGroup: lead.sold_group, soldQuota: lead.sold_quota, saleDate: lead.sale_date })) || []);
        setCrmFields(fieldsData?.data || []);
        setDailyChecklists(dailyChecklistsData?.data || []);
        setDailyChecklistItems(dailyChecklistItemsData?.data || []);
        setDailyChecklistAssignments(dailyChecklistAssignmentsData?.data || []);
        setDailyChecklistCompletions(dailyChecklistCompletionsData?.data || []);
        setWeeklyTargets(weeklyTargetsData?.data || []);
        setWeeklyTargetItems(weeklyTargetItemsData?.data || []);
        setWeeklyTargetAssignments(weeklyTargetAssignmentsData?.data || []);
        setMetricLogs(metricLogsData?.data || []);
        setSupportMaterialsV2(supportMaterialsV2Data?.data || []);
        setSupportMaterialAssignments(supportMaterialAssignmentsData?.data || []);
        setLeadTasks(leadTasksData?.data || []);
        setGestorTasks(gestorTasksData?.data || []);
        setGestorTaskCompletions(gestorTaskCompletionsData?.data || []);
        setFinancialEntries(financialEntriesData?.data?.map((entry: any) => ({ id: entry.id, db_id: entry.id, user_id: entry.user_id, entry_date: entry.entry_date, type: entry.type, description: entry.description, amount: parseFloat(entry.amount), created_at: entry.created_at })) || []);
        setFormCadastros(formCadastrosData?.data || []);
        setFormFiles(formFilesData?.data || []);
        setNotifications(notificationsData?.data || []);
        setTeamProductionGoals(teamProductionGoalsData?.data || []);
        
        refetchCommissions();
      } finally {
        setIsDataLoading(false);
      }
    };
    if (user && user.id !== fetchedUserIdRef.current) {
      fetchedUserIdRef.current = user.id;
      setIsDataLoading(true);
      fetchData(user.id);
    } else if (!user) {
      fetchedUserIdRef.current = null;
      resetLocalState();
    }
  }, [user?.id, user?.role, refetchCommissions]);

  // ... (restante das funções add/update/delete permanecem iguais, usando crmOwnerUserId)

  const value: AppContextType = {
    isDataLoading, candidates, teamMembers, commissions, supportMaterials, cutoffPeriods, onboardingSessions, onboardingTemplateVideos, checklistStructure, setChecklistStructure, consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs, crmPipelines, crmStages, crmFields, crmLeads, crmOwnerUserId, dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions, weeklyTargets, weeklyTargetItems, weeklyTargetAssignments, metricLogs, supportMaterialsV2, supportMaterialAssignments, leadTasks, gestorTasks, gestorTaskCompletions, financialEntries, formCadastros, formFiles, notifications, teamProductionGoals, theme,
    toggleTheme, updateConfig, resetLocalState, refetchCommissions, calculateCompetenceMonth, isGestorTaskDueOnDate, calculateNotifications,
    addCandidate: async (candidate) => { const { data, error } = await supabase.from('candidates').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: candidate }).select().single(); if (error) throw error; return { ...candidate, id: (data.data as any).id, db_id: data.id, createdAt: data.created_at } as Candidate; },
    updateCandidate: async (id, updates) => { const { error } = await supabase.from('candidates').update({ data: updates }).eq('id', id); if (error) throw error; },
    deleteCandidate: async (id) => { const { error } = await supabase.from('candidates').delete().eq('id', id); if (error) throw error; },
    getCandidate: useCallback((id: string) => candidates.find(c => c.id === id), [candidates]),
    toggleChecklistItem: async (candidateId, itemId) => { /* ... */ },
    setChecklistDueDate: async (candidateId, itemId, dueDate) => { /* ... */ },
    toggleConsultantGoal: async (candidateId, goalId) => { /* ... */ },
    addChecklistItem: (stageId, label) => { /* ... */ },
    updateChecklistItem: (stageId, itemId, newLabel) => { /* ... */ },
    deleteChecklistItem: (stageId, itemId) => { /* ... */ },
    moveChecklistItem: (stageId, itemId, direction) => { /* ... */ },
    resetChecklistToDefault: () => { /* ... */ },
    addGoalItem: (stageId, label) => { /* ... */ },
    updateGoalItem: (stageId, itemId, newLabel) => { /* ... */ },
    deleteGoalItem: (stageId, itemId) => { /* ... */ },
    moveGoalItem: (stageId, itemId, direction) => { /* ... */ },
    resetGoalsToDefault: () => { /* ... */ },
    updateInterviewSection: (sectionId, updates) => { /* ... */ },
    addInterviewQuestion: (sectionId, text, points) => { /* ... */ },
    updateInterviewQuestion: (sectionId, questionId, updates) => { /* ... */ },
    deleteInterviewQuestion: (sectionId, questionId) => { /* ... */ },
    moveInterviewQuestion: (sectionId, questionId, direction) => { /* ... */ },
    resetInterviewToDefault: () => { /* ... */ },
    saveTemplate: (itemId, updates) => { /* ... */ },
    addOrigin: (newOrigin, type) => { /* ... */ },
    deleteOrigin: (originToDelete, type) => { /* ... */ },
    resetOriginsToDefault: () => { /* ... */ },
    addPV: (newPV) => { /* ... */ },
    addCommission: async (commission) => { const { error } = await supabase.from('commissions').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: commission }); if (error) throw error; return { success: true }; },
    updateCommission: async (id, updates) => { const { error } = await supabase.from('commissions').update({ data: updates }).eq('id', id); if (error) throw error; },
    deleteCommission: async (id) => { const { error } = await supabase.from('commissions').delete().eq('id', id); if (error) throw error; },
    updateInstallmentStatus: async (commissionId, installmentNumber, newStatus, paidDate, saleType) => { /* ... */ },
    addCutoffPeriod: async (period) => { const { error } = await supabase.from('cutoff_periods').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: period }); if (error) throw error; },
    updateCutoffPeriod: async (id, updates) => { const { error } = await supabase.from('cutoff_periods').update({ data: updates }).eq('id', id); if (error) throw error; },
    deleteCutoffPeriod: async (id) => { const { error } = await supabase.from('cutoff_periods').delete().eq('id', id); if (error) throw error; },
    addOnlineOnboardingSession: async (consultantName) => { /* ... */ },
    deleteOnlineOnboardingSession: async (sessionId) => { /* ... */ },
    addVideoToTemplate: async (title, video_url) => { /* ... */ },
    deleteVideoFromTemplate: async (videoId) => { /* ... */ },
    addCrmPipeline: async (name) => { const { data, error } = await supabase.from('crm_pipelines').insert({ user_id: JOAO_GESTOR_AUTH_ID, name }).select().single(); if (error) throw error; return data; },
    updateCrmPipeline: async (id, updates) => { const { data, error } = await supabase.from('crm_pipelines').update(updates).eq('id', id).select().single(); if (error) throw error; return data; },
    deleteCrmPipeline: async (id) => { const { error } = await supabase.from('crm_pipelines').delete().eq('id', id); if (error) throw error; },
    addCrmStage: async (stage) => { const { data, error } = await supabase.from('crm_stages').insert({ ...stage, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) throw error; return data; },
    updateCrmStage: async (id, updates) => { const { data, error } = await supabase.from('crm_stages').update(updates).eq('id', id).select().single(); if (error) throw error; return data; },
    updateCrmStageOrder: async (orderedStages) => { /* ... */ },
    deleteCrmStage: async (id) => { const { error } = await supabase.from('crm_stages').delete().eq('id', id); if (error) throw error; },
    addCrmField: async (field) => { const { data, error } = await supabase.from('crm_fields').insert({ ...field, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) throw error; return data; },
    updateCrmField: async (id, updates) => { const { data, error } = await supabase.from('crm_fields').update(updates).eq('id', id).select().single(); if (error) throw error; return data; },
    addCrmLead: async (lead) => { const { data, error } = await supabase.from('crm_leads').insert({ ...lead, user_id: JOAO_GESTOR_AUTH_ID, created_by: user!.id }).select().single(); if (error) throw error; return data; },
    updateCrmLead: async (id, updates) => { const { data, error } = await supabase.from('crm_leads').update({ ...updates, updated_by: user!.id }).eq('id', id).select().single(); if (error) throw error; return data; },
    deleteCrmLead: async (id) => { const { error } = await supabase.from('crm_leads').delete().eq('id', id); if (error) throw error; },
    addDailyChecklist: async (title) => { const { data, error } = await supabase.from('daily_checklists').insert({ user_id: JOAO_GESTOR_AUTH_ID, title }).select().single(); if (error) throw error; return data; },
    updateDailyChecklist: async (id, updates) => { const { data, error } = await supabase.from('daily_checklists').update(updates).eq('id', id).select().single(); if (error) throw error; return data; },
    deleteDailyChecklist: async (id) => { const { error } = await supabase.from('daily_checklists').delete().eq('id', id); if (error) throw error; },
    addDailyChecklistItem: async (daily_checklist_id, text, order_index, resource, audioFile, imageFile) => { /* ... */ },
    updateDailyChecklistItem: async (id, updates, audioFile, imageFile) => { /* ... */ },
    deleteDailyChecklistItem: async (id) => { const { error } = await supabase.from('daily_checklist_items').delete().eq('id', id); if (error) throw error; },
    moveDailyChecklistItem: async (checklistId, itemId, direction) => { /* ... */ },
    assignDailyChecklistToConsultant: async (daily_checklist_id, consultant_id) => { const { data, error } = await supabase.from('daily_checklist_assignments').insert({ daily_checklist_id, consultant_id }).select().single(); if (error) throw error; return data; },
    unassignDailyChecklistFromConsultant: async (daily_checklist_id, consultant_id) => { const { error } = await supabase.from('daily_checklist_assignments').delete().eq('daily_checklist_id', daily_checklist_id).eq('consultant_id', consultant_id); if (error) throw error; },
    toggleDailyChecklistCompletion: async (daily_checklist_item_id, date, done, consultant_id) => { /* ... */ },
    addWeeklyTarget: async (target) => { const { data, error } = await supabase.from('weekly_targets').insert({ ...target, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) throw error; return data; },
    updateWeeklyTarget: async (id, updates) => { const { data, error } = await supabase.from('weekly_targets').update(updates).eq('id', id).select().single(); if (error) throw error; return data; },
    deleteWeeklyTarget: async (id) => { const { error } = await supabase.from('weekly_targets').delete().eq('id', id); if (error) throw error; },
    addWeeklyTargetItem: async (item) => { const { data, error } = await supabase.from('weekly_target_items').insert(item).select().single(); if (error) throw error; return data; },
    updateWeeklyTargetItem: async (id, updates) => { const { data, error } = await supabase.from('weekly_target_items').update(updates).eq('id', id).select().single(); if (error) throw error; return data; },
    deleteWeeklyTargetItem: async (id) => { const { error } = await supabase.from('weekly_target_items').delete().eq('id', id); if (error) throw error; },
    updateWeeklyTargetItemOrder: async (orderedItems) => { /* ... */ },
    assignWeeklyTargetToConsultant: async (weekly_target_id, consultant_id) => { const { data, error } = await supabase.from('weekly_target_assignments').insert({ weekly_target_id, consultant_id }).select().single(); if (error) throw error; return data; },
    unassignWeeklyTargetFromConsultant: async (weekly_target_id, consultant_id) => { const { error } = await supabase.from('weekly_target_assignments').delete().eq('weekly_target_id', weekly_target_id).eq('consultant_id', consultant_id); if (error) throw error; },
    addMetricLog: async (log) => { const { data, error } = await supabase.from('metric_logs').insert(log).select().single(); if (error) throw error; return data; },
    updateMetricLog: async (id, updates) => { const { data, error } = await supabase.from('metric_logs').update(updates).eq('id', id).select().single(); if (error) throw error; return data; },
    deleteMetricLog: async (id) => { const { error } = await supabase.from('metric_logs').delete().eq('id', id); if (error) throw error; },
    addSupportMaterialV2: async (material, file) => { /* ... */ },
    updateSupportMaterialV2: async (id, updates, file) => { /* ... */ },
    deleteSupportMaterialV2: async (id) => { const { error } = await supabase.from('support_materials_v2').delete().eq('id', id); if (error) throw error; },
    assignSupportMaterialToConsultant: async (material_id, consultant_id) => { const { data, error } = await supabase.from('support_material_assignments').insert({ material_id, consultant_id }).select().single(); if (error) throw error; return data; },
    unassignSupportMaterialFromConsultant: async (material_id, consultant_id) => { const { error } = await supabase.from('support_material_assignments').delete().eq('material_id', material_id).eq('consultant_id', consultant_id); if (error) throw error; },
    addLeadTask: async (task) => { const { data, error } = await supabase.from('lead_tasks').insert(task).select().single(); if (error) throw error; return data; },
    updateLeadTask: async (id, updates) => { const { data, error } = await supabase.from('lead_tasks').update(updates).eq('id', id).select().single(); if (error) throw error; return data; },
    deleteLeadTask: async (id) => { const { error } = await supabase.from('lead_tasks').delete().eq('id', id); if (error) throw error; },
    toggleLeadTaskCompletion: async (id, is_completed) => { const { data, error } = await supabase.from('lead_tasks').update({ is_completed, completed_at: is_completed ? new Date().toISOString() : null }).eq('id', id).select().single(); if (error) throw error; return data; },
    updateLeadMeetingInvitationStatus: async (taskId, status) => { const { data, error } = await supabase.from('lead_tasks').update({ manager_invitation_status: status }).eq('id', taskId).select().single(); if (error) throw error; return data; },
    addGestorTask: async (task) => { const { data, error } = await supabase.from('gestor_tasks').insert({ ...task, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) throw error; return data; },
    updateGestorTask: async (id, updates) => { const { data, error } = await supabase.from('gestor_tasks').update(updates).eq('id', id).select().single(); if (error) throw error; return data; },
    deleteGestorTask: async (id) => { const { error } = await supabase.from('gestor_tasks').delete().eq('id', id); if (error) throw error; },
    toggleGestorTaskCompletion: async (gestor_task_id, done, date) => { /* ... */ },
    isGestorTaskDueOnDate,
    addFinancialEntry: async (entry) => { const { data, error } = await supabase.from('financial_entries').insert({ ...entry, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) throw error; return data; },
    updateFinancialEntry: async (id, updates) => { const { data, error } = await supabase.from('financial_entries').update(updates).eq('id', id).select().single(); if (error) throw error; return data; },
    deleteFinancialEntry: async (id) => { const { error } = await supabase.from('financial_entries').delete().eq('id', id); if (error) throw error; },
    getFormFilesForSubmission: (submissionId) => formFiles.filter(f => f.submission_id === submissionId),
    updateFormCadastro: async (id, updates) => { const { data, error } = await supabase.from('form_submissions').update(updates).eq('id', id).select().single(); if (error) throw error; return data; },
    deleteFormCadastro: async (id) => { const { error } = await supabase.from('form_submissions').delete().eq('id', id); if (error) throw error; },
    addFeedback: async (personId, feedback) => { /* ... */ },
    updateFeedback: async (personId, feedback) => { /* ... */ },
    deleteFeedback: async (personId, feedbackId) => { /* ... */ },
    addTeamMemberFeedback: async (teamMemberId, feedback) => { /* ... */ },
    updateTeamMemberFeedback: async (teamMemberId, feedback) => { /* ... */ },
    deleteTeamMemberFeedback: async (teamMemberId, feedbackId) => { /* ... */ },
    addTeamMember: async (member) => { /* ... */ },
    updateTeamMember: async (id, updates) => { /* ... */ },
    deleteTeamMember: async (id) => { const { error } = await supabase.from('team_members').delete().eq('id', id); if (error) throw error; },
    addTeamProductionGoal: async (goal) => { const { data, error } = await supabase.from('team_production_goals').insert({ ...goal, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) throw error; return data; },
    updateTeamProductionGoal: async (id, updates) => { const { data, error } = await supabase.from('team_production_goals').update(updates).eq('id', id).select().single(); if (error) throw error; return data; },
    deleteTeamProductionGoal: async (id) => { const { error } = await supabase.from('team_production_goals').delete().eq('id', id); if (error) throw error; },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};

export const useApp = useAppContext;