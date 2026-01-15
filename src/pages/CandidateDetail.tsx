import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, CheckSquare, FileText, Phone, Calendar, Clock, MessageCircle, Paperclip, CheckCircle2, Target, Trash2, CalendarPlus, Save, Loader2, Users } from 'lucide-react';
import { CandidateStatus, CommunicationTemplate, InterviewScores } from '@/types';
import { MessageViewerModal } from '@/components/MessageViewerModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const CandidateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { getCandidate, toggleChecklistItem, toggleConsultantGoal, updateCandidate, deleteCandidate, setChecklistDueDate, templates, checklistStructure, consultantGoalsStructure, interviewStructure, teamMembers } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log("CandidateDetail: id from useParams", id);
  console.log("CandidateDetail: Type of getCandidate before call:", typeof getCandidate);
  const candidate = getCandidate(id || '');
  console.log("CandidateDetail: fetched candidate", candidate);
  
  const [activeTab, setActiveTab] = useState<'checklist' | 'goals' | 'interview'>(
    location.state?.openInterviewTab ? 'interview' : 'checklist'
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  
  const [scores, setScores] = useState<InterviewScores>(
    candidate?.interviewScores ? JSON.parse(JSON.stringify(candidate.interviewScores)) : { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' }
  );
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>(
    candidate?.checkedQuestions ? JSON.parse(JSON.stringify(candidate.checkedQuestions || {})) : {}
  );
  const [isSaving, setIsSaving] = useState(false);

  const [responsibleUserId, setResponsibleUserId] = useState<string>(candidate?.responsibleUserId || '');
  const [isUpdatingResponsible, setIsUpdatingResponsible] = useState(false);

  const responsibleMembers = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('Gestor') || m.roles.includes('Anjo')));
  }, [teamMembers]);

  const currentResponsibleMember = useMemo(() => {
    return responsibleMembers.find(m => m.id === responsibleUserId);
  }, [responsibleMembers, responsibleUserId]);

  useEffect(() => {
    if (candidate) {
      setScores(JSON.parse(JSON.stringify(candidate.interviewScores)));
      setCheckedQuestions(JSON.parse(JSON.stringify(candidate.checkedQuestions || {})));
      setResponsibleUserId(candidate.responsibleUserId || '');
    }
  }, [candidate]);

  if (!candidate) {
    console.log("CandidateDetail: Candidate not found, rendering fallback.");
    return <div className="p-4 sm:p-8 text-gray-500 dark:text-gray-400">Candidato não encontrado.</div>;
  }

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await updateCandidate(candidate.id, { status: e.target.value as CandidateStatus });
  };

  const handleDelete = async () => {
    if (candidate && confirm(`Tem certeza que deseja excluir ${candidate.name}? Esta ação não pode ser desfeita.`)) {
      await deleteCandidate(candidate.id);
      navigate('/gestor/dashboard');
    }
  };

  const openMessageModal = (templateId: string) => {
    const template = templates[templateId];
    if (template) {
        setSelectedTemplate(template);
        setModalOpen(true);
    }
  };

  // const handleAddToGoogleCalendar = (taskLabel: string, dueDate: string) => { // REMOVED: Google Calendar integration
  //   const title = encodeURIComponent(`${taskLabel} - ${candidate.name}`);
  //   const startDate = new Date(dueDate + 'T00:00:00');
  //   const endDate = new Date(startDate);
  //   endDate.setDate(startDate.getDate() + 1);
  //   const formatDateForGoogle = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');
  //   const dates = `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`;
  //   const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}`;
  //   window.open(url, '_blank');
  // };

  const handleScoreChange = (sectionId: string, value: number) => {
    setScores(prev => ({ ...prev, [sectionId]: value }));
  };

  const handleQuestionToggle = (questionId: string, points: number, sectionId: string) => {
    setCheckedQuestions(prev => {
      const newCheckedQuestions = { ...prev, [questionId]: !prev[questionId] };
      
      setScores(currentScores => {
        const currentSectionScore = (currentScores[sectionId] as number) || 0;
        const newSectionScore = newCheckedQuestions[questionId] 
          ? currentSectionScore + points 
          : currentSectionScore - points;
        
        const sectionMaxPoints = interviewStructure.find(s => s.id === sectionId)?.maxPoints || 0;
        const finalSectionScore = Math.max(0, Math.min(sectionMaxPoints, newSectionScore));

        return { ...currentScores, [sectionId]: finalSectionScore };
      });

      return newCheckedQuestions;
    });
  };

  const handleSaveInterview = async () => {
    setIsSaving(true);
    try {
      await updateCandidate(candidate.id, {
        interviewScores: scores,
        checkedQuestions: checkedQuestions,
      });
      alert('Avaliação salva com sucesso!');
    } catch (error: any) {
      alert(`Erro ao salvar avaliação: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateResponsible = async (newResponsibleId: string) => {
    setIsUpdatingResponsible(true);
    try {
      await updateCandidate(candidate.id, { responsibleUserId: newResponsibleId });
      setResponsibleUserId(newResponsibleId);
      alert('Responsável atualizado com sucesso!');
    } catch (error: any) {
      alert(`Erro ao atualizar responsável: ${error.message}`);
    } finally {
      setIsUpdatingResponsible(false);
    }
  };

  const totalScore = Object.entries(scores)
    .filter(([key]) => key !== 'notes')
    .reduce((sum, [_, val]) => sum + (typeof val === 'number' ? val : 0), 0);

  const getGoalColorClass = (color: string, isHeader = false) => {
    switch(color) {
      case 'blue': return isHeader ? 'bg-blue-600 text-white' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'green': return isHeader ? 'bg-green-600 text-white' : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'orange': return isHeader ? 'bg-orange-500 text-white' : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
      case 'brown': return isHeader ? 'bg-[#795548] text-white' : 'bg-[#efebe9] border-[#d7ccc8] dark:bg-[#3e2723]/30 dark:border-[#5d4037]';
      default: return isHeader ? 'bg-gray-600 text-white' : 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <button onClick={() => navigate('/gestor/dashboard')} className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Dashboard
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold text-xl">
                {candidate.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{candidate.name}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                 <span className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {candidate.phone || 'Não informado'}</span>
                 <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" /> Entrevista: {new Date(candidate.interviewDate + 'T00:00:00').toLocaleDateString()}
                    {/* <button onClick={() => handleAddToGoogleCalendar('Entrevista', candidate.interviewDate)} className="ml-2 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"><CalendarPlus className="w-4 h-4" /></button> */}
                 </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end w-full md:w-auto">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mb-1">Status Atual</label>
            <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
                <select 
                    value={candidate.status} 
                    onChange={handleStatusChange}
                    className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md border"
                >
                    <option>Entrevista</option>
                    <option>Aguardando Prévia</option>
                    <option>Onboarding Online</option>
                    <option>Integração Presencial</option>
                    <option>Acompanhamento 90 Dias</option>
                    <option>Autorizado</option>
                    <option>Reprovado</option>
                </select>
                <button
                    onClick={handleDelete}
                    className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-md transition border border-red-100 dark:border-red-900/30 w-full sm:w-auto"
                    title="Excluir Candidato"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <div className="mt-4 w-full">
              <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mb-1">Responsável</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Select
                  value={responsibleUserId}
                  onValueChange={handleUpdateResponsible}
                  disabled={isUpdatingResponsible}
                >
                  <SelectTrigger className="w-full pl-10 py-2 text-base border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md border">
                    <SelectValue placeholder="Selecione um gestor ou anjo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                    {responsibleMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.roles.join(', ')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isUpdatingResponsible && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-500" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'checklist' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Checklist & Evolução</span>
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'goals' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Metas do Consultor</span>
        </button>
        <button
          onClick={() => setActiveTab('interview')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'interview' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Dados da Entrevista</span>
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'checklist' && (
          <div className="space-y-6">
            {checklistStructure.map((stage) => {
              const completedCount = stage.items.filter(i => candidate.checklistProgress[i.id]?.completed).length;
              const totalCount = stage.items.length;
              const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

              return (
                <div key={stage.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between items-center flex-col sm:flex-row mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{stage.title}</h3>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-300 bg-gray-200 dark:bg-slate-600 px-2 py-1 rounded mt-2 sm:mt-0">{progress}% Concluído</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{stage.description}</p>
                    <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                      <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                  <div className="p-0">
                    <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                      {stage.items.map((item) => {
                        const state = candidate.checklistProgress[item.id] || { completed: false };
                        const hasTemplate = !!templates[item.id];
                        const template = templates[item.id];
                        
                        return (
                        <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                          <div className="flex items-start sm:items-center space-x-3 mb-2 sm:mb-0 flex-1">
                            <div className="flex items-center h-5">
                              <input
                                id={item.id}
                                type="checkbox"
                                checked={!!state.completed}
                                onChange={async () => await toggleChecklistItem(candidate.id, item.id)}
                                className="focus:ring-brand-500 h-5 w-5 text-brand-600 border-gray-300 dark:border-slate-500 rounded cursor-pointer dark:bg-slate-600"
                              />
                            </div>
                            <div className="flex flex-col">
                                <label htmlFor={item.id} className={`text-sm font-medium cursor-pointer select-none ${state.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                {item.label}
                                </label>
                                {hasTemplate && (template.text || template.resource) && (
                                    <div className="flex space-x-2 mt-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); openMessageModal(item.id); }}
                                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-medium transition border border-blue-200 dark:border-blue-800 group"
                                        >
                                            {template.text && <MessageCircle className="w-3 h-3" />}
                                            {template.resource && <Paperclip className="w-3 h-3" />}
                                            <span>
                                                {template.text && template.resource ? 'Ver Mensagem + Anexo' : 
                                                 template.text ? 'Ver Mensagem' : 'Ver Anexo'}
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>
                          </div>
                          
                          <div className="flex items-center ml-8 sm:ml-0 space-x-2 flex-wrap justify-end">
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                     <Clock className={`w-4 h-4 ${state.dueDate ? 'text-brand-500' : 'text-gray-300 dark:text-gray-600'}`} />
                                  </div>
                                  <input 
                                    type="date"
                                    value={state.dueDate || ''}
                                    onChange={async (e) => await setChecklistDueDate(candidate.id, item.id, e.target.value)}
                                    className={`pl-8 pr-2 py-1 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 ${state.dueDate ? 'border-brand-200 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:border-brand-800 dark:text-brand-400' : 'border-gray-200 bg-white text-gray-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-500'}`}
                                  />
                              </div>
                              {/* {state.dueDate && ( // REMOVED: Google Calendar integration
                                <button 
                                  onClick={() => handleAddToGoogleCalendar(item.label, state.dueDate!)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-md transition"
                                  title="Adicionar ao Google Agenda"
                                >
                                  <CalendarPlus className="w-4 h-4" />
                                </button>
                              )} */}
                          </div>
                        </li>
                      )})}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'goals' && (
           <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Metas e Evolução do Consultor</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhamento detalhado do plano de 90 dias.</p>
              </div>

              {consultantGoalsStructure.map((stage) => {
                 const progress = candidate.consultantGoalsProgress || {};
                 const completedCount = stage.items.filter(item => progress[item.id]).length;
                 const totalCount = stage.items.length;
                 
                 return (
                    <div key={stage.id} className={`rounded-xl border overflow-hidden shadow-sm ${getGoalColorClass(stage.color)}`}>
                        <div className={`px-6 py-4 flex flex-col md:flex-row md:items-center justify-between ${getGoalColorClass(stage.color, true)}`}>
                            <div>
                                <h3 className="font-bold text-lg">{stage.title}</h3>
                                <p className="text-sm opacity-90 mt-1">{stage.objective}</p>
                            </div>
                            <div className="mt-2 md:mt-0 bg-black/20 px-3 py-1 rounded text-sm font-bold whitespace-nowrap">
                                {completedCount} / {totalCount} Concluídos
                            </div>
                        </div>
                        <div className="p-4">
                            <ul className="space-y-3">
                                {stage.items.map(item => {
                                    const checked = progress[item.id] || false;
                                    return (
                                        <li key={item.id} className="flex items-start space-x-3 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer" onClick={async () => await toggleConsultantGoal(candidate.id, item.id)}>
                                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-green-500 border-green-500 text-white' : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500'}`}>
                                                {checked && <CheckSquare className="w-3.5 h-3.5" />}
                                            </div>
                                            <span className={`text-sm ${checked ? 'line-through opacity-60' : 'opacity-90'} dark:text-gray-200 text-gray-800`}>{item.label}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                 );
              })}
           </div>
        )}

        {activeTab === 'interview' && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Formulário de Avaliação</h2>
                <div className="flex items-center space-x-2 mt-2 sm:mt-0 flex-wrap justify-end">
                    <span className={`text-2xl font-bold ${totalScore >= 70 ? 'text-green-600 dark:text-green-400' : 'text-brand-900 dark:text-brand-400'}`}>{totalScore}/100</span>
                    <button onClick={handleSaveInterview} disabled={isSaving} className="flex items-center space-x-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span>Salvar Avaliação</span>
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {interviewStructure.map(section => (
                        <div key={section.id}>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">{section.title}</h3>
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <span>0</span>
                                    <span>{section.maxPoints}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max={section.maxPoints} 
                                    value={(scores[section.id] as number) || 0}
                                    onChange={(e) => handleScoreChange(section.id, parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                />
                                <div className="text-center font-bold text-brand-600 dark:text-brand-400 mt-1">{(scores[section.id] as number) || 0} pts</div>
                            </div>
                            <div className="space-y-2">
                                {section.questions.map(q => (
                                    <label key={q.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <input 
                                            type="checkbox"
                                            checked={!!checkedQuestions[q.id]}
                                            onChange={() => handleQuestionToggle(q.id, q.points, section.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{q.text} <span className="text-xs text-gray-400">({q.points} pts)</span></span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Anotações Gerais</h3>
                    <textarea 
                        value={scores.notes}
                        onChange={(e) => setScores(prev => ({ ...prev, notes: e.target.value }))}
                        rows={20}
                        className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Digite aqui as anotações sobre o candidato..."
                    />
                </div>
            </div>
          </div>
        )}
      </div>

      {selectedTemplate && (
          <MessageViewerModal 
            isOpen={modalOpen} 
            onClose={() => setModalOpen(false)} 
            candidateName={candidate.name}
            template={selectedTemplate}
          />
      )}
    </div>
  );
};