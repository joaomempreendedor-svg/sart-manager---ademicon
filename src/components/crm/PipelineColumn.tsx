import React from 'react';
import { LeadCard } from './LeadCard';

export const PipelineColumn = ({ stage, leads }: { stage: any, leads: any[] }) => {
  return (
    <div className="w-72 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 flex-shrink-0">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm flex items-center">
          {stage.name}
          <span className="ml-2 text-xs bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-bold">
            {leads.length}
          </span>
        </h3>
      </div>
      <div className="p-2 space-y-2 h-full overflow-y-auto">
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
};