import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, User, Calendar, CheckCircle2, TrendingUp, AlertCircle, Clock, Users, Star, CheckSquare, XCircle, BellRing, UserRound, Plus, ListTodo, Send, DollarSign, Repeat, Filter, RotateCcw } from 'lucide-react';
import { CandidateStatus } from '@/types';
import { TableSkeleton } from '@/components/TableSkeleton';
import { ScheduleInterviewModal } from '@/components/ScheduleInterviewModal';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }: { status: CandidateStatus }) => {
  const colors = {
    'Entrevista': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    'Aguardando Prévia': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Onboarding Online': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'Integração Presencial': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'Acompanhamento 90 Dias': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'Autorizado': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'Reprovado': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'Triagem': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
};

export const AllCandidates = () => {
  const { user } = useAuth();
  const { candidates, isDataLoading, checklistStructure, teamMembers } = useApp();
  const navigate = useNavigate();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const candidatesForTable = useMemo(() => {
    let currentCandidates = candidates.filter(c => c.status !== 'Triagem');

    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      currentCandidates = currentCandidates.filter(c => new Date(c.createdAt) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      currentCandidates = currentCandidates.filter(c => new Date(c.createdAt) <= end);
    }

    const sortedCandidates = currentCandidates.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      
      if (isNaN(dateA) && isNaN(dateB)) return 0;
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;

      return dateB - dateA;
    });

    return sortedCandidates;
  }, [candidates, filterStartDate, filterEndDate]);

  const clearCandidateFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const hasActiveCandidateFilters = filterStartDate || filterEndDate;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Todos os Candidatos</h1>
          <p className="text-gray-500 dark:text-gray-400">Visualize e gerencie todos os candidatos no seu pipeline.</p>
        </div>
        <button
          onClick={() => setIsScheduleModalOpen(true)}
          className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 dark:hover:text-brand-300 mt-2 sm:mt-0"
        >
          + Agendar Entrevista
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center justify-between flex-col sm:flex-row mb-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtrar Candidatos por Data de Criação</h3>
            {hasActiveCandidateFilters && (
              <button onClick={clearCandidateFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition mt-2 sm:mt-0">
                <RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="candidateFilterStartDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">De</label>
              <input
                type="date"
                id="candidateFilterStartDate"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="candidateFilterEndDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Até</label>
              <input
                type="date"
                id="candidateFilterEndDate"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {isDataLoading ? (
          <div className="p-6">
            <TableSkeleton />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white font-medium">
                <tr>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Data Entrevista</th>
                  <th className="px-6 py-3">Nota</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {candidatesForTable.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      Nenhum candidato cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  candidatesForTable.map((c) => {
                    const totalScore =
                      c.interviewScores.basicProfile +
                      c.interviewScores.commercialSkills +
                      c.interviewScores.behavioralProfile +
                      c.interviewScores.jobFit;

                    return (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/gestor/candidate/${c.id}`)}
                        className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold text-xs">
                                  {c.name.substring(0,2).toUpperCase()}
                              </div>
                              <span>{c.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 flex items-center space-x-2">
                           <Calendar className="w-4 h-4 text-gray-400" />
                           <span>{new Date(c.interviewDate + 'T00:00:00').toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-bold ${totalScore > 0 ? (totalScore >= 70 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400') : 'text-gray-400'}`}>
                              {totalScore > 0 ? `${totalScore}/100` : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ScheduleInterviewModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} />
    </div>
  );
};