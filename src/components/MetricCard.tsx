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
  const isCurrencyString = typeof value === 'string' && value.trim().startsWith('R$');
  let currencyPrefix: string | null = null;
  let mainValue: string | number = value;

  if (isCurrencyString) {
    const normalized = (value as string).trim().replace(/\s+/, ' ');
    const [prefix, ...rest] = normalized.split(' ');
    currencyPrefix = prefix;
    mainValue = rest.join(' ') || '';
  }

  const CardContent = (
    <>
      <div className="flex justify-between items-start">
        <div className="space-y-1 pr-24 md:pr-28">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{title}</p>
          <h3 className="leading-tight break-words">
            <span className="inline-flex items-baseline">
              {currencyPrefix && (
                <span className="text-xs md:text-sm font-extrabold opacity-80 mr-1 shrink-0">
                  {currencyPrefix}
                </span>
              )}
              <span className="text-4xl md:text-5xl font-black tracking-tight">
                {mainValue}
              </span>
            </span>
          </h3>
          {subValue && <p className="text-xs font-medium opacity-60 break-words">{subValue}</p>}
        </div>
        <div className="absolute -right-2 -bottom-2 opacity-10">
          <Icon size={80} strokeWidth={3} />
        </div>
      </div>
    </>
  );
  const baseClasses = `relative overflow-hidden p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md min-h-32 h-full flex flex-col ${colorClass}`;

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