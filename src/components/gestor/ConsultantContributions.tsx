import React from 'react';

type Contribution = {
  consultantId: string | null;
  name: string;
  amount: number;
  percent: number;
};

interface ConsultantContributionsProps {
  contributions: Contribution[];
  formatCurrency: (value: number) => string;
}

export const ConsultantContributions: React.FC<ConsultantContributionsProps> = ({ contributions, formatCurrency }) => {
  if (!contributions || contributions.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        Nenhum consultor com produção no período selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contributions.map((c) => (
        <div key={c.consultantId || c.name} className="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {formatCurrency(c.amount)} • {c.percent.toFixed(1)}%
            </div>
          </div>
          <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-2 bg-brand-600 rounded-full transition-all"
              style={{ width: `${Math.min(100, c.percent)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConsultantContributions;