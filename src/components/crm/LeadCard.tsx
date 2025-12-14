import React from 'react';
import { DollarSign, User } from 'lucide-react';

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const LeadCard = ({ lead }: { lead: any }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <h4 className="font-bold text-gray-900 dark:text-white text-sm">{lead.name}</h4>
      <div className="mt-2 flex flex-col space-y-1 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center">
          <DollarSign className="w-3 h-3 mr-1.5" />
          <span>{formatCurrency(lead.potential_value)}</span>
        </div>
        {lead.assignee_id && (
            <div className="flex items-center">
                <User className="w-3 h-3 mr-1.5" />
                <span>{lead.assignee_id}</span>
            </div>
        )}
      </div>
    </div>
  );
};