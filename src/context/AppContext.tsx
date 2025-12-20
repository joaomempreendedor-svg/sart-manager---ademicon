import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Candidate, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, Commission, SupportMaterial, GoalStage, TeamMember, InstallmentStatus, CommissionStatus, InstallmentInfo, CutoffPeriod, Feedback, OnboardingSession, OnboardingVideoTemplate, CrmPipeline, CrmStage, CrmField, CrmLead, DailyChecklist, DailyChecklistItem, DailyChecklistAssignment, DailyChecklistCompletion, WeeklyTarget, WeeklyTargetItem, WeeklyTargetAssignment, MetricLog, SupportMaterialV2, SupportMaterialAssignment, LeadTask, SupportMaterialContentType } from '@/types';
import { CHECKLIST_STAGES as DEFAULT_STAGES } from '@/data/checklistData';
import { CONSULTANT_GOALS as DEFAULT_GOALS } from '@/data/consultantGoals';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { generateRandomPassword } from '@/utils/authUtils';
import toast from 'react-hot-toast'; // Importar toast

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
  origins: ['Indicação', 'Prospecção', 'Tráfego Linkedin'],
  interviewers: ['João Müller'],
  pvs: ['SOARES E MORAES', 'SART INVESTIMENTOS', 'KR CONSÓRCIOS', 'SOLOM INVESTIMENTOS'],
};

// ⚠️ CONFIGURAÇÃO DOS DIAS DE CORTE POR MÊS (FALLBACK) ⚠️
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

const clearStaleAuth = () => {
  const token = localStorage.getItem('supabase.auth.token');
  if (token) {
    try {
      const parsed = JSON.parse(token);
      const expiry = parsed.expires_at ? new Date(parsed.expires_at * 1000) : null;
      
      if (expiry && expiry < new Date()) {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refreshToken');
        return true;
      }
    } catch (e) {
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.refreshToken');
      return true;
    }
  }
  return false;
};

// ID do gestor principal para centralizar todas as configurações e dados
const JOAO_GESTOR_AUTH_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658"; // <--- ATUALIZE ESTE ID COM O SEU NOVO ID DE GESTOR!

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const fetchedUserIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [supportMaterials, setSupportMaterials] = useState<SupportMaterial[]>([]);
  // const [importantLinks, setImportantLinks] = useState<ImportantLink[]>([]); // REMOVIDO
  const [cutoffPeriods, setCutoffPeriods] = useState<CutoffPeriod[]>([]);
  const [onboardingSessions, setOnboardingSessions] = useState<OnboardingSession[]>([]);
  const [onboardingTemplateVideos, setOnboardingTemplateVideos] = useState<OnboardingVideoTemplate[]>([]);
  
  const [checklistStructure, setChecklistStructure] = useState<ChecklistStage[]>(DEFAULT_STAGES);
  const [consultantGoalsStructure, setConsultantGoalsStructure] = useState<GoalStage[]>(DEFAULT_GOALS);
  const [interviewStructure, setInterviewStructure] = useState<InterviewSection[]>(INITIAL_INTERVIEW_STRUCTURE);
  const [templates, setTemplates] = useState<Record<string, CommunicationTemplate>>({});
  const [origins, setOrigins] = useState<string[]>([]);
  const [interviewers, setInterviewers] = useState<string[]>([]);
  const [pvs, setPvs] = useState<string[]>([]);
  
  // CRM State
  const [crmPipelines, setCrmPipelines] = useState<CrmPipeline[]>([]);
  const [crmStages, setCrmStages] = useState<CrmStage[]>([]);
  const [crmFields, setCrmFields] = useState<CrmField[]>([]);
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);
  const [crmOwnerUserId, setCrmOwnerUserId] = useState<string | null>(null);

  // Módulo 3: Checklist do Dia
  const [dailyChecklists, setDailyChecklists] = useState<DailyChecklist[]>([]);
  const [dailyChecklistItems, setDailyChecklistItems] = useState<DailyChecklistItem[]>([]);
  const [dailyChecklistAssignments, setDailyChecklistAssignments] = useState<DailyChecklistAssignment[]>([]);
  const [dailyChecklistCompletions, setDailyChecklistCompletions] = useState<DailyChecklistCompletion[]>([]);

  // Módulo 4: Metas de Prospecção
  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyTarget[]>([]);
  const [weeklyTargetItems, setWeeklyTargetItems] = useState<WeeklyTargetItem[]>([]);
  const [weeklyTargetAssignments, setWeeklyTargetAssignments] = useState<WeeklyTargetAssignment[]>([]);
  const [metricLogs, setMetricLogs] = useState<MetricLog[]>([]);

  // Módulo 5: Materiais de Apoio (v2)
  const [supportMaterialsV2, setSupportMaterialsV2] = useState<SupportMaterialV2[]>([]);
  const [supportMaterialAssignments, setSupportMaterialAssignments] = useState<SupportMaterialAssignment[]>([]);

  // NOVO: Tarefas de Lead
  const [leadTasks, setLeadTasks] = useState<LeadTask[]>([]);


  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('sart_theme') as 'light' | 'dark') || 'light');

  const calculateCompetenceMonth = useCallback((paidDate: string): string => {
    const date = new Date(paidDate + 'T00:00:00');
    
    const period = cutoffPeriods.find(p => {
      const start = new Date(p.startDate + 'T00:00:00');
      const end = new Date(p.endDate + 'T00:00:00');
      return date >= start && date <= end;
    });
  
    if (period) {
      return period.competenceMonth;
    }
  
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const cutoffDay = MONTHLY_CUTOFF_DAYS[month] || 19;
    let competenceDate = new Date(date);
    if (day <= cutoffDay) {
      competenceDate.setMonth(competenceDate.getMonth() + 1);
    } else {
      competenceDate.setMonth(competenceDate.getMonth() + 2);
    }
    const compYear = competenceDate.getFullYear();
    const compMonth = String(competenceDate.getMonth() + 1).padStart(2, '0');
    return `${compYear}-${compMonth}`;
  }, [cutoffPeriods]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('sart_theme', theme);
  }, [theme]);

  const debouncedUpdateConfig = useDebouncedCallback(async (newConfig: any) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({ user_id: JOAO_GESTOR_AUTH_ID, data: newConfig }, { onConflict: 'user_id' });
      if (error) throw error;
    } catch (error) {
      console.error("Failed to save config:", error);
      toast.error("Erro ao salvar configurações.");
    }
  }, 1500);

  const updateConfig = useCallback((updates: any) => {
    if (!user) return;
    const currentConfig = { checklistStructure, consultantGoalsStructure, interviewStructure, templates, origins, interviewers, pvs };
    const newConfigData = { ...currentConfig, ...updates };
    debouncedUpdateConfig(newConfigData);
  }, [user, checklistStructure, consultantGoalsStructure, interviewStructure, templates, origins, interviewers, pvs, debouncedUpdateConfig]);

  const resetLocalState = () => {
    setCandidates([]);
    setTeamMembers([]);
    setCommissions([]);
    setSupportMaterials([]);
    // setImportantLinks([]); // REMOVIDO
    setCutoffPeriods([]);
    setOnboardingSessions([]);
    setOnboardingTemplateVideos([]);
    setChecklistStructure(DEFAULT_STAGES);
    setConsultantGoalsStructure(DEFAULT_GOALS);
    setInterviewStructure(INITIAL_INTERVIEW_STRUCTURE);
    setTemplates({});
    setOrigins(DEFAULT_APP_CONFIG_DATA.origins);
    setInterviewers(DEFAULT_APP_CONFIG_DATA.interviewers);
    setPvs(DEFAULT_APP_CONFIG_DATA.pvs);
    setCrmPipelines([]);
    setCrmStages([]);
    setCrmFields([]);
    setCrmLeads([]);
    setCrmOwnerUserId(null);
    setDailyChecklists([]);
    setDailyChecklistItems([]);
    setDailyChecklistAssignments([]);
    setDailyChecklistCompletions([]);
    setWeeklyTargets([]);
    setWeeklyTargetItems([]);
    setWeeklyTargetAssignments([]);
    setMetricLogs([]);
    setSupportMaterialsV2([]);
    setSupportMaterialAssignments([]);
    setLeadTasks([]);
    setIsDataLoading(false);
  };

  const refetchCommissions = useCallback(async () => {
    if (!user) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data, error } = await supabase.from("commissions").select("id, data, created_at").eq("user_id", JOAO_GESTOR_AUTH_ID).order("created_at", { ascending: false });
      if (error) { console.error(error); toast.error("Erro ao carregar comissões."); return; }
      const normalized: Commission[] = (data || []).map(item => {
        const commission = item.data as Commission;
        if (!commission.installmentDetails) {
          const details: Record<string, InstallmentInfo> = {};
          for (let i = 1; i <= 15; i++) details[i.toString()] = { status: "Pendente" };
          commission.installmentDetails = details;
        } else {
            const firstKey = Object.keys(commission.installmentDetails)[0];
            if (firstKey && typeof (commission.installmentDetails as any)[firstKey] === 'string') {
                const migratedDetails: Record<string, InstallmentInfo> = {};
                Object.entries(commission.installmentDetails).forEach(([key, value]) => {
                    migratedDetails[key] = { status: value as InstallmentStatus };
                });
                commission.installmentDetails = migratedDetails;
            }
        }
        return { ...commission, db_id: item.id, criado_em: item.created_at };
      });
      setCommissions(normalized);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao recarregar comissões.");
    } finally {
      setTimeout(() => { isFetchingRef.current = false; }, 100);
    }
  }, [user]);

  useEffect(() => {
    clearStaleAuth();
    const fetchData = async (userId: string) => {
      const timeoutId = setTimeout(() => {
        console.error('⏰ TIMEOUT: fetchData demorou mais de 15 segundos');
        toast.error("Tempo limite excedido ao carregar dados. Tente recarregar a página.");
        setIsDataLoading(false);
      }, 15000);
      try {
        let effectiveOwnerIdForConsultantData = userId;
        let effectiveGestorId = JOAO_GESTOR_AUTH_ID;

        if (user?.role === 'CONSULTOR') {
          try {
            const { data: teamMemberProfile, error: teamMemberProfileError } = await supabase
              .from('team_members')
              .select('user_id')
              .eq('data->>id', userId)
              .maybeSingle();

            if (teamMemberProfileError) {
              console.error("Error fetching team member profile for consultant:", teamMemberProfileError);
            } else if (teamMemberProfile) {
              effectiveGestorId = JOAO_GESTOR_AUTH_ID;
            } else {
              console.warn(`[AppContext] Consultant ${userId} not found in team_members or has no associated Gestor. Shared configs will default to ${JOAO_GESTOR_AUTH_ID}.`);
            }
          } catch (e) {
            console.error("Falha ao buscar perfil do membro da equipe para consultor:", e);
          }
        } else if (user?.role === 'GESTOR' || user?.role === 'ADMIN') {
          effectiveGestorId = userId;
          console.log(`[AppContext] User ${userId} is a Gestor/Admin. All shared configs will use ${effectiveGestorId}.`);
        }
        setCrmOwnerUserId(effectiveGestorId);

        let teamMembersData = [];
        try {
          let teamMembersQuery = supabase.from('team_members').select('id, data, cpf');
          if (user?.role === 'CONSULTOR') {
              teamMembersQuery = teamMembersQuery.or(`user_id.eq.${effectiveGestorId},data->>id.eq.${userId}`);
          } else {
              teamMembersQuery = teamMembersQuery.eq('user_id', effectiveGestorId);
          }
          const { data, error } = await teamMembersQuery;
          if (!error) teamMembersData = data || [];
          else console.error("Error fetching team_members (ignoring):", error);
        } catch (e) {
          console.error("Falha ao buscar team_members:", e);
        }

        const [
          configResult,
          candidatesData,
          materialsData,
          cutoffData,
          // linksData, // REMOVIDO
          onboardingData,
          templateVideosData,
          pipelinesData,
          stagesData,
          fieldsData,
          crmLeadsData,
          dailyChecklistsData,
          dailyChecklistItemsData,
          dailyChecklistAssignmentsData,
          dailyChecklistCompletionsData,
          weeklyTargetsData,
          weeklyTargetItemsData,
          weeklyTargetAssignmentsData,
          metricLogsData,
          supportMaterialsV2Data,
          supportMaterialAssignmentsData,
          leadTasksData,
        ] = await Promise.all([
          (async () => { try { return await supabase.from('app_config').select('data').eq('user_id', effectiveGestorId).maybeSingle(); } catch (e) { console.error("Error fetching app_config:", e); return { data: null, error: e }; } })(),
          (async () => { try { return await supabase.from('candidates').select('id, data').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching candidates:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('support_materials').select('id, data').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching support_materials:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('cutoff_periods').select('id, data').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching cutoff_periods:", e); return { data: [], error: e }; } })(),
          // (async () => { try { return await await supabase.from('important_links').select('id, data').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching important_links:", e); return { data: [], error: e }; } })(), // REMOVIDO
          (async () => { try { return await supabase.from('onboarding_sessions').select('*, videos:onboarding_videos(*)').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching onboarding_sessions:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('onboarding_video_templates').select('*').eq('user_id', effectiveGestorId).order('order', { ascending: true }); } catch (e) { console.error("Error fetching onboarding_video_templates:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('crm_pipelines').select('*').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching crm_pipelines:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('crm_stages').select('*').eq('user_id', effectiveGestorId).order('order_index') ; } catch (e) { console.error("Error fetching crm_stages:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('crm_fields').select('*').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching crm_fields:", e); return { data: [], error: e }; } })(),
          (async () => {
            try {
              let query = supabase.from('crm_leads').select('*');
              if (user?.role === 'CONSULTOR') {
                  query = query.eq('consultant_id', userId);
              } else if (user?.role === 'GESTOR' || user?.role === 'ADMIN') {
                  query = query.eq('user_id', effectiveGestorId);
              } else {
                  console.warn(`[AppContext] Role de usuário ${user?.role} não reconhecida para buscar leads. Usando filtro padrão.`);
                  query = query.eq('user_id', effectiveGestorId);
              }
              return await query;
            } catch (e) {
              console.error("Error fetching crm_leads:", e);
              return { data: [], error: e };
            }
          })(),
          (async () => { try { return await supabase.from('daily_checklists').select('*').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching daily_checklists:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('daily_checklist_items').select('*'); } catch (e) { console.error("Error fetching daily_checklist_items:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('daily_checklist_assignments').select('*'); } catch (e) { console.error("Error fetching daily_checklist_assignments:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('daily_checklist_completions').select('*'); } catch (e) { console.error("Error fetching daily_checklist_completions:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('weekly_targets').select('*').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching weekly_targets:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('weekly_target_items').select('*'); } catch (e) { console.error("Error fetching weekly_target_items:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('weekly_target_assignments').select('*'); } catch (e) { console.error("Error fetching weekly_target_assignments:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('metric_logs').select('*'); } catch (e) { console.error("Error fetching metric_logs:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('support_materials_v2').select('*').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching support_materials_v2:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('support_material_assignments').select('*'); } catch (e) { console.error("Error fetching support_material_assignments:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('lead_tasks').select('*'); } catch (e) { console.error("Error fetching lead_tasks:", e); return { data: [], error: e }; } })(),
        ]);

        if (configResult.error) console.error("Config error:", configResult.error);
        if (candidatesData.error) console.error("Candidates error:", candidatesData.error);
        if (materialsData.error) console.error("Materials error:", materialsData.error);
        if (cutoffData.error) console.error("Cutoff Periods error:", cutoffData.error);
        // if (linksData.error) console.error("Important Links error:", linksData.error); // REMOVIDO
        if (onboardingData.error) console.error("Onboarding error:", onboardingData.error);
        if (templateVideosData.error) console.error("Onboarding Template error:", templateVideosData.error);
        if (pipelinesData.error) console.error("Pipelines error:", pipelinesData.error);
        if (stagesData.error) console.error("Stages error:", stagesData.error);
        if (fieldsData.error) console.error("Fields error:", fieldsData.error);
        if (crmLeadsData.error) console.error("CRM Leads error:", crmLeadsData.error);
        if (dailyChecklistsData.error) console.error("Daily Checklists error:", dailyChecklistsData.error);
        if (dailyChecklistItemsData.error) console.error("Daily Checklist Items error:", dailyChecklistItemsData.error);
        if (dailyChecklistAssignmentsData.error) console.error("Daily Checklist Assignments error:", dailyChecklistAssignmentsData.error);
        if (dailyChecklistCompletionsData.error) console.error("Daily Checklist Completions error:", dailyChecklistCompletionsData.error);
        if (weeklyTargetsData.error) console.error("Weekly Targets error:", weeklyTargetsData.error);
        if (weeklyTargetItemsData.error) console.error("Weekly Target Items error:", weeklyTargetItemsData.error);
        if (weeklyTargetAssignmentsData.error) console.error("Weekly Target Assignments error:", weeklyTargetAssignmentsData.error);
        if (metricLogsData.error) console.error("Metric Logs error:", metricLogsData.error);
        if (supportMaterialsV2Data.error) console.error("Support Materials V2 error:", supportMaterialsV2Data.error);
        if (supportMaterialAssignmentsData.error) console.error("Support Material Assignments error:", supportMaterialAssignmentsData.error);
        if (leadTasksData.error) console.error("Lead Tasks error:", leadTasksData.error);


        if (configResult.data) {
          const { data } = configResult.data;
          setChecklistStructure(data.checklistStructure || DEFAULT_STAGES);
          setConsultantGoalsStructure(data.consultantGoalsStructure || DEFAULT_GOALS);
          const loadedInterviewStructure = data.interviewStructure || INITIAL_INTERVIEW_STRUCTURE;
          const uniqueInterviewSections = Array.from(new Map(loadedInterviewStructure.map((item: InterviewSection) => [item.id, item])).values()));
          setInterviewStructure(uniqueInterviewSections);
          setTemplates(data.templates || {});
          setOrigins(data.origins || []);
          setInterviewers(data.interviewers || []);
          setPvs(data.pvs || []);
        } else {
          await supabase.from('app_config').insert({ user_id: effectiveGestorId, data: DEFAULT_APP_CONFIG_DATA });
          const { checklistStructure, consultantGoalsStructure, interviewStructure, templates, origins, interviewers, pvs } = DEFAULT_APP_CONFIG_DATA;
          setChecklistStructure(checklistStructure);
          setConsultantGoalsStructure(consultantGoalsStructure);
          setInterviewStructure(interviewStructure);
          setTemplates(templates);
          setOrigins(origins);
          setInterviewers(interviewers);
          setPvs(pvs);
        }

        setCandidates(candidatesData?.data?.map(item => ({ ...(item.data as Candidate), db_id: item.id })) || []);
        
        const normalizedTeamMembers = teamMembersData?.map(item => {
          const data = item.data as any;
          
          if (!data.id && data.name) {
            return {
              id: `legacy_${item.id}`,
              db_id: item.id,
              name: data.name,
              email: data.email,
              roles: Array.isArray(data.roles) ? data.roles : [data.role || 'Prévia'],
              isActive: data.isActive !== false,
              isLegacy: true,
              hasLogin: false,
              cpf: item.cpf,
            } as TeamMember;
          }
          
          return {
            id: data.id,
            db_id: item.id,
            name: data.name,
            email: data.email,
            roles: Array.isArray(data.roles) ? data.roles : [data.role || 'Prévia'],
            isActive: data.isActive !== false,
            hasLogin: true,
            isLegacy: false,
            cpf: item.cpf,
          } as TeamMember;
        }) || [];
        setTeamMembers(normalizedTeamMembers);

        setSupportMaterials(materialsData?.data?.map(item => ({ ...(item.data as SupportMaterial), db_id: item.id })) || []);
        // setImportantLinks(linksData?.data?.map(item => ({ ...(item.data as ImportantLink), db_id: item.id })) || []); // REMOVIDO
        setCutoffPeriods(cutoffData?.data?.map(item => ({ ...(item.data as CutoffPeriod), db_id: item.id })) || []);
        setOnboardingSessions((onboardingData?.data as any[])?.map(s => ({...s, videos: s.videos.sort((a:any,b:any) => a.order - b.order)})) || []);
        setOnboardingTemplateVideos(templateVideosData?.data || []);
        
        let finalPipelines = pipelinesData?.data || [];
        if (finalPipelines.length === 0) {
          if (user?.role === 'GESTOR' || user?.role === 'ADMIN') {
            console.log(`[AppContext] No CRM pipelines found for ${effectiveGestorId}. Creating default pipeline.`);
            const { data: newPipeline, error: insertPipelineError } = await supabase
              .from('crm_pipelines')
              .insert({ user_id: effectiveGestorId, name: 'Pipeline Padrão', is_active: true })
              .select('*')
              .single();
            if (insertPipelineError) {
              console.error("Error inserting default CRM pipeline:", insertPipelineError);
            } else if (newPipeline) {
              finalPipelines = [newPipeline];
            }
          } else {
            console.log(`[AppContext] No CRM pipelines found for Gestor ${effectiveGestorId} linked to consultant ${userId}.`);
          }
        }
        setCrmPipelines(finalPipelines);

        setCrmStages(stagesData?.data || []);
        setCrmFields(fieldsData?.data || []);
        setCrmLeads(crmLeadsData?.data?.map((lead: any) => ({
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
          proposalValue: lead.proposal_value,
          proposalClosingDate: lead.proposal_closing_date,
          soldCreditValue: lead.sold_credit_value,
          soldGroup: lead.sold_group,
          soldQuota: lead.sold_quota,
          saleDate: lead.sale_date,
        })).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()) || []);
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
        
        refetchCommissions();

        const recoverPendingCommissions = async () => {
          try {
            const pending = JSON.parse(localStorage.getItem('pending_commissions') || '[]');
            if (pending.length === 0) return;
            for (const pendingCommission of pending) {
              try {
                const { _id, _timestamp, _retryCount, ...cleanCommission } = pendingCommission;
                const payload = { user_id: JOAO_GESTOR_AUTH_ID, data: cleanCommission };
                const { data, error } = await supabase.from('commissions').insert(payload).select('id', 'created_at').maybeSingle();
                if (error) throw error;
                const updatedPending = JSON.parse(localStorage.getItem('pending_commissions') || '[]').filter((pc: any) => pc._id !== _id);
                localStorage.setItem('pending_commissions', JSON.stringify(updatedPending));
                const newCommissionWithDbId = { ...cleanCommission, db_id: data.id, criado_em: data.created_at };
                setCommissions(prev => {
                  const filtered = prev.filter(c => c.db_id !== `temp_${_id}`);
                  return [newCommissionWithDbId, ...filtered];
                });
              } catch (error) {
                console.error(`[RECOVERY] Falha ao sincronizar comissão ${pendingCommission._id}:`, error);
                toast.error(`Falha ao sincronizar comissão ${pendingCommission._id}.`);
                const updatedPending = JSON.parse(localStorage.getItem('pending_commissions') || '[]').map((pc: any) => pc._id === pendingCommission._id ? { ...pc, _retryCount: (pc._retryCount || 0) + 1 } : pc);
                localStorage.setItem('pending_commissions', JSON.stringify(updatedPending));
              }
            }
          } catch (error) {
            console.error('[RECOVERY] Erro no processo de recuperação:', error);
          }
        };
        if (user) { setTimeout(() => { recoverPendingCommissions(); }, 3000); }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        toast.error("Erro ao carregar dados iniciais. Tente recarregar a página.");
      } finally {
        clearTimeout(timeoutId);
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
    } else {
      setIsDataLoading(false);
    }
  }, [user?.id, user?.role, refetchCommissions]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const addCandidate = useCallback(async (candidate: Candidate) => { if (!user) throw new Error("Usuário não autenticado."); const { data, error } = await supabase.from('candidates').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: candidate }).select('id').single(); if (error) { console.error(error); toast.error("Erro ao adicionar candidato."); throw error; } if (data) { setCandidates(prev => [{ ...candidate, db_id: data.id }, ...prev]); } }, [user]);
  const updateCandidate = useCallback(async (id: string, updates: Partial<Candidate>) => { if (!user) throw new Error("Usuário não autenticado."); const c = candidates.find(c => c.id === id); if (!c || !c.db_id) throw new Error("Candidato não encontrado"); const updated = { ...c, ...updates }; const { db_id, ...dataToUpdate } = updated; const { error } = await supabase.from('candidates').update({ data: dataToUpdate }).match({ id: c.db_id, user_id: JOAO_GESTOR_AUTH_ID }); if (error) { console.error(error); toast.error("Erro ao atualizar candidato."); throw error; } setCandidates(prev => prev.map(p => p.id === id ? updated : p)); }, [user, candidates]);
  const deleteCandidate = useCallback(async (id: string) => { if (!user) throw new Error("Usuário não autenticado."); const c = candidates.find(c => c.id === id); if (!c || !c.db_id) throw new Error("Candidato não encontrado"); const { error } = await supabase.from('candidates').delete().match({ id: c.db_id, user_id: JOAO_GESTOR_AUTH_ID }); if (error) { console.error(error); toast.error("Erro ao excluir candidato."); throw error; } setCandidates(prev => prev.filter(p => p.id !== id)); }, [user, candidates]);
  
  const addTeamMember = useCallback(async (member: Omit<TeamMember, 'id'> & { email?: string }) => {
    if (!user) throw new Error("Usuário não autenticado.");
  
    let authUserId: string;
    let tempPassword = '';
    let wasExistingUser = false;
  
    if (member.email) {
      tempPassword = generateRandomPassword();
      
      const cleanedCpf = member.cpf ? member.cpf.replace(/\D/g, '') : '';
      const last4Cpf = cleanedCpf.length >= 4 ? cleanedCpf.slice(-4) : null;
      
      console.log("[AppContext] Invoking create-or-link-consultant Edge Function for ADD operation...");
      console.log("[AppContext] Email being sent to Edge Function:", member.email);
      const { data, error: invokeError } = await supabase.functions.invoke('create-or-link-consultant', {
        body: { 
          email: member.email, 
          name: member.name, 
          tempPassword,
          login: last4Cpf
        },
      });

      if (invokeError) {
        console.error("[AppContext] Edge Function invocation error:", invokeError);
        if ((invokeError as any).context?.response) {
          try {
            const errorBody = await (invokeError as any).context.response.json();
            console.error("[AppContext] Detailed Edge Function error response body:", errorBody);
            if (errorBody.error) {
              throw new Error(errorBody.error);
            }
          } catch (jsonError) {
            console.error("[AppContext] Failed to parse Edge Function error response body:", jsonError);
          }
        }
        toast.error(`Falha ao invocar Edge Function: ${invokeError.message}`);
        throw new Error(`Falha ao invocar Edge Function: ${invokeError.message}`);
      }
      
      if (data?.error) {
        console.error("[AppContext] Edge Function returned an error:", data.error);
        toast.error(data.error);
        throw new Error(data.error);
      }
      
      authUserId = data.authUserId;
      wasExistingUser = data.userExists;
      console.log(`[AppContext] Edge Function successful. AuthUserId: ${authUserId}, UserExists: ${wasExistingUser}`);

    } else {
      authUserId = `local_${crypto.randomUUID()}`;
      console.log(`Membro sem email criado com ID local: ${authUserId}`);
    }
  
    const newMember: TeamMember = {
      ...member,
      id: authUserId,
      email: member.email,
      hasLogin: !!member.email,
      isActive: true,
      ...(tempPassword && { tempPassword })
    };
  
    const { data: upsertedData, error } = await supabase
      .from('team_members')
      .upsert(
        { 
          user_id: JOAO_GESTOR_AUTH_ID,
          id: crypto.randomUUID(),
          cpf: newMember.cpf,
          data: newMember
        },
        { 
          onConflict: 'cpf',
          ignoreDuplicates: false
        }
      )
      .select('id')
      .single();
    
    if (error) {
      console.error("Erro ao inserir/atualizar em team_members:", error);
      toast.error("Erro ao inserir/atualizar membro da equipe.");
      throw error;
    }
    
    setTeamMembers(prev => {
      const existingIndex = prev.findIndex(tm => tm.cpf === newMember.cpf);
      if (existingIndex > -1) {
        const updatedMembers = [...prev];
        updatedMembers[existingIndex] = { ...newMember, db_id: upsertedData.id };
        return updatedMembers;
      } else {
        return [...prev, { ...newMember, db_id: upsertedData.id }];
      }
    });
    
    return { 
      success: true, 
      member: newMember, 
      tempPassword: tempPassword,
      wasExistingUser: wasExistingUser,
      message: wasExistingUser ? 
        `Membro adicionado. Senha do usuário existente foi resetada para a temporária.` :
        `Membro criado com senha temporária: ${tempPassword}`
    };
  }, [user]);

  const updateTeamMember = useCallback(async (id: string, updates: Partial<TeamMember>): Promise<{ tempPassword?: string }> => {
    if (!user) throw new Error("Usuário não autenticado.");
    const m = teamMembers.find(m => m.id === id);
    if (!m || !m.db_id) throw new Error("Membro não encontrado");

    let tempPassword: string | undefined;
    let authUserId = m.id;

    if (updates.email && updates.email !== m.email) {
      console.log(`[AppContext] Email change detected for ${m.name}. Old: ${m.email}, New: ${updates.email}`);
      tempPassword = generateRandomPassword();
      
      const cleanedCpf = updates.cpf ? updates.cpf.replace(/\D/g, '') : (m.cpf ? m.cpf.replace(/\D/g, '') : '');
      const last4Cpf = cleanedCpf.length >= 4 ? cleanedCpf.slice(-4) : null;

      console.log("[AppContext] Invoking create-or-link-consultant Edge Function for UPDATE operation (email change)...");
      const { data, error: invokeError } = await supabase.functions.invoke('create-or-link-consultant', {
        body: {
          email: updates.email,
          name: updates.name || m.name,
          tempPassword,
          login: last4Cpf,
        },
      });

      if (invokeError) {
        console.error("[AppContext] Edge Function invocation error during UPDATE:", invokeError);
        if ((invokeError as any).context?.response) {
          try {
            const errorBody = await (invokeError as any).context.response.json();
            console.error("[AppContext] Detailed Edge Function error response body:", errorBody);
            if (errorBody.error) {
              throw new Error(errorBody.error);
            }
          } catch (jsonError) {
            console.error("[AppContext] Failed to parse Edge Function error response body:", jsonError);
          }
        }
        toast.error(`Falha ao invocar Edge Function: ${invokeError.message}`);
        throw new Error(`Falha ao invocar Edge Function: ${invokeError.message}`);
      }
      
      if (data?.error) {
        console.error("[AppContext] Edge Function returned an error during UPDATE:", data.error);
        toast.error(data.error);
        throw new Error(data.error);
      }

      authUserId = data.authUserId;
      console.log(`[AppContext] Edge Function successful during UPDATE. Auth user ${authUserId} email updated to ${updates.email} and password reset.`);
    }

    const updated = { ...m, ...updates, id: authUserId, hasLogin: !!updates.email };
    const { db_id, ...dataToUpdate } = updated;

    const { error } = await supabase.from('team_members').update({ data: dataToUpdate, cpf: updated.cpf }).match({ id: m.db_id, user_id: JOAO_GESTOR_AUTH_ID });
    if (error) { console.error(error); toast.error("Erro ao atualizar membro da equipe."); throw error; }
    
    setTeamMembers(prev => prev.map(p => p.db_id === m.db_id ? updated : p));

    return { tempPassword };
  }, [user, teamMembers]);
  
  const deleteTeamMember = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const m = teamMembers.find(m => m.id === id);
    if (!m || !m.db_id) {
      console.error(`[deleteTeamMember] Membro não encontrado ou sem db_id para o ID: ${id}`);
      toast.error("Membro da equipe não encontrado ou ID do banco de dados ausente.");
      throw new Error("Membro da equipe não encontrado ou ID do banco de dados ausente.");
    }

    console.log(`[deleteTeamMember] Tentando excluir membro com db_id: ${m.db_id} e user_id (gestor): ${JOAO_GESTOR_AUTH_ID}`);
    
    try {
      const { error } = await supabase.from('team_members').delete().match({ id: m.db_id, user_id: JOAO_GESTOR_AUTH_ID });
      
      if (error) {
        console.error(`[deleteTeamMember] Erro ao excluir membro do banco de dados:`, error);
        toast.error("Erro ao excluir membro da equipe.");
        throw error;
      }
      
      console.log(`[deleteTeamMember] Membro com db_id: ${m.db_id} excluído com sucesso do banco de dados.`);
      setTeamMembers(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error(`[deleteTeamMember] Falha na operação de exclusão para o membro ${id}:`, error);
      throw error;
    }
  }, [user, teamMembers]);

  const addCutoffPeriod = useCallback(async (period: CutoffPeriod) => { if (!user) throw new Error("Usuário não autenticado."); const { data, error } = await supabase.from('cutoff_periods').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: period }).select('id').single(); if (error) { console.error(error); toast.error("Erro ao adicionar período de corte."); throw error; } if (data) setCutoffPeriods(prev => [...prev, { ...period, db_id: data.id }]); }, [user]);
  const updateCutoffPeriod = useCallback(async (id: string, updates: Partial<CutoffPeriod>) => { if (!user) throw new Error("Usuário não autenticado."); const p = cutoffPeriods.find(p => p.id === id); if (!p || !p.db_id) throw new Error("Período não encontrado"); const updated = { ...p, ...updates }; const { db_id, ...dataToUpdate } = updated; const { error } = await supabase.from('cutoff_periods').update({ data: dataToUpdate }).match({ id: p.db_id, user_id: JOAO_GESTOR_AUTH_ID }); if (error) { console.error(error); toast.error("Erro ao atualizar período de corte."); throw error; } setCutoffPeriods(prev => prev.map(item => item.id === id ? updated : item)); }, [user, cutoffPeriods]);
  const deleteCutoffPeriod = useCallback(async (id: string) => { if (!user) throw new Error("Usuário não autenticado."); const p = cutoffPeriods.find(p => p.id === id); if (!p || !p.db_id) throw new Error("Período não encontrado"); const { error } = await supabase.from('cutoff_periods').delete().match({ id: p.db_id, user_id: JOAO_GESTOR_AUTH_ID }); if (error) { console.error(error); toast.error("Erro ao excluir período de corte."); throw error; } setCutoffPeriods(prev => prev.filter(item => item.id !== id)); }, [user, cutoffPeriods]);
  const addCommission = useCallback(async (commission: Commission): Promise<Commission> => { if (!user) throw new Error("Usuário não autenticado."); const localId = `local_${Date.now()}`; const localCommission: Commission = { ...commission, db_id: localId, criado_em: new Date().toISOString() }; setCommissions(prev => [localCommission, ...prev]); setTimeout(() => { toast.success(`✅ VENDA REGISTRADA!\n\nCliente: ${commission.clientName}\nValor: R$ ${commission.value.toLocaleString()}\nID: ${localId}\n\nA sincronização ocorrerá em segundo plano.`); }, 50); setTimeout(async () => { try { const cleanCommission = { ...commission, customRules: commission.customRules?.length ? commission.customRules : undefined, angelName: commission.angelName || undefined, managerName: commission.managerName || 'N/A', }; const payload = { user_id: JOAO_GESTOR_AUTH_ID, data: cleanCommission }; const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Background sync timeout')), 10000)); const insertPromise = supabase.from('commissions').insert(payload).select('id', 'created_at').maybeSingle(); const { data, error } = await Promise.race([insertPromise, timeoutPromise]) as any; if (error) throw error; if (data && data.id) { setCommissions(prev => prev.map(c => c.db_id === localId ? { ...c, db_id: data.id.toString(), criado_em: data.created_at, _synced: true } : c)); const updated = JSON.parse(localStorage.getItem('pending_commissions') || '[]').filter((p: any) => p._localId !== localId); localStorage.setItem('pending_commissions', JSON.stringify(updated)); } else { throw new Error('Nenhum ID retornado'); } } catch (error: any) { const pending = JSON.parse(localStorage.getItem('pending_commissions') || '[]'); const alreadyExists = pending.some((p: any) => p._localId === localId); if (!alreadyExists) { pending.push({ ...commission, _localId: localId, _timestamp: new Date().toISOString(), _error: error.message, _attempts: 1 }); localStorage.setItem('pending_commissions', JSON.stringify(pending)); } toast.error("Erro ao sincronizar venda em segundo plano. Tentaremos novamente."); } }, 2000); return localCommission; }, [user]);
  const updateCommission = useCallback(async (id: string, updates: Partial<Commission>) => { if (!user) throw new Error("Usuário não autenticado."); const commissionToUpdate = commissions.find(c => c.id === id); if (!commissionToUpdate || !commissionToUpdate.db_id) throw new Error("Comissão não encontrada para atualização."); const originalData = { ...commissionToUpdate }; delete (originalData as any).db_id; delete (originalData as any).criado_em; const newData = { ...originalData, ...updates }; const payload = { data: newData }; const { error } = await supabase.from('commissions').update(payload).match({ id: commissionToUpdate.db_id, user_id: JOAO_GESTOR_AUTH_ID }); if (error) { console.error(error); toast.error("Erro ao atualizar comissão."); throw error; } await refetchCommissions(); }, [user, commissions, refetchCommissions]);
  const deleteCommission = useCallback(async (id: string) => { if (!user) throw new Error("Usuário não autenticado."); const commissionToDelete = commissions.find(c => c.id === id); if (!commissionToDelete || !commissionToDelete.db_id) throw new Error("Comissão não encontrada para exclusão."); const { error } = await supabase.from('commissions').delete().match({ id: commissionToDelete.db_id, user_id: JOAO_GESTOR_AUTH_ID }); if (error) { console.error(error); toast.error("Erro ao excluir comissão."); throw error; } await refetchCommissions(); }, [user, commissions, refetchCommissions]);
  const addSupportMaterial = useCallback(async (materialData: Omit<SupportMaterial, 'id' | 'url'>, file: File) => { if (!user) throw new Error("Usuário não autenticado."); const sanitizedFileName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_'); const filePath = `public/${crypto.randomUUID()}-${sanitizedFileName}`; const { error: uploadError } = await supabase.storage.from('support_materials').upload(filePath, file); if (uploadError) { toast.error("Erro ao fazer upload do arquivo."); throw uploadError; } const { data: urlData } = supabase.storage.from('support_materials').getPublicUrl(filePath); if (!urlData) { toast.error("Não foi possível obter a URL pública do arquivo."); throw new Error("Não foi possível obter a URL pública do arquivo."); } const newMaterial: SupportMaterial = { ...materialData, id: crypto.randomUUID(), url: urlData.publicUrl, }; const { data: dbData, error: dbError } = await supabase.from('support_materials').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: newMaterial }).select('id').single(); if (dbError) { await supabase.storage.from('support_materials').remove([filePath]); toast.error("Erro ao salvar material no banco de dados."); throw dbError; } setSupportMaterials(prev => [{ ...newMaterial, db_id: dbData.id }, ...prev]); }, [user]);
  const deleteSupportMaterial = useCallback(async (id: string) => { if (!user) throw new Error("Usuário não autenticado."); const m = supportMaterials.find(m => m.id === id); if (!m || !m.db_id) throw new Error("Material não encontrado"); const filePath = m.url.split('/support_materials/')[1]; const { error: storageError } = await supabase.storage.from('support_materials').remove([filePath]); if (storageError) console.error("Erro ao deletar do storage (pode já ter sido removido):", storageError.message); const { error: dbError } = await supabase.from('support_materials').delete().match({ id: m.db_id, user_id: JOAO_GESTOR_AUTH_ID }); if (dbError) { toast.error("Erro ao excluir material."); throw dbError; } setSupportMaterials(prev => prev.filter(p => p.id !== id)); }, [user, supportMaterials]);
  // const addImportantLink = useCallback(async (link: ImportantLink) => { if (!user) throw new Error("Usuário não autenticado."); const { data, error } = await supabase.from('important_links').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: link }).select('id').single(); if (error) { console.error(error); toast.error("Erro ao adicionar link."); throw error; } if (data) setImportantLinks(prev => [...prev, { ...link, db_id: data.id }]); }, [user]); // REMOVIDO
  // const updateImportantLink = useCallback(async (id: string, updates: Partial<ImportantLink>) => { if (!user) throw new Error("Usuário não autenticado."); const l = importantLinks.find(l => l.id === id); if (!l || !l.db_id) throw new Error("Link não encontrado"); const updated = { ...l, ...updates }; const { db_id, ...dataToUpdate } = updated; const { error } = await supabase.from('important_links').update({ data: dataToUpdate }).match({ id: l.db_id, user_id: JOAO_GESTOR_AUTH_ID }); if (error) { console.error(error); toast.error("Erro ao atualizar link."); throw error; } setImportantLinks(prev => prev.map(item => item.id === id ? updated : item)); }, [user, importantLinks]); // REMOVIDO
  // const deleteImportantLink = useCallback(async (id: string) => { if (!user) throw new Error("Usuário não autenticado."); const l = importantLinks.find(l => l.id === id); if (!l || !l.db_id) throw new Error("Link não encontrado"); const { error } = await supabase.from('important_links').delete().match({ id: l.db_id, user_id: JOAO_GESTOR_AUTH_ID }); if (error) { console.error(error); toast.error("Erro ao excluir link."); throw error; } setImportantLinks(prev => prev.filter(p => p.id !== id)); }, [user, importantLinks]); // REMOVIDO
  const updateInstallmentStatus = useCallback(async (commissionId: string, installmentNumber: number, status: InstallmentStatus, paidDate?: string, saleType?: 'Imóvel' | 'Veículo') => { const commission = commissions.find(c => c.id === commissionId); if (!commission) { console.error("Comissão não encontrada"); toast.error("Comissão não encontrada."); return; } let competenceMonth: string | undefined; let finalPaidDate = paidDate || new Date().toISOString().split('T')[0]; if (status === 'Pago' && finalPaidDate) { competenceMonth = calculateCompetenceMonth(finalPaidDate); } const newDetails = { ...commission.installmentDetails, [installmentNumber]: { status, ...(finalPaidDate && { paidDate: finalPaidDate }), ...(competenceMonth && { competenceMonth }) } }; const newOverallStatus = getOverallStatus(newDetails); try { const updatedCommission = { ...commission, installmentDetails: newDetails, status: newOverallStatus }; setCommissions(prev => prev.map(c => c.id === commissionId ? updatedCommission : c)); if (commission.db_id && user) { const { db_id, criado_em, _synced, ...dataToUpdate } = updatedCommission; const { error } = await supabase.from('commissions').update({ data: dataToUpdate }).eq('id', commission.db_id).eq('user_id', JOAO_GESTOR_AUTH_ID); if (error) throw error; } } catch (error: any) { console.error("Erro ao salvar status:", error); toast.error("Erro ao salvar status da parcela. Tente novamente."); throw error; } }, [commissions, user, calculateCompetenceMonth]);
  const getCandidate = useCallback((id: string) => candidates.find(c => c.id === id), [candidates]);
  const toggleChecklistItem = useCallback(async (candidateId: string, itemId: string) => { const c = getCandidate(candidateId); if(c) { const state = c.checklistProgress[itemId] || { completed: false }; await updateCandidate(candidateId, { checklistProgress: { ...c.checklistProgress, [itemId]: { ...state, completed: !state.completed } } }); } }, [getCandidate, updateCandidate]);
  const setChecklistDueDate = useCallback(async (candidateId: string, itemId: string, date: string) => { const c = getCandidate(candidateId); if(c) { const state = c.checklistProgress[itemId] || { completed: false }; await updateCandidate(candidateId, { checklistProgress: { ...c.checklistProgress, [itemId]: { ...state, dueDate: date } } }); } }, [getCandidate, updateCandidate]);
  const toggleConsultantGoal = useCallback(async (candidateId: string, goalId: string) => { const c = getCandidate(candidateId); if(c) { const progress = c.consultantGoalsProgress || {}; await updateCandidate(candidateId, { consultantGoalsProgress: { ...progress, [goalId]: !progress[goalId] } }); } }, [getCandidate, updateCandidate]);
  const addFeedback = useCallback(async (candidateId: string, feedbackData: Omit<Feedback, 'id'>) => { const c = getCandidate(candidateId); if(c) { const newFeedback: Feedback = { id: crypto.randomUUID(), ...feedbackData }; const newFeedbacks = [...(c.feedbacks || []), newFeedback]; await updateCandidate(candidateId, { feedbacks: newFeedbacks }); } }, [getCandidate, updateCandidate]);
  const updateFeedback = useCallback(async (candidateId: string, updatedFeedback: Feedback) => { const c = getCandidate(candidateId); if(c) { const newFeedbacks = (c.feedbacks || []).map(f => f.id === updatedFeedback.id ? updatedFeedback : f); await updateCandidate(candidateId, { feedbacks: newFeedbacks }); } }, [getCandidate, updateCandidate]);
  const deleteFeedback = useCallback(async (candidateId: string, feedbackId: string) => { const c = getCandidate(candidateId); if(c) { const newFeedbacks = (c.feedbacks || []).filter(f => f.id !== feedbackId); await updateCandidate(candidateId, { feedbacks: newFeedbacks }); } }, [getCandidate, updateCandidate]);
  const addTeamMemberFeedback = useCallback(async (memberId: string, feedbackData: Omit<Feedback, 'id'>) => { const member = teamMembers.find(m => m.id === memberId); if (member) { const newFeedback: Feedback = { id: crypto.randomUUID(), ...feedbackData }; const newFeedbacks = [...(member.feedbacks || []), newFeedback]; await updateTeamMember(memberId, { feedbacks: newFeedbacks }); } }, [teamMembers, updateTeamMember]);
  const updateTeamMemberFeedback = useCallback(async (memberId: string, updatedFeedback: Feedback) => { const member = teamMembers.find(m => m.id === memberId); if (member) { const newFeedbacks = (member.feedbacks || []).map(f => f.id === updatedFeedback.id ? updatedFeedback : f); await updateTeamMember(memberId, { feedbacks: newFeedbacks }); } }, [teamMembers, updateTeamMember]);
  const deleteTeamMemberFeedback = useCallback(async (memberId: string, feedbackId: string) => { const member = teamMembers.find(m => m.id === memberId); if (member) { const newFeedbacks = (member.feedbacks || []).filter(f => f.id !== feedbackId); await updateTeamMember(memberId, { feedbacks: newFeedbacks }); } }, [teamMembers, updateTeamMember]);
  const saveTemplate = useCallback((id: string, updates: Partial<CommunicationTemplate>) => { const newTemplates = { ...templates, [id]: { ...templates[id], ...updates } }; setTemplates(newTemplates); updateConfig({ templates: newTemplates }); }, [templates, updateConfig]);
  const addOrigin = useCallback((origin: string) => { if (!origins.includes(origin)) { const newOrigins = [...origins, origin]; setOrigins(newOrigins); updateConfig({ origins: newOrigins }); } }, [origins, updateConfig]);
  const deleteOrigin = useCallback((originToDelete: string) => { if (origins.length <= 1) { toast.error("É necessário manter pelo menos uma origem."); return; } const newOrigins = origins.filter(o => o !== originToDelete); setOrigins(newOrigins); updateConfig({ origins: newOrigins }); }, [origins, updateConfig]);
  const addInterviewer = useCallback((interviewer: string) => { if (!interviewers.includes(interviewer)) { const newInterviewers = [...interviewers, interviewer]; setInterviewers(newInterviewers); updateConfig({ interviewers: newInterviewers }); } }, [interviewers, updateConfig]);
  const deleteInterviewer = useCallback((interviewerToDelete: string) => { if (interviewers.length <= 1) { toast.error("É necessário manter pelo menos um entrevistador."); return; } const newInterviewers = interviewers.filter(i => i !== interviewerToDelete); setInterviewers(newInterviewers); updateConfig({ interviewers: newInterviewers }); }, [interviewers, updateConfig]);
  const addPV = useCallback((pv: string) => { if (!pvs.includes(pv)) { const newPvs = [...pvs, pv]; setPvs(newPvs); updateConfig({ pvs: newPvs }); } }, [pvs, updateConfig]);
  const updateAndPersistStructure = useCallback((setter: React.Dispatch<React.SetStateAction<any>>, key: string, newStructure: any) => { setter(newStructure); updateConfig({ [key]: newStructure }); }, [updateConfig]);
  const addChecklistItem = useCallback((stageId: string, label: string) => { const newStructure = checklistStructure.map(s => s.id === stageId ? { ...s, items: [...s.items, { id: `custom_${Date.now()}`, label }] } : s); updateAndPersistStructure(setChecklistStructure, 'checklistStructure', newStructure); }, [checklistStructure, updateAndPersistStructure]);
  const updateChecklistItem = useCallback((stageId: string, itemId: string, label: string) => { const newStructure = checklistStructure.map(s => s.id === stageId ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, label } : i) } : s); updateAndPersistStructure(setChecklistStructure, 'checklistStructure', newStructure); }, [checklistStructure, updateAndPersistStructure]);
  const deleteChecklistItem = useCallback((stageId: string, itemId: string) => { const newStructure = checklistStructure.map(s => s.id === stageId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s); updateAndPersistStructure(setChecklistStructure, 'checklistStructure', newStructure); }, [checklistStructure, updateAndPersistStructure]);
  const moveChecklistItem = useCallback((stageId: string, itemId: string, dir: 'up' | 'down') => { const newStructure = checklistStructure.map(s => { if (s.id !== stageId) return s; const idx = s.items.findIndex(i => i.id === itemId); if ((dir === 'up' && idx < 1) || (dir === 'down' && idx >= s.items.length - 1)) return s; const newItems = [...s.items]; const targetIdx = dir === 'up' ? idx - 1 : idx + 1; [newItems[idx], newItems[targetIdx]] = [newItems[targetIdx], newItems[idx]]; return { ...s, items: newItems }; }); updateAndPersistStructure(setChecklistStructure, 'checklistStructure', newStructure); }, [checklistStructure, updateAndPersistStructure]);
  const resetChecklistToDefault = useCallback(() => { updateAndPersistStructure(setChecklistStructure, 'checklistStructure', DEFAULT_STAGES); }, [updateAndPersistStructure]);
  const addGoalItem = useCallback((stageId: string, label: string) => { const newStructure = consultantGoalsStructure.map(s => s.id === stageId ? { ...s, items: [...s.items, { id: `goal_${Date.now()}`, label }] } : s); updateAndPersistStructure(setConsultantGoalsStructure, 'consultantGoalsStructure', newStructure); }, [consultantGoalsStructure, updateAndPersistStructure]);
  const updateGoalItem = useCallback((stageId: string, itemId: string, label: string) => { const newStructure = consultantGoalsStructure.map(s => s.id === stageId ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, label } : i) } : s); updateAndPersistStructure(setConsultantGoalsStructure, 'consultantGoalsStructure', newStructure); }, [consultantGoalsStructure, updateAndPersistStructure]);
  const deleteGoalItem = useCallback((stageId: string, itemId: string) => { const newStructure = consultantGoalsStructure.map(s => s.id === stageId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s); updateAndPersistStructure(setConsultantGoalsStructure, 'consultantGoalsStructure', newStructure); }, [consultantGoalsStructure, updateAndPersistStructure]);
  const moveGoalItem = useCallback((stageId: string, itemId: string, dir: 'up' | 'down') => { const newStructure = consultantGoalsStructure.map(s => { if (s.id !== stageId) return s; const idx = s.items.findIndex(i => i.id === itemId); if ((dir === 'up' && idx < 1) || (dir === 'down' && idx >= s.items.length - 1)) return s; const newItems = [...s.items]; const targetIdx = dir === 'up' ? idx - 1 : idx + 1; [newItems[idx], newItems[targetIdx]] = [newItems[targetIdx], newItems[idx]]; return { ...s, items: newItems }; }); updateAndPersistStructure(setConsultantGoalsStructure, 'consultantGoalsStructure', newStructure); }, [consultantGoalsStructure, updateAndPersistStructure]);
  const resetGoalsToDefault = useCallback(() => { updateAndPersistStructure(setConsultantGoalsStructure, 'consultantGoalsStructure', DEFAULT_GOALS); }, [updateAndPersistStructure]);
  const updateInterviewSection = useCallback((sectionId: string, updates: Partial<InterviewSection>) => { const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, ...updates } : s); updateAndPersistStructure(setInterviewStructure, 'interviewStructure', newStructure); }, [interviewStructure, updateAndPersistStructure]);
  const addInterviewQuestion = useCallback((sectionId: string, text: string, points: number) => { const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, questions: [...s.questions, { id: `q_${Date.now()}`, text, points }] } : s); updateAndPersistStructure(setInterviewStructure, 'interviewStructure', newStructure); }, [interviewStructure, updateAndPersistStructure]);
  const updateInterviewQuestion = useCallback((sectionId: string, questionId: string, updates: Partial<InterviewSection['questions'][0]>) => { const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, questions: s.questions.map(q => q.id === questionId ? { ...q, ...updates } : q) } : s); updateAndPersistStructure(setInterviewStructure, 'interviewStructure', newStructure); }, [interviewStructure, updateAndPersistStructure]);
  const deleteInterviewQuestion = useCallback((sectionId: string, questionId: string) => { const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, questions: s.questions.filter(q => q.id !== questionId) } : s); updateAndPersistStructure(setInterviewStructure, 'interviewStructure', newStructure); }, [interviewStructure, updateAndPersistStructure]);
  const moveInterviewQuestion = useCallback((sectionId: string, questionId: string, dir: 'up' | 'down') => { const newStructure = interviewStructure.map(s => { if (s.id !== sectionId) return s; const idx = s.questions.findIndex(i => i.id === questionId); if ((dir === 'up' && idx < 1) || (dir === 'down' && idx >= s.questions.length - 1)) return s; const newQuestions = [...s.questions]; const targetIdx = dir === 'up' ? idx - 1 : idx + 1; [newQuestions[idx], newQuestions[targetIdx]] = [newQuestions[targetIdx], newQuestions[idx]]; return { ...s, questions: newQuestions }; }); updateAndPersistStructure(setInterviewStructure, 'interviewStructure', newStructure); }, [interviewStructure, updateAndPersistStructure]);
  const resetInterviewToDefault = useCallback(() => { updateAndPersistStructure(setInterviewStructure, 'interviewStructure', INITIAL_INTERVIEW_STRUCTURE); }, [updateAndPersistStructure]);
  
  const addOnlineOnboardingSession = useCallback(async (consultantName: string): Promise<OnboardingSession | null> => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data: sessionData, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .insert({ user_id: JOAO_GESTOR_AUTH_ID, consultant_name: consultantName })
      .select()
      .single();
    if (sessionError) { console.error(sessionError); toast.error("Erro ao criar sessão de onboarding."); throw sessionError; }

    const videosToInsert = onboardingTemplateVideos.map(templateVideo => ({
      session_id: sessionData.id,
      title: templateVideo.title,
      video_url: templateVideo.video_url,
      order: templateVideo.order,
      is_completed: false,
    }));

    if (videosToInsert.length > 0) {
      const { error: videosError } = await supabase.from('onboarding_videos').insert(videosToInsert);
      if (videosError) {
        await supabase.from('onboarding_sessions').delete().eq('id', sessionData.id);
        console.error(videosError);
        toast.error("Erro ao adicionar vídeos à sessão.");
        throw videosError;
      }
    }
    
    const newSession = { ...sessionData, videos: videosToInsert.map(v => ({...v, id: crypto.randomUUID()})) };
    setOnboardingSessions(prev => [newSession, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    return newSession;
  }, [user, onboardingTemplateVideos]);

  const deleteOnlineOnboardingSession = useCallback(async (sessionId: string) => { if (!user) throw new Error("Usuário não autenticado."); const { error } = await supabase.from('onboarding_sessions').delete().match({ id: sessionId, user_id: JOAO_GESTOR_AUTH_ID }); if (error) { console.error(error); toast.error("Erro ao excluir sessão de onboarding."); throw error; } setOnboardingSessions(prev => prev.filter(s => s.id !== sessionId)); }, [user]);
  
  const addVideoToTemplate = useCallback(async (title: string, url: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const newOrder = onboardingTemplateVideos.length > 0 ? Math.max(...onboardingTemplateVideos.map(v => v.order)) + 1 : 1;
    const newVideoData = { user_id: JOAO_GESTOR_AUTH_ID, title, video_url: url, order: newOrder };
    const { data, error } = await supabase.from('onboarding_video_templates').insert(newVideoData).select().single();
    if (error) { console.error(error); toast.error("Erro ao adicionar vídeo ao template."); throw error; }
    setOnboardingTemplateVideos(prev => [...prev, data]);
  }, [user, onboardingTemplateVideos]);

  const deleteVideoFromTemplate = useCallback(async (videoId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('onboarding_video_templates').delete().match({ id: videoId, user_id: JOAO_GESTOR_AUTH_ID });
    if (error) { console.error(error); toast.error("Erro ao excluir vídeo do template."); throw error; }
    setOnboardingTemplateVideos(prev => prev.filter(v => v.id !== videoId));
  }, [user]);

  const addCrmLead = useCallback(async (leadData: Omit<CrmLead, 'id' | 'created_at' | 'updated_at'>): Promise<CrmLead> => {
    if (!user || !session) throw new Error("Usuário não autenticado.");
    
    if (!crmOwnerUserId) throw new Error("ID do Gestor do CRM não encontrado.");

    let finalStageId = leadData.stage_id;
    if (!finalStageId) {
        const activePipeline = crmPipelines.find(p => p.is_active) || crmPipelines[0];
        if (activePipeline) {
            const firstStage = crmStages
                .filter(s => s.pipeline_id === activePipeline.id && s.is_active)
                .sort((a, b) => a.order_index - b.order_index)[0];
            if (firstStage) {
                finalStageId = firstStage.id;
            }
        }
    }
    if (!finalStageId) {
        toast.error("Nenhuma etapa de pipeline ativa encontrada para atribuir ao lead.");
        throw new Error("Nenhuma etapa de pipeline ativa encontrada para atribuir ao lead.");
    }

    const effectiveUserIdForCrmOwner = crmOwnerUserId;
    const effectiveConsultantId = user.role === 'CONSULTOR' ? session.user.id : (leadData.consultant_id || null);

    const payload = {
        ...leadData,
        user_id: effectiveUserIdForCrmOwner,
        stage_id: finalStageId,
        name: leadData.name || '',
        consultant_id: effectiveConsultantId,
        created_by: session.user.id,
        updated_by: session.user.id
    };

    console.log('Inserting lead with:', payload);

    const { data, error } = await supabase
        .from('crm_leads')
        .insert(payload)
        .select('*')
        .single();
    
    if (error) {
        console.error('Error inserting lead:', error);
        toast.error("Erro ao adicionar lead.");
        throw error;
    }
    
    const newLead: CrmLead = {
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
      proposalValue: data.proposal_value,
      proposalClosingDate: data.proposal_closing_date,
      soldCreditValue: data.sold_credit_value,
      soldGroup: data.sold_group,
      soldQuota: data.sold_quota,
      saleDate: data.sale_date,
    };

    setCrmLeads(prev => [newLead, ...prev]);
    return newLead;
}, [user, session, crmOwnerUserId, crmPipelines, crmStages]);

  const updateCrmLead = useCallback(async (id: string, updates: Partial<CrmLead>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    
    const currentLead = crmLeads.find(l => l.id === id);
    if (!currentLead) {
      toast.error("Lead não encontrado para atualização.");
      throw new Error("Lead não encontrado para atualização.");
    }

    const dataToUpdateInDB: any = {}; 

    dataToUpdateInDB.name = updates.name !== undefined ? (updates.name === null ? '' : updates.name) : currentLead.name;

    if (updates.stage_id !== undefined) dataToUpdateInDB.stage_id = updates.stage_id;
    
    if (updates.proposalValue !== undefined) {
      dataToUpdateInDB.proposal_value = updates.proposalValue; 
    }
    
    if (updates.proposalClosingDate !== undefined) {
      dataToUpdateInDB.proposal_closing_date = updates.proposalClosingDate; 
    }

    if (updates.soldCreditValue !== undefined) {
      dataToUpdateInDB.sold_credit_value = updates.soldCreditValue;
    }
    if (updates.soldGroup !== undefined) {
      dataToUpdateInDB.sold_group = updates.soldGroup;
    }
    if (updates.soldQuota !== undefined) {
      dataToUpdateInDB.sold_quota = updates.soldQuota;
    }
    if (updates.saleDate !== undefined) {
      dataToUpdateInDB.sale_date = updates.saleDate;
    }

    if (updates.consultant_id !== undefined) dataToUpdateInDB.consultant_id = updates.consultant_id;

    dataToUpdateInDB.data = {
      ...currentLead.data,
      ...updates.data,
    };

    if ('user_id' in dataToUpdateInDB) {
      delete dataToUpdateInDB.user_id;
    }

    dataToUpdateInDB.updated_at = new Date().toISOString();

    Object.keys(dataToUpdateInDB).forEach(key => {
      if (dataToUpdateInDB[key] === undefined) {
        delete dataToUpdateInDB[key];
      }
    });

    let query = supabase.from('crm_leads').update(dataToUpdateInDB).eq('id', id);

    if (user.role === 'CONSULTOR') {
      query = query.eq('consultant_id', user.id);
    } else if (user.role === 'GESTOR' || user.role === 'ADMIN') {
      if (!crmOwnerUserId) {
        toast.error("ID do Gestor do CRM não encontrado para validação.");
        throw new Error("ID do Gestor do CRM não encontrado para validação.");
      }
      query = query.eq('user_id', crmOwnerUserId);
    } else {
      toast.error("Role de usuário não autorizada para atualizar leads.");
      throw new Error("Role de usuário não autorizada para atualizar leads.");
    }

    const { error } = await query;

    if (error) {
      console.error("Supabase error updating crm_leads:", error);
      toast.error("Erro ao atualizar lead.");
      throw error;
    }
    
    setCrmLeads(prev => {
      const updatedLead = { 
        ...currentLead, 
        ...updates,
        data: { ...currentLead.data, ...updates.data },
        updated_at: dataToUpdateInDB.updated_at
      };
      const otherLeads = prev.filter(lead => lead.id !== id);
      return [updatedLead, ...otherLeads];
    });
  }, [user, crmLeads, crmOwnerUserId]);

  const deleteCrmLead = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    
    let query = supabase.from('crm_leads').delete().eq('id', id);

    if (user.role === 'CONSULTOR') {
      query = query.eq('consultant_id', user.id);
    } else if (user.role === 'GESTOR' || user.role === 'ADMIN') {
      if (!crmOwnerUserId) { toast.error("ID do Gestor do CRM não encontrado para validação."); throw new Error("ID do Gestor do CRM não encontrado para validação."); }
      query = query.eq('user_id', crmOwnerUserId);
    } else {
      toast.error("Role de usuário não autorizada para excluir leads.");
      throw new Error("Role de usuário não autorizada para excluir leads.");
    }

    const { error } = await query;
    if (error) { console.error(error); toast.error("Erro ao excluir lead."); throw error; }
    setCrmLeads(prev => prev.filter(lead => lead.id !== id));
  }, [user, crmOwnerUserId]);

  const updateCrmLeadStage = useCallback(async (leadId: string, newStageId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    
    let query = supabase.from('crm_leads').update({ stage_id: newStageId, updated_at: new Date().toISOString() }).eq('id', leadId);

    if (user.role === 'CONSULTOR') {
      query = query.eq('consultant_id', user.id);
    } else if (user.role === 'GESTOR' || user.role === 'ADMIN') {
      if (!crmOwnerUserId) { toast.error("ID do Gestor do CRM não encontrado para validação."); throw new Error("ID do Gestor do CRM não encontrado para validação."); }
      query = query.eq('user_id', crmOwnerUserId);
    } else {
      toast.error("Role de usuário não autorizada para mover leads de etapa.");
      throw new Error("Role de usuário não autorizada para mover leads de etapa.");
    }

    const { error } = await query;
    if (error) { console.error(error); toast.error("Erro ao mover lead de etapa."); throw error; }
    
    const currentLead = crmLeads.find(l => l.id === leadId);
    if (currentLead) {
      await updateCrmLead(leadId, { stage_id: newStageId, updated_at: new Date().toISOString() });
    }
  }, [user, crmOwnerUserId, crmLeads, updateCrmLead]);

  const addCrmStage = useCallback(async (stageData: Omit<CrmStage, 'id' | 'user_id' | 'created_at'>) => { if (!user) throw new Error("Usuário não autenticado."); const { data, error } = await supabase.from('crm_stages').insert({ ...stageData, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) { console.error(error); toast.error("Erro ao adicionar etapa do CRM."); throw error; } setCrmStages(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index)); return data; }, [user]);
  const updateCrmStage = useCallback(async (id: string, updates: Partial<CrmStage>) => { if (!user) throw new Error("Usuário não autenticado."); const { data, error } = await supabase.from('crm_stages').update(updates).eq('id', id).select().single(); if (error) { console.error(error); toast.error("Erro ao atualizar etapa do CRM."); throw error; } setCrmStages(prev => prev.map(s => s.id === id ? data : s).sort((a, b) => a.order_index - b.order_index)); }, [user]);
  const updateCrmStageOrder = useCallback(async (stages: CrmStage[]) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const updates = stages.map((stage, index) => ({
      id: stage.id,
      order_index: index,
      user_id: JOAO_GESTOR_AUTH_ID,
      pipeline_id: stage.pipeline_id,
      name: stage.name,
      is_active: stage.is_active,
      is_won: stage.is_won,
      is_lost: stage.is_lost,
    }));
    const { error } = await supabase.from('crm_stages').upsert(updates);
    if (error) { console.error(error); toast.error("Erro ao reordenar etapas do CRM."); throw error; }
    setCrmStages(stages.map((s, i) => ({...s, order_index: i})));
  }, [user]);
  const deleteCrmStage = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('crm_stages').delete().eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) { console.error(error); toast.error("Erro ao excluir etapa do CRM."); throw error; }
    setCrmStages(prev => prev.filter(stage => stage.id !== id));
  }, [user]);
  const addCrmField = useCallback(async (fieldData: Omit<CrmField, 'id' | 'user_id' | 'created_at'>) => { if (!user) throw new Error("Usuário não autenticado."); const { data, error } = await supabase.from('crm_fields').insert({ ...fieldData, user_id: JOAO_GESTOR_AUTH_ID }).select().single(); if (error) { console.error(error); toast.error("Erro ao adicionar campo do CRM."); throw error; } setCrmFields(prev => [...prev, data]); return data; }, [user]);
  const updateCrmField = useCallback(async (id: string, updates: Partial<CrmField>) => { if (!user) throw new Error("Usuário não autenticado."); const { data, error } = await supabase.from('crm_fields').update(updates).eq('id', id).select().single(); if (error) { console.error(error); toast.error("Erro ao atualizar campo do CRM."); throw error; } setCrmFields(prev => prev.map(f => f.id === id ? data : f)); }, [user]);

  const addDailyChecklist = useCallback(async (title: string): Promise<DailyChecklist> => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('daily_checklists').insert({ user_id: JOAO_GESTOR_AUTH_ID, title, is_active: true }).select().single();
    if (error) { console.error(error); toast.error("Erro ao criar checklist diário."); throw error; }
    setDailyChecklists(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateDailyChecklist = useCallback(async (id: string, updates: Partial<DailyChecklist>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('daily_checklists').update(updates).eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) { console.error(error); toast.error("Erro ao atualizar checklist diário."); throw error; }
    setDailyChecklists(prev => prev.map(cl => cl.id === id ? { ...cl, ...updates } : cl));
  }, [user]);

  const deleteDailyChecklist = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('daily_checklists').delete().eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) { console.error(error); toast.error("Erro ao excluir checklist diário."); throw error; }
    setDailyChecklists(prev => prev.filter(cl => cl.id !== id));
    setDailyChecklistItems(prev => prev.filter(item => item.daily_checklist_id !== id));
    setDailyChecklistAssignments(prev => prev.filter(assign => assign.daily_checklist_id !== id));
  }, [user]);

  const addDailyChecklistItem = useCallback(async (checklistId: string, text: string, order_index: number): Promise<DailyChecklistItem> => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('daily_checklist_items').insert({ daily_checklist_id: checklistId, text, order_index, is_active: true }).select().single();
    if (error) { console.error(error); toast.error("Erro ao adicionar item ao checklist."); throw error; }
    setDailyChecklistItems(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index));
    return data;
  }, [user]);

  const updateDailyChecklistItem = useCallback(async (id: string, updates: Partial<DailyChecklistItem>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('daily_checklist_items').update(updates).eq('id', id);
    if (error) { console.error(error); toast.error("Erro ao atualizar item do checklist."); throw error; }
    setDailyChecklistItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item).sort((a, b) => a.order_index - b.order_index));
  }, [user]);

  const deleteDailyChecklistItem = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('daily_checklist_items').delete().eq('id', id);
    if (error) { console.error(error); toast.error("Erro ao excluir item do checklist."); throw error; }
    setDailyChecklistItems(prev => prev.filter(item => item.id !== id));
    setDailyChecklistCompletions(prev => prev.filter(comp => comp.daily_checklist_item_id !== id));
  }, [user]);

  const moveDailyChecklistItem = useCallback(async (checklistId: string, itemId: string, direction: 'up' | 'down') => {
    if (!user) throw new Error("Usuário não autenticado.");
    const itemsInChecklist = dailyChecklistItems.filter(item => item.daily_checklist_id === checklistId).sort((a, b) => a.order_index - b.order_index);
    const itemIndex = itemsInChecklist.findIndex(item => item.id === itemId);

    if (itemIndex === -1) return;

    const newOrder = [...itemsInChecklist];
    const [movedItem] = newOrder.splice(itemIndex, 1);
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;

    if (targetIndex < 0 || targetIndex >= newOrder.length + 1) return;

    newOrder.splice(targetIndex, 0, movedItem);

    const updates = newOrder.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));

    const { error } = await supabase.from('daily_checklist_items').upsert(updates);
    if (error) { console.error(error); toast.error("Erro ao mover item do checklist."); throw error; }
    setDailyChecklistItems(prev => {
      const otherItems = prev.filter(item => item.daily_checklist_id !== checklistId);
      return [...otherItems, ...newOrder].sort((a, b) => a.order_index - b.order_index);
    });
  }, [user, dailyChecklistItems]);

  const assignDailyChecklistToConsultant = useCallback(async (checklistId: string, consultantId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('daily_checklist_assignments').insert({ daily_checklist_id: checklistId, consultant_id: consultantId }).select().single();
    if (error) { console.error(error); toast.error("Erro ao atribuir checklist."); throw error; }
    setDailyChecklistAssignments(prev => [...prev, data]);
  }, [user]);

  const unassignDailyChecklistFromConsultant = useCallback(async (checklistId: string, consultantId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('daily_checklist_assignments').delete().match({ daily_checklist_id: checklistId, consultant_id: consultantId });
    if (error) { console.error(error); toast.error("Erro ao remover atribuição do checklist."); throw error; }
    setDailyChecklistAssignments(prev => prev.filter(assign => !(assign.daily_checklist_id === checklistId && assign.consultant_id === consultantId)));
  }, [user]);

  const toggleDailyChecklistCompletion = useCallback(async (itemId: string, date: string, done: boolean, consultantId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const existingCompletion = dailyChecklistCompletions.find(c => c.daily_checklist_item_id === itemId && c.consultant_id === consultantId && c.date === date);

    if (existingCompletion) {
      const { error } = await supabase.from('daily_checklist_completions').update({ done, updated_at: new Date().toISOString() }).eq('id', existingCompletion.id);
      if (error) { console.error(error); toast.error("Erro ao atualizar conclusão do checklist."); throw error; }
      setDailyChecklistCompletions(prev => prev.map(c => c.id === existingCompletion.id ? { ...c, done, updated_at: new Date().toISOString() } : c));
    } else {
      const { data, error } = await supabase.from('daily_checklist_completions').insert({ daily_checklist_item_id: itemId, consultant_id: consultantId, date, done, updated_at: new Date().toISOString() }).select().single();
      if (error) { console.error(error); toast.error("Erro ao registrar conclusão do checklist."); throw error; }
      setDailyChecklistCompletions(prev => [...prev, data]);
    }
  }, [user, dailyChecklistCompletions]);

  const addWeeklyTarget = useCallback(async (title: string, week_start: string, week_end: string): Promise<WeeklyTarget> => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('weekly_targets').insert({ user_id: JOAO_GESTOR_AUTH_ID, title, week_start, week_end, is_active: true }).select().single();
    if (error) { console.error(error); toast.error("Erro ao criar meta semanal."); throw error; }
    setWeeklyTargets(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateWeeklyTarget = useCallback(async (id: string, updates: Partial<WeeklyTarget>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('weekly_targets').update(updates).eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) { console.error(error); toast.error("Erro ao atualizar meta semanal."); throw error; }
    setWeeklyTargets(prev => prev.map(wt => wt.id === id ? { ...wt, ...updates } : wt));
  }, [user]);

  const deleteWeeklyTarget = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('weekly_targets').delete().eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) { console.error(error); toast.error("Erro ao excluir meta semanal."); throw error; }
    setWeeklyTargets(prev => prev.filter(wt => wt.id !== id));
    setWeeklyTargetItems(prev => prev.filter(item => item.weekly_target_id !== id));
    setWeeklyTargetAssignments(prev => prev.filter(assign => assign.weekly_target_id !== id));
  }, [user]);

  const addWeeklyTargetItem = useCallback(async (targetId: string, metric_key: string, label: string, target_value: number, order_index: number): Promise<WeeklyTargetItem> => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('weekly_target_items').insert({ weekly_target_id: targetId, metric_key, label, target_value, order_index, is_active: true }).select().single();
    if (error) { console.error(error); toast.error("Erro ao adicionar item à meta semanal."); throw error; }
    setWeeklyTargetItems(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index));
    return data;
  }, [user]);

  const updateWeeklyTargetItem = useCallback(async (id: string, updates: Partial<WeeklyTargetItem>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('weekly_target_items').update(updates).eq('id', id);
    if (error) { console.error(error); toast.error("Erro ao atualizar item da meta semanal."); throw error; }
    setWeeklyTargetItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item).sort((a, b) => a.order_index - b.order_index));
  }, [user]);

  const deleteWeeklyTargetItem = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('weekly_target_items').delete().eq('id', id);
    if (error) { console.error(error); toast.error("Erro ao excluir item da meta semanal."); throw error; }
    setWeeklyTargetItems(prev => prev.filter(item => item.id !== id));
  }, [user]);

  const moveWeeklyTargetItem = useCallback(async (targetId: string, itemId: string, direction: 'up' | 'down') => {
    if (!user) throw new Error("Usuário não autenticado.");
    const itemsInTarget = weeklyTargetItems.filter(item => item.weekly_target_id === targetId).sort((a, b) => a.order_index - b.order_index);
    const itemIndex = itemsInTarget.findIndex(item => item.id === itemId);

    if (itemIndex === -1) return;

    const newOrder = [...itemsInTarget];
    const [movedItem] = newOrder.splice(itemIndex, 1);
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;

    if (targetIndex < 0 || targetIndex >= newOrder.length + 1) return;

    newOrder.splice(targetIndex, 0, movedItem);

    const updates = newOrder.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));

    const { error } = await supabase.from('weekly_target_items').upsert(updates);
    if (error) { console.error(error); toast.error("Erro ao mover item da meta semanal."); throw error; }
    setWeeklyTargetItems(prev => {
      const otherItems = prev.filter(item => item.weekly_target_id !== targetId);
      return [...otherItems, ...newOrder].sort((a, b) => a.order_index - b.order_index);
    });
  }, [user, weeklyTargetItems]);

  const assignWeeklyTargetToConsultant = useCallback(async (targetId: string, consultantId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('weekly_target_assignments').insert({ weekly_target_id: targetId, consultant_id: consultantId }).select().single();
    if (error) { console.error(error); toast.error("Erro ao atribuir meta semanal."); throw error; }
    setWeeklyTargetAssignments(prev => [...prev, data]);
  }, [user]);

  const unassignWeeklyTargetFromConsultant = useCallback(async (targetId: string, consultantId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('weekly_target_assignments').delete().match({ weekly_target_id: targetId, consultant_id: consultantId });
    if (error) { console.error(error); toast.error("Erro ao remover atribuição da meta semanal."); throw error; }
    setWeeklyTargetAssignments(prev => prev.filter(assign => !(assign.weekly_target_id === targetId && assign.consultant_id === consultantId)));
  }, [user]);

  const addMetricLog = useCallback(async (metric_key: string, value: number, date: string): Promise<MetricLog> => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('metric_logs').insert({ consultant_id: user.id, metric_key, date, value }).select().single();
    if (error) { console.error(error); toast.error("Erro ao adicionar log de métrica."); throw error; }
    setMetricLogs(prev => [...prev, data]);
    return data;
  }, [user]);

  const addSupportMaterialV2 = useCallback(async (materialData: Omit<SupportMaterialV2, 'id' | 'user_id' | 'created_at'>, file?: File): Promise<SupportMaterialV2> => {
    if (!user) throw new Error("Usuário não autenticado.");
    
    let content = materialData.content;
    let contentType = materialData.content_type;

    if (file) {
      const sanitizedFileName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_');
      const filePath = `support_materials_v2/${crypto.randomUUID()}-${sanitizedFileName}`;
      
      const { error: uploadError } = await supabase.storage.from('support_materials').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (uploadError) { console.error(uploadError); toast.error("Erro ao fazer upload do arquivo."); throw uploadError; }

      const { data: urlData } = supabase.storage.from('support_materials').getPublicUrl(filePath);
      if (!urlData) { toast.error("Não foi possível obter a URL pública do arquivo."); throw new Error("Não foi possível obter a URL pública do arquivo."); }
      
      content = urlData.publicUrl;
      contentType = file.type.includes('image') ? 'image' : 'pdf';
    }

    const newMaterialData = { 
      ...materialData, 
      user_id: JOAO_GESTOR_AUTH_ID,
      content,
      content_type: contentType,
      is_active: true,
    };

    const { data, error } = await supabase.from('support_materials_v2').insert(newMaterialData).select().single();
    if (error) { console.error(error); toast.error("Erro ao adicionar material de apoio."); throw error; }
    setSupportMaterialsV2(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateSupportMaterialV2 = useCallback(async (id: string, updates: Partial<SupportMaterialV2>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('support_materials_v2').update(updates).eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) { console.error(error); toast.error("Erro ao atualizar material de apoio."); throw error; }
    setSupportMaterialsV2(prev => prev.map(mat => mat.id === id ? { ...mat, ...updates } : mat));
  }, [user]);

  const deleteSupportMaterialV2 = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const materialToDelete = supportMaterialsV2.find(m => m.id === id);
    if (!materialToDelete) { toast.error("Material não encontrado."); throw new Error("Material não encontrado."); }

    if (materialToDelete.content_type === 'image' || materialToDelete.content_type === 'pdf') {
      const filePath = materialToDelete.content.split('/support_materials/')[1];
      if (filePath) {
        const { error: storageError } = await supabase.storage.from('support_materials').remove([filePath]);
        if (storageError) console.error("Erro ao deletar arquivo do storage (pode já ter sido removido):", storageError.message);
      }
    }

    const { error } = await supabase.from('support_materials_v2').delete().eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) { console.error(error); toast.error("Erro ao excluir material de apoio."); throw error; }
    setSupportMaterialsV2(prev => prev.filter(mat => mat.id !== id));
    setSupportMaterialAssignments(prev => prev.filter(assign => assign.material_id !== id));
  }, [user, supportMaterialsV2]);

  const assignSupportMaterialToConsultant = useCallback(async (materialId: string, consultantId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('support_material_assignments').insert({ material_id: materialId, consultant_id: consultantId }).select().single();
    if (error) { console.error(error); toast.error("Erro ao atribuir material de apoio."); throw error; }
    setSupportMaterialAssignments(prev => [...prev, data]);
  }, [user]);

  const unassignSupportMaterialFromConsultant = useCallback(async (materialId: string, consultantId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('support_material_assignments').delete().match({ material_id: materialId, consultant_id: consultantId });
    if (error) { console.error(error); toast.error("Erro ao remover atribuição do material de apoio."); throw error; }
    setSupportMaterialAssignments(prev => prev.filter(assign => !(assign.material_id === materialId && assign.consultant_id === consultantId)));
  }, [user]);

  const addLeadTask = useCallback(async (task: Omit<LeadTask, 'id' | 'user_id' | 'created_at'>): Promise<LeadTask> => {
    if (!user) throw new Error("Usuário não autenticado.");
    try {
      const { data, error } = await supabase.from('lead_tasks').insert({ ...task, user_id: user.id }).select().single();
      if (error) {
        console.error("Supabase error adding lead task:", error);
        toast.error("Erro ao adicionar tarefa do lead.");
        throw new Error(error.message);
      }
      setLeadTasks(prev => [...prev, data]);
      return data;
    } catch (error: any) {
      console.error("Failed to add lead task:", error);
      throw new Error(`Failed to add lead task: ${error.message || error}`);
    }
  }, [user]);

  const updateLeadTask = useCallback(async (id: string, updates: Partial<LeadTask>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    try {
      const { error } = await supabase.from('lead_tasks').update(updates).eq('id', id).eq('user_id', user.id);
      if (error) {
        console.error("Supabase error updating lead task:", error);
        toast.error("Erro ao atualizar tarefa do lead.");
        throw new Error(error.message);
      }
      setLeadTasks(prev => prev.map(task => task.id === id ? { ...task, ...updates } : task));
    } catch (error: any) {
      console.error("Failed to update lead task:", error);
      throw new Error(`Failed to update lead task: ${error.message || error}`);
    }
  }, [user]);

  const deleteLeadTask = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    try {
      const { error } = await supabase.from('lead_tasks').delete().eq('id', id).eq('user_id', user.id);
      if (error) {
        console.error("Supabase error deleting lead task:", error);
        toast.error("Erro ao excluir tarefa do lead.");
        throw new Error(error.message);
      }
      setLeadTasks(prev => prev.filter(task => task.id !== id));
    } catch (error: any) {
      console.error("Failed to delete lead task:", error);
      throw new Error(`Failed to delete lead task: ${error.message || error}`);
    }
  }, [user]);

  const toggleLeadTaskCompletion = useCallback(async (id: string, is_completed: boolean) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const updates = { is_completed, completed_at: is_completed ? new Date().toISOString() : null };
    try {
      const { error } = await supabase.from('lead_tasks').update(updates).eq('id', id).eq('user_id', user.id);
      if (error) {
        console.error("Supabase error toggling lead task completion:", error);
        toast.error("Erro ao atualizar conclusão da tarefa.");
        throw new Error(error.message);
      }
      setLeadTasks(prev => prev.map(task => task.id === id ? { ...task, ...updates } : task));
    } catch (error: any) {
      console.error("Failed to toggle task completion:", error);
      throw new Error(`Failed to toggle task completion: ${error.message || error}`);
    }
  }, [user]);

  useEffect(() => { if (!user) return; const syncPendingCommissions = async () => { const pending = JSON.parse(localStorage.getItem('pending_commissions') || '[]') as any[]; if (pending.length === 0) return; for (const item of pending) { try { const { _localId, _timestamp, _attempts, ...cleanData } = item; const { data, error } = await supabase.from('commissions').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: cleanData }).select('id', 'created_at').maybeSingle(); if (!error && data) { setCommissions(prev => prev.map(c => c.db_id === _localId ? { ...c, db_id: data.id.toString(), criado_em: data.created_at } : c)); const updated = pending.filter((p: any) => p._localId !== _localId); localStorage.setItem('pending_commissions', JSON.stringify(updated)); } } catch (error) { console.log(`❌ Falha ao sincronizar ${item._localId}`); toast.error(`Falha ao sincronizar comissão ${item._localId}.`); } } }; const interval = setInterval(syncPendingCommissions, 2 * 60 * 1000); setTimeout(syncPendingCommissions, 5000); return () => clearInterval(interval); }, [user]);

  return (
    <AppContext.Provider value={{ 
      isDataLoading,
      candidates, templates, checklistStructure, consultantGoalsStructure, interviewStructure, commissions, supportMaterials, importantLinks: [], theme, origins, interviewers, pvs, teamMembers, cutoffPeriods, onboardingSessions, onboardingTemplateVideos, // importantLinks agora é um array vazio
      crmPipelines, crmStages, crmFields, crmLeads, addCrmLead, updateCrmLead, deleteCrmLead, updateCrmLeadStage, addCrmStage, updateCrmStage, updateCrmStageOrder, deleteCrmStage, addCrmField, updateCrmField, crmOwnerUserId,
      addCutoffPeriod, updateCutoffPeriod, deleteCutoffPeriod,
      addTeamMember, updateTeamMember, deleteTeamMember, toggleTheme, addOrigin, deleteOrigin, addInterviewer, deleteInterviewer, addPV, addCandidate, updateCandidate, deleteCandidate, toggleChecklistItem, toggleConsultantGoal, setChecklistDueDate, getCandidate, saveTemplate,
      addChecklistItem, updateChecklistItem, deleteChecklistItem, moveChecklistItem, resetChecklistToDefault, addGoalItem, updateGoalItem, deleteGoalItem, moveGoalItem, resetGoalsToDefault,
      updateInterviewSection, addInterviewQuestion, updateInterviewQuestion, deleteInterviewQuestion, moveInterviewQuestion, resetInterviewToDefault, addCommission, updateCommission, deleteCommission, updateInstallmentStatus, addSupportMaterial, deleteSupportMaterial,
      addImportantLink: async () => { toast.error("Funcionalidade de Links Importantes foi removida."); throw new Error("Funcionalidade removida."); }, // REMOVIDO
      updateImportantLink: async () => { toast.error("Funcionalidade de Links Importantes foi removida."); throw new Error("Funcionalidade removida."); }, // REMOVIDO
      deleteImportantLink: async () => { toast.error("Funcionalidade de Links Importantes foi removida."); throw new Error("Funcionalidade removida."); }, // REMOVIDO
      addFeedback, updateFeedback, deleteFeedback,
      addTeamMemberFeedback, updateTeamMemberFeedback, deleteTeamMemberFeedback,
      addOnlineOnboardingSession, deleteOnlineOnboardingSession, addVideoToTemplate, deleteVideoFromTemplate,
      dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions,
      addDailyChecklist, updateDailyChecklist, deleteDailyChecklist,
      addDailyChecklistItem, updateDailyChecklistItem, deleteDailyChecklistItem, moveDailyChecklistItem,
      assignDailyChecklistToConsultant, unassignDailyChecklistFromConsultant, toggleDailyChecklistCompletion,
      weeklyTargets, weeklyTargetItems, weeklyTargetAssignments, metricLogs,
      addWeeklyTarget, updateWeeklyTarget, deleteWeeklyTarget,
      addWeeklyTargetItem, updateWeeklyTargetItem, deleteWeeklyTargetItem, moveWeeklyTargetItem,
      assignWeeklyTargetToConsultant, unassignWeeklyTargetFromConsultant, addMetricLog,
      supportMaterialsV2, supportMaterialAssignments,
      addSupportMaterialV2, updateSupportMaterialV2, deleteSupportMaterialV2,
      assignSupportMaterialToConsultant, unassignSupportMaterialFromConsultant,
      leadTasks, addLeadTask, updateLeadTask, deleteLeadTask, toggleLeadTaskCompletion
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};