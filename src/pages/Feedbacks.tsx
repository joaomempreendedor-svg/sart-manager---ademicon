import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Feedback, Candidate, TeamMember } from '@/types';
import { FeedbackModal } from '@/components/FeedbackModal';
import { Star, Search, User, Users, Plus, Edit2, Trash2, CalendarPlus, Clock, MessageSquarePlus } from 'lucide-react';

// Define a Person type that can be either a Candidate or a TeamMember,
// but for feedbacks, we're primarily interested in the consultant_id (user ID)
// and their name.
type FeedbackPerson = {
  id: string; // This will be the consultant_id (user ID)
  name: string;
  email?: string;
  type: 'candidate' | 'teamMember';
  feedbacks?: Feedback[];
};

export const Feedbacks = () => {
  const { 
    candidates, 
    teamMembers, 
    addFeedback, 
    updateFeedback, 
    deleteFeedback,
    addTeamMemberFeedback,
    updateTeamMemberFeedback,
    deleteTeamMemberFeedback
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<FeedbackPerson | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);

  const allPeople = useMemo<FeedbackPerson[]>(() => {
    const candidatePeople: FeedbackPerson[] = candidates.map(c => ({ 
      id: c.id, // Candidate ID is the user ID for candidates
      name: c.name, 
      email: '', // Not directly available on candidate object
      type: 'candidate', 
      feedbacks: c.feedbacks 
    }));

    // For team members, use consultant_id as the primary ID for feedback association
    const teamMemberPeople: FeedbackPerson[] = teamMembers.map(m => ({ 
      id: m.consultant_id, 
      name: m.consultant_name || m.consultant_email || 'Membro da Equipe', 
      email: m.consultant_email,
      type: 'teamMember', 
      feedbacks: m.feedbacks // Feedbacks are now stored on the TeamMember object in AppContext
    }));

    // Combine and ensure uniqueness by ID (consultant_id)
    const combinedMap = new Map<string, FeedbackPerson>();
    [...candidatePeople, ...teamMemberPeople].forEach(person => {
      if (!combinedMap.has(person.id)) {
        combinedMap.set(person.id, person);
      } else {
        // Merge feedbacks if a person appears as both candidate and team member (unlikely but safe)
        const existing = combinedMap.get(person.id)!;
        existing.feedbacks = [...(existing.feedbacks || []), ...(person.feedbacks || [])];
        if (person.type === 'teamMember') { // Prioritize teamMember info if available
          existing.name = person.name;
          existing.email = person.email;
          existing.type = person.type;
        }
      }
    });

    return Array.from(combinedMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [candidates, teamMembers]);

  const filteredPeople = useMemo(() => {
    return allPeople.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [allPeople, searchTerm]);

  const handleSaveFeedback = async (feedbackData: Omit<Feedback, 'id'> | Feedback) => {
    if (!selectedPerson) return;

    // The add/update functions in AppContext now handle whether it's a candidate or team member
    // based on the consultantId (which is selectedPerson.id here).
    if ('id' in feedbackData) {
      await updateTeamMemberFeedback(selectedPerson.id, feedbackData as Feedback);
    } else {
      await addTeamMemberFeedback(selectedPerson.id, feedbackData as Omit<Feedback, 'id'>);
    }
    
    // Manually update selectedPerson's feedbacks for immediate UI refresh
    setSelectedPerson(prev => {
      if (!prev) return null;
      const newFeedbacks = 'id' in feedbackData 
        ? (prev.feedbacks || []).map(f => f.id === feedbackData.id ? feedbackData : f)
        : [...(prev.feedbacks || []), { id: crypto.randomUUID(), ...feedbackData }]; // Assign a temp ID for new ones
      return { ...prev, feedbacks: newFeedbacks };
    });
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!selectedPerson || !confirm('Tem certeza que deseja excluir este feedback?')) return;

    await deleteTeamMemberFeedback(selectedPerson.id, feedbackId);
    
    // Manually update selectedPerson's feedbacks for immediate UI refresh
    setSelectedPerson(prev => {
      if (!prev) return null;
      const newFeedbacks = (prev.feedbacks || []).filter(f => f.id !== feedbackId);
      return { ...prev, feedbacks: newFeedbacks };
    });
  };

  const handleScheduleOnCalendar = (feedback: Feedback) => {
    if (!selectedPerson) return;
    const title = encodeURIComponent(`${feedback.title} - ${selectedPerson.name}`);
    const startDate = new Date(feedback.date + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
    const formatDateForGoogle = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');
    const dates = `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`;
    const details = encodeURIComponent(`Anotações:\n${feedback.notes}`);
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] max-h-screen overflow-hidden bg-gray-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Central de Feedbacks</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie feedbacks para candidatos e membros da equipe.</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 overflow-y-auto flex-shrink-0 custom-scrollbar">
          <div className="p-4 sticky top-0 bg-white dark:bg-slate-800 z-10 border-b border-gray-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar pessoa..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 p-2 border rounded bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600"
              />
            </div>
          </div>
          <div className="p-2">
            {filteredPeople.map(person => (
              <button
                key={`${person.type}-${person.id}`}
                onClick={() => setSelectedPerson(person)}
                className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 transition-colors ${selectedPerson?.id === person.id ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700'}`}
              >
                <div className={`p-2 rounded-full ${selectedPerson?.id === person.id ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'}`}>
                  {person.type === 'candidate' ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </div>
                <div>
                  <p className={`font-medium ${selectedPerson?.id === person.id ? 'text-brand-800 dark:text-brand-200' : 'text-gray-800 dark:text-gray-200'}`}>{person.name}</p>
                  <p className={`text-xs ${selectedPerson?.id === person.id ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}>{person.type === 'candidate' ? 'Candidato' : 'Membro da Equipe'}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          {selectedPerson ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Feedbacks de {selectedPerson.name}</h2>
                <button
                  onClick={() => { setEditingFeedback(null); setIsModalOpen(true); }}
                  className="flex items-center space-x-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agendar Feedback</span>
                </button>
              </div>
              
              {(selectedPerson.feedbacks && selectedPerson.feedbacks.length > 0) ? (
                <div className="space-y-4">
                  {selectedPerson.feedbacks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(fb => {
                    const isScheduled = !fb.notes || fb.notes.trim() === '';
                    return (
                      <div key={fb.id} className={`p-4 border rounded-lg group ${isScheduled ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2">
                              {isScheduled && <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />}
                              <p className={`font-semibold ${isScheduled ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-800 dark:text-gray-200'}`}>{fb.title}</p>
                            </div>
                            <p className={`text-xs mt-1 ${isScheduled ? 'text-yellow-600 dark:text-yellow-500' : 'text-gray-400 dark:text-gray-500'}`}>
                              {new Date(fb.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                            {isScheduled ? (
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">Feedback agendado. Adicione as anotações após a conversa.</p>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">{fb.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleScheduleOnCalendar(fb)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-md" title="Agendar no Google Calendar">
                              <CalendarPlus className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setEditingFeedback(fb); setIsModalOpen(true); }} className={`p-2 rounded-md ${isScheduled ? 'text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-400 dark:hover:bg-yellow-900/20' : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-400 dark:hover:bg-green-900/20'}`} title={isScheduled ? 'Adicionar Anotações' : 'Editar'}>
                              {isScheduled ? <MessageSquarePlus className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                            </button>
                            <button onClick={() => handleDeleteFeedback(fb.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-400 dark:hover:bg-red-900/20 rounded-md" title="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
                  <Star className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600" />
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum feedback registrado para esta pessoa.</p>
                  <p className="text-sm text-gray-400">Clique em "Agendar Feedback" para começar.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <Users className="mx-auto w-12 h-12" />
                <p className="mt-4">Selecione uma pessoa na lista ao lado</p>
                <p className="text-sm">para visualizar ou agendar feedbacks.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFeedback}
        feedback={editingFeedback}
      />
    </div>
  );
};