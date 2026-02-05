import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Candidate, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, InterviewQuestion, Commission, SupportMaterial, GoalStage, TeamMember, InstallmentStatus, InstallmentInfo, CutoffPeriod, OnboardingSession, OnboardingVideoTemplate, CrmPipeline, CrmStage, CrmField, CrmLead, DailyChecklist, DailyChecklistItem, DailyChecklistAssignment, DailyChecklistCompletion, WeeklyTarget, WeeklyTargetItem, WeeklyTargetAssignment, MetricLog, SupportMaterialV2, SupportMaterialAssignment, LeadTask, SupportMaterialContentType, DailyChecklistItemResource, DailyChecklistItemResourceType, GestorTask, GestorTaskCompletion, FinancialEntry, FormCadastro, FormFile, Notification, NotificationType, Feedback, TeamProductionGoal } from '@/types';
import { CHECKLIST_STAGES as DEFAULT_STAGES } from '@/data/checklistData';
import { CONSULTANT_GOALS as DEFAULT_GOALS } from '@/data/consultantGoals';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { generateRandomPassword } from '@/utils/authUtils';
import { sanitizeFilename } from '@/utils/fileUtils'; // Importar a função sanitizeFilename
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
  hiringOrigins: ['Indicação', 'Prospecção', 'Tráfego Linkedin'], // Origens para contratação
  salesOrigins: ['WhatsApp', 'Instagram', 'Networking', 'Tráfego Pago', 'Indicação'], // REMOVIDO: 'Frio'
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

// Helper function to parse currency strings from the database into numbers
const parseDbCurrency = (value: any): number | null => { // Alterado para retornar null se não for um número válido
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9,-]+/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed; // Retorna null se não for um número
  }
  return null;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const fetchedUserIdRef = useRef<string | null>(null); // Corrigido: Inicializado com null
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
  const [hiringOrigins, setHiringOrigins] = useState<string[]>([]); // NOVO: Estado para origens de contratação
  const [salesOrigins, setSalesOrigins] = useState<string[]>([]); // NOVO: Estado para origens de vendas
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
  const [gestorTaskCompletions, setGestorTaskCompletions] = useState<GestorTaskCompletion[]>([]);

  // NOVO: Entradas e Saídas Financeiras
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);

  // NOVO: Cadastros de Formulário Público
  const [formCadastros, setFormCadastros] = useState<FormCadastro[]>([]);
  const [formFiles, setFormFiles] = useState<FormFile[]>([]);

  // REMOVIDO: Eventos pessoais do Consultor
  // const [consultantEvents, setConsultantEvents] = useState<ConsultantEvent[]>([]);

  // NOVO: Notificações
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // NOVO: Metas de Produção da Equipe
  const [teamProductionGoals, setTeamProductionGoals] = useState<TeamProductionGoal[]>([]);


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
    const currentConfig = { checklistStructure, consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs }; // ATUALIZADO
    const newConfigData = { ...currentConfig, ...updates };
    debouncedUpdateConfig(newConfigData);
  }, [user, checklistStructure, consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs, debouncedUpdateConfig]); // ATUALIZADO

  const resetLocalState = () => {
    setCandidates([]);
    setTeamMembers([]);
    setCommissions([]);
    setSupportMaterials([]);
    setCutoffPeriods([]);
    setOnboardingSessions([]);
    setOnboardingTemplateVideos([]);
    setChecklistStructure(DEFAULT_STAGES);
    setConsultantGoalsStructure(DEFAULT_GOALS);
    setInterviewStructure(INITIAL_INTERVIEW_STRUCTURE);
    setTemplates({});
    setHiringOrigins(DEFAULT_APP_CONFIG_DATA.hiringOrigins); // ATUALIZADO
    setSalesOrigins(DEFAULT_APP_CONFIG_DATA.salesOrigins); // ATUALIZADO
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
    setGestorTasks([]);
    setGestorTaskCompletions([]);
    setFinancialEntries([]);
    setFormCadastros([]);
    setFormFiles([]);
    // REMOVIDO: Resetar eventos do consultor
    // setConsultantEvents([]); 
    setNotifications([]);
    setTeamProductionGoals([]); // NOVO: Resetar metas de produção da equipe
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
    const todayFormatted = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayFormatted = yesterday.toISOString().split('T')[0];

    const currentMonth = today.getMonth();

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
            link: `/gestor/config-team`,
            isRead: false,
          });
        }
      }
    });

    // 2. Documentação enviada no formulário (novos cadastros)
    // REMOVIDO: Esta lógica será substituída pela notificação inserida diretamente na Edge Function
    // formCadastros.filter(cadastro => {
    //   const submissionDate = new Date(cadastro.submission_date);
    //   return (today.getTime() - submissionDate.getTime() < 24 * 60 * 60 * 1000) && !cadastro.is_complete;
    // }).forEach(cadastro => {
    //   newNotifications.push({
    //     id: `form-submission-${cadastro.id}`,
    //     type: 'form_submission',
    //     title: `Novo Cadastro de Formulário: ${cadastro.data.nome_completo || 'Desconhecido'}`,
    //     description: `Um novo formulário foi enviado e aguarda revisão.`,
    //     date: cadastro.submission_date.split('T')[0],
    //     link: `/gestor/form-cadastros`,
    //     isRead: false,
    //   });
    // });

    // 3. Nova Venda Registrada (CRM Leads)
    crmLeads.filter(lead => {
      if (lead.soldCreditValue === undefined || lead.soldCreditValue === null || !lead.saleDate) return false;
      
      return lead.saleDate === todayFormatted || lead.saleDate === yesterdayFormatted;
    }).forEach(lead => {
      const consultant = teamMembers.find(tm => tm.id === lead.consultant_id);
      newNotifications.push({
        id: `new-sale-lead-${lead.id}`,
        type: 'new_sale',
        title: `Nova Venda Registrada: ${lead.name}`,
        description: `O consultor ${consultant?.name || 'Desconhecido'} registrou uma venda no valor de ${lead.soldCreditValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
        date: lead.saleDate,
        link: `/gestor/crm`,
        isRead: false,
      });
    });

    // 4. Onboarding Online 100% Concluído
    onboardingSessions.filter(session => {
      const totalVideos = session.videos.length;
      if (totalVideos === 0) return false;
      const completedVideos = session.videos.filter(video => video.is_completed).length;
      const isCompleted100Percent = (completedVideos / totalVideos) === 1;

      const sessionCreationDate = new Date(session.created_at);
      return isCompleted100Percent && (today.getTime() - sessionCreationDate.getTime() < 72 * 60 * 60 * 1000);
    }).forEach(session => {
      newNotifications.push({
        id: `onboarding-complete-${session.id}`,
        type: 'onboarding_complete',
        title: `Onboarding Concluído: ${session.consultant_name}`,
        description: `O consultor ${session.consultant_name} finalizou 100% do onboarding online.`,
        date: session.created_at.split('T')[0],
        link: `/gestor/onboarding-admin`,
        isRead: false,
      });
    });

    setNotifications(newNotifications);
  }, [user, teamMembers, formCadastros, crmLeads, onboardingSessions]);

  const onMarkAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId).eq('user_id', user.id);
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
  }, [user]);

  const onMarkAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
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
              .from('profiles')
              .select('user_id') // Assuming profiles table has a user_id that links to the gestor
              .eq('id', userId)
              .maybeSingle();

            if (teamMemberProfileError) {
              console.error("Error fetching team member profile for consultant:", teamMemberProfileError);
            } else if (teamMemberProfile) {
              // If the consultant has a linked gestor, use that gestor's ID for shared configs
              // For now, we'll keep it simple and assume JOAO_GESTOR_AUTH_ID for shared configs
              effectiveGestorId = JOAO_GESTOR_AUTH_ID; // Or teamMemberProfile.user_id if that's how it's structured
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
          let teamMembersQuery = supabase.from('team_members').select('id, data, cpf, user_id'); // ADD user_id here
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
          gestorTasksData,
          gestorTaskCompletionsData,
          financialEntriesData,
          formCadastrosData,
          formFilesData,
          notificationsData, // NOVO: Busca de notificações
          teamProductionGoalsData, // NOVO: Busca de metas de produção da equipe
        ] = await Promise.all([
          (async () => { try { return await supabase.from('app_config').select('data').eq('user_id', effectiveGestorId).maybeSingle(); } catch (e) { console.error("Error fetching app_config:", e); return { data: null, error: e }; } })(),
          (async () => { try { return await supabase.from('candidates').select('id, data, created_at, last_updated_at').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching candidates:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('support_materials').select('id, data').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching support_materials:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('cutoff_periods').select('id, data').eq('user_id', effectiveGestorId); } catch (e) { console.error("Error fetching cutoff_periods:", e); return { data: null, error: e }; } })(),
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
          (async () => { try { return await supabase.from('gestor_tasks').select('*').eq('user_id', userId); } catch (e) { console.error("Error fetching gestor_tasks:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('gestor_task_completions').select('*').eq('user_id', userId); } catch (e) { console.error("Error fetching gestor_task_completions:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('financial_entries').select('*').eq('user_id', userId); } catch (e) { console.error("Error fetching financial_entries:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('form_submissions').select('id, submission_date, data, internal_notes, is_complete').eq('user_id', effectiveGestorId).order('submission_date', { ascending: false }); } catch (e) { console.error("Error fetching form_submissions:", e); return { data: [], error: e }; } })(),
          (async () => { try { return await supabase.from('form_files').select('*'); } catch (e) { console.error("Error fetching form_files:", e); return { data: [], error: e }; } } )(),
          (async () => { try { return await supabase.from('notifications').select('*').eq('user_id', userId).eq('is_read', false).order('created_at', { ascending: false }); } catch (e) { console.error("Error fetching notifications:", e); return { data: [], error: e }; } })(), // NOVO: Busca de notificações
          (async () => { try { return await supabase.from('team_production_goals').select('*').eq('user_id', effectiveGestorId).order('start_date', { ascending: false }); } catch (e) { console.error("Error fetching team_production_goals:", e); return { data: [], error: e }; } })(), // NOVO: Busca de metas de produção da equipe
        ]);

        // Centralized error logging for all promises
        const logError = (source: string, error: any) => {
          if (error) console.error(`${source} error:`, error);
        };

        logError("Config", configResult.error);
        logError("Candidates", candidatesData.error);
        logError("Materials", materialsData.error);
        logError("Cutoff Periods", cutoffData.error);
        logError("Onboarding", onboardingData.error);
        logError("Onboarding Template", templateVideosData.error);
        logError("Pipelines", pipelinesData.error);
        logError("Stages", stagesData.error);
        logError("Fields", fieldsData.error);
        logError("CRM Leads", crmLeadsData.error);
        logError("Daily Checklists", dailyChecklistsData.error);
        logError("Daily Checklist Items", dailyChecklistItemsData.error);
        logError("Daily Checklist Assignments", dailyChecklistAssignmentsData.error);
        logError("Daily Checklist Completions", dailyChecklistCompletionsData.error);
        logError("Weekly Targets", weeklyTargetsData.error);
        logError("Weekly Target Items", weeklyTargetItemsData.error);
        logError("Weekly Target Assignments", weeklyTargetAssignmentsData.error);
        logError("Metric Logs", metricLogsData.error);
        logError("Support Materials V2", supportMaterialsV2Data.error);
        logError("Support Material Assignments", supportMaterialAssignmentsData.error);
        logError("Lead Tasks", leadTasksData.error);
        logError("Gestor Tasks", gestorTasksData.error);
        logError("Gestor Task Completions", gestorTaskCompletionsData.error);
        logError("Financial Entries", financialEntriesData.error);
        logError("Form Cadastros", formCadastrosData.error);
        logError("Form Files", formFilesData.error);
        logError("Notifications", notificationsData.error);
        logError("Team Production Goals", teamProductionGoalsData.error);


        if (configResult.data) {
          const { data } = configResult.data;
          setChecklistStructure(data.checklistStructure || DEFAULT_STAGES);
          setConsultantGoalsStructure(data.consultantGoalsStructure || DEFAULT_GOALS);
          const loadedInterviewStructure = data.interviewStructure || INITIAL_INTERVIEW_STRUCTURE;
          const uniqueInterviewSections = Array.from(new Map(loadedInterviewStructure.map((item: InterviewSection) => [item.id, item])).values());
          setInterviewStructure(uniqueInterviewSections);
          setTemplates(data.templates || {});
          setHiringOrigins(data.hiringOrigins || DEFAULT_APP_CONFIG_DATA.hiringOrigins); // ATUALIZADO
          setSalesOrigins(data.salesOrigins || DEFAULT_APP_CONFIG_DATA.salesOrigins); // ATUALIZADO
          setInterviewers(data.interviewers || []);
          setPvs(data.pvs || []);
        } else {
          await supabase.from('app_config').insert({ user_id: effectiveGestorId, data: DEFAULT_APP_CONFIG_DATA });
          const { checklistStructure, consultantGoalsStructure, interviewStructure, templates, hiringOrigins, salesOrigins, interviewers, pvs } = DEFAULT_APP_CONFIG_DATA; // ATUALIZADO
          setChecklistStructure(checklistStructure);
          setConsultantGoalsStructure(consultantGoalsStructure);
          setInterviewStructure(interviewStructure);
          setTemplates(templates);
          setHiringOrigins(hiringOrigins); // ATUALIZADO
          setSalesOrigins(salesOrigins); // ATUALIZADO
          setInterviewers(interviewers);
          setPvs(pvs);
        }

        setCandidates(candidatesData?.data?.map(item => {
          console.log(`[fetchData] Processing raw item:`, item);
          // Ensure item.data is an object, default to empty if null/undefined
          const rawCandidateData = (item.data || {}) as Candidate; 
          const clientSideId = rawCandidateData.id || crypto.randomUUID(); 
          
          const candidate: Candidate = {
            ...rawCandidateData, 
            id: clientSideId,
            db_id: item.id,
            createdAt: item.created_at,
            lastUpdatedAt: item.last_updated_at,
            // Provide default values for nested objects if they are null/undefined
            interviewScores: rawCandidateData.interviewScores || { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' },
            checkedQuestions: rawCandidateData.checkedQuestions || {},
            checklistProgress: rawCandidateData.checklistProgress || {},
            consultantGoalsProgress: rawCandidateData.consultantGoalsProgress || {},
            feedbacks: rawCandidateData.feedbacks || [],
            data: rawCandidateData.data || {},
            // Ensure top-level string properties are always strings
            name: String(rawCandidateData.name || ''), // Explicitly convert to string
            phone: String(rawCandidateData.phone || ''), // Explicitly convert to string
            email: String(rawCandidateData.email || ''), // Explicitly convert to string
          };
          
          console.log(`[fetchData] Final candidate name before setCandidates:`, candidate.name, `client-side ID:`, candidate.id, `db_id:`, candidate.db_id, `createdAt:`, candidate.createdAt);
          return candidate;
        }) || []);
        
        const normalizedTeamMembers = teamMembersData?.map(item => {
          const data = item.data as any;
          // Regex para validar formato UUID
          const isAuthUserLinked = typeof data.id === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(data.id);

          const member: TeamMember = {
            id: isAuthUserLinked ? data.id : `legacy_${item.id}`, // Usa o ID do Auth se for UUID, senão um ID legado
            db_id: item.id, // ID da tabela public.team_members
            authUserId: isAuthUserLinked ? data.id : null, // NOVO: Armazena o auth.users.id explicitamente
            name: String(data.name || ''), // Garante que o nome seja string
            email: data.email,
            roles: Array.isArray(data.roles) ? data.roles : [],
            isActive: data.isActive !== false,
            hasLogin: isAuthUserLinked, // hasLogin é true apenas se o ID for um UUID válido
            isLegacy: !isAuthUserLinked,
            cpf: item.cpf,
            dateOfBirth: data.dateOfBirth,
            user_id: item.user_id, // Adicionado user_id aqui
          };
          console.log(`[AppContext] Fetched Team Member: ID=${member.id}, AuthUserID=${member.authUserId}, Name=${member.name}, IsActive=${member.isActive}, Roles=${member.roles.join(', ')}, HasLogin=${member.hasLogin}, IsLegacy=${member.isLegacy}, OwnerUserID=${member.user_id}`);
          return member;
        }) || [];
        setTeamMembers(normalizedTeamMembers);
        console.log("[AppContext] Normalized Team Members:", normalizedTeamMembers); // Adicionado log aqui

        setSupportMaterials(materialsData?.data?.map(item => ({ ...(item.data as SupportMaterial), db_id: item.id })) || []);
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
          proposalValue: parseDbCurrency(lead.proposal_value), // Use parseDbCurrency
          proposalClosingDate: lead.proposal_closing_date,
          soldCreditValue: parseDbCurrency(lead.sold_credit_value), // Use parseDbCurrency
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
        setGestorTasks(gestorTasksData?.data || []);
        setGestorTaskCompletions(gestorTaskCompletionsData?.data || []);
        setFinancialEntries(financialEntriesData?.data?.map((entry: any) => ({
          id: entry.id,
          db_id: entry.id,
          user_id: entry.user_id,
          entry_date: entry.entry_date,
          type: entry.type,
          description: entry.description,
          amount: parseFloat(entry.amount),
          created_at: entry.created_at,
        })) || []);
        setFormCadastros(formCadastrosData?.data || []);
        setFormFiles(formFilesData?.data || []);
        setNotifications(notificationsData?.data || []); // NOVO: Define as notificações
        setTeamProductionGoals(teamProductionGoalsData?.data || []); // NOVO: Define as metas de produção da equipe
        
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

  useEffect(() => {
    if (!user || !crmOwnerUserId) return;

    const candidatesChannel = supabase
        .channel('candidates_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates', filter: `user_id=eq.${crmOwnerUserId}` }, (payload) => {
            console.log('Candidate Change (Realtime):', payload);
            toast.info(`🔄 Candidato "${payload.new.data.name || payload.old.data.name}" atualizado em tempo real!`);
            
            const rawPayloadData = (payload.new.data || {}) as Candidate; 
            const clientSideId = rawPayloadData.id || crypto.randomUUID(); 
            
            const candidate: Candidate = {
                ...rawPayloadData, 
                id: clientSideId,
                db_id: payload.new.id,
                createdAt: payload.new.created_at,
                lastUpdatedAt: payload.new.last_updated_at,
                interviewScores: rawPayloadData.interviewScores || { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' },
                checkedQuestions: rawPayloadData.checkedQuestions || {},
                checklistProgress: rawPayloadData.checklistProgress || {},
                consultantGoalsProgress: rawCandidateData.consultantGoalsProgress || {},
                feedbacks: rawCandidateData.feedbacks || [],
                data: rawCandidateData.data || {},
                name: String(rawPayloadData.name || ''), 
                phone: String(rawPayloadData.phone || ''), 
                email: String(rawPayloadData.email || ''), 
            };

            if (payload.eventType === 'INSERT') {
                setCandidates(prev => {
                    if (prev.some(c => c.db_id === candidate.db_id)) {
                        console.log('Skipping insert, candidate already exists (db_id):', candidate.db_id);
                        return prev;
                    }
                    if (prev.some(c => c.id === candidate.id && !c.db_id)) {
                        console.log('Skipping insert, candidate already exists (client-side id):', candidate.id);
                        return prev;
                    }
                    console.log('[Realtime: Candidate] Inserting candidate with name:', candidate.name);
                    return [candidate, ...prev];
                });
            } else if (payload.eventType === 'UPDATE') {
                setCandidates(prev => {
                    const updatedArray = prev.map(c => {
                        if (c.db_id === candidate.db_id) {
                            console.log(`[Realtime: Candidate] Updating candidate from "${c.name}" to "${candidate.name}"`);
                            return candidate;
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
                proposalValue: parseDbCurrency(payload.new.proposal_value), // Use parseDbCurrency
                proposalClosingDate: payload.new.proposal_closing_date,
                soldCreditValue: parseDbCurrency(payload.new.sold_credit_value), // Use parseDbCurrency
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
                updated_at: payload.new.updated_at,
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
                recurrence_pattern: payload.new.recurrence_pattern,
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
                setFormFiles(prev => prev.filter(file => file.submission_id !== payload.old.id));
            }
        })
        .subscribe();

    const notificationsChannel = supabase 
        .channel('notifications_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` }, (payload) => {
            console.log('Notification Change (Realtime):', payload);
            toast.info(`🔔 Nova notificação: "${payload.new.title || payload.old.title}"`);
            const newNotificationData: Notification = {
                id: payload.new.id,
                user_id: payload.new.user_id,
                type: payload.new.type,
                title: payload.new.title,
                description: payload.new.description,
                date: payload.new.date,
                link: payload.new.link,
                isRead: payload.new.is_read,
            };

            if (payload.eventType === 'INSERT') {
                setNotifications(prev => [newNotificationData, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                setNotifications(prev => prev.map(notif => notif.id === newNotificationData.id ? newNotificationData : notif));
            } else if (payload.eventType === 'DELETE') {
                setNotifications(prev => prev.filter(notif => notif.id !== payload.old.id));
            }
        })
        .subscribe();

    const teamProductionGoalsChannel = supabase 
        .channel('team_production_goals_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'team_production_goals', filter: `user_id=eq.${user?.id}` }, (payload) => {
            console.log('Team Production Goal Change (Realtime):', payload);
            toast.info(`🎯 Meta de produção da equipe atualizada em tempo real!`);
            const newGoalData: TeamProductionGoal = {
                id: payload.new.id,
                user_id: payload.new.user_id,
                target_team_size: payload.new.target_team_size,
                target_production_value: parseFloat(payload.new.target_production_value),
                start_date: payload.new.start_date,
                end_date: payload.new.end_date,
                created_at: payload.new.created_at,
                updated_at: payload.new.updated_at,
            };

            if (payload.eventType === 'INSERT') {
                setTeamProductionGoals(prev => [...prev, newGoalData]);
            } else if (payload.eventType === 'UPDATE') {
                setTeamProductionGoals(prev => prev.map(goal => goal.id === newGoalData.id ? newGoalData : goal));
            } else if (payload.eventType === 'DELETE') {
                setTeamProductionGoals(prev => prev.filter(goal => goal.id !== payload.old.id));
            }
        })
        .subscribe();

    return () => {
        supabase.removeChannel(candidatesChannel);
        supabase.removeChannel(leadsChannel);
        supabase.removeChannel(tasksChannel);
        supabase.removeChannel(gestorTasksChannel);
        supabase.removeChannel(gestorTaskCompletionsChannel);
        supabase.removeChannel(financialEntriesChannel);
        supabase.removeChannel(formCadastrosChannel);
        supabase.removeChannel(formFilesChannel);
        supabase.removeChannel(notificationsChannel); 
        supabase.removeChannel(teamProductionGoalsChannel); 
    };
  }, [user, crmOwnerUserId]);

  useEffect(() => {
    calculateNotifications();
  }, [teamMembers, formCadastros, crmLeads, onboardingSessions, calculateNotifications]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Candidate functions
  const addCandidate = useCallback(async (candidate: Omit<Candidate, 'id' | 'createdAt' | 'db_id'>) => { 
    if (!user) throw new Error("Usuário não autenticado."); 
    
    const clientSideId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const lastUpdatedAt = new Date().toISOString();

    const newCandidateData: Candidate = { 
      ...candidate, 
      id: clientSideId,
      status: candidate.status || 'Triagem', 
      screeningStatus: candidate.screeningStatus || 'Pending Contact',
      createdAt: createdAt, 
      lastUpdatedAt: lastUpdatedAt, 
      interviewScores: candidate.interviewScores || { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' },
      checkedQuestions: candidate.checkedQuestions || {},
      checklistProgress: candidate.checklistProgress || {},
      consultantGoalsProgress: candidate.consultantGoalsProgress || {},
      feedbacks: candidate.feedbacks || [],
      data: candidate.data || {},
    };

    const { data, error } = await supabase.from('candidates').insert({ 
      user_id: JOAO_GESTOR_AUTH_ID, 
      data: newCandidateData,
      last_updated_at: newCandidateData.lastUpdatedAt 
    }).select('id', 'created_at', 'last_updated_at').single(); 
    
    if (error) { 
      console.error("Erro ao adicionar candidato no Supabase:", error); 
      toast.error("Erro ao adicionar candidato."); 
      throw error; 
    } 
    
    if (data) { 
      const finalCandidate = {
        ...newCandidateData, 
        db_id: data.id,
        createdAt: data.created_at,
        lastUpdatedAt: data.last_updated_at 
      };
      setCandidates(prev => [finalCandidate, ...prev]); 
      return finalCandidate; 
    } 
    return newCandidateData; 
  }, [user]);
  const updateCandidate = useCallback(async (id: string, updates: Partial<Candidate>) => { 
    if (!user) throw new Error("Usuário não autenticado."); 
    
    console.log(`[updateCandidate] ID passed: "${id}"`);

    const c = candidates.find(c => c.id === id); 
    if (!c || !c.db_id) {
      console.error(`[updateCandidate] Candidate with client-side ID "${id}" not found or missing db_id.`);
      throw new Error("Candidato não encontrado ou ID do banco de dados ausente."); 
    }
    
    console.log(`[updateCandidate] Found candidate (original name): "${c.name}", client-side ID: "${c.id}", db_id: "${c.db_id}"`);
    console.log(`[updateCandidate] Updates object:`, updates);

    const mergedCandidateData: Candidate = {
      ...c,
      ...updates,
      interviewScores: updates.interviewScores 
        ? { ...c.interviewScores, ...updates.interviewScores } 
        : c.interviewScores,
      checkedQuestions: updates.checkedQuestions 
        ? { ...c.checkedQuestions, ...updates.checkedQuestions } 
        : c.checkedQuestions,
      checklistProgress: updates.checklistProgress 
        ? { ...c.checklistProgress, ...updates.checklistProgress } 
        : c.checklistProgress,
      consultantGoalsProgress: updates.consultantGoalsProgress 
        ? { ...c.consultantGoalsProgress, ...updates.consultantGoalsProgress } 
        : c.consultantGoalsProgress,
      feedbacks: updates.feedbacks 
        ? [...(c.feedbacks || []), ...(updates.feedbacks || [])] 
        : c.feedbacks,
      data: updates.data 
        ? { ...c.data, ...updates.data } 
        : c.data,
      
      lastUpdatedAt: new Date().toISOString(), 
    };
    
    console.log(`[updateCandidate] Merged updated candidate name (mergedCandidateData.name): "${mergedCandidateData.name}"`);

    const finalDataForSupabase = { ...mergedCandidateData };
    delete finalDataForSupabase.db_id;
    delete finalDataForSupabase.createdAt;
    delete finalDataForSupabase.lastUpdatedAt;

    const { error } = await supabase.from('candidates').update({ 
      data: finalDataForSupabase, 
      last_updated_at: mergedCandidateData.lastUpdatedAt 
    }).match({ id: c.db_id, user_id: JOAO_GESTOR_AUTH_ID }); 
    if (error) { console.error(error); toast.error("Erro ao atualizar candidato."); throw error; } 
    
    setCandidates(prev => prev.map(p => {
      console.log(`[updateCandidate:setCandidates] Comparing p.id: "${p.id}" with target id: "${id}"`);
      if (p.id === id) {
        console.log(`[updateUpdate:setCandidates] MATCH! Updating candidate from "${p.name}" to "${mergedCandidateData.name}"`);
        return { ...mergedCandidateData, db_id: c.db_id, createdAt: c.createdAt };
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
      .eq('id', c.db_id)
      .eq('user_id', JOAO_GESTOR_AUTH_ID);

    if (error) {
      console.error(`[deleteCandidate] Erro ao excluir candidato "${c.name}" (DB_ID: "${c.db_id}"):`, error);
      toast.error("Erro ao excluir candidato.");
      throw error;
    }
    console.log(`[deleteCandidate] Candidato "${c.name}" (DB_ID: "${c.db_id}") excluído com sucesso.`);
    setCandidates(prev => prev.filter(p => p.id !== id));
  }, [user, candidates]);

  const toggleChecklistItem = useCallback(async (candidateId: string, itemId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) throw new Error("Candidato não encontrado.");
  
    const updatedProgress = { ...candidate.checklistProgress || {} };
    updatedProgress[itemId] = { ...updatedProgress[itemId], completed: !updatedProgress[itemId]?.completed };
  
    await updateCandidate(candidate.id, { checklistProgress: updatedProgress });
  }, [candidates, updateCandidate, user]);

  const setChecklistDueDate = useCallback(async (candidateId: string, itemId: string, dueDate: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) throw new Error("Candidato não encontrado.");
  
    const updatedProgress = { ...candidate.checklistProgress || {} };
    updatedProgress[itemId] = { ...updatedProgress[itemId], dueDate: dueDate || undefined };
  
    await updateCandidate(candidate.id, { checklistProgress: updatedProgress });
  }, [candidates, updateCandidate, user]);

  const toggleConsultantGoal = useCallback(async (candidateId: string, goalId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) throw new Error("Candidato não encontrado.");
  
    const updatedProgress = { ...candidate.consultantGoalsProgress || {} };
    updatedProgress[goalId] = !updatedProgress[goalId];
  
    await updateCandidate(candidate.id, { consultantGoalsProgress: updatedProgress });
  }, [candidates, updateCandidate, user]);

  // Checklist structure functions
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

  // Consultant goals functions
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

  // Interview structure functions
  const updateInterviewSection = useCallback((sectionId: string, updates: Partial<InterviewSection>) => {
    setInterviewStructure(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, ...updates }
        : section
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

  // Templates & origins
  const saveTemplate = useCallback((itemId: string, updates: Partial<CommunicationTemplate>) => {
    setTemplates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        id: itemId,
        label: updates.label || prev[itemId]?.label || '',
        text: updates.text !== undefined ? updates.text : prev[itemId]?.text,
        resource: updates.resource !== undefined ? updates.resource : prev[itemId]?.resource,
      }
    }));
    updateConfig({ templates });
  }, [templates, updateConfig]);

  const addOrigin = useCallback((newOrigin: string, type: 'sales' | 'hiring') => {
    if (type === 'sales') {
      setSalesOrigins(prev => {
        const updated = [...prev, newOrigin];
        updateConfig({ salesOrigins: updated });
        return updated;
      });
    } else {
      setHiringOrigins(prev => {
        const updated = [...prev, newOrigin];
        updateConfig({ hiringOrigins: updated });
        return updated;
      });
    }
  }, [updateConfig]);

  const deleteOrigin = useCallback((originToDelete: string, type: 'sales' | 'hiring') => {
    if (type === 'sales') {
      setSalesOrigins(prev => {
        const updated = prev.filter(o => o !== originToDelete);
        updateConfig({ salesOrigins: updated });
        return updated;
      });
    } else {
      setHiringOrigins(prev => {
        const updated = prev.filter(o => o !== originToDelete);
        updateConfig({ hiringOrigins: updated });
        return updated;
      });
    }
  }, [updateConfig]);

  const resetOriginsToDefault = useCallback(() => {
    setHiringOrigins(DEFAULT_APP_CONFIG_DATA.hiringOrigins);
    setSalesOrigins(DEFAULT_APP_CONFIG_DATA.salesOrigins);
    updateConfig({ 
      hiringOrigins: DEFAULT_APP_CONFIG_DATA.hiringOrigins,
      salesOrigins: DEFAULT_APP_CONFIG_DATA.salesOrigins,
    });
  }, [updateConfig]);

  const addPV = useCallback((newPV: string) => {
    setPvs(prev => {
      const updated = [...prev, newPV];
      updateConfig({ pvs: updated });
      return updated;
    });
  }, [updateConfig]);

  // Commission functions
  const addCommission = useCallback(async (commission: Omit<Commission, 'id' | 'db_id' | 'criado_em'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const tempId = `temp_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();

    const newCommission: Commission = {
      ...commission,
      id: tempId,
      criado_em: createdAt,
      db_id: undefined, // Ensure db_id is undefined for new items
      _synced: false,
    };

    setCommissions(prev => [newCommission, ...prev]);

    try {
      const payload = { user_id: JOAO_GESTOR_AUTH_ID, data: commission };
      const { data, error } = await supabase.from('commissions').insert(payload).select('id', 'created_at').maybeSingle();
      if (error) throw error;

      setCommissions(prev => prev.map(c => c.id === tempId ? { ...c, id: tempId, db_id: data.id, criado_em: data.created_at, _synced: true } : c));
      return { success: true };
    } catch (error) {
      console.error("Failed to add commission to Supabase:", error);
      setCommissions(prev => prev.map(c => c.id === tempId ? { ...c, _synced: false } : c));
      throw error;
    }
  }, [user]);

  const updateCommission = useCallback(async (id: string, updates: Partial<Commission>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const commission = commissions.find(c => c.id === id);
    if (!commission || !commission.db_id) throw new Error("Comissão não encontrada ou ID do banco de dados ausente.");

    const updatedCommission = { ...commission, ...updates };
    updatedCommission.status = getOverallStatus(updatedCommission.installmentDetails);

    const payload = { data: updatedCommission };
    const { error } = await supabase.from('commissions').update(payload).match({ id: commission.db_id, user_id: JOAO_GESTOR_AUTH_ID });
    if (error) throw error;
    setCommissions(prev => prev.map(c => c.id === id ? updatedCommission : c));
  }, [user, commissions]);

  const deleteCommission = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const commission = commissions.find(c => c.id === id);
    if (!commission || !commission.db_id) throw new Error("Comissão não encontrada ou ID do banco de dados ausente.");

    const { error } = await supabase.from('commissions').delete().match({ id: commission.db_id, user_id: JOAO_GESTOR_AUTH_ID });
    if (error) throw error;
    setCommissions(prev => prev.filter(c => c.id !== id));
  }, [user, commissions]);

  const updateInstallmentStatus = useCallback(async (commissionId: string, installmentNumber: number, newStatus: InstallmentStatus, paidDate?: string, saleType?: 'Imóvel' | 'Veículo') => {
    if (!user) throw new Error("Usuário não autenticado.");
    const commission = commissions.find(c => c.id === commissionId);
    if (!commission || !commission.db_id) throw new Error("Comissão não encontrada.");

    const updatedInstallmentDetails = { ...commission.installmentDetails };
    const competenceMonth = paidDate ? calculateCompetenceMonth(paidDate) : undefined;

    updatedInstallmentDetails[installmentNumber.toString()] = {
      status: newStatus,
      paidDate: paidDate || updatedInstallmentDetails[installmentNumber.toString()]?.paidDate,
      competenceMonth: competenceMonth || updatedInstallmentDetails[installmentNumber.toString()]?.competenceMonth,
    };

    const updatedCommission = {
      ...commission,
      installmentDetails: updatedInstallmentDetails,
      status: getOverallStatus(updatedInstallmentDetails),
    };

    const payload = { data: updatedCommission };
    const { error } = await supabase.from('commissions').update(payload).match({ id: commission.db_id, user_id: JOAO_GESTOR_AUTH_ID });
    if (error) throw error;
    setCommissions(prev => prev.map(c => c.id === commissionId ? updatedCommission : c));
  }, [user, commissions, calculateCompetenceMonth]);

  // Cutoff period functions
  const addCutoffPeriod = useCallback(async (period: Omit<CutoffPeriod, 'id' | 'db_id'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('cutoff_periods').insert({ user_id: JOAO_GESTOR_AUTH_ID, data: period }).select('id').single();
    if (error) throw error;
    const newPeriod = { ...period, id: crypto.randomUUID(), db_id: data.id };
    setCutoffPeriods(prev => [...prev, newPeriod]);
  }, [user]);

  const updateCutoffPeriod = useCallback(async (id: string, updates: Partial<CutoffPeriod>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const period = cutoffPeriods.find(p => p.id === id);
    if (!period || !period.db_id) throw new Error("Período de corte não encontrado.");

    const updatedPeriod = { ...period, ...updates };
    const payload = { data: updatedPeriod };
    const { error } = await supabase.from('cutoff_periods').update(payload).match({ id: period.db_id, user_id: JOAO_GESTOR_AUTH_ID });
    if (error) throw error;
    setCutoffPeriods(prev => prev.map(p => p.id === id ? updatedPeriod : p));
  }, [user, cutoffPeriods]);

  const deleteCutoffPeriod = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const period = cutoffPeriods.find(p => p.id === id);
    if (!period || !period.db_id) throw new Error("Período de corte não encontrado.");

    const { error } = await supabase.from('cutoff_periods').delete().match({ id: period.db_id, user_id: JOAO_GESTOR_AUTH_ID });
    if (error) throw error;
    setCutoffPeriods(prev => prev.filter(p => p.id !== id));
  }, [user, cutoffPeriods]);

  // Onboarding functions
  const addOnlineOnboardingSession = useCallback(async (consultantName: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    if (onboardingTemplateVideos.length === 0) throw new Error("Adicione vídeos ao template padrão primeiro.");

    const { data: sessionData, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .insert({ user_id: JOAO_GESTOR_AUTH_ID, consultant_name: consultantName })
      .select('*')
      .single();

    if (sessionError) throw sessionError;

    const videosToInsert = onboardingTemplateVideos.map(template => ({
      session_id: sessionData.id,
      title: template.title,
      video_url: template.video_url,
      order: template.order,
      is_completed: false,
    }));

    const { error: videosError } = await supabase
      .from('onboarding_videos')
      .insert(videosToInsert);

    if (videosError) throw videosError;

    const newSession: OnboardingSession = { ...sessionData, videos: videosToInsert as OnboardingVideo[] };
    setOnboardingSessions(prev => [...prev, newSession]);
  }, [user, onboardingTemplateVideos]);

  const deleteOnlineOnboardingSession = useCallback(async (sessionId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('onboarding_sessions').delete().eq('id', sessionId).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) throw error;
    setOnboardingSessions(prev => prev.filter(s => s.id !== sessionId));
  }, [user]);

  const addVideoToTemplate = useCallback(async (title: string, video_url: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const newOrder = onboardingTemplateVideos.length > 0 ? Math.max(...onboardingTemplateVideos.map(v => v.order)) + 1 : 0;
    const { data, error } = await supabase
      .from('onboarding_video_templates')
      .insert({ user_id: JOAO_GESTOR_AUTH_ID, title, video_url, order: newOrder })
      .select('*')
      .single();
    if (error) throw error;
    setOnboardingTemplateVideos(prev => [...prev, data].sort((a, b) => a.order - b.order));
  }, [user, onboardingTemplateVideos]);

  const deleteVideoFromTemplate = useCallback(async (videoId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('onboarding_video_templates').delete().eq('id', videoId).eq('user_id', JOAO_GESTOR_AUTH_ID);
    if (error) throw error;
    setOnboardingTemplateVideos(prev => prev.filter(v => v.id !== videoId));
  }, [user]);

  // CRM functions
  const addCrmPipeline = useCallback(async (name: string) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { data, error } = await supabase.from('crm_pipelines').insert({ user_id: crmOwnerUserId, name, is_active: true }).select('*').single();
    if (error) throw error;
    setCrmPipelines(prev => [...prev, data]);
    return data;
  }, [user, crmOwnerUserId]);

  const updateCrmPipeline = useCallback(async (id: string, updates: Partial<CrmPipeline>) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { data, error } = await supabase.from('crm_pipelines').update(updates).eq('id', id).eq('user_id', crmOwnerUserId).select('*').single();
    if (error) throw error;
    setCrmPipelines(prev => prev.map(p => p.id === id ? data : p));
    return data;
  }, [user, crmOwnerUserId]);

  const deleteCrmPipeline = useCallback(async (id: string) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { error } = await supabase.from('crm_pipelines').delete().eq('id', id).eq('user_id', crmOwnerUserId);
    if (error) throw error;
    setCrmPipelines(prev => prev.filter(p => p.id !== id));
  }, [user, crmOwnerUserId]);

  const addCrmStage = useCallback(async (stage: Omit<CrmStage, 'id' | 'user_id' | 'created_at'>) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { data, error } = await supabase.from('crm_stages').insert({ user_id: crmOwnerUserId, ...stage }).select('*').single();
    if (error) throw error;
    setCrmStages(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index));
    return data;
  }, [user, crmOwnerUserId]);

  const updateCrmStage = useCallback(async (id: string, updates: Partial<CrmStage>) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { data, error } = await supabase.from('crm_stages').update(updates).eq('id', id).eq('user_id', crmOwnerUserId).select('*').single();
    if (error) throw error;
    setCrmStages(prev => prev.map(s => s.id === id ? data : s).sort((a, b) => a.order_index - b.order_index));
    return data;
  }, [user, crmOwnerUserId]);

  const updateCrmStageOrder = useCallback(async (orderedStages: CrmStage[]) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const updates = orderedStages.map((stage, index) => ({
      id: stage.id,
      order_index: index,
    }));
    const { error } = await supabase.from('crm_stages').upsert(updates, { onConflict: 'id' });
    if (error) throw error;
    setCrmStages(prev => {
      const updated = prev.map(s => {
        const newOrder = updates.find(u => u.id === s.id)?.order_index;
        return newOrder !== undefined ? { ...s, order_index: newOrder } : s;
      });
      return updated.sort((a, b) => a.order_index - b.order_index);
    });
  }, [user, crmOwnerUserId]);

  const deleteCrmStage = useCallback(async (id: string) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { error } = await supabase.from('crm_stages').delete().eq('id', id).eq('user_id', crmOwnerUserId);
    if (error) throw error;
    setCrmStages(prev => prev.filter(s => s.id !== id));
  }, [user, crmOwnerUserId]);

  const addCrmField = useCallback(async (field: Omit<CrmField, 'id' | 'user_id' | 'created_at'>) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { data, error } = await supabase.from('crm_fields').insert({ user_id: crmOwnerUserId, ...field }).select('*').single();
    if (error) throw error;
    setCrmFields(prev => [...prev, data]);
    return data;
  }, [user, crmOwnerUserId]);

  const updateCrmField = useCallback(async (id: string, updates: Partial<CrmField>) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { data, error } = await supabase.from('crm_fields').update(updates).eq('id', id).eq('user_id', crmOwnerUserId).select('*').single();
    if (error) throw error;
    setCrmFields(prev => prev.map(f => f.id === id ? data : f));
    return data;
  }, [user, crmOwnerUserId]);

  const addCrmLead = useCallback(async (lead: Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by' | 'updated_by'>) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    
    const defaultStage = crmStages.find(s => s.pipeline_id === crmPipelines.find(p => p.is_active)?.id);
    if (!defaultStage) throw new Error("Nenhuma etapa de pipeline ativa encontrada. Configure as etapas do CRM.");

    const payload = {
      name: lead.name,
      consultant_id: lead.consultant_id || user.id, 
      stage_id: lead.stage_id || defaultStage.id,
      user_id: crmOwnerUserId,
      created_by: user.id,
      data: lead.data,
      proposal_value: lead.proposalValue, 
      proposal_closing_date: lead.proposalClosingDate, 
      sold_credit_value: lead.soldCreditValue, 
      sold_group: lead.soldGroup, 
      sold_quota: lead.soldQuota, 
      sale_date: lead.saleDate, 
    };

    const { data, error } = await supabase.from('crm_leads').insert(payload).select('*').single();
    if (error) throw error;
    setCrmLeads(prev => [data, ...prev]);
    return data;
  }, [user, crmOwnerUserId, crmStages, crmPipelines]);

  const updateCrmLead = useCallback(async (id: string, updates: Partial<CrmLead>) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const lead = crmLeads.find(l => l.id === id);
    if (!lead) throw new Error("Lead não encontrado.");

    const payload = {
      name: updates.name,
      consultant_id: updates.consultant_id,
      stage_id: updates.stage_id,
      data: updates.data,
      proposal_value: updates.proposalValue, 
      proposal_closing_date: updates.proposalClosingDate, 
      sold_credit_value: updates.soldCreditValue, 
      sold_group: updates.soldGroup, 
      sold_quota: updates.soldQuota, 
      sale_date: updates.saleDate, 
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('crm_leads').update(payload).eq('id', id).eq('user_id', crmOwnerUserId).select('*').single();
    if (error) throw error;
    setCrmLeads(prev => prev.map(l => l.id === id ? data : l));
    return data;
  }, [user, crmOwnerUserId, crmLeads]);

  const deleteCrmLead = useCallback(async (id: string) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { error } = await supabase.from('crm_leads').delete().eq('id', id).eq('user_id', crmOwnerUserId);
    if (error) throw error;
    setCrmLeads(prev => prev.filter(l => l.id !== id));
  }, [user, crmOwnerUserId]);

  // Daily Checklist functions
  const addDailyChecklist = useCallback(async (title: string) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { data, error } = await supabase.from('daily_checklists').insert({ user_id: crmOwnerUserId, title, is_active: true }).select('*').single();
    if (error) throw error;
    setDailyChecklists(prev => [...prev, data]);
    return data;
  }, [user, crmOwnerUserId]);

  const updateDailyChecklist = useCallback(async (id: string, updates: Partial<DailyChecklist>) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { data, error } = await supabase.from('daily_checklists').update(updates).eq('id', id).eq('user_id', crmOwnerUserId).select('*').single();
    if (error) throw error;
    setDailyChecklists(prev => prev.map(c => c.id === id ? data : c));
    return data;
  }, [user, crmOwnerUserId]);

  const deleteDailyChecklist = useCallback(async (id: string) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { error } = await supabase.from('daily_checklists').delete().eq('id', id).eq('user_id', crmOwnerUserId);
    if (error) throw error;
    setDailyChecklists(prev => prev.filter(c => c.id !== id));
  }, [user, crmOwnerUserId]);

  const addDailyChecklistItem = useCallback(async (daily_checklist_id: string, text: string, order_index: number, resource?: DailyChecklistItemResource, audioFile?: File, imageFile?: File) => {
    if (!user) throw new Error("Usuário não autenticado.");

    let contentToSave: string | { text: string; audioUrl: string; imageUrl?: string; } = '';
    let resourceName = resource?.name;
    let audioUrl: string | undefined = undefined;
    let imageUrl: string | undefined = undefined;

    // Handle audio file upload
    if (audioFile) {
      const audioFilePath = `checklist_resources/${daily_checklist_id}/${crypto.randomUUID()}-${sanitizeFilename(audioFile.name)}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app_files')
        .upload(audioFilePath, audioFile, { contentType: audioFile.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('app_files').getPublicUrl(audioFilePath);
      audioUrl = publicUrlData.publicUrl;
      if (!resourceName) resourceName = audioFile.name;
    }

    // Handle image file upload
    if (imageFile) {
      const imageFilePath = `checklist_resources/${daily_checklist_id}/${crypto.randomUUID()}-${sanitizeFilename(imageFile.name)}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app_files')
        .upload(imageFilePath, imageFile, { contentType: imageFile.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('app_files').getPublicUrl(imageFilePath);
      imageUrl = publicUrlData.publicUrl;
      if (!resourceName) resourceName = imageFile.name;
    }

    // Determine final content to save based on resource type and uploaded URLs
    if (resource) {
      switch (resource.type) {
        case 'text':
        case 'link':
        case 'video':
        case 'audio':
        case 'image':
        case 'pdf':
          contentToSave = (audioUrl || imageUrl || resource.content) as string;
          break;
        case 'text_audio':
          contentToSave = {
            text: (resource.content as { text: string; audioUrl: string; }).text,
            audioUrl: audioUrl || (resource.content as { text: string; audioUrl: string; }).audioUrl,
          };
          break;
        case 'text_audio_image':
          contentToSave = {
            text: (resource.content as { text: string; audioUrl?: string; imageUrl?: string; }).text,
            audioUrl: audioUrl || (resource.content as { text: string; audioUrl?: string; imageUrl?: string; }).audioUrl,
            imageUrl: imageUrl || (resource.content as { text: string; audioUrl?: string; imageUrl?: string; }).imageUrl,
          };
          break;
        default:
          contentToSave = '';
      }
    }

    const finalResource = resource ? { ...resource, content: contentToSave, name: resourceName } : undefined;

    const { data, error } = await supabase.from('daily_checklist_items').insert({ daily_checklist_id, text, order_index, is_active: true, resource: finalResource }).select('*').single();
    if (error) throw error;
    setDailyChecklistItems(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index));
    return data;
  }, [user]);

  const updateDailyChecklistItem = useCallback(async (id: string, updates: Partial<DailyChecklistItem>, audioFile?: File, imageFile?: File) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const item = dailyChecklistItems.find(i => i.id === id);
    if (!item) throw new Error("Item do checklist não encontrado.");

    let contentToSave: string | { text: string; audioUrl: string; imageUrl?: string; } = '';
    let resourceName = updates.resource?.name || item.resource?.name;

    // Preserve existing content if not explicitly updated
    let existingAudioUrl = (item.resource?.type === 'text_audio' || item.resource?.type === 'text_audio_image') ? (item.resource.content as any).audioUrl : (item.resource?.type === 'audio' ? item.resource.content : undefined);
    let existingImageUrl = (item.resource?.type === 'text_audio_image') ? (item.resource.content as any).imageUrl : (item.resource?.type === 'image' ? item.resource.content : undefined);
    let existingTextContent = (item.resource?.type === 'text_audio' || item.resource?.type === 'text_audio_image') ? (item.resource.content as any).text : (item.resource?.type === 'text' ? item.resource.content : undefined);
    let existingLinkVideoContent = (item.resource?.type === 'link' || item.resource?.type === 'video') ? item.resource.content : undefined;

    let audioUrl: string | undefined = undefined;
    let imageUrl: string | undefined = undefined;

    // Handle audio file upload
    if (audioFile) {
      const audioFilePath = `checklist_resources/${item.daily_checklist_id}/${crypto.randomUUID()}-${sanitizeFilename(audioFile.name)}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app_files')
        .upload(audioFilePath, audioFile, { contentType: audioFile.type, upsert: true });
      if (uploadError) throw uploadError;
      audioUrl = uploadData.path; // Use path for now, get public URL later
      if (!resourceName) resourceName = audioFile.name;
    }

    // Handle image file upload
    if (imageFile) {
      const imageFilePath = `checklist_resources/${item.daily_checklist_id}/${crypto.randomUUID()}-${sanitizeFilename(imageFile.name)}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app_files')
        .upload(imageFilePath, imageFile, { contentType: imageFile.type, upsert: true });
      if (uploadError) throw uploadError;
      imageUrl = uploadData.path; // Use path for now, get public URL later
      if (!resourceName) resourceName = imageFile.name;
    }

    // Determine final content to save based on resource type and uploaded URLs
    const newResourceType = updates.resource?.type !== undefined ? updates.resource.type : item.resource?.type;

    if (newResourceType) {
      switch (newResourceType) {
        case 'text':
          contentToSave = updates.resource?.content as string || existingTextContent || '';
          break;
        case 'link':
        case 'video':
          contentToSave = updates.resource?.content as string || existingLinkVideoContent || '';
          break;
        case 'audio':
        case 'image':
        case 'pdf':
          contentToSave = (audioFile || imageFile) ? (audioFile ? audioUrl : imageUrl) : (updates.resource?.content as string || item.resource?.content as string || '');
          break;
        case 'text_audio':
          contentToSave = {
            text: (updates.resource?.content as { text: string; audioUrl: string; })?.text || existingTextContent || '',
            audioUrl: (audioFile ? audioUrl : (updates.resource?.content as { text: string; audioUrl: string; })?.audioUrl || existingAudioUrl) || '',
          };
          break;
        case 'text_audio_image':
          contentToSave = {
            text: (updates.resource?.content as { text: string; audioUrl?: string; imageUrl?: string; })?.text || existingTextContent || '',
            audioUrl: (audioFile ? audioUrl : (updates.resource?.content as { text: string; audioUrl?: string; imageUrl?: string; })?.audioUrl || existingAudioUrl) || '',
            imageUrl: (imageFile ? imageUrl : (updates.resource?.content as { text: string; audioUrl?: string; imageUrl?: string; })?.imageUrl || existingImageUrl) || '',
          };
          break;
        default:
          contentToSave = '';
      }
    }

    const finalResource: DailyChecklistItemResource | undefined = newResourceType && newResourceType !== 'none' ? {
      type: newResourceType,
      content: contentToSave,
      name: resourceName,
    } : undefined;

    const { data, error } = await supabase.from('daily_checklist_items').update({ ...updates, resource: finalResource }).eq('id', id).select('*').single();
    if (error) throw error;
    setDailyChecklistItems(prev => prev.map(i => i.id === id ? data : i).sort((a, b) => a.order_index - b.order_index));
    return data;
  }, [user, dailyChecklistItems]);

  const deleteDailyChecklistItem = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('daily_checklist_items').delete().eq('id', id);
    if (error) throw error;
    setDailyChecklistItems(prev => prev.filter(i => i.id !== id));
  }, [user]);

  const moveDailyChecklistItem = useCallback(async (checklistId: string, itemId: string, direction: 'up' | 'down') => {
    if (!user) throw new Error("Usuário não autenticado.");
    const items = dailyChecklistItems.filter(i => i.daily_checklist_id === checklistId).sort((a, b) => a.order_index - b.order_index);
    const index = items.findIndex(item => item.id === itemId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const itemToMove = items[index];
    const itemToSwap = items[newIndex];

    const updates = [
      { id: itemToMove.id, order_index: itemToSwap.order_index },
      { id: itemToSwap.id, order_index: itemToMove.order_index },
    ];

    const { error } = await supabase.from('daily_checklist_items').upsert(updates, { onConflict: 'id' });
    if (error) throw error;

    setDailyChecklistItems(prev => {
      const updated = prev.map(i => {
        const update = updates.find(u => u.id === i.id);
        return update ? { ...i, order_index: update.order_index } : i;
      });
      return updated.sort((a, b) => a.order_index - b.order_index);
    });
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
      c.consultant_id === consultant_id && 
      c.date === date
    );

    if (existingCompletion) {
      const { data, error } = await supabase.from('daily_checklist_completions').update({ done, updated_at: new Date().toISOString() }).eq('id', existingCompletion.id).select('*').single();
      if (error) throw error;
      setDailyChecklistCompletions(prev => prev.map(c => c.id === existingCompletion.id ? data : c));
    } else {
      const { data, error } = await supabase.from('daily_checklist_completions').insert({ daily_checklist_item_id, consultant_id, date, done }).select('*').single();
      if (error) throw error;
      setDailyChecklistCompletions(prev => [...prev, data]);
    }
  }, [user, dailyChecklistCompletions]);

  // Weekly target functions
  const addWeeklyTarget = useCallback(async (target: Omit<WeeklyTarget, 'id' | 'user_id' | 'created_at'>) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { data, error } = await supabase.from('weekly_targets').insert({ user_id: crmOwnerUserId, ...target }).select('*').single();
    if (error) throw error;
    setWeeklyTargets(prev => [...prev, data]);
    return data;
  }, [user, crmOwnerUserId]);

  const updateWeeklyTarget = useCallback(async (id: string, updates: Partial<WeeklyTarget>) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { data, error } = await supabase.from('weekly_targets').update(updates).eq('id', id).eq('user_id', crmOwnerUserId).select('*').single();
    if (error) throw error;
    setWeeklyTargets(prev => prev.map(t => t.id === id ? data : t));
    return data;
  }, [user, crmOwnerUserId]);

  const deleteWeeklyTarget = useCallback(async (id: string) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { error } = await supabase.from('weekly_targets').delete().eq('id', id).eq('user_id', crmOwnerUserId);
    if (error) throw error;
    setWeeklyTargets(prev => prev.filter(t => t.id !== id));
  }, [user, crmOwnerUserId]);

  const addWeeklyTargetItem = useCallback(async (item: Omit<WeeklyTargetItem, 'id' | 'created_at'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('weekly_target_items').insert(item).select('*').single();
    if (error) throw error;
    setWeeklyTargetItems(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index));
    return data;
  }, [user]);

  const updateWeeklyTargetItem = useCallback(async (id: string, updates: Partial<WeeklyTargetItem>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('weekly_target_items').update(updates).eq('id', id).select('*').single();
    if (error) throw error;
    setWeeklyTargetItems(prev => prev.map(i => i.id === id ? data : i).sort((a, b) => a.order_index - b.order_index));
    return data;
  }, [user]);

  const deleteWeeklyTargetItem = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('weekly_target_items').delete().eq('id', id);
    if (error) throw error;
    setWeeklyTargetItems(prev => prev.filter(i => i.id !== id));
  }, [user]);

  const updateWeeklyTargetItemOrder = useCallback(async (orderedItems: WeeklyTargetItem[]) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const updates = orderedItems.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));
    const { error } = await supabase.from('weekly_target_items').upsert(updates, { onConflict: 'id' });
    if (error) throw error;
    setWeeklyTargetItems(prev => {
      const updated = prev.map(i => {
        const update = updates.find(u => u.id === i.id);
        return update ? { ...i, order_index: update.order_index } : i;
      });
      return updated.sort((a, b) => a.order_index - b.order_index);
    });
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
    setMetricLogs(prev => prev.map(l => l.id === id ? data : l));
    return data;
  }, [user]);

  const deleteMetricLog = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('metric_logs').delete().eq('id', id);
    if (error) throw error;
    setMetricLogs(prev => prev.filter(l => l.id !== id));
  }, [user]);

  // Support materials V2 functions
  const addSupportMaterialV2 = useCallback(async (material: Omit<SupportMaterialV2, 'id' | 'user_id' | 'created_at'>, file?: File) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");

    let content = material.content;
    if (file) {
      const filePath = `support_materials/${crmOwnerUserId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app_files')
        .upload(filePath, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('app_files').getPublicUrl(filePath);
      content = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase.from('support_materials_v2').insert({ user_id: crmOwnerUserId, ...material, content }).select('*').single();
    if (error) throw error;
    setSupportMaterialsV2(prev => [...prev, data]);
    return data;
  }, [user, crmOwnerUserId]);

  const updateSupportMaterialV2 = useCallback(async (id: string, updates: Partial<SupportMaterialV2>, file?: File) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");

    let content = updates.content;
    if (file) {
      const filePath = `support_materials/${crmOwnerUserId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app_files')
        .upload(filePath, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('app_files').getPublicUrl(filePath);
      content = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase.from('support_materials_v2').update({ ...updates, content }).eq('id', id).eq('user_id', crmOwnerUserId).select('*').single();
    if (error) throw error;
    setSupportMaterialsV2(prev => prev.map(m => m.id === id ? data : m));
    return data;
  }, [user, crmOwnerUserId]);

  const deleteSupportMaterialV2 = useCallback(async (id: string) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { error } = await supabase.from('support_materials_v2').delete().eq('id', id).eq('user_id', crmOwnerUserId);
    if (error) throw error;
    setSupportMaterialsV2(prev => prev.filter(m => m.id !== id));
  }, [user, crmOwnerUserId]);

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

  // Lead task functions
  const addLeadTask = useCallback(async (task: Omit<LeadTask, 'id' | 'created_at' | 'completed_at' | 'updated_at'> & { user_id: string; manager_id?: string | null; }) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('lead_tasks').insert({ ...task, user_id: task.user_id, manager_id: task.manager_id }).select('*').single();
    if (error) throw error;
    setLeadTasks(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateLeadTask = useCallback(async (id: string, updates: Partial<LeadTask> & { user_id?: string; manager_id?: string | null; }) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('lead_tasks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (error) throw error;
    setLeadTasks(prev => prev.map(t => t.id === id ? data : t));
    return data;
  }, [user]);

  const deleteLeadTask = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('lead_tasks').delete().eq('id', id);
    if (error) throw error;
    setLeadTasks(prev => prev.filter(t => t.id !== id));
  }, [user]);

  const toggleLeadTaskCompletion = useCallback(async (id: string, is_completed: boolean) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const completed_at = is_completed ? new Date().toISOString() : null;
    const { data, error } = await supabase.from('lead_tasks').update({ is_completed, completed_at, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (error) throw error;
    setLeadTasks(prev => prev.map(t => t.id === id ? data : t));
    return data;
  }, [user]);

  const updateLeadMeetingInvitationStatus = useCallback(async (taskId: string, status: 'accepted' | 'declined') => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('lead_tasks').update({ manager_invitation_status: status, updated_at: new Date().toISOString() }).eq('id', taskId).select('*').single();
    if (error) throw error;
    setLeadTasks(prev => prev.map(t => t.id === taskId ? data : t));
    return data;
  }, [user]);

  // Gestor task functions
  const addGestorTask = useCallback(async (task: Omit<GestorTask, 'id' | 'user_id' | 'created_at' | 'is_completed'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('gestor_tasks').insert({ user_id: user.id, is_completed: false, ...task }).select('*').single();
    if (error) throw error;
    setGestorTasks(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateGestorTask = useCallback(async (id: string, updates: Partial<GestorTask>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('gestor_tasks').update(updates).eq('id', id).eq('user_id', user.id).select('*').single();
    if (error) throw error;
    setGestorTasks(prev => prev.map(t => t.id === id ? data : t));
    return data;
  }, [user]);

  const deleteGestorTask = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('gestor_tasks').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    setGestorTasks(prev => prev.filter(t => t.id !== id));
  }, [user]);

  const toggleGestorTaskCompletion = useCallback(async (gestor_task_id: string, done: boolean, date: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    
    const existingCompletion = gestorTaskCompletions.find(c => 
      c.gestor_task_id === gestor_task_id && 
      c.user_id === user.id && 
      c.date === date
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

  // Financial entry functions
  const addFinancialEntry = useCallback(async (entry: Omit<FinancialEntry, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data, error } = await supabase.from('financial_entries').insert({ user_id: user.id, ...entry }).select('*').single();
    if (error) throw error;
    setFinancialEntries(prev => [...prev, data]);
    return data;
  }, [user]);

  const updateFinancialEntry = useCallback(async (id: string, updates: Partial<FinancialEntry>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    
    const { db_id, id: entryId, created_at, user_id, ...cleanUpdates } = updates as any;

    const { data, error } = await supabase
      .from('financial_entries')
      .update(cleanUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) throw error;
    setFinancialEntries(prev => prev.map(e => e.id === id ? { ...e, ...data, amount: parseFloat(data.amount) } : e));
    return data;
  }, [user]);

  const deleteFinancialEntry = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('financial_entries').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    setFinancialEntries(prev => prev.filter(e => e.id !== id));
  }, [user]);

  // Form cadastro functions
  const getFormFilesForSubmission = useCallback((submissionId: string) => {
    return formFiles.filter(f => f.submission_id === submissionId);
  }, [formFiles]);

  const updateFormCadastro = useCallback(async (id: string, updates: Partial<FormCadastro>) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { data, error } = await supabase.from('form_submissions').update(updates).eq('id', id).eq('user_id', crmOwnerUserId).select('*').single();
    if (error) throw error;
    setFormCadastros(prev => prev.map(c => c.id === id ? data : c));
    return data;
  }, [user, crmOwnerUserId]);

  const deleteFormCadastro = useCallback(async (id: string) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    
    const filesToDelete = formFiles.filter(f => f.submission_id === id);
    for (const file of filesToDelete) {
      const filePath = file.file_url.split('/form_uploads/')[1]; 
      if (filePath) {
        const { error: storageError } = await supabase.storage.from('form_uploads').remove([filePath]);
        if (storageError) console.error(`Error deleting file ${filePath} from storage:`, storageError);
      }
    }

    const { error: deleteFilesError } = await supabase.from('form_files').delete().eq('submission_id', id);
    if (deleteFilesError) console.error("Error deleting form_files records:", deleteFilesError);

    const { error } = await supabase.from('form_submissions').delete().eq('id', id).eq('user_id', crmOwnerUserId);
    if (error) throw error;
    setFormCadastros(prev => prev.filter(c => c.id !== id));
    setFormFiles(prev => prev.filter(f => f.submission_id !== id)); 
  }, [user, crmOwnerUserId, formFiles]);

  // Feedback functions
  const addFeedback = useCallback(async (personId: string, feedback: Omit<Feedback, 'id'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const candidate = candidates.find(c => c.id === personId);
    if (!candidate) throw new Error("Pessoa não encontrada.");

    const newFeedback: Feedback = { ...feedback, id: crypto.randomUUID() };
    const updatedFeedbacks = [...(candidate.feedbacks || []), newFeedback];

    await updateCandidate(candidate.id, { feedbacks: updatedFeedbacks });
    return newFeedback;
  }, [user, candidates, updateCandidate]);

  const updateFeedback = useCallback(async (personId: string, feedback: Feedback) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const candidate = candidates.find(c => c.id === personId);
    if (!candidate) throw new Error("Pessoa não encontrada.");

    const updatedFeedbacks = (candidate.feedbacks || []).map(f => f.id === feedback.id ? feedback : f);
    await updateCandidate(candidate.id, { feedbacks: updatedFeedbacks });
    return feedback;
  }, [user, candidates, updateCandidate]);

  const deleteFeedback = useCallback(async (personId: string, feedbackId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const candidate = candidates.find(c => c.id === personId);
    if (!candidate) throw new Error("Pessoa não encontrada.");

    const updatedFeedbacks = (candidate.feedbacks || []).filter(f => f.id !== feedbackId);
    await updateCandidate(candidate.id, { feedbacks: updatedFeedbacks });
  }, [user, candidates, updateCandidate]);

  const addTeamMemberFeedback = useCallback(async (teamMemberId: string, feedback: Omit<Feedback, 'id'>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const member = teamMembers.find(m => m.id === teamMemberId);
    if (!member || !member.db_id) throw new Error("Membro da equipe não encontrado.");

    const newFeedback: Feedback = { ...feedback, id: crypto.randomUUID() };
    const updatedFeedbacks = [...(member.feedbacks || []), newFeedback];
    const updatedData = { ...member.data, feedbacks: updatedFeedbacks };

    const { error } = await supabase
      .from('team_members')
      .update({ data: updatedData })
      .match({ id: member.db_id, user_id: JOAO_GESTOR_AUTH_ID });

    if (error) {
      console.error("Error adding team member feedback:", error);
      throw error;
    }
    setTeamMembers(prev => prev.map(m => m.id === teamMemberId ? { ...member, feedbacks: updatedFeedbacks } : m));
    return newFeedback;
  }, [user, teamMembers]);

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
      throw error;
    }
    setTeamMembers(prev => prev.map(m => m.id === teamMemberId ? { ...member, feedbacks: updatedFeedbacks } : m));
    return feedback;
  }, [user, teamMembers]);

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
      throw error;
    }
    setTeamMembers(prev => prev.map(m => m.id === teamMemberId ? { ...member, feedbacks: updatedFeedbacks } : m));
  }, [user, teamMembers]);

  const addTeamMember = useCallback(async (member: Omit<TeamMember, 'id'> & { email: string }) => {
    if (!user) throw new Error("Usuário não autenticado.");
  
    let authUserId: string;
    let tempPassword = '';
    let wasExistingUser = false;
  
    if (member.email) {
      tempPassword = generateRandomPassword();
      
      const cleanedCpf = member.cpf ? member.cpf.replace(/\D/g, '') : '';
      const last4Cpf = cleanedCpf.length >= 4 ? cleanedCpf.slice(-4) : null;
      
      if (!supabase.functions || typeof supabase.functions.invoke !== 'function') {
        console.error("[AppContext] Supabase functions client or invoke method is not available.");
        throw new Error("Serviço de funções Supabase não disponível.");
      }

      const { data, error: invokeError } = await supabase.functions.invoke('create-or-link-consultant', {
        body: {
          email: member.email,
          name: member.name,
          tempPassword: tempPassword,
          login: last4Cpf,
        },
      });

      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);

      authUserId = data.authUserId;
      wasExistingUser = data.userExists;

      const { error: teamMemberUpsertError } = await supabase
        .from('team_members')
        .upsert({
          id: authUserId,
          user_id: JOAO_GESTOR_AUTH_ID,
          data: {
            id: authUserId,
            name: member.name,
            email: member.email,
            roles: member.roles,
            isActive: member.isActive,
            hasLogin: true,
            isLegacy: false,
            dateOfBirth: member.dateOfBirth,
          },
          cpf: cleanedCpf,
        }, { onConflict: 'id' });

      if (teamMemberUpsertError) throw teamMemberUpsertError;

      const { data: updatedTeamMembersData, error: fetchError } = await supabase
        .from('team_members')
        .select('id, data, cpf, user_id'); // Fetch user_id here
      if (fetchError) console.error("Error refetching team members:", fetchError);
      else {
        const normalized = updatedTeamMembersData.map(item => {
          const data = item.data as any;
          const isAuthUserLinked = typeof data.id === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(data.id);
          return {
            id: isAuthUserLinked ? data.id : item.id, 
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
            user_id: item.user_id, // Set user_id
          } as TeamMember;
        });
        setTeamMembers(normalized);
      }

      return { success: true, member: { ...member, id: authUserId, hasLogin: true, tempPassword }, tempPassword, wasExistingUser };

    } else {
      throw new Error("E-mail é obrigatório para adicionar um membro da equipe.");
    }
  }, [user, JOAO_GESTOR_AUTH_ID]);

  const updateTeamMember = useCallback(async (id: string, updates: Partial<TeamMember>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const member = teamMembers.find(m => m.id === id); // 'id' here is the client-side ID (e.g., legacy_...)
    if (!member || !member.db_id) throw new Error("Membro da equipe não encontrado.");

    console.log(`[updateTeamMember] Attempting to update member: ${member.name} (Client-side ID: ${id}, DB_ID: ${member.db_id})`);
    console.log(`[updateTeamMember] Current member.user_id (owner): ${member.user_id}`);
    console.log(`[updateTeamMember] Current logged-in user.id: ${user.id}`);

    const updatedData = { ...member.data, ...updates }; // This updates the JSONB 'data' column
    const cleanedCpf = updates.cpf ? updates.cpf.replace(/\D/g, '') : member.cpf;

    let newAuthUserId: string | null = member.authUserId;

    // Special handling for legacy members to link them to auth.users.id
    if (member.isLegacy) {
      console.log(`[updateTeamMember] Migrating legacy member: ${member.name} (ID: ${member.id})`);
      // 1. Try to find the corresponding auth.users.id by email
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({ email: member.email });
      let existingAuthUser = authUsers?.users?.[0];

      if (authError) {
        console.error("[updateTeamMember] Error listing auth users:", authError);
        throw authError;
      }

      if (!existingAuthUser) {
        console.log("[updateTeamMember] No existing auth user found for legacy member. Creating one.");
        // If no auth user exists, create one (this is a bit aggressive for an update, but necessary for migration)
        const tempPassword = generateRandomPassword();
        const { data: newAuthUserData, error: createAuthError } = await supabase.auth.admin.createUser({
          email: member.email,
          password: tempPassword, // Temporary password
          email_confirm: true,
          user_metadata: {
            first_name: updates.name?.split(' ')[0] || '',
            last_name: updates.name?.split(' ').slice(1).join(' ') || '',
            role: member.roles.includes('Gestor') ? 'GESTOR' : 'CONSULTOR', // Infer role
            needs_password_change: true,
            login: cleanedCpf?.slice(-4),
          },
        });
        if (createAuthError) {
          console.error("[updateTeamMember] Error creating auth user for legacy member:", createAuthError);
          throw createAuthError;
        }
        existingAuthUser = newAuthUserData.user;
        console.log("[updateTeamMember] New auth user created:", existingAuthUser.id);
      } else {
        console.log("[updateTeamMember] Existing auth user found for legacy member:", existingAuthUser.id);
      }

      if (existingAuthUser) {
        newAuthUserId = existingAuthUser.id;
        
        // 1. Delete the old legacy record
        console.log(`[updateTeamMember] Deleting legacy team_members record with db_id: ${member.db_id}`);
        const { error: deleteError } = await supabase
          .from('team_members')
          .delete()
          .eq('id', member.db_id); // REMOVIDO: user_id: JOAO_GESTOR_AUTH_ID
        if (deleteError) {
          console.error("[updateTeamMember] Error deleting legacy team member record:", deleteError);
          throw deleteError;
        }
        console.log("[updateTeamMember] Legacy record deleted successfully.");

        // 2. Prepare data for new insert (using the correct authUserId as PK)
        const newMemberDataForInsert = {
          id: newAuthUserId, // New PK in public.team_members
          user_id: JOAO_GESTOR_AUTH_ID,
          data: {
            ...updatedData, // Use the updated JSONB data
            id: newAuthUserId, // Ensure JSONB 'data ->id' also matches the new PK
            hasLogin: true,
            isLegacy: false,
          },
          cpf: cleanedCpf, // Include CPF
        };
        console.log("[updateTeamMember] Prepared new member data for insert:", newMemberDataForInsert);

        // 3. Insert the new record
        const { error: insertError } = await supabase
          .from('team_members')
          .insert(newMemberDataForInsert);
        if (insertError) {
          console.error("[updateTeamMember] Error inserting new team member record after migration:", insertError);
          throw insertError;
        }
        console.log("[updateTeamMember] New record inserted successfully after migration.");

        // Update the local state to reflect the migration
        setTeamMembers(prev => {
          const filtered = prev.filter(m => m.id !== id); // Remove old legacy entry
          return [...filtered, {
            ...member,
            id: newAuthUserId!, // Update the client-side ID
            db_id: newAuthUserId!, // Update the db_id to the new PK
            authUserId: newAuthUserId,
            isLegacy: false,
            hasLogin: true,
            ...updates, // Apply other updates
            data: { ...updatedData, id: newAuthUserId! }, // Ensure data.id is also updated
            cpf: cleanedCpf,
            user_id: JOAO_GESTOR_AUTH_ID, // Ensure owner ID is set
          }];
        });

        toast.success(`Membro legado "${member.name}" migrado e atualizado com sucesso!`);
        return { success: true, message: "Legacy member migrated successfully." };
      }
    }

    // Standard update for non-legacy or legacy without email change
    if (updates.email && member.hasLogin && updates.email !== member.email) {
      console.log(`[updateTeamMember] Updating auth user email for ${member.email} to ${updates.email}`);
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(member.id, { email: updates.email });
      if (authUpdateError) {
        console.error("Error updating auth user email:", authUpdateError);
        throw authUpdateError;
      }
    }

    console.log(`[updateTeamMember] Performing standard update for member ${member.name} (DB_ID: ${member.db_id})`);
    const { error } = await supabase
      .from('team_members')
      .update({ data: updatedData, cpf: cleanedCpf }) // Only updates 'data' and 'cpf'
      .match({ id: member.db_id }); // REMOVIDO: user_id: JOAO_GESTOR_AUTH_ID

    if (error) {
      console.error("Error updating team member:", error);
      toast.error("Erro ao atualizar membro da equipe.");
      throw error;
    }

    // Update local state
    setTeamMembers(prev => prev.map(m => m.id === id ? { ...member, ...updates, data: updatedData, cpf: cleanedCpf } : m));
    return { success: true };
  }, [user, teamMembers]);

  const deleteTeamMember = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const member = teamMembers.find(m => m.id === id);
    if (!member || !member.db_id) throw new Error("Membro da equipe não encontrado.");

    console.log(`[deleteTeamMember] Attempting to delete member: ${member.name} (Client-side ID: ${id}, DB_ID: ${member.db_id})`);
    console.log(`[deleteTeamMember] Current member.user_id (owner): ${member.user_id}`);
    console.log(`[deleteTeamMember] Current logged-in user.id: ${user.id}`);

    if (member.user_id !== user.id) {
      console.error(`[deleteDeleteMember] Permission denied: Logged-in user (${user.id}) is not the owner (${member.user_id}) of this team member record.`);
      throw new Error("Você não tem permissão para excluir este membro da equipe. Apenas o criador pode excluí-lo.");
    }

    if (member.hasLogin && typeof member.id === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(member.id)) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(member.id);
      if (authDeleteError) {
        console.error("Error deleting auth user:", authDeleteError);
      }
    } else {
      console.log(`[deleteTeamMember] Membro "${member.name}" (ID: ${member.id}) não tem login válido no Auth ou é legado. Pulando exclusão do Auth.`);
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .match({ id: member.db_id }); // REMOVIDO: user_id: JOAO_GESTOR_AUTH_ID

    if (error) {
      console.error("Error deleting team member:", error);
      toast.error("Erro ao remover membro da equipe.");
      throw error;
    }
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  }, [user, teamMembers]);

  // Team Production Goals Functions
  const addTeamProductionGoal = useCallback(async (goal: Omit<TeamProductionGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { data, error } = await supabase.from('team_production_goals').insert({ user_id: crmOwnerUserId, ...goal }).select('*').single();
    if (error) throw error;
    setTeamProductionGoals(prev => [...prev, data]);
    return data;
  }, [user, crmOwnerUserId]);

  const updateTeamProductionGoal = useCallback(async (id: string, updates: Partial<TeamProductionGoal>) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { data, error } = await supabase.from('team_production_goals').update(updates).eq('id', id).eq('user_id', crmOwnerUserId).select('*').single();
    if (error) throw error;
    setTeamProductionGoals(prev => prev.map(goal => goal.id === id ? data : goal));
    return data;
  }, [user, crmOwnerUserId]);

  const deleteTeamProductionGoal = useCallback(async (id: string) => {
    if (!user || !crmOwnerUserId) throw new Error("Usuário não autenticado ou ID do gestor não definido.");
    const { error } = await supabase.from('team_production_goals').delete().eq('id', id).eq('user_id', crmOwnerUserId);
    if (error) throw error;
    setTeamProductionGoals(prev => prev.filter(goal => goal.id !== id));
  }, [user, crmOwnerUserId]);


  const value: AppContextType = {
    // State
    isDataLoading,
    candidates,
    teamMembers,
    commissions,
    supportMaterials,
    cutoffPeriods,
    onboardingSessions,
    onboardingTemplateVideos,
    checklistStructure,
    consultantGoalsStructure,
    interviewStructure,
    templates,
    hiringOrigins,
    salesOrigins,
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
    teamProductionGoals, 
    theme,

    // Functions
    toggleTheme,
    updateConfig,
    resetLocalState,
    refetchCommissions,
    calculateCompetenceMonth,
    isGestorTaskDueOnDate,
    calculateNotifications,

    // Candidate functions
    addCandidate,
    updateCandidate,
    deleteCandidate,
    getCandidate: useCallback((id: string) => candidates.find(c => c.id === id), [candidates]),
    toggleChecklistItem,
    setChecklistDueDate,
    toggleConsultantGoal,

    // Checklist structure functions
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    moveChecklistItem,
    resetChecklistToDefault,

    // Goals functions
    addGoalItem,
    updateGoalItem,
    deleteGoalItem,
    moveGoalItem,
    resetGoalsToDefault,

    // Interview functions
    updateInterviewSection,
    addInterviewQuestion,
    updateInterviewQuestion,
    deleteInterviewQuestion,
    moveInterviewQuestion,
    resetInterviewToDefault,

    // Templates & origins
    saveTemplate,
    addOrigin,
    deleteOrigin,
    resetOriginsToDefault,
    addPV,

    // Commission functions
    addCommission,
    updateCommission,
    deleteCommission,
    updateInstallmentStatus,

    // Cutoff period functions
    addCutoffPeriod,
    updateCutoffPeriod,
    deleteCutoffPeriod,

    // Onboarding functions
    addOnlineOnboardingSession,
    deleteOnlineOnboardingSession,
    addVideoToTemplate,
    deleteVideoFromTemplate,

    // CRM functions
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
    deleteCrmLead,

    // Daily checklist functions
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

    // Weekly target functions
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

    // Support materials functions
    addSupportMaterialV2,
    updateSupportMaterialV2,
    deleteSupportMaterialV2,
    assignSupportMaterialToConsultant,
    unassignSupportMaterialFromConsultant,

    // Lead task functions
    addLeadTask,
    updateLeadTask,
    deleteLeadTask,
    toggleLeadTaskCompletion,
    updateLeadMeetingInvitationStatus,

    // Gestor task functions
    addGestorTask,
    updateGestorTask,
    deleteGestorTask,
    toggleGestorTaskCompletion,

    // Financial entry functions
    addFinancialEntry,
    updateFinancialEntry,
    deleteFinancialEntry,

    // Form cadastro functions
    getFormFilesForSubmission,
    updateFormCadastro,
    deleteFormCadastro,

    // Feedback functions
    addFeedback,
    updateFeedback,
    deleteFeedback,
    addTeamMemberFeedback,
    updateTeamMemberFeedback,
    deleteTeamMemberFeedback,

    // Team member functions
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,

    // Team Production Goals functions
    addTeamProductionGoal,
    updateTeamProductionGoal,
    deleteTeamProductionGoal,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const useApp = useAppContext;