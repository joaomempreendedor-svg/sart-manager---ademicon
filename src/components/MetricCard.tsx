import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  subValue?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, colorClass, subValue, onClick }) => {
  const CardContent = (
    <>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{title}</p>
          <h3 className="text-5xl font-black">{value}</h3>
          {subValue && <p className="text-xs font-medium opacity-60">{subValue}</p>}
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Icon size={100} strokeWidth={3} />
        </div>
      </div>
    </>
  );
  const baseClasses = `relative overflow-hidden p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md min-h-40 h-full flex flex-col ${colorClass}`;

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClasses} text-left w-full`}>
        {CardContent}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {CardContent}
    </div>
  );
};