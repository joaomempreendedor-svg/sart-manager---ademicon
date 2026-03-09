import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { 
  Candidate, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, 
  Commission, SupportMaterial, GoalStage, TeamMember, InstallmentStatus, InstallmentInfo, 
  CutoffPeriod, OnboardingSession, OnboardingVideoTemplate, CrmPipeline, CrmStage, 
  CrmField, CrmLead, DailyChecklist, DailyChecklistItem, DailyChecklistAssignment, 
  DailyChecklistCompletion, WeeklyTarget, WeeklyTargetItem, WeeklyTargetAssignment, 
  MetricLog, SupportMaterialV2, SupportMaterialAssignment, LeadTask, 
  DailyChecklistItemResource, GestorTask, GestorTaskCompletion, FinancialEntry, 
  FormCadastro, FormFile, Notification, TeamProductionGoal, ColdCallLead, 
  ColdCallLog, ChecklistItem, Process, ProcessAttachment 
} from '@/types';
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

  // --- Candidate Functions ---
  const addCandidate = useCallback(async (candidateData: Omit<Candidate, 'id' | 'createdAt' | 'db_id'>) => {
    if (!user) throw new Error("Não autenticado.");
    const id = crypto.randomUUID();
    const newCandidate = { ...candidateData, id, createdAt: new Date().toISOString() };
    const { data, error } = await supabase.from('candidates').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: newCandidate }).select().single();
    if (error) throw error;
    const normalized = { ...newCandidate, db_id: data.id };
    setCandidates(prev => [normalized, ...prev]);
    return normalized;
  }, [user]);

  const updateCandidate = useCallback(async (id: string, updates: Partial<Candidate>) => {
    const candidate = candidates.find(c => c.id === id);
    if (!candidate || !candidate.db_id) return;
    const updated = { ...candidate, ...updates };
    const { error } = await supabase.from('candidates').update({ data: updated, last_updated_at: new Date().toISOString() }).eq('id', candidate.db_id);
    if (error) throw error;
    setCandidates(prev => prev.map(c => c.id === id ? updated : c));
  }, [candidates]);

  const deleteCandidate = useCallback(async (id: string) => {
    const candidate = candidates.find(c => c.id === id);
    if (!candidate || !candidate.db_id) return;
    const { error } = await supabase.from('candidates').delete().eq('id', candidate.db_id);
    if (error) throw error;
    setCandidates(prev => prev.filter(c => c.id !== id));
  }, [candidates]);

  const getCandidate = useCallback((id: string) => candidates.find(c => c.id === id), [candidates]);

  const toggleChecklistItem = useCallback(async (candidateId: string, itemId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    const progress = { ...candidate.checklistProgress };
    const current = progress[itemId] || { completed: false };
    progress[itemId] = { ...current, completed: !current.completed };
    await updateCandidate(candidateId, { checklistProgress: progress });
  }, [candidates, updateCandidate]);

  const setChecklistDueDate = useCallback(async (candidateId: string, itemId: string, dueDate: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    const progress = { ...candidate.checklistProgress };
    const current = progress[itemId] || { completed: false };
    progress[itemId] = { ...current, dueDate };
    await updateCandidate(candidateId, { checklistProgress: progress });
  }, [candidates, updateCandidate]);

  const toggleConsultantGoal = useCallback(async (candidateId: string, goalId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    const progress = { ...candidate.consultantGoalsProgress };
    progress[goalId] = !progress[goalId];
    await updateCandidate(candidateId, { consultantGoalsProgress: progress });
  }, [candidates, updateCandidate]);

  // --- Process Functions ---
  const addProcess = useCallback(async (processData: Omit<Process, 'id' | 'user_id' | 'created_at' | 'updated_at'>, filesToAdd?: { file: File, type: string }[], linksToAdd?: { url: string, type: string }[]) => {
    if (!user) throw new Error("User not authenticated.");
    
    const { attachments: _, ...cleanData } = processData as any;
    const { data: process, error } = await supabase.from('processes').insert({ ...cleanData, user_id: user.id }).select().single();
    if (error) throw error;

    const attachments: ProcessAttachment[] = [];

    if (filesToAdd && filesToAdd.length > 0) {
      for (const item of filesToAdd) {
        try {
          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('processId', process.id);

          const { data: uploadRes, error: uploadError } = await supabase.functions.invoke('upload-process-file', {
            body: formData,
          });

          if (uploadError) throw uploadError;

          const { data: attachment, error: attachError } = await supabase.from('process_attachments').insert({
            process_id: process.id,
            file_url: uploadRes.publicUrl,
            file_type: item.type,
            file_name: item.file.name
          }).select().single();
          
          if (attachment) attachments.push(attachment);
        } catch (err) {
          console.error("Erro no upload de arquivo:", err);
          toast.error(`Falha ao salvar anexo: ${item.file.name}`);
        }
      }
    }

    if (linksToAdd && linksToAdd.length > 0) {
      for (const item of linksToAdd) {
        const { data: attachment } = await supabase.from('process_attachments').insert({
          process_id: process.id,
          file_url: item.url,
          file_type: 'link',
          file_name: 'Link Externo'
        }).select().single();
        if (attachment) attachments.push(attachment);
      }
    }

    const newProcess = { ...process, attachments };
    setProcesses(prev => [newProcess, ...prev].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    return newProcess;
  }, [user]);

  const updateProcess = useCallback(async (id: string, updates: Partial<Process>, filesToAdd?: { file: File, type: string }[], linksToAdd?: { url: string, type: string }[]) => {
    const { attachments: _, ...cleanUpdates } = updates as any;
    const { data: process, error } = await supabase.from('processes').update({ ...cleanUpdates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;

    if (filesToAdd && filesToAdd.length > 0) {
      for (const item of filesToAdd) {
        try {
          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('processId', id);

          const { data: uploadRes, error: uploadError } = await supabase.functions.invoke('upload-process-file', {
            body: formData,
          });

          if (!uploadError) {
            await supabase.from('process_attachments').insert({
              process_id: id,
              file_url: uploadRes.publicUrl,
              file_type: item.type,
              file_name: item.file.name
            });
          }
        } catch (err) {
          console.error("Erro no upload de anexo:", err);
        }
      }
    }

    if (linksToAdd && linksToAdd.length > 0) {
      for (const item of linksToAdd) {
        await supabase.from('process_attachments').insert({
          process_id: id,
          file_url: item.url,
          file_type: 'link',
          file_name: 'Link Externo'
        });
      }
    }

    const { data: allAttachments } = await supabase.from('process_attachments').select('*').eq('process_id', id);
    const updatedProcess = { ...process, attachments: allAttachments || [] };
    setProcesses(prev => prev.map(p => p.id === id ? updatedProcess : p).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
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

  // --- CRM Functions ---
  const addCrmLead = useCallback(async (leadData: any) => {
    const { data, error } = await supabase.from('crm_leads').insert(leadData).select().single();
    if (error) throw error;
    const normalized = { ...data, proposal_value: parseDbCurrency(data.proposal_value), sold_credit_value: parseDbCurrency(data.sold_credit_value) };
    setCrmLeads(prev => [normalized, ...prev]);
    return normalized;
  }, [parseDbCurrency]);

  const updateCrmLead = useCallback(async (id: string, updates: any) => {
    const { data, error } = await supabase.from('crm_leads').update(updates).eq('id', id).select().single();
    if (error) throw error;
    const normalized = { ...data, proposal_value: parseDbCurrency(data.proposal_value), sold_credit_value: parseDbCurrency(data.sold_credit_value) };
    setCrmLeads(prev => prev.map(l => l.id === id ? normalized : l));
    return normalized;
  }, [parseDbCurrency]);

  const deleteCrmLead = useCallback(async (id: string) => {
    const { error } = await supabase.from('crm_leads').delete().eq('id', id);
    if (error) throw error;
    setCrmLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  // --- Commission Functions ---
  const addCommission = useCallback(async (commission: any) => {
    const { error } = await supabase.from('commissions').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: commission });
    if (error) throw error;
    refetchCommissions();
    return { success: true };
  }, [refetchCommissions]);

  const updateCommission = useCallback(async (id: string, updates: any) => {
    const { error } = await supabase.from('commissions').update({ data: updates }).eq('id', id);
    if (error) throw error;
    refetchCommissions();
  }, [refetchCommissions]);

  const deleteCommission = useCallback(async (id: string) => {
    const { error } = await supabase.from('commissions').delete().eq('id', id);
    if (error) throw error;
    refetchCommissions();
  }, [refetchCommissions]);

  // --- Value Object ---
  const value = useMemo(() => ({
    isDataLoading, candidates, teamMembers, commissions, supportMaterials, cutoffPeriods,
    onboardingSessions, onboardingTemplateVideos, checklistStructure, setChecklistStructure,
    consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins,
    interviewers, pvs, crmPipelines, crmStages, crmFields, crmLeads, crmOwnerUserId,
    dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions,
    weeklyTargets, weeklyTargetItems, weeklyTargetAssignments, metricLogs,
    supportMaterialsV2, supportMaterialAssignments, leadTasks, gestorTasks, gestorTaskCompletions,
    financialEntries, formCadastros, formFiles, notifications, teamProductionGoals,
    coldCallLeads, coldCallLogs, processes, theme, toggleTheme,
    addCandidate, updateCandidate, deleteCandidate, getCandidate, toggleChecklistItem, setChecklistDueDate, toggleConsultantGoal,
    addCrmLead, updateCrmLead, deleteCrmLead,
    addProcess, updateProcess, deleteProcess, deleteProcessAttachment,
    addCommission, updateCommission, deleteCommission,
  } as any), [
    isDataLoading, candidates, teamMembers, commissions, supportMaterials, cutoffPeriods,
    onboardingSessions, onboardingTemplateVideos, checklistStructure, consultantGoalsStructure,
    interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs,
    crmPipelines, crmStages, crmFields, crmLeads, crmOwnerUserId, dailyChecklists,
    dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions,
    weeklyTargets, weeklyTargetItems, weeklyTargetAssignments, metricLogs,
    supportMaterialsV2, supportMaterialAssignments, leadTasks, gestorTasks,
    gestorTaskCompletions, financialEntries, formCadastros, formFiles, notifications,
    teamProductionGoals, coldCallLeads, coldCallLogs, processes, theme, toggleTheme,
    addCandidate, updateCandidate, deleteCandidate, getCandidate, toggleChecklistItem, setChecklistDueDate, toggleConsultantGoal,
    addCrmLead, updateCrmLead, deleteCrmLead,
    addProcess, updateProcess, deleteProcess, deleteProcessAttachment,
    addCommission, updateCommission, deleteCommission
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};