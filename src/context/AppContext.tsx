import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Candidate, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, Commission, SupportMaterial, GoalStage, TeamMember, InstallmentStatus, InstallmentInfo, CutoffPeriod, OnboardingSession, OnboardingVideoTemplate, CrmPipeline, CrmStage, CrmField, CrmLead, DailyChecklist, DailyChecklistItem, DailyChecklistAssignment, DailyChecklistCompletion, WeeklyTarget, WeeklyTargetItem, WeeklyTargetAssignment, MetricLog, SupportMaterialV2, SupportMaterialAssignment, LeadTask, DailyChecklistItemResource, GestorTask, GestorTaskCompletion, FinancialEntry, FormCadastro, FormFile, Notification, TeamProductionGoal, ColdCallLead, ColdCallLog, ChecklistItem, Process } from '@/types';
import { CHECKLIST_STAGES as DEFAULT_STAGES } from '@/data/checklistData';
import { CONSULTANT_GOALS as DEFAULT_GOALS } from '@/data/consultantGoals';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { generateRandomPassword } from '@/utils/authUtils';
import { sanitizeFilename } from '@/utils/fileUtils';
import toast from 'react-hot-toast';
import { getOverallStatus } from '@/utils/commissionUtils';
import { getAllFromTable } from '@/lib/supabase';

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
  const { user } = useAuth();
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
  const [processes, setProcesses] = useState<Process[]>([]);

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

  const parseDbCurrency = useCallback((value: any): number | null => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9,-]+/g, '').replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
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
    if (!user) return;
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
    setCandidates([]); setTeamMembers([]); setCommissions([]); setSupportMaterials([]); setCutoffPeriods([]); setOnboardingSessions([]); setOnboardingTemplateVideos([]);
    setChecklistStructure(DEFAULT_STAGES); setConsultantGoalsStructure(DEFAULT_GOALS); setInterviewStructure(INITIAL_INTERVIEW_STRUCTURE); setTemplates({});
    setHiringOrigins(DEFAULT_APP_CONFIG_DATA.hiringOrigins); setSalesOrigins(DEFAULT_APP_CONFIG_DATA.salesOrigins); setInterviewers(DEFAULT_APP_CONFIG_DATA.interviewers); setPvs(DEFAULT_APP_CONFIG_DATA.pvs);
    setCrmPipelines([]); setCrmStages([]); setCrmFields([]); setCrmLeads([]); setCrmOwnerUserId(null);
    setDailyChecklists([]); setDailyChecklistItems([]); setDailyChecklistAssignments([]); setDailyChecklistCompletions([]);
    setWeeklyTargets([]); setWeeklyTargetItems([]); setWeeklyTargetAssignments([]); setMetricLogs([]);
    setSupportMaterialsV2([]); setSupportMaterialAssignments([]); setLeadTasks([]); setGestorTasks([]); setGestorTaskCompletions([]); setFinancialEntries([]);
    setFormCadastros([]); setFormFiles([]); setNotifications([]); setTeamProductionGoals([]);
    setColdCallLeads([]); setColdCallLogs([]);
    setProcesses([]);
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
      const { data, error } = await getAllFromTable('commissions', {
        select: 'id, data, created_at',
        filters: { user_id: JOAO_GESTOR_AUTH_ID },
        orderBy: 'created_at',
        ascending: false,
      });
      if (error) {
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
    const { data: configRow, error: configError } = await supabase.from('app_config').select('data').eq('user_id', effectiveGestorId).maybeSingle();
    if (configError) throw configError;
    if (configRow && configRow.data) {
      const appConfigData = configRow.data;
      setChecklistStructure(appConfigData.checklistStructure || DEFAULT_STAGES);
      setConsultantGoalsStructure(appConfigData.consultantGoalsStructure || DEFAULT_GOALS);
      setInterviewStructure(appConfigData.interviewStructure || INITIAL_INTERVIEW_STRUCTURE);
      setTemplates(appConfigData.templates || {});
      setSalesOrigins(appConfigData.salesOrigins || DEFAULT_APP_CONFIG_DATA.salesOrigins);
      setHiringOrigins(appConfigData.hiringOrigins !== undefined ? appConfigData.hiringOrigins : DEFAULT_APP_CONFIG_DATA.hiringOrigins);
      setPvs(appConfigData.pvs || []);
    }
  }, []);

  useEffect(() => {
    const fetchData = async (userId: string) => {
      setIsDataLoading(true);
      try {
        const effectiveGestorId = JOAO_GESTOR_AUTH_ID;
        setCrmOwnerUserId(effectiveGestorId);

        await fetchAppConfig(effectiveGestorId);

        const [
          candidatesRes, materialsRes, cutoffRes, onboardingRes, templateVideosRes,
          pipelinesRes, stagesRes, fieldsRes, crmLeadsRes,
          dailyChecklistsRes, dailyChecklistItemsRes, dailyChecklistAssignmentsRes, dailyChecklistCompletionsRes,
          weeklyTargetsRes, weeklyTargetItemsRes, weeklyTargetAssignmentsRes, metricLogsRes,
          supportMaterialsV2Res, supportMaterialAssignmentsV2Res,
          leadTasksRes, gestorTasksRes, gestorTaskCompletionsRes, financialEntriesRes,
          formCadastrosRes, formFilesRes, notificationsRes, teamProductionGoalsRes, teamMembersRes,
          coldCallLeadsRes, coldCallLogsRes, processesRes
        ] = await Promise.all([
          getAllFromTable('candidates', { select: 'id, data, created_at, last_updated_at', filters: { user_id: effectiveGestorId } }),
          getAllFromTable('support_materials', { select: 'id, data', filters: { user_id: effectiveGestorId } }),
          getAllFromTable('cutoff_periods', { select: 'id, data', filters: { user_id: effectiveGestorId } }),
          getAllFromTable('onboarding_sessions', { select: '*, videos:onboarding_videos(*)' }),
          getAllFromTable('onboarding_video_templates', { orderBy: 'order', ascending: true }),
          getAllFromTable('crm_pipelines', { filters: { user_id: effectiveGestorId } }),
          getAllFromTable('crm_stages', { filters: { user_id: effectiveGestorId }, orderBy: 'order_index' }),
          getAllFromTable('crm_fields', { filters: { user_id: effectiveGestorId } }),
          getAllFromTable('crm_leads', { filters: { user_id: effectiveGestorId }, orderBy: 'created_at', ascending: false }),
          getAllFromTable('daily_checklists', { filters: { user_id: effectiveGestorId } }),
          getAllFromTable('daily_checklist_items'),
          getAllFromTable('daily_checklist_assignments'),
          getAllFromTable('daily_checklist_completions'),
          getAllFromTable('weekly_targets', { filters: { user_id: effectiveGestorId } }),
          getAllFromTable('weekly_target_items'),
          getAllFromTable('weekly_target_assignments'),
          getAllFromTable('metric_logs'),
          getAllFromTable('support_materials_v2', { filters: { user_id: effectiveGestorId } }),
          getAllFromTable('support_material_assignments'),
          getAllFromTable('lead_tasks'),
          getAllFromTable('gestor_tasks', { filters: { user_id: effectiveGestorId } }),
          getAllFromTable('gestor_task_completions', { filters: { user_id: effectiveGestorId } }),
          getAllFromTable('financial_entries', { filters: { user_id: effectiveGestorId } }),
          getAllFromTable('form_submissions', { select: 'id, submission_date, data, internal_notes, is_complete', filters: { user_id: effectiveGestorId }, orderBy: 'submission_date', ascending: false }),
          getAllFromTable('form_files'),
          getAllFromTable('notifications', { filters: { user_id: userId, is_read: false }, orderBy: 'created_at', ascending: false }),
          getAllFromTable('team_production_goals', { filters: { user_id: effectiveGestorId }, orderBy: 'start_date', ascending: false }),
          getAllFromTable('team_members', { select: 'id, data, cpf, user_id', filters: { user_id: effectiveGestorId } }),
          getAllFromTable('cold_call_leads'),
          getAllFromTable('cold_call_logs'),
          getAllFromTable('processes', { filters: { user_id: effectiveGestorId } })
        ]);

        if (!candidatesRes.error) {
          const normalizedCandidates = (candidatesRes.data || []).map(item => {
            const candidateData = item.data as Candidate;
            return { 
              ...candidateData, 
              id: (item.data as any).id || crypto.randomUUID(), 
              db_id: item.id, 
              createdAt: item.created_at, 
              lastUpdatedAt: item.last_updated_at,
            };
          });
          setCandidates(normalizedCandidates);
        }

        if (!teamMembersRes.error) {
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
        }

        if (!materialsRes.error) setSupportMaterials(materialsRes.data?.map(item => ({ ...(item.data as SupportMaterial), db_id: item.id })) || []);
        if (!cutoffRes.error) setCutoffPeriods(cutoffRes.data?.map(item => ({ ...(item.data as CutoffPeriod), db_id: item.id })) || []);
        if (!onboardingRes.error) setOnboardingSessions((onboardingRes.data as any[])?.map(s => ({...s, videos: s.videos.sort((a:any,b:any) => a.order - b.order)})) || []);
        if (!templateVideosRes.error) setOnboardingTemplateVideos(templateVideosRes.data || []);
        if (!pipelinesRes.error) setCrmPipelines(pipelinesRes.data || []);
        if (!stagesRes.error) setCrmStages(stagesRes.data || []);
        if (!fieldsRes.error) setCrmFields(fieldsRes.data || []);
        if (!crmLeadsRes.error) setCrmLeads(crmLeadsRes.data?.map((lead: any) => ({ 
          id: lead.id, consultant_id: lead.consultant_id, stage_id: lead.stage_id, user_id: lead.user_id, name: lead.name, data: lead.data, created_at: lead.created_at, updated_at: lead.updated_at, created_by: lead.created_by, updated_by: lead.updated_by, 
          proposal_value: parseDbCurrency(lead.proposal_value), proposal_closing_date: lead.proposal_closing_date, 
          sold_credit_value: parseDbCurrency(lead.sold_credit_value), sold_group: lead.sold_group, sold_quota: lead.sold_quota, sale_date: lead.sale_date 
        })) || []);
        if (!dailyChecklistsRes.error) setDailyChecklists(dailyChecklistsRes.data || []);
        if (!dailyChecklistItemsRes.error) setDailyChecklistItems(dailyChecklistItemsRes.data || []);
        if (!dailyChecklistAssignmentsRes.error) setDailyChecklistAssignments(dailyChecklistAssignmentsRes.data || []);
        if (!dailyChecklistCompletionsRes.error) setDailyChecklistCompletions(dailyChecklistCompletionsRes.data || []);
        if (!weeklyTargetsRes.error) setWeeklyTargets(weeklyTargetsRes.data || []);
        if (!weeklyTargetItemsRes.error) setWeeklyTargetItems(weeklyTargetItemsRes.data || []);
        if (!weeklyTargetAssignmentsRes.error) setWeeklyTargetAssignments(weeklyTargetAssignmentsRes.data || []);
        if (!metricLogsRes.error) setMetricLogs(metricLogsRes.data || []);
        if (!supportMaterialsV2Res.error) setSupportMaterialsV2(supportMaterialsV2Res.data || []);
        if (!supportMaterialAssignmentsV2Res.error) setSupportMaterialAssignments(supportMaterialAssignmentsV2Res.data || []);
        if (!leadTasksRes.error) setLeadTasks(leadTasksRes.data || []);
        if (!gestorTasksRes.error) setGestorTasks(gestorTasksRes.data || []);
        if (!gestorTaskCompletionsRes.error) setGestorTaskCompletions(gestorTaskCompletionsRes.data || []);
        if (!financialEntriesRes.error) setFinancialEntries(financialEntriesRes.data?.map((entry: any) => ({ id: entry.id, db_id: entry.id, user_id: entry.user_id, entry_date: entry.entry_date, type: entry.type, description: entry.description, amount: parseFloat(entry.amount), created_at: entry.created_at })) || []);
        if (!formCadastrosRes.error) setFormCadastros(formCadastrosRes.data || []);
        if (!formFilesRes.error) setFormFiles(formFilesRes.data || []);
        if (!notificationsRes.error) setNotifications(notificationsRes.data || []);
        if (!teamProductionGoalsRes.error) setTeamProductionGoals(teamProductionGoalsRes.data || []);
        if (!coldCallLeadsRes.error) setColdCallLeads(coldCallLeadsRes.data || []);
        if (!coldCallLogsRes.error) setColdCallLogs(coldCallLogsRes.data || []);
        if (!processesRes.error) setProcesses(processesRes.data || []);

        refetchCommissions();
      } catch (error: any) {
        toast.error(`Erro crítico ao carregar dados: ${error.message}`);
        resetLocalState();
      } finally {
        setIsDataLoading(false);
      }
    };

    if (user && user.id !== fetchedUserIdRef.current) {
      fetchedUserIdRef.current = user.id;
      fetchData(user.id);
    } else if (!user) {
      fetchedUserIdRef.current = null;
      resetLocalState();
    }
  }, [user?.id, refetchCommissions, fetchAppConfig, resetLocalState, parseDbCurrency]);

  const addCandidate = useCallback(async (candidate: Omit<Candidate, 'id' | 'createdAt' | 'db_id'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
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

  const addCrmLead = useCallback(async (lead: Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by' | 'updated_by'>) => {
    if (!user || !crmOwnerUserId) throw new Error("User not authenticated or CRM Owner not set.");
    const { data, error } = await supabase.from('crm_leads').insert({ ...lead, user_id: crmOwnerUserId, created_by: user.id }).select().single();
    if (error) throw error;
    const newLead = {
      id: data.id, consultant_id: data.consultant_id, stage_id: data.stage_id, user_id: data.user_id, name: data.name, data: data.data,
      created_at: data.created_at, updated_at: data.updated_at, created_by: data.created_by, updated_by: data.updated_by,
      proposal_value: parseDbCurrency(data.proposal_value), proposal_closing_date: data.proposal_closing_date,
      sold_credit_value: parseDbCurrency(data.sold_credit_value), sold_group: data.sold_group, sold_quota: data.sold_quota, sale_date: data.sale_date
    };
    setCrmLeads(prev => [newLead, ...prev]);
    return newLead;
  }, [user, crmOwnerUserId, parseDbCurrency]);

  const updateCrmLead = useCallback(async (id: string, updates: Partial<CrmLead>) => {
    const { data, error } = await supabase.from('crm_leads').update({ ...updates, updated_by: user!.id }).eq('id', id).select().single();
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
    const { error } = await supabase.from('crm_leads').delete().eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) throw error;
    setCrmLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  const addProcess = useCallback(async (processData: Omit<Process, 'id' | 'user_id' | 'created_at' | 'updated_at'>, file?: File | null) => {
    if (!user) throw new Error("User not authenticated.");
    let fileUrl: string | undefined = processData.file_url;
    let fileType: string | undefined = processData.file_type;
    if (file) {
      const sanitized = sanitizeFilename(file.name);
      const path = `process_files/${Date.now()}-${sanitized}`;
      const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, file);
      if (uploadError) throw uploadError;
      fileUrl = supabase.storage.from('form_uploads').getPublicUrl(path).data.publicUrl;
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type.startsWith('audio/')) fileType = 'audio';
      else fileType = 'pdf';
    }
    const { data, error } = await supabase.from('processes').insert({ ...processData, user_id: user.id, file_url: fileUrl, file_type: fileType }).select().single();
    if (error) throw error;
    setProcesses(prev => [data, ...prev].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    return data;
  }, [user]);

  const updateProcess = useCallback(async (id: string, updates: Partial<Process>, file?: File | null) => {
    const existingProcess = processes.find(p => p.id === id);
    if (!existingProcess) throw new Error("Process not found.");
    let fileUrl: string | undefined = updates.file_url;
    let fileType: string | undefined = updates.file_type;
    if (file) {
      const sanitized = sanitizeFilename(file.name);
      const path = `process_files/${Date.now()}-${sanitized}`;
      const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, file);
      if (uploadError) throw uploadError;
      fileUrl = supabase.storage.from('form_uploads').getPublicUrl(path).data.publicUrl;
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type.startsWith('audio/')) fileType = 'audio';
      else fileType = 'pdf';
    } else if (updates.file_url === undefined && updates.file_type === undefined) {
      fileUrl = undefined; fileType = undefined;
    } else {
      fileUrl = existingProcess.file_url; fileType = existingProcess.file_type;
    }
    const { data, error } = await supabase.from('processes').update({ ...updates, file_url: fileUrl, file_type: fileType }).eq('id', id).select().single();
    if (error) throw error;
    setProcesses(prev => prev.map(p => p.id === id ? data : p).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    return data;
  }, [processes]);

  const deleteProcess = useCallback(async (id: string) => {
    const { error } = await supabase.from('processes').delete().eq('id', id);
    if (error) throw error;
    setProcesses(prev => prev.filter(p => p.id !== id));
  }, []);

  const value: AppContextType = useMemo(() => ({
    isDataLoading, candidates, teamMembers, commissions, supportMaterials, cutoffPeriods, onboardingSessions, onboardingTemplateVideos,
    checklistStructure, setChecklistStructure, consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs,
    crmPipelines, crmStages, crmFields, crmLeads, crmOwnerUserId,
    dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions,
    weeklyTargets, weeklyTargetItems, weeklyTargetAssignments, metricLogs, supportMaterialsV2, supportMaterialAssignments,
    leadTasks, gestorTasks, gestorTaskCompletions, financialEntries, formCadastros, formFiles, notifications, teamProductionGoals,
    coldCallLeads, coldCallLogs, processes, theme,
    toggleTheme, updateConfig, resetLocalState, refetchCommissions, calculateCompetenceMonth, isGestorTaskDueOnDate, calculateNotifications,
    addCandidate, updateCandidate, deleteCandidate, getCandidate: (id: string) => candidates.find(c => c.id === id), setCandidates,
    toggleChecklistItem, setChecklistDueDate: async (candidateId: string, itemId: string, dueDate: string) => {
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
    addChecklistStage: (title: string, description: string) => {
      const newStructure = [...checklistStructure, { id: crypto.randomUUID(), title, description, items: [] }];
      setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
    },
    updateChecklistStage: (stageId: string, updates: Partial<ChecklistStage>) => {
      const newStructure = checklistStructure.map(stage => stage.id === stageId ? { ...stage, ...updates } : stage);
      setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
    },
    deleteChecklistStage: (stageId: string) => {
      const newStructure = checklistStructure.filter(stage => stage.id !== stageId);
      setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
    },
    moveChecklistStage: (stageId: string, direction: 'up' | 'down') => {
      const index = checklistStructure.findIndex(s => s.id === stageId);
      if (index === -1) return;
      const newStructure = [...checklistStructure];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < newStructure.length) {
        [newStructure[index], newStructure[targetIndex]] = [newStructure[targetIndex], newStructure[index]];
        setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
      }
    },
    addChecklistItem: (stageId: string, label: string, responsibleRole: string) => {
      const newStructure = checklistStructure.map(stage => stage.id === stageId ? { ...stage, items: [...stage.items, { id: crypto.randomUUID(), label, responsibleRole }] } : stage);
      setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
    },
    updateChecklistItem: (stageId: string, itemId: string, updates: Partial<ChecklistItem>) => {
      const newStructure = checklistStructure.map(stage => stage.id !== stageId ? stage : { ...stage, items: stage.items.map(item => (item.id === itemId ? { ...item, ...updates } : item)) });
      setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
      return Promise.resolve({} as any);
    },
    deleteChecklistItem: (stageId: string, itemId: string) => {
      const newStructure = checklistStructure.map(stage => stage.id === stageId ? { ...stage, items: stage.items.filter(item => item.id !== itemId) } : stage);
      setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
    },
    moveChecklistItem: (stageId: string, itemId: string, direction: 'up' | 'down') => {
      const newStructure = checklistStructure.map(stage => {
        if (stage.id === stageId) {
          const index = stage.items.findIndex(i => i.id === itemId);
          if (index === -1) return stage;
          const newItems = [...stage.items];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex >= 0 && targetIndex < newItems.length) [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
          return { ...stage, items: newItems };
        }
        return stage;
      });
      setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
    },
    resetChecklistToDefault: () => { setChecklistStructure(DEFAULT_STAGES); updateConfig({ checklistStructure: DEFAULT_STAGES }); },
    addGoalItem: (stageId: string, label: string) => {
      const newStructure = consultantGoalsStructure.map(stage => stage.id === stageId ? { ...stage, items: [...stage.items, { id: crypto.randomUUID(), label }] } : stage);
      setConsultantGoalsStructure(newStructure); updateConfig({ consultantGoalsStructure: newStructure });
    },
    updateGoalItem: (stageId: string, itemId: string, newLabel: string) => {
      const newStructure = consultantGoalsStructure.map(stage => stage.id === stageId ? { ...stage, items: stage.items.map(item => item.id === itemId ? { ...item, label: newLabel } : item) } : stage);
      setConsultantGoalsStructure(newStructure); updateConfig({ consultantGoalsStructure: newStructure });
    },
    deleteGoalItem: (stageId: string, itemId: string) => {
      const newStructure = consultantGoalsStructure.map(stage => stage.id === stageId ? { ...stage, items: stage.items.filter(item => item.id !== itemId) } : stage);
      setConsultantGoalsStructure(newStructure); updateConfig({ consultantGoalsStructure: newStructure });
    },
    moveGoalItem: (stageId: string, itemId: string, direction: 'up' | 'down') => {
      const newStructure = consultantGoalsStructure.map(stage => {
        if (stage.id === stageId) {
          const index = stage.items.findIndex(i => i.id === itemId);
          if (index === -1) return stage;
          const newItems = [...stage.items];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex >= 0 && targetIndex < newItems.length) [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
          return { ...stage, items: newItems };
        }
        return stage;
      });
      setConsultantGoalsStructure(newStructure); updateConfig({ consultantGoalsStructure: newStructure });
    },
    resetGoalsToDefault: () => { setConsultantGoalsStructure(DEFAULT_GOALS); updateConfig({ consultantGoalsStructure: DEFAULT_GOALS }); },
    updateInterviewSection: (sectionId: string, updates: Partial<InterviewSection>) => {
      const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, ...updates } : s);
      setInterviewStructure(newStructure); updateConfig({ interviewStructure: newStructure });
    },
    addInterviewQuestion: (sectionId: string, text: string, points: number) => {
      const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, questions: [...s.questions, { id: crypto.randomUUID(), text, points }] } : s);
      setInterviewStructure(newStructure); updateConfig({ interviewStructure: newStructure });
    },
    updateInterviewQuestion: (sectionId: string, questionId: string, updates: Partial<InterviewQuestion>) => {
      const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, questions: s.questions.map(q => q.id === questionId ? { ...q, ...updates } : q) } : s);
      setInterviewStructure(newStructure); updateConfig({ interviewStructure: newStructure });
    },
    deleteInterviewQuestion: (sectionId: string, questionId: string) => {
      const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, questions: s.questions.filter(q => q.id !== questionId) } : s);
      setInterviewStructure(newStructure); updateConfig({ interviewStructure: newStructure });
    },
    moveInterviewQuestion: (sectionId: string, questionId: string, direction: 'up' | 'down') => {
      const newStructure = interviewStructure.map(s => {
        if (s.id === sectionId) {
          const index = s.questions.findIndex(i => i.id === questionId);
          if (index === -1) return s;
          const newQuestions = [...s.questions];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex >= 0 && targetIndex < newQuestions.length) [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
          return { ...s, questions: newQuestions };
        }
        return s;
      });
      setInterviewStructure(newStructure); updateConfig({ interviewStructure: newStructure });
    },
    resetInterviewToDefault: () => { setInterviewStructure(INITIAL_INTERVIEW_STRUCTURE); updateConfig({ interviewStructure: INITIAL_INTERVIEW_STRUCTURE }); },
    saveTemplate: (itemId: string, updates: Partial<CommunicationTemplate>) => {
      const newTemplates = { ...templates, [itemId]: { ...templates[itemId], ...updates } };
      setTemplates(newTemplates); updateConfig({ templates: newTemplates });
    },
    addOrigin: (newOrigin: string, type: 'sales' | 'hiring') => {
      if (type === 'sales') { const newOrigins = [...salesOrigins, newOrigin]; setSalesOrigins(newOrigins); updateConfig({ salesOrigins: newOrigins }); }
      else { const newOrigins = [...hiringOrigins, newOrigin]; setHiringOrigins(newOrigins); updateConfig({ hiringOrigins: newOrigins }); }
    },
    deleteOrigin: (originToDelete: string, type: 'sales' | 'hiring') => {
      if (type === 'sales') { const newOrigins = salesOrigins.filter(o => o !== originToDelete); setSalesOrigins(newOrigins); updateConfig({ salesOrigins: newOrigins }); }
      else { const newOrigins = hiringOrigins.filter(o => o !== originToDelete); setHiringOrigins(newOrigins); updateConfig({ hiringOrigins: newOrigins }); }
    },
    resetOriginsToDefault: () => { setSalesOrigins(DEFAULT_APP_CONFIG_DATA.salesOrigins); setHiringOrigins(DEFAULT_APP_CONFIG_DATA.hiringOrigins); updateConfig({ salesOrigins: DEFAULT_APP_CONFIG_DATA.salesOrigins, hiringOrigins: DEFAULT_APP_CONFIG_DATA.hiringOrigins }); },
    addPV: (newPV: string) => { const newPvsList = [...pvs, newPV]; setPvs(newPvsList); updateConfig({ pvs: newPvsList }); },
    addCommission: async (commission: any) => {
      const { error } = await supabase.from('commissions').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: commission }).select().single();
      if (error) throw error; refetchCommissions(); return { success: true };
    },
    updateCommission: async (id: string, updates: Partial<Commission>) => {
      const { error } = await supabase.from('commissions').update({ data: updates }).eq('id', id);
      if (error) throw error; refetchCommissions();
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
        updatedInfo.paidDate = effectiveDate; updatedInfo.competenceMonth = calculateCompetenceMonth(effectiveDate);
      } else { delete updatedInfo.paidDate; delete updatedInfo.competenceMonth; }
      const newDetails = { ...details, [key]: updatedInfo };
      const updatedCommission: Commission = { ...current, installmentDetails: newDetails, status: getOverallStatus(newDetails) };
      const { db_id, criado_em, ...dataToSave } = updatedCommission as any;
      const { error } = await supabase.from('commissions').update({ data: dataToSave }).eq('id', commissionDbId);
      if (error) throw error;
      setCommissions(prev => prev.map(c => (c.db_id === commissionDbId ? { ...updatedCommission } : c)));
      toast.success(`Parcela ${installmentNumber} marcada como ${status}.`);
    },
    addCutoffPeriod, updateCutoffPeriod, deleteCutoffPeriod,
    addOnlineOnboardingSession, deleteOnlineOnboardingSession, addVideoToTemplate, deleteVideoFromTemplate,
    addCrmPipeline: async (name: string) => {
      const { data, error } = await supabase.from('crm_pipelines').insert({ user_id: JOAO_GESTOR_AUTH_ID, name }).select().single();
      if (error) throw error; setCrmPipelines(prev => [...prev, data]); return data;
    },
    updateCrmPipeline: async (id: string, updates: Partial<CrmPipeline>) => {
      const { data, error } = await supabase.from('crm_pipelines').update(updates).eq('id', id).select().single();
      if (error) throw error; setCrmPipelines(prev => prev.map(p => p.id === id ? data : p)); return data;
    },
    deleteCrmPipeline: async (id: string) => {
      const { error } = await supabase.from('crm_pipelines').delete().eq('id', id);
      if (error) throw error; setCrmPipelines(prev => prev.filter(p => p.id !== id));
    },
    addCrmStage: async (stage: Omit<CrmStage, 'id' | 'user_id' | 'created_at'>) => {
      const { data, error } = await supabase.from('crm_stages').insert({ ...stage, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
      if (error) throw error; setCrmStages(prev => [...prev, data]); return data;
    },
    updateCrmStage: async (id: string, updates: Partial<CrmStage>) => {
      const { data, error } = await supabase.from('crm_stages').update(updates).eq('id', id).select().single();
      if (error) throw error; setCrmStages(prev => prev.map(s => s.id === id ? data : s)); return data;
    },
    updateCrmStageOrder: async (orderedStages: CrmStage[]) => {
      const updates = orderedStages.map((stage, index) => supabase.from('crm_stages').update({ order_index: index }).eq('id', stage.id));
      await Promise.all(updates);
      const { data } = await supabase.from('crm_stages').select('*').eq('user_id', JOAO_GESTOR_AUTH_ID).order('order_index');
      setCrmStages(data || []);
    },
    deleteCrmStage: async (id: string) => {
      const { error } = await supabase.from('crm_stages').delete().eq('id', id);
      if (error) throw error; setCrmStages(prev => prev.filter(s => s.id !== id));
    },
    addCrmField: async (field: Omit<CrmField, 'id' | 'user_id' | 'created_at'>) => {
      const { data, error } = await supabase.from('crm_fields').insert({ ...field, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
      if (error) throw error; setCrmFields(prev => [...prev, data]); return data;
    },
    updateCrmField: async (id: string, updates: Partial<CrmField>) => {
      const { data, error } = await supabase.from('crm_fields').update(updates).eq('id', id).select().single();
      if (error) throw error; setCrmFields(prev => prev.map(f => f.id === id ? data : f)); return data;
    },
    addCrmLead, updateCrmLead, deleteCrmLead,
    addDailyChecklist, updateDailyChecklist, deleteDailyChecklist,
    addDailyChecklistItem, updateDailyChecklistItem, deleteDailyChecklistItem, moveDailyChecklistItem,
    assignDailyChecklistToConsultant, unassignDailyChecklistFromConsultant, toggleDailyChecklistCompletion,
    addWeeklyTarget, updateWeeklyTarget, deleteWeeklyTarget,
    addWeeklyTargetItem, updateWeeklyTargetItem, deleteWeeklyTargetItem, updateWeeklyTargetItemOrder,
    assignWeeklyTargetToConsultant, unassignWeeklyTargetFromConsultant,
    addMetricLog, updateMetricLog, deleteMetricLog,
    addSupportMaterialV2, updateSupportMaterialV2, deleteSupportMaterialV2, assignSupportMaterialToConsultant, unassignSupportMaterialFromConsultant,
    addLeadTask, updateLeadTask, deleteLeadTask, toggleLeadTaskCompletion, updateLeadMeetingInvitationStatus,
    addGestorTask, updateGestorTask, deleteGestorTask, toggleGestorTaskCompletion,
    addFinancialEntry, updateFinancialEntry, deleteFinancialEntry,
    updateFormCadastro, deleteFormCadastro,
    addFeedback, updateFeedback, deleteFeedback, addTeamMemberFeedback, updateTeamMemberFeedback, deleteTeamMemberFeedback,
    addTeamMember, updateTeamMember, deleteTeamMember,
    addTeamProductionGoal, updateTeamProductionGoal, deleteTeamProductionGoal,
    addCutoffPeriod, updateCutoffPeriod, deleteCutoffPeriod,
    hasPendingSecretariaTasks,
    addColdCallLead, updateColdCallLead, deleteColdCallLead, addColdCallLog, getColdCallMetrics,
    addOnlineOnboardingSession, deleteOnlineOnboardingSession, addVideoToTemplate, deleteVideoFromTemplate,
    addProcess, updateProcess, deleteProcess,
  }), [
    isDataLoading, candidates, teamMembers, commissions, supportMaterials, cutoffPeriods, onboardingSessions, onboardingTemplateVideos,
    checklistStructure, consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs,
    crmPipelines, crmStages, crmFields, crmLeads, crmOwnerUserId,
    dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions,
    weeklyTargets, weeklyTargetItems, weeklyTargetAssignments, metricLogs, supportMaterialsV2, supportMaterialAssignments,
    leadTasks, gestorTasks, gestorTaskCompletions, financialEntries, formCadastros, formFiles, notifications, teamProductionGoals,
    coldCallLeads, coldCallLogs, processes, theme,
    toggleTheme, updateConfig, resetLocalState, refetchCommissions, calculateCompetenceMonth, isGestorTaskDueOnDate, calculateNotifications,
    addCandidate, updateCandidate, deleteCandidate, toggleChecklistItem,
    addChecklistStage, updateChecklistStage, deleteChecklistStage, moveChecklistStage,
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
    addFeedback, updateFeedback, deleteFeedback, addTeamMemberFeedback, updateTeamMemberFeedback, deleteTeamMemberFeedback,
    addTeamMember, updateTeamMember, deleteTeamMember,
    addTeamProductionGoal, updateTeamProductionGoal, deleteTeamProductionGoal,
    addCutoffPeriod, updateCutoffPeriod, deleteCutoffPeriod,
    hasPendingSecretariaTasks,
    addColdCallLead, updateColdCallLead, deleteColdCallLead, addColdCallLog, getColdCallMetrics,
    addOnlineOnboardingSession, deleteOnlineOnboardingSession, addVideoToTemplate, deleteVideoFromTemplate,
    addProcess, updateProcess, deleteProcess,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be usado dentro de um AppProvider');
  return context;
};

export const useApp = useAppContext;