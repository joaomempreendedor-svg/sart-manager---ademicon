import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { FinancialEntry } from '@/types';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, DollarSign, ArrowUp, ArrowDown, Edit2, Trash2, Loader2 } from 'lucide-react';
import { FinancialEntryModal } from '@/components/FinancialEntryModal';
import toast from 'react-hot-toast';

const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
const displayDate = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const FinancialPanel = () => {
  const { user } = useAuth();
  const { financialEntries, addFinancialEntry, updateFinancialEntry, deleteFinancialEntry, isDataLoading } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [selectedDateForNewEntry, setSelectedDateForNewEntry] = useState<string | null>(null);

  const displayedDates = useMemo(() => {
    const dates = [];
    for (let i = -1; i <= 1; i++) { // 3-day view: yesterday, today, tomorrow
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentDate]);

  const entriesByDate = useMemo(() => {
    const map: Record<string, FinancialEntry[]> = {};
    displayedDates.forEach(date => {
      map[formatDate(date)] = [];
    });

    financialEntries.forEach(entry => {
      const entryDateStr = entry.entry_date;
      if (map[entryDateStr]) {
        map[entryDateStr].push(entry);
      }
    });

    // Sort entries within each day by creation time
    Object.keys(map).forEach(dateStr => {
      map[dateStr].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    return map;
  }, [financialEntries, displayedDates]);

  const dailyBalances = useMemo(() => {
    const balances: Record<string, { income: number; expense: number; balance: number }> = {};
    displayedDates.forEach(date => {
      const dateStr = formatDate(date);
      const entries = entriesByDate[dateStr] || [];
      let income = 0;
      let expense = 0;
      entries.forEach(entry => {
        if (entry.type === 'income') {
          income += entry.amount;
        } else {
          expense += entry.amount;
        }
      });
      balances[dateStr] = { income, expense, balance: income - expense };
    });
    return balances;
  }, [entriesByDate, displayedDates]);

  const navigateDay = (offset: number) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + offset);
      return newDate;
    });
  };

  const handleOpenModalForNewEntry = (date: string) => {
    setEditingEntry(null);
    setSelectedDateForNewEntry(date);
    setIsModalOpen(true);
  };

  const handleOpenModalForEditEntry = (entry: FinancialEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleSaveEntry = async (entryData: Omit<FinancialEntry, 'id' | 'user_id' | 'created_at'> | FinancialEntry) => {
    try {
      if ('id' in entryData) { // Editing existing entry
        await updateFinancialEntry(entryData.id, entryData);
        toast.success("Lançamento atualizado com sucesso!");
      } else { // Adding new entry
        const newEntry = { ...entryData, entry_date: selectedDateForNewEntry || entryData.entry_date };
        await addFinancialEntry(newEntry);
        toast.success("Lançamento adicionado com sucesso!");
      }
    } catch (error: any) {
      toast.error(`Erro ao salvar lançamento: ${error.message}`);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este lançamento?")) {
      try {
        await deleteFinancialEntry(entryId);
        toast.success("Lançamento excluído com sucesso!");
      } catch (error: any) {
        toast.error(`Erro ao excluir lançamento: ${error.message}`);
      }
    }
  };

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Painel Financeiro</h1>
        <p className="text-gray-500 dark:text-gray-400">Controle suas entradas e saídas financeiras diárias.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6 flex items-center justify-between">
        <button onClick={() => navigateDay(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white">
          <CalendarDays className="w-5 h-5 text-brand-500" />
          <span>{displayDate(currentDate)}</span>
        </div>
        <button onClick={() => navigateDay(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayedDates.map(date => {
          const dateStr = formatDate(date);
          const daily = dailyBalances[dateStr];
          const entries = entriesByDate[dateStr] || [];

          return (
            <div key={dateStr} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{displayDate(date)}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Saldo do Dia:</span>
                  <span className={`font-bold text-lg ${daily.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(daily.balance)}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 min-h-[150px]">
                {entries.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-4">Nenhum lançamento para este dia.</p>
                ) : (
                  entries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 group">
                      <div className="flex items-center space-x-2">
                        {entry.type === 'income' ? (
                          <ArrowUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-red-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.description || (entry.type === 'income' ? 'Entrada' : 'Saída')}</p>
                          <p className={`text-xs font-semibold ${entry.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(entry.amount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenModalForEditEntry(entry)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteEntry(entry.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                <button onClick={() => handleOpenModalForNewEntry(dateStr)} className="w-full flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg transition font-medium">
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Lançamento</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <FinancialEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entry={editingEntry}
        onSave={handleSaveEntry}
      />
    </div>
  );
};