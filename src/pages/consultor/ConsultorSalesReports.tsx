import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, DollarSign, Calendar, Users, Hash, Filter, RotateCcw, Download, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const ConsultorSalesReports = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { crmLeads, crmStages, isDataLoading } = useApp();

  // CORREÇÃO: Filtro padrão para o mês atual
  const [filterSaleDateStart, setFilterSaleDateStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [filterSaleDateEnd, setFilterSaleDateEnd] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const consultantSales = useMemo(() => {
    if (!user) return [];

    let sales = crmLeads.filter(lead => {
      const isWonStage = crmStages.some(stage => stage.id === lead.stage_id && stage.is_won);
      return lead.consultant_id === user.id && isWonStage && lead.sale_date && (lead.sold_credit_value !== undefined && lead.sold_credit_value !== null);
    });

    if (filterSaleDateStart) {
      const start = new Date(filterSaleDateStart + 'T00:00:00');
      sales = sales.filter(lead => lead.sale_date && new Date(lead.sale_date + 'T00:00:00') >= start);
    }
    if (filterSaleDateEnd) {
      const end = new Date(filterSaleDateEnd + 'T23:59:59');
      sales = sales.filter(lead => lead.sale_date && new Date(lead.sale_date + 'T00:00:00') <= end);
    }

    return sales.sort((a, b) => new Date(b.sale_date!).getTime() - new Date(a.sale_date!).getTime());
  }, [crmLeads, crmStages, user, filterSaleDateStart, filterSaleDateEnd]);

  const totalSoldValue = useMemo(() => {
    return consultantSales.reduce((sum, lead) => sum + (lead.sold_credit_value || 0), 0);
  }, [consultantSales]);

  const clearFilters = () => {
    setFilterSaleDateStart('');
    setFilterSaleDateEnd('');
  };

  const hasActiveFilters = filterSaleDateStart || filterSaleDateEnd;

  const handleExportToExcel = () => {
    if (consultantSales.length === 0) {
      alert("Não há vendas para exportar.");
      return;
    }

    const dataToExport = consultantSales.map(lead => ({
      'Cliente': lead.name,
      'Data da Venda': lead.sale_date ? new Date(lead.sale_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A',
      'Grupo': lead.sold_group || 'N/A',
      'Cota': lead.sold_quota || 'N/A',
      'Valor Vendido': lead.sold_credit_value || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio_Vendas");

    XLSX.writeFile(workbook, `Relatorio_Vendas_Consultor_${user?.name.replace(/\s/g, '_') || 'Desconhecido'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatório de Vendas</h1>
          <p className="text-gray-500 dark:text-gray-400">Acompanhe suas vendas e o valor total faturado.</p>
        </div>
        <button onClick={handleExportToExcel} className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition font-medium w-full sm:w-auto">
          <Download className="w-5 h-5" />
          <span>Exportar para Excel</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 mb-6">
        <div className="flex items-center justify-between flex-col sm:flex-row">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase tracking-wide"><Filter className="w-4 h-4 mr-2" />Filtrar Vendas</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs flex items-center text-red-500 hover:text-red-700 transition mt-2 sm:mt-0">
              <RotateCcw className="w-3 h-3 mr-1" />Limpar Filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filterSaleDateStart" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data da Venda de</label>
            <input
              type="date"
              id="filterSaleDateStart"
              value={filterSaleDateStart}
              onChange={(e) => setFilterSaleDateStart(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="filterSaleDateEnd" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data da Venda até</label>
            <input
              type="date"
              id="filterSaleDateEnd"
              value={filterSaleDateEnd}
              onChange={(e) => setFilterSaleDateEnd(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-center gap-4 mb-8">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex-shrink-0">
          <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex flex-col justify-center text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Valor Total Vendido</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(totalSoldValue)}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-brand-500" />Detalhes das Vendas</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Data da Venda</th>
                <th className="px-4 py-3">Grupo</th>
                <th className="px-4 py-3">Cota</th>
                <th className="px-4 py-3 text-right">Valor Vendido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {consultantSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Nenhuma venda encontrada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                consultantSales.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{lead.name}</td>
                    <td className="px-4 py-3">{lead.sale_date ? new Date(lead.sale_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</td>
                    <td className="px-4 py-3">{lead.sold_group || 'N/A'}</td>
                    <td className="px-4 py-3">{lead.sold_quota || 'N/A'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(lead.sold_credit_value || 0)}</td>
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

export default ConsultorSalesReports;