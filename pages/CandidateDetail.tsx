import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, CheckSquare, FileText, Phone, Calendar, Clock, MessageCircle, Paperclip, CheckCircle2, Target, Trash2, CalendarPlus } from 'lucide-react';
import { CandidateStatus, CommunicationTemplate } from '../types';
import { MessageViewerModal } from '../components/MessageViewerModal';

export const CandidateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { getCandidate, toggleChecklistItem, toggleConsultantGoal, updateCandidate, deleteCandidate, setChecklistDueDate, templates, checklistStructure, consultantGoalsStructure, interviewStructure } = useApp();
  const navigate = useNavigate();
  const candidate = getCandidate(id || '');
  const [activeTab, setActiveTab] = useState<'interview' | 'checklist' | 'goals'>('checklist');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);

  if (!candidate) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Candidato não encontrado.</div>;
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateCandidate(candidate.id, { status: e.target.value as CandidateStatus });
  };

  const handleDelete = async () => {
    if (candidate && confirm(`Tem certeza que deseja excluir ${candidate.name}? Esta ação não pode ser desfeita.`)) {
      await deleteCandidate(candidate.id);
      navigate('/');
    }
  };

  const openMessageModal = (templateId: string) => {
    const template = templates[templateId];
    if (template) {
        setSelectedTemplate(template);
        setModalOpen(true);
    }
  };

  const handleAddToGoogleCalendar = (taskLabel: string, dueDate: string) => {
    const title = encodeURIComponent(`${taskLabel} - ${candidate.name}`);
    
    // Format date to YYYYMMDD for Google Calendar URL
    const startDate = new Date(dueDate + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);

    const formatDateForGoogle = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');
    
    const dates = `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`;
    
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}`;
    window.open(url, '_blank');
  };

  const totalScore = Object.entries(candidate.interviewScores)
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
    <div className="p-8 max-w-6xl mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6">
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
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                 <span className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {candidate.phone}</span>
                 <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> Entrevista: {new Date(candidate.interviewDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mb-1">Status Atual</label>
            <div className="flex items-center space-x-2">
                <select 
                    value={candidate.status} 
                    onChange={handleStatusChange}
                    className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md border"
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
                    className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-md transition border border-red-100 dark:border-red-900/30"
                    title="Excluir Candidato"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg w-fit mb-6">
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
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{stage.title}</h3>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-300 bg-gray-200 dark:bg-slate-600 px-2 py-1 rounded">{progress}% Concluído</span>
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
                          
                          <div className="flex items-center ml-8 sm:ml-0 space-x-2">
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
                              {state.dueDate && (
                                <button 
                                  onClick={() => handleAddToGoogleCalendar(item.label, state.dueDate!)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-md transition"
                                  title="Adicionar ao Google Agenda"
                                >
                                  <CalendarPlus className="w-4 h-4" />
                                </button>
                              )}
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
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Resumo da Avaliação</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {interviewStructure.map(section => {
                    const score = (candidate.interviewScores as any)[section.id] ?? 0;
                    return (
                        <div key={section.id} className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg text-center">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 truncate" title={section.title}>{section.title}</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{score}/{section.maxPoints}</div>
                        </div>
                    );
                })}
            </div>
            
            <div className="flex justify-between items-center bg-brand-50 dark:bg-brand-900/20 p-6 rounded-lg mb-8">
                <span className="text-lg font-medium text-brand-900 dark:text-brand-100">Nota Final Total</span>
                <span className={`text-4xl font-bold ${totalScore >= 70 ? 'text-green-600 dark:text-green-400' : 'text-brand-900 dark:text-brand-400'}`}>{totalScore}/100</span>
            </div>

            <div className="mb-6 space-y-6">
                <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-slate-700 pb-2">Detalhamento das Respostas</h3>
                {interviewStructure.map(section => (
                    <div key={section.id}>
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{section.title}</h4>
                        <ul className="space-y-2">
                            {section.questions.map(q => {
                                const isChecked = candidate.checkedQuestions ? candidate.checkedQuestions[q.id] : false;
                                return (
                                    <li key={q.id} className="flex items-start text-sm">
                                        <div className={`mr-2 mt-0.5 ${isChecked ? 'text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-slate-600'}`}>
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <span className={isChecked ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
                                            {q.text} <span className="text-xs opacity-75">({q.points} pts)</span>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mb-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Anotações do Entrevistador</h3>
                <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-100 dark:border-slate-600 whitespace-pre-wrap">
                    {candidate.interviewScores.notes || 'Nenhuma anotação registrada.'}
                </p>
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