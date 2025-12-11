import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, User, Calendar, CheckCircle2, TrendingUp, AlertCircle, Clock, Users, Star, CheckSquare } from 'lucide-react';
import { CandidateStatus, ChecklistTaskState } from '@/types';
import { TableSkeleton } from '@/components/TableSkeleton';
import { ScheduleInterviewModal } from '@/components/ScheduleInterviewModal';

const StatusBadge = ({ status }: { status: CandidateStatus }) => {
  const colors = {
    'Entrevista': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    'Aguardando Prévia': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Onboarding Online': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'Integração Presencial': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'Acompanhamento 90 Dias': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'Autorizado': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'Reprovado': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
};

type AgendaItem = {
  id: string;
  type: 'task' | 'interview' | 'feedback';
  title: string;
  personName: string;
  personId: string;
  personType: 'candidate' | 'teamMember';
  dueDate: string;
};

export const Dashboard = () => {
  const { candidates, checklistStructure, teamMembers, isDataLoading } = useApp();
  const navigate = useNavigate();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const totalCandidates = candidates.length;
  const authorized = teamMembers.filter(m => m.isActive && m.roles.includes('Autorizado')).length;
  const inTraining = candidates.filter(c => c.status === 'Acompanhamento 90 Dias').length;
  const activeTeam = teamMembers.filter(m => m.isActive).length;

  const { todayAgenda, overdueTasks } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAgendaItems: AgendaItem[] = [];
    const overdue: AgendaItem[] = [];

    // 1. Checklist Tasks
    candidates.forEach(candidate => {
      Object.entries(candidate.checklistProgress || {}).forEach(([taskId, state]) => {
        if (state.dueDate) {
          const item = checklistStructure.flatMap(s => s.items).find(i => i.id === taskId);
          if (item) {
            const agendaItem: AgendaItem = {
              id: `${candidate.id}-${taskId}`,
              type: 'task',
              title: item.label,
              personName: candidate.name,
              personId: candidate.id,
              personType: 'candidate',
              dueDate: state.dueDate,
            };
            if (state.dueDate === todayStr && !state.completed) {
              todayAgendaItems.push(agendaItem);
            } else if (state.dueDate < todayStr && !state.completed) {
              overdue.push(agendaItem);
            }
          }
        }
      });
    });

    // 2. Interviews
    candidates.forEach(candidate => {
      if (candidate.interviewDate === todayStr) {
        todayAgendaItems.push({
          id: `interview-${candidate.id}`,
          type: 'interview',
          title: 'Entrevista Agendada',
          personName: candidate.name,
          personId: candidate.id,
          personType: 'candidate',
          dueDate: candidate.interviewDate,
        });
      }
    });

    // 3. Feedbacks
    const allPeople = [
      ...candidates.map(c => ({ ...c, personType: 'candidate' as const })),
      ...teamMembers.map(m => ({ ...m, personType: 'teamMember' as const }))
    ];
    allPeople.forEach(person => {
      (person.feedbacks || []).forEach(feedback => {
        if (feedback.date === todayStr) {
          todayAgendaItems.push({
            id: `feedback-${person.id}-${feedback.id}`,
            type: 'feedback',
            title: 'Sessão de Feedback',
            personName: person.name,
            personId: person.id,
            personType: person.personType,
            dueDate: feedback.date,
          });
        }
      });
    });

    return { todayAgenda: todayAgendaItems, overdueTasks: overdue };
  }, [candidates, teamMembers, checklistStructure]);

  const getAgendaIcon = (type: AgendaItem['type']) => {
    switch (type) {
      case 'task': return <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'interview': return <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'feedback': return <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
    }
  };

  const handleAgendaItemClick = (item: AgendaItem) => {
    if (item.personType === 'candidate') {
      navigate(`/candidate/${item.personId}`);
    } else {
      navigate('/feedbacks'); // Or a future team member detail page
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral</h1>
        <p className="text-gray-500 dark:text-gray-400">Acompanhe o progresso e tarefas do time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Candidatos</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCandidates}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Autorizados</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{authorized}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-orange-50 dark:bg-brand-900/20 rounded-lg">
            <TrendingUp className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Em Treinamento</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{inTraining}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Equipe Ativa</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeTeam}</p>
          </div>
        </div>
      </div>

      {/* Agenda Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Overdue Tasks */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center space-x-2 bg-red-50 dark:bg-red-900/20 rounded-t-xl">
                 <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                 <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">Tarefas Atrasadas</h2>
                 <span className="bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-100 text-xs font-bold px-2 py-0.5 rounded-full">{overdueTasks.length}</span>
            </div>
            <div className="flex-1 p-0 overflow-y-auto max-h-80 custom-scrollbar">
                {overdueTasks.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">Nenhuma tarefa atrasada.</div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                        {overdueTasks.map((task) => (
                            <li key={task.id} onClick={() => handleAgendaItemClick(task)} className="p-4 hover:bg-red-50 dark:hover:bg-red-900/10 cursor-pointer transition">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{task.title}</p>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Pessoa: <span className="font-semibold">{task.personName}</span></span>
                                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">Venceu: {new Date(task.dueDate + 'T00:00:00').toLocaleDateString()}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

        {/* Today Tasks */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 rounded-t-xl">
                 <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                 <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Agenda de Hoje</h2>
                 <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-xs font-bold px-2 py-0.5 rounded-full">{todayAgenda.length}</span>
            </div>
            <div className="flex-1 p-0 overflow-y-auto max-h-80 custom-scrollbar">
                 {todayAgenda.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">Nenhuma tarefa agendada para hoje.</div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                        {todayAgenda.map((item) => (
                            <li key={item.id} onClick={() => handleAgendaItemClick(item)} className="p-4 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition">
                                <div className="flex items-start space-x-3">
                                    <div className="mt-0.5">{getAgendaIcon(item.type)}</div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{item.title}</p>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Pessoa: <span className="font-semibold">{item.personName}</span></span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Todos os Candidatos</h2>
          <button 
            onClick={() => setIsScheduleModalOpen(true)}
            className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 dark:hover:text-brand-300"
          >
            + Agendar Entrevista
          </button>
        </div>
        {isDataLoading ? (
          <div className="p-6">
            <TableSkeleton />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white font-medium">
                <tr>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Data Entrevista</th>
                  <th className="px-6 py-3">Nota</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      Nenhum candidato cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  candidates.map((c) => {
                    const totalScore = 
                      c.interviewScores.basicProfile + 
                      c.interviewScores.commercialSkills + 
                      c.interviewScores.behavioralProfile + 
                      c.interviewScores.jobFit;

                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => navigate(`/candidate/${c.id}`)}
                        className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold text-xs">
                                  {c.name.substring(0,2).toUpperCase()}
                              </div>
                              <span>{c.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 flex items-center space-x-2">
                           <Calendar className="w-4 h-4 text-gray-400" />
                           <span>{new Date(c.interviewDate + 'T00:00:00').toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-bold ${totalScore > 0 ? (totalScore >= 70 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400') : 'text-gray-400'}`}>
                              {totalScore > 0 ? `${totalScore}/100` : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ScheduleInterviewModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} />
    </div>
  );
};