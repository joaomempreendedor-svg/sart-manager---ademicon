import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { CrmField } from '@/types';
import { X, Save, Loader2 } from 'lucide-react';

interface FieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  field: CrmField | null;
}

const FieldModal: React.FC<FieldModalProps> = ({ isOpen, onClose, field }) => {
  const { addCrmField, updateCrmField } = useApp();
  const [formData, setFormData] = useState<Omit<CrmField, 'id' | 'user_id' | 'created_at'>>({
    key: '', label: '', type: 'text', is_required: false, is_active: true, options: []
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (field) {
      setFormData({
        key: field.key,
        label: field.label,
        type: field.type,
        is_required: field.is_required,
        is_active: field.is_active,
        options: field.options || [],
      });
    } else {
      setFormData({ key: '', label: '', type: 'text', is_required: false, is_active: true, options: [] });
    }
  }, [field, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const label = e.target.value;
    const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setFormData(prev => ({ ...prev, label, key }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim() || !formData.key.trim()) return;
    setIsSaving(true);
    try {
      const dataToSave = { ...formData, options: formData.type === 'select' ? formData.options : undefined };
      if (field) {
        await updateCrmField(field.id, dataToSave);
      } else {
        await addCrmField(dataToSave);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save field:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-semibold text-lg">{field ? 'Editar Campo' : 'Novo Campo'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium mb-1">Rótulo (Label)</label>
              <input type="text" name="label" value={formData.label} onChange={handleLabelChange} required className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chave (Key)</label>
              <input type="text" name="key" value={formData.key} onChange={handleChange} required className="w-full p-2 border rounded bg-gray-100 dark:bg-slate-900 border-gray-300 dark:border-slate-600 font-mono text-sm" />
              <p className="text-xs text-gray-400 mt-1">Gerado automaticamente. Use apenas letras minúsculas, números e _.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo do Campo</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600">
                <option value="text">Texto Curto</option>
                <option value="longtext">Texto Longo</option>
                <option value="number">Número</option>
                <option value="select">Seleção</option>
              </select>
            </div>
            {formData.type === 'select' && (
              <div>
                <label className="block text-sm font-medium mb-1">Opções (uma por linha)</label>
                <textarea name="options" value={(formData.options || []).join('\n')} onChange={e => setFormData(prev => ({...prev, options: e.target.value.split('\n')}))} rows={4} className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 font-mono text-sm" />
              </div>
            )}
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" name="is_required" checked={formData.is_required} onChange={handleChange} className="h-4 w-4 rounded" />
                <span>Obrigatório</span>
              </label>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border rounded-lg mr-2">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-brand-600 text-white rounded-lg flex items-center disabled:opacity-50">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FieldModal;