import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Users, Calendar, FileText, UserCheck, UserX, Award, Filter, RotateCcw, UserRound, TrendingUp, Star } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const HiringReports = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { candidates, teamMembers, interviewStructure, isDataLoading } = useApp();

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [selectedResponsibleId, setSelectedResponsibleId] = useState<string | null>(null);

  const responsibleMembers = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('Gestor') || m.roles.includes('Anjo')));
  }, [teamMembers]);

  const filteredCandidates = useMemo(() => {
    let currentCandidates = candidates;

    if (selectedResponsibleId) {
      currentCandidates = currentCandidates.filter(c => c.responsibleUserId === selectedResponsibleId);
    }

    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      currentCandidates = currentCandidates.filter(c => new Date(c.createdAt) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      currentCandidates = currentCandidates.filter(c => new Date(c.createdAt) <= end);
    }

    return currentCandidates;
  }, [candidates, selectedResponsibleId, filterStartDate, filterEndDate]);

  const reportData = useMemo(() => {
    const dataByStatus: { [key: string]: number } = {
      'Entrevista Agendada': 0,
      'Entrevista Realizada': 0,
      'Aguardando Prévia': 0,
      'Onboarding Online': 0,
      'Integração Presencial': 0,
      'Acompanhamento 90 Dias': 0,
      'Autorizado': 0,
      'Reprovado': 0,
    };

    let totalInterviewScore = 0;
    let interviewCount = 0;
    const sectionScores: { [key: string]: { total: number; count: number } } = {};
    interviewStructure.forEach(section => {
      sectionScores[section.id] = { total: 0, count: 0 };
    });

    const candidatesByResponsible: { [key: string]: { name: string; count: number } } = {};
    responsibleMembers.forEach(m => candidatesByResponsible[m.id] = { name: m.name, count: 0 });

    filteredCandidates.forEach(c => {
      dataByStatus[c.status]++;

      if (c.responsibleUserId && candidatesByResponsible[c.responsibleUserId]) {
        candidatesByResponsible[c.responsibleUserId].count++;
      }

      const totalCandidateScore = Object.entries(c.interviewScores)
        .filter(([key]) => key !== 'notes')
        .reduce((sum, [key, val]) => {
          if (typeof val === 'number') {
            sectionScores[key].total += val;
            sectionScores[key].count++;
            return sum + val;
          }
          return sum;
        }, 0);

      if (totalCandidateScore > 0) {
        totalInterviewScore += totalCandidateScore;
        interviewCount++;
      }
    });

    const avgInterviewScore = interviewCount > 0 ? totalInterviewScore / interviewCount : 0;

    const avgSectionScores = Object.entries(sectionScores).map(([id, data]) => ({
      id,
      title: interviewStructure.find(s => s.id === id)?.title || id,
      average: data.count > 0 ? data.total / data.count : 0,
    }));

    const sortedCandidatesByResponsible = Object.values(candidatesByResponsible).sort((a, b) => b.count - a.count);

    return {
      dataByStatus,
      avgInterviewScore,
      avgSectionScores,
      candidatesByResponsible: sortedCandidatesByResponsible,
    };
  }, [filteredCandidates, interviewStructure, responsibleMembers]);

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setSelectedResponsibleId(null);
  };

  const hasActiveFilters = filterStartDate || filterEndDate || selectedResponsibleId;

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios de Contratação</h1>
          <p className="text-gray-500 dark:text-gray-400">Análise do pipeline de candidatos e desempenho do processo seletivo.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtrar Relatório</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition">
              <RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="filterStartDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Candidatos Criados de</label>
            <input
              type="date"
              id="filterStartDate"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="filterEndDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Candidatos Criados até</label>
            <input
              type="date"
              id="filterEndDate"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div className="w-full">
            <label htmlFor="responsibleFilter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Responsável</label>
            <Select 
              value={selectedResponsibleId || 'all'} 
              onValueChange={(value) => setSelectedResponsibleId(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Todos os Responsáveis" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todos os Responsáveis</SelectItem>
                {responsibleMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Pipeline Status Overview */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-brand-500" />Visão Geral do Pipeline</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Entrevistas Agendadas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.dataByStatus['Entrevista Agendada']}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Entrevistas Realizadas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.dataByStatus['Entrevista Realizada']}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
            <UserCheck className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Aguardando Prévia</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.dataByStatus['Aguardando Prévia']}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Reprovados</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.dataByStatus['Reprovado']}</p>
          </div>
        </div>
      </div>

      {/* Interview Scores */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Award className="w-5 h-5 mr-2 text-brand-500" />Desempenho das Entrevistas</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">Média Geral da Entrevista</h3>
          <p className="text-4xl font-bold text-brand-600 dark:text-brand-400">{reportData.avgInterviewScore.toFixed(1)} / 100</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Pontuação média de todas as entrevistas realizadas.</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">Média por Seção da Entrevista</h3>
          <ul className="space-y-3">
            {reportData.avgSectionScores.length === 0 ? (
              <li className="text-gray-500 dark:text-gray-400 text-sm">Nenhum dado disponível.</li>
            ) : (
              reportData.avgSectionScores.map(section => (
                <li key={section.id} className="flex items-center justify-between">
                  <span className="text-gray-800 dark:text-gray-200">{section.title}</span>
                  <span className="text-gray-600 dark:text-gray-300">{section.average.toFixed(1)} pts</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Candidates by Responsible */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><UserRound className="w-5 h-5 mr-2 text-brand-500" />Candidatos por Responsável</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Total de Candidatos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {reportData.candidatesByResponsible.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-gray-400">
                    Nenhum responsável encontrado ou dados de candidatos.
                  </td>
                </tr>
              ) : (
                reportData.candidatesByResponsible.map(responsible => (
                  <tr key={responsible.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                      {responsible.name === user?.name ? <Crown className="w-4 h-4 text-yellow-500" /> : <UserRound className="w-4 h-4 text-gray-400" />}
                      <span>{responsible.name}</span>
                    </td>
                    <td className="px-4 py-3">{responsible.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HiringReports;