import React from 'react';
import { AttendanceStatus, LaborCategory } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  const variantClasses = {
    primary: 'bg-slate-900 text-white',
    secondary: 'bg-slate-200 text-slate-800',
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-rose-600 text-white',
    info: 'bg-sky-600 text-white',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1 rounded-md tracking-wide ${sizeClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status?: AttendanceStatus; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  if (!status) {
    return <Badge variant="neutral" size={size}>Unmarked</Badge>;
  }

  switch (status) {
    case 'present':
      return <Badge variant="success" size={size}>Present</Badge>;
    case 'half_day':
      return <Badge variant="warning" size={size}>Half Day</Badge>;
    case 'absent':
      return <Badge variant="danger" size={size}>Absent</Badge>;
    case 'leave':
      return <Badge variant="info" size={size}>Leave</Badge>;
  }
};

export const CategoryBadge: React.FC<{ category: LaborCategory; size?: 'sm' | 'md' }> = ({ category, size = 'md' }) => {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border ${
        category === 'Mason'
          ? 'bg-amber-50 text-amber-900 border-amber-200'
          : category === 'Helper'
          ? 'bg-slate-100 text-slate-800 border-slate-200'
          : category === 'Electrician'
          ? 'bg-blue-50 text-blue-900 border-blue-200'
          : category === 'Plumber'
          ? 'bg-cyan-50 text-cyan-900 border-cyan-200'
          : category === 'Carpenter'
          ? 'bg-orange-50 text-orange-900 border-orange-200'
          : category === 'Painter'
          ? 'bg-purple-50 text-purple-900 border-purple-200'
          : 'bg-slate-50 text-slate-700 border-slate-300'
      } ${size === 'sm' ? 'text-[11px] leading-tight' : ''}`}
    >
      {category}
    </span>
  );
};
