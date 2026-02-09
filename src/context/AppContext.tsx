import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Candidate, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, InterviewQuestion, Commission, SupportMaterial, GoalStage, TeamMember, InstallmentStatus, InstallmentInfo, CutoffPeriod, OnboardingSession, OnboardingVideoTemplate, CrmPipeline, CrmStage, CrmField, CrmLead, DailyChecklist, DailyChecklistItem, DailyChecklistAssignment, DailyChecklistCompletion, WeeklyTarget, WeeklyTargetItem, WeeklyTargetAssignment, MetricLog, SupportMaterialV2, SupportMaterialAssignment, LeadTask, SupportMaterialContentType, DailyChecklistItemResource, DailyChecklistItemResourceType, GestorTask, GestorTaskCompletion, FinancialEntry, FormCadastro, FormFile, Notification, NotificationType, Feedback, TeamProductionGoal, UserRole, CommissionStatus, InterviewScores, CandidateStatus } from '@/types';
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

// Helper to strip legacy prefix from IDs before DB operations
const getCleanId = (id: string) => id.startsWith('legacy_') ? id.replace('legacy_', '') : id;

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
    setWeeklyTargets([]); setWeeklyTargetItems([]); setWeeklyTargetItems([]); setWeeklyTargetAssignments([]); setMetricLogs([]);
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
        // ATUALIZADO: Todos os membros da equipe buscam configurações e dados compartilhados do Gestor principal
        const effectiveGestorId = JOAO_GESTOR_AUTH_ID;
        
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
          const isAuthUserLinked = typeof data.id === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(data.id);
          return { 
            id: isAuthUserLinked ? data.id : `legacy_${item.id}`, 
            db_id: item.id, 
            authUserId: isAuthUserLinked ? data.id : null, 
            name: String(data.name || ''), 
            email: data.email, 
            roles: Array.isArray(data.roles) ? data.roles : [], 
            isActive: data.isActive !== false, 
            hasLogin: isAuthUserLinked, 
            isLegacy: !isAuthUserLinked, 
            cpf: item.cpf, 
            dateOfBirth: data.dateOfBirth, 
            user_id: item.user_id 
          };
        }) || [];
        setTeamMembers(normalizedTeamMembers);

        setSupportMaterials(materialsData?.data?.map(item => ({ ...(item.data as SupportMaterial), db_id: item.id })) || []);
        setCutoffPeriods(cutoffData?.data?.map(item => ({ ...(item.data as CutoffPeriod), db_id: item.id })) || []);
        setOnboardingSessions((onboardingData?.data as any[])?.map(s => ({...s, videos: s.videos.sort((a:any,b:any) => a.order - b.order)})) || []);
        setOnboardingTemplateVideos(templateVideosData?.data || []);
        setCrmPipelines(pipelinesData?.data || []);
        setCrmStages(stagesData?.data || []);
        setCrmFields(fieldsData?.data || []);
        setCrmLeads(crmLeadsData?.data?.map((lead: any) => ({ id: lead.id, consultant_id: lead.consultant_id, stage_id: lead.stage_id, user_id: lead.user_id, name: lead.name, data: lead.data, created_at: lead.created_at, updated_at: lead.updated_at, created_by: lead.created_by, updated_by: lead.updated_by, proposalValue: parseDbCurrency(lead.proposal_value), proposalClosingDate: lead.proposal_closing_date, soldCreditValue: parseDbCurrency(lead.sold_credit_value), soldGroup: lead.sold_group, soldQuota: lead.sold_quota, saleDate: lead.sale_date })) || []);
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

  const addCandidate = async (candidate: Omit<Candidate, 'id' | 'createdAt' | 'db_id'>) => {
    const { data, error } = await supabase.from('candidates').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: candidate }).select().single();
    if (error) throw error;
    const newCandidate = { ...candidate, id: data.id, db_id: data.id, createdAt: data.created_at } as Candidate;
    setCandidates(prev => [newCandidate, ...prev]);
    return newCandidate;
  };

  const updateCandidate = async (id: string, updates: Partial<Candidate>) => {
    const candidate = candidates.find(c => c.id === id || c.db_id === id);
    if (!candidate) return;

    const dbId = candidate.db_id || id;
    const updatedData = { ...candidate, ...updates };
    
    const dataToSave = { ...updatedData };
    delete (dataToSave as any).db_id;
    delete (dataToSave as any).createdAt;
    delete (dataToSave as any).lastUpdatedAt;

    const { error } = await supabase
      .from('candidates')
      .update({ data: dataToSave })
      .eq('id', dbId);

    if (error) throw error;

    const now = new Date().toISOString();
    setCandidates(prev => prev.map(c => (c.id === id || c.db_id === id) ? { ...c, ...updates, lastUpdatedAt: now } : c));
  };

  const deleteCandidate = async (id: string) => {
    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (error) throw error;
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  const addCrmLead = async (lead: Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by' | 'updated_by'>) => {
    const { data, error } = await supabase.from('crm_leads').insert({ ...lead, user_id: JOAO_GESTOR_AUTH_ID, created_by: user!.id }).select().single();
    if (error) throw error;
    const newLead = { id: data.id, consultant_id: data.consultant_id, stage_id: data.stage_id, user_id: data.user_id, name: data.name, data: data.data, created_at: data.created_at, updated_at: data.updated_at, created_by: data.created_by, updated_by: data.updated_by, proposalValue: parseDbCurrency(data.proposal_value), proposalClosingDate: data.proposal_closing_date, soldCreditValue: parseDbCurrency(data.sold_credit_value), soldGroup: data.sold_group, soldQuota: data.sold_quota, saleDate: data.sale_date };
    setCrmLeads(prev => [newLead, ...prev]);
    return newLead;
  };

  const updateCrmLead = async (id: string, updates: Partial<CrmLead>) => {
    const { data, error } = await supabase.from('crm_leads').update({ ...updates, updated_by: user!.id }).eq('id', id).select().single();
    if (error) throw error;
    const updatedLead = { id: data.id, consultant_id: data.consultant_id, stage_id: data.stage_id, user_id: data.user_id, name: data.name, data: data.data, created_at: data.created_at, updated_at: data.updated_at, created_by: data.created_by, updated_by: data.updated_by, proposalValue: parseDbCurrency(data.proposal_value), proposalClosingDate: data.proposal_closing_date, soldCreditValue: parseDbCurrency(data.sold_credit_value), soldGroup: data.sold_group, soldQuota: data.sold_quota, saleDate: data.sale_date };
    setCrmLeads(prev => prev.map(l => l.id === id ? updatedLead : l));
    return updatedLead;
  };

  const deleteCrmLead = async (id: string) => {
    const { error } = await supabase.from('crm_leads').delete().eq('id', id);
    if (error) throw error;
    setCrmLeads(prev => prev.filter(l => l.id !== id));
  };

  const value: AppContextType = {
    isDataLoading, candidates, teamMembers, commissions, supportMaterials, cutoffPeriods, onboardingSessions, onboardingTemplateVideos, checklistStructure, setChecklistStructure, consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs, crmPipelines, crmStages, crmFields, crmLeads, crmOwnerUserId, dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions, weeklyTargets, weeklyTargetItems, weeklyTargetAssignments, metricLogs, supportMaterialsV2, supportMaterialAssignments, leadTasks, gestorTasks, gestorTaskCompletions, financialEntries, formCadastros, formFiles, notifications, teamProductionGoals, theme,
    toggleTheme, updateConfig, resetLocalState, refetchCommissions, calculateCompetenceMonth, isGestorTaskDueOnDate, calculateNotifications,
    addCandidate, updateCandidate, deleteCandidate, getCandidate: useCallback((id: string) => candidates.find(c => c.id === id), [candidates]), 
    toggleChecklistItem: async (candidateId, itemId) => {
      const candidate = candidates.find(c => c.id === candidateId);
      if (!candidate) return;
      const currentProgress = candidate.checklistProgress || {};
      const currentState = currentProgress[itemId] || { completed: false };
      const newProgress = { ...currentProgress, [itemId]: { ...currentState, completed: !currentState.completed } };
      await updateCandidate(candidateId, { checklistProgress: newProgress });
    },
    setChecklistDueDate: async (candidateId, itemId, dueDate) => {
      const candidate = candidates.find(c => c.id === candidateId);
      if (!candidate) return;
      const currentProgress = candidate.checklistProgress || {};
      const currentState = currentProgress[itemId] || { completed: false };
      const newProgress = { ...currentProgress, [itemId]: { ...currentState, dueDate } };
      await updateCandidate(candidateId, { checklistProgress: newProgress });
    },
    toggleConsultantGoal: async (candidateId, goalId) => {
      const candidate = candidates.find(c => c.id === candidateId);
      if (!candidate) return;
      const currentProgress = candidate.consultantGoalsProgress || {};
      const newProgress = { ...currentProgress, [goalId]: !currentProgress[goalId] };
      await updateCandidate(candidateId, { consultantGoalsProgress: newProgress });
    },
    addChecklistItem: (stageId, label) => {
      const newStructure = checklistStructure.map(stage => {
        if (stage.id === stageId) {
          return { ...stage, items: [...stage.items, { id: crypto.randomUUID(), label }] };
        }
        return stage;
      });
      setChecklistStructure(newStructure);
      updateConfig({ checklistStructure: newStructure });
    },
    updateChecklistItem: (stageId, itemId, newLabel) => {
      const newStructure = checklistStructure.map(stage => {
        if (stage.id === stageId) {
          return { ...stage, items: stage.items.map(item => item.id === itemId ? { ...item, label: newLabel } : item) };
        }
        return stage;
      });
      setChecklistStructure(newStructure);
      updateConfig({ checklistStructure: newStructure });
    },
    deleteChecklistItem: (stageId, itemId) => {
      const newStructure = checklistStructure.map(stage => {
        if (stage.id === stageId) {
          return { ...stage, items: stage.items.filter(item => item.id !== itemId) };
        }
        return stage;
      });
      setChecklistStructure(newStructure);
      updateConfig({ checklistStructure: newStructure });
    },
    moveChecklistItem: (stageId, itemId, direction) => {
      const newStructure = checklistStructure.map(stage => {
        if (stage.id === stageId) {
          const index = stage.items.findIndex(i => i.id === itemId);
          if (index === -1) return stage;
          const newItems = [...stage.items];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex >= 0 && targetIndex < newItems.length) {
            [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
          }
          return { ...stage, items: newItems };
        }
        return stage;
      });
      setChecklistStructure(newStructure);
      updateConfig({ checklistStructure: newStructure });
    },
    resetChecklistToDefault: () => {
      setChecklistStructure(DEFAULT_STAGES);
      updateConfig({ checklistStructure: DEFAULT_STAGES });
    },
    addGoalItem: (stageId, label) => {
      const newStructure = consultantGoalsStructure.map(stage => {
        if (stage.id === stageId) {
          return { ...stage, items: [...stage.items, { id: crypto.randomUUID(), label }] };
        }
        return stage;
      });
      setConsultantGoalsStructure(newStructure);
      updateConfig({ consultantGoalsStructure: newStructure });
    },
    updateGoalItem: (stageId, itemId, newLabel) => {
      const newStructure = consultantGoalsStructure.map(stage => {
        if (stage.id === stageId) {
          return { ...stage, items: stage.items.map(item => item.id === itemId ? { ...item, label: newLabel } : item) };
        }
        return stage;
      });
      setConsultantGoalsStructure(newStructure);
      updateConfig({ consultantGoalsStructure: newStructure });
    },
    deleteGoalItem: (stageId, itemId) => {
      const newStructure = consultantGoalsStructure.map(stage => {
        if (stage.id === stageId) {
          return { ...stage, items: stage.items.filter(item => item.id !== itemId) };
        }
        return stage;
      });
      setConsultantGoalsStructure(newStructure);
      updateConfig({ consultantGoalsStructure: newStructure });
    },
    moveGoalItem: (stageId, itemId, direction) => {
      const newStructure = consultantGoalsStructure.map(stage => {
        if (stage.id === stageId) {
          const index = stage.items.findIndex(i => i.id === itemId);
          if (index === -1) return stage;
          const newItems = [...stage.items];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex >= 0 && targetIndex < newItems.length) {
            [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
          }
          return { ...stage, items: newItems };
        }
        return stage;
      });
      setConsultantGoalsStructure(newStructure);
      updateConfig({ consultantGoalsStructure: newStructure });
    },
    resetGoalsToDefault: () => {
      setConsultantGoalsStructure(DEFAULT_GOALS);
      updateConfig({ consultantGoalsStructure: DEFAULT_GOALS });
    },
    updateInterviewSection: (sectionId, updates) => {
      const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, ...updates } : s);
      setInterviewStructure(newStructure);
      updateConfig({ interviewStructure: newStructure });
    },
    addInterviewQuestion: (sectionId, text, points) => {
      const newStructure = interviewStructure.map(s => {
        if (s.id === sectionId) {
          return { ...s, questions: [...s.questions, { id: crypto.randomUUID(), text, points }] };
        }
        return s;
      });
      setInterviewStructure(newStructure);
      updateConfig({ interviewStructure: newStructure });
    },
    updateInterviewQuestion: (sectionId, questionId, updates) => {
      const newStructure = interviewStructure.map(s => {
        if (s.id === sectionId) {
          return { ...s, questions: s.questions.map(q => q.id === questionId ? { ...q, ...updates } : q) };
        }
        return s;
      });
      setInterviewStructure(newStructure);
      updateConfig({ interviewStructure: newStructure });
    },
    deleteInterviewQuestion: (sectionId, questionId) => {
      const newStructure = interviewStructure.map(s => {
        if (s.id === sectionId) {
          return { ...s, questions: s.questions.filter(q => q.id !== questionId) };
        }
        return s;
      });
      setInterviewStructure(newStructure);
      updateConfig({ interviewStructure: newStructure });
    },
    moveInterviewQuestion: (sectionId, questionId, direction) => {
      const newStructure = interviewStructure.map(s => {
        if (s.id === sectionId) {
          const index = s.questions.findIndex(q => q.id === questionId);
          if (index === -1) return s;
          const newQuestions = [...s.questions];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex >= 0 && targetIndex < newQuestions.length) {
            [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
          }
          return { ...s, questions: newQuestions };
        }
        return s;
      });
      setInterviewStructure(newStructure);
      updateConfig({ interviewStructure: newStructure });
    },
    resetInterviewToDefault: () => {
      setInterviewStructure(INITIAL_INTERVIEW_STRUCTURE);
      updateConfig({ interviewStructure: INITIAL_INTERVIEW_STRUCTURE });
    },
    saveTemplate: (itemId, updates) => {
      const newTemplates = { ...templates, [itemId]: { ...templates[itemId], ...updates } };
      setTemplates(newTemplates);
      updateConfig({ templates: newTemplates });
    },
    addOrigin: (newOrigin, type) => {
      if (type === 'sales') {
        const newOrigins = [...salesOrigins, newOrigin];
        setSalesOrigins(newOrigins);
        updateConfig({ salesOrigins: newOrigins });
      } else {
        const newOrigins = [...hiringOrigins, newOrigin];
        setHiringOrigins(newOrigins);
        updateConfig({ hiringOrigins: newOrigins });
      }
    },
    deleteOrigin: (originToDelete, type) => {
      if (type === 'sales') {
        const newOrigins = salesOrigins.filter(o => o !== originToDelete);
        setSalesOrigins(newOrigins);
        updateConfig({ salesOrigins: newOrigins });
      } else {
        const newOrigins = hiringOrigins.filter(o => o !== originToDelete);
        setHiringOrigins(newOrigins);
        updateConfig({ hiringOrigins: newOrigins });
      }
    },
    resetOriginsToDefault: () => {
      setSalesOrigins(DEFAULT_APP_CONFIG_DATA.salesOrigins);
      setHiringOrigins(DEFAULT_APP_CONFIG_DATA.hiringOrigins);
      updateConfig({ salesOrigins: DEFAULT_APP_CONFIG_DATA.salesOrigins, hiringOrigins: DEFAULT_APP_CONFIG_DATA.hiringOrigins });
    },
    addPV: (newPV) => {
      const newPvs = [...pvs, newPV];
      setPvs(newPvs);
      updateConfig({ pvs: newPvs });
    },
    addCommission: async (commission) => { const { error } = await supabase.from('commissions').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: commission }); if (error) throw error; refetchCommissions(); return { success: true }; },
    updateCommission: async (id, updates) => { const { error } = await supabase.from('commissions').update({ data: updates }).eq('id', id); if (error) throw error; refetchCommissions(); },
    deleteCommission: async (id) => { const { error } = await supabase.from('commissions').delete().eq('id', id); if (error) throw error; refetchCommissions(); },
    updateInstallmentStatus: async (commissionId, installmentNumber, newStatus, paidDate, saleType) => {
      const commission = commissions.find(c => c.id === commissionId);
      if (!commission) return;
      const updatedDetails = { ...commission.installmentDetails, [installmentNumber]: { status: newStatus, paidDate, competenceMonth: paidDate ? calculateCompetenceMonth(paidDate) : undefined } };
      await updateCommission(commissionId, { installmentDetails: updatedDetails, status: getOverallStatus(updatedDetails) });
    },
    addCutoffPeriod: async (period) => { const { error } = await supabase.from('cutoff_periods').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: period }); if (error) throw error; const { data } = await supabase.from('cutoff_periods').select('*').eq('user_id', JOAO_GESTOR_AUTH_ID); setCutoffPeriods(data?.map(item => ({ ...(item.data as CutoffPeriod), db_id: item.id })) || []); },
    updateCutoffPeriod: async (id, updates) => { const { error } = await supabase.from('cutoff_periods').update({ data: updates }).eq('id', id); if (error) throw error; const { data } = await supabase.from('cutoff_periods').select('*').eq('user_id', JOAO_GESTOR_AUTH_ID); setCutoffPeriods(data?.map(item => ({ ...(item.data as CutoffPeriod), db_id: item.id })) || []); },
    deleteCutoffPeriod: async (id) => { const { error } = await supabase.from('cutoff_periods').delete().eq('id', id); if (error) throw error; setCutoffPeriods(prev => prev.filter(p => p.db_id !== id)); },
    addOnlineOnboardingSession: async (consultantName) => {
      const { data: sessionData, error: sessionError } = await supabase.from('onboarding_sessions').insert({ user_id: JOAO_GESTOR_AUTH_ID, consultant_name: consultantName }).select().single();
      if (sessionError) throw sessionError;
      const videosToInsert = onboardingTemplateVideos.map(v => ({ session_id: sessionData.id, title: v.title, video_url: v.video_url, order: v.order }));
      const { error: videosError } = await supabase.from('onboarding_videos').insert(videosToInsert);
      if (videosError) throw videosError;
      const { data: fullSession } = await supabase.from('onboarding_sessions').select('*, videos:onboarding_videos(*)').eq('id', sessionData.id).single();
      setOnboardingSessions(prev => [...prev, fullSession]);
    },
    deleteOnlineOnboardingSession: async (sessionId) => {
      const { error } = await supabase.from('onboarding_sessions').delete().eq('id', sessionId);
      if (error) throw error;
      setOnboardingSessions(prev => prev.filter(s => s.id !== sessionId));
    },
    addVideoToTemplate: async (title, video_url) => {
      const order = onboardingTemplateVideos.length > 0 ? Math.max(...onboardingTemplateVideos.map(v => v.order)) + 1 : 0;
      const { data, error } = await supabase.from('onboarding_video_templates').insert({ user_id: JOAO_GESTOR_AUTH_ID, title, video_url, order }).select().single();
      if (error) throw error;
      setOnboardingTemplateVideos(prev => [...prev, data]);
    },
    deleteVideoFromTemplate: async (videoId) => {
      const { error } = await supabase.from('onboarding_video_templates').delete().eq('id', videoId);
      if (error) throw error;
      setOnboardingTemplateVideos(prev => prev.filter(v => v.id !== videoId));
    },
    addCrmPipeline: async (name) => { const { data, error } = await supabase.from('crm_pipelines').insert({ user_id: JOAO_GESTOR_AUTH_ID, name }).select().single(); if (error) throw error; setCrmPipelines(prev => [...prev, data]); return data; },
    updateCrmPipeline: async (id, updates) => { const { data, error } = await supabase.from('crm_pipelines').update(updates).eq('id', id).select().single(); if (error) throw error; setCrmPipelines(prev => prev.map(p => p.id === id ? data : p)); return data; },
    deleteCrmPipeline: async (id) => { const { error } = await supabase.from('crm_pipelines').delete().eq('id', id); if (error) throw error; setCrmPipelines(prev => prev.filter(p => p.id !== id)); },
    addCrmStage: async (stage) => { const { data, error } = await supabase.from('crm_stages').insert({ ...stage, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) throw error; setCrmStages(prev => [...prev, data]); return data; },
    updateCrmStage: async (id, updates) => { const { data, error } = await supabase.from('crm_stages').update(updates).eq('id', id).select().single(); if (error) throw error; setCrmStages(prev => prev.map(s => s.id === id ? data : s)); return data; },
    updateCrmStageOrder: async (orderedStages) => {
      const updates = orderedStages.map((stage, index) => supabase.from('crm_stages').update({ order_index: index }).eq('id', stage.id));
      await Promise.all(updates);
      const { data } = await supabase.from('crm_stages').select('*').eq('user_id', JOAO_GESTOR_AUTH_ID).order('order_index');
      setCrmStages(data || []);
    },
    deleteCrmStage: async (id) => { const { error } = await supabase.from('crm_stages').delete().eq('id', id); if (error) throw error; setCrmStages(prev => prev.filter(s => s.id !== id)); },
    addCrmField: async (field) => { const { data, error } = await supabase.from('crm_fields').insert({ ...field, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) throw error; setCrmFields(prev => [...prev, data]); return data; },
    updateCrmField: async (id, updates) => { const { data, error } = await supabase.from('crm_fields').update(updates).eq('id', id).select().single(); if (error) throw error; setCrmFields(prev => prev.map(f => f.id === id ? data : f)); return data; },
    addCrmLead, updateCrmLead, deleteCrmLead,
    addDailyChecklist: async (title) => { const { data, error } = await supabase.from('daily_checklists').insert({ user_id: JOAO_GESTOR_AUTH_ID, title }).select().single(); if (error) throw error; setDailyChecklists(prev => [...prev, data]); return data; },
    updateDailyChecklist: async (id, updates) => { const { data, error } = await supabase.from('daily_checklists').update(updates).eq('id', id).select().single(); if (error) throw error; setDailyChecklists(prev => prev.map(d => d.id === id ? data : d)); return data; },
    deleteDailyChecklist: async (id) => { const { error } = await supabase.from('daily_checklists').delete().eq('id', id); if (error) throw error; setDailyChecklists(prev => prev.filter(d => d.id !== id)); },
    addDailyChecklistItem: async (daily_checklist_id, text, order_index, resource, audioFile, imageFile) => {
      let finalResource = resource;
      if (audioFile || imageFile) {
        const uploadFile = async (file: File, prefix: string) => {
          const sanitized = sanitizeFilename(file.name);
          const path = `checklist_resources/${prefix}-${Date.now()}-${sanitized}`;
          const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, file);
          if (uploadError) throw uploadError;
          return supabase.storage.from('form_uploads').getPublicUrl(path).data.publicUrl;
        };
        const audioUrl = audioFile ? await uploadFile(audioFile, 'audio') : (resource?.type === 'text_audio' || resource?.type === 'text_audio_image' ? (resource.content as any).audioUrl : undefined);
        const imageUrl = imageFile ? await uploadFile(imageFile, 'image') : (resource?.type === 'text_audio_image' ? (resource.content as any).imageUrl : undefined);
        if (resource?.type === 'text_audio') finalResource = { ...resource, content: { ...(resource.content as any), audioUrl } };
        else if (resource?.type === 'text_audio_image') finalResource = { ...resource, content: { ...(resource.content as any), audioUrl, imageUrl } };
        else if (resource?.type === 'image' || resource?.type === 'pdf' || resource?.type === 'audio') finalResource = { ...resource, content: audioUrl || imageUrl };
      }
      const { data, error } = await supabase.from('daily_checklist_items').insert({ daily_checklist_id, text, order_index, resource: finalResource }).select().single();
      if (error) throw error;
      setDailyChecklistItems(prev => [...prev, data]);
      return data;
    },
    updateDailyChecklistItem: async (id, updates, audioFile, imageFile) => {
      let finalResource = updates.resource;
      if (audioFile || imageFile) {
        const uploadFile = async (file: File, prefix: string) => {
          const sanitized = sanitizeFilename(file.name);
          const path = `checklist_resources/${prefix}-${Date.now()}-${sanitized}`;
          const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, file);
          if (uploadError) throw uploadError;
          return supabase.storage.from('form_uploads').getPublicUrl(path).data.publicUrl;
        };
        const audioUrl = audioFile ? await uploadFile(audioFile, 'audio') : (updates.resource?.type === 'text_audio' || updates.resource?.type === 'text_audio_image' ? (updates.resource.content as any).audioUrl : undefined);
        const imageUrl = imageFile ? await uploadFile(imageFile, 'image') : (updates.resource?.type === 'text_audio_image' ? (updates.resource.content as any).imageUrl : undefined);
        if (updates.resource?.type === 'text_audio') finalResource = { ...updates.resource, content: { ...(updates.resource.content as any), audioUrl } };
        else if (updates.resource?.type === 'text_audio_image') finalResource = { ...updates.resource, content: { ...(updates.resource.content as any), audioUrl, imageUrl } };
        else if (updates.resource?.type === 'image' || updates.resource?.type === 'pdf' || updates.resource?.type === 'audio') finalResource = { ...updates.resource, content: audioUrl || imageUrl };
      }
      const { data, error } = await supabase.from('daily_checklist_items').update({ ...updates, resource: finalResource }).eq('id', id).select().single();
      if (error) throw error;
      setDailyChecklistItems(prev => prev.map(i => i.id === id ? data : i));
      return data;
    },
    deleteDailyChecklistItem: async (id) => { const { error } = await supabase.from('daily_checklist_items').delete().eq('id', id); if (error) throw error; setDailyChecklistItems(prev => prev.filter(i => i.id !== id)); },
    moveDailyChecklistItem: async (checklistId, itemId, direction) => {
      const items = dailyChecklistItems.filter(i => i.daily_checklist_id === checklistId).sort((a, b) => a.order_index - b.order_index);
      const index = items.findIndex(i => i.id === itemId);
      if (index === -1) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return;
      const itemA = items[index]; const itemB = items[targetIndex];
      await Promise.all([supabase.from('daily_checklist_items').update({ order_index: itemB.order_index }).eq('id', itemA.id), supabase.from('daily_checklist_items').update({ order_index: itemA.order_index }).eq('id', itemB.id)]);
      const { data } = await supabase.from('daily_checklist_items').select('*'); setDailyChecklistItems(data || []);
    },
    assignDailyChecklistToConsultant: async (daily_checklist_id, consultant_id) => { 
      const cleanConsultantId = getCleanId(consultant_id);
      const { data, error } = await supabase.from('daily_checklist_assignments').insert({ daily_checklist_id, consultant_id: cleanConsultantId }).select().single(); 
      if (error) throw error; 
      setDailyChecklistAssignments(prev => [...prev, data]); 
      return data; 
    },
    unassignDailyChecklistFromConsultant: async (daily_checklist_id, consultant_id) => { 
      const cleanConsultantId = getCleanId(consultant_id);
      const { error } = await supabase.from('daily_checklist_assignments').delete().eq('daily_checklist_id', daily_checklist_id).eq('consultant_id', cleanConsultantId); 
      if (error) throw error; 
      setDailyChecklistAssignments(prev => prev.filter(a => !(a.daily_checklist_id === daily_checklist_id && a.consultant_id === cleanConsultantId))); 
    },
    toggleDailyChecklistCompletion: async (daily_checklist_item_id, date, done, consultant_id) => {
      const cleanConsultantId = getCleanId(consultant_id);
      const { data, error } = await supabase.from('daily_checklist_completions').upsert({ daily_checklist_item_id, consultant_id: cleanConsultantId, date, done }, { onConflict: 'daily_checklist_item_id,consultant_id,date' }).select().single();
      if (error) throw error;
      setDailyChecklistCompletions(prev => {
        const filtered = prev.filter(c => !(c.daily_checklist_item_id === daily_checklist_item_id && c.consultant_id === cleanConsultantId && c.date === date));
        return [...filtered, data];
      });
    },
    addWeeklyTarget: async (target) => { const { data, error } = await supabase.from('weekly_targets').insert({ ...target, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) throw error; setWeeklyTargets(prev => [...prev, data]); return data; },
    updateWeeklyTarget: async (id, updates) => { const { data, error } = await supabase.from('weekly_targets').update(updates).eq('id', id).select().single(); if (error) throw error; setWeeklyTargets(prev => prev.map(w => w.id === id ? data : w)); return data; },
    deleteWeeklyTarget: async (id) => { const { error } = await supabase.from('weekly_targets').delete().eq('id', id); if (error) throw error; setWeeklyTargets(prev => prev.filter(w => w.id !== id)); },
    addWeeklyTargetItem: async (item) => { const { data, error } = await supabase.from('weekly_target_items').insert(item).select().single(); if (error) throw error; setWeeklyTargetItems(prev => [...prev, data]); return data; },
    updateWeeklyTargetItem: async (id, updates) => { const { data, error } = await supabase.from('weekly_target_items').update(updates).eq('id', id).select().single(); if (error) throw error; setWeeklyTargetItems(prev => prev.map(i => i.id === id ? data : i)); return data; },
    deleteWeeklyTargetItem: async (id) => { const { error } = await supabase.from('weekly_target_items').delete().eq('id', id); if (error) throw error; setWeeklyTargetItems(prev => prev.filter(i => i.id !== id)); },
    updateWeeklyTargetItemOrder: async (orderedItems) => {
      const updates = orderedItems.map((item, index) => supabase.from('weekly_target_items').update({ order_index: index }).eq('id', item.id));
      await Promise.all(updates);
      const { data } = await supabase.from('weekly_target_items').select('*'); setWeeklyTargetItems(data || []);
    },
    assignWeeklyTargetToConsultant: async (weekly_target_id, consultant_id) => { 
      const cleanConsultantId = getCleanId(consultant_id);
      const { data, error } = await supabase.from('weekly_target_assignments').insert({ weekly_target_id, consultant_id: cleanConsultantId }).select().single(); 
      if (error) throw error; 
      setWeeklyTargetAssignments(prev => [...prev, data]); 
      return data; 
    },
    unassignWeeklyTargetFromConsultant: async (weekly_target_id, consultant_id) => { 
      const cleanConsultantId = getCleanId(consultant_id);
      const { error } = await supabase.from('weekly_target_assignments').delete().eq('weekly_target_id', weekly_target_id).eq('consultant_id', cleanConsultantId); 
      if (error) throw error; 
      setWeeklyTargetAssignments(prev => prev.filter(a => !(a.weekly_target_id === weekly_target_id && a.consultant_id === cleanConsultantId))); 
    },
    addMetricLog: async (log) => { const { data, error } = await supabase.from('metric_logs').insert(log).select().single(); if (error) throw error; setMetricLogs(prev => [...prev, data]); return data; },
    updateMetricLog: async (id, updates) => { const { data, error } = await supabase.from('metric_logs').update(updates).eq('id', id).select().single(); if (error) throw error; setMetricLogs(prev => prev.map(m => m.id === id ? data : m)); return data; },
    deleteMetricLog: async (id) => { const { error } = await supabase.from('metric_logs').delete().eq('id', id); if (error) throw error; setMetricLogs(prev => prev.filter(m => m.id !== id)); },
    addSupportMaterialV2: async (material, file) => {
      let content = material.content;
      if (file) {
        const sanitized = sanitizeFilename(file.name);
        const path = `support_materials/${Date.now()}-${sanitized}`;
        const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, file);
        if (uploadError) throw uploadError;
        content = supabase.storage.from('form_uploads').getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await supabase.from('support_materials_v2').insert({ ...material, content, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
      if (error) throw error;
      setSupportMaterialsV2(prev => [...prev, data]);
      return data;
    },
    updateSupportMaterialV2: async (id, updates, file) => {
      let content = updates.content;
      if (file) {
        const sanitized = sanitizeFilename(file.name);
        const path = `support_materials/${Date.now()}-${sanitized}`;
        const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, file);
        if (uploadError) throw uploadError;
        content = supabase.storage.from('form_uploads').getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await supabase.from('support_materials_v2').update({ ...updates, content }).eq('id', id).select().single();
      if (error) throw error;
      setSupportMaterialsV2(prev => prev.map(m => m.id === id ? data : m));
      return data;
    },
    deleteSupportMaterialV2: async (id) => { const { error } = await supabase.from('support_materials_v2').delete().eq('id', id); if (error) throw error; setSupportMaterialsV2(prev => prev.filter(m => m.id !== id)); },
    assignSupportMaterialToConsultant: async (material_id, consultant_id) => { 
      const cleanConsultantId = getCleanId(consultant_id);
      const { data, error } = await supabase.from('support_material_assignments').insert({ material_id, consultant_id: cleanConsultantId }).select().single(); 
      if (error) throw error; 
      setSupportMaterialAssignments(prev => [...prev, data]); 
      return data; 
    },
    unassignSupportMaterialFromConsultant: async (material_id, consultant_id) => { 
      const cleanConsultantId = getCleanId(consultant_id);
      const { error } = await supabase.from('support_material_assignments').delete().eq('material_id', material_id).eq('consultant_id', cleanConsultantId); 
      if (error) throw error; 
      setSupportMaterialAssignments(prev => prev.filter(a => !(a.material_id === material_id && a.consultant_id === cleanConsultantId))); 
    },
    addLeadTask: async (task) => { const { data, error } = await supabase.from('lead_tasks').insert(task).select().single(); if (error) throw error; setLeadTasks(prev => [...prev, data]); return data; },
    updateLeadTask: async (id, updates) => { const { data, error } = await supabase.from('lead_tasks').update(updates).eq('id', id).select().single(); if (error) throw error; setLeadTasks(prev => prev.map(t => t.id === id ? data : t)); return data; },
    deleteLeadTask: async (id) => { const { error } = await supabase.from('lead_tasks').delete().eq('id', id); if (error) throw error; setLeadTasks(prev => prev.filter(t => t.id !== id)); },
    toggleLeadTaskCompletion: async (id, is_completed) => { const { data, error } = await supabase.from('lead_tasks').update({ is_completed, completed_at: is_completed ? new Date().toISOString() : null }).eq('id', id).select().single(); if (error) throw error; setLeadTasks(prev => prev.map(t => t.id === id ? data : t)); return data; },
    updateLeadMeetingInvitationStatus: async (taskId, status) => { const { data, error } = await supabase.from('lead_tasks').update({ manager_invitation_status: status }).eq('id', taskId).select().single(); if (error) throw error; setLeadTasks(prev => prev.map(t => t.id === taskId ? data : t)); return data; },
    addGestorTask: async (task) => { const { data, error } = await supabase.from('gestor_tasks').insert({ ...task, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) throw error; setGestorTasks(prev => [...prev, data]); return data; },
    updateGestorTask: async (id, updates) => { const { data, error } = await supabase.from('gestor_tasks').update(updates).eq('id', id).select().single(); if (error) throw error; setGestorTasks(prev => prev.map(t => t.id === id ? data : t)); return data; },
    deleteGestorTask: async (id) => { const { error } = await supabase.from('gestor_tasks').delete().eq('id', id); if (error) throw error; setGestorTasks(prev => prev.filter(t => t.id !== id)); },
    toggleGestorTaskCompletion: async (gestor_task_id, done, date) => {
      const { data, error } = await supabase.from('gestor_task_completions').upsert({ gestor_task_id, user_id: JOAO_GESTOR_AUTH_ID, date, done }, { onConflict: 'gestor_task_id,user_id,date' }).select().single();
      if (error) throw error;
      setGestorTaskCompletions(prev => {
        const filtered = prev.filter(c => !(c.gestor_task_id === gestor_task_id && c.date === date));
        return [...filtered, data];
      });
    },
    isGestorTaskDueOnDate,
    addFinancialEntry: async (entry) => { const { data, error } = await supabase.from('financial_entries').insert({ ...entry, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) throw error; setFinancialEntries(prev => [...prev, { ...data, amount: parseFloat(data.amount) }]); return data; },
    updateFinancialEntry: async (id, updates) => { const { data, error } = await supabase.from('financial_entries').update(updates).eq('id', id).select().single(); if (error) throw error; setFinancialEntries(prev => prev.map(e => e.id === id ? { ...data, amount: parseFloat(data.amount) } : e)); return data; },
    deleteFinancialEntry: async (id) => { const { error } = await supabase.from('financial_entries').delete().eq('id', id); if (error) throw error; setFinancialEntries(prev => prev.filter(e => e.id !== id)); },
    getFormFilesForSubmission: (submissionId) => formFiles.filter(f => f.submission_id === submissionId),
    updateFormCadastro: async (id, updates) => { const { data, error } = await supabase.from('form_submissions').update(updates).eq('id', id).select().single(); if (error) throw error; setFormCadastros(prev => prev.map(f => f.id === id ? data : f)); return data; },
    deleteFormCadastro: async (id) => { const { error } = await supabase.from('form_submissions').delete().eq('id', id); if (error) throw error; setFormCadastros(prev => prev.filter(f => f.id !== id)); },
    addFeedback: async (personId, feedback) => {
      const candidate = candidates.find(c => c.id === personId);
      if (!candidate) throw new Error("Candidate not found");
      const newFeedback = { ...feedback, id: crypto.randomUUID() };
      const updatedFeedbacks = [...(candidate.feedbacks || []), newFeedback];
      await updateCandidate(personId, { feedbacks: updatedFeedbacks });
      return newFeedback;
    },
    updateFeedback: async (personId, feedback) => {
      const candidate = candidates.find(c => c.id === personId);
      if (!candidate) throw new Error("Candidate not found");
      const updatedFeedbacks = (candidate.feedbacks || []).map(f => f.id === feedback.id ? feedback : f);
      await updateCandidate(personId, { feedbacks: updatedFeedbacks });
      return feedback;
    },
    deleteFeedback: async (personId, feedbackId) => {
      const candidate = candidates.find(c => c.id === personId);
      if (!candidate) return;
      const updatedFeedbacks = (candidate.feedbacks || []).filter(f => f.id !== feedbackId);
      await updateCandidate(personId, { feedbacks: updatedFeedbacks });
    },
    addTeamMemberFeedback: async (teamMemberId, feedback) => {
      const member = teamMembers.find(m => m.id === teamMemberId);
      if (!member) throw new Error("Member not found");
      const newFeedback = { ...feedback, id: crypto.randomUUID() };
      const updatedFeedbacks = [...(member.feedbacks || []), newFeedback];
      await updateTeamMember(teamMemberId, { feedbacks: updatedFeedbacks });
      return newFeedback;
    },
    updateTeamMemberFeedback: async (teamMemberId, feedback) => {
      const member = teamMembers.find(m => m.id === teamMemberId);
      if (!member) throw new Error("Member not found");
      const updatedFeedbacks = (member.feedbacks || []).map(f => f.id === feedback.id ? feedback : f);
      await updateTeamMember(teamMemberId, { feedbacks: updatedFeedbacks });
      return feedback;
    },
    deleteTeamMemberFeedback: async (teamMemberId, feedbackId) => {
      const member = teamMembers.find(m => m.id === teamMemberId);
      if (!member) return;
      const updatedFeedbacks = (member.feedbacks || []).filter(f => f.id !== feedbackId);
      await updateTeamMember(teamMemberId, { feedbacks: updatedFeedbacks });
    },
    addTeamMember: async (member) => {
      const tempPassword = generateRandomPassword();
      const { data: authData, error: authError } = await supabase.functions.invoke('create-or-link-consultant', {
        body: { email: member.email, name: member.name, tempPassword, login: member.cpf, role: 'CONSULTOR' }
      });
      if (authError) throw authError;
      const { data, error } = await supabase.from('team_members').insert({ user_id: JOAO_GESTOR_AUTH_ID, cpf: member.cpf, data: { ...member, id: authData.authUserId } }).select().single();
      if (error) throw error;
      const newMember = { id: authData.authUserId, db_id: data.id, authUserId: authData.authUserId, name: member.name, email: member.email, roles: member.roles, isActive: member.isActive, cpf: member.cpf, dateOfBirth: member.dateOfBirth, user_id: data.user_id };
      setTeamMembers(prev => [...prev, newMember]);
      return { success: true, member: newMember, tempPassword, wasExistingUser: authData.userExists };
    },
    updateTeamMember: async (id, updates) => {
      const member = teamMembers.find(m => m.id === id);
      if (!member) throw new Error("Member not found");
      const { error } = await supabase.from('team_members').update({ data: { ...member, ...updates }, cpf: updates.cpf || member.cpf }).eq('id', member.db_id);
      if (error) throw error;
      setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
      return { success: true };
    },
    deleteTeamMember: async (id) => { const member = teamMembers.find(m => m.id === id); if (!member) return; const { error } = await supabase.from('team_members').delete().eq('id', member.db_id); if (error) throw error; setTeamMembers(prev => prev.filter(m => m.id !== id)); },
    addTeamProductionGoal: async (goal) => { const { data, error } = await supabase.from('team_production_goals').insert({ ...goal, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) throw error; setTeamProductionGoals(prev => [data, ...prev]); return data; },
    updateTeamProductionGoal: async (id, updates) => { const { data, error } = await supabase.from('team_production_goals').update(updates).eq('id', id).select().single(); if (error) throw error; setTeamProductionGoals(prev => prev.map(g => g.id === id ? data : g)); return data; },
    deleteTeamProductionGoal: async (id) => { const { error } = await supabase.from('team_production_goals').delete().eq('id', id); if (error) throw error; setTeamProductionGoals(prev => prev.filter(g => g.id !== id)); },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};

export const useApp = useAppContext;