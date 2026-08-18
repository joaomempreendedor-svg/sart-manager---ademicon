import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Candidate, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, Commission, SupportMaterial, GoalStage, TeamMember, InstallmentStatus, InstallmentInfo, CutoffPeriod, OnboardingSession, OnboardingVideoTemplate, CrmPipeline, CrmStage, CrmField, CrmLead, DailyChecklist, DailyChecklistItem, DailyChecklistAssignment, DailyChecklistCompletion, WeeklyTarget, WeeklyTargetItem, WeeklyTargetAssignment, MetricLog, SupportMaterialV2, SupportMaterialAssignment, LeadTask, DailyChecklistItemResource, GestorTask, GestorTaskCompletion, FinancialEntry, FormCadastro, FormFile, Notification, TeamProductionGoal, ColdCallLead, ColdCallLog, ChecklistItem, Process, ProcessAttachment, Feedback, InterviewQuestion, HiringPipelineColumn, Contrato, DailyMetricConfig } from '@/types';
import { CHECKLIST_STAGES as DEFAULT_STAGES } from '@/data/checklistData';
import { CONSULTANT_GOALS as DEFAULT_GOALS } from '@/data/consultantGoals';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { generateRandomPassword } from '@/utils/authUtils';
import { sanitizeFilename } from '@/utils/fileUtils';
import toast from 'react-hot-toast';
import { getOverallStatus } from '@/utils/commissionUtils';
import { getAllFromTable } from '@/lib/supabase';
import { DEFAULT_HIRING_PIPELINE_COLUMNS, getCandidateStageKey, normalizeHiringPipelineColumns } from '@/lib/hiringPipeline';

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
  hiringPipelineColumns: DEFAULT_HIRING_PIPELINE_COLUMNS,
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
  const [hiringPipelineColumns, setHiringPipelineColumns] = useState<HiringPipelineColumn[]>(DEFAULT_HIRING_PIPELINE_COLUMNS);
  
  const [crmPipelines, setCrmPipelines] = useState<CrmPipeline[]>([]);
  const [crmStages, setCrmStages] = useState<CrmStage[]>([]);
  const [crmFields, setCrmFields] = useState<CrmField[]>([]);
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);
  const [crmOwnerUserId, setCrmOwnerUserId] = useState<string | null>(null);

  const [dailyChecklists, setDailyChecklists] = useState<DailyChecklist[]>([]);
  const [dailyChecklistItems, setDailyChecklistItem] = useState<DailyChecklistItem[]>([]);
  const [dailyChecklistAssignments, setDailyChecklistAssignments] = useState<DailyChecklistAssignment[]>([]);
  const [dailyChecklistCompletions, setDailyChecklistCompletions] = useState<DailyChecklistCompletion[]>([]);

  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyTarget[]>([]);
  const [weeklyTargetItems, setWeeklyTargetItems] = useState<WeeklyTargetItem[]>([]);
  const [weeklyTargetAssignments, setWeeklyTargetAssignments] = useState<WeeklyTargetAssignment[]>([]);
  const [metricLogs, setMetricLogs] = useState<MetricLog[]>([]);
  const [dailyMetricsConfig, setDailyMetricsConfig] = useState<DailyMetricConfig[]>([]);

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
  const [contratos, setContratos] = useState<Contrato[]>([]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('sart_theme') as 'light' | 'dark') || 'light');

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('sart_theme', newTheme);
      return newTheme;
    });
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
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
    const currentConfig = { checklistStructure, consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs, hiringPipelineColumns };
    debouncedUpdateConfig({ ...currentConfig, ...updates });
  }, [user, checklistStructure, consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs, hiringPipelineColumns, debouncedUpdateConfig]);

  const resetLocalState = useCallback(() => {
    setCandidates([]); setTeamMembers([]); setCommissions([]); setSupportMaterials([]); setCutoffPeriods([]); setOnboardingSessions([]); setOnboardingTemplateVideos([]);
    setChecklistStructure(DEFAULT_STAGES); setConsultantGoalsStructure(DEFAULT_GOALS); setInterviewStructure(INITIAL_INTERVIEW_STRUCTURE); setTemplates({});
    setHiringOrigins(DEFAULT_APP_CONFIG_DATA.hiringOrigins); setSalesOrigins(DEFAULT_APP_CONFIG_DATA.salesOrigins); setInterviewers(DEFAULT_APP_CONFIG_DATA.interviewers); setPvs(DEFAULT_APP_CONFIG_DATA.pvs);
    setHiringPipelineColumns(DEFAULT_HIRING_PIPELINE_COLUMNS);
    setCrmPipelines([]); setCrmStages([]); setCrmFields([]); setCrmLeads([]); setCrmOwnerUserId(null);
    setDailyChecklists([]); setDailyChecklistItem([]); setDailyChecklistAssignments([]); setDailyChecklistCompletions([]);
    setWeeklyTargets([]); setWeeklyTargetItems([]); setWeeklyTargetAssignments([]); setMetricLogs([]);
    setDailyMetricsConfig([]);
    setSupportMaterialsV2([]); setSupportMaterialAssignments([]); setLeadTasks([]); setGestorTasks([]); setGestorTaskCompletions([]); setFinancialEntries([]);
    setFormCadastros([]); setFormFiles([]); setNotifications([]); setTeamProductionGoals([]);
    setColdCallLeads([]); setColdCallLogs([]); setProcesses([]); setContratos([]);
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
        const errorMessage = (error as any)?.message || 'Erro desconhecido';
        console.warn(`Erro ao carregar comissões: ${errorMessage}`);
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
          newNotifications.push({ id: `birthday-${member.id}`, user_id: user.id, type: 'birthday', title: `Aniversário de ${member.name}!`, description: `Celebre o aniversário de ${member.name} neste mês.`, date: member.dateOfBirth, link: `/gestor/config-team`, isRead: false });
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
      setHiringPipelineColumns(normalizeHiringPipelineColumns(appConfigData.hiringPipelineColumns));
    }
  }, []);

  useEffect(() => {
    const fetchData = async (userId: string) => {
      setIsDataLoading(true);
      try {
        const effectiveGestorId = JOAO_GESTOR_AUTH_ID;
        setCrmOwnerUserId(effectiveGestorId);

        await fetchAppConfig(effectiveGestorId);

        const safeFetch = async (table: string, options: any = {}) => {
          try {
            return await getAllFromTable(table, options);
          } catch (e: any) {
            if (e.code === 'PGRST116' || e.message?.includes('schema cache') || e.message?.includes('does not exist')) {
              console.warn(`Tabela ${table} não encontrada. Ignorando.`);
              return { data: [], error: null };
            }
            throw e;
          }
        };

        const [
          candidatesRes, materialsRes, cutoffRes, onboardingRes, templateVideosRes,
          dailyChecklistsRes, dailyChecklistItemRes, dailyChecklistAssignmentsRes, dailyChecklistCompletionsRes,
          supportMaterialsV2Res, supportMaterialAssignmentsV2Res,
          gestorTasksRes, gestorTaskCompletionsRes, financialEntriesRes,
          formCadastrosRes, formFilesRes, notificationsRes, teamProductionGoalsRes, teamMembersRes,
          processesRes, processAttachmentsRes, contratosRes, dailyMetricsConfigRes
        ] = await Promise.all([
          safeFetch('candidates', { select: 'id, data, created_at, last_updated_at', filters: { user_id: effectiveGestorId } }),
          safeFetch('support_materials', { select: 'id, data', filters: { user_id: effectiveGestorId } }),
          safeFetch('cutoff_periods', { select: 'id, data', filters: { user_id: effectiveGestorId } }),
          safeFetch('onboarding_sessions', { select: '*, videos:onboarding_videos(*)' }),
          safeFetch('onboarding_video_templates', { orderBy: 'order', ascending: true }),
          safeFetch('daily_checklists', { filters: { user_id: effectiveGestorId } }),
          safeFetch('daily_checklist_items'),
          safeFetch('daily_checklist_assignments'),
          safeFetch('daily_checklist_completions'),
          safeFetch('support_materials_v2', { filters: { user_id: effectiveGestorId } }),
          safeFetch('support_material_assignments'),
          safeFetch('gestor_tasks', { filters: { user_id: effectiveGestorId } }),
          safeFetch('gestor_task_completions', { filters: { user_id: effectiveGestorId } }),
          safeFetch('financial_entries', { filters: { user_id: userId } }),
          safeFetch('form_submissions', { select: 'id, submission_date, data, internal_notes, is_complete', filters: { user_id: effectiveGestorId }, orderBy: 'submission_date', ascending: false }),
          safeFetch('form_files'),
          safeFetch('notifications', { filters: { user_id: userId, is_read: false }, orderBy: 'created_at', ascending: false }),
          safeFetch('team_production_goals', { filters: { user_id: effectiveGestorId }, orderBy: 'start_date', ascending: false }),
          safeFetch('team_members', { select: 'id, data, cpf, user_id', filters: { user_id: effectiveGestorId } }),
          safeFetch('processes', { filters: { user_id: effectiveGestorId } }),
          safeFetch('process_attachments'),
          safeFetch('contratos', { orderBy: 'created_at', ascending: false }),
          safeFetch('daily_metrics_config', { orderBy: 'order_index' })
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
              pipelineStageKey: getCandidateStageKey(candidateData),
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
              hasLogin: !!authId, isLegacy: !authId, cpf: item.cpf, dateOfBirth: data.dateOfBirth, user_id: item.user_id, feedbacks: Array.isArray(data.feedbacks) ? data.feedbacks : []
            };
          });
          setTeamMembers(normalizedTeamMembers);
        }

        if (!materialsRes.error) setSupportMaterials(materialsRes.data?.map(item => ({ ...(item.data as SupportMaterial), db_id: item.id })) || []);
        if (!cutoffRes.error) setCutoffPeriods(cutoffRes.data?.map(item => ({ ...(item.data as CutoffPeriod), db_id: item.id })) || []);
        if (!onboardingRes.error) setOnboardingSessions((onboardingRes.data as any[])?.map(s => ({...s, videos: s.videos.sort((a:any,b:any) => a.order - b.order)})) || []);
        if (!templateVideosRes.error) setOnboardingTemplateVideos(templateVideosRes.data || []);
        if (!dailyChecklistsRes.error) setDailyChecklists(dailyChecklistsRes.data || []);
        if (!dailyChecklistItemRes.error) setDailyChecklistItem(dailyChecklistItemRes.data || []);
        if (!dailyChecklistAssignmentsRes.error) setDailyChecklistAssignments(dailyChecklistAssignmentsRes.data || []);
        if (!dailyChecklistCompletionsRes.error) setDailyChecklistCompletions(dailyChecklistCompletionsRes.data || []);
        if (!supportMaterialsV2Res.error) setSupportMaterialsV2(supportMaterialsV2Res.data || []);
        if (!supportMaterialAssignmentsV2Res.error) setSupportMaterialAssignments(supportMaterialAssignmentsV2Res.data || []);
        if (!gestorTasksRes.error) setGestorTasks(gestorTasksRes.data || []);
        if (!gestorTaskCompletionsRes.error) setGestorTaskCompletions(gestorTaskCompletionsRes.data || []);
        if (!financialEntriesRes.error) setFinancialEntries(financialEntriesRes.data?.map((entry: any) => ({ id: entry.id, db_id: entry.id, user_id: entry.user_id, entry_date: entry.entry_date, type: entry.type, description: entry.description, amount: parseFloat(entry.amount), created_at: entry.created_at })) || []);
        if (!formCadastrosRes.error) setFormCadastros(formCadastrosRes.data || []);
        if (!formFilesRes.error) setFormFiles(formFilesRes.data || []);
        if (!notificationsRes.error) setNotifications(notificationsRes.data || []);
        if (!teamProductionGoalsRes.error) setTeamProductionGoals(teamProductionGoalsRes.data || []);
        
        if (!processesRes.error) {
          const allAttachments = processAttachmentsRes.data || [];
          const normalizedProcesses = (processesRes.data || []).map(p => ({
            ...p,
            attachments: allAttachments.filter(a => a.process_id === p.id)
          }));
          setProcesses(normalizedProcesses);
        }

        if (!contratosRes.error) setContratos(contratosRes.data || []);
        if (!dailyMetricsConfigRes.error) setDailyMetricsConfig(dailyMetricsConfigRes.data || []);

        refetchCommissions();
      } catch (error: any) {
        console.error(`Erro crítico ao carregar dados: ${error.message}`);
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
    if (error) {
      toast.error(`Erro ao atualizar checklist: ${error.message}`);
      setCandidates(prev => prev.map(c => (c.id === id || c.db_id === id) ? candidate : c));
    }
  }, [candidates]);

  const deleteCandidate = useCallback(async (id: string) => {
    const candidate = candidates.find(c => c.id === id || c.db_id === id);
    if (!candidate) return;
    const dbId = candidate.db_id || id;
    const localId = candidate.id;
    const { error } = await supabase.from('candidates').delete().eq('id', dbId);
    if (error) throw error;
    setCandidates(prev => prev.filter(c => c.db_id !== dbId && c.id !== localId));
  }, [candidates]);

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

  const addHiringPipelineColumn = useCallback((column: Omit<HiringPipelineColumn, 'id'>) => {
    const newColumns = [...hiringPipelineColumns, { ...column, id: crypto.randomUUID() }];
    setHiringPipelineColumns(newColumns);
    updateConfig({ hiringPipelineColumns: newColumns });
  }, [hiringPipelineColumns, updateConfig]);

  const updateHiringPipelineColumn = useCallback((columnId: string, updates: Partial<HiringPipelineColumn>) => {
    const newColumns = hiringPipelineColumns.map(column => column.id === columnId ? { ...column, ...updates } : column);
    setHiringPipelineColumns(newColumns);
    updateConfig({ hiringPipelineColumns: newColumns });
  }, [hiringPipelineColumns, updateConfig]);

  const deleteHiringPipelineColumn = useCallback((columnId: string) => {
    const newColumns = hiringPipelineColumns.filter(column => column.id !== columnId);
    setHiringPipelineColumns(newColumns);
    updateConfig({ hiringPipelineColumns: newColumns });
  }, [hiringPipelineColumns, updateConfig]);

  const moveHiringPipelineColumn = useCallback((columnId: string, direction: 'left' | 'right') => {
    const index = hiringPipelineColumns.findIndex(column => column.id === columnId);
    if (index === -1) return;
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= hiringPipelineColumns.length) return;
    const newColumns = [...hiringPipelineColumns];
    [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
    setHiringPipelineColumns(newColumns);
    updateConfig({ hiringPipelineColumns: newColumns });
  }, [hiringPipelineColumns, updateConfig]);

  const resetHiringPipelineColumnsToDefault = useCallback(() => {
    setHiringPipelineColumns(DEFAULT_HIRING_PIPELINE_COLUMNS);
    updateConfig({ hiringPipelineColumns: DEFAULT_HIRING_PIPELINE_COLUMNS });
  }, [updateConfig]);

  const addCrmLead = useCallback(async (lead: Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by' | 'updated_by'>) => {
    if (!user || !crmOwnerUserId) throw new Error("User not authenticated or CRM Owner not set.");
    const { data, error } = await supabase.from('crm_leads').insert({ ...lead, user_id: crmOwnerUserId, created_by: user.id }).select().single();
    if (error) throw error;
    const newLead = {
      id: data.id, consultant_id: data.consultant_id, stage_id: data.stage_id, user_id: data.user_id, name: data.name, data: data.data,
      created_at: data.created_at, updated_at: data.updated_at, created_by: data.created_by, updated_by: data.updated_by,
      proposal_value: parseDbCurrency(data.proposal_value) || undefined, proposal_closing_date: data.proposal_closing_date,
      sold_credit_value: parseDbCurrency(data.sold_credit_value) || undefined, sold_group: data.sold_group, sold_quota: data.sold_quota, sale_date: data.sale_date
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
      proposal_value: parseDbCurrency(data.proposal_value) || undefined, proposal_closing_date: data.proposal_closing_date,
      sold_credit_value: parseDbCurrency(data.sold_credit_value) || undefined, sold_group: data.sold_group, sold_quota: data.sold_quota, sale_date: data.sale_date
    };
    setCrmLeads(prev => prev.map(l => l.id === id ? updatedLead : l));
    return updatedLead;
  }, [user, parseDbCurrency]);

  const deleteCrmLead = useCallback(async (id: string) => {
    const { error } = await supabase.from('crm_leads').delete().eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) throw error;
    setCrmLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  const addProcess = useCallback(async (processData: Omit<Process, 'id' | 'user_id' | 'created_at' | 'updated_at'>, filesToAdd?: { file: File, type: string }[], linksToAdd?: { url: string, type: string }[], coverFile?: File) => {
    if (!user) throw new Error("User not authenticated.");
    const { attachments: _, ...cleanData } = processData as any;
    const dataToInsert = { ...cleanData, user_id: user.id };
    const { data: process, error } = await supabase.from('processes').insert(dataToInsert).select().single();
    if (error) throw error;
    const attachments: ProcessAttachment[] = [];
    if (coverFile) {
      const formData = new FormData();
      formData.append('file', coverFile);
      formData.append('processId', process.id);
      formData.append('assetType', 'cover');
      const { data: coverResult, error: coverError } = await supabase.functions.invoke('upload-process-assets', { body: formData });
      if (coverError || coverResult.error) {
        console.error("Cover upload via Edge Function failed:", coverError || coverResult.error);
      } else {
        const { error: updateCoverError } = await supabase.from('processes').update({ cover_url: coverResult.publicUrl }).eq('id', process.id);
        if (updateCoverError) console.error("Failed to update process with cover URL:", updateCoverError);
        else process.cover_url = coverResult.publicUrl;
      }
    }
    if (filesToAdd && filesToAdd.length > 0) {
      for (const item of filesToAdd) {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('processId', process.id);
        formData.append('assetType', 'attachment');
        formData.append('attachmentType', item.type);
        const { data: attachResult, error: attachError } = await supabase.functions.invoke('upload-process-assets', { body: formData });
        if (attachError || attachResult.error) {
          console.error(`Attachment upload failed for ${item.file.name}:`, attachError || attachResult.error);
        } else if (attachResult.attachment) {
          attachments.push(attachResult.attachment);
        }
      }
    }
    if (linksToAdd && linksToAdd.length > 0) {
      for (const item of linksToAdd) {
        const { data: attachment, error: attachError } = await supabase.from('process_attachments').insert({ process_id: process.id, file_url: item.url, file_type: 'link', file_name: 'Link Externo' }).select().single();
        if (!attachError && attachment) attachments.push(attachment);
      }
    }
    const newProcess = { ...process, attachments };
    setProcesses(prev => [newProcess, ...prev].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    return newProcess;
  }, [user]);

const updateProcess = useCallback(async (id: string, updates: Partial<Process>, filesToAdd?: { file: File, type: string }[], linksToAdd?: { url: string, type: string }[], coverFile?: File) => {
    if (!user) throw new Error("User not authenticated.");
    const updatesPayload: Partial<Process> = {
      title: updates.title,
      description: updates.description,
      content: updates.content,
      type: updates.type,
    };
    if (coverFile) {
      const formData = new FormData();
      formData.append('file', coverFile);
      formData.append('processId', id);
      formData.append('assetType', 'cover');
      const { data: coverResult, error: coverError } = await supabase.functions.invoke('upload-process-assets', { body: formData });
      if (coverError || coverResult.error) {
        throw new Error(`Falha no upload da imagem de capa: ${coverError?.message || coverResult.error}`);
      }
      updatesPayload.cover_url = coverResult.publicUrl;
    } else if (updates.cover_url === null) {
      updatesPayload.cover_url = null;
    }
    const { data: process, error } = await supabase.from('processes').update(updatesPayload).eq('id', id).select().single();
    if (error) {
      console.error("Process update error:", error);
      throw new Error(`Falha ao atualizar o processo: ${error.message}`);
    }
    if (filesToAdd && filesToAdd.length > 0) {
      for (const item of filesToAdd) {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('processId', id);
        formData.append('assetType', 'attachment');
        formData.append('attachmentType', item.type);
        const { error: attachError } = await supabase.functions.invoke('upload-process-assets', { body: formData });
        if (attachError) console.error(`Attachment upload failed for ${item.file.name}:`, attachError);
      }
    }
    if (linksToAdd && linksToAdd.length > 0) {
      for (const item of linksToAdd) {
        await supabase.from('process_attachments').insert({ process_id: id, file_url: item.url, file_type: 'link', file_name: 'Link Externo' });
      }
    }
    const { data: allAttachments } = await supabase.from('process_attachments').select('*').eq('process_id', id);
    const updatedProcess = { ...process, attachments: allAttachments || [] };
    setProcesses(prev => prev.map(p => p.id === id ? updatedProcess : p).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    return updatedProcess;
  }, [user]);

  const deleteProcess = useCallback(async (id: string) => {
    const { error } = await supabase.from('processes').delete().eq('id', id);
    if (error) throw error;
    setProcesses(prev => prev.filter(p => p.id !== id));
  }, []);

  const deleteProcessAttachment = useCallback(async (attachmentId: string) => {
    const { error } = await supabase.from('process_attachments').delete().eq('id', attachmentId);
    if (error) throw error;
    setProcesses(prev => prev.map(p => ({
      ...p,
      attachments: p.attachments?.filter(a => a.id !== attachmentId)
    })));
  }, []);

  const addContrato = useCallback(async (file: File, displayName: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const sanitized = sanitizeFilename(file.name);
    const path = `${Date.now()}-${sanitized}`;
    const { error: uploadError } = await supabase.storage.from('contratos').upload(path, file);
    if (uploadError) throw uploadError;
    const { data, error } = await supabase.from('contratos').insert({
      file_name: file.name,
      display_name: displayName,
      file_path: path,
      file_type: file.type,
      uploaded_by: user.id,
    }).select().single();
    if (error) throw error;
    setContratos(prev => [data, ...prev]);
    return data;
  }, [user]);

  const deleteContrato = useCallback(async (id: string, filePath: string) => {
    const { error: storageError } = await supabase.storage.from('contratos').remove([filePath]);
    if (storageError) console.error("Erro ao remover arquivo do storage:", storageError);
    const { error } = await supabase.from('contratos').delete().eq('id', id);
    if (error) throw error;
    setContratos(prev => prev.filter(c => c.id !== id));
  }, []);

  const addChecklistStage = useCallback((title: string, description: string) => {
    const newStructure = [...checklistStructure, { id: crypto.randomUUID(), title, description, items: [] }];
    setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
  }, [checklistStructure, updateConfig]);

  const updateChecklistStage = useCallback((stageId: string, updates: Partial<ChecklistStage>) => {
    const newStructure = checklistStructure.map(stage => stage.id === stageId ? { ...stage, ...updates } : stage);
    setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
  }, [checklistStructure, updateConfig]);

  const deleteChecklistStage = useCallback((stageId: string) => {
    const newStructure = checklistStructure.filter(stage => stage.id !== stageId);
    setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
  }, [checklistStructure, updateConfig]);

  const moveChecklistStage = useCallback((stageId: string, direction: 'up' | 'down') => {
    const index = checklistStructure.findIndex(s => s.id === stageId);
    if (index === -1) return;
    const newStructure = [...checklistStructure];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newStructure.length) {
      [newStructure[index], newStructure[targetIndex]] = [newStructure[targetIndex], newStructure[index]];
      setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
    }
  }, [checklistStructure, updateConfig]);

  const addChecklistItem = useCallback((stageId: string, label: string, responsibleRole?: 'GESTOR' | 'SECRETARIA') => {
    const newStructure = checklistStructure.map(stage => stage.id === stageId ? { ...stage, items: [...stage.items, { id: crypto.randomUUID(), label, responsibleRole }] } : stage);
    setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
  }, [checklistStructure, updateConfig]);

  const updateChecklistItem = useCallback((stageId: string, itemId: string, updates: Partial<ChecklistItem>) => {
    const newStructure = checklistStructure.map(stage => stage.id !== stageId ? stage : { ...stage, items: stage.items.map(item => (item.id === itemId ? { ...item, ...updates } : item)) });
    setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
    return Promise.resolve({} as any);
  }, [checklistStructure, updateConfig]);

  const deleteChecklistItem = useCallback((stageId: string, itemId: string) => {
    const newStructure = checklistStructure.map(stage => stage.id === stageId ? { ...stage, items: stage.items.filter(item => item.id !== itemId) } : stage);
    setChecklistStructure(newStructure); updateConfig({ checklistStructure: newStructure });
  }, [checklistStructure, updateConfig]);

  const moveChecklistItem = useCallback((stageId: string, itemId: string, direction: 'up' | 'down') => {
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
  }, [checklistStructure, updateConfig]);

  const resetChecklistToDefault = useCallback(() => { setChecklistStructure(DEFAULT_STAGES); updateConfig({ checklistStructure: DEFAULT_STAGES }); }, [updateConfig]);

  const addCutoffPeriod = useCallback(async (period: Omit<CutoffPeriod, 'id' | 'db_id'>) => {
    const { data, error } = await supabase.from('cutoff_periods').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: period }).select().single();
    if (error) throw error;
    setCutoffPeriods(prev => [...prev, { ...period, id: (period as any).id || crypto.randomUUID(), db_id: data.id }]);
  }, []);

  const updateCutoffPeriod = useCallback(async (id: string, updates: Partial<CutoffPeriod>) => {
    const { error } = await supabase.from('cutoff_periods').update({ data: updates }).eq('id', id);
    if (error) throw error;
    setCutoffPeriods(prev => prev.map(p => p.db_id === id ? { ...p, ...updates } : p));
  }, []);

  const deleteCutoffPeriod = useCallback(async (id: string) => {
    const { error } = await supabase.from('cutoff_periods').delete().eq('id', id);
    if (error) throw error;
    setCutoffPeriods(prev => prev.filter(p => p.db_id !== id));
  }, []);

  const addOnlineOnboardingSession = useCallback(async (consultantName: string) => {
    const { data: session, error: sessionError } = await supabase.from('onboarding_sessions').insert({ user_id: JOAO_GESTOR_AUTH_ID, consultant_name: consultantName }).select().single();
    if (sessionError) throw sessionError;
    const videosToInsert = onboardingTemplateVideos.map(v => ({ session_id: session.id, title: v.title, video_url: v.video_url, order: v.order, is_completed: false }));
    const { data: videos, error: videosError } = await supabase.from('onboarding_videos').insert(videosToInsert).select();
    if (videosError) throw videosError;
    setOnboardingSessions(prev => [...prev, { ...session, videos: videos || [] }]);
  }, [onboardingTemplateVideos]);

  const deleteOnlineOnboardingSession = useCallback(async (sessionId: string) => {
    const { error } = await supabase.from('onboarding_sessions').delete().eq('id', sessionId);
    if (error) throw error;
    setOnboardingSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  const addVideoToTemplate = useCallback(async (title: string, video_url: string) => {
    const order = onboardingTemplateVideos.length > 0 ? Math.max(...onboardingTemplateVideos.map(v => v.order)) + 1 : 1;
    const { data, error } = await supabase.from('onboarding_video_templates').insert({ user_id: JOAO_GESTOR_AUTH_ID, title, video_url, order }).select().single();
    if (error) throw error;
    setOnboardingTemplateVideos(prev => [...prev, data]);
  }, [onboardingTemplateVideos]);

  const deleteVideoFromTemplate = useCallback(async (videoId: string) => {
    const { error } = await supabase.from('onboarding_video_templates').delete().eq('id', videoId);
    if (error) throw error;
    setOnboardingTemplateVideos(prev => prev.filter(v => v.id !== videoId));
  }, []);

  const addDailyChecklist = useCallback(async (title: string) => {
    const { data, error } = await supabase.from('daily_checklists').insert({ user_id: JOAO_GESTOR_AUTH_ID, title }).select().single();
    if (error) throw error; setDailyChecklists(prev => [...prev, data]); return data;
  }, []);

  const updateDailyChecklist = useCallback(async (id: string, updates: Partial<DailyChecklist>) => {
    const { data, error } = await supabase.from('daily_checklists').update(updates).eq('id', id).select().single();
    if (error) throw error; setDailyChecklists(prev => prev.map(c => c.id === id ? data : c)); return data;
  }, []);

  const deleteDailyChecklist = useCallback(async (id: string) => {
    const { error } = await supabase.from('daily_checklists').delete().eq('id', id);
    if (error) throw error; setDailyChecklists(prev => prev.filter(c => c.id !== id));
  }, []);

  const addDailyChecklistItem = useCallback(async (daily_checklist_id: string, text: string, order_index: number, resource?: DailyChecklistItemResource, audioFile?: File, imageFile?: File) => {
    let finalResource = resource;
    if (audioFile || imageFile) {
      const uploadFile = async (file: File, prefix: string) => {
        const sanitized = sanitizeFilename(file.name);
        const path = `checklist_resources/${Date.now()}-${prefix}-${sanitized}`;
        const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, file);
        if (uploadError) throw uploadError;
        return supabase.storage.from('form_uploads').getPublicUrl(path).data.publicUrl;
      };
      if (resource?.type === 'text_audio' && audioFile) {
        const url = await uploadFile(audioFile, 'audio');
        finalResource = { ...resource, content: { ...(resource.content as any), audioUrl: url } };
      } else if (resource?.type === 'text_audio_image') {
        let audioUrl = (resource.content as any).audioUrl;
        let imageUrl = (resource.content as any).imageUrl;
        if (audioFile) audioUrl = await uploadFile(audioFile, 'audio');
        if (imageFile) imageUrl = await uploadFile(imageFile, 'image');
        finalResource = { ...resource, content: { ...(resource.content as any), audioUrl, imageUrl } };
      } else if ((resource?.type === 'image' || resource?.type === 'pdf' || resource?.type === 'audio') && imageFile) {
        const url = await uploadFile(imageFile, resource.type);
        finalResource = { ...resource, content: url };
      }
    }
    const { data, error } = await supabase.from('daily_checklist_items').insert({ daily_checklist_id, text, order_index, resource: finalResource }).select().single();
    if (error) throw error; setDailyChecklistItem(prev => [...prev, data]); return data;
  }, []);

  const updateDailyChecklistItem = useCallback(async (id: string, updates: Partial<DailyChecklistItem>, audioFile?: File, imageFile?: File) => {
    let finalResource = updates.resource;
    if (audioFile || imageFile) {
      const uploadFile = async (file: File, prefix: string) => {
        const sanitized = sanitizeFilename(file.name);
        const path = `checklist_resources/${Date.now()}-${prefix}-${sanitized}`;
        const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, file);
        if (uploadError) throw uploadError;
        return supabase.storage.from('form_uploads').getPublicUrl(path).data.publicUrl;
      };
      if (updates.resource?.type === 'text_audio' && audioFile) {
        const url = await uploadFile(audioFile, 'audio');
        finalResource = { ...updates.resource, content: { ...(updates.resource.content as any), audioUrl: url } };
      } else if (updates.resource?.type === 'text_audio_image') {
        let audioUrl = (updates.resource.content as any).audioUrl;
        let imageUrl = (updates.resource.content as any).imageUrl;
        if (audioFile) audioUrl = await uploadFile(audioFile, 'audio');
        if (imageFile) imageUrl = await uploadFile(imageFile, 'image');
        finalResource = { ...updates.resource, content: { ...(updates.resource.content as any), audioUrl, imageUrl } };
      } else if ((updates.resource?.type === 'image' || updates.resource?.type === 'pdf' || updates.resource?.type === 'audio') && imageFile) {
        const url = await uploadFile(imageFile, updates.resource.type);
        finalResource = { ...updates.resource, content: url };
      }
    }
    const { data, error } = await supabase.from('daily_checklist_items').update({ ...updates, resource: finalResource }).eq('id', id).select().single();
    if (error) throw error; setDailyChecklistItem(prev => prev.map(i => i.id === id ? data : i)); return data;
  }, []);

  const deleteDailyChecklistItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('daily_checklist_items').delete().eq('id', id);
    if (error) throw error; setDailyChecklistItem(prev => prev.filter(i => i.id !== id));
  }, []);

  const moveDailyChecklistItem = useCallback(async (checklistId: string, itemId: string, direction: 'up' | 'down') => {
    const items = dailyChecklistItems.filter(i => i.daily_checklist_id === checklistId).sort((a, b) => a.order_index - b.order_index);
    const index = items.findIndex(i => i.id === itemId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const itemA = items[index]; const itemB = items[targetIndex];
    const { error } = await supabase.from('daily_checklist_items').update({ order_index: itemB.order_index }).eq('id', itemA.id);
    if (error) throw error;
    const { error: error2 } = await supabase.from('daily_checklist_items').update({ order_index: itemA.order_index }).eq('id', itemB.id);
    if (error2) throw error2;
    setDailyChecklistItem(prev => prev.map(i => i.id === itemA.id ? { ...i, order_index: itemB.order_index } : i.id === itemB.id ? { ...i, order_index: itemA.order_index } : i));
  }, [dailyChecklistItems]);

  const assignDailyChecklistToConsultant = useCallback(async (daily_checklist_id: string, consultant_id: string) => {
    const { data, error } = await supabase.from('daily_checklist_assignments').insert({ daily_checklist_id, consultant_id }).select().single();
    if (error) throw error; setDailyChecklistAssignments(prev => [...prev, data]); return data;
  }, []);

  const unassignDailyChecklistFromConsultant = useCallback(async (daily_checklist_id: string, consultant_id: string) => {
    const { error } = await supabase.from('daily_checklist_assignments').delete().eq('daily_checklist_id', daily_checklist_id).eq('consultant_id', consultant_id);
    if (error) throw error; setDailyChecklistAssignments(prev => prev.filter(a => !(a.daily_checklist_id === daily_checklist_id && a.consultant_id === consultant_id)));
  }, []);

  const toggleDailyChecklistCompletion = useCallback(async (daily_checklist_item_id: string, date: string, done: boolean, consultant_id: string) => {
    if (done) {
      const { data, error } = await supabase.from('daily_checklist_completions').insert({ daily_checklist_item_id, consultant_id, date, done: true }).select().single();
      if (error) throw error; setDailyChecklistCompletions(prev => [...prev, data]);
    } else {
      const { error } = await supabase.from('daily_checklist_completions').delete().eq('daily_checklist_item_id', daily_checklist_item_id).eq('consultant_id', consultant_id).eq('date', date);
      if (error) throw error; setDailyChecklistCompletions(prev => prev.filter(c => !(c.daily_checklist_item_id === daily_checklist_item_id && c.consultant_id === consultant_id && c.date === date)));
    }
  }, []);

  const addWeeklyTarget = useCallback(async (target: Omit<WeeklyTarget, 'id' | 'user_id' | 'created_at'>) => {
    const { data, error } = await supabase.from('weekly_targets').insert({ ...target, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
    if (error) throw error; setWeeklyTargets(prev => [...prev, data]); return data;
  }, []);

  const updateWeeklyTarget = useCallback(async (id: string, updates: Partial<WeeklyTarget>) => {
    const { data, error } = await supabase.from('weekly_targets').update(updates).eq('id', id).select().single();
    if (error) throw error; setWeeklyTargets(prev => prev.map(t => t.id === id ? data : t)); return data;
  }, []);

  const deleteWeeklyTarget = useCallback(async (id: string) => {
    const { error } = await supabase.from('weekly_targets').delete().eq('id', id);
    if (error) throw error; setWeeklyTargets(prev => prev.filter(t => t.id !== id));
  }, []);

  const addWeeklyTargetItem = useCallback(async (item: Omit<WeeklyTargetItem, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('weekly_target_items').insert(item).select().single();
    if (error) throw error; setWeeklyTargetItems(prev => [...prev, data]); return data;
  }, []);

  const updateWeeklyTargetItem = useCallback(async (id: string, updates: Partial<WeeklyTargetItem>) => {
    const { data, error } = await supabase.from('weekly_target_items').update(updates).eq('id', id).select().single();
    if (error) throw error; setWeeklyTargetItems(prev => prev.map(i => i.id === id ? data : i)); return data;
  }, []);

  const deleteWeeklyTargetItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('weekly_target_items').delete().eq('id', id);
    if (error) throw error; setWeeklyTargetItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateWeeklyTargetItemOrder = useCallback(async (orderedItems: WeeklyTargetItem[]) => {
    const updates = orderedItems.map((item, index) => supabase.from('weekly_target_items').update({ order_index: index }).eq('id', item.id));
    await Promise.all(updates);
    const { data } = await supabase.from('weekly_target_items').select('*').order('order_index');
    setWeeklyTargetItems(data || []);
  }, []);

  const assignWeeklyTargetToConsultant = useCallback(async (weekly_target_id: string, consultant_id: string) => {
    const { data, error } = await supabase.from('weekly_target_assignments').insert({ weekly_target_id, consultant_id }).select().single();
    if (error) throw error; setWeeklyTargetAssignments(prev => [...prev, data]); return data;
  }, []);

  const unassignWeeklyTargetFromConsultant = useCallback(async (weekly_target_id: string, consultant_id: string) => {
    const { error } = await supabase.from('weekly_target_assignments').delete().eq('weekly_target_id', weekly_target_id).eq('consultant_id', consultant_id);
    if (error) throw error; setWeeklyTargetAssignments(prev => prev.filter(a => !(a.weekly_target_id === weekly_target_id && a.consultant_id === consultant_id)));
  }, []);

  const addMetricLog = useCallback(async (log: Omit<MetricLog, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('metric_logs').insert(log).select().single();
    if (error) throw error; setMetricLogs(prev => [...prev, data]); return data;
  }, []);

  const updateMetricLog = useCallback(async (id: string, updates: Partial<MetricLog>) => {
    const { data, error } = await supabase.from('metric_logs').update(updates).eq('id', id).select().single();
    if (error) throw error; setMetricLogs(prev => prev.map(l => l.id === id ? data : l)); return data;
  }, []);

  const deleteMetricLog = useCallback(async (id: string) => {
    const { error } = await supabase.from('metric_logs').delete().eq('id', id);
    if (error) throw error; setMetricLogs(prev => prev.filter(l => l.id !== id));
  }, []);

  const addDailyMetricConfig = useCallback(async (config: Omit<DailyMetricConfig, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) throw new Error("User not authenticated.");
    const { data, error } = await supabase.from('daily_metrics_config').insert({ ...config, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
    if (error) throw error;
    setDailyMetricsConfig(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index));
    return data;
  }, [user]);

  const updateDailyMetricConfig = useCallback(async (id: string, updates: Partial<DailyMetricConfig>) => {
      const { data, error } = await supabase.from('daily_metrics_config').update(updates).eq('id', id).select().single();
      if (error) throw error;
      setDailyMetricsConfig(prev => prev.map(c => c.id === id ? data : c).sort((a, b) => a.order_index - b.order_index));
      return data;
  }, []);

  const deleteDailyMetricConfig = useCallback(async (id: string) => {
      const { error } = await supabase.from('daily_metrics_config').delete().eq('id', id);
      if (error) throw error;
      setDailyMetricsConfig(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateDailyMetricConfigOrder = useCallback(async (orderedConfigs: DailyMetricConfig[]) => {
      const updates = orderedConfigs.map((config, index) =>
        supabase.from('daily_metrics_config').update({ order_index: index }).eq('id', config.id)
      );
      const results = await Promise.all(updates);
      const anyError = results.some(res => res.error);
      if (anyError) {
          toast.error("Erro ao reordenar métricas.");
          const { data } = await supabase.from('daily_metrics_config').select('*').order('order_index');
          setDailyMetricsConfig(data || []);
      } else {
          setDailyMetricsConfig(orderedConfigs);
      }
  }, []);

  const addSupportMaterialV2 = useCallback(async (material: Omit<SupportMaterialV2, 'id' | 'user_id' | 'created_at'>, file?: File) => {
    let content = material.content;
    if (file) {
      const sanitized = sanitizeFilename(file.name);
      const path = `support_materials/${Date.now()}-${sanitized}`;
      const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, file);
      if (uploadError) throw uploadError;
      content = supabase.storage.from('form_uploads').getPublicUrl(path).data.publicUrl;
    }
    const { data, error } = await supabase.from('support_materials_v2').insert({ ...material, user_id: JOAO_GESTOR_AUTH_ID, content }).select().single();
    if (error) throw error; setSupportMaterialsV2(prev => [...prev, data]); return data;
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
    if (error) throw error; setSupportMaterialsV2(prev => prev.map(m => m.id === id ? data : m)); return data;
  }, []);

  const deleteSupportMaterialV2 = useCallback(async (id: string) => {
    const { error } = await supabase.from('support_materials_v2').delete().eq('id', id);
    if (error) throw error; setSupportMaterialsV2(prev => prev.filter(m => m.id !== id));
  }, []);

  const assignSupportMaterialToConsultant = useCallback(async (material_id: string, consultant_id: string) => {
    const { data, error } = await supabase.from('support_material_assignments').insert({ material_id, consultant_id }).select().single();
    if (error) throw error; setSupportMaterialAssignments(prev => [...prev, data]); return data;
  }, []);

  const unassignSupportMaterialFromConsultant = useCallback(async (material_id: string, consultant_id: string) => {
    const { error } = await supabase.from('support_material_assignments').delete().eq('material_id', material_id).eq('consultant_id', consultant_id);
    if (error) throw error; setSupportMaterialAssignments(prev => prev.filter(a => !(a.material_id === material_id && a.consultant_id === consultant_id)));
  }, []);

  const addLeadTask = useCallback(async (task: Omit<LeadTask, 'id' | 'created_at' | 'completed_at' | 'updated_at'> & { user_id: string; manager_id?: string | null; }) => {
    const { data, error } = await supabase.from('lead_tasks').insert(task).select().single();
    if (error) throw error; setLeadTasks(prev => [...prev, data]); return data;
  }, []);

  const updateLeadTask = useCallback(async (id: string, updates: Partial<LeadTask>) => {
    const { data, error } = await supabase.from('lead_tasks').update(updates).eq('id', id).select().single();
    if (error) throw error; setLeadTasks(prev => prev.map(t => t.id === id ? data : t)); return data;
  }, []);

  const deleteLeadTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('lead_tasks').delete().eq('id', id);
    if (error) throw error; setLeadTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleLeadTaskCompletion = useCallback(async (id: string, is_completed: boolean) => {
    const completed_at = is_completed ? new Date().toISOString() : null;
    const { data, error } = await supabase.from('lead_tasks').update({ is_completed, completed_at }).eq('id', id).select().single();
    if (error) throw error; setLeadTasks(prev => prev.map(t => t.id === id ? data : t)); return data;
  }, []);

  const updateLeadMeetingInvitationStatus = useCallback(async (taskId: string, status: 'accepted' | 'declined') => {
    const { data, error } = await supabase.from('lead_tasks').update({ manager_invitation_status: status }).eq('id', taskId).select().single();
    if (error) throw error; setLeadTasks(prev => prev.map(t => t.id === taskId ? data : t)); return data;
  }, []);

  const addGestorTask = useCallback(async (task: Omit<GestorTask, 'id' | 'user_id' | 'created_at' | 'is_completed'>, targetUserId?: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('gestor_tasks').insert({ ...task, user_id: targetUserId || user.id }).select().single();
    if (error) throw error; setGestorTasks(prev => [...prev, data]); return data;
  }, [user]);

  const updateGestorTask = useCallback(async (id: string, updates: Partial<GestorTask>) => {
    const { data, error } = await supabase.from('gestor_tasks').update(updates).eq('id', id).select().single();
    if (error) throw error; setGestorTasks(prev => prev.map(t => t.id === id ? data : t)); return data;
  }, []);

  const deleteGestorTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('gestor_tasks').delete().eq('id', id);
    if (error) throw error; setGestorTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleGestorTaskCompletion = useCallback(async (gestor_task_id: string, done: boolean, date: string) => {
    const task = gestorTasks.find(t => t.id === gestor_task_id);
    if (!task) return;
    const isRecurring = task.recurrence_pattern && task.recurrence_pattern.type !== 'none';
    if (isRecurring) {
      if (done) {
        const { data, error } = await supabase.from('gestor_task_completions').insert({ gestor_task_id, user_id: JOAO_GESTOR_AUTH_ID, date, done: true }).select().single();
        if (error) throw error; setGestorTaskCompletions(prev => [...prev, data]);
      } else {
        const { error } = await supabase.from('gestor_task_completions').delete().eq('gestor_task_id', gestor_task_id).eq('user_id', JOAO_GESTOR_AUTH_ID).eq('date', date);
        if (error) throw error; setGestorTaskCompletions(prev => prev.filter(c => !(c.gestor_task_id === gestor_task_id && c.date === date)));
      }
    } else {
      await updateGestorTask(gestor_task_id, { is_completed: done });
    }
  }, [gestorTasks, updateGestorTask]);

  const addFinancialEntry = useCallback(async (entry: Omit<FinancialEntry, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) throw new Error('Usuário não autenticado.');
    const { data, error } = await supabase.from('financial_entries').insert({ ...entry, user_id: user.id }).select().single();
    if (error) throw error; setFinancialEntries(prev => [...prev, { ...data, amount: parseFloat(data.amount) }]); return data;
  }, [user]);

  const updateFinancialEntry = useCallback(async (id: string, updates: Partial<FinancialEntry>) => {
    const cleanUpdates: any = { ...updates };
    delete cleanUpdates.id; delete cleanUpdates.db_id; delete cleanUpdates.user_id; delete cleanUpdates.created_at;
    const { data, error } = await supabase.from('financial_entries').update(cleanUpdates).eq('id', id).select().single();
    if (error) throw error; setFinancialEntries(prev => prev.map(e => e.id === id ? { ...data, amount: parseFloat(data.amount) } : e)); return data;
  }, []);

  const deleteFinancialEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from('financial_entries').delete().eq('id', id);
    if (error) throw error; setFinancialEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateFormCadastro = useCallback(async (id: string, updates: Partial<FormCadastro>) => {
    const { data, error } = await supabase.from('form_submissions').update(updates).eq('id', id).select().single();
    if (error) throw error; setFormCadastros(prev => prev.map(f => f.id === id ? data : f)); return data;
  }, []);

  const deleteFormCadastro = useCallback(async (id: string) => {
    const { error } = await supabase.from('form_submissions').delete().eq('id', id);
    if (error) throw error; setFormCadastros(prev => prev.filter(f => f.id !== id));
  }, []);

  const addFeedback = useCallback(async (personId: string, feedback: Omit<Feedback, 'id'>) => {
    const candidate = candidates.find(c => c.id === personId || c.db_id === personId);
    if (!candidate) throw new Error("Candidato não encontrado.");
    const newFeedback = { ...feedback, id: crypto.randomUUID() };
    const updatedFeedbacks = [...(candidate.feedbacks || []), newFeedback];
    await updateCandidate(candidate.id, { feedbacks: updatedFeedbacks });
    return newFeedback;
  }, [candidates, updateCandidate]);

  const updateFeedback = useCallback(async (personId: string, feedback: Feedback) => {
    const candidate = candidates.find(c => c.id === person<think>Initial files ranking:

src/App.tsx: 0.98

src/pages/consultor/Dashboard.tsx: 0.96

src/types.ts: 0.95

src/components/ConsultorSidebar.tsx: 0.95

src/components/GestorSidebar.tsx: 0.91

src/pages/consultor/DailyChecklist.tsx: 0.90

src/components/MetricCard.tsx: 0.90

src/context/AppContext.tsx: 0.87

src/pages/secretaria/SecretariaDailyChecklist.tsx: 0.84

src/components/ConsultorLayout.tsx: 0.82

src/pages/Dashboard.tsx: 0.75

src/pages/GoalsConfig.tsx: 0.71

src/layouts/ProtectedLayout.tsx: 0.71

src/layouts/SecretariaLayout.tsx: 0.68

src/data/consultantGoals.ts: 0.59

supabase/functions/manage-daily-checklist-item/index.ts: 0.56

src/components/consultor/DailyChecklistDisplay.tsx: 0.50

src/pages/gestor/GestorTasksPage.tsx: 0.47

src/components/GestorLayout.tsx: 0.44

src/data/checklistData.ts: 0.44

src/pages/Home.tsx: 0.32

src/components/ui/input.tsx: 0.32

src/lib/supabase.ts: 0.27

src/pages/gestor/DailyChecklistMonitoring.tsx: 0.27

src/pages/secretaria/SecretariaDashboard.tsx: 0.27

src/pages/gestor/DailyChecklistConfig.tsx: 0.25

src/context/AuthContext.tsx: 0.22

src/components/Header.tsx: 0.22

src/integrations/supabase/client.ts: 0.18

package.json: 0.16

src/components/ui/dialog.tsx: 0.13

src/data/commissionData.ts: 0.13

README.md: 0.09

src/components/crm/TopSellersChart.tsx: 0.09

src/components/crm/ScheduleMeetingModal.tsx: 0.08

src/utils/dateUtils.ts: 0.08

metadata.json: 0.08

src/components/ui/button.tsx: 0.07

src/components/gestor/ConsultantContributions.tsx: 0.06

public/sounds/celebration.mp3: 0.05

src/components/ui/label.tsx: 0.05

vercel.json: 0.04</think><think>Re-ranking the files. Please wait a moment...

Reasoning: undefined

</think><dyad-codebase-context files="src/types.ts,src/context/AppContext.tsx,src/components/GestorSidebar.tsx,src/components/ConsultorSidebar.tsx,src/App.tsx"></dyad-codebase-context><think>dyad-token-savings?original-tokens=427961.25&smart-context-tokens=35595.75</think>Com certeza! Vou continuar de onde parei.

Agora que a estrutura básica está pronta, vou criar as páginas para que você possa configurar as métricas e para que seus consultores possam preenchê-las. Também vou adicionar os links nos menus para facilitar o acesso.

Aqui estão os arquivos que vou criar e modificar:

1.  **`src/pages/gestor/DailyMetricsConfig.tsx`**: Uma nova página para você, gestor, configurar as métricas diárias.
2.  **`src/components/gestor/DailyMetricConfigModal.tsx`**: O modal que será usado na página de configuração para adicionar ou editar uma métrica.
3.  **`src/pages/consultor/DailyMetrics.tsx`**: A nova página para os consultores registrarem suas métricas diárias.
4.  **`src/App.tsx`**: Vou adicionar as rotas para as novas páginas.
5.  **`src/components/GestorSidebar.tsx`** e **`src/components/ConsultorSidebar.tsx`**: Adicionarei os links de navegação nos menus laterais.

Vamos lá!

<dyad-write path="src/pages/gestor/DailyMetricsConfig.tsx" description="Criando a página de configuração de métricas diárias para o gestor.">
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { DailyMetricConfig } from '@/types';
import { DailyMetricConfigModal } from '@/components/gestor/DailyMetricConfigModal';
import toast from 'react-hot-toast';

const DailyMetricsConfig = () => {
  const { dailyMetricsConfig, updateDailyMetricConfigOrder, deleteDailyMetricConfig } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DailyMetricConfig | null>(null);

  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(dailyMetricsConfig);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateDailyMetricConfigOrder(items);
    toast.success("Ordem das métricas atualizada.");
  };

  const handleAddNew = () => {
    setEditingConfig(null);
    setIsModalOpen(true);
  };

  const handleEdit = (config: DailyMetricConfig) => {
    setEditingConfig(config);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta métrica? Esta ação não pode ser desfeita.')) {
      try {
        await deleteDailyMetricConfig(id);
        toast.success("Métrica excluída com sucesso.");
      } catch (error) {
        toast.error("Erro ao excluir a métrica.");
        console.error(error);
      }
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Configuração de Métricas Diárias</CardTitle>
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Métrica
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Defina as métricas que os consultores devem preencher diariamente. Arraste para reordenar.
          </p>
          <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="metrics">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {dailyMetricsConfig.map((config, index) => (
                    <Draggable key={config.id} draggableId={config.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="flex items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
                        >
                          <GripVertical className="h-5 w-5 text-gray-400 mr-3" />
                          <div className="flex-grow">
                            <p className="font-medium text-gray-800 dark:text-gray-200">{config.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Chave: {config.metric_key} | Tipo: {config.type === 'currency' ? 'Moeda (R$)' : 'Número'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(config)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(config.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>
      <DailyMetricConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={editingConfig}
      />
    </div>
  );
};

export default DailyMetricsConfig;