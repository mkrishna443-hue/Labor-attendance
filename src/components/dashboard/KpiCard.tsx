import React from 'react';

interface KpiCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon: React.FC<{ className?: string }>;
  colorVariant?: 'navy' | 'emerald' | 'amber' | 'rose' | 'sky';
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  colorVariant = 'navy',
  onClick,
}) => {
  const iconColor = {
    navy: 'text-slate-700 bg-slate-100',
    emerald: 'text-emerald-700 bg-emerald-50',
    amber: 'text-amber-700 bg-amber-50',
    rose: 'text-rose-700 bg-rose-50',
    sky: 'text-sky-700 bg-sky-50',
  }[colorVariant];

  const valueColor = {
    navy: 'text-slate-900',
    emerald: 'text-emerald-700',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    sky: 'text-sky-700',
  }[colorVariant];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer active:scale-98 hover:border-slate-300' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-1">
        <span className={`text-2xl font-bold tracking-tight ${valueColor}`}>{value}</span>
        {subtext && <span className="text-[11px] text-slate-400 font-medium">{subtext}</span>}
      </div>
    </div>
  );
};
