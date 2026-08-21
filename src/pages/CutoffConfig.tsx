import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CutoffPeriod } from '@/types';
import { Plus, Trash2, Edit2, Save, X, Calendar, AlertTriangle } from 'lucide-react';

export const CutoffConfig = () => {
  const { cutoffPeriods, addCutoffPeriod, updateCutoffPeriod, deleteCutoffPeriod } = useApp();
  
  const emptyPeriod: Omit<CutoffPeriod, 'id' | 'db_id'> = {
    name: '',
    startDate: '',
    endDate: '',
    competenceMonth: '',
  };

  const [newPeriod, setNewPeriod] = useState(emptyPeriod);
  const [editingPeriod, setEditingPeriod] = useState<CutoffPeriod | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedPeriods = [...cutoffPeriods].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const validateAndSave = async () => {
    setError(null);
    const periodToSave = editingPeriod ? { ...editingPeriod, ...newPeriod } : { ...newPeriod, id: crypto.randomUUID() };

    // Basic validation
    if (!periodToSave.name || !periodToSave.startDate || !periodToSave.endDate || !periodToSave.competenceMonth) {
      setError("Todos os campos são obrigatórios.");
      return;
    }

    const start = new Date(periodToSave.startDate + 'T00:00:00');
    const end = new Date(periodToSave.endDate + 'T00:00:00');
    const competence = new Date(periodToSave.competenceMonth + '-01T00:00:00');

    if (start > end) {
      setError("A data de início não pode ser posterior à data de fim.");
      return;
    }
    if (competence <= end) {
      setError("O mês de competência deve ser posterior ao fim do período.");
      return;
    }

    // Overlap validation
    const isOverlapping = cutoffPeriods.some(p => {
      if (editingPeriod && p.id === editingPeriod.id) return false; // Don't check against itself
      const pStart = new Date(p.startDate + 'T00:00:00');
      const pEnd = new Date(p.endDate + 'T00:00:00');
      return (start <= pEnd && end >= pStart);
    });

    if (isOverlapping) {
      setError("Este período está sobrepondo um período existente.");
      return;
    }

    try {
      if (editingPeriod) {
        await updateCutoffPeriod(editingPeriod.id, newPeriod);
      } else {
        await addCutoffPeriod(periodToSave as CutoffPeriod);
      }
      setNewPeriod(emptyPeriod);
      setEditingPeriod(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (period: CutoffPeriod) => {
    setEditingPeriod(period);
    setNewPeriod({
      name: period.name,
      startDate: period.startDate,
      endDate: period.endDate,
      competenceMonth: period.competenceMonth,
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingPeriod(null);
    setNewPeriod(emptyPeriod);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este período?")) {
      await deleteCutoffPeriod(id);
    }
  };

  const formatDisplayDate = (dateStr: string) => new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  const formatCompetence = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurar Períodos de Corte</h1>
        <p className="text-gray-500 dark:text-gray-400">Defina os períodos para o cálculo automático do mês de competência das comissões.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <h2 className="text-lg font-semibold mb-4">{editingPeriod ? 'Editando Período' : 'Adicionar Novo Período'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Nome (Ex: Período Jan-Fev)" value={newPeriod.name} onChange={e => setNewPeriod({...newPeriod, name: e.target.value})} className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
          <div>
            <label className="text-xs text-gray-500">Mês de Competência</label>
            <input type="month" value={newPeriod.competenceMonth} onChange={e => setNewPeriod({...newPeriod, competenceMonth: e.target.value})} className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Data de Início</label>
            <input type="date" value={newPeriod.startDate} onChange={e => setNewPeriod({...newPeriod, startDate: e.target.value})} className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Data de Fim</label>
            <input type="date" value={newPeriod.endDate} onChange={e => setNewPeriod({...newPeriod, endDate: e.target.value})} className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600" />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-4 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" />{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          {editingPeriod && <button onClick={cancelEdit} className="px-4 py-2 bg-gray-200 dark:bg-slate-600 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-slate-500"><X className="w-4 h-4 inline mr-1" />Cancelar</button>}
          <button onClick={validateAndSave} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
            {editingPeriod ? <><Save className="w-4 h-4 inline mr-1" />Salvar Alterações</> : <><Plus className="w-4 h-4 inline mr-1" />Adicionar Período</>}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold p-6 border-b border-gray-100 dark:border-slate-700">Períodos Configurados</h2>
        <ul className="divide-y divide-gray-100 dark:divide-slate-700">
          {sortedPeriods.length === 0 ? (
            <li className="p-6 text-center text-gray-400">Nenhum período configurado. O sistema usará a regra padrão (dia 19 de cada mês).</li>
          ) : (
            sortedPeriods.map(p => (
              <li key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700/50 group">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{p.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    De <span className="font-medium">{formatDisplayDate(p.startDate)}</span> a <span className="font-medium">{formatDisplayDate(p.endDate)}</span>
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-400 font-semibold">
                    → Competência: {formatCompetence(p.competenceMonth)}
                  </p>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(p)} className="p-2 text-gray-400 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};