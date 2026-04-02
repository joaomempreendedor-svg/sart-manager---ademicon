import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  subValue?: string;
  onClick?: () => void;
  size?: 'default' | 'compact';
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, colorClass, subValue, onClick, size = 'default' }) => {
  const isCurrencyString = typeof value === 'string' && value.trim().startsWith('R$');
  let currencyPrefix: string | null = null;
  let mainValue: string | number = value;

  if (isCurrencyString) {
    const normalized = (value as string).trim().replace(/\s+/, ' ');
    const [prefix, ...rest] = normalized.split(' ');
    currencyPrefix = prefix;
    mainValue = rest.join(' ') || '';
  }

  const prefixClass = size === 'compact'
    ? 'text-[9px] sm:text-[11px] md:text-xs'
    : 'text-[10px] sm:text-xs md:text-sm';
  const valueClass = size === 'compact'
    ? 'text-[1.35rem] sm:text-[1.65rem] md:text-[1.95rem]'
    : 'text-[1.45rem] sm:text-[1.8rem] md:text-[2.15rem]';
  const padRightClass = size === 'compact'
    ? 'pr-24 md:pr-28'
    : 'pr-28 md:pr-32';

  const CardContent = (
    <>
      <div className="flex justify-between items-start">
        <div className={`space-y-1 ${padRightClass}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{title}</p>
          <h3 className="leading-tight break-words">
            <span className="inline-flex items-baseline">
              {currencyPrefix && (
                <span className={`${prefixClass} font-extrabold opacity-80 mr-1 shrink-0`}>
                  {currencyPrefix}
                </span>
              )}
              <span className={`${valueClass} font-black tracking-tight leading-snug whitespace-normal break-words`}>
                {mainValue}
              </span>
            </span>
          </h3>
          {subValue && <p className="text-xs font-medium opacity-60 break-words">{subValue}</p>}
        </div>
        <div className="absolute -right-1 -bottom-1 opacity-10">
          <Icon size={70} strokeWidth={3} />
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