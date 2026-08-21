import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Loader2, 
  MapPin, 
  BarChart3, 
  Calendar, 
  RotateCcw,
  Users,
  TrendingUp
} from 'lucide-react';

const HiringOriginsReport = () => {
  const { candidates, isDataLoading, hiringOrigins } = useApp();
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const reportData = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    const filtered = candidates.filter(c => {
      const created = new Date(c.createdAt);
      return created >= start && created <= end;
    });

    const total = filtered.length;
    const originCounts: Record<string, number> = {};
    
    hiringOrigins.forEach(origin => { originCounts[origin] = 0; });
    originCounts['Não Informado'] = 0;

    filtered.forEach(c => {
      const origin = c.origin || 'Não Informado';
      originCounts[origin] = (originCounts[origin] || 0) + 1;
    });

    return Object.entries(originCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .filter(o => o.count > 0 || hiringOrigins.includes(o.name))
      .sort((a, b) => b.count - a.count);
  }, [candidates, startDate, endDate, hiringOrigins]);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <MapPin className="w-6 h-6 mr-2 text-brand-500" /> Relatório de Origens
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Análise detalhada da fonte de entrada dos seus candidatos.</p>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Data Inicial</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Data Final</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
          <button 
            onClick={() => {
              const d = new Date();
              setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
              setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]);
            }}
            className="p-2.5 text-gray-400 hover:text-brand-500 transition-colors border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
            title="Resetar Filtros"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-brand-500" /> Distribuição por Fonte
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/30 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Origem</th>
                <th className="px-6 py-3">Quantidade</th>
                <th className="px-6 py-3">Representatividade</th>
                <th className="px-6 py-3">Volume Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    Nenhum dado encontrado para o período selecionado.
                  </td>
                </tr>
              ) : (
                reportData.map(origin => (
                  <tr key={origin.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{origin.name}</td>
                    <td className="px-6 py-4 font-medium">{origin.count} candidatos</td>
                    <td className="px-6 py-4 font-bold text-brand-600 dark:text-brand-400">{origin.percentage.toFixed(1)}%</td>
                    <td className="px-6 py-4 w-1/3">
                      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-brand-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${origin.percentage}%` }}
                        ></div>
                      </div>
                    </td>
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

export default HiringOriginsReport;