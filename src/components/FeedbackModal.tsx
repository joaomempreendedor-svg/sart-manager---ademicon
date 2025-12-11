import React, { useState, useEffect } from 'react';
import { Feedback } from '@/types';
import { X, Save, Loader2, Calendar, MessageSquare, Type } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (feedback: Omit<Feedback, 'id'> | Feedback) => Promise<void>;
  feedback: Feedback | null;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSave, feedback }) => {
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (feedback) {
      setDate(feedback.date);
      setTitle(feedback.title);
      setNotes(feedback.notes);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setTitle('');
      setNotes('');
    }
  }, [feedback, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('O título do feedback é obrigatório.');
      return;
    }
    setIsSaving(true);
    try {
      if (feedback) {
        await onSave({ ...feedback, date, title, notes });
      } else {
        await onSave({ date, title, notes });
      }
      onClose();
    } catch (error: any) {
      alert(`Erro ao salvar feedback: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in border border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{feedback ? 'Editar Feedback' : 'Adicionar Feedback'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título do Feedback</label>
              <Type className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" placeholder="Ex: Feedback Semanal" />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data do Feedback</label>
              <Calendar className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anotações</label>
              <MessageSquare className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" placeholder="Anotações (opcional para agendamento)"></textarea>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-600 mr-2">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex items-center space-x-2 disabled:opacity-50">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>Salvar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};