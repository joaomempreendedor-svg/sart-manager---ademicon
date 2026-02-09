import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { DailyChecklistDisplay } from '@/components/consultor/DailyChecklistDisplay';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Clock, 
  FileText, 
  TrendingUp, 
  UserCheck, 
  Ghost, 
  UserMinus, 
  XCircle, 
  Percent, 
  MapPin, 
  BarChart3, 
  Calendar, 
  RotateCcw,
  ListChecks,
  Loader2
} from 'lucide-react';

const SecretariaDashboard = () => {
  const { user } = useAuth();
  const { candidates, isDataLoading, hiringOrigins } = useApp();
  
  // Filtros de Data Padrão: Mês Atual para o Dashboard
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const metrics = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    const filtered = candidates.filter(c => {
      const created = new Date(c.createdAt);
      return created >= start && created <= end;
    });

    const total = filtered.length;
    const newCandidates = filtered.filter(c => c.status === 'Triagem' && (c.screeningStatus === 'Pending Contact' || !c.screeningStatus)).length;
    const contacted = filtered.filter(c => c.status === 'Triagem' && c.screeningStatus === 'Contacted').length;
    const totalInterviews = filtered.filter(c => c.status === 'Entrevista').length;
    const conducted = filtered.filter(c => c.status === 'Entrevista' && (c.interviewConducted || c.interviewScores.basicProfile > 0)).length;
    const hired = filtered.filter(c => c.status === 'Autorizado').length;

    const hiringRate = total > 0 ? (hired / total) * 100 : 0;

    return { total, newCandidates, contacted, totalInterviews, conducted, hired, hiringRate };
  }, [candidates, startDate, endDate]);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  const MetricCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <div className={`p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm ${colorClass}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{title}</p>
          <h3 className="text-2xl font-black">{value}</h3>
        </div>
        <Icon className="w-5 h-5 opacity-50" />
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-10">
      {/* 1. SEÇÃO DE METAS DIÁRIAS */}
      <section>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <ListChecks className="w-6 h-6 mr-2 text-brand-500" /> Minhas Metas Diárias
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Acompanhe suas tarefas e rotinas do dia.</p>
        </div>
        <DailyChecklistDisplay user={user} isDataLoading={isDataLoading} />
      </section>

      <hr className="border-gray-200 dark:border-slate-800" />

      {/* 2. SEÇÃO DE DASHBOARD DE CANDIDATURAS */}
      <section>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-brand-500" /> Dashboard de Candidaturas
            </h2>
            <p className="text-gray-500 dark:text-gray-400">Resumo do fluxo de contratação (Mês Atual).</p>
          </div>
          
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs bg-transparent border-none focus:ring-0 dark:text-white"
            />
            <span className="text-gray-400">até</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs bg-transparent border-none focus:ring-0 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard title="Total" value={metrics.total} icon={Users} colorClass="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300" />
          <MetricCard title="Novos" value={metrics.newCandidates} icon={UserPlus} colorClass="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300" />
          <MetricCard title="Contatados" value={metrics.contacted} icon={MessageSquare} colorClass="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" />
          <MetricCard title="Entrevistas" value={metrics.totalInterviews} icon={Clock} colorClass="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300" />
          <MetricCard title="Realizadas" value={metrics.conducted} icon={FileText} colorClass="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300" />
          <MetricCard title="Contratados" value={metrics.hired} icon={UserCheck} colorClass="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" />
        </div>

        <div className="mt-6 bg-brand-50 dark:bg-brand-900/10 p-4 rounded-xl border border-brand-100 dark:border-brand-900/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Percent className="w-5 h-5 text-brand-600" />
            <span className="text-sm font-bold text-brand-900 dark:text-brand-200 uppercase tracking-tight">Taxa de Conversão Final</span>
          </div>
          <span className="text-2xl font-black text-brand-600">{metrics.hiringRate.toFixed(1)}%</span>
        </div>
      </section>
    </div>
  );
};

export default SecretariaDashboard;