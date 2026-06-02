import React, { useState, useEffect } from 'react';
import { Feedback } from '@/types';
import { X, Save, Loader2, Calendar, MessageSquare, Type, Maximize2, Minimize2 } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);

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
    setIsExpanded(false);
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

  // Modo tela cheia para anotações
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              {title || 'Anotações do Feedback'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Modo de escrita expandido</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
            >
              <Minimize2 className="w-4 h-4" />
              Reduzir
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-sm transition disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Textarea expandida */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Escreva as anotações do feedback aqui..."
            autoFocus
            className="flex-1 w-full resize-none rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 p-5 text-base leading-relaxed focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          />
          <p className="text-xs text-gray-400 mt-2 text-right">{notes.length} caracteres</p>
        </div>
      </div>
    );
  }

  // Modo normal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            {feedback ? 'Editar Feedback' : 'Novo Feedback'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">

            {/* Título */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Título do Feedback
              </label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  placeholder="Ex: Feedback Semanal"
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Data do Feedback
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>

            {/* Anotações */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  Anotações
                </label>
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-bold transition"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Expandir
                </button>
              </div>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={6}
                  placeholder="Escreva as anotações do feedback aqui..."
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm resize-none leading-relaxed"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">{notes.length} caracteres</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-600 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 transition shadow-lg shadow-brand-500/20"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};