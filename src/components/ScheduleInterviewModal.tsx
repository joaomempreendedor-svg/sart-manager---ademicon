import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Candidate, InterviewScores } from '@/types';
import { X, Save, Loader2, User, Phone, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({ isOpen, onClose }) => {
  const { addCandidate } = useApp();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedCandidate, setSavedCandidate] = useState<Candidate | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      date: new Date().toISOString().split('T')[0],
    });
    setSavedCandidate(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.date) {
      alert('Nome e data são obrigatórios.');
      return;
    }
    setIsSaving(true);
    
    const emptyScores: InterviewScores = {
      basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: ''
    };

    const newCandidate: Candidate = {
      id: crypto.randomUUID(),
      name: formData.name,
      phone: formData.phone,
      interviewDate: formData.date,
      interviewer: 'Não definido',
      origin: 'Não definida',
      status: 'Entrevista',
      interviewScores: emptyScores,
      checkedQuestions: {},
      checklistProgress: {},
      consultantGoalsProgress: {},
      createdAt: new Date().toISOString(),
    };

    try {
      await addCandidate(newCandidate);
      setSavedCandidate(newCandidate);
    } catch (error: any) {
      alert(`Erro ao agendar entrevista: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToCandidate = () => {
    if (savedCandidate) {
      navigate(`/candidate/${savedCandidate.id}`);
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
            {savedCandidate ? 'Entrevista Agendada!' : 'Agendar Nova Entrevista'}
          </h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {savedCandidate ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-800 dark:text-gray-200">A entrevista com <strong>{savedCandidate.name}</strong> foi agendada para <strong>{new Date(savedCandidate.interviewDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Agora você pode preencher a avaliação ou adicionar o evento à sua agenda.</p>
            <div className="mt-6 flex flex-col space-y-2">
              <button onClick={handleGoToCandidate} className="w-full px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700">
                Ir para Avaliação
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Candidato</label>
                <User className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone (Opcional)</label>
                <Phone className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Entrevista</label>
                <CalendarIcon className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-end">
              <button type="button" onClick={handleClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-600 mr-2">
                Cancelar
              </button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex items-center space-x-2 disabled:opacity-50">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>Agendar</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};