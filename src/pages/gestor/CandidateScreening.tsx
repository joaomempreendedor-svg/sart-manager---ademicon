import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Search, User, Phone, Mail, CheckCircle2, XCircle, RotateCcw, ArrowRight, MessageSquare, UserX, Plus, Trash2, Users, Clock, UserRound } from 'lucide-react'; // Adicionado Users, Clock, UserRound icons
import { Link } from 'react-router-dom';
import { TableSkeleton } from '@/components/TableSkeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';
import { AddScreeningCandidateModal } from '@/components/gestor/AddScreeningCandidateModal'; // NOVO: Importar o modal

const CandidateScreening = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { candidates, isDataLoading, updateCandidate, deleteCandidate, teamMembers, origins } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Pending Contact' | 'Contacted' | 'No Fit'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const candidatesInScreening = useMemo(() => {
    return candidates.filter(c => c.status === 'Triagem');
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    let currentCandidates = candidatesInScreening;

    if (filterStatus !== 'all') {
      currentCandidates = currentCandidates.filter(c => (c.screeningStatus || 'Pending Contact') === filterStatus);
    }

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentCandidates = currentCandidates.filter(c =>
        (c.name && c.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (c.phone && c.phone.includes(lowerCaseSearchTerm)) ||
        (c.email?.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    return currentCandidates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [candidatesInScreening, searchTerm, filterStatus]);

  // NOVO: Cálculo das métricas de resumo
  const screeningMetrics = useMemo(() => {
    const total = candidatesInScreening.length;
    const pending = candidatesInScreening.filter(c => (c.screeningStatus || 'Pending Contact') === 'Pending Contact').length;
    const contacted = candidatesInScreening.filter(c => c.screeningStatus === 'Contacted').length;
    const noFit = candidatesInScreening.filter(c => c.screeningStatus === 'No Fit').length;
    return { total, pending, contacted, noFit };
  }, [candidatesInScreening]);

  const handleUpdateScreeningStatus = async (candidateId: string, newStatus: 'Pending Contact' | 'Contacted' | 'No Fit') => {
    try {
      await updateCandidate(candidateId, { screeningStatus: newStatus });
      toast.success(`Status de triagem atualizado para "${newStatus}"!`);
    } catch (error: any) {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    }
  };

  const handleDeleteCandidate = async (candidateId: string, candidateName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o candidato "${candidateName}"? Esta ação não pode ser desfeita.`)) {
      try {
        await deleteCandidate(candidateId);
        toast.success(`Candidato "${candidateName}" excluído com sucesso!`);
      } catch (error: any) {
        toast.error(`Erro ao excluir candidato: ${error.message}`);
      }
    }
  };

  const getStatusBadge = (status: 'Pending Contact' | 'Contacted' | 'No Fit' | undefined) => {
    switch (status) {
      case 'Contacted':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Contatado</span>;
      case 'No Fit':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"><UserX className="w-3 h-3 mr-1" /> Sem Perfil</span>;
      case 'Pending Contact':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"><MessageSquare className="w-3 h-3 mr-1" /> Pendente</span>;
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Controle de Candidaturas</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie a triagem inicial de candidatos para entrevistas.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar candidato..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm w-full focus:ring-brand-500 focus:border-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48 flex-shrink-0">
            <Select 
              value={filterStatus} 
              onValueChange={(value: 'all' | 'Pending Contact' | 'Contacted' | 'No Fit') => setFilterStatus(value)}
            >
              <SelectTrigger className="w-full dark:bg-slate-800 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="Pending Contact">Pendente de Contato</SelectItem>
                <SelectItem value="Contacted">Contatado</SelectItem>
                <SelectItem value="No Fit">Sem Perfil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition font-medium flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Adicionar Pessoa</span>
          </button>
        </div>
      </div>

      {/* NOVO: Seção de Resumo de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total em Triagem</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{screeningMetrics.total}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pendente de Contato</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{screeningMetrics.pending}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Contatados</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{screeningMetrics.contacted}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Sem Perfil</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{screeningMetrics.noFit}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">Contato</th>
                <th className="px-6 py-3">Status Triagem</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    Nenhum candidato encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map(candidate => {
                  const responsibleMember = teamMembers.find(m => m.id === candidate.responsibleUserId);
                  return (
                    <tr key={candidate.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {candidate.name}
                        {responsibleMember && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Responsável: {responsibleMember.name}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {candidate.phone && <span className="flex items-center text-gray-700 dark:text-gray-200"><Phone className="w-3 h-3 mr-1" /> {candidate.phone}</span>}
                        </div>
                        {candidate.email && <span className="flex items-center text-gray-700 dark:text-gray-200"><Mail className="w-3 h-3 mr-1" /> {candidate.email}</span>}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(candidate.screeningStatus)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center space-x-2">
                          {candidate.screeningStatus !== 'Contacted' && (
                            <button
                              onClick={() => handleUpdateScreeningStatus(candidate.id, 'Contacted')}
                              className="p-2 rounded-full text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                              title="Marcar como Contatado"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {candidate.screeningStatus !== 'No Fit' && (
                            <button
                              onClick={() => handleUpdateScreeningStatus(candidate.id, 'No Fit')}
                              className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Marcar como Sem Perfil"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCandidate(candidate.id, candidate.name)}
                            className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Excluir Candidato"
                          >
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
      <AddScreeningCandidateModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        origins={origins}
        responsibleMembers={teamMembers.filter(m => m.isActive && (m.roles.includes('Gestor') || m.roles.includes('Anjo')))}
      />
    </div>
  );
};

export default CandidateScreening;