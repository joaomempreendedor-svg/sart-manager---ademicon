import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Candidate, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, Commission, SupportMaterial, GoalStage, TeamMember, InstallmentStatus, CommissionStatus, InstallmentInfo, CutoffPeriod, ImportantLink, Feedback, OnboardingSession, OnboardingVideoTemplate } from '@/types';
import { CHECKLIST_STAGES as DEFAULT_STAGES } from '@/data/checklistData';
import { CONSULTANT_GOALS as DEFAULT_GOALS } from '@/data/consultantGoals';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const fetchedUserIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [supportMaterials, setSupportMaterials] = useState<SupportMaterial[]>([]);
  const [importantLinks, setImportantLinks] = useState<ImportantLink[]>([]);
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
        .upsert({ user_id: user.id, data: newConfig }, { onConflict: 'user_id' });
      if (error) throw error;
    } catch (error) {
      console.error("Failed to save config:", error);
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
    setImportantLinks([]);
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
    setIsDataLoading(false);
  };

  const refetchCommissions = useCallback(async () => {
    if (!user) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data, error } = await supabase.from("commissions").select("id, data, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) { console.error(error); return; }
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
    } finally {
      setTimeout(() => { isFetchingRef.current = false; }, 100);
    }
  }, [user]);

  useEffect(() => {
    clearStaleAuth();
    const fetchData = async (userId: string) => {
      const timeoutId = setTimeout(() => {
        console.error('⏰ TIMEOUT: fetchData demorou mais de 15 segundos');
        setIsDataLoading(false);
      }, 15000);
      try {
        const [
          { data: configResult, error: configError },
          { data: candidatesData, error: candidatesError },
          { data: teamMembersData, error: teamMembersError },
          { data: materialsData, error: materialsError },
          { data: cutoffData, error: cutoffError },
          { data: linksData, error: linksError },
          { data: onboardingData, error: onboardingError },
          { data: templateVideosData, error: templateVideosError }
        ] = await Promise.all([
          supabase.from('app_config').select('data').eq('user_id', userId).maybeSingle(),
          supabase.from('candidates').select('id, data').eq('user_id', userId),
          supabase.from('team_members').select('id, data').eq('user_id', userId),
          supabase.from('support_materials').select('id, data').eq('user_id', userId),
          supabase.from('cutoff_periods').select('id, data').eq('user_id', userId),
          supabase.from('important_links').select('id, data').eq('user_id', userId),
          supabase.from('onboarding_sessions').select('*, videos:onboarding_videos(*)').eq('user_id', userId),
          supabase.from('onboarding_video_templates').select('*').eq('user_id', userId).order('order', { ascending: true })
        ]);

        if (configError) console.error("Config error:", configError);
        if (candidatesError) console.error("Candidates error:", candidatesError);
        if (teamMembersError) console.error("Team error:", teamMembersError);
        if (materialsError) console.error("Materials error:", materialsError);
        if (cutoffError) console.error("Cutoff Periods error:", cutoffError);
        if (linksError) console.error("Important Links error:", linksError);
        if (onboardingError) console.error("Onboarding error:", onboardingError);
        if (templateVideosError) console.error("Onboarding Template error:", templateVideosError);

        if (configResult) {
          const { data } = configResult;
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
          await supabase.from('app_config').insert({ user_id: userId, data: DEFAULT_APP_CONFIG_DATA });
          const { checklistStructure, consultantGoalsStructure, interviewStructure, templates, origins, interviewers, pvs } = DEFAULT_APP_CONFIG_DATA;
          setChecklistStructure(checklistStructure);
          setConsultantGoalsStructure(consultantGoalsStructure);
          setInterviewStructure(interviewStructure);
          setTemplates(templates);
          setOrigins(origins);
          setInterviewers(interviewers);
          setPvs(pvs);
        }

        setCandidates(candidatesData?.map(item => ({ ...(item.data as Candidate), db_id: item.id })) || []);
        const rawTeamMembers = teamMembersData?.map(item => ({ ...(item.data as TeamMember), db_id: item.id })) || [];
        const normalizedTeamMembers = rawTeamMembers.map(member => {
          const m = member as any;
          if (m.isActive === undefined) { m.isActive = true; }
          if (m.role && !m.roles) { m.roles = [m.role]; delete m.role; }
          if (!Array.isArray(m.roles)) { m.roles = []; }
          return m as TeamMember;
        });
        setTeamMembers(normalizedTeamMembers);
        setSupportMaterials(materialsData?.map(item => ({ ...(item.data as SupportMaterial), db_id: item.id })) || []);
        setImportantLinks(linksData?.map(item => ({ ...(item.data as ImportantLink), db_id: item.id })) || []);
        setCutoffPeriods(cutoffData?.map(item => ({ ...(item.data as CutoffPeriod), db_id: item.id })) || []);
        setOnboardingSessions((onboardingData as any[])?.map(s => ({...s, videos: s.videos.sort((a:any,b:any) => a.order - b.order)})) || []);
        setOnboardingTemplateVideos(templateVideosData || []);
        
        refetchCommissions();

        const recoverPendingCommissions = async () => {
          try {
            const pending = JSON.parse(localStorage.getItem('pending_commissions') || '[]');
            if (pending.length === 0) return;
            for (const pendingCommission of pending) {
              try {
                const { _id, _timestamp, _retryCount, ...cleanCommission } = pendingCommission;
                const payload = { user_id: user.id, data: cleanCommission };
                const { data, error } = await supabase.from('commissions').insert(payload).select('id, created_at').maybeSingle();
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
  }, [user?.id, refetchCommissions]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const addCandidate = useCallback(async (candidate: Candidate) => { if (!user) throw new Error("Usuário não autenticado."); const { data, error } = await supabase.from('candidates').insert({ user_id: user.id, data: candidate }).select('id').single(); if (error) { console.error(error); throw error; } if (data) { setCandidates(prev => [{ ...candidate, db_id: data.id }, ...prev]); } }, [user]);
  const updateCandidate = useCallback(async (id: string, updates: Partial<Candidate>) => { if (!user) throw new Error("Usuário não autenticado."); const c = candidates.find(c => c.id === id); if (!c || !c.db_id) throw new Error("Candidato não encontrado"); const updated = { ...c, ...updates }; const { db_id, ...dataToUpdate } = updated; const { error } = await supabase.from('candidates').update({ data: dataToUpdate }).match({ id: c.db_id, user_id: user.id }); if (error) { console.error(error); throw error; } setCandidates(prev => prev.map(p => p.id === id ? updated : p)); }, [user, candidates]);
  const deleteCandidate = useCallback(async (id: string) => { if (!user) throw new Error("Usuário não autenticado."); const c = candidates.find(c => c.id === id); if (!c || !c.db_id) throw new Error("Candidato não encontrado"); const { error } = await supabase.from('candidates').delete().match({ id: c.db_id, user_id: user.id }); if (error) { console.error(error); throw error; } setCandidates(prev => prev.filter(p => p.id !== id)); }, [user, candidates]);
  const addTeamMember = useCallback(async (member: TeamMember) => { if (!user) throw new Error("Usuário não autenticado."); const { data, error } = await supabase.from('team_members').insert({ user_id: user.id, data: member }).select('id').single(); if (error) { console.error(error); throw error; } if (data) { setTeamMembers(prev => [...prev, { ...member, db_id: data.id }]); } }, [user]);
  const updateTeamMember = useCallback(async (id: string, updates: Partial<TeamMember>) => { if (!user) throw new Error("Usuário não autenticado."); const m = teamMembers.find(m => m.id === id); if (!m || !m.db_id) throw new Error("Membro não encontrado"); const updated = { ...m, ...updates }; const { db_id, ...dataToUpdate } = updated; const { error } = await supabase.from('team_members').update({ data: dataToUpdate }).match({ id: m.db_id, user_id: user.id }); if (error) { console.error(error); throw error; } setTeamMembers(prev => prev.map(p => p.id === id ? updated : p)); }, [user, teamMembers]);
  const deleteTeamMember = useCallback(async (id: string) => { if (!user) throw new Error("Usuário não autenticado."); const m = teamMembers.find(m => m.id === id); if (!m || !m.db_id) throw new Error("Membro não encontrado"); const { error } = await supabase.from('team_members').delete().match({ id: m.db_id, user_id: user.id }); if (error) { console.error(error); throw error; } setTeamMembers(prev => prev.filter(p => p.id !== id)); }, [user, teamMembers]);
  const addCutoffPeriod = useCallback(async (period: CutoffPeriod) => { if (!user) throw new Error("Usuário não autenticado."); const { data, error } = await supabase.from('cutoff_periods').insert({ user_id: user.id, data: period }).select('id').single(); if (error) throw error; if (data) setCutoffPeriods(prev => [...prev, { ...period, db_id: data.id }]); }, [user]);
  const updateCutoffPeriod = useCallback(async (id: string, updates: Partial<CutoffPeriod>) => { if (!user) throw new Error("Usuário não autenticado."); const p = cutoffPeriods.find(p => p.id === id); if (!p || !p.db_id) throw new Error("Período não encontrado"); const updated = { ...p, ...updates }; const { db_id, ...dataToUpdate } = updated; const { error } = await supabase.from('cutoff_periods').update({ data: dataToUpdate }).match({ id: p.db_id, user_id: user.id }); if (error) throw error; setCutoffPeriods(prev => prev.map(item => item.id === id ? updated : item)); }, [user, cutoffPeriods]);
  const deleteCutoffPeriod = useCallback(async (id: string) => { if (!user) throw new Error("Usuário não autenticado."); const p = cutoffPeriods.find(p => p.id === id); if (!p || !p.db_id) throw new Error("Período não encontrado"); const { error } = await supabase.from('cutoff_periods').delete().match({ id: p.db_id, user_id: user.id }); if (error) throw error; setCutoffPeriods(prev => prev.filter(item => item.id !== id)); }, [user, cutoffPeriods]);
  const addCommission = useCallback(async (commission: Commission): Promise<Commission> => { if (!user) throw new Error("Usuário não autenticado."); const localId = `local_${Date.now()}`; const localCommission: Commission = { ...commission, db_id: localId, criado_em: new Date().toISOString() }; setCommissions(prev => [localCommission, ...prev]); setTimeout(() => { alert(`✅ VENDA REGISTRADA!\n\nCliente: ${commission.clientName}\nValor: R$ ${commission.value.toLocaleString()}\nID: ${localId}\n\nA sincronização ocorrerá em segundo plano.`); }, 50); setTimeout(async () => { try { const cleanCommission = { ...commission, customRules: commission.customRules?.length ? commission.customRules : undefined, angelName: commission.angelName || undefined, managerName: commission.managerName || 'N/A', }; const payload = { user_id: user.id, data: cleanCommission }; const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Background sync timeout')), 10000)); const insertPromise = supabase.from('commissions').insert(payload).select('id, created_at').maybeSingle(); const { data, error } = await Promise.race([insertPromise, timeoutPromise]) as any; if (error) throw error; if (data && data.id) { setCommissions(prev => prev.map(c => c.db_id === localId ? { ...c, db_id: data.id.toString(), criado_em: data.created_at, _synced: true } : c)); const pending = JSON.parse(localStorage.getItem('pending_commissions') || '[]').filter((p: any) => p._localId !== localId); localStorage.setItem('pending_commissions', JSON.stringify(pending)); } else { throw new Error('Nenhum ID retornado'); } } catch (error: any) { const pending = JSON.parse(localStorage.getItem('pending_commissions') || '[]'); const alreadyExists = pending.some((p: any) => p._localId === localId); if (!alreadyExists) { pending.push({ ...commission, _localId: localId, _timestamp: new Date().toISOString(), _error: error.message, _attempts: 1 }); localStorage.setItem('pending_commissions', JSON.stringify(pending)); } } }, 2000); return localCommission; }, [user]);
  const updateCommission = useCallback(async (id: string, updates: Partial<Commission>) => { if (!user) throw new Error("Usuário não autenticado."); const commissionToUpdate = commissions.find(c => c.id === id); if (!commissionToUpdate || !commissionToUpdate.db_id) throw new Error("Comissão não encontrada para atualização."); const originalData = { ...commissionToUpdate }; delete (originalData as any).db_id; delete (originalData as any).criado_em; const newData = { ...originalData, ...updates }; const payload = { data: newData }; const { error } = await supabase.from('commissions').update(payload).match({ id: commissionToUpdate.db_id, user_id: user.id }); if (error) { console.error(error); throw error; } await refetchCommissions(); }, [user, commissions, refetchCommissions]);
  const deleteCommission = useCallback(async (id: string) => { if (!user) throw new Error("Usuário não autenticado."); const commissionToDelete = commissions.find(c => c.id === id); if (!commissionToDelete || !commissionToDelete.db_id) throw new Error("Comissão não encontrada para exclusão."); const { error } = await supabase.from('commissions').delete().match({ id: commissionToDelete.db_id, user_id: user.id }); if (error) { console.error(error); throw error; } await refetchCommissions(); }, [user, commissions, refetchCommissions]);
  const addSupportMaterial = useCallback(async (materialData: Omit<SupportMaterial, 'id' | 'url'>, file: File) => { if (!user) throw new Error("Usuário não autenticado."); const sanitizedFileName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_'); const filePath = `public/${crypto.randomUUID()}-${sanitizedFileName}`; const { error: uploadError } = await supabase.storage.from('support_materials').upload(filePath, file); if (uploadError) throw uploadError; const { data: urlData } = supabase.storage.from('support_materials').getPublicUrl(filePath); if (!urlData) throw new Error("Não foi possível obter a URL pública do arquivo."); const newMaterial: SupportMaterial = { ...materialData, id: crypto.randomUUID(), url: urlData.publicUrl, }; const { data: dbData, error: dbError } = await supabase.from('support_materials').insert({ user_id: user.id, data: newMaterial }).select('id').single(); if (dbError) { await supabase.storage.from('support_materials').remove([filePath]); throw dbError; } setSupportMaterials(prev => [{ ...newMaterial, db_id: dbData.id }, ...prev]); }, [user]);
  const deleteSupportMaterial = useCallback(async (id: string) => { if (!user) throw new Error("Usuário não autenticado."); const m = supportMaterials.find(m => m.id === id); if (!m || !m.db_id) throw new Error("Material não encontrado"); const filePath = m.url.split('/support_materials/')[1]; const { error: storageError } = await supabase.storage.from('support_materials').remove([filePath]); if (storageError) console.error("Erro ao deletar do storage (pode já ter sido removido):", storageError.message); const { error: dbError } = await supabase.from('support_materials').delete().match({ id: m.db_id, user_id: user.id }); if (dbError) throw dbError; setSupportMaterials(prev => prev.filter(p => p.id !== id)); }, [user, supportMaterials]);
  const addImportantLink = useCallback(async (link: ImportantLink) => { if (!user) throw new Error("Usuário não autenticado."); const { data, error } = await supabase.from('important_links').insert({ user_id: user.id, data: link }).select('id').single(); if (error) throw error; if (data) setImportantLinks(prev => [...prev, { ...link, db_id: data.id }]); }, [user]);
  const updateImportantLink = useCallback(async (id: string, updates: Partial<ImportantLink>) => { if (!user) throw new Error("Usuário não autenticado."); const l = importantLinks.find(l => l.id === id); if (!l || !l.db_id) throw new Error("Link não encontrado"); const updated = { ...l, ...updates }; const { db_id, ...dataToUpdate } = updated; const { error } = await supabase.from('important_links').update({ data: dataToUpdate }).match({ id: l.db_id, user_id: user.id }); if (error) throw error; setImportantLinks(prev => prev.map(p => p.id === id ? updated : p)); }, [user, importantLinks]);
  const deleteImportantLink = useCallback(async (id: string) => { if (!user) throw new Error("Usuário não autenticado."); const l = importantLinks.find(l => l.id === id); if (!l || !l.db_id) throw new Error("Link não encontrado"); const { error } = await supabase.from('important_links').delete().match({ id: l.db_id, user_id: user.id }); if (error) throw error; setImportantLinks(prev => prev.filter(p => p.id !== id)); }, [user, importantLinks]);
  const updateInstallmentStatus = useCallback(async (commissionId: string, installmentNumber: number, status: InstallmentStatus, paidDate?: string, saleType?: 'Imóvel' | 'Veículo') => { const commission = commissions.find(c => c.id === commissionId); if (!commission) { console.error("Comissão não encontrada"); return; } let competenceMonth: string | undefined; let finalPaidDate = paidDate || new Date().toISOString().split('T')[0]; if (status === 'Pago' && finalPaidDate) { competenceMonth = calculateCompetenceMonth(finalPaidDate); } const newDetails = { ...commission.installmentDetails, [installmentNumber]: { status, ...(finalPaidDate && { paidDate: finalPaidDate }), ...(competenceMonth && { competenceMonth }) } }; const newOverallStatus = getOverallStatus(newDetails); try { const updatedCommission = { ...commission, installmentDetails: newDetails, status: newOverallStatus }; setCommissions(prev => prev.map(c => c.id === commissionId ? updatedCommission : c)); if (commission.db_id && user) { const { db_id, criado_em, _synced, ...dataToUpdate } = updatedCommission; const { error } = await supabase.from('commissions').update({ data: dataToUpdate }).eq('id', commission.db_id).eq('user_id', user.id); if (error) throw error; } } catch (error: any) { console.error("Erro ao salvar status:", error); alert("Erro ao salvar status da parcela. Tente novamente."); throw error; } }, [commissions, user, calculateCompetenceMonth]);
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
  const deleteOrigin = useCallback((originToDelete: string) => { if (origins.length <= 1) { alert("É necessário manter pelo menos uma origem."); return; } const newOrigins = origins.filter(o => o !== originToDelete); setOrigins(newOrigins); updateConfig({ origins: newOrigins }); }, [origins, updateConfig]);
  const addInterviewer = useCallback((interviewer: string) => { if (!interviewers.includes(interviewer)) { const newInterviewers = [...interviewers, interviewer]; setInterviewers(newInterviewers); updateConfig({ interviewers: newInterviewers }); } }, [interviewers, updateConfig]);
  const deleteInterviewer = useCallback((interviewerToDelete: string) => { if (interviewers.length <= 1) { alert("É necessário manter pelo menos um entrevistador."); return; } const newInterviewers = interviewers.filter(i => i !== interviewerToDelete); setInterviewers(newInterviewers); updateConfig({ interviewers: newInterviewers }); }, [interviewers, updateConfig]);
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
  const moveInterviewQuestion = useCallback((sectionId: string, questionId: string, dir: 'up' | 'down') => { const newStructure = interviewStructure.map(s => { if (s.id !== sectionId) return s; const idx = s.questions.findIndex(q => q.id === questionId); if ((dir === 'up' && idx < 1) || (dir === 'down' && idx >= s.questions.length - 1)) return s; const newQuestions = [...s.questions]; const targetIdx = dir === 'up' ? idx - 1 : idx + 1; [newQuestions[idx], newQuestions[targetIdx]] = [newQuestions[targetIdx], newQuestions[idx]]; return { ...s, questions: newQuestions }; }); updateAndPersistStructure(setInterviewStructure, 'interviewStructure', newStructure); }, [interviewStructure, updateAndPersistStructure]);
  const resetInterviewToDefault = useCallback(() => { updateAndPersistStructure(setInterviewStructure, 'interviewStructure', INITIAL_INTERVIEW_STRUCTURE); }, [updateAndPersistStructure]);
  
  // Funções do Onboarding Online
  const addOnlineOnboardingSession = useCallback(async (consultantName: string): Promise<OnboardingSession | null> => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { data: sessionData, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .insert({ user_id: user.id, consultant_name: consultantName })
      .select()
      .single();
    if (sessionError) throw sessionError;

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
        // Rollback session creation if videos fail
        await supabase.from('onboarding_sessions').delete().eq('id', sessionData.id);
        throw videosError;
      }
    }
    
    const newSession = { ...sessionData, videos: videosToInsert.map(v => ({...v, id: crypto.randomUUID()})) };
    setOnboardingSessions(prev => [newSession, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    return newSession;
  }, [user, onboardingTemplateVideos]);

  const deleteOnlineOnboardingSession = useCallback(async (sessionId: string) => { if (!user) throw new Error("Usuário não autenticado."); const { error } = await supabase.from('onboarding_sessions').delete().match({ id: sessionId, user_id: user.id }); if (error) throw error; setOnboardingSessions(prev => prev.filter(s => s.id !== sessionId)); }, [user]);
  
  const addVideoToTemplate = useCallback(async (title: string, url: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const newOrder = onboardingTemplateVideos.length > 0 ? Math.max(...onboardingTemplateVideos.map(v => v.order)) + 1 : 1;
    const newVideoData = { user_id: user.id, title, video_url: url, order: newOrder };
    const { data, error } = await supabase.from('onboarding_video_templates').insert(newVideoData).select().single();
    if (error) throw error;
    setOnboardingTemplateVideos(prev => [...prev, data]);
  }, [user, onboardingTemplateVideos]);

  const deleteVideoFromTemplate = useCallback(async (videoId: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const { error } = await supabase.from('onboarding_video_templates').delete().match({ id: videoId, user_id: user.id });
    if (error) throw error;
    setOnboardingTemplateVideos(prev => prev.filter(v => v.id !== videoId));
  }, [user]);

  useEffect(() => { if (!user) return; const syncPendingCommissions = async () => { const pending = JSON.parse(localStorage.getItem('pending_commissions') || '[]') as any[]; if (pending.length === 0) return; for (const item of pending) { try { const { _localId, _timestamp, _attempts, ...cleanData } = item; const { data, error } = await supabase.from('commissions').insert({ user_id: user.id, data: cleanData }).select('id, created_at').maybeSingle(); if (!error && data) { setCommissions(prev => prev.map(c => c.db_id === _localId ? { ...c, db_id: data.id.toString(), criado_em: data.created_at } : c)); const updated = pending.filter((p: any) => p._localId !== _localId); localStorage.setItem('pending_commissions', JSON.stringify(updated)); } } catch (error) { console.log(`❌ Falha ao sincronizar ${item._localId}`); } } }; const interval = setInterval(syncPendingCommissions, 2 * 60 * 1000); setTimeout(syncPendingCommissions, 5000); return () => clearInterval(interval); }, [user]);

  return (
    <AppContext.Provider value={{ 
      isDataLoading,
      candidates, templates, checklistStructure, consultantGoalsStructure, interviewStructure, commissions, supportMaterials, importantLinks, theme, origins, interviewers, pvs, teamMembers, cutoffPeriods, onboardingSessions, onboardingTemplateVideos,
      addCutoffPeriod, updateCutoffPeriod, deleteCutoffPeriod,
      addTeamMember, updateTeamMember, deleteTeamMember, toggleTheme, addOrigin, deleteOrigin, addInterviewer, deleteInterviewer, addPV, addCandidate, updateCandidate, deleteCandidate, toggleChecklistItem, toggleConsultantGoal, setChecklistDueDate, getCandidate, saveTemplate,
      addChecklistItem, updateChecklistItem, deleteChecklistItem, moveChecklistItem, resetChecklistToDefault, addGoalItem, updateGoalItem, deleteGoalItem, moveGoalItem, resetGoalsToDefault,
      updateInterviewSection, addInterviewQuestion, updateInterviewQuestion, deleteInterviewQuestion, moveInterviewQuestion, resetInterviewToDefault, addCommission, updateCommission, deleteCommission, updateInstallmentStatus, addSupportMaterial, deleteSupportMaterial,
      addImportantLink, updateImportantLink, deleteImportantLink,
      addFeedback, updateFeedback, deleteFeedback,
      addTeamMemberFeedback, updateTeamMemberFeedback, deleteTeamMemberFeedback,
      addOnlineOnboardingSession, deleteOnlineOnboardingSession, addVideoToTemplate, deleteVideoFromTemplate
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