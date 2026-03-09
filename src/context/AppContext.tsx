import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Candidate, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, Commission, SupportMaterial, GoalStage, TeamMember, InstallmentStatus, InstallmentInfo, CutoffPeriod, OnboardingSession, OnboardingVideoTemplate, CrmPipeline, CrmStage, CrmField, CrmLead, DailyChecklist, DailyChecklistItem, DailyChecklistAssignment, DailyChecklistCompletion, WeeklyTarget, WeeklyTargetItem, WeeklyTargetAssignment, MetricLog, SupportMaterialV2, SupportMaterialAssignment, LeadTask, DailyChecklistItemResource, GestorTask, GestorTaskCompletion, FinancialEntry, FormCadastro, FormFile, Notification, TeamProductionGoal, ColdCallLead, ColdCallLog, ChecklistItem, Process, ProcessAttachment, Feedback, InterviewQuestion } from '@/types';
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
        console.warn(`Erro ao carregar comissões: ${error.message}`);
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
    }
  }, []);

  useEffect(() => {
    const fetchData = async (userId: string) => {
      setIsDataLoading(true);
      try {
        const effectiveGestorId = JOAO_GESTOR_AUTH_ID;
        setCrmOwnerUserId(effectiveGestorId);

        await fetchAppConfig(effectiveGestorId);

        // Helper para buscar dados ignorando erros de tabela inexistente
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
          pipelinesRes, stagesRes, fieldsRes, crmLeadsRes,
          dailyChecklistsRes, dailyChecklistItemsRes, dailyChecklistAssignmentsRes, dailyChecklistCompletionsRes,
          weeklyTargetsRes, weeklyTargetItemsRes, weeklyTargetAssignmentsRes, metricLogsRes,
          supportMaterialsV2Res, supportMaterialAssignmentsV2Res,
          leadTasksRes, gestorTasksRes, gestorTaskCompletionsRes, financialEntriesRes,
          formCadastrosRes, formFilesRes, notificationsRes, teamProductionGoalsRes, teamMembersRes,
          coldCallLeadsRes, coldCallLogsRes, processesRes, processAttachmentsRes
        ] = await Promise.all([
          safeFetch('candidates', { select: 'id, data, created_at, last_updated_at', filters: { user_id: effectiveGestorId } }),
          safeFetch('support_materials', { select: 'id, data', filters: { user_id: effectiveGestorId } }),
          safeFetch('cutoff_periods', { select: 'id, data', filters: { user_id: effectiveGestorId } }),
          safeFetch('onboarding_sessions', { select: '*, videos:onboarding_videos(*)' }),
          safeFetch('onboarding_video_templates', { orderBy: 'order', ascending: true }),
          safeFetch('crm_pipelines', { filters: { user_id: effectiveGestorId } }),
          safeFetch('crm_stages', { filters: { user_id: effectiveGestorId }, orderBy: 'order_index' }),
          safeFetch('crm_fields', { filters: { user_id: effectiveGestorId } }),
          safeFetch('crm_leads', { filters: { user_id: effectiveGestorId }, orderBy: 'created_at', ascending: false }),
          safeFetch('daily_checklists', { filters: { user_id: effectiveGestorId } }),
          safeFetch('daily_checklist_items'),
          safeFetch('daily_checklist_assignments'),
          safeFetch('daily_checklist_completions'),
          safeFetch('weekly_targets', { filters: { user_id: effectiveGestorId } }),
          safeFetch('weekly_target_items'),
          safeFetch('weekly_target_assignments'),
          safeFetch('metric_logs'),
          safeFetch('support_materials_v2', { filters: { user_id: effectiveGestorId } }),
          safeFetch('support_material_assignments'),
          safeFetch('lead_tasks'),
          safeFetch('gestor_tasks', { filters: { user_id: effectiveGestorId } }),
          safeFetch('gestor_task_completions', { filters: { user_id: effectiveGestorId } }),
          safeFetch('financial_entries', { filters: { user_id: effectiveGestorId } }),
          safeFetch('form_submissions', { select: 'id, submission_date, data, internal_notes, is_complete', filters: { user_id: effectiveGestorId }, orderBy: 'submission_date', ascending: false }),
          safeFetch('form_files'),
          safeFetch('notifications', { filters: { user_id: userId, is_read: false }, orderBy: 'created_at', ascending: false }),
          safeFetch('team_production_goals', { filters: { user_id: effectiveGestorId }, orderBy: 'start_date', ascending: false }),
          safeFetch('team_members', { select: 'id, data, cpf, user_id', filters: { user_id: effectiveGestorId } }),
          safeFetch('cold_call_leads'),
          safeFetch('cold_call_logs'),
          safeFetch('processes', { filters: { user_id: effectiveGestorId } }),
          safeFetch('process_attachments')
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
          proposal_value: parseDbCurrency(lead.proposal_value) || undefined, proposal_closing_date: lead.proposal_closing_date, 
          sold_credit_value: parseDbCurrency(lead.sold_credit_value) || undefined, sold_group: lead.sold_group, sold_quota: lead.sold_quota, sale_date: lead.sale_date 
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
        
        if (!processesRes.error) {
          const allAttachments = processAttachmentsRes.data || [];
          const normalizedProcesses = (processesRes.data || []).map(p => ({
            ...p,
            attachments: allAttachments.filter(a => a.process_id === p.id)
          }));
          setProcesses(normalizedProcesses);
        }

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

  const addProcess = useCallback(async (processData: Omit<Process, 'id' | 'user_id' | 'created_at' | 'updated_at'>, filesToAdd?: { file: File, type: string }[], linksToAdd?: { url: string, type: string }[]) => {
    if (!user) throw new Error("User not authenticated.");
    
    // Remove 'attachments' if it exists in processData to avoid DB error
    const { attachments: _, ...cleanData } = processData as any;
    
    const { data: process, error } = await supabase.from('processes').insert({ ...cleanData, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
    if (error) {
      console.error("[AppContext] Error inserting process:", error);
      throw error;
    }
    console.log("[AppContext] Process inserted successfully:", process);

    const attachments: ProcessAttachment[] = [];

    if (filesToAdd && filesToAdd.length > 0) {
      for (const item of filesToAdd) {
        try {
          console.log(`[AppContext] Attempting to upload file: ${item.file.name} (type: ${item.type})`);
          const sanitized = sanitizeFilename(item.file.name);
          const path = `process_files/${process.id}/${Date.now()}-${sanitized}`;
          const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, item.file);
          if (uploadError) {
            console.error(`[AppContext] Error uploading file ${item.file.name}:`, uploadError);
            throw uploadError;
          }
          const fileUrl = supabase.storage.from('form_uploads').getPublicUrl(path).data.publicUrl;
          console.log(`[AppContext] File ${item.file.name} uploaded successfully. URL: ${fileUrl}`);
          
          const { data: attachment, error: attachError } = await supabase.from('process_attachments').insert({
            process_id: process.id,
            file_url: fileUrl,
            file_type: item.type,
            file_name: item.file.name
          }).select().single();
          
          if (attachError) {
            console.error("[AppContext] Error inserting attachment into DB:", attachError);
          } else if (attachment) {
            attachments.push(attachment);
            console.log("[AppContext] Attachment record created:", attachment);
          }
        } catch (err: any) {
          console.error("[AppContext] Error during file upload or attachment record creation:", err.message || err);
          // Continue with other files even if one fails
        }
      }
    }

    if (linksToAdd && linksToAdd.length > 0) {
      for (const item of linksToAdd) {
        console.log(`[AppContext] Attempting to insert link: ${item.url}`);
        const { data: attachment, error: attachError } = await supabase.from('process_attachments').insert({
          process_id: process.id,
          file_url: item.url,
          file_type: 'link',
          file_name: 'Link Externo'
        }).select().single();
        if (!attachError && attachment) {
          attachments.push(attachment);
          console.log("[AppContext] Link attachment record created:", attachment);
        } else if (attachError) {
          console.error("[AppContext] Error inserting link attachment into DB:", attachError);
        }
      }
    }

    const newProcess = { ...process, attachments };
    setProcesses(prev => [newProcess, ...prev].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    console.log("[AppContext] Final processes state updated.");
    return newProcess;
  }, [user]);

  const updateProcess = useCallback(async (id: string, updates: Partial<Process>, filesToAdd?: { file: File, type: string }[], linksToAdd?: { url: string, type: string }[]) => {
    // Remove 'attachments' if it exists in updates to avoid DB error
    const { attachments: _, ...cleanUpdates } = updates as any;
    
    const { data: process, error } = await supabase.from('processes').update(cleanUpdates).eq('id', id).select().single();
    if (error) {
      console.error("[AppContext] Error updating process:", error);
      throw error;
    }
    console.log("[AppContext] Process updated successfully:", process);

    if (filesToAdd && filesToAdd.length > 0) {
      for (const item of filesToAdd) {
        try {
          console.log(`[AppContext] Attempting to upload new file for update: ${item.file.name} (type: ${item.type})`);
          const sanitized = sanitizeFilename(item.file.name);
          const path = `process_files/${id}/${Date.now()}-${sanitized}`;
          const { error: uploadError } = await supabase.storage.from('form_uploads').upload(path, item.file);
          if (uploadError) {
            console.error(`[AppContext] Error uploading file ${item.file.name} during update:`, uploadError);
            throw uploadError;
          }
          const fileUrl = supabase.storage.from('form_uploads').getPublicUrl(path).data.publicUrl;
          console.log(`[AppContext] File ${item.file.name} uploaded successfully during update. URL: ${fileUrl}`);
          
          const { error: attachError } = await supabase.from('process_attachments').insert({
            process_id: id,
            file_url: fileUrl,
            file_type: item.type,
            file_name: item.file.name
          });
          if (attachError) console.error("[AppContext] Error inserting new attachment record during update:", attachError);
        } catch (err: any) {
          console.error("[AppContext] Error during new file upload or attachment record creation for update:", err.message || err);
        }
      }
    }

    if (linksToAdd && linksToAdd.length > 0) {
      for (const item of linksToAdd) {
        console.log(`[AppContext] Attempting to insert new link for update: ${item.url}`);
        const { error: attachError } = await supabase.from('process_attachments').insert({
          process_id: id,
          file_url: item.url,
          file_type: 'link',
          file_name: 'Link Externo'
        });
        if (attachError) console.error("[AppContext] Error inserting new link attachment during update:", attachError);
      }
    }

    const { data: allAttachments, error: fetchAttachError } = await supabase.from('process_attachments').select('*').eq('process_id', id);
    if (fetchAttachError) console.error("[AppContext] Error refetching attachments after update:", fetchAttachError);
    
    const updatedProcess = { ...process, attachments: allAttachments || [] };
    setProcesses(prev => prev.map(p => p.id === id ? updatedProcess : p).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    console.log("[AppContext] Final processes state updated after process update.");
    return updatedProcess;
  }, []);

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

  // --- Checklist Stage Functions ---
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

  // --- Cutoff Period Functions ---
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

  // --- Onboarding Functions ---
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

  // --- Daily Checklist Functions ---
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
    if (error) throw error; setDailyChecklistItems(prev => [...prev, data]); return data;
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
    if (error) throw error; setDailyChecklistItems(prev => prev.map(i => i.id === id ? data : i)); return data;
  }, []);

  const deleteDailyChecklistItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('daily_checklist_items').delete().eq('id', id);
    if (error) throw error; setDailyChecklistItems(prev => prev.filter(i => i.id !== id));
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
    setDailyChecklistItems(prev => prev.map(i => i.id === itemA.id ? { ...i, order_index: itemB.order_index } : i.id === itemB.id ? { ...i, order_index: itemA.order_index } : i));
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

  // --- Weekly Target Functions ---
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

  // --- Metric Log Functions ---
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

  // --- Support Material V2 Functions ---
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

  // --- Lead Task Functions ---
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

  // --- Gestor Task Functions ---
  const addGestorTask = useCallback(async (task: Omit<GestorTask, 'id' | 'user_id' | 'created_at' | 'is_completed'>) => {
    const { data, error } = await supabase.from('gestor_tasks').insert({ ...task, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
    if (error) throw error; setGestorTasks(prev => [...prev, data]); return data;
  }, []);

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

  // --- Financial Entry Functions ---
  const addFinancialEntry = useCallback(async (entry: Omit<FinancialEntry, 'id' | 'user_id' | 'created_at'>) => {
    const { data, error } = await supabase.from('financial_entries').insert({ ...entry, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
    if (error) throw error; setFinancialEntries(prev => [...prev, { ...data, amount: parseFloat(data.amount) }]); return data;
  }, []);

  const updateFinancialEntry = useCallback(async (id: string, updates: Partial<FinancialEntry>) => {
    const { data, error } = await supabase.from('financial_entries').update(updates).eq('id', id).select().single();
    if (error) throw error; setFinancialEntries(prev => prev.map(e => e.id === id ? { ...data, amount: parseFloat(data.amount) } : e)); return data;
  }, []);

  const deleteFinancialEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from('financial_entries').delete().eq('id', id);
    if (error) throw error; setFinancialEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  // --- Form Cadastro Functions ---
  const updateFormCadastro = useCallback(async (id: string, updates: Partial<FormCadastro>) => {
    const { data, error } = await supabase.from('form_submissions').update(updates).eq('id', id).select().single();
    if (error) throw error; setFormCadastros(prev => prev.map(f => f.id === id ? data : f)); return data;
  }, []);

  const deleteFormCadastro = useCallback(async (id: string) => {
    const { error } = await supabase.from('form_submissions').delete().eq('id', id);
    if (error) throw error; setFormCadastros(prev => prev.filter(f => f.id !== id));
  }, []);

  // --- Feedback Functions ---
  const addFeedback = useCallback(async (personId: string, feedback: Omit<Feedback, 'id'>) => {
    const candidate = candidates.find(c => c.id === personId || c.db_id === personId);
    if (!candidate) throw new Error("Candidato não encontrado.");
    const newFeedback = { ...feedback, id: crypto.randomUUID() };
    const updatedFeedbacks = [...(candidate.feedbacks || []), newFeedback];
    await updateCandidate(candidate.id, { feedbacks: updatedFeedbacks });
    return newFeedback;
  }, [candidates, updateCandidate]);

  const updateFeedback = useCallback(async (personId: string, feedback: Feedback) => {
    const candidate = candidates.find(c => c.id === personId || c.db_id === personId);
    if (!candidate) throw new Error("Candidato não encontrado.");
    const updatedFeedbacks = (candidate.feedbacks || []).map(f => f.id === feedback.id ? feedback : f);
    await updateCandidate(candidate.id, { feedbacks: updatedFeedbacks });
    return feedback;
  }, [candidates, updateCandidate]);

  const deleteFeedback = useCallback(async (personId: string, feedbackId: string) => {
    const candidate = candidates.find(c => c.id === personId || c.db_id === personId);
    if (!candidate) throw new Error("Candidato não encontrado.");
    const updatedFeedbacks = (candidate.feedbacks || []).filter(f => f.id !== feedbackId);
    await updateCandidate(candidate.id, { feedbacks: updatedFeedbacks });
  }, [candidates, updateCandidate]);

  const addTeamMemberFeedback = useCallback(async (teamMemberId: string, feedback: Omit<Feedback, 'id'>) => {
    const member = teamMembers.find(m => m.id === teamMemberId);
    if (!member) throw new Error("Membro da equipe não encontrado.");
    const newFeedback = { ...feedback, id: crypto.randomUUID() };
    const updatedFeedbacks = [...(member.feedbacks || []), newFeedback];
    await updateTeamMember(teamMemberId, { feedbacks: updatedFeedbacks });
    return newFeedback;
  }, [teamMembers]);

  const updateTeamMemberFeedback = useCallback(async (teamMemberId: string, feedback: Feedback) => {
    const member = teamMembers.find(m => m.id === teamMemberId);
    if (!member) throw new Error("Membro da equipe não encontrado.");
    const updatedFeedbacks = (member.feedbacks || []).map(f => f.id === feedback.id ? feedback : f);
    await updateTeamMember(teamMemberId, { feedbacks: updatedFeedbacks });
    return feedback;
  }, [teamMembers]);

  const deleteTeamMemberFeedback = useCallback(async (teamMemberId: string, feedbackId: string) => {
    const member = teamMembers.find(m => m.id === teamMemberId);
    if (!member) throw new Error("Membro da equipe não encontrado.");
    const updatedFeedbacks = (member.feedbacks || []).filter(f => f.id !== feedbackId);
    await updateTeamMember(teamMemberId, { feedbacks: updatedFeedbacks });
  }, [teamMembers]);

  // --- Team Member Functions ---
  const addTeamMember = useCallback(async (member: Omit<TeamMember, 'id'> & { email: string }) => {
    const tempPassword = generateRandomPassword();
    const roleForAuth = member.roles.includes('SECRETARIA') ? 'SECRETARIA' : member.roles.includes('GESTOR') ? 'GESTOR' : 'CONSULTOR';
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-or-link-consultant', {
      body: { email: member.email, name: member.name, tempPassword, login: member.cpf, role: roleForAuth }
    });
    if (edgeError) throw edgeError;
    const authUserId = edgeData.authUserId;
    const { data, error } = await supabase.from('team_members').insert({ user_id: JOAO_GESTOR_AUTH_ID, cpf: member.cpf, data: { ...member, id: authUserId, authUserId } }).select().single();
    if (error) throw error;
    const newMember = { ...member, id: data.id, db_id: data.id, authUserId, hasLogin: true, isLegacy: false };
    setTeamMembers(prev => [...prev, newMember]);
    return { success: true, member: newMember, tempPassword, wasExistingUser: edgeData.userExists };
  }, []);

  const updateTeamMember = useCallback(async (id: string, updates: Partial<TeamMember>) => {
    const member = teamMembers.find(m => m.id === id);
    if (!member) throw new Error("Membro não encontrado.");
    const updatedData = { ...member, ...updates };
    const { error } = await supabase.from('team_members').update({ cpf: updates.cpf || member.cpf, data: updatedData }).eq('id', id);
    if (error) throw error;
    setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    return { success: true };
  }, [teamMembers]);

  const deleteTeamMember = useCallback(async (id: string) => {
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (error) throw error;
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  }, []);

  // --- Team Production Goal Functions ---
  const addTeamProductionGoal = useCallback(async (goal: Omit<TeamProductionGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase.from('team_production_goals').insert({ ...goal, user_id: JOAO_GESTOR_AUTH_ID }).select().single();
    if (error) throw error; setTeamProductionGoals(prev => [data, ...prev]); return data;
  }, []);

  const updateTeamProductionGoal = useCallback(async (id: string, updates: Partial<TeamProductionGoal>) => {
    const { data, error } = await supabase.from('team_production_goals').update(updates).eq('id', id).select().single();
    if (error) throw error; setTeamProductionGoals(prev => prev.map(g => g.id === id ? data : g)); return data;
  }, []);

  const deleteTeamProductionGoal = useCallback(async (id: string) => {
    const { error } = await supabase.from('team_production_goals').delete().eq('id', id);
    if (error) throw error; setTeamProductionGoals(prev => prev.filter(g => g.id !== id));
  }, []);

  // --- Cold Call Functions ---
  const addColdCallLead = useCallback(async (lead: Omit<ColdCallLead, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_stage'>) => {
    const { data, error } = await supabase.from('cold_call_leads').insert({ ...lead, user_id: user!.id, current_stage: 'Base Fria' }).select().single();
    if (error) throw error; setColdCallLeads(prev => [data, ...prev]); return data;
  }, [user]);

  const updateColdCallLead = useCallback(async (id: string, updates: Partial<ColdCallLead>) => {
    const { data, error } = await supabase.from('cold_call_leads').update(updates).eq('id', id).select().single();
    if (error) throw error; setColdCallLeads(prev => prev.map(l => l.id === id ? data : l)); return data;
  }, []);

  const deleteColdCallLead = useCallback(async (id: string) => {
    const { error } = await supabase.from('cold_call_leads').delete().eq('id', id);
    if (error) throw error; setColdCallLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  const addColdCallLog = useCallback(async (log: Omit<ColdCallLog, 'id' | 'user_id' | 'created_at' | 'duration_seconds'> & { start_time: string; end_time: string; }) => {
    const duration_seconds = Math.round((new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 1000);
    const { data, error } = await supabase.from('cold_call_logs').insert({ ...log, user_id: user!.id, duration_seconds }).select().single();
    if (error) throw error; setColdCallLogs(prev => [data, ...prev]); return data;
  }, [user]);

  const getColdCallMetrics = useCallback((consultantId: string) => {
    const logs = coldCallLogs.filter(l => l.user_id === consultantId);
    const totalCalls = logs.length;
    const totalConversations = logs.filter(l => l.result === 'Conversou' || l.result === 'Demonstrou Interesse' || l.result === 'Agendar Reunião').length;
    const totalMeetingsScheduled = logs.filter(l => l.result === 'Agendar Reunião').length;
    const conversationToMeetingRate = totalConversations > 0 ? (totalMeetingsScheduled / totalConversations) * 100 : 0;
    return { totalCalls, totalConversations, totalMeetingsScheduled, conversationToMeetingRate };
  }, [coldCallLogs]);

  const createCrmLeadFromColdCall = useCallback(async (coldCallLeadId: string, meeting?: { date?: string; time?: string; modality?: string; notes?: string }) => {
    const { data, error } = await supabase.functions.invoke('create-crm-lead-from-cold-call', {
      body: { 
        coldCallLeadId, 
        meetingDate: meeting?.date, 
        meetingTime: meeting?.time, 
        meetingModality: meeting?.modality, 
        meetingNotes: meeting?.notes 
      }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    const { data: updatedLead } = await supabase.from('cold_call_leads').select('*').eq('id', coldCallLeadId).single();
    if (updatedLead) setColdCallLeads(prev => prev.map(l => l.id === coldCallLeadId ? updatedLead : l));
    const { data: newCrmLead } = await supabase.from('crm_leads').select('*').eq('id', data.crmLeadId).single();
    if (newCrmLead) setCrmLeads(prev => [newCrmLead, ...prev]);
    return { crmLeadId: data.crmLeadId };
  }, []);

  const hasPendingSecretariaTasks = useCallback((candidate: Candidate) => {
    const progress = candidate.checklistProgress || {};
    const secretariaItems = checklistStructure.flatMap(s => s.items).filter(i => i.responsibleRole === 'SECRETARIA');
    return secretariaItems.some(item => progress[item.id] && !progress[item.id].completed);
  }, [checklistStructure]);

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
    toggleConsultantGoal: (candidateId: string, goalId: string) => Promise.resolve(), // Placeholder
    addChecklistStage, updateChecklistStage, deleteChecklistStage, moveChecklistStage,
    addChecklistItem, updateChecklistItem, deleteChecklistItem, moveChecklistItem,
    resetChecklistToDefault,
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
    assignDailyChecklistToConsultant: async (daily_checklist_id: string, consultant_id: string) => {
      const { data, error } = await supabase.from('daily_checklist_assignments').insert({ daily_checklist_id, consultant_id }).select().single();
      if (error) throw error; setDailyChecklistAssignments(prev => [...prev, data]); return data;
    },
    unassignDailyChecklistFromConsultant: async (daily_checklist_id: string, consultant_id: string) => {
      const { error } = await supabase.from('daily_checklist_assignments').delete().eq('daily_checklist_id', daily_checklist_id).eq('consultant_id', consultant_id);
      if (error) throw error; setDailyChecklistAssignments(prev => prev.filter(a => !(a.daily_checklist_id === daily_checklist_id && a.consultant_id === consultant_id)));
    },
    toggleDailyChecklistCompletion,
    addWeeklyTarget, updateWeeklyTarget, deleteWeeklyTarget,
    addWeeklyTargetItem, updateWeeklyTargetItem, deleteWeeklyTargetItem, updateWeeklyTargetItemOrder,
    assignWeeklyTargetToConsultant, unassignWeeklyTargetFromConsultant,
    addMetricLog, updateMetricLog, deleteMetricLog,
    addSupportMaterialV2, updateSupportMaterialV2, deleteSupportMaterialV2, assignSupportMaterialToConsultant, unassignSupportMaterialFromConsultant,
    addLeadTask, updateLeadTask, deleteLeadTask, toggleLeadTaskCompletion, updateLeadMeetingInvitationStatus,
    addGestorTask, updateGestorTask, deleteGestorTask, toggleGestorTaskCompletion,
    addFinancialEntry, updateFinancialEntry, deleteFinancialEntry,
    updateFormCadastro, deleteFormCadastro, getFormFilesForSubmission: (submissionId: string) => formFiles.filter(f => f.submission_id === submissionId),
    addFeedback, updateFeedback, deleteFeedback, addTeamMemberFeedback, updateTeamMemberFeedback, deleteTeamMemberFeedback,
    addTeamMember, updateTeamMember, deleteTeamMember,
    addTeamProductionGoal, updateTeamProductionGoal, deleteTeamProductionGoal,
    hasPendingSecretariaTasks,
    addColdCallLead, updateColdCallLead, deleteColdCallLead, addColdCallLog, getColdCallMetrics,
    createCrmLeadFromColdCall,
    addOnlineOnboardingSession, deleteOnlineOnboardingSession, addVideoToTemplate, deleteVideoFromTemplate,
    addProcess, updateProcess, deleteProcess, deleteProcessAttachment,
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
    addChecklistItem, updateChecklistItem, deleteChecklistItem, moveChecklistItem,
    resetChecklistToDefault,
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
    createCrmLeadFromColdCall,
    addOnlineOnboardingSession, deleteOnlineOnboardingSession, addVideoToTemplate, deleteVideoFromTemplate,
    addProcess, updateProcess, deleteProcess, deleteProcessAttachment,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be usado dentro de um AppProvider');
  return context;
};

export const useApp = useAppContext;