import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Feedback, TeamMember } from '@/types';
import { FeedbackModal } from '@/components/FeedbackModal';
import {
  Star, Search, Users, Plus, Edit2, Trash2,
  CalendarPlus, Clock, MessageSquarePlus, CheckCircle2, Eye, X
} from 'lucide-react';

type Person = TeamMember & { type: 'teamMember' };

// Modal de visualização
const FeedbackViewModal: React.FC<{
  feedback: Feedback | null;
  personName: string;
  onClose: () => void;
}> = ({ feedback, personName, onClose }) => {
  if (!feedback) return null;
  const isScheduled = !feedback.notes?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isScheduled ? 'bg-yellow-400' : 'bg-green-400'}`} />
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{feedback.title}</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{personName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isScheduled
                ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
            }`}>
              {isScheduled ? '⏰ Agendado' : '✅ Realizado'}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(feedback.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric'
              })}
            </span>
          </div>

          {isScheduled ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-yellow-700 dark:text-yellow-300 text-sm italic">
              Feedback agendado — as anotações ainda não foram preenchidas.
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-5 min-h-[200px]">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
                {feedback.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export const Feedbacks = () => {
  const {
    teamMembers,
    addTeamMemberFeedback,
    updateTeamMemberFeedback,
    deleteTeamMemberFeedback
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [viewingFeedback, setViewingFeedback] = useState<Feedback | null>(null);

  const allPeople = useMemo<Person[]>(() => {
    return teamMembers
      .filter(m => m.isActive)
      .map(m => ({ ...m, type: 'teamMember' as const }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teamMembers]);

  const filteredPeople = useMemo(() => {
    return allPeople.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allPeople, searchTerm]);

  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return allPeople.find(p => p.id === selectedPersonId) || null;
  }, [selectedPersonId, allPeople]);

  const sortedFeedbacks = useMemo(() => {
    if (!selectedPerson?.feedbacks) return [];
    return [...selectedPerson.feedbacks].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [selectedPerson]);

  const handleSaveFeedback = async (feedbackData: Omit<Feedback, 'id'> | Feedback) => {
    if (!selectedPerson) return;
    if ('id' in feedbackData) {
      await updateTeamMemberFeedback(selectedPerson.id, feedbackData as Feedback);
    } else {
      await addTeamMemberFeedback(selectedPerson.id, feedbackData as Omit<Feedback, 'id'>);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!selectedPerson || !confirm('Tem certeza que deseja excluir este feedback?')) return;
    await deleteTeamMemberFeedback(selectedPerson.id, feedbackId);
  };

  const handleScheduleOnCalendar = (feedback: Feedback) => {
    if (!selectedPerson) return;
    const title = encodeURIComponent(`${feedback.title} - ${selectedPerson.name}`);
    const startDate = new Date(feedback.date + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
    const fmt = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');
    const dates = `${fmt(startDate)}/${fmt(endDate)}`;
    const details = encodeURIComponent(`Anotações:\n${feedback.notes}`);
    window.open(
      `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`,
      '_blank'
    );
  };

  const scheduledCount = sortedFeedbacks.filter(f => !f.notes?.trim()).length;
  const completedCount = sortedFeedbacks.filter(f => f.notes?.trim()).length;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-900">

      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-gray-100 dark:border-slate-700">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Feedbacks</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Gerencie feedbacks da equipe</p>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar membro..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredPeople.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhum membro encontrado</div>
          ) : (
            filteredPeople.map(person => {
              const feedbackCount = person.feedbacks?.length || 0;
              const isSelected = selectedPersonId === person.id;
              return (
                <button
                  key={person.id}
                  onClick={() => setSelectedPersonId(person.id)}
                  className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all mb-1 ${
                    isSelected
                      ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    isSelected ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300'
                  }`}>
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${
                      isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200'
                    }`}>
                      {person.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {feedbackCount > 0 ? `${feedbackCount} feedback${feedbackCount > 1 ? 's' : ''}` : 'Sem feedbacks'}
                    </p>
                  </div>
                  {feedbackCount > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300'
                        : 'bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-gray-400'
                    }`}>
                      {feedbackCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {selectedPerson ? (
          <div className="p-8 max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-xl font-black">
                  {selectedPerson.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">{selectedPerson.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Membro da Equipe</p>
                </div>
              </div>
              <button
                onClick={() => { setEditingFeedback(null); setIsModalOpen(true); }}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl transition font-bold text-sm shadow-lg shadow-brand-500/20"
              >
                <Plus className="w-4 h-4" />
                Novo Feedback
              </button>
            </div>

            {/* Stats */}
            {sortedFeedbacks.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
                  <p className="text-3xl font-black text-gray-900 dark:text-white">{sortedFeedbacks.length}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mt-1">Total</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4 text-center">
                  <p className="text-3xl font-black text-yellow-600 dark:text-yellow-400">{scheduledCount}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-yellow-500 mt-1">Agendados</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-green-800 p-4 text-center">
                  <p className="text-3xl font-black text-green-600 dark:text-green-400">{completedCount}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-500 mt-1">Realizados</p>
                </div>
              </div>
            )}

            {/* Feedbacks List */}
            {sortedFeedbacks.length > 0 ? (
              <div className="space-y-4">
                {sortedFeedbacks.map(fb => {
                  const isScheduled = !fb.notes?.trim();
                  return (
                    <div
                      key={fb.id}
                      className={`group rounded-2xl border p-5 transition-all hover:shadow-md ${
                        isScheduled
                          ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isScheduled
                              ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400'
                              : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                          }`}>
                            {isScheduled ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-bold text-base ${
                                isScheduled ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-900 dark:text-white'
                              }`}>
                                {fb.title}
                              </p>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                isScheduled
                                  ? 'bg-yellow-200 dark:bg-yellow-900/60 text-yellow-700 dark:text-yellow-300'
                                  : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                              }`}>
                                {isScheduled ? 'Agendado' : 'Realizado'}
                              </span>
                            </div>
                            <p className={`text-xs mt-1 font-medium ${
                              isScheduled ? 'text-yellow-600 dark:text-yellow-500' : 'text-gray-400 dark:text-gray-500'
                            }`}>
                              {new Date(fb.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                                day: '2-digit', month: 'long', year: 'numeric'
                              })}
                            </p>
                            {isScheduled ? (
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 italic">
                                Feedback agendado — adicione as anotações após a conversa.
                              </p>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                                {fb.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Botões de ação */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          {!isScheduled && (
                            <button
                              onClick={() => setViewingFeedback(fb)}
                              className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleScheduleOnCalendar(fb)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                            title="Agendar no Google Calendar"
                          >
                            <CalendarPlus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingFeedback(fb); setIsModalOpen(true); }}
                            className={`p-2 rounded-lg transition ${
                              isScheduled
                                ? 'text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                            title={isScheduled ? 'Adicionar Anotações' : 'Editar'}
                          >
                            {isScheduled ? <MessageSquarePlus className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteFeedback(fb.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-gray-300 dark:text-slate-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-semibold">Nenhum feedback ainda</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Clique em "Novo Feedback" para começar.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400 dark:text-gray-500">
              <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-gray-300 dark:text-slate-500" />
              </div>
              <p className="font-semibold text-gray-500 dark:text-gray-400">Selecione um membro</p>
              <p className="text-sm mt-1">para visualizar ou registrar feedbacks</p>
            </div>
          </div>
        )}
      </main>

      {/* Modal de edição */}
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingFeedback(null); }}
        onSave={handleSaveFeedback}
        feedback={editingFeedback}
      />

      {/* Modal de visualização */}
      <FeedbackViewModal
        feedback={viewingFeedback}
        personName={selectedPerson?.name || ''}
        onClose={() => setViewingFeedback(null)}
      />
    </div>
  );
};