import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '../src/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { Candidate, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, Commission, SupportMaterial, GoalStage, TeamMember, InstallmentStatus, CommissionStatus, InstallmentInfo } from '../types';
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

const getOverallStatus = (details: Record<string, InstallmentInfo>): CommissionStatus => {
    const statuses = Object.values(details).map(info => info.status);
    if (statuses.every(s => s === 'Pago' || s === 'Cancelado')) return 'Concluído';
    if (statuses.some(s => s === 'Atraso')) return 'Atraso';
    if (statuses.every(s => s === 'Cancelado')) return 'Cancelado';
    return 'Em Andamento';
};

const clearStaleAuth = () => {
  const token = localStorage.getItem('supabase.auth.token');
  if (token) {
    try {
      const parsed = JSON.parse(token);
      const expiry = parsed.expires_at ? new Date(parsed.expires_at * 1000) : null;
      
      if (expiry && expiry < new Date()) {
        console.log('🗑️ Token expirado encontrado, limpando...');
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refreshToken');
        return true;
      }
    } catch (e) {
      console.log('🗑️ Token corrompido, limpando...');
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.refreshToken');
      return true;
    }
  }
  return false;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const { user } = auth;
  const fetchedUserIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const [isDataLoading, setIsDataLoading] = useState(true);
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
    console.log('🧹 Resetting local state...');
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
    setIsDataLoading(false);
  };

  const refetchCommissions = useCallback(async () => {
    if (!user) return;
    
    if (isFetchingRef.current) {
      console.log('[refetchCommissions] Já está em execução, ignorando chamada duplicada');
      return;
    }
    
    isFetchingRef.current = true;
    const fetchId = Date.now();
    console.log(`[${new Date().toISOString()}] REFETCH_COMMISSIONS_START #${fetchId}`);
  
    try {
      const { data, error } = await supabase
        .from("commissions")
        .select("id, data, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
  
      if (error) {
        console.error(`[${new Date().toISOString()}] REFETCH_COMMISSIONS_ERROR #${fetchId}:`, error);
        return;
      }
  
      const normalized: Commission[] = (data || []).map(item => {
        const commission = item.data as Commission;
  
        if (!commission.installmentDetails) {
          const details: Record<string, InstallmentInfo> = {};
          for (let i = 1; i <= 15; i++) details[i.toString()] = { status: "Pendente" };
          commission.installmentDetails = details;
        } else {
            // Data migration for old string format
            const firstKey = Object.keys(commission.installmentDetails)[0];
            if (firstKey && typeof (commission.installmentDetails as any)[firstKey] === 'string') {
                const migratedDetails: Record<string, InstallmentInfo> = {};
                Object.entries(commission.installmentDetails).forEach(([key, value]) => {
                    migratedDetails[key] = { status: value as InstallmentStatus };
                });
                commission.installmentDetails = migratedDetails;
            }
        }
  
        return {
          ...commission,
          db_id: item.id,
          criado_em: item.created_at,
        };
      });
  
      console.log(`[${new Date().toISOString()}] REFETCH_COMMISSIONS_SUCCESS #${fetchId}:`, normalized.length, 'itens');
      setCommissions(normalized);
  
    } catch (err) {
      console.error(`[${new Date().toISOString()}] REFETCH_COMMISSIONS_CRITICAL_ERROR #${fetchId}:`, err);
    } finally {
      setTimeout(() => {
        isFetchingRef.current = false;
        console.log(`[${new Date().toISOString()}] REFETCH_COMMISSIONS_COMPLETE #${fetchId}`);
      }, 100);
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
          { data: materialsData, error: materialsError }
        ] = await Promise.all([
          supabase.from('app_config').select('data').eq('user_id', userId).maybeSingle(),
          supabase.from('candidates').select('id, data').eq('user_id', userId),
          supabase.from('team_members').select('id, data').eq('user_id', userId),
          supabase.from('support_materials').select('id, data').eq('user_id', userId)
        ]);

        if (configError) console.error("Config error:", configError);
        if (candidatesError) console.error("Candidates error:", candidatesError);
        if (teamMembersError) console.error("Team error:", teamMembersError);
        if (materialsError) console.error("Materials error:", materialsError);

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
        
        refetchCommissions();

        const recoverPendingCommissions = async () => {
          try {
            const pending = JSON.parse(localStorage.getItem('pending_commissions') || '[]');
            if (pending.length === 0) return;
            
            console.log(`[RECOVERY] Encontradas ${pending.length} comissões pendentes para sincronizar`);
            
            for (const pendingCommission of pending) {
              try {
                console.log(`[RECOVERY] Tentando sincronizar comissão: ${pendingCommission._id}`);
                
                const { _id, _timestamp, _retryCount, ...cleanCommission } = pendingCommission;
                
                const payload = { user_id: user.id, data: cleanCommission };
                
                const { data, error } = await supabase
                  .from('commissions')
                  .insert(payload)
                  .select('id, created_at')
                  .maybeSingle();
                  
                if (error) throw error;
                
                console.log(`[RECOVERY] Comissão ${_id} sincronizada com sucesso!`);
                
                const updatedPending = JSON.parse(localStorage.getItem('pending_commissions') || '[]')
                  .filter((pc: any) => pc._id !== _id);
                localStorage.setItem('pending_commissions', JSON.stringify(updatedPending));
                
                const newCommissionWithDbId = { 
                  ...cleanCommission, 
                  db_id: data.id,
                  criado_em: data.created_at
                };
                
                setCommissions(prev => {
                  const filtered = prev.filter(c => c.db_id !== `temp_${_id}`);
                  return [newCommissionWithDbId, ...filtered];
                });
                
              } catch (error) {
                console.error(`[RECOVERY] Falha ao sincronizar comissão ${pendingCommission._id}:`, error);
                
                const updatedPending = JSON.parse(localStorage.getItem('pending_commissions') || '[]')
                  .map((pc: any) => 
                    pc._id === pendingCommission._id 
                      ? { ...pc, _retryCount: (pc._retryCount || 0) + 1 } 
                      : pc
                  );
                localStorage.setItem('pending_commissions', JSON.stringify(updatedPending));
              }
            }
          } catch (error) {
            console.error('[RECOVERY] Erro no processo de recuperação:', error);
          }
        };

        if (user) {
          setTimeout(() => {
            recoverPendingCommissions();
          }, 3000);
        }

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

  const addCommission = useCallback(async (commission: Commission): Promise<Commission> => {
    if (!user) throw new Error("Usuário não autenticado.");
  
    console.log("⚡ SALVAMENTO ULTRA-RÁPIDO INICIADO");
  
    const localId = `local_${Date.now()}`;
    
    const localCommission: Commission = {
      ...commission,
      db_id: localId,
      criado_em: new Date().toISOString()
    };
  
    setCommissions(prev => [localCommission, ...prev]);
    
    setTimeout(() => {
      alert(`✅ VENDA REGISTRADA!\n\nCliente: ${commission.clientName}\nValor: R$ ${commission.value.toLocaleString()}\nID: ${localId}\n\nA sincronização ocorrerá em segundo plano.`);
    }, 50);
  
    setTimeout(async () => {
      try {
        console.log("🔄 Iniciando sincronização em background...");
        
        const cleanCommission = {
          ...commission,
          customRules: commission.customRules?.length ? commission.customRules : undefined,
          angelName: commission.angelName || undefined,
          managerName: commission.managerName || 'N/A',
        };
        
        const payload = { user_id: user.id, data: cleanCommission };
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Background sync timeout')), 10000)
        );
  
        const insertPromise = supabase
          .from('commissions')
          .insert(payload)
          .select('id, created_at')
          .maybeSingle();
  
        const { data, error } = await Promise.race([insertPromise, timeoutPromise]) as any;
  
        if (error) throw error;
        
        if (data && data.id) {
          console.log("🎉 Sincronizado com sucesso! ID real:", data.id);
          
          setCommissions(prev => 
            prev.map(c => 
              c.db_id === localId 
                ? { 
                    ...c, 
                    db_id: data.id.toString(), 
                    criado_em: data.created_at,
                    _synced: true 
                  }
                : c
            )
          );
          
          const pending = JSON.parse(localStorage.getItem('pending_commissions') || '[]')
            .filter((p: any) => p._localId !== localId);
          localStorage.setItem('pending_commissions', JSON.stringify(pending));
          
        } else {
          throw new Error('Nenhum ID retornado');
        }
        
      } catch (error: any) {
        console.log("⚠️ Background sync falhou, mantendo local. Erro:", error.message);
        
        const pending = JSON.parse(localStorage.getItem('pending_commissions') || '[]');
        
        const alreadyExists = pending.some((p: any) => p._localId === localId);
        if (!alreadyExists) {
          pending.push({
            ...commission,
            _localId: localId,
            _timestamp: new Date().toISOString(),
            _error: error.message,
            _attempts: 1
          });
          localStorage.setItem('pending_commissions', JSON.stringify(pending));
        }
      }
    }, 2000);
  
    return localCommission;
  }, [user]);

  const updateCommission = useCallback(async (id: string, updates: Partial<Commission>) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const commissionToUpdate = commissions.find(c => c.id === id);
    if (!commissionToUpdate || !commissionToUpdate.db_id) throw new Error("Comissão não encontrada para atualização.");
    
    const originalData = { ...commissionToUpdate };
    delete (originalData as any).db_id;
    delete (originalData as any).criado_em;

    const newData = { ...originalData, ...updates };
    const payload = { data: newData };

    const { error } = await supabase
      .from('commissions')
      .update(payload)
      .match({ id: commissionToUpdate.db_id, user_id: user.id });

    if (error) {
      console.error(`[${new Date().toISOString()}] UPDATE_COMMISSION_ERROR`, { id: commissionToUpdate.db_id, error: error.message, payload });
      throw error;
    }

    await refetchCommissions();
  }, [user, commissions, refetchCommissions]);

  const deleteCommission = useCallback(async (id: string) => {
    if (!user) throw new Error("Usuário não autenticado.");
    const commissionToDelete = commissions.find(c => c.id === id);
    if (!commissionToDelete || !commissionToDelete.db_id) throw new Error("Comissão não encontrada para exclusão.");

    console.log(`[${new Date().toISOString()}] DELETE_COMMISSION_START`, { id: commissionToDelete.db_id });

    const { error } = await supabase
      .from('commissions')
      .delete()
      .match({ id: commissionToDelete.db_id, user_id: user.id });

    if (error) {
      console.error(`[${new Date().toISOString()}] DELETE_COMMISSION_ERROR`, { id: commissionToDelete.db_id, error: error.message });
      throw error;
    }

    console.log(`[${new Date().toISOString()}] DELETE_COMMISSION_SUCCESS`, { id: commissionToDelete.db_id });
    await refetchCommissions();
  }, [user, commissions, refetchCommissions]);
  
  const addSupportMaterial = useCallback(async (material: SupportMaterial) => { if (!user) throw new Error("Usuário não autenticado."); const { data, error } = await supabase.from('support_materials').insert({ user_id: user.id, data: material }).select('id').single(); if (error) { console.error(error); throw error; } if (data) { setSupportMaterials(prev => [{ ...material, db_id: data.id }, ...prev]); } }, [user]);
  const deleteSupportMaterial = useCallback(async (id: string) => { if (!user) throw new Error("Usuário não autenticado."); const m = supportMaterials.find(m => m.id === id); if (!m || !m.db_id) throw new Error("Material não encontrado"); const { error } = await supabase.from('support_materials').delete().match({ id: m.db_id, user_id: user.id }); if (error) { console.error(error); throw error; } setSupportMaterials(prev => prev.filter(p => p.id !== id)); }, [user, supportMaterials]);

  const updateInstallmentStatus = useCallback(async (
    commissionId: string, 
    installmentNumber: number, 
    status: InstallmentStatus,
    paidDate?: string
  ) => {
    console.log(`🔄 Atualizando parcela ${installmentNumber} para ${status}${paidDate ? ` em ${paidDate}` : ''}`);
    
    const commission = commissions.find(c => c.id === commissionId);
    if (!commission) {
      console.error("Comissão não encontrada");
      return;
    }

    const newPaidDate = status === 'Pago' 
      ? (paidDate || new Date().toISOString().split('T')[0])
      : undefined;
  
    const newDetails = { 
      ...commission.installmentDetails, 
      [installmentNumber]: {
        status,
        ...(newPaidDate && { paidDate: newPaidDate })
      }
    };
  
    const newOverallStatus = getOverallStatus(newDetails);
  
    try {
      const updatedCommission = { 
        ...commission, 
        installmentDetails: newDetails,
        status: newOverallStatus
      };

      setCommissions(prev => 
        prev.map(c => 
          c.id === commissionId 
            ? updatedCommission
            : c
        )
      );
  
      if (commission.db_id && user) {
        const { db_id, criado_em, _synced, ...dataToUpdate } = updatedCommission;

        const { error } = await supabase
          .from('commissions')
          .update({ data: dataToUpdate })
          .eq('id', commission.db_id)
          .eq('user_id', user.id);
  
        if (error) throw error;
        console.log("✅ Status salvo no banco");
      }
  
    } catch (error: any) {
      console.error("Erro ao salvar status:", error);
      alert("Erro ao salvar status da parcela. Tente novamente.");
    }
  }, [commissions, user]);

  const getCandidate = useCallback((id: string) => candidates.find(c => c.id === id), [candidates]);
  const toggleChecklistItem = useCallback(async (candidateId: string, itemId: string) => { const c = getCandidate(candidateId); if(c) { const state = c.checklistProgress[itemId] || { completed: false }; await updateCandidate(candidateId, { checklistProgress: { ...c.checklistProgress, [itemId]: { ...state, completed: !state.completed } } }); } }, [getCandidate, updateCandidate]);
  const setChecklistDueDate = useCallback(async (candidateId: string, itemId: string, date: string) => { const c = getCandidate(candidateId); if(c) { const state = c.checklistProgress[itemId] || { completed: false }; await updateCandidate(candidateId, { checklistProgress: { ...c.checklistProgress, [itemId]: { ...state, dueDate: date } } }); } }, [getCandidate, updateCandidate]);
  const toggleConsultantGoal = useCallback(async (candidateId: string, goalId: string) => { const c = getCandidate(candidateId); if(c) { const progress = c.consultantGoalsProgress || {}; await updateCandidate(candidateId, { consultantGoalsProgress: { ...progress, [goalId]: !progress[goalId] } }); } }, [getCandidate, updateCandidate]);

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

  useEffect(() => {
    if (!user) return;
    
    const syncPendingCommissions = async () => {
      const pending = JSON.parse(localStorage.getItem('pending_commissions') || '[]');
      if (pending.length === 0) return;
      
      console.log(`⏰ Sincronização periódica: ${pending.length} pendentes`);
      
      for (const item of pending) {
        try {
          const { _localId, _timestamp, _attempts, ...cleanData } = item;
          
          const { data, error } = await supabase
            .from('commissions')
            .insert({ user_id: user.id, data: cleanData })
            .select('id, created_at')
            .maybeSingle();
            
          if (!error && data) {
            setCommissions(prev => 
              prev.map(c => 
                c.db_id === _localId 
                  ? { ...c, db_id: data.id.toString(), criado_em: data.created_at }
                  : c
              )
            );
            
            const updated = pending.filter((p: any) => p._localId !== _localId);
            localStorage.setItem('pending_commissions', JSON.stringify(updated));
          }
        } catch (error) {
          console.log(`❌ Falha ao sincronizar ${item._localId}`);
        }
      }
    };
    
    const interval = setInterval(syncPendingCommissions, 2 * 60 * 1000);
    
    setTimeout(syncPendingCommissions, 5000);
    
    return () => clearInterval(interval);
  }, [user]);

  return (
    <AppContext.Provider value={{ 
      ...auth,
      isLoading: auth.isLoading,
      isDataLoading,
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