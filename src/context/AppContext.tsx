import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Candidate, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, Commission, SupportMaterial, GoalStage, TeamMember, InstallmentStatus, InstallmentInfo, CutoffPeriod, OnboardingSession, OnboardingVideoTemplate, CrmPipeline, CrmStage, CrmField, CrmLead, DailyChecklist, DailyChecklistItem, DailyChecklistAssignment, DailyChecklistCompletion, WeeklyTarget, WeeklyTargetItem, WeeklyTargetAssignment, MetricLog, SupportMaterialV2, SupportMaterialAssignment, LeadTask, DailyChecklistItemResource, GestorTask, GestorTaskCompletion, FinancialEntry, FormCadastro, FormFile, Notification, Feedback, TeamProductionGoal, ColdCallLead, ColdCallLog, ConsultantEvent } from '@/types';
import { CHECKLIST_STAGES as DEFAULT_STAGES } from '@/data/checklistData';
import { CONSULTANT_GOALS as DEFAULT_GOALS } from '@/data/consultantGoals';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { generateRandomPassword } from '@/utils/authUtils';
import { sanitizeFilename } from '@/utils/fileUtils';
import toast from 'react-hot-toast';
import { getOverallStatus } from '@/utils/commissionUtils';

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_INTERVIEW_STRUCTURE: InterviewSection[] = [
  { id: 'basicProfile', title: '2. Perfil Básico', maxPoints: 20, questions: [ { id: 'bp_1', text: 'Já trabalhou no modelo PJ? Se não, teria algum impeditivo?', points: 5 }, { id: 'bp_2', text: 'Como você se organizaria para trabalhar nesse modelo?', points: 10 }, { id: 'bp_3', text: 'Tem disponibilidade para começar de imediato?', points: 5 } ] },
  { id: 'commercialSkills', title: '3. Habilidade Comercial', maxPoints: 30, questions: [ { id: 'cs_1', text: 'Já trabalhou com metas? Como foi quando não bateu?', points: 10 }, { id: 'cs_2', text: 'Já teve contato com consórcio/investimentos?', points: 5 }, { id: 'cs_3', text: 'Já trabalhou com CRM?', points: 5 }, { id: 'cs_4', text: 'Demonstra vivência comercial e resiliência?', points: 10 } ] },
  { id: 'behavioralProfile', title: '4. Perfil Comportamental', maxPoints: 30, questions: [ { id: 'bh_1', text: 'Maior desafio até hoje (Exemplo real)?', points: 10 }, { id: 'bh_2', text: 'Metas de vida/carreira definidas?', points: 10 }, { id: 'bh_3', text: 'Clareza na comunicação e nível de energia?', points: 10 } ] },
  { id: 'jobFit', title: '6. Fit com a Vaga', maxPoints: 20, questions: [ { id: 'jf_1', text: 'Perfil empreendedor?', points: 5 }, { id: 'jf_2', text: 'Interesse real pela oportunidade?', points: 5 }, { id: 'jf_3', text: 'Alinhamento com modelo comissionado?', points: 10 } ] }
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

const JOAO_GESTOR_AUTH_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658";

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth(); // Use isAuthLoading from AuthContext
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
  const [hiringOrigins, setHiringOrigins] = useState<string[]>(DEFAULT_APP_CONFIG_DATA.hiringOrigins);
  const [salesOrigins, setSalesOrigins] = useState<string[]>(DEFAULT_APP_CONFIG_DATA.salesOrigins);
  const [interviewers, setInterviewers] = useState<string[]>(DEFAULT_APP_CONFIG_DATA.interviewers);
  const [pvs, setPvs] = useState<string[]>(DEFAULT_APP_CONFIG_DATA.pvs);
  
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

  const [coldCallLeads, setColdCallLeads] = useState<ColdCallLead[]>([]);
  const [coldCallLogs, setColdCallLogs] = useState<ColdCallLog[]>([]);
  const [consultantEvents, setConsultantEvents] = useState<ConsultantEvent[]>([]); // NOVO: Estado para eventos do consultor

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

  const parseDbCurrency = useCallback((value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9,-]+/g, '').replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed; // Default to 0 instead of null
    }
    return 0; // Default to 0 for non-string/non-number values
  }, []);

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
    const competenceDate = new Date(date);
    competenceDate.setMonth(competenceDate.getMonth() + (day <= cutoffDay ? 1 : 2));
    const compYear = competenceDate.getFullYear();
    const compMonth = String(competenceDate.getMonth() + 1).padStart(2, '0');
    return `${compYear}-${compMonth}`;
  }, [cutoffPeriods]);

  const debouncedUpdateConfig = useDebouncedCallback(async (newConfig: any) => {
    if (!user) {
      console.warn("[AppContext] No user authenticated, cannot save config.");
      return;
    }
    const { error } = await supabase.from('app_config').upsert({ user_id: JOAO_GESTOR_AUTH_ID, data: newConfig }, { onConflict: 'user_id' });
    if (error) {
      toast.error(`Erro ao salvar configurações: ${error.message}`);
      return;
    }
    toast.success("Configurações salvas com sucesso!");
  }, 1500);

  const updateConfig = useCallback((updates: any) => {
    if (!user) return;
    const currentConfig = { checklistStructure, consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs };
    debouncedUpdateConfig({ ...currentConfig, ...updates });
  }, [user, checklistStructure, consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs, debouncedUpdateConfig]);

  const resetLocalState = useCallback(() => {
    console.log("[AppContext] resetLocalState called, clearing all data.");
    setCandidates([]); setTeamMembers([]); setCommissions([]); setSupportMaterials([]); setCutoffPeriods([]); setOnboardingSessions([]); setOnboardingTemplateVideos([]);
    setChecklistStructure(DEFAULT_STAGES); setConsultantGoalsStructure(DEFAULT_GOALS); setInterviewStructure(INITIAL_INTERVIEW_STRUCTURE); setTemplates({});
    setHiringOrigins(DEFAULT_APP_CONFIG_DATA.hiringOrigins); setSalesOrigins(DEFAULT_APP_CONFIG_DATA.salesOrigins); setInterviewers(DEFAULT_APP_CONFIG_DATA.interviewers); setPvs(DEFAULT_APP_CONFIG_DATA.pvs);
    setCrmPipelines([]); setCrmStages([]); setCrmFields([]); setCrmLeads([]); setCrmOwnerUserId(null);
    setDailyChecklists([]); setDailyChecklistItems([]); setDailyChecklistAssignments([]); setDailyChecklistCompletions([]);
    setWeeklyTargets([]); setWeeklyTargetItems([]); setWeeklyTargetAssignments([]); setMetricLogs([]);
    setSupportMaterialsV2([]); setSupportMaterialAssignments([]); setLeadTasks([]); setGestorTasks([]); setGestorTaskCompletions([]); setFinancialEntries([]);
    setFormCadastros([]); setFormFiles([]); setNotifications([]); setTeamProductionGoals([]);
    setColdCallLeads([]); setColdCallLogs([]); setConsultantEvents([]);
    setIsDataLoading(false);
  }, []);

  const refetchCommissions = useCallback(async () => {
    if (!user || isFetchingRef.current) return;
    const allowedRoles = ['GESTOR', 'ADMIN', 'SECRETARIA'];
    if (!allowedRoles.includes(user.role)) {
      setCommissions([]);
      return;
    }

    isFetchingRef.current = true;
    try {
      console.log("[AppContext] Fetching commissions...");
      const { data, error } = await supabase
        .from("commissions")
        .select("id, data, created_at")
        .order("created_at", { ascending: false }); 
      if (error) {
        console.error(`[AppContext] Error loading commissions: ${error.message}`);
        toast.error(`Erro ao carregar comissões: ${error.message}`);
        setCommissions([]);
        return;
      }
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
      console.log("[AppContext] Commissions fetched:", normalized.length);
    } finally {
      setTimeout(() => { isFetchingRef.current = false; }, 100);
    }
  }, [user]);

  const refetchTeamMembers = useCallback(async () => {
    // Se não houver sessão, não faz nada
    if (!user) {
      setTeamMembers([]);
      return;
    }
    try {
      // Tentar via Edge Function primeiro (se papel permitir)
      const role = user.role?.toUpperCase?.() || 'CONSULTOR';
      let loaded = false;
      if (['GESTOR', 'ADMIN', 'SECRETARIA'].includes(role)) {
        const { data: tmFx, error: tmFxErr } = await supabase.functions.invoke('get-team-members');
        if (!tmFxErr && tmFx?.ok) {
          const fxTeamMembers = tmFx.team_members || [];
          const normalized = (fxTeamMembers || []).map((item: any) => {
            const data = item.data as any;
            const dbId = item.id;
            const authId = data.id || data.authUserId || null;
            return {
              id: dbId,
              db_id: dbId,
              authUserId: authId,
              name: String(data.name || ''),
              email: data.email,
              roles: Array.isArray(data.roles) ? data.roles.map((r: string) => r.toUpperCase()) : [],
              isActive: data.isActive !== false,
              hasLogin: !!authId,
              isLegacy: !authId,
              cpf: item.cpf,
              dateOfBirth: data.dateOfBirth,
              user_id: item.user_id
            } as TeamMember;
          });
          setTeamMembers(normalized);
          loaded = true;
        }
      }
      // Fallback: consulta direta (RLS limita; consultor verá a própria linha)
      if (!loaded) {
        const { data, error } = await supabase
          .from('team_members')
          .select('id, data, cpf, user_id');
        if (error) throw error;
        const normalized = (data || []).map((item: any) => {
          const d = item.data as any;
          const dbId = item.id;
          const authId = d.id || d.authUserId || null;
          return {
            id: dbId,
            db_id: dbId,
            authUserId: authId,
            name: String(d.name || ''),
            email: d.email,
            roles: Array.isArray(d.roles) ? d.roles.map((r: string) => r.toUpperCase()) : [],
            isActive: d.isActive !== false,
            hasLogin: !!authId,
            isLegacy: !authId,
            cpf: item.cpf,
            dateOfBirth: d.dateOfBirth,
            user_id: item.user_id
          } as TeamMember;
        });
        setTeamMembers(normalized);
      }
    } catch (e: any) {
      console.error('[AppContext] refetchTeamMembers error:', e?.message || e);
      toast.error(`Erro ao recarregar membros da equipe: ${e?.message || 'desconhecido'}`);
      setTeamMembers([]);
    }
  }, [user]);

  // Pré-carregar membros da equipe assim que o usuário for identificado
  useEffect(() => {
    if (!user?.id) {
      return;
    }
    refetchTeamMembers().catch(err => {
      console.warn('[AppContext] quick team_members prefetch failed:', err?.message || err);
    });
  }, [user?.id, refetchTeamMembers]);

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

  const fetchAppConfig = useCallback(async (effectiveGestorId: string) => {
    console.log("[AppContext] fetchAppConfig started for user:", effectiveGestorId);
    const { data: configRow, error: configError } = await supabase.from('app_config').select('data').eq('user_id', effectiveGestorId).maybeSingle();
    if (configError) {
      console.error(`[AppContext] Error fetching app config: ${configError.message}`);
      toast.error(`Erro ao carregar configurações do aplicativo: ${configError.message}`);
      throw configError;
    }
    if (configRow && configRow.data) {
      const appConfigData = configRow.data;
      setChecklistStructure(appConfigData.checklistStructure || DEFAULT_STAGES);
      setConsultantGoalsStructure(appConfigData.consultantGoalsStructure || DEFAULT_GOALS);
      setInterviewStructure(appConfigData.interviewStructure || INITIAL_INTERVIEW_STRUCTURE);
      setTemplates(appConfigData.templates || {});
      setSalesOrigins(appConfigData.salesOrigins || DEFAULT_APP_CONFIG_DATA.salesOrigins);
      setHiringOrigins(appConfigData.hiringOrigins !== undefined ? appConfigData.hiringOrigins : DEFAULT_APP_CONFIG_DATA.hiringOrigins);
      setPvs(appConfigData.pvs || []);
    } else {
      setChecklistStructure(DEFAULT_STAGES);
      setConsultantGoalsStructure(DEFAULT_GOALS);
      setInterviewStructure(INITIAL_INTERVIEW_STRUCTURE);
      setTemplates({});
      setSalesOrigins(DEFAULT_APP_CONFIG_DATA.salesOrigins);
      setHiringOrigins(DEFAULT_APP_CONFIG_DATA.hiringOrigins);
      setPvs([]);
    }
    console.log("[AppContext] fetchAppConfig completed for user:", effectiveGestorId);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async (userId: string) => {
      console.log(`[AppContext.fetchData] Starting fetch for user: ${userId}`);
      setIsDataLoading(true); // Ensure loading state is true at the start of fetch
      try {
        const effectiveGestorId = JOAO_GESTOR_AUTH_ID;
        const currentCrmOwnerId = (user?.role === 'GESTOR' || user?.role === 'ADMIN') ? userId : effectiveGestorId;
        setCrmOwnerUserId(currentCrmOwnerId);
        console.log("[AppContext] crmOwnerUserId set to:", currentCrmOwnerId);

        await fetchAppConfig(effectiveGestorId);

        // NOVO: Para GESTOR/ADMIN/SECRETARIA, buscar datasets críticos via edge function (bypass seguro de RLS)
        const shouldUseFx = !!user && ['GESTOR', 'ADMIN', 'SECRETARIA'].includes(user.role);
        let fxCrmLeads: any[] | null = null;
        let fxLeadTasks: any[] | null = null;
        let fxCandidates: any[] | null = null;
        let fxColdCallLeads: any[] | null = null;
        let fxColdCallLogs: any[] | null = null;

        if (shouldUseFx) {
          console.log("[AppContext] Invoking get-manager-dashboard edge function...");
          const { data: fxData, error: fxError } = await supabase.functions.invoke('get-manager-dashboard');
          if (fxError) {
            console.error("[AppContext] get-manager-dashboard error:", fxError);
          } else if (fxData?.ok) {
            fxCrmLeads = fxData.crm_leads || [];
            fxLeadTasks = fxData.lead_tasks || [];
            fxCandidates = fxData.candidates || [];
            console.log(`[AppContext] get-manager-dashboard returned leads=${fxCrmLeads.length}, tasks=${fxLeadTasks.length}, candidates=${fxCandidates.length}`);
          }

          // NOVO: Buscar membros da equipe via edge function para contornar RLS
          console.log("[AppContext] Invoking get-team-members edge function...");
          const { data: tmFx, error: tmFxErr } = await supabase.functions.invoke('get-team-members');
          if (tmFxErr) {
            console.error("[AppContext] get-team-members error:", tmFxErr);
          } else if (tmFx?.ok) {
            (window as any).__fxTeamMembers = tmFx.team_members || [];
            console.log(`[AppContext] get-team-members returned team_members=${(window as any).__fxTeamMembers.length}`);
          }

          // NOVO: Carregar dados de Cold Call via edge function (bypass seguro de RLS)
          console.log("[AppContext] Invoking get-cold-call-data edge function...");
          const { data: coldFx, error: coldFxErr } = await supabase.functions.invoke('get-cold-call-data');
          if (coldFxErr) {
            console.error("[AppContext] get-cold-call-data error:", coldFxErr);
          } else if (coldFx?.ok) {
            fxColdCallLeads = coldFx.cold_call_leads || [];
            fxColdCallLogs = coldFx.cold_call_logs || [];
            console.log(`[AppContext] get-cold-call-data returned leads=${fxColdCallLeads.length}, logs=${fxColdCallLogs.length}`);
          }
        }

        // Fetch data that is globally configured by JOAO_GESTOR_AUTH_ID or has RLS handled
        const [
          materialsRes, cutoffRes, onboardingRes, templateVideosRes,
          pipelinesRes, stagesRes, fieldsRes, crmLeadsRes,
          dailyChecklistsRes, dailyChecklistItemsRes, dailyChecklistAssignmentsRes, dailyChecklistCompletionsRes,
          weeklyTargetsRes, weeklyTargetItemsRes, weeklyTargetAssignmentsRes, metricLogsRes,
          supportMaterialsV2Res, supportMaterialAssignmentsV2Res,
          leadTasksRes, gestorTasksRes, gestorTaskCompletionsRes, financialEntriesRes,
          notificationsRes, teamProductionGoalsRes, teamMembersRes,
          coldCallLeadsRes, coldCallLogsRes, consultantEventsRes,
          candidatesRes,
          formSubmissionsRes
        ] = await Promise.all([
          supabase.from('support_materials').select('id, data'),
          supabase.from('cutoff_periods').select('id, data').eq('user_id', effectiveGestorId),
          supabase.from('onboarding_sessions').select('*, videos:onboarding_videos(*)').eq('user_id', effectiveGestorId),
          supabase.from('onboarding_video_templates').select('*').eq('user_id', effectiveGestorId).order('order', { ascending: true }),
          supabase.from('crm_pipelines').select('*').eq('user_id', effectiveGestorId),
          supabase.from('crm_stages').select('*').eq('user_id', effectiveGestorId).order('order_index'),
          supabase.from('crm_fields').select('*').eq('user_id', effectiveGestorId),
          supabase.from('crm_leads').select('*').order('created_at', { ascending: false }),
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
          supabase.from('gestor_tasks').select('*').eq('user_id', userId),
          supabase.from('gestor_task_completions').select('*').eq('user_id', userId),
          supabase.from('financial_entries').select('*').eq('user_id', userId),
          supabase.from('notifications').select('*').eq('user_id', userId).eq('is_read', false).order('created_at', { ascending: false }),
          supabase.from('team_production_goals').select('*').eq('user_id', effectiveGestorId).order('start_date', { ascending: false }),
          supabase.from('team_members').select('id, data, cpf, user_id'),
          supabase.from('cold_call_leads').select('id, user_id, name, phone, email, current_stage, notes, crm_lead_id, created_at, updated_at', { count: 'exact' }).range(0, 99999).limit(100000),
          supabase.from('cold_call_logs').select('id, cold_call_lead_id, user_id, start_time, end_time, duration_seconds, result, meeting_date, meeting_time, meeting_modality, meeting_notes, created_at', { count: 'exact' }).range(0, 99999).limit(100000),
          supabase.from('consultant_events').select('*'),
          supabase.from('candidates').select('id, data, created_at, last_updated_at').eq('user_id', effectiveGestorId),
          supabase.from('form_submissions').select('id, submission_date, data, internal_notes, is_complete').eq('user_id', effectiveGestorId).order('submission_date', { ascending: false }),
        ]);

        // --- Handle Candidates (preferir Edge Function, se disponível) ---
        if (fxCandidates) {
          const normalizedCandidates = (fxCandidates || []).map((item: any) => {
            const candidateData = item.data;
            return {
              ...candidateData,
              id: (candidateData as any).id || crypto.randomUUID(),
              db_id: item.id,
              createdAt: item.created_at,
              lastUpdatedAt: item.last_updated_at,
              contactedDate: candidateData.contactedDate,
              interviewScheduledDate: candidateData.interviewScheduledDate,
              interviewConductedDate: candidateData.interviewConductedDate,
              awaitingPreviewDate: candidateData.awaitingPreviewDate,
              onboardingOnlineDate: candidateData.onboardingOnlineDate,
              integrationPresencialDate: candidateData.integrationPresencialDate,
              acompanhamento90DiasDate: candidateData.acompanhamento90DiasDate,
              authorizedDate: candidateData.authorizedDate,
              reprovadoDate: candidateData.reprovadoDate,
              disqualifiedDate: candidateData.disqualifiedDate,
              faltouDate: candidateData.faltouDate,
              noResponseDate: candidateData.noResponseDate,
              interviewStartTime: candidateData.interviewStartTime,
              interviewEndTime: candidateData.interviewEndTime,
            };
          });
          setCandidates(normalizedCandidates);
        } else {
          if (candidatesRes.error) { console.error(`[AppContext] Error loading candidates: ${candidatesRes.error.message}`); setCandidates([]); }
          else {
            const normalizedCandidates = (candidatesRes.data || []).map(item => {
              const candidateData = item.data as any;
              return {
                ...candidateData,
                id: candidateData.id || crypto.randomUUID(),
                db_id: item.id,
                createdAt: item.created_at,
                lastUpdatedAt: item.last_updated_at,
              };
            });
            setCandidates(normalizedCandidates);
          }
        }

        // --- Handle CRM Leads (preferir Edge Function, se disponível) ---
        if (fxCrmLeads) {
          setCrmLeads(
            fxCrmLeads.map((lead: any) => ({
              id: lead.id,
              consultant_id: lead.consultant_id,
              stage_id: lead.stage_id,
              user_id: lead.user_id,
              name: lead.name,
              data: lead.data,
              created_at: lead.created_at,
              updated_at: lead.updated_at,
              created_by: lead.created_by,
              updated_by: lead.updated_by,
              proposal_value: parseDbCurrency(lead.proposal_value),
              proposal_closing_date: lead.proposal_closing_date,
              sold_credit_value: parseDbCurrency(lead.sold_credit_value),
              sold_group: lead.sold_group,
              sold_quota: lead.sold_quota,
              sale_date: lead.sale_date,
            }))
          );
        } else {
          if (crmLeadsRes.error) { console.error(`[AppContext] Error loading CRM leads: ${crmLeadsRes.error.message}`); setCrmLeads([]); }
          else {
            setCrmLeads(crmLeadsRes.data?.map((lead: any) => ({
              id: lead.id,
              consultant_id: lead.consultant_id,
              stage_id: lead.stage_id,
              user_id: lead.user_id,
              name: lead.name,
              data: lead.data,
              created_at: lead.created_at,
              updated_at: lead.updated_at,
              created_by: lead.created_by,
              updated_by: lead.updated_by,
              proposal_value: parseDbCurrency(lead.proposal_value),
              proposal_closing_date: lead.proposal_closing_date,
              sold_credit_value: parseDbCurrency(lead.sold_credit_value),
              sold_group: lead.sold_group,
              sold_quota: lead.sold_quota,
              sale_date: lead.sale_date,
            })) || []);
          }
        }

        // --- Handle Lead Tasks (preferir Edge Function, se disponível) ---
        if (fxLeadTasks) {
          setLeadTasks(fxLeadTasks);
        } else {
          if (leadTasksRes.error) { console.error(`[AppContext] Error loading lead tasks: ${leadTasksRes.error.message}`); setLeadTasks([]); }
          else { setLeadTasks(leadTasksRes.data || []); }
        }

        // --- Handle Other Data (RLS-dependent) ---
        if (materialsRes.error) { console.error(`[AppContext] Error loading support materials: ${materialsRes.error.message}`); toast.error(`Erro ao carregar materiais de apoio: ${materialsRes.error.message}`); setSupportMaterials([]); }
        else { setSupportMaterials(materialsRes.data?.map(item => ({ ...(item.data as SupportMaterial), db_id: item.id })) || []); console.log("[AppContext] Support Materials fetched:", (materialsRes.data || []).length); }

        if (cutoffRes.error) { console.error(`[AppContext] Error loading cutoff periods: ${cutoffRes.error.message}`); toast.error(`Erro ao carregar períodos de corte: ${cutoffRes.error.message}`); setCutoffPeriods([]); }
        else { setCutoffPeriods(cutoffRes.data?.map(item => ({ ...(item.data as CutoffPeriod), db_id: item.id })) || []); console.log("[AppContext] Cutoff Periods fetched:", (cutoffRes.data || []).length); }

        if (onboardingRes.error) { console.error(`[AppContext] Error loading onboarding sessions: ${onboardingRes.error.message}`); toast.error(`Erro ao carregar sessões de onboarding: ${onboardingRes.error.message}`); setOnboardingSessions([]); }
        else { setOnboardingSessions((onboardingRes.data as any[])?.map(s => ({...s, videos: s.videos.sort((a:any,b:any) => a.order - b.order)})) || []); console.log("[AppContext] Onboarding Sessions fetched:", (onboardingRes.data || []).length); }

        if (templateVideosRes.error) { console.error(`[AppContext] Error loading video templates: ${templateVideosRes.error.message}`); toast.error(`Erro ao carregar templates de vídeo: ${templateVideosRes.error.message}`); setOnboardingTemplateVideos([]); }
        else { setOnboardingTemplateVideos(templateVideosRes.data || []); console.log("[AppContext] Onboarding Video Templates fetched:", (templateVideosRes.data || []).length); }

        if (pipelinesRes.error) { console.error(`[AppContext] Error loading CRM pipelines: ${pipelinesRes.error.message}`); toast.error(`Erro ao carregar pipelines do CRM: ${pipelinesRes.error.message}`); setCrmPipelines([]); }
        else { setCrmPipelines(pipelinesRes.data || []); console.log("[AppContext] CRM Pipelines fetched:", (pipelinesRes.data || []).length); }

        if (stagesRes.error) { console.error(`[AppContext] Error loading CRM stages: ${stagesRes.error.message}`); toast.error(`Erro ao carregar etapas do CRM: ${stagesRes.error.message}`); setCrmStages([]); }
        else { setCrmStages(stagesRes.data || []); console.log("[AppContext] CRM Stages fetched:", (stagesRes.data || []).length); }

        if (fieldsRes.error) { console.error(`[AppContext] Error loading CRM fields: ${fieldsRes.error.message}`); toast.error(`Erro ao carregar campos do CRM: ${fieldsRes.error.message}`); setCrmFields([]); }
        else { setCrmFields(fieldsRes.data || []); console.log("[AppContext] CRM Fields fetched:", (fieldsRes.data || []).length); }

        if (crmLeadsRes.error) { console.error(`[AppContext] Error loading CRM leads: ${crmLeadsRes.error.message}`); toast.error(`Erro ao carregar leads do CRM: ${crmLeadsRes.error.message}`); setCrmLeads([]); }
        else {
          setCrmLeads(crmLeadsRes.data?.map((lead: any) => ({
            id: lead.id,
            consultant_id: lead.consultant_id,
            stage_id: lead.stage_id,
            user_id: lead.user_id,
            name: lead.name,
            data: lead.data,
            created_at: lead.created_at,
            updated_at: lead.updated_at,
            created_by: lead.created_by,
            updated_by: lead.updated_by,
            proposal_value: parseDbCurrency(lead.proposal_value),
            proposal_closing_date: lead.proposal_closing_date,
            sold_credit_value: parseDbCurrency(lead.sold_credit_value),
            sold_group: lead.sold_group,
            sold_quota: lead.sold_quota,
            sale_date: lead.sale_date,
          })) || []);
          console.log("[AppContext] CRM Leads fetched:", (crmLeadsRes.data || []).length);
        }

        if (dailyChecklistsRes.error) { console.error(`[AppContext] Error loading daily checklists: ${dailyChecklistsRes.error.message}`); toast.error(`Erro ao carregar checklists diários: ${dailyChecklistsRes.error.message}`); setDailyChecklists([]); }
        else { setDailyChecklists(dailyChecklistsRes.data || []); console.log("[AppContext] Daily Checklists fetched:", (dailyChecklistsRes.data || []).length); }

        if (dailyChecklistItemsRes.error) { console.error(`[AppContext] Error loading daily checklist items: ${dailyChecklistItemsRes.error.message}`); toast.error(`Erro ao carregar itens do checklist diário: ${dailyChecklistItemsRes.error.message}`); setDailyChecklistItems([]); }
        else { setDailyChecklistItems(dailyChecklistItemsRes.data || []); console.log("[AppContext] Daily Checklist Items fetched:", (dailyChecklistItemsRes.data || []).length); }

        if (dailyChecklistAssignmentsRes.error) { console.error(`[AppContext] Error loading daily checklist assignments: ${dailyChecklistAssignmentsRes.error.message}`); toast.error(`Erro ao carregar atribuições do checklist diário: ${dailyChecklistAssignmentsRes.error.message}`); setDailyChecklistAssignments([]); }
        else { setDailyChecklistAssignments(dailyChecklistAssignmentsRes.data || []); console.log("[AppContext] Daily Checklist Assignments fetched:", (dailyChecklistAssignmentsRes.data || []).length); }

        if (dailyChecklistCompletionsRes.error) { console.error(`[AppContext] Error loading daily checklist completions: ${dailyChecklistCompletionsRes.error.message}`); toast.error(`Erro ao carregar conclusões do checklist diário: ${dailyChecklistCompletionsRes.error.message}`); setDailyChecklistCompletions([]); }
        else { setDailyChecklistCompletions(dailyChecklistCompletionsRes.data || []); console.log("[AppContext] Daily Checklist Completions fetched:", (dailyChecklistCompletionsRes.data || []).length); }

        if (weeklyTargetsRes.error) { console.error(`[AppContext] Error loading weekly targets: ${weeklyTargetsRes.error.message}`); toast.error(`Erro ao carregar metas semanais: ${weeklyTargetsRes.error.message}`); setWeeklyTargets([]); }
        else { setWeeklyTargets(weeklyTargetsRes.data || []); console.log("[AppContext] Weekly Targets fetched:", (weeklyTargetsRes.data || []).length); }

        if (weeklyTargetItemsRes.error) { console.error(`[AppContext] Error loading weekly target items: ${weeklyTargetItemsRes.error.message}`); toast.error(`Erro ao carregar itens de metas semanais: ${weeklyTargetItemsRes.error.message}`); setWeeklyTargetItems([]); }
        else { setWeeklyTargetItems(weeklyTargetItemsRes.data || []); console.log("[AppContext] Weekly Target Items fetched:", (weeklyTargetItemsRes.data || []).length); }

        if (weeklyTargetAssignmentsRes.error) { console.error(`[AppContext] Error loading weekly target assignments: ${weeklyTargetAssignmentsRes.error.message}`); toast.error(`Erro ao carregar atribuições de metas semanais: ${weeklyTargetAssignmentsRes.error.message}`); setWeeklyTargetAssignments([]); }
        else { setWeeklyTargetAssignments(weeklyTargetAssignmentsRes.data || []); console.log("[AppContext] Weekly Target Assignments fetched:", (weeklyTargetAssignmentsRes.data || []).length); }

        if (metricLogsRes.error) { console.error(`[AppContext] Error loading metric logs: ${metricLogsRes.error.message}`); toast.error(`Erro ao carregar logs de métricas: ${metricLogsRes.error.message}`); setMetricLogs([]); }
        else { setMetricLogs(metricLogsRes.data || []); console.log("[AppContext] Metric Logs fetched:", (metricLogsRes.data || []).length); }

        if (supportMaterialsV2Res.error) { console.error(`[AppContext] Error loading support materials v2: ${supportMaterialsV2Res.error.message}`); toast.error(`Erro ao carregar materiais de apoio v2: ${supportMaterialsV2Res.error.message}`); setSupportMaterialsV2([]); }
        else { setSupportMaterialsV2(supportMaterialsV2Res.data || []); console.log("[AppContext] Support Materials V2 fetched:", (supportMaterialsV2Res.data || []).length); }

        if (supportMaterialAssignmentsV2Res.error) { console.error(`[AppContext] Error loading support material assignments: ${supportMaterialAssignmentsV2Res.error.message}`); toast.error(`Erro ao carregar atribuições de materiais de apoio: ${supportMaterialAssignmentsV2Res.error.message}`); setSupportMaterialAssignments([]); }
        else { setSupportMaterialAssignments(supportMaterialAssignmentsV2Res.data || []); console.log("[AppContext] Support Material Assignments fetched:", (supportMaterialAssignmentsV2Res.data || []).length); }

        if (leadTasksRes.error) { console.error(`[AppContext] Error loading lead tasks: ${leadTasksRes.error.message}`); toast.error(`Erro ao carregar tarefas de lead: ${leadTasksRes.error.message}`); setLeadTasks([]); }
        else { setLeadTasks(leadTasksRes.data || []); console.log("[AppContext] Lead Tasks fetched:", (leadTasksRes.data || []).length); }

        if (gestorTasksRes.error) { console.error(`[AppContext] Error loading gestor tasks: ${gestorTasksRes.error.message}`); toast.error(`Erro ao carregar tarefas do gestor: ${gestorTasksRes.error.message}`); setGestorTasks([]); }
        else { setGestorTasks(gestorTasksRes.data || []); console.log("[AppContext] Gestor Tasks fetched:", (gestorTasksRes.data || []).length); }

        if (gestorTaskCompletionsRes.error) { console.error(`[AppContext] Error loading gestor task completions: ${gestorTaskCompletionsRes.error.message}`); toast.error(`Erro ao carregar conclusões de tarefas do gestor: ${gestorTaskCompletionsRes.error.message}`); setGestorTaskCompletions([]); }
        else { setGestorTaskCompletions(gestorTaskCompletionsRes.data || []); console.log("[AppContext] Gestor Task Completions fetched:", (gestorTaskCompletionsRes.data || []).length); }

        if (financialEntriesRes.error) { console.error(`[AppContext] Error loading financial entries: ${financialEntriesRes.error.message}`); toast.error(`Erro ao carregar entradas financeiras: ${financialEntriesRes.error.message}`); setFinancialEntries([]); }
        else {
          setFinancialEntries(financialEntriesRes.data?.map((entry: any) => ({
            id: entry.id, db_id: entry.id, user_id: entry.user_id, entry_date: entry.entry_date, type: entry.type, description: entry.description, amount: parseFloat(entry.amount || '0'), created_at: entry.created_at
          })) || []);
          console.log("[AppContext] Financial Entries fetched:", (financialEntriesRes.data || []).length);
        }

        // Duplicate handling for form submissions (keep behavior)
        if (formSubmissionsRes.error) { console.error(`[AppContext] Error loading form submissions: ${formSubmissionsRes.error.message}`); toast.error(`Erro ao carregar cadastros de formulário: ${formSubmissionsRes.error.message}`); setFormCadastros([]); }
        else { setFormCadastros(formSubmissionsRes.data || []); console.log("[AppContext] Form Cadastros fetched:", (formSubmissionsRes.data || []).length); }

        // Now fetch formFiles based on fetched formCadastros
        const currentSubmissionIds = formSubmissionsRes.data?.map(f => f.id) || [];
        const { data: fetchedFormFilesData, error: formFilesError } = await supabase.from('form_files').select('*').in('submission_id', currentSubmissionIds);
        if (formFilesError) { console.error(`[AppContext] Error loading form files: ${formFilesError.message}`); toast.error(`Erro ao carregar arquivos de formulário: ${formFilesError.error}`); setFormFiles([]); }
        else { setFormFiles(fetchedFormFilesData || []); console.log("[AppContext] Form Files fetched:", (fetchedFormFilesData || []).length); }

        if (!isMounted) {
          console.log("[AppContext.fetchData] Component unmounted during fetch, skipping state updates.");
          return;
        }

        // --- Handle Team Members ---
        const fxTeamMembers: any[] | null = (window as any).__fxTeamMembers || null;
        if (fxTeamMembers) {
          const normalizedTeamMembers = (fxTeamMembers || []).map((item: any) => {
            const data = item.data as any;
            const dbId = item.id;
            const authId = data.id || data.authUserId || null;
            return { 
              id: dbId, db_id: dbId, authUserId: authId, name: String(data.name || ''), email: data.email, 
              roles: Array.isArray(data.roles) ? data.roles.map((role: string) => role.toUpperCase()) : [],
              isActive: data.isActive !== false, 
              hasLogin: !!authId, isLegacy: !authId, cpf: item.cpf, dateOfBirth: data.dateOfBirth, user_id: item.user_id 
            };
          });
          setTeamMembers(normalizedTeamMembers);
          // Limpar armazenamento temporário
          delete (window as any).__fxTeamMembers;
        } else if (teamMembersRes.error) {
          console.error(`[AppContext] Error loading team members: ${teamMembersRes.error.message}`);
          toast.error(`Erro ao carregar membros da equipe: ${teamMembersRes.error.message}`);
          setTeamMembers([]);
        } else {
          const normalizedTeamMembers = (teamMembersRes.data || []).map(item => {
            const data = item.data as any;
            const dbId = item.id;
            const authId = data.id || data.authUserId || null;
            return { 
              id: dbId, db_id: dbId, authUserId: authId, name: String(data.name || ''), email: data.email, 
              roles: Array.isArray(data.roles) ? data.roles.map((role: string) => role.toUpperCase()) : [],
              isActive: data.isActive !== false, 
              hasLogin: !!authId, isLegacy: !authId, cpf: item.cpf, dateOfBirth: data.dateOfBirth, user_id: item.user_id 
            };
          });
          setTeamMembers(normalizedTeamMembers);
          console.log("[AppContext] Team Members fetched:", normalizedTeamMembers.length);
        }

        if (notificationsRes.error) { console.error(`[AppContext] Error loading notifications: ${notificationsRes.error.message}`); toast.error(`Erro ao carregar notificações: ${notificationsRes.error.message}`); setNotifications([]); }
        else { setNotifications(notificationsRes.data || []); console.log("[AppContext] Notifications fetched:", (notificationsRes.data || []).length); }

        if (teamProductionGoalsRes.error) { console.error(`[AppContext] Error loading team production goals: ${teamProductionGoalsRes.error.message}`); toast.error(`Erro ao carregar metas da equipe: ${teamProductionGoalsRes.error.message}`); setTeamProductionGoals([]); }
        else { setTeamProductionGoals(teamProductionGoalsRes.data || []); console.log("[AppContext] Team Production Goals fetched:", (teamProductionGoalsRes.data || []).length); }
        
        if (fxColdCallLeads) {
          setColdCallLeads(fxColdCallLeads);
          console.log("[AppContext] Cold Call Leads loaded from edge function:", fxColdCallLeads.length);
        } else if (coldCallLeadsRes.error) { 
          console.error(`[AppContext] Error loading cold call leads: ${coldCallLeadsRes.error.message}`); 
          toast.error(`Erro ao carregar leads de cold call: ${coldCallLeadsRes.error.message}`); 
          setColdCallLeads([]); 
        } else { 
          setColdCallLeads(coldCallLeadsRes.data || []); 
          console.log("[AppContext] Cold Call Leads fetched:", (coldCallLeadsRes.data || []).length, "Count:", coldCallLeadsRes.count);
        }

        if (fxColdCallLogs) {
          setColdCallLogs(fxColdCallLogs);
          console.log("[AppContext] Cold Call Logs loaded from edge function:", fxColdCallLogs.length);
        } else if (coldCallLogsRes.error) { 
          console.error(`[AppContext] Error loading cold call logs: ${coldCallLogsRes.error.message}`); 
          toast.error(`Erro ao carregar logs de cold call: ${coldCallLogsRes.error.message}`); 
          setColdCallLogs([]); 
        } else { 
          setColdCallLogs(coldCallLogsRes.data || []); 
          console.log("[AppContext] Cold Call Logs fetched:", (coldCallLogsRes.data || []).length, "Count:", coldCallLogsRes.count);
        }

        if (consultantEventsRes.error) { console.error(`[AppContext] Error loading consultant events: ${consultantEventsRes.error.message}`); toast.error(`Erro ao carregar eventos do consultor: ${consultantEventsRes.error.message}`); setConsultantEvents([]); }
        else { setConsultantEvents(consultantEventsRes.data || []); console.log("[AppContext] Consultant Events fetched:", (consultantEventsRes.data || []).length); }


        refetchCommissions();
        console.log("[AppContext] fetchData completed successfully for user:", userId);

      } catch (error: any) {
        console.error("[AppContext] Critical error during fetchData:", error.message, error);
        toast.error(`Erro crítico ao carregar dados: ${error.message}`);
      } finally {
        if (isMounted) { // Only update state if component is still mounted
          setIsDataLoading(false);
          console.log(`[AppContext.fetchData] Finished fetch for user: ${userId}. isDataLoading set to false.`);
        } else {
          console.log(`[AppContext.fetchData] Component unmounted during fetch for user: ${userId}. Skipping setIsDataLoading(false).`);
        }
      }
    };

    console.log(`[AppContext.useEffect] Auth Loading: ${isAuthLoading}, User: ${user?.id}, Fetched User Ref: ${fetchedUserIdRef.current}`);

    if (isAuthLoading) {
      // AuthContext is still determining session status, keep AppContext loading
      console.log("[AppContext.useEffect] Auth is still loading, keeping AppContext loading.");
      setIsDataLoading(true);
      return;
    }

    // AuthContext has finished loading (isAuthLoading is false)
    if (user && user.id) {
      // User is authenticated
      if (user.id !== fetchedUserIdRef.current) {
        // New user or user changed, or first time authenticated
        console.log(`[AppContext.useEffect] User authenticated (${user.id}) and different from last fetched (${fetchedUserIdRef.current}). Initiating fetchData.`);
        fetchedUserIdRef.current = user.id;
        fetchData(user.id);
      } else {
        // Same user, data already fetched or in progress. Ensure loading is false if not fetching.
        console.log(`[AppContext.useEffect] User authenticated (${user.id}) and same as last fetched. Ensuring isDataLoading is false if not actively fetching.`);
        if (isDataLoading && !isFetchingRef.current) { // Only set to false if it's currently true and no fetch is active
          setIsDataLoading(false);
        }
      }
    } else {
      // User is definitively not authenticated (isAuthLoading is false and user is null)
      console.log("[AppContext.useEffect] User is definitively unauthenticated. Resetting local state.");
      fetchedUserIdRef.current = null;
      resetLocalState();
    }

    return () => {
      isMounted = false;
      console.log("[AppContext.useEffect] AppContext cleanup.");
    };
  }, [user, isAuthLoading, refetchCommissions, fetchAppConfig, resetLocalState, parseDbCurrency, user?.role, isDataLoading]);

  // CRUD candidatos
  const addCandidate = useCallback(async (candidate: Omit<Candidate, 'id' | 'createdAt' | 'db_id'>) => {
    if (!user) throw new Error("Usuário não autenticado. Não é possível adicionar candidato.");
    
    const candidateDataWithCreator = { ...candidate, createdBy: user.id };

    const { data, error } = await supabase.from('candidates').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: candidateDataWithCreator }).select().single();
    if (error) throw error;
    
    const newCandidate = { ...candidateDataWithCreator, id: (data.data as any).id || crypto.randomUUID(), db_id: data.id, createdAt: data.created_at } as Candidate;
    
    setCandidates(prev => [newCandidate, ...prev]);
    return newCandidate;
  }, [user]);

  const updateCandidate = useCallback(async (id: string, updates: Partial<Candidate>) => {
    const candidate = candidates.find(c => c.id === id || c.db_id === id);
    if (!candidate) return;

    const dbId = candidate.db_id || id;
    const updatedData = { ...candidate, ...updates };
    const now = new Date().toISOString();

    if (updates.screeningStatus === 'Contacted' && candidate.screeningStatus !== 'Contacted') updatedData.contactedDate = now;
    if (updates.screeningStatus === 'No Response' && candidate.screeningStatus !== 'No Response') updatedData.noResponseDate = now;
    if (updates.interviewDate && candidate.interviewDate !== updates.interviewDate) updatedData.interviewScheduledDate = now;
    if (updates.interviewConducted && !candidate.interviewConducted) updatedData.interviewConductedDate = now;
    if (updates.status === 'Aguardando Prévia' && candidate.status !== 'Aguardando Prévia') updatedData.awaitingPreviewDate = now;
    if (updates.status === 'Onboarding Online' && candidate.status !== 'Onboarding Online') updatedData.onboardingOnlineDate = now;
    if (updates.status === 'Integração Presencial' && candidate.status !== 'Integração Presencial') updatedData.integrationPresencialDate = now;
    if (updates.status === 'Acompanhamento 90 Dias' && candidate.status !== 'Acompanhamento 90 Dias') updatedData.acompanhamento90DiasDate = now;
    if (updates.status === 'Autorizado' && candidate.status !== 'Autorizado') updatedData.authorizedDate = now;
    if (updates.status === 'Reprovado' && candidate.status !== 'Reprovado') updatedData.reprovadoDate = now;
    if (updates.status === 'Desqualificado' && candidate.status !== 'Desqualificado') updatedData.disqualifiedDate = now;
    if (updates.status === 'Faltou' && candidate.status !== 'Faltou') updatedData.faltouDate = now;

    if (updates.interviewStartTime !== undefined) updatedData.interviewStartTime = updates.interviewStartTime;
    if (updates.interviewEndTime !== undefined) updatedData.interviewEndTime = updates.interviewEndTime;

    setCandidates(prev => prev.map(c => (c.id === id || c.db_id === id) ? { ...c, ...updatedData, lastUpdatedAt: now } : c));

    const dataToSave = { ...updatedData };
    delete (dataToSave as any).db_id;
    delete (dataToSave as any).createdAt;

    const { error } = await supabase.from('candidates').update({ data: dataToSave }).eq('id', dbId);
    if (error) throw error;
  }, [candidates]);

  const deleteCandidate = useCallback(async (dbId: string) => {
    const { error } = await supabase.from('candidates').delete().eq('id', dbId);
    if (error) throw error;
    setCandidates(prev => prev.filter(c => c.db_id !== dbId));
  }, []);

  const toggleChecklistItem = useCallback(async (candidateId: string, itemId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    const currentProgress = candidate.checklistProgress || {};
    const currentState = currentProgress[itemId] || { completed: false };
    const newProgress = { ...currentProgress, [itemId]: { ...currentState, completed: !currentState.completed } };
    setCandidates(prev => prev.map(c => (c.id === candidateId || c.db_id === candidateId) ? { ...c, checklistProgress: newProgress } : c));
    const dbId = candidate.db_id || candidate.id;
    const { error } = await supabase.from('candidates').update({ data: { ...candidate, checklistProgress: newProgress } }).eq('id', dbId);
    if (error) {
      toast.error(`Erro ao atualizar checklist: ${error.message}`);
      setCandidates(prev => prev.map(c => (c.id === candidateId || c.db_id === candidateId) ? { ...c, checklistProgress: currentProgress } : c));
    }
  }, [candidates]);

  const hasPendingSecretariaTasks = useCallback((candidate: Candidate): boolean => {
    const secretariaChecklistItems = checklistStructure.flatMap(stage => stage.items.filter(item => item.responsibleRole === 'SECRETARIA'));
    const today = new Date().toISOString().split('T')[0];
    return secretariaChecklistItems.some(item => {
      const progress = candidate.checklistProgress?.[item.id];
      return !progress?.completed && ((progress?.dueDate && progress.dueDate <= today) || (!progress?.dueDate));
    });
  }, [checklistStructure]);

  // Cold call
  const addColdCallLead = useCallback(async (lead: Omit<ColdCallLead, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_stage'>) => {
    if (!user) throw new Error("User not authenticated.");
    const finalName = lead.name?.trim() || lead.phone.trim();
    const { data, error } = await supabase.from('cold_call_leads').insert({ ...lead, name: finalName, user_id: user.id, current_stage: 'Base Fria' }).select().single();
    if (error) throw error;
    setColdCallLeads(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateColdCallLead = useCallback(async (id: string, updates: Partial<ColdCallLead>) => {
    if (!user) throw new Error("User not authenticated.");
    const leadToUpdate = coldCallLeads.find(l => l.id === id);
    if (!leadToUpdate) throw new Error(`Cold Call Lead com ID ${id} não encontrado.`);
    const { error: updateError } = await supabase.from('cold_call_leads').update(updates).eq('id', id);
    if (updateError) throw updateError;
    const { data: selectData, error: selectError } = await supabase.from('cold_call_leads').select('id, user_id, name, phone, email, current_stage, notes, crm_lead_id, created_at, updated_at').eq('id', id).maybeSingle();
    if (selectError) throw selectError;
    if (!selectData) throw new Error("Nenhum dado retornado após atualizar o lead.");
    setColdCallLeads(prev => prev.map(l => l.id === id ? selectData : l));
    return selectData;
  }, [user, coldCallLeads]);

  const deleteColdCallLead = useCallback(async (id: string) => {
    const { error } = await supabase.from('cold_call_leads').delete().eq('id', id);
    if (error) throw error;
    setColdCallLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  const addColdCallLog = useCallback(async (log: Omit<ColdCallLog, 'id' | 'user_id' | 'created_at'> & { start_time: string; end_time: string; duration_seconds: number; }) => {
    if (!user) throw new Error("User not authenticated.");
    const insertData = { cold_call_lead_id: log.cold_call_lead_id, start_time: log.start_time, end_time: log.end_time, duration_seconds: log.duration_seconds, result: log.result, meeting_date: log.meeting_date, meeting_time: log.meeting_time, meeting_modality: log.meeting_modality, meeting_notes: log.meeting_notes, user_id: user.id };
    const { data: insertedData, error: insertError } = await supabase.from('cold_call_logs').insert(insertData).select('id, cold_call_lead_id, user_id, start_time, end_time, duration_seconds, result, meeting_date, meeting_time, meeting_modality, meeting_notes, created_at').maybeSingle();
    if (insertError) throw insertError;
    if (!insertedData) {
      const { data: fetchedData, error: selectError } = await supabase.from('cold_call_logs').select('id, cold_call_lead_id, user_id, start_time, end_time, duration_seconds, result, meeting_date, meeting_time, meeting_modality, meeting_notes, created_at').eq('cold_call_lead_id', log.cold_call_lead_id).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (selectError) throw selectError;
      if (!fetchedData) throw new Error("Nenhum dado retornado após inserir o log.");
      setColdCallLogs(prev => [...prev, fetchedData]);
      return fetchedData;
    }
    setColdCallLogs(prev => [...prev, insertedData]);
    return insertedData;
  }, [user]);

  const getColdCallMetrics = useCallback((consultantId: string) => {
    const consultantLogs = coldCallLogs.filter(log => log.user_id === consultantId);
    const totalCalls = consultantLogs.length;
    const totalConversations = consultantLogs.filter(log => log.result === 'Conversou' || log.result === 'Agendar Reunião').length;
    const totalMeetingsScheduled = consultantLogs.filter(log => log.result === 'Agendar Reunião').length;
    const conversationToMeetingRate = totalConversations > 0 ? (totalMeetingsScheduled / totalConversations) * 100 : 0;
    return { totalCalls, totalConversations, totalMeetingsScheduled, conversationToMeetingRate };
  }, [coldCallLogs]);

  const createCrmLeadFromColdCall = useCallback(async (coldCallLeadId: string, meeting?: { date?: string; time?: string; modality?: string; notes?: string }) => {
    if (!user) throw new Error("User not authenticated.");
    const { data, error } = await supabase.functions.invoke('create-crm-lead-from-cold-call', { body: {
      coldCallLeadId,
      meetingDate: meeting?.date,
      meetingTime: meeting?.time,
      meetingModality: meeting?.modality,
      meetingNotes: meeting?.notes
    } });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    const { data: updatedColdCallLead } = await supabase.from('cold_call_leads').select('id, user_id, name, phone, email, current_stage, notes, crm_lead_id, created_at, updated_at').eq('id', coldCallLeadId).maybeSingle();
    if (updatedColdCallLead) setColdCallLeads(prev => prev.map(lead => lead.id === coldCallLeadId ? updatedColdCallLead : lead));
    const { data: newCrmLeads } = await supabase.from('crm_leads').select('*').eq('user_id', JOAO_GESTOR_AUTH_ID).order('created_at', { ascending: false });
    setCrmLeads(newCrmLeads?.map((lead: any) => ({
      id: lead.id, consultant_id: lead.consultant_id, stage_id: lead.stage_id, user_id: lead.user_id, name: lead.name, data: lead.data,
      created_at: lead.created_at, updated_at: data.updated_at, created_by: data.created_by, updated_by: data.updated_by,
      proposal_value: parseDbCurrency(lead.proposal_value), proposal_closing_date: lead.proposal_closing_date,
      sold_credit_value: parseDbCurrency(lead.sold_credit_value), sold_group: lead.sold_group, sold_quota: lead.sold_quota, sale_date: lead.sale_date
    })) || []);
    const { data: newLeadTasks } = await supabase.from('lead_tasks').select('*');
    setLeadTasks(newLeadTasks || []);
    return { crmLeadId: data.crmLeadId };
  }, [user, parseDbCurrency]);

  // Lead tasks
  const addLeadTask = useCallback(async (task: Omit<LeadTask, 'id' | 'created_at' | 'completed_at' | 'updated_at'> & { user_id: string; manager_id?: string | null; }) => {
    const { data, error } = await supabase.from('lead_tasks').insert(task).select().single();
    if (error) throw error;
    setLeadTasks(prev => [...prev, data]);
    return data;
  }, []);
  const updateLeadTask = useCallback(async (id: string, updates: Partial<LeadTask>) => {
    const { data, error } = await supabase.from('lead_tasks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setLeadTasks(prev => prev.map(t => t.id === id ? data : t));
    return data;
  }, []);
  const deleteLeadTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('lead_tasks').delete().eq('id', id);
    if (error) throw error;
    setLeadTasks(prev => prev.filter(t => t.id !== id));
  }, []);
  const toggleLeadTaskCompletion = useCallback(async (id: string, is_completed: boolean) => {
    const { data, error } = await supabase.from('lead_tasks').update({ is_completed, completed_at: is_completed ? new Date().toISOString() : null }).eq('id', id).select().single();
    if (error) throw error;
    setLeadTasks(prev => prev.map(t => t.id === id ? data : t));
    return data;
  }, []);
  const updateLeadMeetingInvitationStatus = useCallback(async (taskId: string, status: 'accepted' | 'declined') => {
    const { data, error } = await supabase.from('lead_tasks').update({ manager_invitation_status: status }).eq('id', taskId).select().single();
    if (error) throw error;
    setLeadTasks(prev => prev.map(t => t.id === taskId ? data : t));
    return data;
  }, []);

  // Gestor tasks
  const addGestorTask = useCallback(async (task: Omit<GestorTask, 'id' | 'user_id' | 'created_at' | 'is_completed'>) => {
    const { data, error } = await supabase.from('gestor_tasks').insert({ ...task, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
    if (error) throw error;
    setGestorTasks(prev => [...prev, data]);
    return data;
  }, []);
  const updateGestorTask = useCallback(async (id: string, updates: Partial<GestorTask>) => {
    const { data, error } = await supabase.from('gestor_tasks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setGestorTasks(prev => prev.map(t => t.id === id ? data : t));
    return data;
  }, []);
  const deleteGestorTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('gestor_tasks').delete().eq('id', id);
    if (error) throw error;
    setGestorTasks(prev => prev.filter(t => t.id !== id));
  }, []);
  const toggleGestorTaskCompletion = useCallback(async (gestor_task_id: string, done: boolean, date: string) => {
    const { data, error } = await supabase.from('gestor_task_completions').upsert({ gestor_task_id, user_id: JOAO_GESTOR_AUTH_ID, date, done }, { onConflict: 'gestor_task_id,user_id,date' }).select().single();
    if (error) throw error;
    setGestorTaskCompletions(prev => {
      const filtered = prev.filter(c => !(c.gestor_task_id === gestor_task_id && c.consultant_id === JOAO_GESTOR_AUTH_ID && c.date === date));
      return [...filtered, data];
    });
  }, []);

  // Financial Entries
  const addFinancialEntry = useCallback(async (entry: Omit<FinancialEntry, 'id' | 'user_id' | 'created_at'>) => {
    const { data, error } = await supabase.from('financial_entries').insert({ ...entry, user_id: JOAO_GESTOR_AUTH_ID, amount: entry.amount }).select().single();
    if (error) throw error;
    setFinancialEntries(prev => [...prev, data]);
    return data;
  }, []);
  const updateFinancialEntry = useCallback(async (id: string, updates: Partial<FinancialEntry>) => {
    const { data, error } = await supabase.from('financial_entries').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setFinancialEntries(prev => prev.map(e => e.id === id ? data : e));
    return data;
  }, []);
  const deleteFinancialEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from('financial_entries').delete().eq('id', id);
    if (error) throw error;
    setFinancialEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  // Daily checklist
  const addDailyChecklist = useCallback(async (title: string) => {
    const { data, error } = await supabase.from('daily_checklists').insert({ user_id: JOAO_GESTOR_AUTH_ID, title }).select().single();
    if (error) throw error;
    setDailyChecklists(prev => [...prev, data]);
    return data;
  }, []);
  const updateDailyChecklist = useCallback(async (id: string, updates: Partial<DailyChecklist>) => {
    const { data, error } = await supabase.from('daily_checklists').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setDailyChecklists(prev => prev.map(d => d.id === id ? data : d));
    return data;
  }, []);
  const deleteDailyChecklist = useCallback(async (id: string) => {
    const { error } = await supabase.from('daily_checklists').delete().eq('id', id);
    if (error) throw error;
    setDailyChecklists(prev => prev.filter(d => d.id !== id));
  }, []);

  const addDailyChecklistItem = useCallback(async (daily_checklist_id: string, text: string, order_index: number, resource?: DailyChecklistItemResource, audioFile?: File, imageFile?: File) => {
    let finalResource = resource;
    const uploadFile = async (file: File) => {
      const sanitized = sanitizeFilename(file.name);
      const path = `checklist_resources/${Date.now()}-${sanitized}`;
      const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, file);
      if (uploadError) throw uploadError;
      return supabase.storage.from('form_uploads').getPublicUrl(path).data.publicUrl;
    };
    const audioUrl = audioFile ? await uploadFile(audioFile) : (resource?.type === 'text_audio' || resource?.type === 'text_audio_image' ? (resource.content as any).audioUrl : undefined);
    const imageUrl = imageFile ? await uploadFile(imageFile) : (resource?.type === 'text_audio_image' ? (resource.content as any).imageUrl : undefined);
    if (resource?.type === 'text_audio') finalResource = { ...resource, content: { ...(resource.content as any), audioUrl } };
    else if (resource?.type === 'text_audio_image') finalResource = { ...resource, content: { ...(resource.content as any), audioUrl, imageUrl } };
    else if (resource?.type === 'image' || resource?.type === 'pdf' || resource?.type === 'audio') finalResource = { ...resource, content: audioUrl || imageUrl };

    // USO DE EDGE FUNCTION PARA INSERIR (BYPASS SEGURO DE RLS)
    const { data: fxRes, error: fxErr } = await supabase.functions.invoke('manage-daily-checklist-item', {
      body: {
        action: 'insert',
        daily_checklist_id,
        text,
        order_index,
        resource: finalResource
      }
    });
    if (fxErr) throw fxErr;
    if (!fxRes || !fxRes.data) throw new Error('Falha ao inserir item via edge function.');
    const inserted = fxRes.data;
    setDailyChecklistItems(prev => [...prev, inserted]);
    return inserted;
  }, []);

  const updateDailyChecklistItem = useCallback(async (id: string, updates: Partial<DailyChecklistItem>, audioFile?: File, imageFile?: File) => {
    let finalResource = updates.resource;
    const currentItem = dailyChecklistItems.find(item => item.id === id);
    const uploadFile = async (file: File) => {
      const sanitized = sanitizeFilename(file.name);
      const path = `checklist_resources/${Date.now()}-${sanitized}`;
      const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, file);
      if (uploadError) throw uploadError;
      return supabase.storage.from('form_uploads').getPublicUrl(path).data.publicUrl;
    };

    let audioUrl = audioFile ? await uploadFile(audioFile) : (currentItem?.resource?.type === 'text_audio' || currentItem?.resource?.type === 'text_audio_image' ? (currentItem.resource.content as any).audioUrl : undefined);
    let imageUrl = imageFile ? await uploadFile(imageFile) : (currentItem?.resource?.type === 'text_audio_image' ? (currentItem.resource.content as any).imageUrl : undefined);

    if (updates.resource) {
      if (updates.resource.type === 'text_audio') {
        finalResource = { ...updates.resource, content: { ...(updates.resource.content as any), audioUrl: audioUrl || (updates.resource.content as any).audioUrl } };
      } else if (updates.resource.type === 'text_audio_image') {
        finalResource = { ...updates.resource, content: { ...(updates.resource.content as any), audioUrl: audioUrl || (updates.resource.content as any).audioUrl, imageUrl: imageUrl || (updates.resource.content as any).imageUrl } };
      } else if (updates.resource.type === 'image' || updates.resource.type === 'pdf' || updates.resource.type === 'audio') {
        finalResource = { ...updates.resource, content: audioUrl || imageUrl || updates.resource.content };
      }
    } else {
      // If resource is being removed or set to 'none', clear content
      finalResource = { type: 'none', content: '' };
    }

    // USO DE EDGE FUNCTION PARA ATUALIZAR (BYPASS SEGURO DE RLS)
    const { data: fxRes, error: fxErr } = await supabase.functions.invoke('manage-daily-checklist-item', {
      body: {
        action: 'update',
        id,
        text: updates.text,
        resource: finalResource
      }
    });
    if (fxErr) throw fxErr;
    if (!fxRes || !fxRes.data) throw new Error('Falha ao atualizar item via edge function.');
    const updated = fxRes.data;
    setDailyChecklistItems(prev => prev.map(i => i.id === id ? updated : i));
    return updated;
  }, [dailyChecklistItems]);

  const deleteDailyChecklistItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('daily_checklist_items').delete().eq('id', id);
    if (error) throw error;
    setDailyChecklistItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const moveDailyChecklistItem = useCallback(async (checklistId: string, itemId: string, direction: 'up' | 'down') => {
    const items = dailyChecklistItems.filter(i => i.daily_checklist_id === checklistId).sort((a, b) => a.order_index - b.order_index);
    const index = items.findIndex(i => i.id === itemId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const itemA = items[index]; const itemB = items[targetIndex];
    await Promise.all([
      supabase.from('daily_checklist_items').update({ order_index: itemB.order_index }).eq('id', itemA.id),
      supabase.from('daily_checklist_items').update({ order_index: itemA.order_index }).eq('id', itemB.id)
    ]);
    const { data } = await supabase.from('daily_checklist_items').select('*');
    setDailyChecklistItems(data || []);
  }, [dailyChecklistItems]);

  const assignDailyChecklistToConsultant = useCallback(async (daily_checklist_id: string, consultant_id: string) => {
    const { data, error } = await supabase.from('daily_checklist_assignments').insert({ daily_checklist_id, consultant_id }).select().single();
    if (error) throw error;
    setDailyChecklistAssignments(prev => [...prev, data]);
    return data;
  }, []);
  const unassignDailyChecklistFromConsultant = useCallback(async (daily_checklist_id: string, consultant_id: string) => {
    const { error } = await supabase.from('daily_checklist_assignments').delete().eq('daily_checklist_id', daily_checklist_id).eq('consultant_id', consultant_id);
    if (error) throw error;
    setDailyChecklistAssignments(prev => prev.filter(a => !(a.daily_checklist_id === daily_checklist_id && a.consultant_id === consultant_id)));
  }, []);
  const toggleDailyChecklistCompletion = useCallback(async (daily_checklist_item_id: string, date: string, done: boolean, consultant_id: string) => {
    const { data, error } = await supabase.from('daily_checklist_completions').upsert({ daily_checklist_item_id, consultant_id, date, done }, { onConflict: 'daily_checklist_item_id,consultant_id,date' }).select().single();
    if (error) throw error;
    setDailyChecklistCompletions(prev => {
      const filtered = prev.filter(c => !(c.daily_checklist_item_id === daily_checklist_item_id && c.consultant_id === consultant_id && c.date === date));
      return [...filtered, data];
    });
  }, []);

  // Weekly targets
  const addWeeklyTarget = useCallback(async (target: Omit<WeeklyTarget, 'id' | 'user_id' | 'created_at'>) => {
    const { data, error } = await supabase.from('weekly_targets').insert({ ...target, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
    if (error) throw error;
    setWeeklyTargets(prev => [...prev, data]);
    return data;
  }, []);
  const updateWeeklyTarget = useCallback(async (id: string, updates: Partial<WeeklyTarget>) => {
    const { data, error } = await supabase.from('weekly_targets').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setWeeklyTargets(prev => prev.map(w => w.id === id ? data : w));
    return data;
  }, []);
  const deleteWeeklyTarget = useCallback(async (id: string) => {
    const { error } = await supabase.from('weekly_targets').delete().eq('id', id);
    if (error) throw error;
    setWeeklyTargets(prev => prev.filter(w => w.id !== id));
  }, []);
  const addWeeklyTargetItem = useCallback(async (item: Omit<WeeklyTargetItem, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('weekly_target_items').insert(item).select().single();
    if (error) throw error;
    setWeeklyTargetItems(prev => [...prev, data]);
    return data;
  }, []);
  const updateWeeklyTargetItem = useCallback(async (id: string, updates: Partial<WeeklyTargetItem>) => {
    const { data, error } = await supabase.from('weekly_target_items').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setWeeklyTargetItems(prev => prev.map(i => i.id === id ? data : i));
    return data;
  }, []);
  const deleteWeeklyTargetItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('weekly_target_items').delete().eq('id', id);
    if (error) throw error;
    setWeeklyTargetItems(prev => prev.filter(i => i.id !== id));
  }, []);
  const updateWeeklyTargetItemOrder = useCallback(async (orderedItems: WeeklyTargetItem[]) => {
    const updates = orderedItems.map((item, index) => supabase.from('weekly_target_items').update({ order_index: index }).eq('id', item.id));
    await Promise.all(updates);
    const { data } = await supabase.from('weekly_target_items').select('*').eq('user_id', JOAO_GESTOR_AUTH_ID).order('order_index');
    setWeeklyTargetItems(data || []);
  }, []);
  const assignWeeklyTargetToConsultant = useCallback(async (weekly_target_id: string, consultant_id: string) => {
    const { data, error } = await supabase.from('weekly_target_assignments').insert({ weekly_target_id, consultant_id }).select().single();
    if (error) throw error;
    setWeeklyTargetAssignments(prev => [...prev, data]);
    return data;
  }, []);
  const unassignWeeklyTargetFromConsultant = useCallback(async (weekly_target_id: string, consultant_id: string) => {
    const { error } = await supabase.from('weekly_target_assignments').delete().eq('weekly_target_id', weekly_target_id).eq('consultant_id', consultant_id);
    if (error) throw error;
    setWeeklyTargetAssignments(prev => prev.filter(a => !(a.weekly_target_id === weekly_target_id && a.consultant_id === consultant_id)));
  }, []);

  // Metric logs
  const addMetricLog = useCallback(async (log: Omit<MetricLog, 'id' | 'created_at'>) => {
    if (!user) throw new Error("User not authenticated.");
    const insertData = { ...log, consultant_id: log.consultant_id ?? user.id };
    const { data, error } = await supabase.from('metric_logs').insert(insertData).select().single();
    if (error) throw error;
    setMetricLogs(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateMetricLog = useCallback(async (id: string, updates: Partial<MetricLog>) => {
    const { data, error } = await supabase.from('metric_logs').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setMetricLogs(prev => prev.map(m => m.id === id ? data : m));
    return data;
  }, []);

  const deleteMetricLog = useCallback(async (id: string) => {
    const { error } = await supabase.from('metric_logs').delete().eq('id', id);
    if (error) throw error;
    setMetricLogs(prev => prev.filter(m => m.id !== id));
  }, []);

  // Support Materials v2
  const addSupportMaterialV2 = useCallback(async (material: Omit<SupportMaterialV2, 'id' | 'user_id' | 'created_at'>, file?: File) => {
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
  }, []);
  const updateSupportMaterialV2 = useCallback(async (id: string, updates: Partial<SupportMaterialV2>, file?: File) => {
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
  }, []);
  const deleteSupportMaterialV2 = useCallback(async (id: string) => {
    const { error } = await supabase.from('support_materials_v2').delete().eq('id', id);
    if (error) throw error;
    setSupportMaterialsV2(prev => prev.filter(m => m.id !== id));
  }, []);
  const assignSupportMaterialToConsultant = useCallback(async (material_id: string, consultant_id: string) => {
    const { data, error } = await supabase.from('support_material_assignments').insert({ material_id, consultant_id }).select().single();
    if (error) throw error;
    setSupportMaterialAssignments(prev => [...prev, data]);
    return data;
  }, []);
  const unassignSupportMaterialFromConsultant = useCallback(async (material_id: string, consultant_id: string) => {
    const { error } = await supabase.from('support_material_assignments').delete().eq('material_id', material_id).eq('consultant_id', consultant_id);
    if (error) throw error;
    setSupportMaterialAssignments(prev => prev.filter(a => !(a.material_id === material_id && a.consultant_id === consultant_id)));
  }, []);

  // CRM básico
  const addCrmLead = useCallback(async (lead: Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by' | 'updated_by'>) => {
    if (!user) throw new Error("User not authenticated.");
    if (!crmOwnerUserId) throw new Error("CRM Owner User ID is not set.");

    const { data, error } = await supabase.from('crm_leads').insert({ 
      ...lead, 
      user_id: crmOwnerUserId,
      created_by: user.id,
    }).select().single();
    if (error) throw error;
    
    const newLead = {
      id: data.id, 
      consultant_id: data.consultant_id, 
      stage_id: data.stage_id,
      user_id: data.user_id, 
      name: data.name, 
      data: data.data,
      created_at: data.created_at, 
      updated_at: data.updated_at, 
      created_by: data.created_by, 
      updated_by: data.updated_by, 
      proposal_value: parseDbCurrency(data.proposal_value), 
      proposal_closing_date: data.proposal_closing_date, 
      sold_credit_value: parseDbCurrency(data.sold_credit_value), 
      sold_group: data.sold_group, 
      sold_quota: data.sold_quota, 
      sale_date: data.sale_date 
    };
    
    setCrmLeads(prev => [newLead, ...prev]);
    return newLead;
  }, [user, crmOwnerUserId, parseDbCurrency]);

  const updateCrmLead = useCallback(async (id: string, updates: Partial<CrmLead>) => {
    const { data, error } = await supabase.from('crm_leads').update({ 
      ...updates, 
      updated_by: user!.id,
      proposal_value: updates.proposal_value,
      proposal_closing_date: updates.proposal_closing_date,
      sold_credit_value: updates.sold_credit_value,
      sold_group: updates.sold_group,
      sold_quota: updates.sold_quota,
      sale_date: updates.sale_date
    }).eq('id', id).select().single();
    if (error) throw error;
    const updatedLead = {
      id: data.id, consultant_id: data.consultant_id, stage_id: data.stage_id, user_id: data.user_id, name: data.name, data: data.data,
      created_at: data.created_at, updated_at: data.updated_at, created_by: data.created_by, updated_by: data.updated_by,
      proposal_value: parseDbCurrency(data.proposal_value), proposal_closing_date: data.proposal_closing_date,
      sold_credit_value: parseDbCurrency(data.sold_credit_value), sold_group: data.sold_group, sold_quota: data.sold_quota, sale_date: data.sale_date
    };
    setCrmLeads(prev => prev.map(l => l.id === id ? updatedLead : l));
    return updatedLead;
  }, [user, parseDbCurrency]);

  const deleteCrmLead = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('crm_leads')
      .delete()
      .eq('id', id)
      .eq('user_id', JOAO_GESTOR_AUTH_ID)
      .select()
      .maybeSingle();
    if (error) throw error;
    // Se nenhuma linha foi retornada, nada foi excluído (id incorreto/sem permissão)
    if (!data) {
      throw new Error('Lead não encontrado ou sem permissão para excluir.');
    }
    setCrmLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  // Team members
  const updateTeamMember = useCallback(async (id: string, updates: Partial<TeamMember>) => {
    const member = teamMembers.find(m => m.id === id);
    if (!member) throw new Error("Member not found");
    const { error } = await supabase.from('team_members').update({ data: { ...member, ...updates }, cpf: updates.cpf || member.cpf }).eq('id', member.db_id);
    if (error) throw error;
    setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    return { success: true };
  }, [teamMembers]);

  const addTeamMemberFeedback = useCallback(async (teamMemberId: string, feedback: Omit<Feedback, 'id'>) => {
    const member = teamMembers.find(m => m.id === teamMemberId);
    if (!member) throw new Error("Member not found");
    const newFeedback = { ...feedback, id: crypto.randomUUID() };
    const updatedFeedbacks = [...(member.feedbacks || []), newFeedback];
    await updateTeamMember(teamMemberId, { feedbacks: updatedFeedbacks });
    return newFeedback;
  }, [teamMembers, updateTeamMember]);

  const updateTeamMemberFeedback = useCallback(async (teamMemberId: string, feedback: Feedback) => {
    const member = teamMembers.find(m => m.id === teamMemberId);
    if (!member) throw new Error("Member not found");
    const updatedFeedbacks = (member.feedbacks || []).map(f => f.id === feedback.id ? feedback : f);
    await updateTeamMember(teamMemberId, { feedbacks: updatedFeedbacks });
    return feedback;
  }, [teamMembers, updateTeamMember]);

  const deleteTeamMemberFeedback = useCallback(async (teamMemberId: string, feedbackId: string) => {
    const member = teamMembers.find(m => m.id === teamMemberId);
    if (!member) return;
    const updatedFeedbacks = (member.feedbacks || []).filter(f => f.id !== feedbackId);
    await updateTeamMember(teamMemberId, { feedbacks: updatedFeedbacks });
  }, [teamMembers, updateTeamMember]);

  const addTeamMember = useCallback(async (member: Omit<TeamMember, 'id'> & { email: string }) => {
    const tempPassword = generateRandomPassword();
    const loginFromCpf = (member.cpf || '').toString().slice(-4);
    const primaryRole = member.roles?.includes('SECRETARIA')
      ? 'SECRETARIA'
      : (member.roles?.includes('GESTOR') ? 'GESTOR' : 'CONSULTOR');

    const { data: authData, error: authError } = await supabase.functions.invoke('create-or-link-consultant', {
      body: { email: member.email, name: member.name, tempPassword, login: loginFromCpf, role: primaryRole }
    });
    if (authError) throw authError;

    const { data, error } = await supabase.from('team_members').insert({ user_id: JOAO_GESTOR_AUTH_ID, cpf: member.cpf, data: { ...member, id: authData.authUserId } }).select().single();
    if (error) throw error;

    const newMember = { id: data.id, db_id: data.id, authUserId: authData.authUserId, name: member.name, email: member.email, roles: member.roles, isActive: member.isActive, cpf: member.cpf, dateOfBirth: member.dateOfBirth, user_id: data.user_id };
    setTeamMembers(prev => [...prev, newMember]);
    return { success: true, member: newMember, tempPassword, wasExistingUser: authData.userExists };
  }, []);
  const deleteTeamMember = useCallback(async (id: string) => {
    const member = teamMembers.find(m => m.id === id);
    if (!member) return;
    const { error } = await supabase.from('team_members').delete().eq('id', member.db_id);
    if (error) throw error;
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  }, [teamMembers]);

  // Team Production Goals
  const addTeamProductionGoal = useCallback(async (goal: Omit<TeamProductionGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase.from('team_production_goals').insert({ ...goal, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
    if (error) throw error;
    setTeamProductionGoals(prev => [data, ...prev]);
    return data;
  }, []);
  const updateTeamProductionGoal = useCallback(async (id: string, updates: Partial<TeamProductionGoal>) => {
    const { data, error } = await supabase.from('team_production_goals').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setTeamProductionGoals(prev => prev.map(g => g.id === id ? data : g));
    return data;
  }, []);
  const deleteTeamProductionGoal = useCallback(async (id: string) => {
    const { error } = await supabase.from('team_production_goals').delete().eq('id', id);
    if (error) throw error;
    setTeamProductionGoals(prev => prev.filter(g => g.id !== id));
  }, []);

  // Cutoff Periods
  const addCutoffPeriod = useCallback(async (period: CutoffPeriod) => {
    const { error } = await supabase.from('cutoff_periods').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: period }).select().single();
    if (error) throw error;
    const { data } = await supabase.from('cutoff_periods').select('*').eq('user_id', JOAO_GESTOR_AUTH_ID);
    setCutoffPeriods(data?.map(item => ({ ...(item.data as CutoffPeriod), db_id: item.id })) || []);
  }, []);
  const updateCutoffPeriod = useCallback(async (id: string, updates: Partial<CutoffPeriod>) => {
    const { error } = await supabase.from('cutoff_periods').update({ data: updates }).eq('id', id).select().single();
    if (error) throw error;
    const { data } = await supabase.from('cutoff_periods').select('*').eq('user_id', JOAO_GESTOR_AUTH_ID);
    setCutoffPeriods(data?.map(item => ({ ...(item.data as CutoffPeriod), db_id: item.id })) || []);
  }, []);
  const deleteCutoffPeriod = useCallback(async (id: string) => {
    const { error } = await supabase.from('cutoff_periods').delete().eq('id', id);
    if (error) throw error;
    setCutoffPeriods(prev => prev.filter(p => p.db_id !== id));
  }, []);

  // Online Onboarding (template + sessions)
  const addOnlineOnboardingSession = useCallback(async (consultantName: string) => {
    const { data: sessionData, error: sessionError } = await supabase.from('onboarding_sessions').insert({ user_id: JOAO_GESTOR_AUTH_ID, consultant_name: consultantName }).select().single();
    if (sessionError) throw sessionError;
    const videosToInsert = onboardingTemplateVideos.map(v => ({ session_id: sessionData.id, title: v.title, video_url: v.video_url, order: v.order }));
    const { error: videosError } = await supabase.from('onboarding_videos').insert(videosToInsert);
    if (videosError) throw videosError;
    const { data: fullSession } = await supabase.from('onboarding_sessions').select('*, videos:onboarding_videos(*)').eq('id', sessionData.id).single();
    setOnboardingSessions(prev => [...prev, fullSession]);
  }, [onboardingTemplateVideos]);

  const deleteOnlineOnboardingSession = useCallback(async (sessionId: string) => {
    const { error } = await supabase.from('onboarding_sessions').delete().eq('id', sessionId);
    if (error) throw error;
    setOnboardingSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  const addVideoToTemplate = useCallback(async (title: string, video_url: string) => {
    const order = onboardingTemplateVideos.length > 0 ? Math.max(...onboardingTemplateVideos.map(v => v.order)) + 1 : 0;
    const { data, error } = await supabase.from('onboarding_video_templates').insert({ user_id: JOAO_GESTOR_AUTH_ID, title, video_url, order }).select().single();
    if (error) throw error;
    setOnboardingTemplateVideos(prev => [...prev, data]);
  }, [onboardingTemplateVideos]);

  const deleteVideoFromTemplate = useCallback(async (videoId: string) => {
    const { error } = await supabase.from('onboarding_video_templates').delete().eq('id', videoId);
    if (error) throw error;
    setOnboardingTemplateVideos(prev => prev.filter(v => v.id !== videoId));
  }, []);

  // Form Submissions
  const updateFormCadastro = useCallback(async (id: string, updates: Partial<FormCadastro>) => {
    console.log("[AppContext] updateFormCadastro called for ID:", id, "updates:", updates);
    const { data, error } = await supabase.from('form_submissions').update(updates).eq('id', id).select().single();
    if (error) {
      console.error("[AppContext] Error updating form cadastro:", error);
      throw error;
    }
    setFormCadastros(prev => prev.map(f => f.id === id ? data : f));
    return data;
  }, []);
  const deleteFormCadastro = useCallback(async (id: string) => {
    console.log("[AppContext] deleteFormCadastro called for ID:", id);
    const { error } = await supabase.from('form_submissions').delete().eq('id', id);
    if (error) {
      console.error("[AppContext] Error deleting form cadastro:", error);
      throw error;
    }
    setFormCadastros(prev => prev.filter(f => f.id !== id));
  }, []);

  // Feedbacks (candidate)
  const addFeedback = useCallback(async (personId: string, feedback: Omit<Feedback, 'id'>) => {
    const candidate = candidates.find(c => c.id === personId);
    if (!candidate) throw new Error("Candidate not found");
    const newFeedback = { ...feedback, id: crypto.randomUUID() };
    const updatedFeedbacks = [...(candidate.feedbacks || []), newFeedback];
    await updateCandidate(personId, { feedbacks: updatedFeedbacks });
    return newFeedback;
  }, [candidates, updateCandidate]);
  const updateFeedback = useCallback(async (personId: string, feedback: Feedback) => {
    const candidate = candidates.find(c => c.id === personId);
    if (!candidate) throw new Error("Candidate not found");
    const updatedFeedbacks = (candidate.feedbacks || []).map(f => f.id === feedback.id ? feedback : f);
    await updateCandidate(personId, { feedbacks: updatedFeedbacks });
    return feedback;
  }, [candidates, updateCandidate]);
  const deleteFeedback = useCallback(async (personId: string, feedbackId: string) => {
    const candidate = candidates.find(c => c.id === personId);
    if (!candidate) return;
    const updatedFeedbacks = (candidate.feedbacks || []).filter(f => f.id !== feedbackId);
    await updateCandidate(personId, { feedbacks: updatedFeedbacks });
  }, [candidates, updateCandidate]);

  // Consultant Events (NOVO: CRUD para eventos do consultor)
  const addConsultantEvent = useCallback(async (event: Omit<ConsultantEvent, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) throw new Error("Usuário não autenticado. Não é possível adicionar evento.");
    const { data, error } = await supabase.from('consultant_events').insert({ ...event, user_id: user.id }).select().single();
    if (error) throw error;
    setConsultantEvents(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateConsultantEvent = useCallback(async (id: string, updates: Partial<ConsultantEvent>) => {
    if (!user) throw new Error("Usuário não autenticado. Não é possível atualizar evento.");
    const { data, error } = await supabase.from('consultant_events').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setConsultantEvents(prev => prev.map(e => e.id === id ? data : e));
    return data;
  }, [user]);

  const deleteConsultantEvent = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado. Não é possível excluir evento.");
    const { error } = await supabase.from('consultant_events').delete().eq('id', id);
    if (error) throw error;
    setConsultantEvents(prev => prev.filter(e => e.id !== id));
  }, [user]);

  const value: AppContextType = useMemo(() => {
    console.log("[AppContext] useMemo re-calculating value. updateFormCadastro is defined:", typeof updateFormCadastro !== 'undefined');
    return {
      isDataLoading,
      candidates, teamMembers, commissions, supportMaterials, cutoffPeriods, onboardingSessions, onboardingTemplateVideos,
      checklistStructure, setChecklistStructure,
      consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs,
      crmPipelines, crmStages, crmFields, crmLeads, crmOwnerUserId,
      dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions,
      weeklyTargets, weeklyTargetItems, weeklyTargetAssignments,
      metricLogs, supportMaterialsV2, supportMaterialAssignments,
      leadTasks, gestorTasks, gestorTaskCompletions, financialEntries,
      formCadastros, formFiles, notifications, teamProductionGoals,
      coldCallLeads, coldCallLogs, consultantEvents, // NOVO: Adicionar eventos do consultor
      theme,

      toggleTheme, updateConfig, resetLocalState, refetchCommissions, calculateCompetenceMonth, isGestorTaskDueOnDate, calculateNotifications,

      addCandidate, updateCandidate, deleteCandidate,
      getCandidate: (id: string) => candidates.find(c => c.id === id),
      setCandidates,

      toggleChecklistItem,
      setChecklistDueDate: async (candidateId: string, itemId: string, dueDate: string) => {
        const candidate = candidates.find(c => c.id === candidateId);
        if (!candidate) return;
        const currentProgress = candidate.checklistProgress || {};
        const currentState = currentProgress[itemId] || { completed: false };
        const newProgress = { ...currentProgress, [itemId]: { ...currentState, dueDate } };
        await updateCandidate(candidateId, { checklistProgress: newProgress });
      },
      toggleConsultantGoal: async (candidateId: string, goalId: string) => {
        const candidate = candidates.find(c => c.id === candidateId);
        if (!candidate) return;
        const currentProgress = candidate.consultantGoalsProgress || {};
        const newProgress = { ...currentProgress, [goalId]: !currentProgress[goalId] };
        await updateCandidate(candidateId, { consultantGoalsProgress: newProgress });
      },

      addChecklistItem: (stageId: string, label: string, responsibleRole: string) => {
        const newStructure = checklistStructure.map(stage => {
          if (stage.id === stageId) {
            return { ...stage, items: [...stage.items, { id: crypto.randomUUID(), label, responsibleRole }] };
          }
          return stage;
        });
        setChecklistStructure(newStructure);
        updateConfig({ checklistStructure: newStructure });
        return Promise.resolve({} as any);
      },
      updateChecklistItem: (stageId: string, itemId: string, updates: Partial<ChecklistItem>) => {
        const newStructure = checklistStructure.map(stage => {
          if (stage.id !== stageId) return stage;
          return {
            ...stage,
            items: stage.items.map(item => (item.id === itemId ? { ...item, ...updates } : item)),
          };
        });
        setChecklistStructure(newStructure);
        updateConfig({ checklistStructure: newStructure });
        return Promise.resolve({} as any);
      },
      deleteChecklistItem: (stageId: string, itemId: string) => {
        const newStructure = checklistStructure.map(stage => {
          if (stage.id === stageId) {
            return { ...stage, items: stage.items.filter(item => item.id !== itemId) };
          }
          return stage;
        });
        setChecklistStructure(newStructure);
        updateConfig({ checklistStructure: newStructure });
      },
      moveChecklistItem: (stageId: string, itemId: string, direction: 'up' | 'down') => {
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

      addGoalItem: (stageId: string, label: string) => {
        const newStructure = consultantGoalsStructure.map(stage => {
          if (stage.id === stageId) return { ...stage, items: [...stage.items, { id: crypto.randomUUID(), label }] };
          return stage;
        });
        setConsultantGoalsStructure(newStructure);
        updateConfig({ consultantGoalsStructure: newStructure });
      },
      updateGoalItem: (stageId: string, itemId: string, newLabel: string) => {
        const newStructure = consultantGoalsStructure.map(stage => {
          if (stage.id === stageId) return { ...stage, items: stage.items.map(item => item.id === itemId ? { ...item, label: newLabel } : item) };
          return stage;
        });
        setConsultantGoalsStructure(newStructure);
        updateConfig({ consultantGoalsStructure: newStructure });
      },
      deleteGoalItem: (stageId: string, itemId: string) => {
        const newStructure = consultantGoalsStructure.map(stage => {
          if (stage.id === stageId) return { ...stage, items: stage.items.filter(item => item.id !== itemId) };
          return stage;
        });
        setConsultantGoalsStructure(newStructure);
        updateConfig({ consultantGoalsStructure: newStructure });
      },
      moveGoalItem: (stageId: string, itemId: string, direction: 'up' | 'down') => {
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

      updateInterviewSection: (sectionId: string, updates: Partial<InterviewSection>) => {
        const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, ...updates } : s);
        setInterviewStructure(newStructure);
        updateConfig({ interviewStructure: newStructure });
      },
      addInterviewQuestion: (sectionId: string, text: string, points: number) => {
        const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, questions: [...s.questions, { id: crypto.randomUUID(), text, points }] } : s);
        setInterviewStructure(newStructure);
        updateConfig({ interviewStructure: newStructure });
      },
      updateInterviewQuestion: (sectionId: string, questionId: string, updates: Partial<{ text: string; points: number }>) => {
        const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, questions: s.questions.map(q => q.id === questionId ? { ...q, ...updates } : q) } : s);
        setInterviewStructure(newStructure);
        updateConfig({ interviewStructure: newStructure });
      },
      deleteInterviewQuestion: (sectionId: string, questionId: string) => {
        const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, questions: s.questions.filter(q => q.id !== questionId) } : s);
        setInterviewStructure(newStructure);
        updateConfig({ interviewStructure: newStructure });
      },
      moveInterviewQuestion: (sectionId: string, questionId: string, direction: 'up' | 'down') => {
        const newStructure = interviewStructure.map(s => {
          if (s.id === sectionId) {
            const index = s.questions.findIndex(i => i.id === questionId);
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

      saveTemplate: (itemId: string, updates: Partial<CommunicationTemplate>) => {
        const newTemplates = { ...templates, [itemId]: { ...templates[itemId], ...updates } };
        setTemplates(newTemplates);
        updateConfig({ templates: newTemplates });
      },
      addOrigin: (newOrigin: string, type: 'sales' | 'hiring') => {
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
      deleteOrigin: (originToDelete: string, type: 'sales' | 'hiring') => {
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
      addPV: (newPV: string) => {
        const newPvsList = [...pvs, newPV];
        setPvs(newPvsList);
        updateConfig({ pvs: newPvsList });
      },

      addCommission: async (commission: any) => {
        const { error } = await supabase.from('commissions').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: commission }).select().single();
        if (error) throw error;
        refetchCommissions();
        return { success: true };
      },
      updateCommission: async (id: string, updates: Partial<Commission>) => {
        const { error } = await supabase.from('commissions').update({ data: updates }).eq('id', id);
        if (error) throw error;
        refetchCommissions();
      },
      deleteCommission: async (id: string) => { const { error } = await supabase.from('commissions').delete().eq('id', id); if (error) throw error; refetchCommissions(); },
      updateInstallmentStatus: async (commissionDbId: string, installmentNumber: number, status: InstallmentStatus, paidDate?: string) => {
        const current = commissions.find(c => c.db_id === commissionDbId);
        if (!current) throw new Error('Comissão não encontrada');

        const key = installmentNumber.toString();

        const details = { ...(current.installmentDetails || {}) };
        const prev = details[key] || { status: 'Pendente' as InstallmentStatus };

        const updatedInfo: InstallmentInfo = { ...prev, status };

        if (status === 'Pago') {
          const effectiveDate = paidDate || new Date().toISOString().split('T')[0];
          updatedInfo.paidDate = effectiveDate;
          updatedInfo.competenceMonth = calculateCompetenceMonth(effectiveDate);
        } else {
          delete updatedInfo.paidDate;
          delete updatedInfo.competenceMonth;
        }

        const newDetails = { ...details, [key]: updatedInfo };
        const updatedCommission: Commission = {
          ...current,
          installmentDetails: newDetails,
          status: getOverallStatus(newDetails),
        };

        const { db_id, criado_em, ...dataToSave } = updatedCommission as any;

        const { error } = await supabase.from('commissions').update({ data: dataToSave }).eq('id', commissionDbId);
        if (error) throw error;

        setCommissions(prev => prev.map(c => (c.db_id === commissionDbId ? { ...updatedCommission } : c)));

        toast.success(`Parcela ${installmentNumber} marcada como ${status}.`);
      },

      addCutoffPeriod,
      updateCutoffPeriod,
      deleteCutoffPeriod,

      addOnlineOnboardingSession,
      deleteOnlineOnboardingSession,
      addVideoToTemplate,
      deleteVideoFromTemplate,

      addCrmPipeline: async (name: string) => {
        const { data, error } = await supabase.from('crm_pipelines').insert({ user_id: JOAO_GESTOR_AUTH_ID, name }).select().single();
        if (error) throw error;
        setCrmPipelines(prev => [...prev, data]);
        return data;
      },
      updateCrmPipeline: async (id: string, updates: Partial<CrmPipeline>) => {
        const { data, error } = await supabase.from('crm_pipelines').update(updates).eq('id', id).select().single();
        if (error) throw error;
        setCrmPipelines(prev => prev.map(p => p.id === id ? data : p));
        return data;
      },
      deleteCrmPipeline: async (id: string) => {
        const { error } = await supabase.from('crm_pipelines').delete().eq('id', id);
        if (error) throw error;
        setCrmPipelines(prev => prev.filter(p => p.id !== id));
      },

      addCrmStage: async (stage: Omit<CrmStage, 'id' | 'user_id' | 'created_at'>) => {
        const { data, error } = await supabase.from('crm_stages').insert({ ...stage, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
        if (error) throw error;
        setCrmStages(prev => [...prev, data]);
        return data;
      },
      updateCrmStage: async (id: string, updates: Partial<CrmStage>) => {
        const { data, error } = await supabase.from('crm_stages').update(updates).eq('id', id).select().single();
        if (error) throw error;
        setCrmStages(prev => prev.map(s => s.id === id ? data : s));
        return data;
      },
      updateCrmStageOrder: async (orderedStages: CrmStage[]) => {
        const updates = orderedStages.map((stage, index) => supabase.from('crm_stages').update({ order_index: index }).eq('id', stage.id));
        await Promise.all(updates);
        const { data } = await supabase.from('crm_stages').select('*').eq('user_id', JOAO_GESTOR_AUTH_ID).order('order_index');
        setCrmStages(data || []);
      },
      deleteCrmStage: async (id: string) => {
        const { error } = await supabase.from('crm_stages').delete().eq('id', id);
        if (error) throw error;
        setCrmStages(prev => prev.filter(s => s.id !== id));
      },

      addCrmField: async (field: Omit<CrmField, 'id' | 'user_id' | 'created_at'>) => {
        const { data, error } = await supabase.from('crm_fields').insert({ ...field, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
        if (error) throw error;
        setCrmFields(prev => [...prev, data]);
        return data;
      },
      updateCrmField: async (id: string, updates: Partial<CrmField>) => {
        const { data, error } = await supabase.from('crm_fields').update(updates).eq('id', id).select().single();
        if (error) throw error;
        setCrmFields(prev => prev.map(f => f.id === id ? data : f));
        return data;
      },

      addCrmLead,
      updateCrmLead,
      deleteCrmLead,

      addDailyChecklist,
      updateDailyChecklist,
      deleteDailyChecklist,

      addDailyChecklistItem,
      updateDailyChecklistItem,
      deleteDailyChecklistItem,
      moveDailyChecklistItem,

      assignDailyChecklistToConsultant,
      unassignDailyChecklistFromConsultant,
      toggleDailyChecklistCompletion,

      addWeeklyTarget, updateWeeklyTarget, deleteWeeklyTarget,
      addWeeklyTargetItem, updateWeeklyTargetItem, deleteWeeklyTargetItem, updateWeeklyTargetItemOrder,
      assignWeeklyTargetToConsultant, unassignWeeklyTargetFromConsultant,

      addMetricLog,
      updateMetricLog,
      deleteMetricLog,

      addSupportMaterialV2,
      updateSupportMaterialV2,
      deleteSupportMaterialV2,
      assignSupportMaterialToConsultant,
      unassignSupportMaterialFromConsultant,

      addLeadTask, updateLeadTask, deleteLeadTask, toggleLeadTaskCompletion, updateLeadMeetingInvitationStatus,

      addGestorTask, updateGestorTask, deleteGestorTask, toggleGestorTaskCompletion,

      addFinancialEntry, updateFinancialEntry, deleteFinancialEntry,

      getFormFilesForSubmission: (submissionId: string) => formFiles.filter(f => f.submission_id === submissionId),
      updateFormCadastro,
      deleteFormCadastro,

      addTeamMemberFeedback,
      updateTeamMemberFeedback,
      deleteTeamMemberFeedback,

      addTeamMember,
      updateTeamMember,
      deleteTeamMember,

      addTeamProductionGoal,
      updateTeamProductionGoal,
      deleteTeamProductionGoal,

      hasPendingSecretariaTasks,

      addColdCallLead,
      updateColdCallLead,
      deleteColdCallLead,
      addColdCallLog,
      getColdCallMetrics,
      createCrmLeadFromColdCall,

      addConsultantEvent, // NOVO: Adicionar CRUD para eventos do consultor
      updateConsultantEvent,
      deleteConsultantEvent, // NOVO: Adicionar CRUD para eventos do consultor
      refetchTeamMembers,
    };
  }, [
    isDataLoading,
    candidates, teamMembers, commissions, supportMaterials, cutoffPeriods, onboardingSessions, onboardingTemplateVideos,
    checklistStructure, setChecklistStructure,
    consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs,
    crmPipelines, crmStages, crmFields, crmLeads, crmOwnerUserId,
    dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions,
    weeklyTargets, weeklyTargetItems, weeklyTargetAssignments,
    metricLogs, supportMaterialsV2, supportMaterialAssignments,
    leadTasks, gestorTasks, gestorTaskCompletions, financialEntries,
    formCadastros, formFiles, notifications, teamProductionGoals,
    coldCallLeads, coldCallLogs, consultantEvents, // NOVO: Adicionar eventos do consultor
    theme,
    toggleTheme, updateConfig, resetLocalState, refetchCommissions, calculateCompetenceMonth, isGestorTaskDueOnDate, calculateNotifications,
    addCandidate, updateCandidate, deleteCandidate,
    toggleChecklistItem,
    addDailyChecklist, updateDailyChecklist, deleteDailyChecklist,
    addDailyChecklistItem, updateDailyChecklistItem, deleteDailyChecklistItem, moveDailyChecklistItem,
    addWeeklyTarget, updateWeeklyTarget, deleteWeeklyTarget,
    addWeeklyTargetItem, updateWeeklyTargetItem, deleteWeeklyTargetItem, updateWeeklyTargetItemOrder,
    assignWeeklyTargetToConsultant, unassignWeeklyTargetFromConsultant,
    addMetricLog, updateMetricLog, deleteMetricLog,
    addSupportMaterialV2, updateSupportMaterialV2, deleteSupportMaterialV2, assignSupportMaterialToConsultant, unassignSupportMaterialFromConsultant,
    addLeadTask, updateLeadTask, deleteLeadTask, toggleLeadTaskCompletion, updateLeadMeetingInvitationStatus,
    addGestorTask, updateGestorTask, deleteGestorTask, toggleGestorTaskCompletion,
    addFinancialEntry, updateFinancialEntry, deleteFinancialEntry,
    updateFormCadastro, deleteFormCadastro,
    addTeamMemberFeedback, updateTeamMemberFeedback, deleteTeamMemberFeedback,
    addTeamMember, updateTeamMember, deleteTeamMember,
    addTeamProductionGoal, updateTeamProductionGoal, deleteTeamProductionGoal,
    addCutoffPeriod, updateCutoffPeriod, deleteCutoffPeriod,
    hasPendingSecretariaTasks,
    addColdCallLead, updateColdCallLead, deleteColdCallLead, addColdCallLog, getColdCallMetrics, createCrmLeadFromColdCall,
    addOnlineOnboardingSession, deleteOnlineOnboardingSession, addVideoToTemplate, deleteVideoFromTemplate,
    addConsultantEvent, updateConsultantEvent, deleteConsultantEvent, // NOVO: Adicionar CRUD para eventos do consultor
    refetchTeamMembers,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be usado dentro de um AppProvider');
  return context;
};

export const useApp = useAppContext;