import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { X, Save, Loader2, User, DollarSign, Phone, Mail } from 'lucide-react';
import { TeamMember } from '@/types';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadAdded: () => void;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onLeadAdded }) => {
  const { teamMembers } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    potential_value: '',
  });
  const [assigneeId, setAssigneeId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [consultants, setConsultants] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (isOpen) {
      const activeConsultants = teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('GESTOR') || m.roles.includes('ADMIN')));
      setConsultants(activeConsultants);
    }
  }, [isOpen, teamMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('O nome do lead é obrigatório.');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('leads').insert({
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        potential_value: formData.potential_value ? parseFloat(formData.potential_value) : null,
        assignee_id: assigneeId || null,
      });

      if (error) throw error;
      
      onLeadAdded();
      onClose();
      setFormData({ name: '', phone: '', email: '', potential_value: '' });
      setAssigneeId('');
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in border border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Adicionar Novo Lead</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Lead</label>
              <User className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                  <Phone className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <Mail className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
                </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Potencial (R$)</label>
              <DollarSign className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
              <input type="number" step="0.01" value={formData.potential_value} onChange={e => setFormData({...formData, potential_value: e.target.value})} className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsável</label>
              <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600">
                <option value="">Ninguém (Não atribuído)</option>
                {consultants.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-600 mr-2">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex items-center space-x-2 disabled:opacity-50">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>Salvar Lead</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};