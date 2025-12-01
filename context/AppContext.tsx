import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../src/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Candidate, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, Commission, SupportMaterial, GoalStage, TeamMember, User, InstallmentStatus, CommissionStatus } from '../types';
import { CHECKLIST_STAGES as DEFAULT_STAGES } from '../data/checklistData';
import { CONSULTANT_GOALS as DEFAULT_GOALS } from '../data/consultantGoals';
import { useDebouncedCallback } from '../src/hooks/useDebouncedCallback';

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

const getOverallStatus = (details: Record<string, InstallmentStatus>): CommissionStatus => {
    const statuses = Object.values(details);
    if (statuses.every(s => s === 'Pago' || s === 'Cancelado')) return 'Concluído';
    if (statuses.some(s => s === 'Atraso')) return 'Atraso';
    if (statuses.every(s => s === 'Cancelado')) return 'Cancelado';
    return 'Em Andamento';
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [supportMaterials, setSupportMaterials] = useState<SupportMaterial[]>([]);
  
  const [checklistStructure, setChecklistStructure] = useState<ChecklistStage[]>(DEFAULT_STAGES);
  const [consultantGoalsStructure, setConsultantGoalsStructure] = useState<GoalStage[]>(DEFAULT_GOALS);
  const [interviewStructure, setInterviewStructure] = useState<InterviewSection[]>(INITIAL_INTERVIEW_STRUCTURE);
  const [templates, setTemplates] = useState<Record<string, CommunicationTemplate>>({});
  const [origins, setOrigins] = useState<string[]>([]);
  const [interviewers, setInterviewers] = useState<string[]>([]);
  const [pvs, setPvs] = useState<string[]>([]);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('sart_theme') as 'light' | 'dark') || 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('sart_theme', theme);
  }, [theme]);

  const debouncedUpdateConfig = useDebouncedCallback(async (userId: string, newConfig: any) => {
    await supabase.from('app_config').update({ data: newConfig }).eq('user_id', userId);
  }, 1000);

  const updateConfig = (updates: any) => {
    if (!user) return;
    const currentConfig = {
      checklistStructure,
      consultantGoalsStructure,
      interviewStructure,
      templates,
      origins,
      interviewers,
      pvs,
    };
    const newConfigData = { ...currentConfig, ...updates };
    debouncedUpdateConfig(user.id, newConfigData);
  };

  const resetLocalState = () => {
    setUser(null);
    setCandidates([]);
    setTeamMembers([]);
    setCommissions([]);
    setSupportMaterials([]);
    setChecklistStructure(DEFAULT_STAGES);
    setConsultantGoalsStructure(DEFAULT_GOALS);
    setInterviewStructure(INITIAL_INTERVIEW_STRUCTURE);
    setTemplates({});
    setOrigins(DEFAULT_APP_CONFIG_DATA.origins);
    setInterviewers(DEFAULT_APP_CONFIG_DATA.interviewers);
    setPvs(DEFAULT_APP_CONFIG_DATA.pvs);
  };

  useEffect(() => {
    const initializeSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        const currentUser = { 
          id: session.user.id, 
          name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || session.user.email || 'Usuário', 
          email: session.user.email || '' 
        };
        setUser(currentUser);
        await fetchData(session.user.id);
      }
      setInitialLoadComplete(true);
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        const currentUser = { 
          id: session.user.id, 
          name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || session.user.email || 'Usuário', 
          email: session.user.email || '' 
        };
        setUser(currentUser);
        if (_event === 'SIGNED_IN') {
          await fetchData(session.user.id);
        }
      } else {
        resetLocalState();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchData = async (userId: string) => {
    try {
      const [
        { data: configResult },
        { data: candidatesData },
        { data: teamMembersData },
        { data: commissionsData },
        { data: materialsData }
      ] = await Promise.all([
        supabase.from('app_config').select('data').eq('user_id', userId).single(),
        supabase.from('candidates').select('data').eq('user_id', userId),
        supabase.from('team_members').select('data').eq('user_id', userId),
        supabase.from('commissions').select('data').eq('user_id', userId),
        supabase.from('support_materials').select('data').eq('user_id', userId)
      ]);

      if (configResult) {
        const { data } = configResult;
        setChecklistStructure(data.checklistStructure || DEFAULT_STAGES);
        setConsultantGoalsStructure(data.consultantGoalsStructure || DEFAULT_GOALS);
        setInterviewStructure(data.interviewStructure || INITIAL_INTERVIEW_STRUCTURE);
        setTemplates(data.templates || {});
        setOrigins(data.origins || []);
        setInterviewers(data.interviewers || []);
        setPvs(data.pvs || []);
      } else {
        await supabase.from('app_config').insert({ user_id: userId, data: DEFAULT_APP_CONFIG_DATA });
        setChecklistStructure(DEFAULT_APP_CONFIG_DATA.checklistStructure);
        setConsultantGoalsStructure(DEFAULT_APP_CONFIG_DATA.consultantGoalsStructure);
        setInterviewStructure(DEFAULT_APP_CONFIG_DATA.interviewStructure);
        setTemplates(DEFAULT_APP_CONFIG_DATA.templates);
        setOrigins(DEFAULT_APP_CONFIG_DATA.origins);
        setInterviewers(DEFAULT_APP_CONFIG_DATA.interviewers);
        setPvs(DEFAULT_APP_CONFIG_DATA.pvs);
      }

      setCandidates(candidatesData?.map(item => item.data as Candidate) || []);
      
      const rawTeamMembers = teamMembersData?.map(item => item.data) || [];
      const normalizedTeamMembers = rawTeamMembers.map(member => {
        const m = member as any;
        if (m.isActive === undefined) {
          m.isActive = true;
        }
        if (m.role && !m.roles) {
          m.roles = [m.role];
          delete m.role;
        }
        if (!Array.isArray(m.roles)) {
            m.roles = [];
        }
        return m as TeamMember;
      });
      setTeamMembers(normalizedTeamMembers);

      const rawCommissions = commissionsData?.map(item => item.data as any) || [];
      const normalizedCommissions = rawCommissions.map(c => {
        if (!c.installmentDetails) {
          const details: Record<string, InstallmentStatus> = {};
          const current = c.currentInstallment || 1;
          for (let i = 1; i <= 15; i++) {
            if (i < current) {
              details[i] = 'Pago';
            } else if (i === current) {
              if (c.status === 'Atraso') details[i] = 'Atraso';
              else if (c.status === 'Pago') details[i] = 'Pago';
              else details[i] = 'Pendente';
            } else {
              details[i] = 'Pendente';
            }
          }
          c.installmentDetails = details;
        }
        delete c.currentInstallment;
        return c as Commission;
      });
      setCommissions(normalizedCommissions);
      setSupportMaterials(materialsData?.map(item => item.data as SupportMaterial) || []);

    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    }
  };

  const login = async (email: string, pass: string) => { const { error } = await supabase.auth.signInWithPassword({ email, password: pass }); if (error) throw error; };
  const register = async (name: string, email: string, pass: string) => { const nameParts = name.trim().split(' '); const { error } = await supabase.auth.signUp({ email, password: pass, options: { data: { first_name: nameParts[0], last_name: nameParts.slice(1).join(' ') } } }); if (error) throw error; };
  const logout = async () => { resetLocalState(); const { error } = await supabase.auth.signOut(); if (error) { console.error("Error logging out:", error); alert("Ocorreu um erro ao sair."); } };
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const addCandidate = async (candidate: Candidate) => { if (!user) return; const original = [...candidates]; setCandidates(prev => [candidate, ...prev]); try { const { error } = await supabase.from('candidates').insert({ user_id: user.id, data: candidate }); if (error) throw error; } catch (error) { setCandidates(original); alert("Erro ao adicionar."); throw error; } };
  const updateCandidate = async (id: string, updates: Partial<Candidate>) => { if (!user) return; const original = [...candidates]; const updated = candidates.map(c => c.id === id ? { ...c, ...updates } : c); setCandidates(updated); const toUpdate = updated.find(c => c.id === id); if (toUpdate) { try { const { error } = await supabase.from('candidates').update({ data: toUpdate }).match({ 'data->>id': id, user_id: user.id }); if (error) throw error; } catch (error) { setCandidates(original); alert("Erro ao atualizar."); throw error; } } };
  const deleteCandidate = async (id: string) => { if (!user) return; const original = [...candidates]; setCandidates(prev => prev.filter(c => c.id !== id)); try { const { error } = await supabase.from('candidates').delete().match({ 'data->>id': id, user_id: user.id }); if (error) throw error; } catch (error) { setCandidates(original); alert("Erro ao excluir."); throw error; } };
  
  const addTeamMember = async (member: TeamMember) => { if (!user) return; const original = [...teamMembers]; setTeamMembers(prev => [...prev, member]); try { const { error } = await supabase.from('team_members').insert({ user_id: user.id, data: member }); if (error) throw error; } catch (error) { setTeamMembers(original); alert("Erro ao adicionar membro."); throw error; } };
  const updateTeamMember = async (id: string, updates: Partial<TeamMember>) => { if (!user) return; const original = [...teamMembers]; const updated = teamMembers.map(m => m.id === id ? { ...m, ...updates } : m); setTeamMembers(updated); const toUpdate = updated.find(m => m.id === id); if (toUpdate) { try { const { error } = await supabase.from('team_members').update({ data: toUpdate }).match({ 'data->>id': id, user_id: user.id }); if (error) throw error; } catch (error) { setTeamMembers(original); alert("Erro ao atualizar membro."); throw error; } } };
  const deleteTeamMember = async (id: string) => { if (!user) return; const original = [...teamMembers]; setTeamMembers(prev => prev.filter(m => m.id !== id)); try { const { error } = await supabase.from('team_members').delete().match({ 'data->>id': id, user_id: user.id }); if (error) throw error; } catch (error) { setTeamMembers(original); alert("Erro ao excluir membro."); throw error; } };

  const addCommission = async (commission: Commission) => { if (!user) return; const original = [...commissions]; setCommissions(prev => [commission, ...prev]); try { const { error } = await supabase.from('commissions').insert({ user_id: user.id, data: commission }); if (error) { console.error("Supabase insert error:", error); throw error; } } catch (error) { setCommissions(original); alert("Erro ao adicionar comissão."); throw error; } };
  const updateCommission = async (id: string, updates: Partial<Commission>) => { if (!user) return; const original = [...commissions]; const updated = commissions.map(c => c.id === id ? { ...c, ...updates } : c); setCommissions(updated); const toUpdate = updated.find(c => c.id === id); if (toUpdate) { try { const { error } = await supabase.from('commissions').update({ data: toUpdate }).match({ 'data->>id': id, user_id: user.id }); if (error) { console.error("Supabase update error:", error); throw error; } } catch (error) { setCommissions(original); alert("Erro ao atualizar comissão."); throw error; } } };
  const deleteCommission = async (id: string) => { if (!user) return; const original = [...commissions]; setCommissions(prev => prev.filter(c => c.id !== id)); try { const { error } = await supabase.from('commissions').delete().match({ 'data->>id': id, user_id: user.id }); if (error) throw error; } catch (error) { setCommissions(original); alert("Erro ao excluir comissão."); throw error; } };
  const updateInstallmentStatus = async (commissionId: string, installmentNumber: number, status: InstallmentStatus) => { const commission = commissions.find(c => c.id === commissionId); if (commission) { const newDetails = { ...commission.installmentDetails, [installmentNumber]: status }; const newOverallStatus = getOverallStatus(newDetails); await updateCommission(commissionId, { installmentDetails: newDetails, status: newOverallStatus }); } };

  const addSupportMaterial = async (material: SupportMaterial) => { if (!user) return; const original = [...supportMaterials]; setSupportMaterials(prev => [material, ...prev]); try { const { error } = await supabase.from('support_materials').insert({ user_id: user.id, data: material }); if (error) throw error; } catch (error) { setSupportMaterials(original); alert("Erro ao adicionar material."); throw error; } };
  const deleteSupportMaterial = async (id: string) => { if (!user) return; const original = [...supportMaterials]; setSupportMaterials(prev => prev.filter(m => m.id !== id)); try { const { error } = await supabase.from('support_materials').delete().match({ 'data->>id': id, user_id: user.id }); if (error) throw error; } catch (error) { setSupportMaterials(original); alert("Erro ao excluir material."); throw error; } };

  const getCandidate = (id: string) => candidates.find(c => c.id === id);
  const toggleChecklistItem = async (candidateId: string, itemId: string) => { const c = getCandidate(candidateId); if(c) { const state = c.checklistProgress[itemId] || { completed: false }; await updateCandidate(candidateId, { checklistProgress: { ...c.checklistProgress, [itemId]: { ...state, completed: !state.completed } } }); } };
  const setChecklistDueDate = async (candidateId: string, itemId: string, date: string) => { const c = getCandidate(candidateId); if(c) { const state = c.checklistProgress[itemId] || { completed: false }; await updateCandidate(candidateId, { checklistProgress: { ...c.checklistProgress, [itemId]: { ...state, dueDate: date } } }); } };
  const toggleConsultantGoal = async (candidateId: string, goalId: string) => { const c = getCandidate(candidateId); if(c) { const progress = c.consultantGoalsProgress || {}; await updateCandidate(candidateId, { consultantGoalsProgress: { ...progress, [goalId]: !progress[goalId] } }); } };

  const saveTemplate = (id: string, updates: Partial<CommunicationTemplate>) => { const newTemplates = { ...templates, [id]: { ...templates[id], ...updates } }; setTemplates(newTemplates); updateConfig({ templates: newTemplates }); };
  const addOrigin = (origin: string) => { if (!origins.includes(origin)) { const newOrigins = [...origins, origin]; setOrigins(newOrigins); updateConfig({ origins: newOrigins }); } };
  const deleteOrigin = (originToDelete: string) => { if (origins.length <= 1) { alert("É necessário manter pelo menos uma origem."); return; } const newOrigins = origins.filter(o => o !== originToDelete); setOrigins(newOrigins); updateConfig({ origins: newOrigins }); };
  const addInterviewer = (interviewer: string) => { if (!interviewers.includes(interviewer)) { const newInterviewers = [...interviewers, interviewer]; setInterviewers(newInterviewers); updateConfig({ interviewers: newInterviewers }); } };
  const deleteInterviewer = (interviewerToDelete: string) => { if (interviewers.length <= 1) { alert("É necessário manter pelo menos um entrevistador."); return; } const newInterviewers = interviewers.filter(i => i !== interviewerToDelete); setInterviewers(newInterviewers); updateConfig({ interviewers: newInterviewers }); };
  const addPV = (pv: string) => { if (!pvs.includes(pv)) { const newPvs = [...pvs, pv]; setPvs(newPvs); updateConfig({ pvs: newPvs }); } };

  const updateAndPersistStructure = (setter: React.Dispatch<React.SetStateAction<any>>, key: string, newStructure: any) => { setter(newStructure); updateConfig({ [key]: newStructure }); };
  const addChecklistItem = (stageId: string, label: string) => { const newStructure = checklistStructure.map(s => s.id === stageId ? { ...s, items: [...s.items, { id: `custom_${Date.now()}`, label }] } : s); updateAndPersistStructure(setChecklistStructure, 'checklistStructure', newStructure); };
  const updateChecklistItem = (stageId: string, itemId: string, label: string) => { const newStructure = checklistStructure.map(s => s.id === stageId ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, label } : i) } : s); updateAndPersistStructure(setChecklistStructure, 'checklistStructure', newStructure); };
  const deleteChecklistItem = (stageId: string, itemId: string) => { const newStructure = checklistStructure.map(s => s.id === stageId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s); updateAndPersistStructure(setChecklistStructure, 'checklistStructure', newStructure); };
  const moveChecklistItem = (stageId: string, itemId: string, dir: 'up' | 'down') => { const newStructure = checklistStructure.map(s => { if (s.id !== stageId) return s; const idx = s.items.findIndex(i => i.id === itemId); if ((dir === 'up' && idx < 1) || (dir === 'down' && idx >= s.items.length - 1)) return s; const newItems = [...s.items]; const targetIdx = dir === 'up' ? idx - 1 : idx + 1; [newItems[idx], newItems[targetIdx]] = [newItems[targetIdx], newItems[idx]]; return { ...s, items: newItems }; }); updateAndPersistStructure(setChecklistStructure, 'checklistStructure', newStructure); };
  const resetChecklistToDefault = () => { updateAndPersistStructure(setChecklistStructure, 'checklistStructure', DEFAULT_STAGES); };
  
  const addGoalItem = (stageId: string, label: string) => { const newStructure = consultantGoalsStructure.map(s => s.id === stageId ? { ...s, items: [...s.items, { id: `goal_${Date.now()}`, label }] } : s); updateAndPersistStructure(setConsultantGoalsStructure, 'consultantGoalsStructure', newStructure); };
  const updateGoalItem = (stageId: string, itemId: string, label: string) => { const newStructure = consultantGoalsStructure.map(s => s.id === stageId ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, label } : i) } : s); updateAndPersistStructure(setConsultantGoalsStructure, 'consultantGoalsStructure', newStructure); };
  const deleteGoalItem = (stageId: string, itemId: string) => { const newStructure = consultantGoalsStructure.map(s => s.id === stageId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s); updateAndPersistStructure(setConsultantGoalsStructure, 'consultantGoalsStructure', newStructure); };
  const moveGoalItem = (stageId: string, itemId: string, dir: 'up' | 'down') => { const newStructure = consultantGoalsStructure.map(s => { if (s.id !== stageId) return s; const idx = s.items.findIndex(i => i.id === itemId); if ((dir === 'up' && idx < 1) || (dir === 'down' && idx >= s.items.length - 1)) return s; const newItems = [...s.items]; const targetIdx = dir === 'up' ? idx - 1 : idx + 1; [newItems[idx], newItems[targetIdx]] = [newItems[targetIdx], newItems[idx]]; return { ...s, items: newItems }; }); updateAndPersistStructure(setConsultantGoalsStructure, 'consultantGoalsStructure', newStructure); };
  const resetGoalsToDefault = () => { updateAndPersistStructure(setConsultantGoalsStructure, 'consultantGoalsStructure', DEFAULT_GOALS); };

  const updateInterviewSection = (sectionId: string, updates: Partial<InterviewSection>) => { const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, ...updates } : s); updateAndPersistStructure(setInterviewStructure, 'interviewStructure', newStructure); };
  const addInterviewQuestion = (sectionId: string, text: string, points: number) => { const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, questions: [...s.questions, { id: `q_${Date.now()}`, text, points }] } : s); updateAndPersistStructure(setInterviewStructure, 'interviewStructure', newStructure); };
  const updateInterviewQuestion = (sectionId: string, questionId: string, updates: Partial<InterviewSection['questions'][0]>) => { const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, questions: s.questions.map(q => q.id === questionId ? { ...q, ...updates } : q) } : s); updateAndPersistStructure(setInterviewStructure, 'interviewStructure', newStructure); };
  const deleteInterviewQuestion = (sectionId: string, questionId: string) => { const newStructure = interviewStructure.map(s => s.id === sectionId ? { ...s, questions: s.questions.filter(q => q.id !== questionId) } : s); updateAndPersistStructure(setInterviewStructure, 'interviewStructure', newStructure); };
  const moveInterviewQuestion = (sectionId: string, questionId: string, dir: 'up' | 'down') => { const newStructure = interviewStructure.map(s => { if (s.id !== sectionId) return s; const idx = s.questions.findIndex(q => q.id === questionId); if ((dir === 'up' && idx < 1) || (dir === 'down' && idx >= s.questions.length - 1)) return s; const newQuestions = [...s.questions]; const targetIdx = dir === 'up' ? idx - 1 : idx + 1; [newQuestions[idx], newQuestions[targetIdx]] = [newQuestions[targetIdx], newQuestions[idx]]; return { ...s, questions: newQuestions }; }); updateAndPersistStructure(setInterviewStructure, 'interviewStructure', newStructure); };
  const resetInterviewToDefault = () => { updateAndPersistStructure(setInterviewStructure, 'interviewStructure', INITIAL_INTERVIEW_STRUCTURE); };

  return (
    <AppContext.Provider value={{ 
      user, initialLoadComplete, login, register, logout, candidates, templates, checklistStructure, consultantGoalsStructure, interviewStructure, commissions, supportMaterials, theme, origins, interviewers, pvs, teamMembers,
      addTeamMember, updateTeamMember, deleteTeamMember, toggleTheme, addOrigin, deleteOrigin, addInterviewer, deleteInterviewer, addPV, addCandidate, updateCandidate, deleteCandidate, toggleChecklistItem, toggleConsultantGoal, setChecklistDueDate, getCandidate, saveTemplate,
      addChecklistItem, updateChecklistItem, deleteChecklistItem, moveChecklistItem, resetChecklistToDefault, addGoalItem, updateGoalItem, deleteGoalItem, moveGoalItem, resetGoalsToDefault,
      updateInterviewSection, addInterviewQuestion, updateInterviewQuestion, deleteInterviewQuestion, moveInterviewQuestion, resetInterviewToDefault, addCommission, updateCommission, deleteCommission, updateInstallmentStatus, addSupportMaterial, deleteSupportMaterial
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