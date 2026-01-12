import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Candidate, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, Commission, SupportMaterial, GoalStage, TeamMember, InstallmentStatus, CommissionStatus, InstallmentInfo, CutoffPeriod, OnboardingSession, OnboardingVideoTemplate, CrmPipeline, CrmStage, CrmField, CrmLead, DailyChecklist, DailyChecklistItem, DailyChecklistAssignment, DailyChecklistCompletion, WeeklyTarget, WeeklyTargetItem, WeeklyTargetAssignment, MetricLog, SupportMaterialV2, SupportMaterialAssignment, LeadTask, SupportMaterialContentType, DailyChecklistItemResource, DailyChecklistItemResourceType, GestorTask, GestorTaskCompletion, FinancialEntry, FormCadastro, FormFile, Notification, NotificationType } from '@/types';
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
const JOAO_GESTOR_AUTH_ID = "0c6d71b7-daeb-4dde-8eec-0e7a8ffef658"; // <--- ATUALIZADO COM O SEU ID DE GESTOR!

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const fetchedUserIdRef = useRef<string | null>(null); // CORREÇÃO: Inicializado com null
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

  // NOVO: Tarefas pessoais do Gestor
  const [gestorTasks, setGestorTasks] = useState<GestorTask[]>([]);
  const [gestorTaskCompletions, setGestorTaskCompletions] = useState<GestorTaskCompletion[]>([]); // NOVO: Conclusões de tarefas do gestor

  // NOVO: Entradas e Saídas Financeiras
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);

  // NOVO: Cadastros de Formulário Público
  const [formCadastros, setFormCadastros] = useState<FormCadastro[]>([]);
  const [formFiles, setFormFiles] = useState<FormFile[]>([]);

  // NOVO: Notificações
  const [notifications, setNotifications] = useState<Notification[]>([]);


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
    setGestorTasks([]); // Reset gestor tasks
    setGestorTaskCompletions([]); // Reset gestor task completions
    setFinancialEntries([]); // NOVO: Reset financial entries
    setFormCadastros([]); // NOVO: Reset form cadastros
    setFormFiles([]); // NOVO: Reset form files
    setNotifications([]); // NOVO: Reset notifications
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

  // Helper function to check if a gestor task is due on a specific date
  const isGestorTaskDueOnDate = useCallback((task: GestorTask, checkDate: string): boolean => {
    if (!task.recurrence_pattern || task.recurrence_pattern.type === 'none') {
      return task.due_date === checkDate;
    }

    const taskCreationDate = new Date(task.created_at);
    const targetDate = new Date(checkDate);

    if (task.recurrence_pattern.type === 'daily') {
      return targetDate >= taskCreationDate;
    }

    if (task.recurrence_pattern.type === 'every_x_days' && task.recurrence_pattern.interval) {
      const interval = task.recurrence_pattern.interval;
      const diffTime = Math.abs(targetDate.getTime() - taskCreationDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Check if the target date is on or after the creation date
      // And if the difference in days is a multiple of the interval
      return targetDate >= taskCreationDate && diffDays % interval === 0;
    }

    return false;
  }, []);

  const calculateNotifications = useCallback(() => {
    if (!user || (user.role !== 'GESTOR' && user.role !== 'ADMIN')) {
      setNotifications([]);
      return;
    }

    const newNotifications: Notification[] = [];
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0]; // e.g., "2024-07-11"

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayFormatted = yesterday.toISOString().split('T')[0]; // e.g., "2024-07-10"

    const currentMonth = today.getMonth();
    // const currentYear = today.getFullYear(); // Não usado diretamente

    // 1. Aniversariantes do Mês
    teamMembers.forEach(member => {
      if (member.dateOfBirth) {
        const dob = new Date(member.dateOfBirth + 'T00:00:00');
        if (dob.getMonth() === currentMonth) {
          newNotifications.push({
            id: `birthday-${member.id}`,
            type: 'birthday',
            title: `Aniversário de ${member.name}!`,
            description: `Celebre o aniversário de ${member.name} neste mês.`,
            date: member.dateOfBirth,
            link: `/gestor/config-team`, // Link para a gestão de equipe
            isRead: false,
          });
        }
      }
    });

    // 2. Documentação enviada no formulário (novos cadastros)
    formCadastros.filter(cadastro => {
      const submissionDate = new Date(cadastro.submission_date);
      // Considerar "novo" se foi submetido nas últimas 24 horas e não está completo/verificado
      return (today.getTime() - submissionDate.getTime() < 24 * 60 * 60 * 1000) && !cadastro.is_complete;
    }).forEach(cadastro => {
      newNotifications.push({
        id: `form-submission-${cadastro.id}`,
        type: 'form_submission',
        title: `Novo Cadastro de Formulário: ${cadastro.data.nome_completo || 'Desconhecido'}`,
        description: `Um novo formulário foi enviado e aguarda revisão.`,
        date: cadastro.submission_date.split('T')[0],
        link: `/gestor/form-cadastros`, // Link para a página de formulários
        isRead: false,
      });
    });

    // 3. Nova Venda Registrada (CRM Leads) - Lógica ajustada
    crmLeads.filter(lead => {
      if (!lead.soldCreditValue || !lead.saleDate) return false; // Must have a sold value and sale date
      
      // Considerar "novo" se a venda foi registrada hoje ou ontem
      return lead.saleDate === todayFormatted || lead.saleDate === yesterdayFormatted;
    }).forEach(lead => {
      const consultant = teamMembers.find(tm => tm.id === lead.consultant_id);
      newNotifications.push({
        id: `new-sale-lead-${lead.id}`, // Unique ID for lead-based sale
        type: 'new_sale',
        title: `Nova Venda Registrada: ${lead.name}`,
        description: `O consultor ${consultant?.name || 'Desconhecido'} registrou uma venda no valor de ${lead.soldCreditValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
        date: lead.saleDate,
        link: `/gestor/crm`, // Link para a página do CRM
        isRead: false,
      });
    });

    // 4. Onboarding Online 100% Concluído
    onboardingSessions.filter(session => {
      const totalVideos = session.videos.length;
      if (totalVideos === 0) return false;
      const completedVideos = session.videos.filter(video => video.is_completed).length;
      const isCompleted100Percent = (completedVideos / totalVideos) === 1;

      // Considerar "novo" se foi concluído 100% e a sessão foi criada recentemente (últimas 72h, por exemplo)
      const sessionCreationDate = new Date(session.created_at);
      return isCompleted100Percent && (today.getTime() - sessionCreationDate.getTime() < 72 * 60 * 60 * 1000); // Notificar se 100% e criada nas últimas 72h
    }).forEach(session => {
      newNotifications.push({
        id: `onboarding-complete-${session.id}`,
        type: 'onboarding_complete',
        title: `Onboarding Concluído: ${session.consultant_name}`,
        description: `O consultor ${session.consultant_name} finalizou 100% do onboarding online.`,
        date: session.created_at.split('T')[0], // Usar data de criação da sessão
        link: `/gestor/onboarding-admin`, // Link para a página de onboarding
        isRead: false,
      });
    });

    setNotifications(newNotifications);
  }, [user, teamMembers, formCadastros, crmLeads, onboardingSessions]); // Dependências atualizadas para crmLeads

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
          gestorTasksData, // Fetch gestor tasks
          gestorTaskCompletionsData, // NOVO: Fetch gestor task completions
          financialEntriesData, // NOVO: Fetch financial entries
          formCadastrosData, // NOVO: Fetch form cadastros
          formFilesData, // NOVO: Fetch form files
        ] = await Promise.all([
          (async () => { try { return await supabase.from('app_config').select('data').eq('user_id', effectiveGestorId).maybeSingle(); } catch (e) { console.error("Error fetching app_config:", e); return { data: null, error: e }; } })(),
          (async () => { try { return await supabase.from('candidates').select('id, data, created_at, last_updated_at').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching candidates:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('support_materials').select('id, data').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching support_materials:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('cutoff_periods').select('id, data').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching cutoff_periods:", e); return { data: null, error: e }; } })(),
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
          (async () => { try { return await supabase.from('weekly_targets').select('*').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching weekly_targets:", e); return { data: null, error: e }; } })(),
          (async () => { try { return await supabase.from('weekly_target_items').select('*'); } catch (e) { console.error("Error fetching weekly_target_items:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('weekly_target_assignments').select('*'); } catch (e) { console.error("Error fetching weekly_target_assignments:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('metric_logs').select('*'); } catch (e) { console.error("Error fetching metric_logs:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('support_materials_v2').select('*').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching support_materials_v2:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('support_material_assignments').select('*'); } catch (e) { console.error("Error fetching support_material_assignments:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('lead_tasks').select('*'); } catch (e) { console.error("Error fetching lead_tasks:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('gestor_tasks').select('*').eq('user_id', userId); } catch (e) { console.error("Error fetching gestor_tasks:", e); return { data: [], error: e }; } })(), // Fetch gestor tasks
          (async () => { try { return await supabase.from('gestor_task_completions').select('*').eq('user_id', userId); } catch (e) { console.error("Error fetching gestor_task_completions:", e); return { data: [], error: e }; } })(), // NOVO: Fetch gestor task completions
          (async () => { try { return await supabase.from('financial_entries').select('*').eq('user_id', userId); } catch (e) { console.error("Error fetching financial_entries:", e); return { data: [], error: e }; } })(), // NOVO: Fetch financial entries
          (async () => { try { return await supabase.from('form_submissions').select('id, submission_date, data, internal_notes, is_complete').eq('user_id', effectiveGestorId).order('submission_date', { ascending: false }); } catch (e) { console.error("Error fetching form_submissions:", e); return { data: [], error: e }; } })(), // NOVO: Fetch form cadastros
          (async () => { try { return await supabase.from('form_files').select('*'); } catch (e) { console.error("Error fetching form_files:", e); return { data: [], error: e }; } })(), // NOVO: Fetch form files
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
        if (gestorTasksData.error) console.error("Gestor Tasks error:", gestorTasksData.error);
        if (gestorTaskCompletionsData.error) console.error("Gestor Task Completions error:", gestorTaskCompletionsData.error); // NOVO: Log de erro
        if (financialEntriesData.error) console.error("Financial Entries error:", financialEntriesData.error); // NOVO: Log de erro
        if (formCadastrosData.error) console.error("Form Cadastros error:", formCadastrosData.error); // NOVO: Log de erro
        if (formFilesData.error) console.error("Form Files error:", formFilesData.error); // NOVO: Log de erro


        if (configResult.data) {
          const { data } = configResult.data;
          setChecklistStructure(data.checklistStructure || DEFAULT_STAGES);
          setConsultantGoalsStructure(data.consultantGoalsStructure || DEFAULT_GOALS);
          const loadedInterviewStructure = data.interviewStructure || INITIAL_INTERVIEW_STRUCTURE;
          const uniqueInterviewSections = Array.from(new Map(loadedInterviewStructure.map((item: InterviewSection) => [item.id, item])).values());
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

        // ⚠️ APLICANDO CÓPIA PROFUNDA E GARANTINDO ID VÁLIDO AQUI
        setCandidates(candidatesData?.data?.map(item => {
          console.log(`[fetchData] Processing raw item:`, item);
          const rawCandidateData = item.data as Candidate; // Assume it's a Candidate structure
          
          // Ensure client-side ID is always present. Fallback to a new UUID if missing from JSONB data.
          const clientSideId = rawCandidateData.id || crypto.randomUUID(); 
          if (!rawCandidateData.id) {
            console.warn(`[fetchData] Candidate with db_id "${item.id}" is missing client-side 'id' in JSONB data. Generating new client-side ID: "${clientSideId}"`);
          }

          // Create a deep copy of the data, ensuring all nested objects are new instances
          const deepCopiedCandidate: Candidate = {
            ...JSON.parse(JSON.stringify(rawCandidateData)), // Deep copy the entire JSONB data
            id: clientSideId, // Ensure client-side ID is set
            db_id: item.id, // Supabase primary key
            createdAt: item.created_at, // ⚠️ CORREÇÃO: Usar created_at da linha do DB
            lastUpdatedAt: item.last_updated_at, // ⚠️ CORREÇÃO: Usar last_updated_at da linha do DB
            // Explicitly ensure nested objects are deep copies if they exist
            interviewScores: JSON.parse(JSON.stringify(rawCandidateData.interviewScores || { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' })),
            checkedQuestions: JSON.parse(JSON.stringify(rawCandidateData.checkedQuestions || {})),
            checklistProgress: JSON.parse(JSON.stringify(rawCandidateData.checklistProgress || {})),
            consultantGoalsProgress: JSON.parse(JSON.stringify(rawCandidateData.consultantGoalsProgress || {})),
            feedbacks: JSON.parse(JSON.stringify(rawCandidateData.feedbacks || [])),
            data: JSON.parse(JSON.stringify(rawCandidateData.data || {})), // Ensure 'data' field itself is deep copied if it exists
          };
          
          console.log(`[fetchData] Final candidate name before setCandidates:`, deepCopiedCandidate.name, `client-side ID:`, deepCopiedCandidate.id, `db_id:`, deepCopiedCandidate.db_id, `createdAt:`, deepCopiedCandidate.createdAt);
          return deepCopiedCandidate;
        }) || []);
        
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
              dateOfBirth: data.dateOfBirth, // NOVO: Carregar data de nascimento
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
            dateOfBirth: data.dateOfBirth, // NOVO: Carregar data de nascimento
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
        setGestorTasks(gestorTasksData?.data || []); // Set gestor tasks
        setGestorTaskCompletions(gestorTaskCompletionsData?.data || []); // NOVO: Set gestor task completions
        setFinancialEntries(financialEntriesData?.data?.map((entry: any) => ({
          id: entry.id,
          db_id: entry.id,
          user_id: entry.user_id,
          entry_date: entry.entry_date,
          type: entry.type,
          description: entry.description,
          amount: parseFloat(entry.amount), // Ensure amount is a number
          created_at: entry.created_at,
        })) || []); // NOVO: Set financial entries
        setFormCadastros(formCadastrosData?.data || []); // NOVO: Set form cadastros
        setFormFiles(formFilesData?.data || []); // NOVO: Set form files
        
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

  // NOVO useEffect para Realtime Subscriptions
  useEffect(() => {
    if (!user || !crmOwnerUserId) return;

    // Realtime para candidates
    const candidatesChannel = supabase
        .channel('candidates_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates', filter: `user_id=eq.${crmOwnerUserId}` }, (payload) => {
            console.log('Candidate Change (Realtime):', payload);
            toast.info(`🔄 Candidato "${payload.new.data.name || payload.old.data.name}" atualizado em tempo real!`);
            
            // ⚠️ CORREÇÃO CRÍTICA: Garante que newCandidateData é uma cópia profunda do payload.new.data
            const rawPayloadData = payload.new.data as Candidate;
            const clientSideId = rawPayloadData.id || crypto.randomUUID(); // Fallback to new UUID if client-side ID is missing
            if (!rawPayloadData.id) {
              console.warn(`[Realtime: Candidate] Candidate with db_id "${payload.new.id}" is missing client-side 'id' in JSONB data. Generating new client-side ID: "${clientSideId}"`);
            }
            
            const newCandidateData: Candidate = {
                ...JSON.parse(JSON.stringify(rawPayloadData)), // Deep copy the entire JSONB 'data'
                id: clientSideId, // Ensure client-side ID is set
                db_id: payload.new.id, // Adiciona a PK do Supabase
                createdAt: payload.new.created_at, // ⚠️ CORREÇÃO: Usar created_at da linha do DB
                lastUpdatedAt: payload.new.last_updated_at, // ⚠️ CORREÇÃO: Usar last_updated_at da linha do DB
                // Explicitly ensure nested objects are deep copies if they exist
                interviewScores: JSON.parse(JSON.stringify(rawPayloadData.interviewScores || { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' })),
                checkedQuestions: JSON.parse(JSON.stringify(rawCandidateData.checkedQuestions || {})),
                checklistProgress: JSON.parse(JSON.stringify(rawCandidateData.checklistProgress || {})),
                consultantGoalsProgress: JSON.parse(JSON.stringify(rawCandidateData.consultantGoalsProgress || {})),
                feedbacks: JSON.parse(JSON.stringify(rawCandidateData.feedbacks || [])),
                data: JSON.parse(JSON.stringify(rawCandidateData.data || {})), // Ensure 'data' field itself is deep copied if it exists
            };
            console.log('[Realtime: Candidate] Deep copied newCandidateData.name:', newCandidateData.name, `client-side ID:`, newCandidateData.id, `db_id:`, newCandidateData.db_id, `createdAt:`, newCandidateData.createdAt);

            if (payload.eventType === 'INSERT') {
                setCandidates(prev => {
                    if (prev.some(c => c.db_id === newCandidateData.db_id)) {
                        console.log('Skipping insert, candidate already exists (db_id):', newCandidateData.db_id);
                        return prev;
                    }
                    if (prev.some(c => c.id === newCandidateData.id && !c.db_id)) {
                        console.log('Skipping insert, candidate already exists (client-side id):', newCandidateData.id);
                        return prev;
                    }
                    console.log('[Realtime: Candidate] Inserting candidate with name:', newCandidateData.name);
                    return [newCandidateData, ...prev];
                });
            } else if (payload.eventType === 'UPDATE') {
                setCandidates(prev => {
                    const updatedArray = prev.map(c => {
                        if (c.db_id === newCandidateData.db_id) {
                            console.log(`[Realtime: Candidate] Updating candidate from "${c.name}" to "${newCandidateData.name}"`);
                            return newCandidateData;
                        }
                        return c;
                    });
                    console.log('[Realtime: Candidate] Array after update (names):', updatedArray.map(c => c.name));
                    return updatedArray;
                });
            } else if (payload.eventType === 'DELETE') {
                setCandidates(prev => {
                    console.log('[Realtime: Candidate] Deleting candidate with name:', payload.old.data.name);
                    const filteredArray = prev.filter(c => c.db_id !== payload.old.id);
                    console.log('[Realtime: Candidate] Array after delete (names):', filteredArray.map(c => c.name));
                    return filteredArray;
                });
            }
        })
        .subscribe();

    // Realtime para crm_leads
    const leadsChannel = supabase
        .channel('crm_leads_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, (payload) => {
            console.log('CRM Lead Change (Realtime):', payload);
            toast.info(`🔄 Lead "${payload.new.name || payload.old.name}" atualizado em tempo real!`);
            const newLeadData: CrmLead = {
                id: payload.new.id,
                consultant_id: payload.new.consultant_id,
                stage_id: payload.new.stage_id,
                user_id: payload.new.user_id,
                name: payload.new.name,
                data: payload.new.data,
                created_at: payload.new.created_at,
                updated_at: payload.new.updated_at,
                created_by: payload.new.created_by,
                updated_by: payload.new.updated_by,
                proposalValue: payload.new.proposal_value,
                proposalClosingDate: payload.new.proposal_closing_date,
                soldCreditValue: payload.new.sold_credit_value,
                soldGroup: payload.new.sold_group,
                soldQuota: payload.new.sold_quota,
                saleDate: payload.new.sale_date,
            };

            if (payload.eventType === 'INSERT') {
                setCrmLeads(prev => [newLeadData, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                setCrmLeads(prev => prev.map(lead => lead.id === newLeadData.id ? newLeadData : lead));
            } else if (payload.eventType === 'DELETE') {
                setCrmLeads(prev => prev.filter(lead => lead.id !== payload.old.id));
            }
        })
        .subscribe();

    // Realtime para lead_tasks
    const tasksChannel = supabase
        .channel('lead_tasks_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_tasks' }, (payload) => {
            console.log('Lead Task Change (Realtime):', payload);
            toast.info(`📝 Tarefa "${payload.new.title || payload.old.title}" atualizada em tempo real!`);
            const newTaskData: LeadTask = {
                id: payload.new.id,
                lead_id: payload.new.lead_id,
                user_id: payload.new.user_id,
                title: payload.new.title,
                description: payload.new.description,
                due_date: payload.new.due_date,
                is_completed: payload.new.is_completed,
                completed_at: payload.new.completed_at,
                created_at: payload.new.created_at,
                type: payload.new.type,
                meeting_start_time: payload.new.meeting_start_time,
                meeting_end_time: payload.new.meeting_end_time,
                manager_id: payload.new.manager_id,
                manager_invitation_status: payload.new.manager_invitation_status,
            };

            if (payload.eventType === 'INSERT') {
                setLeadTasks(prev => [...prev, newTaskData]);
            } else if (payload.eventType === 'UPDATE') {
                setLeadTasks(prev => prev.map(task => task.id === newTaskData.id ? newTaskData : task));
            } else if (payload.eventType === 'DELETE') {
                setLeadTasks(prev => prev.filter(task => task.id !== payload.old.id));
            }
        })
        .subscribe();

    // Realtime para gestor_tasks
    const gestorTasksChannel = supabase
        .channel('gestor_tasks_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gestor_tasks' }, (payload) => {
            console.log('Gestor Task Change (Realtime):', payload);
            toast.info(`📋 Tarefa pessoal "${payload.new.title || payload.old.title}" atualizada em tempo real!`);
            const newGestorTaskData: GestorTask = {
                id: payload.new.id,
                user_id: payload.new.user_id,
                title: payload.new.title,
                description: payload.new.description,
                due_date: payload.new.due_date,
                is_completed: payload.new.is_completed,
                created_at: payload.new.created_at,
                recurrence_pattern: payload.new.recurrence_pattern, // NOVO: Incluir recurrence_pattern
            };

            if (payload.eventType === 'INSERT') {
                setGestorTasks(prev => [...prev, newGestorTaskData]);
            } else if (payload.eventType === 'UPDATE') {
                setGestorTasks(prev => prev.map(task => task.id === newGestorTaskData.id ? newGestorTaskData : task));
            } else if (payload.eventType === 'DELETE') {
                setGestorTasks(prev => prev.filter(task => task.id !== payload.old.id));
            }
        })
        .subscribe();

    // NOVO: Realtime para gestor_task_completions
    const gestorTaskCompletionsChannel = supabase
        .channel('gestor_task_completions_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gestor_task_completions' }, (payload) => {
            console.log('Gestor Task Completion Change (Realtime):', payload);
            toast.info(`✅ Conclusão de tarefa do gestor atualizada em tempo real!`);
            const newCompletionData: GestorTaskCompletion = {
                id: payload.new.id,
                gestor_task_id: payload.new.gestor_task_id,
                user_id: payload.new.user_id,
                date: payload.new.date,
                done: payload.new.done,
                updated_at: payload.new.updated_at,
            };

            if (payload.eventType === 'INSERT') {
                setGestorTaskCompletions(prev => [...prev, newCompletionData]);
            } else if (payload.eventType === 'UPDATE') {
                setGestorTaskCompletions(prev => prev.map(comp => comp.id === newCompletionData.id ? newCompletionData : comp));
            } else if (payload.eventType === 'DELETE') {
                setGestorTaskCompletions(prev => prev.filter(comp => comp.id !== payload.old.id));
            }
        })
        .subscribe();

    // NOVO: Realtime para financial_entries
    const financialEntriesChannel = supabase
        .channel('financial_entries_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_entries' }, (payload) => {
            console.log('Financial Entry Change (Realtime):', payload);
            toast.info(`💰 Entrada/Saída financeira atualizada em tempo real!`);
            const newEntryData: FinancialEntry = {
                id: payload.new.id,
                db_id: payload.new.id,
                user_id: payload.new.user_id,
                entry_date: payload.new.entry_date,
                type: payload.new.type,
                description: payload.new.description,
                amount: parseFloat(payload.new.amount),
                created_at: payload.new.created_at,
            };

            if (payload.eventType === 'INSERT') {
                setFinancialEntries(prev => [...prev, newEntryData]);
            } else if (payload.eventType === 'UPDATE') {
                setFinancialEntries(prev => prev.map(entry => entry.id === newEntryData.id ? newEntryData : entry));
            } else if (payload.eventType === 'DELETE') {
                setFinancialEntries(prev => prev.filter(entry => entry.id !== payload.old.id));
            }
        })
        .subscribe();

    // NOVO: Realtime para form_submissions
    const formCadastrosChannel = supabase
        .channel('form_submissions_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'form_submissions' }, (payload) => {
            console.log('Form Cadastro Change (Realtime):', payload);
            toast.info(`📄 Novo cadastro de formulário em tempo real!`);
            const newCadastroData: FormCadastro = {
                id: payload.new.id,
                user_id: payload.new.user_id,
                submission_date: payload.new.submission_date,
                data: payload.new.data,
                internal_notes: payload.new.internal_notes,
                is_complete: payload.new.is_complete,
            };

            if (payload.eventType === 'INSERT') {
                setFormCadastros(prev => [newCadastroData, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                setFormCadastros(prev => prev.map(sub => sub.id === newCadastroData.id ? newCadastroData : sub));
            } else if (payload.eventType === 'DELETE') {
                setFormCadastros(prev => prev.filter(sub => sub.id !== payload.old.id));
            }
        })
        .subscribe();

    // NOVO: Realtime para form_files
    const formFilesChannel = supabase
        .channel('form_files_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'form_files' }, (payload) => {
            console.log('Form File Change (Realtime):', payload);
            toast.info(`📎 Arquivo de formulário atualizado em tempo real!`);
            const newFileData: FormFile = {
                id: payload.new.id,
                submission_id: payload.new.submission_id,
                field_name: payload.new.field_name,
                file_name: payload.new.file_name,
                file_url: payload.new.file_url,
                uploaded_at: payload.new.uploaded_at,
            };

            if (payload.eventType === 'INSERT') {
                setFormFiles(prev => [...prev, newFileData]);
            } else if (payload.eventType === 'UPDATE') {
                setFormFiles(prev => prev.map(file => file.id === newFileData.id ? newFileData : file));
            } else if (payload.eventType === 'DELETE') {
                setFormFiles(prev => prev.filter(file => file.submission_id !== payload.old.submission_id)); // Corrigido para usar submission_id
            }
        })
        .subscribe();


    return () => {
        supabase.removeChannel(candidatesChannel);
        supabase.removeChannel(leadsChannel);
        supabase.removeChannel(tasksChannel);
        supabase.removeChannel(gestorTasksChannel);
        supabase.removeChannel(gestorTaskCompletionsChannel); // NOVO: Remover canal
        supabase.removeChannel(financialEntriesChannel); // NOVO: Remover canal
        supabase.removeChannel(formCadastrosChannel); // NOVO: Remover canal
        supabase.removeChannel(formFilesChannel); // NOVO: Remover canal
    };
  }, [user, crmOwnerUserId]); // Depende de user e crmOwnerUserId para re-inscrever se eles mudarem

  // NOVO: useEffect para recalcular notificações sempre que os dados relevantes mudarem
  useEffect(() => {
    calculateNotifications();
  }, [teamMembers, formCadastros, crmLeads, onboardingSessions, calculateNotifications]); // Dependências atualizadas

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const addCandidate = useCallback(async (candidate: Omit<Candidate, 'id' | 'createdAt' | 'db_id'>) => { 
    if (!user) throw new Error("Usuário não autenticado."); 
    
    // Generate client-side ID and createdAt if not provided
    const clientSideId = crypto.randomUUID(); // This is the client-side UUID
    const createdAt = new Date().toISOString();
    const lastUpdatedAt = new Date().toISOString();

    // ⚠️ APLICANDO CÓPIA PROFUNDA AQUI PARA GARANTIR INDEPENDÊNCIA DOS OBJETOS
    const newCandidateData: Candidate = { 
      ...JSON.parse(JSON.stringify(candidate)), // Deep copy do objeto base
      id: clientSideId, // Atribui o UUID gerado para o ID do cliente
      status: candidate.status || 'Triagem', 
      screeningStatus: candidate.screeningStatus || 'Pending Contact',
      createdAt: createdAt, 
      lastUpdatedAt: lastUpdatedAt, 
      // Garante que objetos aninhados sejam cópias profundas
      interviewScores: JSON.parse(JSON.stringify(candidate.interviewScores || { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' })),
      checkedQuestions: JSON.parse(JSON.stringify(candidate.checkedQuestions || {})),
      checklistProgress: JSON.parse(JSON.stringify(candidate.checklistProgress || {})),
      consultantGoalsProgress: JSON.parse(JSON.stringify(candidate.consultantGoalsProgress || {})),
      feedbacks: JSON.parse(JSON.stringify(candidate.feedbacks || [])),
      data: JSON.parse(JSON.stringify(candidate.data || {})), // Garante que o campo 'data' seja copiado profundamente
    };

    // Insere no Supabase. A coluna 'id' (chave primária) é auto-gerada.
    // Fornecemos apenas 'user_id', 'data' (que contém nosso objeto Candidate do lado do cliente), e 'last_updated_at'.
    const { data, error } = await supabase.from('candidates').insert({ 
      user_id: JOAO_GESTOR_AUTH_ID, 
      data: newCandidateData, // O objeto Candidate completo do lado do cliente vai para a coluna JSONB 'data'
      last_updated_at: newCandidateData.lastUpdatedAt 
    }).select('id, created_at, last_updated_at').single(); 
    
    if (error) { 
      console.error("Erro ao adicionar candidato no Supabase:", error); 
      toast.error("Erro ao adicionar candidato."); 
      throw error; 
    } 
    
    if (data) { 
      // Atualiza o estado local com o 'id' gerado pelo Supabase (db_id) e o 'created_at' real
      // ⚠️ CORREÇÃO: Adicionar o novo candidato no INÍCIO do array para que apareça no topo
      setCandidates(prev => [{ // Adiciona no início para que apareça no topo
        ...newCandidateData, 
        db_id: data.id, // Armazena a chave primária do Supabase aqui
        createdAt: data.created_at, // ⚠️ CORREÇÃO: Usar created_at da linha do DB
        lastUpdatedAt: data.last_updated_at 
      }, ...prev]); 
    } 
    return newCandidateData; // Retorna o objeto do lado do cliente
  }, [user]);
  const updateCandidate = useCallback(async (id: string, updates: Partial<Candidate>) => { 
    if (!user) throw new Error("Usuário não autenticado."); 
    
    // Log the ID being passed to updateCandidate
    console.log(`[updateCandidate] ID passed: "${id}"`);

    const c = candidates.find(c => c.id === id); 
    if (!c || !c.db_id) {
      console.error(`[updateCandidate] Candidate with client-side ID "${id}" not found or missing db_id.`);
      throw new Error("Candidato não encontrado ou ID do banco de dados ausente."); 
    }
    
    console.log(`[updateCandidate] Found candidate (original name): "${c.name}", client-side ID: "${c.id}", db_id: "${c.db_id}"`);
    console.log(`[updateCandidate] Updates object:`, updates);

    // 1. Create a deep copy of the *current* candidate object from state.
    const currentCandidateDeepCopy: Candidate = JSON.parse(JSON.stringify(c));

    // 2. Create a deep copy of the *updates* object.
    const updatesDeepCopy: Partial<Candidate> = JSON.parse(JSON.stringify(updates));

    // 3. Merge the deep-copied updates into the deep-copied current candidate.
    // This ensures that all nested objects are also new instances or merged correctly.
    const mergedCandidateData: Candidate = {
      ...currentCandidateDeepCopy,
      ...updatesDeepCopy,
      // Explicitly deep copy and merge nested objects if they are part of updates
      interviewScores: updatesDeepCopy.interviewScores 
        ? { ...currentCandidateDeepCopy.interviewScores, ...updatesDeepCopy.interviewScores } 
        : currentCandidateDeepCopy.interviewScores,
      checkedQuestions: updatesDeepCopy.checkedQuestions 
        ? { ...currentCandidateDeepCopy.checkedQuestions, ...updatesDeepCopy.checkedQuestions } 
        : currentCandidateDeepCopy.checkedQuestions,
      checklistProgress: updatesDeepCopy.checklistProgress 
        ? { ...currentCandidateDeepCopy.checklistProgress, ...updatesDeepCopy.checklistProgress } 
        : currentCandidateDeepCopy.checklistProgress,
      consultantGoalsProgress: updatesDeepCopy.consultantGoalsProgress 
        ? { ...currentCandidateDeepCopy.consultantGoalsProgress, ...updatesDeepCopy.consultantGoalsProgress } 
        : currentCandidateDeepCopy.consultantGoalsProgress,
      feedbacks: updatesDeepCopy.feedbacks 
        ? [...(currentCandidateDeepCopy.feedbacks || []), ...(updatesDeepCopy.feedbacks || [])] 
        : currentCandidateDeepCopy.feedbacks,
      data: updatesDeepCopy.data 
        ? { ...currentCandidateDeepCopy.data, ...updatesDeepCopy.data } 
        : currentCandidateDeepCopy.data,
      
      lastUpdatedAt: new Date().toISOString(),
    };
    
    console.log(`[updateCandidate] Merged updated candidate name (mergedCandidateData.name): "${mergedCandidateData.name}"`);

    // Remove top-level properties that are not part of the 'data' JSONB column
    // This object will be stored in the 'data' JSONB column in Supabase
    const finalDataForSupabase = JSON.parse(JSON.stringify(mergedCandidateData)); // Deep copy the merged object
    delete finalDataForSupabase.db_id; // This is the Supabase PK, not part of the JSONB 'data'
    delete finalDataForSupabase.createdAt; // This is the Supabase 'created_at' column, not part of JSONB 'data'
    delete finalDataForSupabase.lastUpdatedAt; // This is the Supabase 'last_updated_at' column, not part of JSONB 'data'

    const { error } = await supabase.from('candidates').update({ 
      data: finalDataForSupabase, 
      last_updated_at: mergedCandidateData.lastUpdatedAt 
    }).match({ id: c.db_id, user_id: JOAO_GESTOR_AUTH_ID }); 
    if (error) { console.error(error); toast.error("Erro ao atualizar candidato."); throw error; } 
    
    // Update local state with the fully merged and deep-copied object
    setCandidates(prev => prev.map(p => {
      // Log p.id for each item in the prev array
      console.log(`[updateCandidate:setCandidates] Comparing p.id: "${p.id}" with target id: "${id}"`);
      if (p.id === id) {
        console.log(`[updateCandidate:setCandidates] MATCH! Updating candidate from "${p.name}" to "${mergedCandidateData.name}"`);
        return { ...mergedCandidateData, db_id: c.db_id, createdAt: c.createdAt }; // Ensure db_id and createdAt are preserved for local state
      }
      return p;
    })); 
  }, [user, candidates]);
  const deleteCandidate = useCallback(async (id: string) => {
    if (!user) {
      toast.error("Usuário não autenticado.");
      throw new Error("Usuário não autenticado.");
    }
    const c = candidates.find(c => c.id === id);
    if (!c) {
      console.error(`[deleteCandidate] Candidato com client-side ID "${id}" não encontrado no estado local.`);
      toast.error("Candidato não encontrado no estado local.");
      throw new Error("Candidato não encontrado no estado local.");
    }
    if (!c.db_id) {
      console.error(`[deleteCandidate] Candidato "${c.name}" (client-side ID: "${c.id}") não possui db_id. Não é possível excluir do Supabase.`);
      toast.error("Candidato não possui ID do banco de dados.");
      throw new Error("Candidato não possui ID do banco de dados.");
    }

    // CRITICAL LOGGING: Verify the exact values being used in the delete query
    console.log(`[deleteCandidate] Tentando excluir candidato:`);
    console.log(`  Client-side ID (c.id): "${c.id}"`);
    console.log(`  Supabase DB_ID (c.db_id): "${c.db_id}"`);
    console.log(`  User ID (JOAO_GESTOR_AUTH_ID): "${JOAO_GESTOR_AUTH_ID}"`);

    if (!c.db_id || typeof c.db_id !== 'string' || c.db_id.length === 0) {
      console.error(`[deleteCandidate] c.db_id é inválido: "${c.db_id}"`);
      toast.error("Erro interno: ID do candidato para exclusão é inválido.");
      throw new Error("ID do candidato para exclusão é inválido.");
    }
    if (!JOAO_GESTOR_AUTH_ID || typeof JOAO_GESTOR_AUTH_ID !== 'string' || JOAO_GESTOR_AUTH_ID.length === 0) {
      console.error(`[deleteCandidate] JOAO_GESTOR_AUTH_ID é inválido: "${JOAO_GESTOR_AUTH_ID}"`);
      toast.error("Erro interno: ID do gestor para exclusão é inválido.");
      throw new Error("ID do gestor para exclusão é inválido.");
    }

    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', c.db_id) // Use .eq() for explicit matching
      .eq('user_id', JOAO_GESTOR_AUTH_ID); // And another .eq() for user_id

    if (error) {
      console.error(`[deleteCandidate] Erro ao excluir candidato "${c.name}" (DB_ID: "${c.db_id}"):`, error);
      toast.error("Erro ao excluir candidato.");
      throw error;
    }
    console.log(`[deleteCandidate] Candidato "${c.name}" (DB_ID: "${c.db_id}") excluído com sucesso.`);
    setCandidates(prev => prev.filter(p => p.id !== id));
  }, [user, candidates]);

  const addTeamMember = useCallback(async (member: Omit<TeamMember, 'id'> & { email: string }) => {
    if (!user) throw new Error("Usuário não autenticado.");
  
    let authUserId: string;
    let tempPassword = '';
    let wasExistingUser = false;
  
    if (member.email) {
      tempPassword = generateRandomPassword();
      
      const cleanedCpf = member.cpf ? member.cpf.replace(/\D/g, '') : '';
      const last4Cpf = cleanedCpf.length >= 4 ? cleanedCpf.slice(-4) : null;
      
      // ⚠️ NOVO: Verificação para garantir que supabase.functions.invoke é uma função
      if (!supabase.functions || typeof supabase.functions.invoke !== 'function') {
        console.error("[AppContext] Supabase functions client or invoke method is not available.");
        throw new Error("Serviço de funções Supabase não disponível.");
      }

      const { data, error: invokeError } = await supabase.functions.invoke('create-or-link-consultant', {
        body: {
          email: member.email,
          name: member.name,
          tempPassword: tempPassword,
          login: last4Cpf, // Pass the last 4 digits of CPF as login
        },
      });

      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);

      authUserId = data.authUserId;
      wasExistingUser = data.userExists;

      // Update or insert into public.profiles table (handled by handle_new_user trigger)
      // Update or insert into public.team_members table
      const { error: teamMemberUpsertError } = await supabase
        .from('team_members')
        .upsert({
          id: authUserId, // Use authUserId as the primary key for team_members
          user_id: JOAO_GESTOR_AUTH_ID, // Link to the gestor
          data: {
            id: authUserId, // Store authUserId inside JSONB data as well
            name: member.name,
            email: member.email,
            roles: member.roles,
            isActive: member.isActive,
            hasLogin: true,
            isLegacy: false,
            dateOfBirth: member.dateOfBirth,
          },
          cpf: cleanedCpf,
        }, { onConflict: 'id' }); // Conflict on 'id' (authUserId)

      if (teamMemberUpsertError) throw teamMemberUpsertError;

      // Refetch team members to ensure local state is consistent
      const { data: updatedTeamMembersData, error: fetchError } = await supabase
        .from('team_members')
        .select('id, data, cpf');
      if (fetchError) console.error("Error refetching team members:", fetchError);
      else {
        const normalized = updatedTeamMembersData.map(item => ({
          id: item.data.id,
          db_id: item.id,
          name: item.data.name,
          email: item.data.email,
          roles: Array.isArray(item.data.roles) ? item.data.roles : [item.data.role || 'Prévia'],
          isActive: item.data.isActive !== false,
          hasLogin: true,
          isLegacy: false,
          cpf: item.cpf,
          dateOfBirth: item.data.dateOfBirth,
        })) as TeamMember[];
        setTeamMembers(normalized);
      }

      return { success: true, member: { ...member, id: authUserId, hasLogin: true, tempPassword }, tempPassword, wasExistingUser };

    } else {
      throw new Error("E-mail é obrigatório para adicionar um membro da equipe.");
    }
  }, [user, JOAO_GESTOR_AUTH_ID]);
  const updateTeamMember = useCallback(async (id: string, updates: Partial<TeamMember>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const member = teamMembers.find(m => m.id === id);
    if (!member || !member.db_id) throw new Error("Membro da equipe não encontrado.");

    const updatedData = { ...member.data, ...updates };
    const cleanedCpf = updates.cpf ? updates.cpf.replace(/\D/g, '') : member.cpf;

    // If email is updated, and it's a user with login, update auth.users
    if (updates.email && member.hasLogin && updates.email !== member.email) {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(member.id, { email: updates.email });
      if (authUpdateError) {
        console.error("Error updating auth user email:", authUpdateError);
        throw authUpdateError;
      }
    }

    const { error } = await supabase
      .from('team_members')
      .update({ data: updatedData, cpf: cleanedCpf })
      .match({ id: member.db_id, user_id: JOAO_GESTOR_AUTH_ID });

    if (error) {
      console.error("Error updating team member:", error);
      toast.error("Erro ao atualizar membro da equipe.");
      throw error;
    }
    setTeamMembers(prev => prev.map(m => m.id === id ? { ...member, ...updates, data: updatedData, cpf: cleanedCpf } : m));
    return { success: true };
  }, [user, teamMembers]);
  const deleteTeamMember = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const member = teamMembers.find(m => m.id === id);
    if (!member || !member.db_id) throw new Error("Membro da equipe não encontrado.");

    // Delete auth user if they have a login
    if (member.hasLogin) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(member.id);
      if (authDeleteError) {
        console.error("Error deleting auth user:", authDeleteError);
        // Don't throw, try to delete from public.team_members anyway
      }
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .match({ id: member.db_id, user_id: JOAO_GESTOR_AUTH_ID });

    if (error) {
      console.error("Error deleting team member:", error);
      // toast.error("Erro ao remover membro da equipe."); // REMOVIDO PARA DEBUG
      throw error;
    }
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  }, [user, teamMembers]);

  const getCandidate = useCallback((id: string) => candidates.find(c => c.id === id), [candidates]);

  const toggleChecklistItem = useCallback(async (candidateId: string, itemId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) throw new Error("Candidato não encontrado.");

    const updatedProgress = JSON.parse(JSON.stringify(candidate.checklistProgress || {}));
    updatedProgress[itemId] = { ...updatedProgress[itemId], completed: !updatedProgress[itemId]?.completed };

    await updateCandidate(candidate.id, { checklistProgress: updatedProgress });
  }, [candidates, updateCandidate, user]);

  const setChecklistDueDate = useCallback(async (candidateId: string, itemId: string, dueDate: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) throw new Error("Candidato não encontrado.");

    const updatedProgress = JSON.parse(JSON.stringify(candidate.checklistProgress || {}));
    updatedProgress[itemId] = { ...updatedProgress[itemId], dueDate: dueDate || undefined };

    await updateCandidate(candidate.id, { checklistProgress: updatedProgress });
  }, [candidates, updateCandidate, user]);

  const toggleConsultantGoal = useCallback(async (candidateId: string, goalId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) throw new Error("Candidato não encontrado.");

    const updatedProgress = JSON.parse(JSON.stringify(candidate.consultantGoalsProgress || {}));
    updatedProgress[goalId] = !updatedProgress[goalId];

    await updateCandidate(candidate.id, { consultantGoalsProgress: updatedProgress });
  }, [candidates, updateCandidate, user]);

  const addChecklistItem = useCallback((stageId: string, label: string) => {
    setChecklistStructure(prev => prev.map(stage =>
      stage.id === stageId
        ? { ...stage, items: [...stage.items, { id: crypto.randomUUID(), label }] }
        : stage
    ));
    updateConfig({ checklistStructure });
  }, [checklistStructure, updateConfig]);

  const updateChecklistItem = useCallback((stageId: string, itemId: string, newLabel: string) => {
    setChecklistStructure(prev => prev.map(stage =>
      stage.id === stageId
        ? { ...stage, items: stage.items.map(item => item.id === itemId ? { ...item, label: newLabel } : item) }
        : stage
    ));
    updateConfig({ checklistStructure });
  }, [checklistStructure, updateConfig]);

  const deleteChecklistItem = useCallback((stageId: string, itemId: string) => {
    setChecklistStructure(prev => prev.map(stage =>
      stage.id === stageId
        ? { ...stage, items: stage.items.filter(item => item.id !== itemId) }
        : stage
    ));
    updateConfig({ checklistStructure });
  }, [checklistStructure, updateConfig]);

  const moveChecklistItem = useCallback((stageId: string, itemId: string, direction: 'up' | 'down') => {
    setChecklistStructure(prev => prev.map(stage => {
      if (stage.id === stageId) {
        const items = [...stage.items];
        const index = items.findIndex(item => item.id === itemId);
        if (index === -1) return stage;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= items.length) return stage;

        const [removed] = items.splice(index, 1);
        items.splice(newIndex, 0, removed);
        return { ...stage, items };
      }
      return stage;
    }));
    updateConfig({ checklistStructure });
  }, [checklistStructure, updateConfig]);

  const resetChecklistToDefault = useCallback(() => {
    setChecklistStructure(DEFAULT_STAGES);
    updateConfig({ checklistStructure: DEFAULT_STAGES });
  }, [updateConfig]);

  const addGoalItem = useCallback((stageId: string, label: string) => {
    setConsultantGoalsStructure(prev => prev.map(stage =>
      stage.id === stageId
        ? { ...stage, items: [...stage.items, { id: crypto.randomUUID(), label }] }
        : stage
    ));
    updateConfig({ consultantGoalsStructure });
  }, [consultantGoalsStructure, updateConfig]);

  const updateGoalItem = useCallback((stageId: string, itemId: string, newLabel: string) => {
    setConsultantGoalsStructure(prev => prev.map(stage =>
      stage.id === stageId
        ? { ...stage, items: stage.items.map(item => item.id === itemId ? { ...item, label: newLabel } : item) }
        : stage
    ));
    updateConfig({ consultantGoalsStructure });
  }, [consultantGoalsStructure, updateConfig]);

  const deleteGoalItem = useCallback((stageId: string, itemId: string) => {
    setConsultantGoalsStructure(prev => prev.map(stage =>
      stage.id === stageId
        ? { ...stage, items: stage.items.filter(item => item.id !== itemId) }
        : stage
    ));
    updateConfig({ consultantGoalsStructure });
  }, [consultantGoalsStructure, updateConfig]);

  const moveGoalItem = useCallback((stageId: string, itemId: string, direction: 'up' | 'down') => {
    setConsultantGoalsStructure(prev => prev.map(stage => {
      if (stage.id === stageId) {
        const items = [...stage.items];
        const index = items.findIndex(item => item.id === itemId);
        if (index === -1) return stage;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= items.length) return stage;

        const [removed] = items.splice(index, 1);
        items.splice(newIndex, 0, removed);
        return { ...stage, items };
      }
      return stage;
    }));
    updateConfig({ consultantGoalsStructure });
  }, [consultantGoalsStructure, updateConfig]);

  const resetGoalsToDefault = useCallback(() => {
    setConsultantGoalsStructure(DEFAULT_GOALS);
    updateConfig({ consultantGoalsStructure: DEFAULT_GOALS });
  }, [updateConfig]);

  const updateInterviewSection = useCallback((sectionId: string, updates: Partial<InterviewSection>) => {
    setInterviewStructure(prev => prev.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    ));
    updateConfig({ interviewStructure });
  }, [interviewStructure, updateConfig]);

  const addInterviewQuestion = useCallback((sectionId: string, text: string, points: number) => {
    setInterviewStructure(prev => prev.map(section =>
      section.id === sectionId
        ? { ...section, questions: [...section.questions, { id: crypto.randomUUID(), text, points }] }
        : section
    ));
    updateConfig({ interviewStructure });
  }, [interviewStructure, updateConfig]);

  const updateInterviewQuestion = useCallback((sectionId: string, questionId: string, updates: Partial<InterviewQuestion>) => {
    setInterviewStructure(prev => prev.map(section =>
      section.id === sectionId
        ? { ...section, questions: section.questions.map(q => q.id === questionId ? { ...q, ...updates } : q) }
        : section
    ));
    updateConfig({ interviewStructure });
  }, [interviewStructure, updateConfig]);

  const deleteInterviewQuestion = useCallback((sectionId: string, questionId: string) => {
    setInterviewStructure(prev => prev.map(section =>
      section.id === sectionId
        ? { ...section, questions: section.questions.filter(q => q.id !== questionId) }
        : section
    ));
    updateConfig({ interviewStructure });
  }, [interviewStructure, updateConfig]);

  const moveInterviewQuestion = useCallback((sectionId: string, questionId: string, direction: 'up' | 'down') => {
    setInterviewStructure(prev => prev.map(section => {
      if (section.id === sectionId) {
        const questions = [...section.questions];
        const index = questions.findIndex(q => q.id === questionId);
        if (index === -1) return section;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= questions.length) return section;

        const [removed] = questions.splice(index, 1);
        questions.splice(newIndex, 0, removed);
        return { ...section, questions };
      }
      return section;
    }));
    updateConfig({ interviewStructure });
  }, [interviewStructure, updateConfig]);

  const resetInterviewToDefault = useCallback(() => {
    setInterviewStructure(INITIAL_INTERVIEW_STRUCTURE);
    updateConfig({ interviewStructure: INITIAL_INTERVIEW_STRUCTURE });
  }, [updateConfig]);

  const saveTemplate = useCallback((itemId: string, updates: Partial<CommunicationTemplate>) => {
    setTemplates(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], id: itemId, label: updates.label || prev[itemId]?.label || '', ...updates }
    }));
    updateConfig({ templates });
  }, [templates, updateConfig]);

  const addOrigin = useCallback((newOrigin: string) => {
    setOrigins(prev => {
      const updated = [...prev, newOrigin];
      updateConfig({ origins: updated });
      return updated;
    });
  }, [updateConfig]);

  const deleteOrigin = useCallback((originToDelete: string) => {
    setOrigins(prev => {
      const updated = prev.filter(o => o !== originToDelete);
      updateConfig({ origins: updated });
      return updated;
    });
  }, [updateConfig]);

  const resetOriginsToDefault = useCallback(() => {
    setOrigins(DEFAULT_APP_CONFIG_DATA.origins);
    updateConfig({ origins: DEFAULT_APP_CONFIG_DATA.origins });
  }, [updateConfig]);

  const addPV = useCallback((newPV: string) => {
    setPvs(prev => {
      const updated = [...prev, newPV];
      updateConfig({ pvs: updated });
      return updated;
    });
  }, [updateConfig]);

  const addCommission = useCallback(async (commission: Omit<Commission, 'id' | 'db_id' | 'criado_em'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const clientSideId = crypto.randomUUID();
    const tempCommission = { ...commission, id: `temp_${clientSideId}`, _synced: false };
    setCommissions(prev => [tempCommission, ...prev]);

    try {
      const payload = { user_id: JOAO_GESTOR_AUTH_ID, data: commission };
      const { data, error } = await supabase.from('commissions').insert(payload).select('id', 'created_at').maybeSingle();
      if (error) throw error;

      setCommissions(prev => prev.map(c => c.id === tempCommission.id ? { ...c, id: c.id.replace('temp_', ''), db_id: data.id, criado_em: data.created_at, _synced: true } : c));
      return { success: true };
    } catch (error: any) {
      console.error("Failed to add commission to Supabase:", error);
      toast.error("Erro ao salvar comissão. Tentando novamente em segundo plano.");
      const pendingCommissions = JSON.parse(localStorage.getItem('pending_commissions') || '[]');
      localStorage.setItem('pending_commissions', JSON.stringify([...pendingCommissions, { ...commission, _id: clientSideId, _timestamp: new Date().toISOString(), _retryCount: 0 }]));
      setCommissions(prev => prev.filter(c => c.id !== tempCommission.id)); // Remove temp commission if it fails
      throw error;
    }
  }, [user]);

  const updateCommission = useCallback(async (id: string, updates: Partial<Commission>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const commission = commissions.find(c => c.id === id);
    if (!commission || !commission.db_id) throw new Error("Comissão não encontrada.");

    const updated = { ...commission, ...updates };
    const { db_id, criado_em, _synced, ...dataToUpdate } = updated;

    const { error } = await supabase.from('commissions').update({ data: dataToUpdate }).match({ id: commission.db_id, user_id: JOAO_GESTOR_AUTH_ID });
    if (error) { console.error(error); toast.error("Erro ao atualizar comissão."); throw error; }
    setCommissions(prev => prev.map(c => c.id === id ? updated : c));
  }, [user, commissions]);

  const deleteCommission = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const commission = commissions.find(c => c.id === id);
    if (!commission || !commission.db_id) throw new Error("Comissão não encontrada.");

    const { error } = await supabase.from('commissions').delete().match({ id: commission.db_id, user_id: JOAO_GESTOR_AUTH_ID });
    if (error) { console.error(error); toast.error("Erro ao excluir comissão."); throw error; }
    setCommissions(prev => prev.filter(c => c.id !== id));
  }, [user, commissions]);

  const addCutoffPeriod = useCallback(async (period: Omit<CutoffPeriod, 'id' | 'db_id'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const clientSideId = crypto.randomUUID();
    const newPeriod = { ...period, id: clientSideId };
    setCutoffPeriods(prev => [...prev, newPeriod]);

    const { data, error } = await supabase.from('cutoff_periods').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: newPeriod }).select('id').single();
    if (error) { console.error(error); toast.error("Erro ao adicionar período de corte."); throw error; }
    setCutoffPeriods(prev => prev.map(p => p.id === clientSideId ? { ...p, db_id: data.id } : p));
  }, [user]);

  const updateCutoffPeriod = useCallback(async (id: string, updates: Partial<CutoffPeriod>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const period = cutoffPeriods.find(p => p.id === id);
    if (!period || !period.db_id) throw new Error("Período de corte não encontrado.");

    const updated = { ...period, ...updates };
    const { db_id, ...dataToUpdate } = updated;

    const { error } = await supabase.from('cutoff_periods').update({ data: dataToUpdate }).match({ id: period.db_id, user_id: JOAO_GESTOR_AUTH_ID });
    if (error) { console.error(error); toast.error("Erro ao atualizar período de corte."); throw error; }
    setCutoffPeriods(prev => prev.map(p => p.id === id ? updated : p));
  }, [user, cutoffPeriods]);

  const deleteCutoffPeriod = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const period = cutoffPeriods.find(p => p.id === id);
    if (!period || !period.db_id) throw new Error("Período de corte não encontrado.");

    const { error } = await supabase.from('cutoff_periods').delete().match({ id: period.db_id, user_id: JOAO_GESTOR_AUTH_ID });
    if (error) throw error;
    setCutoffPeriods(prev => prev.filter(p => p.id !== id));
  }, [user, cutoffPeriods]);

  const updateInstallmentStatus = useCallback(async (commissionId: string, installmentNumber: number, newStatus: InstallmentStatus, paidDate?: string, saleType?: 'Imóvel' | 'Veículo') => {
    if (!user) throw new Error("Usuário não autenticado.");
    const commission = commissions.find(c => c.id === commissionId);
    if (!commission || !commission.db_id) throw new Error("Comissão não encontrada.");

    const updatedInstallmentDetails = { ...commission.installmentDetails };
    let competenceMonth: string | undefined;

    if (newStatus === 'Pago' && paidDate) {
      competenceMonth = calculateCompetenceMonth(paidDate);
      updatedInstallmentDetails[installmentNumber.toString()] = { status: newStatus, paidDate, competenceMonth };
    } else {
      updatedInstallmentDetails[installmentNumber.toString()] = { status: newStatus };
    }

    const updatedCommission = {
      ...commission,
      installmentDetails: updatedInstallmentDetails,
      status: getOverallStatus(updatedInstallmentDetails),
    };

    const { db_id, criado_em, _synced, ...dataToUpdate } = updatedCommission;

    const { error } = await supabase.from('commissions').update({ data: dataToUpdate }).match({ id: commission.db_id, user_id: JOAO_GESTOR_AUTH_ID });
    if (error) { console.error(error); toast.error("Erro ao atualizar status da parcela."); throw error; }
    setCommissions(prev => prev.map(c => c.id === commissionId ? updatedCommission : c));
  }, [user, commissions, calculateCompetenceMonth]);

  const addOnlineOnboardingSession = useCallback(async (consultantName: string) => {
    if (!user) throw new Error("Usuário não autenticado.");

    const { data: sessionData, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .insert({ user_id: JOAO_GESTOR_AUTH_ID, consultant_name: consultantName })
      .select('id, created_at')
      .single();

    if (sessionError) throw sessionError;

    const newSessionId = sessionData.id;
    const videosToInsert = onboardingTemplateVideos.map(video => ({
      session_id: newSessionId,
      title: video.title,
      video_url: video.video_url,
      order: video.order,
      is_completed: false,
    }));

    const { data: insertedVideos, error: videosError } = await supabase
      .from('onboarding_videos')
      .insert(videosToInsert)
      .select('*');

    if (videosError) throw videosError;

    const newSession: OnboardingSession = {
      id: newSessionId,
      user_id: JOAO_GESTOR_AUTH_ID,
      consultant_name: consultantName,
      created_at: sessionData.created_at,
      videos: insertedVideos || [],
    };

    setOnboardingSessions(prev => [...prev, newSession]);
  }, [user, onboardingTemplateVideos]);

  const deleteOnlineOnboardingSession = useCallback(async (sessionId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");

    // Deleta os vídeos primeiro (ON DELETE CASCADE no DB cuidaria disso, mas é bom ser explícito)
    await supabase.from('onboarding_videos').delete().eq('session_id', sessionId);

    const { error } = await supabase
      .from('onboarding_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', JOAO_GESTOR_AUTH_ID);

    if (error) throw error;

    setOnboardingSessions(prev => prev.filter(session => session.id !== sessionId));
  }, [user]);

  const addVideoToTemplate = useCallback(async (title: string, video_url: string) => {
    if (!user) throw new Error("Usuário não autenticado.");

    const newOrder = onboardingTemplateVideos.length > 0
      ? Math.max(...onboardingTemplateVideos.map(v => v.order)) + 1
      : 0;

    const { data, error } = await supabase
      .from('onboarding_video_templates')
      .insert({ user_id: JOAO_GESTOR_AUTH_ID, title, video_url, order: newOrder })
      .select('*')
      .single();

    if (error) throw error;

    setOnboardingTemplateVideos(prev => [...prev, data]);
  }, [user, onboardingTemplateVideos]);

  const deleteVideoFromTemplate = useCallback(async (videoId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");

    const { error } = await supabase
      .from('onboarding_video_templates')
      .delete()
      .eq('id', videoId)
      .eq('user_id', JOAO_GESTOR_AUTH_ID);

    if (error) throw error;

    setOnboardingTemplateVideos(prev => prev.filter(video => video.id !== videoId));
  }, [user]);

  // CRM Functions
  const addCrmPipeline = useCallback(async (name: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('crm_pipelines').insert({ user_id: JOAO_GESTOR_AUTH_ID, name, is_active: true }).select('*').single();
    if (error) throw error;
    setCrmPipelines(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateCrmPipeline = useCallback(async (id: string, updates: Partial<CrmPipeline>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('crm_pipelines').update(updates).eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID).select('*').single();
    if (error) throw error;
    setCrmPipelines(prev => prev.map(p => p.id === id ? data : p));
    return data;
  }, [user]);

  const deleteCrmPipeline = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('crm_pipelines').delete().eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) throw error;
    setCrmPipelines(prev => prev.filter(p => p.id !== id));
    setCrmStages(prev => prev.filter(s => s.pipeline_id !== id)); // Also remove associated stages
    setCrmLeads(prev => prev.filter(l => l.user_id !== id)); // Also remove associated leads
  }, [user]);

  const addCrmStage = useCallback(async (stage: Omit<CrmStage, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('crm_stages').insert({ user_id: JOAO_GESTOR_AUTH_ID, ...stage }).select('*').single();
    if (error) throw error;
    setCrmStages(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateCrmStage = useCallback(async (id: string, updates: Partial<CrmStage>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('crm_stages').update(updates).eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID).select('*').single();
    if (error) throw error;
    setCrmStages(prev => prev.map(s => s.id === id ? data : s));
    return data;
  }, [user]);

  const updateCrmStageOrder = useCallback(async (orderedStages: CrmStage[]) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const updates = orderedStages.map((stage, index) => ({
      id: stage.id,
      order_index: index,
    }));
    const { error } = await supabase.from('crm_stages').upsert(updates, { onConflict: 'id' });
    if (error) throw error;
    setCrmStages(orderedStages.map((stage, index) => ({ ...stage, order_index: index })));
  }, [user]);

  const deleteCrmStage = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    // First, update leads that are in this stage to null or a default stage
    await supabase.from('crm_leads').update({ stage_id: null }).eq('stage_id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);

    const { error } = await supabase.from('crm_stages').delete().eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) throw error;
    setCrmStages(prev => prev.filter(s => s.id !== id));
    setCrmLeads(prev => prev.map(l => l.stage_id === id ? { ...l, stage_id: null } : l));
  }, [user]);

  const addCrmField = useCallback(async (field: Omit<CrmField, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('crm_fields').insert({ user_id: JOAO_GESTOR_AUTH_ID, ...field }).select('*').single();
    if (error) throw error;
    setCrmFields(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateCrmField = useCallback(async (id: string, updates: Partial<CrmField>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('crm_fields').update(updates).eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID).select('*').single();
    if (error) throw error;
    setCrmFields(prev => prev.map(f => f.id === id ? data : f));
    return data;
  }, [user]);

  const addCrmLead = useCallback(async (lead: Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'stage_id'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    
    // Find the first active stage in the active pipeline to assign to new leads
    const activePipeline = crmPipelines.find(p => p.is_active);
    const firstStage = crmStages.find(s => s.pipeline_id === activePipeline?.id && s.is_active);

    if (!firstStage) {
      throw new Error("Nenhuma etapa ativa encontrada no pipeline. Por favor, configure as etapas do CRM.");
    }

    const newLeadData = {
      ...lead,
      user_id: JOAO_GESTOR_AUTH_ID,
      stage_id: firstStage.id, // Assign to the first active stage
      created_by: user.id,
      updated_by: user.id,
    };

    const { data, error } = await supabase.from('crm_leads').insert(newLeadData).select('*').single();
    if (error) throw error;
    setCrmLeads(prev => [data, ...prev]); // Add new lead to the beginning of the list
    return data;
  }, [user, crmPipelines, crmStages]);

  const updateCrmLead = useCallback(async (id: string, updates: Partial<CrmLead>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const lead = crmLeads.find(l => l.id === id);
    if (!lead) throw new Error("Lead não encontrado.");

    const updatedData = {
      ...lead,
      ...updates,
      data: { ...lead.data, ...updates.data }, // Merge nested data object
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Explicitly map camelCase to snake_case for top-level columns
    const updatedDataForDb: any = { ...updatedData };
    if (updates.proposalValue !== undefined) {
      updatedDataForDb.proposal_value = updates.proposalValue;
      delete updatedDataForDb.proposalValue;
    }
    if (updates.proposalClosingDate !== undefined) {
      updatedDataForDb.proposal_closing_date = updates.proposalClosingDate;
      delete updatedDataForDb.proposalClosingDate;
    }
    if (updates.soldCreditValue !== undefined) {
      updatedDataForDb.sold_credit_value = updates.soldCreditValue;
      delete updatedDataForDb.soldCreditValue;
    }
    if (updates.soldGroup !== undefined) {
      updatedDataForDb.sold_group = updates.soldGroup;
      delete updatedDataForDb.soldGroup;
    }
    if (updates.soldQuota !== undefined) {
      updatedDataForDb.sold_quota = updates.soldQuota;
      delete updatedDataForDb.soldQuota;
    }
    if (updates.saleDate !== undefined) {
      updatedDataForDb.sale_date = updates.saleDate;
      delete updatedDataForDb.saleDate;
    }

    const { error } = await supabase.from('crm_leads').update(updatedDataForDb).eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) throw error;
    setCrmLeads(prev => prev.map(l => l.id === id ? updatedData : l));
    return updatedData;
  }, [user, crmLeads]);

  const updateCrmLeadStage = useCallback(async (leadId: string, newStageId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const lead = crmLeads.find(l => l.id === leadId);
    if (!lead) throw new Error("Lead não encontrado.");

    const updatedLead = { ...lead, stage_id: newStageId, updated_by: user.id, updated_at: new Date().toISOString() };

    // Explicitly map camelCase to snake_case for top-level columns
    const updatedDataForDb: any = { ...updatedLead };
    if (updatedLead.proposalValue !== undefined) {
      updatedDataForDb.proposal_value = updatedLead.proposalValue;
      delete updatedDataForDb.proposalValue;
    }
    if (updatedLead.proposalClosingDate !== undefined) {
      updatedDataForDb.proposal_closing_date = updatedLead.proposalClosingDate;
      delete updatedDataForDb.proposalClosingDate;
    }
    if (updatedLead.soldCreditValue !== undefined) {
      updatedDataForDb.sold_credit_value = updatedLead.soldCreditValue;
      delete updatedDataForDb.soldCreditValue;
    }
    if (updatedLead.soldGroup !== undefined) {
      updatedDataForDb.sold_group = updatedLead.soldGroup;
      delete updatedDataForDb.soldGroup;
    }
    if (updatedLead.soldQuota !== undefined) {
      updatedDataForDb.sold_quota = updatedLead.soldQuota;
      delete updatedDataForDb.soldQuota;
    }
    if (updatedLead.saleDate !== undefined) {
      updatedDataForDb.sale_date = updatedLead.saleDate;
      delete updatedDataForDb.saleDate;
    }

    const { error } = await supabase.from('crm_leads').update(updatedDataForDb).eq('id', leadId).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) throw error;
    setCrmLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
  }, [user, crmLeads]);

  const deleteCrmLead = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('crm_leads').delete().eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) throw error;
    setCrmLeads(prev => prev.filter(l => l.id !== id));
  }, [user]);

  // Daily Checklist Functions
  const addDailyChecklist = useCallback(async (title: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('daily_checklists').insert({ user_id: JOAO_GESTOR_AUTH_ID, title, is_active: true }).select('*').single();
    if (error) throw error;
    setDailyChecklists(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateDailyChecklist = useCallback(async (id: string, updates: Partial<DailyChecklist>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('daily_checklists').update(updates).eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID).select('*').single();
    if (error) throw error;
    setDailyChecklists(prev => prev.map(c => c.id === id ? data : c));
    return data;
  }, [user]);

  const deleteDailyChecklist = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    // Deleta itens e atribuições via CASCADE no DB
    const { error } = await supabase.from('daily_checklists').delete().eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) throw error;
    setDailyChecklists(prev => prev.filter(c => c.id !== id));
    setDailyChecklistItems(prev => prev.filter(item => item.daily_checklist_id !== id));
    setDailyChecklistAssignments(prev => prev.filter(assignment => assignment.daily_checklist_id !== id));
    setDailyChecklistCompletions(prev => prev.filter(completion => {
      const item = dailyChecklistItems.find(i => i.id === completion.daily_checklist_item_id);
      return item?.daily_checklist_id !== id;
    }));
  }, [user, dailyChecklistItems]);

  const addDailyChecklistItem = useCallback(async (daily_checklist_id: string, text: string, order_index: number, resource?: DailyChecklistItemResource, file?: File) => {
    if (!user) throw new Error("Usuário não autenticado.");

    let resourceContent = resource?.content;
    let resourceName = resource?.name;

    if (file) {
      const filePath = `daily_checklist_resources/${daily_checklist_id}/${crypto.randomUUID()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app_resources')
        .upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('app_resources').getPublicUrl(filePath);
      resourceContent = publicUrlData.publicUrl;
      resourceName = file.name;
    }

    const finalResource = resource ? { ...resource, content: resourceContent, name: resourceName } : undefined;

    const { data, error } = await supabase.from('daily_checklist_items').insert({ daily_checklist_id, text, order_index, is_active: true, resource: finalResource }).select('*').single();
    if (error) throw error;
    setDailyChecklistItems(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateDailyChecklistItem = useCallback(async (id: string, updates: Partial<DailyChecklistItem>, file?: File) => {
    if (!user) throw new Error("Usuário não autenticado.");

    let resourceContent = updates.resource?.content;
    let resourceName = updates.resource?.name;

    if (file) {
      const item = dailyChecklistItems.find(i => i.id === id);
      if (!item) throw new Error("Item do checklist não encontrado.");

      // Delete old file if it exists and is being replaced
      if (item.resource?.content && (item.resource.type === 'image' || item.resource.type === 'pdf' || item.resource.type === 'audio')) {
        const oldFilePath = item.resource.content.split('app_resources/')[1];
        if (oldFilePath) {
          await supabase.storage.from('app_resources').remove([oldFilePath]);
        }
      }

      const filePath = `daily_checklist_resources/${item.daily_checklist_id}/${crypto.randomUUID()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app_resources')
        .upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('app_resources').getPublicUrl(filePath);
      resourceContent = publicUrlData.publicUrl;
      resourceName = file.name;
    }

    const finalResource = updates.resource ? { ...updates.resource, content: resourceContent, name: resourceName } : undefined;

    const { data, error } = await supabase.from('daily_checklist_items').update({ ...updates, resource: finalResource }).eq('id', id).select('*').single();
    if (error) throw error;
    setDailyChecklistItems(prev => prev.map(item => item.id === id ? data : item));
    return data;
  }, [user, dailyChecklistItems]);

  const deleteDailyChecklistItem = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const item = dailyChecklistItems.find(i => i.id === id);
    if (!item) throw new Error("Item do checklist não encontrado.");

    // Delete associated file from storage
    if (item.resource?.content && (item.resource.type === 'image' || item.resource.type === 'pdf' || item.resource.type === 'audio')) {
      const filePath = item.resource.content.split('app_resources/')[1];
      if (filePath) {
        await supabase.storage.from('app_resources').remove([filePath]);
      }
    }

    const { error } = await supabase.from('daily_checklist_items').delete().eq('id', id);
    if (error) throw error;
    setDailyChecklistItems(prev => prev.filter(item => item.id !== id));
    setDailyChecklistCompletions(prev => prev.filter(completion => completion.daily_checklist_item_id !== id));
  }, [user, dailyChecklistItems]);

  const moveDailyChecklistItem = useCallback(async (checklistId: string, itemId: string, direction: 'up' | 'down') => {
    if (!user) throw new Error("Usuário não autenticado.");
    const items = dailyChecklistItems.filter(item => item.daily_checklist_id === checklistId).sort((a, b) => a.order_index - b.order_index);
    const index = items.findIndex(item => item.id === itemId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const [removed] = items.splice(index, 1);
    items.splice(newIndex, 0, removed);

    const updates = items.map((item, idx) => ({ id: item.id, order_index: idx }));
    const { error } = await supabase.from('daily_checklist_items').upsert(updates, { onConflict: 'id' });
    if (error) throw error;
    setDailyChecklistItems(prev => prev.map(item => {
      const updated = updates.find(u => u.id === item.id);
      return updated ? { ...item, order_index: updated.order_index } : item;
    }).sort((a, b) => a.order_index - b.order_index));
  }, [user, dailyChecklistItems]);

  const assignDailyChecklistToConsultant = useCallback(async (daily_checklist_id: string, consultant_id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('daily_checklist_assignments').insert({ daily_checklist_id, consultant_id }).select('*').single();
    if (error) throw error;
    setDailyChecklistAssignments(prev => [...prev, data]);
    return data;
  }, [user]);

  const unassignDailyChecklistFromConsultant = useCallback(async (daily_checklist_id: string, consultant_id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('daily_checklist_assignments').delete().match({ daily_checklist_id, consultant_id });
    if (error) throw error;
    setDailyChecklistAssignments(prev => prev.filter(a => !(a.daily_checklist_id === daily_checklist_id && a.consultant_id === consultant_id)));
  }, [user]);

  const toggleDailyChecklistCompletion = useCallback(async (daily_checklist_item_id: string, date: string, done: boolean, consultant_id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");

    const existingCompletion = dailyChecklistCompletions.find(c =>
      c.daily_checklist_item_id === daily_checklist_item_id &&
      c.date === date &&
      c.consultant_id === consultant_id
    );

    if (existingCompletion) {
      const { data, error } = await supabase.from('daily_checklist_completions').update({ done, updated_at: new Date().toISOString() }).eq('id', existingCompletion.id).select('*').single();
      if (error) throw error;
      setDailyChecklistCompletions(prev => prev.map(c => c.id === existingCompletion.id ? data : c));
    } else {
      const { data, error } = await supabase.from('daily_checklist_completions').insert({ daily_checklist_item_id, user_id: consultant_id, date, done }).select('*').single();
      if (error) throw error;
      setDailyChecklistCompletions(prev => [...prev, data]);
    }
  }, [user, dailyChecklistCompletions]);

  // Weekly Target Functions
  const addWeeklyTarget = useCallback(async (target: Omit<WeeklyTarget, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('weekly_targets').insert({ user_id: JOAO_GESTOR_AUTH_ID, ...target }).select('*').single();
    if (error) throw error;
    setWeeklyTargets(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateWeeklyTarget = useCallback(async (id: string, updates: Partial<WeeklyTarget>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('weekly_targets').update(updates).eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID).select('*').single();
    if (error) throw error;
    setWeeklyTargets(prev => prev.map(t => t.id === id ? data : t));
    return data;
  }, [user]);

  const deleteWeeklyTarget = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('weekly_targets').delete().eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) throw error;
    setWeeklyTargets(prev => prev.filter(t => t.id !== id));
    setWeeklyTargetItems(prev => prev.filter(item => item.weekly_target_id !== id));
    setWeeklyTargetAssignments(prev => prev.filter(assignment => assignment.weekly_target_id !== id));
  }, [user]);

  const addWeeklyTargetItem = useCallback(async (item: Omit<WeeklyTargetItem, 'id' | 'created_at'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('weekly_target_items').insert(item).select('*').single();
    if (error) throw error;
    setWeeklyTargetItems(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateWeeklyTargetItem = useCallback(async (id: string, updates: Partial<WeeklyTargetItem>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('weekly_target_items').update(updates).eq('id', id).select('*').single();
    if (error) throw error;
    setWeeklyTargetItems(prev => prev.map(item => item.id === id ? data : item));
    return data;
  }, [user]);

  const deleteWeeklyTargetItem = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('weekly_target_items').delete().eq('id', id);
    if (error) throw error;
    setWeeklyTargetItems(prev => prev.filter(item => item.id !== id));
  }, [user]);

  const updateWeeklyTargetItemOrder = useCallback(async (orderedItems: WeeklyTargetItem[]) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const updates = orderedItems.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));
    const { error } = await supabase.from('weekly_target_items').upsert(updates, { onConflict: 'id' });
    if (error) throw error;
    setWeeklyTargetItems(orderedItems.map((item, index) => ({ ...item, order_index: index })));
  }, [user]);

  const assignWeeklyTargetToConsultant = useCallback(async (weekly_target_id: string, consultant_id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('weekly_target_assignments').insert({ weekly_target_id, consultant_id }).select('*').single();
    if (error) throw error;
    setWeeklyTargetAssignments(prev => [...prev, data]);
    return data;
  }, [user]);

  const unassignWeeklyTargetFromConsultant = useCallback(async (weekly_target_id: string, consultant_id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('weekly_target_assignments').delete().match({ weekly_target_id, consultant_id });
    if (error) throw error;
    setWeeklyTargetAssignments(prev => prev.filter(a => !(a.weekly_target_id === weekly_target_id && a.consultant_id === consultant_id)));
  }, [user]);

  const addMetricLog = useCallback(async (log: Omit<MetricLog, 'id' | 'created_at'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('metric_logs').insert(log).select('*').single();
    if (error) throw error;
    setMetricLogs(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateMetricLog = useCallback(async (id: string, updates: Partial<MetricLog>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('metric_logs').update(updates).eq('id', id).select('*').single();
    if (error) throw error;
    setMetricLogs(prev => prev.map(log => log.id === id ? data : log));
    return data;
  }, [user]);

  const deleteMetricLog = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('metric_logs').delete().eq('id', id);
    if (error) throw error;
    setMetricLogs(prev => prev.filter(log => log.id !== id));
  }, [user]);

  // Support Materials V2 Functions
  const addSupportMaterialV2 = useCallback(async (material: Omit<SupportMaterialV2, 'id' | 'user_id' | 'created_at'>, file?: File) => {
    if (!user) throw new Error("Usuário não autenticado.");

    let content = material.content;
    if (file) {
      const filePath = `support_materials/${crypto.randomUUID()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app_resources')
        .upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('app_resources').getPublicUrl(filePath);
      content = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase.from('support_materials_v2').insert({ user_id: JOAO_GESTOR_AUTH_ID, ...material, content }).select('*').single();
    if (error) throw error;
    setSupportMaterialsV2(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateSupportMaterialV2 = useCallback(async (id: string, updates: Partial<SupportMaterialV2>, file?: File) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const existingMaterial = supportMaterialsV2.find(m => m.id === id);
    if (!existingMaterial) throw new Error("Material de apoio não encontrado.");

    let content = updates.content || existingMaterial.content;
    if (file) {
      // Delete old file if it exists and is being replaced
      if (existingMaterial.content_type !== 'link' && existingMaterial.content_type !== 'text' && existingMaterial.content) {
        const oldFilePath = existingMaterial.content.split('app_resources/')[1];
        if (oldFilePath) {
          await supabase.storage.from('app_resources').remove([oldFilePath]);
        }
      }

      const filePath = `support_materials/${crypto.randomUUID()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app_resources')
        .upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('app_resources').getPublicUrl(filePath);
      content = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase.from('support_materials_v2').update({ ...updates, content }).eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID).select('*').single();
    if (error) throw error;
    setSupportMaterialsV2(prev => prev.map(m => m.id === id ? data : m));
    return data;
  }, [user, supportMaterialsV2]);

  const deleteSupportMaterialV2 = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const material = supportMaterialsV2.find(m => m.id === id);
    if (!material) throw new Error("Material de apoio não encontrado.");

    // Delete associated file from storage
    if (material.content_type !== 'link' && material.content_type !== 'text' && material.content) {
      const filePath = material.content.split('app_resources/')[1];
      if (filePath) {
        await supabase.storage.from('app_resources').remove([filePath]);
      }
    }

    const { error } = await supabase.from('support_materials_v2').delete().eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) throw error;
    setSupportMaterialsV2(prev => prev.filter(m => m.id !== id));
    setSupportMaterialAssignments(prev => prev.filter(a => a.material_id !== id));
  }, [user, supportMaterialsV2]);

  const assignSupportMaterialToConsultant = useCallback(async (material_id: string, consultant_id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('support_material_assignments').insert({ material_id, consultant_id }).select('*').single();
    if (error) throw error;
    setSupportMaterialAssignments(prev => [...prev, data]);
    return data;
  }, [user]);

  const unassignSupportMaterialFromConsultant = useCallback(async (material_id: string, consultant_id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('support_material_assignments').delete().match({ material_id, consultant_id });
    if (error) throw error;
    setSupportMaterialAssignments(prev => prev.filter(a => !(a.material_id === material_id && a.consultant_id === consultant_id)));
  }, [user]);

  // Lead Task Functions
  const addLeadTask = useCallback(async (task: Omit<LeadTask, 'id' | 'user_id' | 'created_at' | 'completed_at'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('lead_tasks').insert({ user_id: user.id, ...task }).select('*').single();
    if (error) throw error;
    setLeadTasks(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateLeadTask = useCallback(async (id: string, updates: Partial<LeadTask>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('lead_tasks').update(updates).eq('id', id).select('*').single();
    if (error) throw error;
    setLeadTasks(prev => prev.map(task => task.id === id ? data : task));
    return data;
  }, [user]);

  const deleteLeadTask = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('lead_tasks').delete().eq('id', id);
    if (error) throw error;
    setLeadTasks(prev => prev.filter(task => task.id !== id));
  }, [user]);

  const toggleLeadTaskCompletion = useCallback(async (id: string, is_completed: boolean) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const completed_at = is_completed ? new Date().toISOString() : null;
    const { data, error } = await supabase.from('lead_tasks').update({ is_completed, completed_at }).eq('id', id).select('*').single();
    if (error) throw error;
    setLeadTasks(prev => prev.map(task => task.id === id ? data : task));
    return data;
  }, [user]);

  const updateLeadMeetingInvitationStatus = useCallback(async (taskId: string, status: 'accepted' | 'declined') => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('lead_tasks').update({ manager_invitation_status: status }).eq('id', taskId).eq('manager_id', user.id).select('*').single();
    if (error) throw error;
    setLeadTasks(prev => prev.map(task => task.id === taskId ? data : task));
    return data;
  }, [user]);

  // Gestor Task Functions
  const addGestorTask = useCallback(async (task: Omit<GestorTask, 'id' | 'user_id' | 'created_at' | 'is_completed'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('gestor_tasks').insert({ user_id: user.id, ...task, is_completed: false }).select('*').single();
    if (error) throw error;
    setGestorTasks(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateGestorTask = useCallback(async (id: string, updates: Partial<GestorTask>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('gestor_tasks').update(updates).eq('id', id).eq('user_id', user.id).select('*').single();
    if (error) throw error;
    setGestorTasks(prev => prev.map(task => task.id === id ? data : task));
    return data;
  }, [user]);

  const deleteGestorTask = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('gestor_tasks').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    setGestorTasks(prev => prev.filter(task => task.id !== id));
    setGestorTaskCompletions(prev => prev.filter(completion => completion.gestor_task_id !== id));
  }, [user]);

  const toggleGestorTaskCompletion = useCallback(async (gestor_task_id: string, done: boolean, date: string) => {
    if (!user) throw new Error("Usuário não autenticado.");

    const existingCompletion = gestorTaskCompletions.find(c =>
      c.gestor_task_id === gestor_task_id &&
      c.date === date &&
      c.user_id === user.id
    );

    if (existingCompletion) {
      const { data, error } = await supabase.from('gestor_task_completions').update({ done, updated_at: new Date().toISOString() }).eq('id', existingCompletion.id).select('*').single();
      if (error) throw error;
      setGestorTaskCompletions(prev => prev.map(c => c.id === existingCompletion.id ? data : c));
    } else {
      const { data, error } = await supabase.from('gestor_task_completions').insert({ gestor_task_id, user_id: user.id, date, done }).select('*').single();
      if (error) throw error;
      setGestorTaskCompletions(prev => [...prev, data]);
    }
  }, [user, gestorTaskCompletions]);

  // Financial Entry Functions
  const addFinancialEntry = useCallback(async (entry: Omit<FinancialEntry, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('financial_entries').insert({ user_id: user.id, ...entry }).select('*').single();
    if (error) throw error;
    setFinancialEntries(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateFinancialEntry = useCallback(async (id: string, updates: Partial<FinancialEntry>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('financial_entries').update(updates).eq('id', id).eq('user_id', user.id).select('*').single();
    if (error) throw error;
    setFinancialEntries(prev => prev.map(entry => entry.id === id ? data : entry));
    return data;
  }, [user]);

  const deleteFinancialEntry = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('financial_entries').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    setFinancialEntries(prev => prev.filter(entry => entry.id !== id));
  }, [user]);

  // Form Cadastros Functions
  const getFormFilesForSubmission = useCallback((submissionId: string) => {
    return formFiles.filter(file => file.submission_id === submissionId);
  }, [formFiles]);

  const updateFormCadastro = useCallback(async (id: string, updates: Partial<FormCadastro>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('form_submissions').update(updates).eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID).select('*').single();
    if (error) throw error;
    setFormCadastros(prev => prev.map(cadastro => cadastro.id === id ? data : cadastro));
    return data;
  }, [user]);

  const deleteFormCadastro = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");

    // Delete associated files from storage and database first
    const filesToDelete = formFiles.filter(f => f.submission_id === id);
    for (const file of filesToDelete) {
      const filePath = file.file_url.split('form_uploads/')[1];
      if (filePath) {
        await supabase.storage.from('form_uploads').remove([filePath]);
      }
      await supabase.from('form_files').delete().eq('id', file.id);
    }

    const { error } = await supabase.from('form_submissions').delete().eq('id', id).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) throw error;
    setFormCadastros(prev => prev.filter(cadastro => cadastro.id !== id));
    setFormFiles(prev => prev.filter(file => file.submission_id !== id));
  }, [user, formFiles]);

  const addFeedback = useCallback(async (personId: string, feedback: Omit<Feedback, 'id'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const candidate = candidates.find(c => c.id === personId);
    if (!candidate) throw new Error("Candidato não encontrado.");

    const newFeedback = { ...feedback, id: crypto.randomUUID() };
    const updatedFeedbacks = [...(candidate.feedbacks || []), newFeedback];

    await updateCandidate(personId, { feedbacks: updatedFeedbacks });
    return newFeedback;
  }, [candidates, updateCandidate, user]);

  const updateFeedback = useCallback(async (personId: string, feedback: Feedback) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const candidate = candidates.find(c => c.id === personId);
    if (!candidate) throw new Error("Candidato não encontrado.");

    const updatedFeedbacks = (candidate.feedbacks || []).map(f => f.id === feedback.id ? feedback : f);
    await updateCandidate(personId, { feedbacks: updatedFeedbacks });
    return feedback;
  }, [candidates, updateCandidate, user]);

  const deleteFeedback = useCallback(async (personId: string, feedbackId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const candidate = candidates.find(c => c.id === personId);
    if (!candidate) throw new Error("Candidato não encontrado.");

    const updatedFeedbacks = (candidate.feedbacks || []).filter(f => f.id !== feedbackId);
    await updateCandidate(personId, { feedbacks: updatedFeedbacks });
  }, [candidates, updateCandidate, user]);

  const addTeamMemberFeedback = useCallback(async (teamMemberId: string, feedback: Omit<Feedback, 'id'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const member = teamMembers.find(m => m.id === teamMemberId);
    if (!member || !member.db_id) throw new Error("Membro da equipe não encontrado.");

    const newFeedback = { ...feedback, id: crypto.randomUUID() };
    const updatedFeedbacks = [...(member.feedbacks || []), newFeedback];
    const updatedData = { ...member.data, feedbacks: updatedFeedbacks };

    const { error } = await supabase
      .from('team_members')
      .update({ data: updatedData })
      .match({ id: member.db_id, user_id: JOAO_GESTOR_AUTH_ID });

    if (error) {
      console.error("Error adding team member feedback:", error);
      toast.error("Erro ao adicionar feedback do membro da equipe.");
      throw error;
    }
    setTeamMembers(prev => prev.map(m => m.id === teamMemberId ? { ...m, feedbacks: updatedFeedbacks } : m));
    return newFeedback;
  }, [teamMembers, user]);

  const updateTeamMemberFeedback = useCallback(async (teamMemberId: string, feedback: Feedback) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const member = teamMembers.find(m => m.id === teamMemberId);
    if (!member || !member.db_id) throw new Error("Membro da equipe não encontrado.");

    const updatedFeedbacks = (member.feedbacks || []).map(f => f.id === feedback.id ? feedback : f);
    const updatedData = { ...member.data, feedbacks: updatedFeedbacks };

    const { error } = await supabase
      .from('team_members')
      .update({ data: updatedData })
      .match({ id: member.db_id, user_id: JOAO_GESTOR_AUTH_ID });

    if (error) {
      console.error("Error updating team member feedback:", error);
      toast.error("Erro ao atualizar feedback do membro da equipe.");
      throw error;
    }
    setTeamMembers(prev => prev.map(m => m.id === teamMemberId ? { ...m, feedbacks: updatedFeedbacks } : m));
    return feedback;
  }, [teamMembers, user]);

  const deleteTeamMemberFeedback = useCallback(async (teamMemberId: string, feedbackId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const member = teamMembers.find(m => m.id === teamMemberId);
    if (!member || !member.db_id) throw new Error("Membro da equipe não encontrado.");

    const updatedFeedbacks = (member.feedbacks || []).filter(f => f.id !== feedbackId);
    const updatedData = { ...member.data, feedbacks: updatedFeedbacks };

    const { error } = await supabase
      .from('team_members')
      .update({ data: updatedData })
      .match({ id: member.db_id, user_id: JOAO_GESTOR_AUTH_ID });

    if (error) {
      console.error("Error deleting team member feedback:", error);
      toast.error("Erro ao excluir feedback do membro da equipe.");
      throw error;
    }
    setTeamMembers(prev => prev.filter(m => m.id !== teamMemberId ? { ...m, feedbacks: updatedFeedbacks } : m));
  }, [teamMembers, user]);


  const value = useMemo(() => {
    console.log("AppContext: Re-calculating context value. addTeamMember is", addTeamMember); // Log aqui
    return {
      isDataLoading,
      candidates,
      teamMembers,
      commissions,
      supportMaterials,
      // importantLinks, // REMOVIDO
      cutoffPeriods,
      onboardingSessions,
      onboardingTemplateVideos,
      checklistStructure,
      setChecklistStructure, // Adicionado setChecklistStructure
      consultantGoalsStructure,
      interviewStructure,
      templates,
      origins,
      interviewers,
      pvs,
      crmPipelines,
      crmStages,
      crmFields,
      crmLeads,
      crmOwnerUserId,
      dailyChecklists,
      dailyChecklistItems,
      dailyChecklistAssignments,
      dailyChecklistCompletions,
      weeklyTargets,
      weeklyTargetItems,
      weeklyTargetAssignments,
      metricLogs,
      supportMaterialsV2,
      supportMaterialAssignments,
      leadTasks,
      gestorTasks,
      gestorTaskCompletions,
      financialEntries,
      formCadastros,
      formFiles,
      notifications,
      theme,
      toggleTheme,
      addCandidate,
      getCandidate,
      updateCandidate,
      deleteCandidate,
      toggleChecklistItem,
      setChecklistDueDate,
      toggleConsultantGoal,
      addChecklistItem,
      updateChecklistItem,
      deleteChecklistItem,
      moveChecklistItem,
      resetChecklistToDefault,
      addGoalItem,
      updateGoalItem,
      deleteGoalItem,
      moveGoalItem,
      resetGoalsToDefault,
      updateInterviewSection,
      addInterviewQuestion,
      updateInterviewQuestion,
      deleteInterviewQuestion,
      moveInterviewQuestion,
      resetInterviewToDefault,
      saveTemplate,
      addOrigin,
      deleteOrigin,
      resetOriginsToDefault,
      addPV,
      addCommission,
      updateCommission,
      deleteCommission,
      updateInstallmentStatus,
      addCutoffPeriod,
      updateCutoffPeriod,
      deleteCutoffPeriod,
      addOnlineOnboardingSession,
      deleteOnlineOnboardingSession,
      addVideoToTemplate,
      deleteVideoFromTemplate,
      addCrmPipeline,
      updateCrmPipeline,
      deleteCrmPipeline,
      addCrmStage,
      updateCrmStage,
      updateCrmStageOrder,
      deleteCrmStage,
      addCrmField,
      updateCrmField,
      addCrmLead,
      updateCrmLead,
      updateCrmLeadStage,
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
      addWeeklyTarget,
      updateWeeklyTarget,
      deleteWeeklyTarget,
      addWeeklyTargetItem,
      updateWeeklyTargetItem,
      deleteWeeklyTargetItem,
      updateWeeklyTargetItemOrder,
      assignWeeklyTargetToConsultant,
      unassignWeeklyTargetFromConsultant,
      addMetricLog,
      updateMetricLog,
      deleteMetricLog,
      addSupportMaterialV2,
      updateSupportMaterialV2,
      deleteSupportMaterialV2,
      assignSupportMaterialToConsultant,
      unassignSupportMaterialFromConsultant,
      addLeadTask,
      updateLeadTask,
      deleteLeadTask,
      toggleLeadTaskCompletion,
      updateLeadMeetingInvitationStatus,
      addGestorTask,
      updateGestorTask,
      deleteGestorTask,
      toggleGestorTaskCompletion,
      isGestorTaskDueOnDate,
      addFinancialEntry,
      updateFinancialEntry,
      deleteFinancialEntry,
      getFormFilesForSubmission,
      updateFormCadastro,
      deleteFormCadastro,
      addFeedback,
      updateFeedback,
      deleteFeedback,
      addTeamMemberFeedback,
      updateTeamMemberFeedback,
      deleteTeamMemberFeedback,
      refetchCommissions,
      addTeamMember, // Adicionado addTeamMember explicitamente aqui
    };
  }, [
    isDataLoading, candidates, teamMembers, commissions, supportMaterials, cutoffPeriods, onboardingSessions, onboardingTemplateVideos,
    checklistStructure, consultantGoalsStructure, interviewStructure, templates, origins, interviewers, pvs,
    crmPipelines, crmStages, crmLeads, crmOwnerUserId,
    dailyChecklists, dailyChecklistItems, dailyChecklistAssignments, dailyChecklistCompletions,
    weeklyTargets, weeklyTargetItems, weeklyTargetAssignments, metricLogs,
    supportMaterialsV2, supportMaterialAssignments, leadTasks, gestorTasks, gestorTaskCompletions,
    financialEntries, formCadastros, formFiles, notifications,
    theme, toggleTheme, addCandidate, getCandidate, updateCandidate, deleteCandidate, 
    setChecklistDueDate, toggleConsultantGoal, addChecklistItem, updateChecklistItem, deleteChecklistItem, moveChecklistItem, resetChecklistToDefault,
    addGoalItem, updateGoalItem, deleteGoalItem, moveGoalItem, resetGoalsToDefault,
    updateInterviewSection, addInterviewQuestion, updateInterviewQuestion, deleteInterviewQuestion, moveInterviewQuestion, resetInterviewToDefault,
    saveTemplate, addOrigin, deleteOrigin, resetOriginsToDefault, addPV,
    addCommission, updateCommission, deleteCommission, updateInstallmentStatus,
    addCutoffPeriod, updateCutoffPeriod, deleteCutoffPeriod,
    addOnlineOnboardingSession, deleteOnlineOnboardingSession, addVideoToTemplate, deleteVideoFromTemplate,
    addCrmPipeline, updateCrmPipeline, deleteCrmPipeline, addCrmStage, updateCrmStage, updateCrmStageOrder, deleteCrmStage,
    addCrmField, updateCrmField, addCrmLead, updateCrmLead, updateCrmLeadStage, deleteCrmLead,
    addDailyChecklist, updateDailyChecklist, deleteDailyChecklist, addDailyChecklistItem, updateDailyChecklistItem, deleteDailyChecklistItem, moveDailyChecklistItem,
    assignDailyChecklistToConsultant, unassignDailyChecklistFromConsultant, toggleDailyChecklistCompletion,
    addWeeklyTarget, updateWeeklyTarget, deleteWeeklyTarget, addWeeklyTargetItem, updateWeeklyTargetItem, deleteWeeklyTargetItem, updateWeeklyTargetItemOrder,
    assignWeeklyTargetToConsultant, unassignWeeklyTargetFromConsultant, addMetricLog, updateMetricLog, deleteMetricLog,
    addSupportMaterialV2, updateSupportMaterialV2, deleteSupportMaterialV2, assignSupportMaterialToConsultant, unassignSupportMaterialFromConsultant,
    addLeadTask, updateLeadTask, deleteLeadTask, toggleLeadTaskCompletion, updateLeadMeetingInvitationStatus,
    addGestorTask, updateGestorTask, deleteGestorTask, toggleGestorTaskCompletion, isGestorTaskDueOnDate,
    addFinancialEntry, updateFinancialEntry, deleteFinancialEntry,
    getFormFilesForSubmission, updateFormCadastro, deleteFormCadastro,
    addFeedback, updateFeedback, deleteFeedback, addTeamMemberFeedback, updateTeamMemberFeedback, deleteTeamMemberFeedback,
    refetchCommissions, addTeamMember,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};