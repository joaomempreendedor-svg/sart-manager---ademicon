import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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
          (async () => { try { return await supabase.from('candidates').select('id, data, last_updated_at').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching candidates:", e); return { data: [], error: e }; } })(),
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

        setCandidates(candidatesData?.data?.map(item => ({ ...(item.data as Candidate), db_id: item.id, lastUpdatedAt: item.last_updated_at })) || []);
        
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
                setLeadTasks(prev => [newTaskData, ...prev]);
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
                setGestorTasks(prev => [newGestorTaskData, ...prev]);
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
                setFormFiles(prev => prev.filter(file => file.id !== payload.old.id));
            }
        })
        .subscribe();


    return () => {
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
    const clientSideId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const lastUpdatedAt = new Date().toISOString();

    const newCandidateData: Candidate = { 
      ...candidate, 
      id: clientSideId, // This is the client-side UUID, stored in the 'data' JSONB
      status: candidate.status || 'Triagem', 
      screeningStatus: candidate.screeningStatus || 'Pending Contact',
      interviewScores: candidate.interviewScores || { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' },
      checkedQuestions: candidate.checkedQuestions || {},
      checklistProgress: candidate.checklistProgress || {},
      consultantGoalsProgress: candidate.consultantGoalsProgress || {},
      feedbacks: candidate.feedbacks || [],
      createdAt: createdAt, 
      lastUpdatedAt: lastUpdatedAt, 
    };

    // Insert into Supabase. The 'id' column (primary key) is auto-generated.
    // We only provide 'user_id', 'data' (which contains our client-side Candidate object), and 'last_updated_at'.
    const { data, error } = await supabase.from('candidates').insert({ 
      user_id: JOAO_GESTOR_AUTH_ID, 
      data: newCandidateData, // The entire client-side Candidate object goes into the 'data' JSONB column
      last_updated_at: newCandidateData.lastUpdatedAt 
    }).select('id, created_at, last_updated_at').single(); 
    
    if (error) { 
      console.error("Erro ao adicionar candidato no Supabase:", error); 
      toast.error("Erro ao adicionar candidato."); 
      throw error; 
    } 
    
    if (data) { 
      // Update local state with the Supabase-generated 'id' (db_id) and actual 'created_at'
      // ⚠️ CORREÇÃO: Adicionar o novo candidato no INÍCIO do array para que apareça no topo
      setCandidates(prev => [{ // Adiciona no início para que apareça no topo
        ...newCandidateData, 
        db_id: data.id, // Store Supabase's primary key here
        createdAt: data.created_at, 
        lastUpdatedAt: data.last_updated_at 
      }, ...prev]); 
    } 
    return newCandidateData; // Return the client-side object
  }, [user]);
  const updateCandidate = useCallback(async (id: string, updates: Partial<Candidate>) => { 
    if (!user) throw new Error("Usuário não autenticado."); 
    const c = candidates.find(c => c.id === id); 
    if (!c || !c.db_id) throw new Error("Candidato não encontrado"); 
    const updated = { ...c, ...updates, lastUpdatedAt: new Date().toISOString() }; // Atualiza lastUpdatedAt
    const { db_id, createdAt, lastUpdatedAt, ...dataToUpdate } = updated; // Remove db_id, createdAt, lastUpdatedAt do objeto 'data'
    const { error } = await supabase.from('candidates').update({ data: dataToUpdate, last_updated_at: updated.lastUpdatedAt }).match({ id: c.db_id, user_id: JOAO_GESTOR_AUTH_ID }); 
    if (error) { console.error(error); toast.error("Erro ao atualizar candidato."); throw error; } 
    setCandidates(prev => prev.map(p => p.id === id ? updated : p)); 
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

  const addTeamMember = useCallback(async (member: Omit<TeamMember, 'id'> & { email?: string }) => {
    if (!user) throw new Error("Usuário não autenticado.");
  
    let authUserId: string;
    let tempPassword = '';
    let wasExistingUser = false;
  
    if (member.email) {
      tempPassword = generateRandomPassword();
      
      const cleanedCpf = member.cpf ? member.cpf.replace(/\D/g, '') : '';
      const last4Cpf = cleanedCpf.length >= 4 ? cleanedCpf.slice(-4) : null;
      
      console.log("[AppContext] Invoking create-or-link-consultant Edge Function for ADD operation:", {
        name: newName.trim(),
        email: newEmail.trim(),
        cpf: cleanedCpf,
        login: login,
        roles: newRoles,
        dateOfBirth: newDateOfBirth || undefined, // NOVO: Incluir data de nascimento
      });

      const result = await addTeamMember({
        name: newName.trim(),
        email: newEmail.trim(),
        cpf: cleanedCpf,
        login: login,
        roles: newRoles,
        isActive: true,
        dateOfBirth: newDateOfBirth || undefined, // NOVO: Incluir data de nascimento
      });

      if (result.success) {
        setCreatedConsultantCredentials({ 
          name: result.member.name, 
          login: result.member.email || '',
          password: result.tempPassword || '',
          wasExistingUser: result.wasExistingUser || false,
        });
        setShowCredentialsModal(true);
      } else {
        alert(result.message || "Falha ao adicionar membro.");
      }

      setNewName('');
      setNewEmail('');
      setNewCpf('');
      setNewDateOfBirth(''); // NOVO: Resetar campo
      setNewRoles(['Prévia']);
      setGeneratedPassword(generateRandomPassword());
    } catch (error: any) {
      alert(`Falha ao adicionar membro: ${error.message}`);
      console.error("Erro ao adicionar membro:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const startEditing = (member: TeamMember) => {
    setEditingMember(member);
    setEditingName(member.name);
    setEditingEmail(member.email || '');
    setEditingCpf(formatCpf(member.cpf || ''));
    setEditingDateOfBirth(member.dateOfBirth || ''); // NOVO: Popular campo
    setEditingRoles(member.roles);
  };

  const cancelEditing = () => {
    setEditingMember(null);
    setEditingName('');
    setEditingEmail('');
    setEditingCpf('');
    setEditingDateOfBirth(''); // NOVO: Resetar campo
    setEditingRoles([]);
  };

  const handleUpdate = async () => {
    if (!editingMember || !editingName.trim() || editingRoles.length === 0 || !editingCpf.trim() || !editingEmail.trim()) {
      alert("O nome, E-mail, CPF e pelo menos um cargo são obrigatórios.");
      return;
    }
    if (editingCpf.replace(/\D/g, '').length !== 11) {
      alert("Por favor, insira um CPF válido com 11 dígitos.");
      return;
    }

    setIsUpdating(true);
    try {
      const cleanedCpf = editingCpf.replace(/\D/g, '');
      const result = await updateTeamMember(editingMember.id, { 
        name: editingName.trim(), 
        roles: editingRoles, 
        cpf: cleanedCpf,
        email: editingEmail.trim(),
        dateOfBirth: editingDateOfBirth || undefined, // NOVO: Incluir data de nascimento
      });

      if (result?.tempPassword) {
        setCreatedConsultantCredentials({
          name: editingName.trim(),
          login: editingEmail.trim(),
          password: result.tempPassword,
          wasExistingUser: true,
        });
        setShowCredentialsModal(true);
      }
      
      cancelEditing();
    } catch (error: any) {
      alert(`Falha ao atualizar membro: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este membro da equipe? Esta ação não pode ser desfeita.')) {
      try {
        await deleteTeamMember(id);
      } catch (error: any) {
        alert(`Falha ao remover membro: ${error.message}`);
      }
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    try {
      await updateTeamMember(member.id, { isActive: !member.isActive });
    } catch (error: any) {
      alert(`Falha ao alterar status do membro: ${error.message}`);
    }
  };

  const handleResetPassword = async (member: TeamMember) => {
    if (!member.email) {
      alert("Não é possível resetar a senha: E-mail do consultor não encontrado.");
      return;
    }
    if (!window.confirm(`Tem certeza que deseja resetar a senha de ${member.name}? Uma nova senha temporária será gerada e o consultor será forçado a trocá-la no próximo login.`)) {
      return;
    }

    try {
      const newTempPassword = generateRandomPassword();
      
      await resetConsultantPasswordViaEdge(member.id, newTempPassword);
      
      setCreatedConsultantCredentials({ 
        name: member.name, 
        login: member.email,
        password: newTempPassword, 
        wasExistingUser: true
      });
      setShowCredentialsModal(true);

      alert(`Senha de ${member.name} resetada com sucesso! O consultor será forçado a trocá-la no próximo login.`);
    } catch (error: any) {
      alert(`Falha ao resetar senha: ${error.message}`);
      console.error("Erro ao resetar senha:", error);
    }
  };

  const getRoleIcon = (role: TeamRole) => {
      switch(role) {
          case 'Gestor': return <Crown className="w-4 h-4 text-blue-500" />;
          case 'Anjo': return <Star className="w-4 h-4 text-yellow-500" />;
          case 'Autorizado': return <Shield className="w-4 h-4 text-green-500" />;
          default: return <User className="w-4 h-4 text-gray-500" />;
      }
  };

  const getRoleBadge = (role: TeamRole) => {
      switch(role) {
          case 'Gestor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
          case 'Anjo': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
          case 'Autorizado': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
          default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      }
  };

  const handleOpenRecordInterviewModal = (member: TeamMember) => {
    setTeamMemberToRecordInterview(member);
    setIsRecordInterviewModalOpen(true);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Equipe</h1>
        <p className="text-gray-500 dark:text-gray-400">Cadastre os membros da equipe e defina seus cargos para uso nas comissões.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm sticky top-8">
                  <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Adicionar Membro</h2>
                  <form onSubmit={handleAdd} className="space-y-4">
                      <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome Completo</label>
                          <input 
                            type="text" 
                            required
                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                            placeholder="Ex: João Silva"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">E-mail</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="email" 
                                required
                                className="w-full pl-10 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                                placeholder="email@exemplo.com"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                            />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CPF</label>
                          <input 
                            type="text" 
                            required
                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                            placeholder="000.000.000-00"
                            value={newCpf}
                            onChange={e => setNewCpf(formatCpf(e.target.value))}
                            maxLength={14}
                          />
                      </div>
                      {/* NOVO: Campo de Data de Nascimento */}
                      <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data de Nascimento (Opcional)</label>
                          <div className="relative">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="date" 
                                className="w-full pl-10 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                                value={newDateOfBirth}
                                onChange={e => setNewDateOfBirth(e.target.value)}
                            />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Cargos / Funções</label>
                          <div className="space-y-2">
                            {ALL_ROLES.map(role => (
                                <label key={role} className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={newRoles.includes(role)}
                                        onChange={() => handleRoleChange(role, newRoles, setNewRoles)}
                                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{role}</span>
                                </label>
                            ))}
                          </div>
                      </div>
                      <button type="submit" disabled={isAdding} className="w-full flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg transition font-medium disabled:opacity-50">
                          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          <span>{isAdding ? 'Adicionando...' : 'Adicionar'}</span>
                      </button>
                  </form>
              </div>
          </div>

          <div className="md:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Membros da Equipe ({teamMembers.length})</h3>
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                      {teamMembers.length === 0 ? (
                          <li className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhum membro cadastrado.</li>
                      ) : (
                          teamMembers.map(member => (
                              <li key={member.id} className={`p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 transition group ${!member.isActive ? 'opacity-60' : ''}`}>
                                  {editingMember?.id === member.id ? (
                                    <div className="flex-1 flex flex-col gap-3">
                                      <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)} className="w-full border-gray-300 dark:border-slate-600 rounded-md p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400" />
                                      <input type="email" value={editingEmail} onChange={e => setEditingEmail(e.target.value)} className="w-full border-gray-300 dark:border-slate-600 rounded-md p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400" />
                                      <input type="text" value={editingCpf} onChange={e => setEditingCpf(formatCpf(e.target.value))} maxLength={14} className="w-full border-gray-300 dark:border-slate-600 rounded-md p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400" />
                                      {/* NOVO: Campo de Data de Nascimento em edição */}
                                      <div className="relative">
                                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            type="date" 
                                            className="w-full pl-10 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
                                            value={editingDateOfBirth}
                                            onChange={e => setEditingDateOfBirth(e.target.value)}
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {ALL_ROLES.map(role => (
                                            <label key={role} className="flex items-center space-x-2 cursor-pointer">
                                                <input type="checkbox" checked={editingRoles.includes(role)} onChange={() => handleRoleChange(role, editingRoles, setEditingRoles)} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{role}</span>
                                            </label>
                                        ))}
                                      </div>
                                      <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={handleUpdate} disabled={isUpdating} className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200 disabled:opacity-50">
                                            {isUpdating ? <Loader2 className="w-4 h-4 inline mr-1 animate-spin" /> : <Save className="w-4 h-4 inline mr-1" />}
                                            Salvar
                                        </button>
                                        <button onClick={cancelEditing} className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"><X className="w-4 h-4 inline mr-1" />Cancelar</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center space-x-4">
                                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                              {member.roles && member.roles.length > 0 ? getRoleIcon(member.roles[0]) : <User className="w-4 h-4 text-gray-500" />}
                                          </div>
                                          <div>
                                              <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {member.roles.map(role => (
                                                    <span key={role} className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadge(role)}`}>
                                                        {role}
                                                    </span>
                                                ))}
                                                {!member.isActive && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">Inativo</span>}
                                              </div>
                                              {member.email && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email: {member.email}</p>
                                              )}
                                              {member.cpf && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">CPF: {formatCpf(member.cpf)}</p>
                                              )}
                                              {member.dateOfBirth && ( // NOVO: Exibir data de nascimento
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Nascimento: {new Date(member.dateOfBirth + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                              )}
                                          </div>
                                      </div>
                                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Botão de Registrar Entrevista - AGORA SEM CONDIÇÕES DE CARGO OU CANDIDATO EXISTENTE */}
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleOpenRecordInterviewModal(member); }} 
                                            className="p-2 rounded-full text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20" 
                                            title="Registrar Entrevista"
                                          >
                                            <CalendarPlus className="w-4 h-4" />
                                          </button>
                                        <button onClick={() => handleResetPassword(member)} className="p-2 rounded-full text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20" title="Resetar Senha">
                                            <KeyRound className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleToggleActive(member)} className={`p-2 rounded-full ${member.isActive ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`} title={member.isActive ? 'Inativar' : 'Ativar'}>
                                            <Archive className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => startEditing(member)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full">
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => handleDelete(member.id)}
                                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                              </li>
                          ))
                      )}
                  </ul>
              </div>
          </div>
      </div>
      {showCredentialsModal && createdConsultantCredentials && (
        <ConsultantCredentialsModal
          isOpen={showCredentialsModal}
          onClose={() => setShowCredentialsModal(false)}
          consultantName={createdConsultantCredentials.name}
          login={createdConsultantCredentials.login}
          password={createdConsultantCredentials.password}
          wasExistingUser={createdConsultantCredentials.wasExistingUser}
        />
      )}
      {isRecordInterviewModalOpen && teamMemberToRecordInterview && (
        <RecordTeamMemberInterviewModal
          isOpen={isRecordInterviewModalOpen}
          onClose={() => setIsRecordInterviewModalOpen(false)}
          teamMember={teamMemberToRecordInterview}
        />
      )}
    </div>
  );
};