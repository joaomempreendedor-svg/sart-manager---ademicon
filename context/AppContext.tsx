import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../src/integrations/supabase/client';
import { useAuth } from './AuthContext';
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

// Helper function to call the edge function
const callDataManager = async (operation: 'insert' | 'update' | 'delete' | 'update_config', tableName: string, payload: { data?: any, id?: string }) => {
    const response = await supabase.functions.invoke('data-manager', {
        body: { tableName, operation, ...payload },
    });

    if (response.error) {
        console.error(`Edge function network error for ${tableName}/${operation}:`, response.error);
        throw new Error(`Erro de comunicação: ${response.error.message}`);
    }
    if (response.data.error) {
        console.error(`Server-side error for ${tableName}/${operation}:`, response.data.error);
        throw new Error(`Erro no servidor: ${response.data.error}`);
    }

    return response.data;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const user = auth.user;

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

  const debouncedUpdateConfig = useDebouncedCallback(async (newConfig: any) => {
    try {
      await callDataManager('update_config', 'app_config', { data: newConfig });
    } catch (error) {
      console.error("Failed to save config:", error);
    }
  }, 1500);

  const updateConfig = (updates: any) => {
    if (!user) return;
    const currentConfig = { checklistStructure, consultantGoalsStructure, interviewStructure, templates, origins, interviewers, pvs };
    const newConfigData = { ...currentConfig, ...updates };
    debouncedUpdateConfig(newConfigData);
  };

  const resetLocalState = () => {
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
          // Set defaults locally
          const { checklistStructure, consultantGoalsStructure, interviewStructure, templates, origins, interviewers, pvs } = DEFAULT_APP_CONFIG_DATA;
          setChecklistStructure(checklistStructure);
          setConsultantGoalsStructure(consultantGoalsStructure);
          setInterviewStructure(interviewStructure);
          setTemplates(templates);
          setOrigins(origins);
          setInterviewers(interviewers);
          setPvs(pvs);
        }

        setCandidates(candidatesData?.map(item => item.data as Candidate) || []);
        setTeamMembers(teamMembersData?.map(item => item.data as TeamMember) || []);
        setCommissions(commissionsData?.map(item => item.data as Commission).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || []);
        setSupportMaterials(materialsData?.map(item => item.data as SupportMaterial) || []);

      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };

    if (user) {
      fetchData(user.id);
    } else {
      resetLocalState();
    }
  }, [user]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleApiError = (error: any, entity: string) => {
    alert(`Erro ao gerenciar ${entity}: ${error.message}`);
    throw error;
  };

  const addCandidate = async (candidate: Candidate) => { try { const result = await callDataManager('insert', 'candidates', { data: candidate }); setCandidates(prev => [result.data, ...prev]); } catch (error) { handleApiError(error, 'candidato'); } };
  const updateCandidate = async (id: string, updates: Partial<Candidate>) => { const c = candidates.find(c => c.id === id); if (!c) return; const updated = { ...c, ...updates }; try { await callDataManager('update', 'candidates', { id, data: updated }); setCandidates(prev => prev.map(p => p.id === id ? updated : p)); } catch (error) { handleApiError(error, 'candidato'); } };
  const deleteCandidate = async (id: string) => { try { await callDataManager('delete', 'candidates', { id }); setCandidates(prev => prev.filter(c => c.id !== id)); } catch (error) { handleApiError(error, 'candidato'); } };
  
  const addTeamMember = async (member: TeamMember) => { try { const result = await callDataManager('insert', 'team_members', { data: member }); setTeamMembers(prev => [...prev, result.data]); } catch (error) { handleApiError(error, 'membro da equipe'); } };
  const updateTeamMember = async (id: string, updates: Partial<TeamMember>) => { const m = teamMembers.find(m => m.id === id); if (!m) return; const updated = { ...m, ...updates }; try { await callDataManager('update', 'team_members', { id, data: updated }); setTeamMembers(prev => prev.map(p => p.id === id ? updated : p)); } catch (error) { handleApiError(error, 'membro da equipe'); } };
  const deleteTeamMember = async (id: string) => { try { await callDataManager('delete', 'team_members', { id }); setTeamMembers(prev => prev.filter(m => m.id !== id)); } catch (error) { handleApiError(error, 'membro da equipe'); } };

  const addCommission = async (commission: Commission) => { try { const result = await callDataManager('insert', 'commissions', { data: commission }); setCommissions(prev => [result.data, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())); } catch (error) { handleApiError(error, 'comissão'); } };
  const updateCommission = async (id: string, updates: Partial<Commission>) => { const c = commissions.find(c => c.id === id); if (!c) return; const updated = { ...c, ...updates }; try { await callDataManager('update', 'commissions', { id, data: updated }); setCommissions(prev => prev.map(p => p.id === id ? updated : p).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())); } catch (error) { handleApiError(error, 'comissão'); } };
  const deleteCommission = async (id: string) => { try { await callDataManager('delete', 'commissions', { id }); setCommissions(prev => prev.filter(c => c.id !== id)); } catch (error) { handleApiError(error, 'comissão'); } };
  const updateInstallmentStatus = async (commissionId: string, installmentNumber: number, status: InstallmentStatus) => { const commission = commissions.find(c => c.id === commissionId); if (commission) { const newDetails = { ...commission.installmentDetails, [installmentNumber]: status }; const newOverallStatus = getOverallStatus(newDetails); await updateCommission(commissionId, { installmentDetails: newDetails, status: newOverallStatus }); } };

  const addSupportMaterial = async (material: SupportMaterial) => { try { const result = await callDataManager('insert', 'support_materials', { data: material }); setSupportMaterials(prev => [result.data, ...prev]); } catch (error) { handleApiError(error, 'material'); } };
  const deleteSupportMaterial = async (id: string) => { try { await callDataManager('delete', 'support_materials', { id }); setSupportMaterials(prev => prev.filter(m => m.id !== id)); } catch (error) { handleApiError(error, 'material'); } };

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
      ...auth,
      initialLoadComplete: auth.isLoading,
      candidates, templates, checklistStructure, consultantGoalsStructure, interviewStructure, commissions, supportMaterials, theme, origins, interviewers, pvs, teamMembers,
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