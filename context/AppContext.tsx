import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Candidate, ChecklistTaskState, CommunicationTemplate, AppContextType, ChecklistStage, InterviewSection, Commission, SupportMaterial, GoalStage, TeamMember, User } from '../types';
import { CHECKLIST_STAGES as DEFAULT_STAGES } from '../data/checklistData';
import { CONSULTANT_GOALS as DEFAULT_GOALS } from '../data/consultantGoals';
import { COMMISSIONS_DATA } from '../data/commissionData';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial Interview Structure (Matches the original hardcoded form)
const INITIAL_INTERVIEW_STRUCTURE: InterviewSection[] = [
  {
    id: 'basicProfile',
    title: '2. Perfil Básico',
    maxPoints: 20,
    questions: [
      { id: 'bp_1', text: 'Já trabalhou no modelo PJ? Se não, teria algum impeditivo?', points: 5 },
      { id: 'bp_2', text: 'Como você se organizaria para trabalhar nesse modelo?', points: 10 },
      { id: 'bp_3', text: 'Tem disponibilidade para começar de imediato?', points: 5 },
    ]
  },
  {
    id: 'commercialSkills',
    title: '3. Habilidade Comercial',
    maxPoints: 30,
    questions: [
      { id: 'cs_1', text: 'Já trabalhou com metas? Como foi quando não bateu?', points: 10 },
      { id: 'cs_2', text: 'Já teve contato com consórcio/investimentos?', points: 5 },
      { id: 'cs_3', text: 'Já trabalhou com CRM?', points: 5 },
      { id: 'cs_4', text: 'Demonstra vivência comercial e resiliência?', points: 10 },
    ]
  },
  {
    id: 'behavioralProfile',
    title: '4. Perfil Comportamental',
    maxPoints: 30,
    questions: [
      { id: 'bh_1', text: 'Maior desafio até hoje (Exemplo real)?', points: 10 },
      { id: 'bh_2', text: 'Metas de vida/carreira definidas?', points: 10 },
      { id: 'bh_3', text: 'Clareza na comunicação e nível de energia?', points: 10 },
    ]
  },
  {
    id: 'jobFit',
    title: '6. Fit com a Vaga',
    maxPoints: 20,
    questions: [
      { id: 'jf_1', text: 'Perfil empreendedor?', points: 5 },
      { id: 'jf_2', text: 'Interesse real pela oportunidade?', points: 5 },
      { id: 'jf_3', text: 'Alinhamento com modelo comissionado?', points: 10 },
    ]
  }
];

// Dummy initial data
const INITIAL_DATA: Candidate[] = [
  {
    id: '1',
    name: 'João Silva',
    phone: '(11) 99999-9999',
    interviewDate: '2023-10-25',
    interviewer: 'João Müller',
    origin: 'Indicação',
    status: 'Acompanhamento 90 Dias',
    createdAt: '2023-10-25T10:00:00Z',
    interviewScores: {
      basicProfile: 20,
      commercialSkills: 25,
      behavioralProfile: 25,
      jobFit: 20,
      notes: 'Candidato excelente, experiência prévia em seguros.'
    },
    checklistProgress: {
        'st1_interview': { completed: true, dueDate: '2023-10-25' },
        'st1_score': { completed: true, dueDate: '2023-10-25' },
        'st1_response': { completed: true, dueDate: '2023-10-26' },
        'st2_smi_link': { completed: true },
        'st3_culture': { completed: true }
    },
    consultantGoalsProgress: {}
  }
];

const DEFAULT_ORIGINS = ['Indicação', 'Prospecção', 'Tráfego Linkedin'];
const DEFAULT_INTERVIEWERS = ['João Müller'];
const DEFAULT_PVS = ['SOARES E MORAES', 'SART INVESTIMENTOS', 'KR CONSÓRCIOS', 'SOLOM INVESTIMENTOS'];

// Initial Team Data (Migrated from previous string lists)
const DEFAULT_TEAM: TeamMember[] = [
    { id: 'tm_1', name: 'João Müller', role: 'Gestor' },
    { id: 'tm_2', name: 'Kaio Rheio', role: 'Consultor' },
    { id: 'tm_3', name: 'Israel Machado', role: 'Consultor' },
    { id: 'tm_4', name: 'Leonardo Teixeira', role: 'Consultor' },
    { id: 'tm_5', name: 'Igor Reis', role: 'Consultor' },
    { id: 'tm_6', name: 'Roberta Silva', role: 'Consultor' },
    { id: 'tm_7', name: 'Gabrielli Trevisolli', role: 'Consultor' },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- AUTHENTICATION STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser({
          id: session.user.id,
          name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || session.user.email || 'Usuário',
          email: session.user.email || '',
        });
      }
      setLoadingAuth(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setUser({
            id: session.user.id,
            name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || session.user.email || 'Usuário',
            email: session.user.email || '',
          });
        } else {
          setUser(null);
        }
        if (loadingAuth) setLoadingAuth(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const register = async (name: string, email: string, pass: string) => {
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // --- EXISTING STATE ---
  
  // Theme Management
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('sart_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('sart_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Manage Dynamic Lists
  const [origins, setOrigins] = useState<string[]>(() => {
    const saved = localStorage.getItem('sart_origins');
    return saved ? JSON.parse(saved) : DEFAULT_ORIGINS;
  });

  const [interviewers, setInterviewers] = useState<string[]>(() => {
    const saved = localStorage.getItem('sart_interviewers');
    return saved ? JSON.parse(saved) : DEFAULT_INTERVIEWERS;
  });

  const [pvs, setPvs] = useState<string[]>(() => {
    const saved = localStorage.getItem('sart_pvs');
    return saved ? JSON.parse(saved) : DEFAULT_PVS;
  });

  // TEAM MANAGEMENT STATE
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem('sart_team_members');
    return saved ? JSON.parse(saved) : DEFAULT_TEAM;
  });

  useEffect(() => {
    localStorage.setItem('sart_origins', JSON.stringify(origins));
  }, [origins]);

  useEffect(() => {
    localStorage.setItem('sart_interviewers', JSON.stringify(interviewers));
  }, [interviewers]);

  useEffect(() => {
    localStorage.setItem('sart_pvs', JSON.stringify(pvs));
  }, [pvs]);

  useEffect(() => {
    localStorage.setItem('sart_team_members', JSON.stringify(teamMembers));
  }, [teamMembers]);

  const addOrigin = (origin: string) => {
    if (!origins.includes(origin)) {
      setOrigins([...origins, origin]);
    }
  };

  const addInterviewer = (interviewer: string) => {
    if (!interviewers.includes(interviewer)) {
      setInterviewers([...interviewers, interviewer]);
    }
  };

  const addPV = (pv: string) => {
    if (!pvs.includes(pv)) {
      setPvs([...pvs, pv]);
    }
  };

  // Team CRUD
  const addTeamMember = (member: TeamMember) => {
      setTeamMembers(prev => [...prev, member]);
  };

  const updateTeamMember = (id: string, updates: Partial<TeamMember>) => {
      setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const deleteTeamMember = (id: string) => {
      setTeamMembers(prev => prev.filter(m => m.id !== id));
  };


  // 1. Manage Checklist Structure (with hydration of default data)
  const [checklistStructure, setChecklistStructure] = useState<ChecklistStage[]>(() => {
    const saved = localStorage.getItem('sart_checklist_structure');
    let structure = saved ? JSON.parse(saved) : DEFAULT_STAGES;
    return structure;
  });

  // 1.1 Manage Consultant Goals Structure
  const [consultantGoalsStructure, setConsultantGoalsStructure] = useState<GoalStage[]>(() => {
      const saved = localStorage.getItem('sart_consultant_goals_structure');
      return saved ? JSON.parse(saved) : DEFAULT_GOALS;
  });

  // 2. Manage Interview Structure
  const [interviewStructure, setInterviewStructure] = useState<InterviewSection[]>(() => {
    const saved = localStorage.getItem('sart_interview_structure');
    return saved ? JSON.parse(saved) : INITIAL_INTERVIEW_STRUCTURE;
  });

  // 3. Manage Candidates
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
      const saved = localStorage.getItem('sart_candidates');
      if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Migration/Fix logic for legacy boolean checklist
            if (parsed.length > 0 && parsed[0].checklistProgress) {
               return parsed.map((c: any) => ({
                 ...c,
                 checklistProgress: Object.keys(c.checklistProgress).reduce((acc: any, key) => {
                   if (typeof c.checklistProgress[key] === 'boolean') {
                        acc[key] = { completed: c.checklistProgress[key] };
                   } else {
                        acc[key] = c.checklistProgress[key] || { completed: false };
                   }
                   return acc;
                 }, {}),
                 // Migrate docs -> consultantGoalsProgress if missing
                 consultantGoalsProgress: c.consultantGoalsProgress || {}
               }));
            }
            return parsed;
        } catch (e) {
            console.error("Error parsing candidates", e);
            return INITIAL_DATA;
        }
      }
      return INITIAL_DATA;
  });

  // 4. Manage Templates
  const [templates, setTemplates] = useState<Record<string, CommunicationTemplate>>(() => {
    const savedTemplates = localStorage.getItem('sart_templates');
    const parsedSaved = savedTemplates ? JSON.parse(savedTemplates) : {};
    
    const initialTemplates: Record<string, CommunicationTemplate> = {};
    DEFAULT_STAGES.forEach(stage => {
      stage.items.forEach(item => {
        if (item.whatsappTemplate || item.resource) {
            if (parsedSaved[item.id]) {
                 initialTemplates[item.id] = parsedSaved[item.id];
            } else {
                initialTemplates[item.id] = {
                    id: item.id,
                    label: item.label,
                    text: item.whatsappTemplate,
                    resource: item.resource
                };
            }
        }
      });
    });
    
    return { ...initialTemplates, ...parsedSaved };
  });

  // 5. Manage Commissions
  const [commissions, setCommissions] = useState<Commission[]>(() => {
    const saved = localStorage.getItem('sart_commissions');
    return saved ? JSON.parse(saved) : COMMISSIONS_DATA;
  });

  // 6. Manage Support Materials
  const [supportMaterials, setSupportMaterials] = useState<SupportMaterial[]>(() => {
    const saved = localStorage.getItem('sart_support_materials');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist Data
  useEffect(() => {
    localStorage.setItem('sart_checklist_structure', JSON.stringify(checklistStructure));
  }, [checklistStructure]);

  useEffect(() => {
    localStorage.setItem('sart_consultant_goals_structure', JSON.stringify(consultantGoalsStructure));
  }, [consultantGoalsStructure]);

  useEffect(() => {
    localStorage.setItem('sart_interview_structure', JSON.stringify(interviewStructure));
  }, [interviewStructure]);

  useEffect(() => {
    localStorage.setItem('sart_candidates', JSON.stringify(candidates));
  }, [candidates]);

  useEffect(() => {
    localStorage.setItem('sart_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('sart_commissions', JSON.stringify(commissions));
  }, [commissions]);

  useEffect(() => {
    localStorage.setItem('sart_support_materials', JSON.stringify(supportMaterials));
  }, [supportMaterials]);

  // Actions
  const addCandidate = (candidate: Candidate) => {
    setCandidates((prev) => [candidate, ...prev]);
  };

  const updateCandidate = (id: string, updates: Partial<Candidate>) => {
    setCandidates((prev) => 
      prev.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  };

  const toggleChecklistItem = (candidateId: string, itemId: string) => {
    setCandidates((prev) => 
      prev.map(c => {
        if (c.id !== candidateId) return c;
        const currentState = c.checklistProgress[itemId] || { completed: false };
        return {
          ...c,
          checklistProgress: {
            ...c.checklistProgress,
            [itemId]: { ...currentState, completed: !currentState.completed }
          }
        };
      })
    );
  };

  const setChecklistDueDate = (candidateId: string, itemId: string, date: string) => {
    setCandidates((prev) => 
      prev.map(c => {
        if (c.id !== candidateId) return c;
        const currentState = c.checklistProgress[itemId] || { completed: false };
        return {
          ...c,
          checklistProgress: {
            ...c.checklistProgress,
            [itemId]: { ...currentState, dueDate: date }
          }
        };
      })
    );
  };

  const toggleConsultantGoal = (candidateId: string, goalId: string) => {
    setCandidates((prev) => 
      prev.map(c => {
        if (c.id !== candidateId) return c;
        const currentProgress = c.consultantGoalsProgress || {};
        const isCompleted = currentProgress[goalId] || false;
        
        return {
          ...c,
          consultantGoalsProgress: {
            ...currentProgress,
            [goalId]: !isCompleted
          }
        };
      })
    );
  };

  const saveTemplate = (id: string, updates: Partial<CommunicationTemplate>) => {
    setTemplates(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  };

  const getCandidate = (id: string) => candidates.find(c => c.id === id);

  // Structure Management Actions (Checklist)
  const addChecklistItem = (stageId: string, label: string) => {
    const newItemId = `custom_${Date.now()}`;
    setChecklistStructure(prev => prev.map(stage => {
      if (stage.id !== stageId) return stage;
      return {
        ...stage,
        items: [...stage.items, { id: newItemId, label }]
      };
    }));
  };

  const updateChecklistItem = (stageId: string, itemId: string, label: string) => {
    setChecklistStructure(prev => prev.map(stage => {
      if (stage.id !== stageId) return stage;
      return {
        ...stage,
        items: stage.items.map(item => item.id === itemId ? { ...item, label } : item)
      };
    }));
  };

  const deleteChecklistItem = (stageId: string, itemId: string) => {
    setChecklistStructure(prev => prev.map(stage => {
      if (stage.id !== stageId) return stage;
      return {
        ...stage,
        items: stage.items.filter(item => item.id !== itemId)
      };
    }));
  };

  const moveChecklistItem = (stageId: string, itemId: string, direction: 'up' | 'down') => {
    setChecklistStructure(prev => prev.map(stage => {
      if (stage.id !== stageId) return stage;
      
      const index = stage.items.findIndex(i => i.id === itemId);
      if (index === -1) return stage;
      if (direction === 'up' && index === 0) return stage;
      if (direction === 'down' && index === stage.items.length - 1) return stage;

      const newItems = [...stage.items];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Swap
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      
      return { ...stage, items: newItems };
    }));
  };

  const resetChecklistToDefault = () => {
      setChecklistStructure(DEFAULT_STAGES);
      const initialTemplates: Record<string, CommunicationTemplate> = {};
      DEFAULT_STAGES.forEach(stage => {
        stage.items.forEach(item => {
            if (item.whatsappTemplate || item.resource) {
                initialTemplates[item.id] = {
                    id: item.id,
                    label: item.label,
                    text: item.whatsappTemplate,
                    resource: item.resource
                };
            }
        });
      });
      setTemplates(initialTemplates);
  };

  // Structure Management Actions (Consultant Goals)
  const addGoalItem = (stageId: string, label: string) => {
    const newItemId = `goal_${Date.now()}`;
    setConsultantGoalsStructure(prev => prev.map(stage => {
      if (stage.id !== stageId) return stage;
      return {
        ...stage,
        items: [...stage.items, { id: newItemId, label }]
      };
    }));
  };

  const updateGoalItem = (stageId: string, itemId: string, label: string) => {
    setConsultantGoalsStructure(prev => prev.map(stage => {
      if (stage.id !== stageId) return stage;
      return {
        ...stage,
        items: stage.items.map(item => item.id === itemId ? { ...item, label } : item)
      };
    }));
  };

  const deleteGoalItem = (stageId: string, itemId: string) => {
    setConsultantGoalsStructure(prev => prev.map(stage => {
      if (stage.id !== stageId) return stage;
      return {
        ...stage,
        items: stage.items.filter(item => item.id !== itemId)
      };
    }));
  };

  const moveGoalItem = (stageId: string, itemId: string, direction: 'up' | 'down') => {
    setConsultantGoalsStructure(prev => prev.map(stage => {
      if (stage.id !== stageId) return stage;

      const index = stage.items.findIndex(i => i.id === itemId);
      if (index === -1) return stage;
      if (direction === 'up' && index === 0) return stage;
      if (direction === 'down' && index === stage.items.length - 1) return stage;

      const newItems = [...stage.items];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      // Swap
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

      return { ...stage, items: newItems };
    }));
  };

  const resetGoalsToDefault = () => {
      setConsultantGoalsStructure(DEFAULT_GOALS);
  };


  // Interview Structure Actions
  const updateInterviewSection = (sectionId: string, updates: Partial<InterviewSection>) => {
    setInterviewStructure(prev => prev.map(sec => 
      sec.id === sectionId ? { ...sec, ...updates } : sec
    ));
  };

  const addInterviewQuestion = (sectionId: string, text: string, points: number) => {
    setInterviewStructure(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        questions: [...sec.questions, { id: `q_${Date.now()}`, text, points }]
      };
    }));
  };

  const updateInterviewQuestion = (sectionId: string, questionId: string, updates: Partial<InterviewSection['questions'][0]>) => {
    setInterviewStructure(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        questions: sec.questions.map(q => q.id === questionId ? { ...q, ...updates } : q)
      };
    }));
  };

  const deleteInterviewQuestion = (sectionId: string, questionId: string) => {
    setInterviewStructure(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        questions: sec.questions.filter(q => q.id !== questionId)
      };
    }));
  };

  const moveInterviewQuestion = (sectionId: string, questionId: string, direction: 'up' | 'down') => {
    setInterviewStructure(prev => prev.map(sec => {
        if (sec.id !== sectionId) return sec;

        const index = sec.questions.findIndex(q => q.id === questionId);
        if (index === -1) return sec;
        if (direction === 'up' && index === 0) return sec;
        if (direction === 'down' && index === sec.questions.length - 1) return sec;

        const newQuestions = [...sec.questions];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap
        [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];

        return { ...sec, questions: newQuestions };
    }));
  };

  const resetInterviewToDefault = () => {
      setInterviewStructure(INITIAL_INTERVIEW_STRUCTURE);
  };

  // Commission Actions
  const addCommission = (commission: Commission) => {
    setCommissions(prev => [commission, ...prev]);
  };

  const updateCommission = (id: string, updates: Partial<Commission>) => {
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCommission = (id: string) => {
    setCommissions(prev => prev.filter(c => c.id !== id));
  };

  // Support Material Actions
  const addSupportMaterial = (material: SupportMaterial) => {
    setSupportMaterials(prev => [material, ...prev]);
  };

  const deleteSupportMaterial = (id: string) => {
    setSupportMaterials(prev => prev.filter(m => m.id !== id));
  };

  return (
    <AppContext.Provider value={{ 
      user,
      loadingAuth,
      login,
      register,
      logout,
      candidates, 
      templates,
      checklistStructure,
      consultantGoalsStructure,
      interviewStructure,
      commissions,
      supportMaterials,
      theme,
      origins,
      interviewers,
      pvs,
      teamMembers,
      addTeamMember,
      updateTeamMember,
      deleteTeamMember,
      toggleTheme,
      addOrigin,
      addInterviewer,
      addPV,
      addCandidate, 
      updateCandidate, 
      toggleChecklistItem, 
      toggleConsultantGoal,
      setChecklistDueDate, 
      getCandidate,
      saveTemplate,
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
      addCommission,
      updateCommission,
      deleteCommission,
      addSupportMaterial,
      deleteSupportMaterial
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