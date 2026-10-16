import React from 'react';
import { History, Check, FileText } from 'lucide-react';
import { Laborer, AttendanceStatus } from '../../types';
import { CategoryBadge } from '../common/Badge';
import { formatCurrency } from '../../lib/wageCalculator';

interface LaborerAttendanceCardProps {
  laborer: Laborer;
  status?: AttendanceStatus;
  notes?: string;
  isSavedInDb: boolean;
  hasAuditLogs: boolean;
  onStatusChange: (status: AttendanceStatus) => void;
  onOpenNotes: () => void;
  onOpenAudit: () => void;
}

export const LaborerAttendanceCard: React.FC<LaborerAttendanceCardProps> = ({
  laborer,
  status,
  notes,
  isSavedInDb,
  hasAuditLogs,
  onStatusChange,
  onOpenNotes,
  onOpenAudit,
}) => {
  const isUnmarked = !status;

  return (
    <div
      className={`bg-white rounded-xl p-3.5 border transition-all shadow-xs ${
        isUnmarked
          ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/20'
          : 'border-slate-200'
      }`}
    >
      {/* Top Header: Laborer Name, Category, Wage, History Button */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
              {laborer.name}
            </h4>
            <CategoryBadge category={laborer.category} size="sm" />
          </div>

          <p className="text-xs text-slate-500 mt-0.5">
            {laborer.phone || 'No phone'} &bull; Daily Wage:{' '}
            <strong className="text-slate-800">{formatCurrency(laborer.daily_wage)}</strong>
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Notes trigger */}
          <button
            type="button"
            onClick={onOpenNotes}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              notes
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-700'
            }`}
            title={notes ? `Note: ${notes}` : 'Add note'}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* Audit History trigger if available */}
          {hasAuditLogs && (
            <button
              type="button"
              onClick={onOpenAudit}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
              title="View attendance audit trail"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Unmarked Indicator Tag */}
          {isUnmarked && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded">
              Unmarked
            </span>
          )}
        </div>
      </div>

      {notes && (
        <div className="mb-2.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <span className="truncate italic">Note: {notes}</span>
          <button onClick={onOpenNotes} className="text-[10px] underline ml-2 font-semibold">
            Edit
          </button>
        </div>
      )}

      {/* 4 Large Mobile-First Touch Buttons */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 select-none">
        {/* PRESENT BUTTON */}
        <button
          type="button"
          onClick={() => onStatusChange('present')}
          className={`h-12 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center transition-all active:scale-95 border ${
            status === 'present'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/30'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200'
          }`}
        >
          <span className="flex items-center gap-1">
            {status === 'present' && <Check className="w-3.5 h-3.5" />}
            <span>Present</span>
          </span>
          <span className={`text-[10px] font-medium leading-none mt-0.5 ${status === 'present' ? 'text-emerald-100' : 'text-slate-400'}`}>
            Full Day
          </span>
        </button>

        {/* HALF DAY BUTTON */}
        <button
          type="button"
          onClick={() => onStatusChange('half_day')}
          className={`h-12 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center transition-all active:scale-95 border ${
            status === 'half_day'
              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm ring-2 ring-amber-400/30'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-200'
          }`}
        >
          <span className="flex items-center gap-1">
            {status === 'half_day' && <Check className="w-3.5 h-3.5" />}
            <span>Half Day</span>
          </span>
          <span className={`text-[10px] font-medium leading-none mt-0.5 ${status === 'half_day' ? 'text-amber-950' : 'text-slate-400'}`}>
            0.5 Wage
          </span>
        </button>

        {/* ABSENT BUTTON */}
        <button
          type="button"
          onClick={() => onStatusChange('absent')}
          className={`h-12 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center transition-all active:scale-95 border ${
            status === 'absent'
              ? 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-500/30'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200'
          }`}
        >
          <span className="flex items-center gap-1">
            {status === 'absent' && <Check className="w-3.5 h-3.5" />}
            <span>Absent</span>
          </span>
          <span className={`text-[10px] font-medium leading-none mt-0.5 ${status === 'absent' ? 'text-rose-100' : 'text-slate-400'}`}>
            0 Wage
          </span>
        </button>

        {/* LEAVE BUTTON */}
        <button
          type="button"
          onClick={() => onStatusChange('leave')}
          className={`h-12 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center transition-all active:scale-95 border ${
            status === 'leave'
              ? 'bg-slate-700 text-white border-slate-800 shadow-sm ring-2 ring-slate-600/30'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span className="flex items-center gap-1">
            {status === 'leave' && <Check className="w-3.5 h-3.5" />}
            <span>Leave</span>
          </span>
          <span className={`text-[10px] font-medium leading-none mt-0.5 ${status === 'leave' ? 'text-slate-300' : 'text-slate-400'}`}>
            Approved
          </span>
        </button>
      </div>
    </div>
  );
};
