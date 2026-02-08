import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Clock, User, Phone, CheckCircle2, Loader2, Users, TrendingUp, XCircle, Check, UserX, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';

export const SecretariaDashboard = () => {
  const { candidates, teamMembers, isDataLoading, updateCandidate } = useApp();
  const { user } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];

  const todayInterviews = useMemo(() => {
    return candidates
      .filter(c => c.interviewDate === todayStr && c.status === 'Entrevista' && !c.interviewConducted)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [candidates, todayStr]);

  const handleConfirmAttendance = async (candidateId: string, name: string) => {
    try {
      await updateCandidate(candidateId, { interviewConducted: true });
      toast.success(`Presença de ${name} confirmada!`);
    } catch (error: any) {
      toast.error("Erro ao confirmar presença.");
    }
  };

  const handleMarkNoShow = async (candidateId: string, name: string) => {
    if (window.confirm(`Confirmar que o candidato ${name} NÃO compareceu à entrevista?`)) {
      try {
        await updateCandidate(candidateId, { status: 'Faltou' });
        toast.error(`Falta registrada para ${name}.`);
      } catch (error: any) {
        toast.error("Erro ao registrar falta.");
      }
    }
  };

  const handleMarkWithdrawal = async (candidateId: string, name: string) => {
    if (window.confirm(`Confirmar desistência do candidato ${name}?`)) {
      try {
        await updateCandidate(candidateId, { status: 'Reprovado' }); // 'Reprovado' é usado para Desistências no sistema
        toast.success(`Desistência registrada para ${name}.`);
      } catch (error: any) {
        toast.error("Erro ao registrar desistência.");
      }
    }
  };

  const getResponsibleName = (responsibleUserId: string | undefined) => {
    if (!responsibleUserId) return 'Não atribuído';
    const member = teamMembers.find(m => m.id === responsibleUserId || m.authUserId === responsibleUserId);
    return member ? member.name : 'Desconhecido';
  };

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Controle de Recepção</h1>
        <p className="text-gray-500 dark:text-gray-400">Gerencie a chegada dos candidatos para as entrevistas de hoje.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Entrevistas Hoje</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayInterviews.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center">
            <Users className="w-5 h-5 mr-2 text-brand-500" /> Candidatos Aguardados (Hoje)
          </h2>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {todayInterviews.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma entrevista pendente para hoje.</p>
            </div>
          ) : (
            todayInterviews.map(candidate => (
              <div key={candidate.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                <div className="flex items-start space-x-4 mb-4 sm:mb-0">
                  <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold">
                    {candidate.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{candidate.name}</h3>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1" /> {candidate.phone || 'N/A'}</span>
                      <span className="flex items-center"><UserRound className="w-3.5 h-3.5 mr-1" /> Resp: {getResponsibleName(candidate.responsibleUserId)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleMarkWithdrawal(candidate.id, candidate.name)}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 px-4 py-2.5 rounded-lg transition font-bold hover:bg-gray-50 dark:hover:bg-slate-600"
                    title="Candidato desistiu da vaga"
                  >
                    <UserX className="w-5 h-5" />
                    <span>Desistiu</span>
                  </button>
                  <button
                    onClick={() => handleMarkNoShow(candidate.id, candidate.name)}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-white dark:bg-slate-700 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-lg transition font-bold hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Candidato não compareceu"
                  >
                    <XCircle className="w-5 h-5" />
                    <span>Faltou</span>
                  </button>
                  <button
                    onClick={() => handleConfirmAttendance(candidate.id, candidate.name)}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg transition font-bold shadow-md shadow-green-600/20"
                  >
                    <Check className="w-5 h-5" />
                    <span>Compareceu</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};