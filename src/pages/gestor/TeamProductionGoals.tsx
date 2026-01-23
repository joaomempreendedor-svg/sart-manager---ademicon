import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { TeamProductionGoal } from '@/types';
import { Plus, Edit2, Trash2, Users, DollarSign, CalendarDays, Loader2, TrendingUp, Target, CheckCircle2, XCircle, RotateCcw, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const TeamProductionGoals = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { teamProductionGoals, teamMembers, crmLeads, isDataLoading, addTeamProductionGoal, updateTeamProductionGoal, deleteTeamProductionGoal } = useApp();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<TeamProductionGoal | null>(null);
  const [targetTeamSize, setTargetTeamSize] = useState<number | ''>('');
  const [targetProductionValue, setTargetProductionValue] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // NOVO: Estado para o ano selecionado

  const currentActiveGoal = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return teamProductionGoals.find(goal => goal.start_date <= today && goal.end_date >= today);
  }, [teamProductionGoals]);

  const currentTeamSize = useMemo(() => {
    return teamMembers.filter(member => member.isActive && (member.roles.includes('CONSULTOR') || member.roles.includes('Prévia') || member.roles.includes('Autorizado'))).length;
  }, [teamMembers]);

  const currentProductionValue = useMemo(() => {
    if (!currentActiveGoal) return 0;
    const start = new Date(currentActiveGoal.start_date + 'T00:00:00');
    const end = new Date(currentActiveGoal.end_date + 'T23:59:59');

    return crmLeads.reduce((sum, lead) => {
      if (lead.saleDate) {
        const saleDate = new Date(lead.saleDate + 'T00:00:00');
        if (saleDate >= start && saleDate <= end && lead.soldCreditValue) {
          return sum + lead.soldCreditValue;
        }
      }
      return sum;
    }, 0);
  }, [currentActiveGoal, crmLeads]);

  // NOVO: Resumo Anual
  const annualSummary = useMemo(() => {
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    const goalsInSelectedYear = teamProductionGoals.filter(goal => {
      const goalStart = new Date(goal.start_date + 'T00:00:00');
      const goalEnd = new Date(goal.end_date + 'T23:59:59');
      // Uma meta é relevante se seu período se sobrepõe ao ano selecionado
      return (goalStart <= endOfYear && goalEnd >= startOfYear);
    });

    let projectedTeamSizeTarget = 0; // Alterado de totalTargetTeamSize
    let latestGoalEndDate: Date | null = null;

    // Calcula o projectedTeamSizeTarget como a meta de tamanho da equipe do período mais recente
    goalsInSelectedYear.forEach(goal => {
      const goalEnd = new Date(goal.end_date + 'T00:00:00');
      if (latestGoalEndDate === null || goalEnd > latestGoalEndDate) {
        latestGoalEndDate = goalEnd;
        projectedTeamSizeTarget = goal.target_team_size;
      }
    });

    let totalTargetProductionValue = 0;
    let totalActualProductionValueForYear = 0;
    let goalsMetCount = 0; // Contagem de metas individuais onde o alvo de produção foi atingido

    goalsInSelectedYear.forEach(goal => {
      totalTargetProductionValue += goal.target_production_value;

      const goalPeriodStart = new Date(goal.start_date + 'T00:00:00');
      const goalPeriodEnd = new Date(goal.end_date + 'T23:59:59');

      const actualProductionForThisGoal = crmLeads.reduce((sum, lead) => {
        if (lead.saleDate) {
          const saleDate = new Date(lead.saleDate + 'T00:00:00');
          if (saleDate >= goalPeriodStart && saleDate <= goalPeriodEnd && lead.soldCreditValue) {
            return sum + lead.soldCreditValue;
          }
        }
        return sum;
      }, 0);

      if (actualProductionForThisGoal >= goal.target_production_value) {
        goalsMetCount++;
      }
    });

    // Calcular a produção real total para o ano selecionado
    totalActualProductionValueForYear = crmLeads.reduce((sum, lead) => {
      if (lead.saleDate) {
        const saleDate = new Date(lead.saleDate + 'T00:00:00');
        if (saleDate >= startOfYear && saleDate <= endOfYear && lead.soldCreditValue) {
          return sum + lead.soldCreditValue;
        }
      }
      return sum;
    }, 0);

    return {
      totalGoalsSet: goalsInSelectedYear.length,
      goalsMetCount,
      projectedTeamSizeTarget, // Alterado aqui
      totalTargetProductionValue,
      totalActualProductionValueForYear,
      currentTeamSize, // Snapshot atual de membros ativos da equipe
    };
  }, [teamProductionGoals, selectedYear, crmLeads, currentTeamSize]);


  useEffect(() => {
    if (isFormOpen && editingGoal) {
      setTargetTeamSize(editingGoal.target_team_size);
      setTargetProductionValue(formatCurrencyInput(editingGoal.target_production_value.toFixed(2).replace('.', ',')));
      setStartDate(editingGoal.start_date);
      setEndDate(editingGoal.end_date);
    } else if (isFormOpen && !editingGoal) {
      // Set default dates for new goal: current month
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
      setEndDate(lastDayOfMonth.toISOString().split('T')[0]);
      setTargetTeamSize('');
      setTargetProductionValue('');
    }
    setError('');
  }, [isFormOpen, editingGoal]);

  const formatCurrencyInput = (value: string): string => {
    let v = value.replace(/\D/g, '');
    v = (parseInt(v, 10) / 100).toFixed(2).replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    if (v === 'NaN,NaN') return '';
    return v;
  };

  const parseCurrencyInput = (value: string): number => {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedProductionValue = parseCurrencyInput(targetProductionValue);

    if (!targetTeamSize || targetTeamSize <= 0) {
      setError('O tamanho da equipe alvo deve ser um número positivo.');
      return;
    }
    if (!parsedProductionValue || parsedProductionValue <= 0) {
      setError('O valor de produção alvo deve ser um número positivo.');
      return;
    }
    if (!startDate || !endDate) {
      setError('As datas de início e fim são obrigatórias.');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError('A data de início deve ser anterior à data de fim.');
      return;
    }

    setIsSaving(true);
    try {
      const goalData: Omit<TeamProductionGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
        target_team_size: targetTeamSize as number,
        target_production_value: parsedProductionValue,
        start_date: startDate,
        end_date: endDate,
      };

      if (editingGoal) {
        await updateTeamProductionGoal(editingGoal.id, goalData);
        toast.success('Meta de produção atualizada com sucesso!');
      } else {
        await addTeamProductionGoal(goalData);
        toast.success('Meta de produção adicionada com sucesso!');
      }
      setIsFormOpen(false);
      setEditingGoal(null);
    } catch (err: any) {
      console.error('Erro ao salvar meta de produção:', err);
      setError(err.message || 'Falha ao salvar a meta de produção.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta meta de produção?')) {
      try {
        await deleteTeamProductionGoal(goalId);
        toast.success('Meta de produção excluída com sucesso!');
      } catch (err: any) {
        console.error('Erro ao excluir meta de produção:', err);
        toast.error(err.message || 'Falha ao excluir a meta de produção.');
      }
    }
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  const teamSizeDifference = currentActiveGoal ? currentTeamSize - currentActiveGoal.target_team_size : 0;
  const productionValueDifference = currentActiveGoal ? currentProductionValue - currentActiveGoal.target_production_value : 0;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Metas de Produção da Equipe</h1>
          <p className="text-gray-500 dark:text-gray-400">Defina e acompanhe as metas de tamanho da equipe e valor de produção.</p>
        </div>
        <button
          onClick={() => { setIsFormOpen(true); setEditingGoal(null); }}
          className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition font-medium mt-4 sm:mt-0"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Meta</span>
        </button>
      </div>

      {/* Current Active Goal Overview */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2 text-brand-500" /> Meta Ativa
        </h2>
        {currentActiveGoal ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm text-gray-700 dark:text-gray-300">
              <span>Período:</span>
              <span className="font-medium">{new Date(currentActiveGoal.start_date + 'T00:00:00').toLocaleDateString('pt-BR')} - {new Date(currentActiveGoal.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Tamanho da Equipe</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{currentTeamSize} / {currentActiveGoal.target_team_size}</span>
                  <span className={`font-semibold ${teamSizeDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {teamSizeDifference >= 0 ? `+${teamSizeDifference}` : teamSizeDifference}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2 mt-2">
                  <div className={`h-2 rounded-full ${teamSizeDifference >= 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (currentTeamSize / currentActiveGoal.target_team_size) * 100)}%` }}></div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Valor de Produção</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(currentProductionValue)} / {formatCurrency(currentActiveGoal.target_production_value)}</span>
                  <span className={`font-semibold ${productionValueDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {productionValueDifference >= 0 ? `+${formatCurrency(productionValueDifference)}` : formatCurrency(productionValueDifference)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2 mt-2">
                  <div className={`h-2 rounded-full ${productionValueDifference >= 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (currentProductionValue / currentActiveGoal.target_production_value) * 100)}%` }}></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => { setIsFormOpen(true); setEditingGoal(currentActiveGoal); }} className="p-2 text-gray-400 hover:text-blue-500 rounded-full" title="Editar Meta">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDeleteGoal(currentActiveGoal.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full" title="Excluir Meta">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Target className="mx-auto w-12 h-12 mb-3 text-gray-300 dark:text-slate-600" />
            <p>Nenhuma meta de produção ativa para o período atual.</p>
            <p className="text-sm mt-2">Crie uma nova meta para começar a acompanhar.</p>
          </div>
        )}
      </div>

      {/* NOVO: Resumo Anual */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <CalendarDays className="w-5 h-5 mr-2 text-brand-500" /> Resumo Anual
        </h2>
        <div className="flex items-center space-x-2 mb-4">
          <label htmlFor="selectYear" className="text-sm font-medium text-gray-700 dark:text-gray-300">Ano:</label>
          <select
            id="selectYear"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Metas Definidas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{annualSummary.totalGoalsSet}</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Metas de Produção Atingidas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{annualSummary.goalsMetCount} / {annualSummary.totalGoalsSet}</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Tamanho da Equipe (Alvo Projetado)</p> {/* Título alterado */}
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{annualSummary.currentTeamSize} / {annualSummary.projectedTeamSizeTarget}</p> {/* Usando projectedTeamSizeTarget */}
          </div>
          <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Valor de Produção (Alvo Total)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(annualSummary.totalActualProductionValueForYear)} / {formatCurrency(annualSummary.totalTargetProductionValue)}</p>
          </div>
        </div>
      </div>

      {/* All Goals History */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white p-6 border-b border-gray-100 dark:border-slate-700">Histórico de Metas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Período</th>
                <th className="px-6 py-3">Tamanho da Equipe Alvo</th>
                <th className="px-6 py-3">Valor de Produção Alvo</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {teamProductionGoals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Nenhuma meta de produção registrada.
                  </td>
                </tr>
              ) : (
                teamProductionGoals.map(goal => {
                  const today = new Date().toISOString().split('T')[0];
                  const isActive = goal.start_date <= today && goal.end_date >= today;
                  const isPast = goal.end_date < today;

                  return (
                    <tr key={goal.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {new Date(goal.start_date + 'T00:00:00').toLocaleDateString('pt-BR')} - {new Date(goal.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">{goal.target_team_size} pessoas</td>
                      <td className="px-6 py-4">{formatCurrency(goal.target_production_value)}</td>
                      <td className="px-6 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Ativa
                          </span>
                        ) : isPast ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
                            <XCircle className="w-3 h-3 mr-1" /> Finalizada
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <CalendarDays className="w-3 h-3 mr-1" /> Futura
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center space-x-2">
                          <button onClick={() => { setIsFormOpen(true); setEditingGoal(goal); }} className="p-2 text-gray-400 hover:text-blue-500 rounded-full" title="Editar Meta">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteGoal(goal.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full" title="Excluir Meta">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goal Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border border-gray-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{editingGoal ? 'Editar Meta de Produção' : 'Nova Meta de Produção'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGoal}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tamanho da Equipe Alvo</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={targetTeamSize}
                      onChange={e => setTargetTeamSize(parseInt(e.target.value) || '')}
                      required
                      min="1"
                      className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                      placeholder="Ex: 10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor de Produção Alvo (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={targetProductionValue}
                      onChange={e => setTargetProductionValue(formatCurrencyInput(e.target.value))}
                      required
                      className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Início</label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      required
                      className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                      />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Fim</label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      required
                      className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                    />
                  </div>
                </div>
                {error && <p className="text-red-500 text-sm mt-2 flex items-center"><XCircle className="w-4 h-4 mr-2" />{error}</p>}
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-600 mr-2">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex items-center space-x-2 disabled:opacity-50">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>{editingGoal ? 'Atualizar Meta' : 'Criar Meta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamProductionGoals;