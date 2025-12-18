import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { useNavigate } from 'react-router-dom';
import { ChevronRight, User, Calendar, CheckCircle2, TrendingUp, AlertCircle, Clock, Users, Star, CheckSquare, CalendarCheck, XCircle, BellRing, UserRound } from 'lucide-react'; // Adicionado BellRing e UserRound
import { CandidateStatus, ChecklistTaskState, LeadTask } from '@/types';
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
  type: 'task' | 'interview' | 'feedback' | 'meeting'; // Adicionado 'meeting'
  title: string;
  personName: string;
  personId: string;
  personType: 'candidate' | 'teamMember' | 'lead'; // Adicionado 'lead'
  dueDate: string;
  meetingDetails?: {
    startTime: string;
    endTime: string;
    consultantName: string;
    managerInvitationStatus?: 'pending' | 'accepted' | 'declined';
    taskId: string; // Para identificar a tarefa de reunião
  };
};

export const Dashboard = () => {
  const { user } = useAuth(); // Obter o usuário logado
  const { candidates, checklistStructure, teamMembers, isDataLoading, leadTasks, crmLeads, updateLeadMeetingInvitationStatus } = useApp();
  const navigate = useNavigate();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const totalCandidates = candidates.length;
  const authorized = teamMembers.filter(m => m.isActive && m.roles.includes('Autorizado')).length;
  const inTraining = candidates.filter(c => c.status === 'Acompanhamento 90 Dias').length;
  const activeTeam = teamMembers.filter(m => m.isActive).length;

  const { todayAgenda, overdueTasks, meetingInvitations } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAgendaItems: AgendaItem[] = [];
    const overdueItems: AgendaItem[] = [];
    const invitationsItems: AgendaItem[] = [];

    // 1. Checklist Tasks (Candidatos)
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
              overdueItems.push(agendaItem);
            }
          }
        }
      });
    });

    // 2. Interviews (Candidatos)
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

    // 3. Feedbacks (Candidatos e Membros da Equipe)
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

    // 4. Lead Tasks (CRM) - para o consultor logado
    // No dashboard do gestor, queremos ver convites de reunião
    if (user?.role === 'GESTOR' || user?.role === 'ADMIN') {
      console.log("[Dashboard] Checking meeting invitations for Gestor:", user.id);
      console.log("[Dashboard] All leadTasks:", leadTasks.map(t => ({ id: t.id, type: t.type, manager_id: t.manager_id, manager_invitation_status: t.manager_invitation_status, user_id: t.user_id, lead_id: t.lead_id })));

      leadTasks.filter(task => 
        task.type === 'meeting' && 
        task.manager_id === user.id && 
        task.manager_invitation_status === 'pending'
      ).forEach(task => {
        const lead = crmLeads.find(l => l.id === task.lead_id);
        const consultant = teamMembers.find(tm => tm.id === task.user_id); // user_id da tarefa é o consultor
        if (lead && consultant && task.meeting_start_time && task.meeting_end_time) {
          invitationsItems.push({
            id: `meeting-invite-${task.id}`,
            type: 'meeting',
            title: `Convite de Reunião: ${task.title}`,
            personName: lead.name || 'Lead Desconhecido',
            personId: lead.id,
            personType: 'lead',
            dueDate: task.due_date || new Date(task.meeting_start_time).toISOString().split('T')[0],
            meetingDetails: {
              startTime: new Date(task.meeting_start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              endTime: new Date(task.meeting_end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              consultantName: consultant.name,
              managerInvitationStatus: task.manager_invitation_status,
              taskId: task.id,
            }
          });
        }
      });
      console.log("[Dashboard] Generated meeting invitations:", invitationsItems);
    }

    return { todayAgenda: todayAgendaItems, overdueTasks: overdueItems, meetingInvitations: invitationsItems };
  }, [candidates, teamMembers, checklistStructure, leadTasks, crmLeads, user]);

  const getAgendaIcon = (type: AgendaItem['type']) => {
    switch (type) {
      case 'task': return <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'interview': return <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'feedback': return <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
      case 'meeting': return <CalendarCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  const handleAgendaItemClick = (item: AgendaItem) => {
    if (item.personType === 'candidate') {
      navigate(`/candidate/${item.personId}`);
    } else if (item.personType === 'lead') {
      // Navegar para o CRM ou para uma view específica do lead
      navigate(`/consultor/crm`); // Ou para uma rota de detalhe do lead se existir
    } else {
      navigate('/feedbacks'); // Or a future team member detail page
    }
  };

  const handleInvitationResponse = async (taskId: string, status: 'accepted' | 'declined', meetingDetails: AgendaItem['meetingDetails']) => {
    if (!user || !meetingDetails) return;

    try {
      await updateLeadMeetingInvitationStatus(taskId, status);
      alert(`Convite de reunião ${status === 'accepted' ? 'aceito' : 'recusado'} com sucesso!`);

      // Se aceito, adicionar ao Google Agenda do gestor
      if (status === 'accepted') {
        const startDateTime = new Date(meetingDetails.dueDate + 'T' + meetingDetails.startTime);
        const endDateTime = new Date(meetingDetails.dueDate + 'T' + meetingDetails.endTime);

        const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render');
        googleCalendarUrl.searchParams.append('action', 'TEMPLATE');
        googleCalendarUrl.searchParams.append('text', encodeURIComponent(meetingDetails.title || 'Reunião'));
        googleCalendarUrl.searchParams.append('dates', `${startDateTime.toISOString().replace(/[-:]|\.\d{3}/g, '')}/${endDateTime.toISOString().replace(/[-:]|\.\d{3}/g, '')}`);
        googleCalendarUrl.searchParams.append('details', encodeURIComponent(`Reunião com o lead ${meetingDetails.personName} e consultor ${meetingDetails.consultantName}`));
        if (user.email) {
          googleCalendarUrl.searchParams.append('add', encodeURIComponent(user.email));
        }
        // Adicionar o email do consultor que criou a reunião, se disponível
        const consultant = teamMembers.find(tm => tm.name === meetingDetails.consultantName);
        if (consultant?.email) {
          googleCalendarUrl.searchParams.append('add', encodeURIComponent(consultant.email));
        }

        window.open(googleCalendarUrl.toString(), '_blank');
      }
    } catch (error) {
      console.error("Erro ao responder convite:", error);
      alert("Erro ao responder ao convite. Tente novamente.");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral</h1>
        <p className="text-gray-500 dark:text-gray-400">Acompanhe o progresso e tarefas do time.</p>
      </div>

      {/* TEMPORARY: Display User ID */}
      {user && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-xl mb-6 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Seu ID de Usuário Atual (Temporário)</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 font-mono break-all">
              {user.id}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              Por favor, copie este ID e me informe no chat.
            </p>
          </div>
        </div>
      )}
      {/* END TEMPORARY */}

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

      {/* Meeting Invitations Section */}
      {user?.role === 'GESTOR' && meetingInvitations.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center space-x-2 bg-purple-50 dark:bg-purple-900/20 rounded-t-xl">
            <BellRing className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold text-purple-800 dark:text-purple-300">Convites de Reunião</h2>
            <span className="bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-100 text-xs font-bold px-2 py-0.5 rounded-full">{meetingInvitations.length}</span>
          </div>
          <div className="flex-1 p-0 overflow-y-auto max-h-80 custom-scrollbar">
            <ul className="divide-y divide-gray-100 dark:divide-slate-700">
              {meetingInvitations.map((item) => (
                <li key={item.id} className="p-4 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{item.title}</p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-2">
                        <span className="flex items-center"><UserRound className="w-3 h-3 mr-1" /> Consultor: <span className="font-semibold ml-1">{item.meetingDetails?.consultantName}</span></span>
                        <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {new Date(item.dueDate + 'T00:00:00').toLocaleDateString()}</span>
                        <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {item.meetingDetails?.startTime} - {item.meetingDetails?.endTime}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleInvitationResponse(item.meetingDetails!.taskId, 'accepted', item.meetingDetails)}
                        className="px-3 py-1.5 bg-green-500 text-white rounded-md text-xs font-medium hover:bg-green-600 flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aceitar</span>
                      </button>
                      <button 
                        onClick={() => handleInvitationResponse(item.meetingDetails!.taskId, 'declined', item.meetingDetails)}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-md text-xs font-medium hover:bg-red-600 flex items-center space-x-1"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Recusar</span>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

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