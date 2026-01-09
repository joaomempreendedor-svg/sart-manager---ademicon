import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { FinancialEntry } from '@/types';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, DollarSign, ArrowUp, ArrowDown, Edit2, Trash2, Loader2 } from 'lucide-react';
import { FinancialEntryModal } from '@/components/FinancialEntryModal';
import toast from 'react-hot-toast';

const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
const displayDate = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const displayMonthYear = (date: Date) => date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(year, month, i));
    }
    return dates;
  }, [currentDate]);

  const entriesByDate = useMemo(() => {
    const map: Record<string, FinancialEntry[]> = {};
    // Initialize map for all displayed dates
    displayedDates.forEach(date => {
      map[formatDate(date)] = [];
    });

    financialEntries.forEach(entry => {
      const entryDateStr = entry.entry_date;
      // Only include entries that fall within the currently displayed month
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
    let runningBalance = 0; // Initialize running balance

    // Calculate balance for days BEFORE the current displayed month
    const firstDayOfDisplayedMonth = displayedDates[0];
    if (firstDayOfDisplayedMonth) {
      const allEntriesBeforeMonth = financialEntries.filter(entry => 
        new Date(entry.entry_date + 'T00:00:00') < firstDayOfDisplayedMonth
      );
      allEntriesBeforeMonth.forEach(entry => {
        if (entry.type === 'income') {
          runningBalance += entry.amount;
        } else {
          runningBalance -= entry.amount;
        }
      });
    }

    displayedDates.forEach(date => {
      const dateStr = formatDate(date);
      const entries = entriesByDate[dateStr] || [];
      let dailyIncome = 0;
      let dailyExpense = 0;

      entries.forEach(entry => {
        if (entry.type === 'income') {
          dailyIncome += entry.amount;
        } else {
          dailyExpense += entry.amount;
        }
      });
      
      runningBalance += (dailyIncome - dailyExpense); // Update running balance
      balances[dateStr] = { income: dailyIncome, expense: dailyExpense, balance: runningBalance };
    });
    return balances;
  }, [entriesByDate, displayedDates, financialEntries]); // Added financialEntries to dependencies

  // NOVO: Resumo financeiro mensal
  const monthlySummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let finalAccumulatedBalance = 0;

    if (displayedDates.length > 0) {
      const firstDayOfMonth = displayedDates[0];
      const lastDayOfMonth = displayedDates[displayedDates.length - 1];

      // Calculate total income and expense for the displayed month
      financialEntries.forEach(entry => {
        const entryDate = new Date(entry.entry_date + 'T00:00:00');
        if (entryDate >= firstDayOfMonth && entryDate <= lastDayOfMonth) {
          if (entry.type === 'income') {
            totalIncome += entry.amount;
          } else {
            totalExpense += entry.amount;
          }
        }
      });

      // Get the accumulated balance from the last day of the month
      const lastDayStr = formatDate(lastDayOfMonth);
      finalAccumulatedBalance = dailyBalances[lastDayStr]?.balance || 0;
    }

    const netBalance = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      finalAccumulatedBalance,
    };
  }, [financialEntries, displayedDates, dailyBalances]);


  const navigateMonth = (offset: number) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() + offset);
      return newDate;
    });
  };

  const handleOpenModalForNewEntry = (date: string) => {
    setEditingEntry(null);
    setSelectedDateForNewEntry(date); // Pass the specific date
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
        <button onClick={() => navigateMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white">
          <CalendarDays className="w-5 h-5 text-brand-500" />
          <span>{displayMonthYear(currentDate)}</span>
        </div>
        <button onClick={() => navigateMonth(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* NOVO: Resumo Financeiro Mensal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <ArrowUp className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Entradas do Mês</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(monthlySummary.totalIncome)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <ArrowDown className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Saídas do Mês</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(monthlySummary.totalExpense)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Saldo Líquido do Mês</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(monthlySummary.netBalance)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
            <DollarSign className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Saldo Acumulado Final</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(monthlySummary.finalAccumulatedBalance)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {displayedDates.map(date => {
          const dateStr = formatDate(date);
          const daily = dailyBalances[dateStr];
          const entries = entriesByDate[dateStr] || [];

          return (
            <div key={dateStr} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                <h3 className="font-bold text-base text-gray-900 dark:text-white">{date.getDate()} {date.toLocaleDateString('pt-BR', { weekday: 'short' })}</h3>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Saldo:</span>
                  <span className={`font-bold text-sm ${daily.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(daily.balance)}
                  </span>
                </div>
              </div>
              <div className="p-3 space-y-2 min-h-[100px] max-h-[200px] overflow-y-auto custom-scrollbar">
                {entries.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-2">Nenhum lançamento.</p>
                ) : (
                  entries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 group">
                      <div className="flex items-center space-x-1">
                        {entry.type === 'income' ? (
                          <ArrowUp className="w-3 h-3 text-green-600" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-red-600" />
                        )}
                        <div>
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[80px]">{entry.description || (entry.type === 'income' ? 'Entrada' : 'Saída')}</p>
                          <p className={`text-[10px] font-semibold ${entry.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(entry.amount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenModalForEditEntry(entry)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md">
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDeleteEntry(entry.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                <button onClick={() => handleOpenModalForNewEntry(dateStr)} className="w-full flex items-center justify-center space-x-1 bg-brand-600 hover:bg-brand-700 text-white py-1.5 rounded-lg transition text-sm font-medium">
                  <Plus className="w-3 h-3" />
                  <span>Adicionar</span>
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
        defaultDate={selectedDateForNewEntry || undefined}
      />
    </div>
  );
};