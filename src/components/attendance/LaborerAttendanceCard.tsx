import React, { useState } from 'react';
import { History, Check, FileText, Edit2, X, IndianRupee } from 'lucide-react';
import { Laborer, AttendanceStatus } from '../../types';
import { CategoryBadge } from '../common/Badge';
import { formatCurrency, calculateWageForStatus } from '../../lib/wageCalculator';

interface LaborerAttendanceCardProps {
  laborer: Laborer;
  status?: AttendanceStatus;
  notes?: string;
  wageAmount?: number;
  isSavedInDb: boolean;
  hasAuditLogs: boolean;
  onStatusChange: (status: AttendanceStatus) => void;
  onClearAttendance: () => void;
  onWageOverride: (newWage: number) => void;
  onEditLaborer: () => void;
  onOpenNotes: () => void;
  onOpenAudit: () => void;
}

export const LaborerAttendanceCard: React.FC<LaborerAttendanceCardProps> = ({
  laborer,
  status,
  notes,
  wageAmount,
  isSavedInDb,
  hasAuditLogs,
  onStatusChange,
  onClearAttendance,
  onWageOverride,
  onEditLaborer,
  onOpenNotes,
  onOpenAudit,
}) => {
  const isUnmarked = !status;
  const [isEditingDayWage, setIsEditingDayWage] = useState(false);
  const [wageInput, setWageInput] = useState('');

  // Default calculated wage based on status or custom override
  const defaultWage = status ? calculateWageForStatus(laborer.daily_wage, status) : 0;
  const currentPayableWage = wageAmount !== undefined ? wageAmount : defaultWage;

  const handleStartEditWage = () => {
    setWageInput(String(currentPayableWage));
    setIsEditingDayWage(true);
  };

  const handleSaveDayWage = () => {
    const parsed = parseFloat(wageInput);
    if (!isNaN(parsed) && parsed >= 0) {
      onWageOverride(parsed);
    }
    setIsEditingDayWage(false);
  };

  return (
    <div
      className={`bg-white rounded-xl p-3.5 border transition-all shadow-xs ${
        isUnmarked
          ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/20'
          : 'border-slate-200'
      }`}
    >
      {/* Top Header: Laborer Name, Category, Base Wage, History, Clear & Quick Edit */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
              {laborer.name}
            </h4>
            <CategoryBadge category={laborer.category} size="sm" />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
            <span>{laborer.phone || 'No phone'}</span>
            <span>&bull;</span>
            <span>
              Base:{' '}
              <strong className="text-slate-800">{formatCurrency(laborer.daily_wage)}</strong>/day
            </span>
            <button
              type="button"
              onClick={onEditLaborer}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline flex items-center gap-0.5"
              title="Edit laborer details or base wage"
            >
              <Edit2 className="w-2.5 h-2.5" />
              <span>Edit</span>
            </button>
          </div>
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

          {/* Audit History trigger */}
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

          {/* Clear / Unmark button if marked */}
          {status && (
            <button
              type="button"
              onClick={onClearAttendance}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
              title="Clear / Unmark attendance for today"
            >
              <X className="w-3.5 h-3.5" />
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

      {/* Note banner if added */}
      {notes && (
        <div className="mb-2 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <span className="truncate italic">Note: {notes}</span>
          <button onClick={onOpenNotes} className="text-[10px] underline ml-2 font-semibold">
            Edit Note
          </button>
        </div>
      )}

      {/* Daily Payable Wage Adjustment Bar (when marked) */}
      {status && (
        <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-600 flex items-center gap-1 font-medium">
            <IndianRupee className="w-3.5 h-3.5 text-slate-500" />
            <span>Payable for Day:</span>
          </span>

          {isEditingDayWage ? (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold">₹</span>
              <input
                type="number"
                value={wageInput}
                onChange={(e) => setWageInput(e.target.value)}
                className="w-20 px-2 py-0.5 text-xs font-bold bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveDayWage}
                className="px-2 py-0.5 bg-slate-900 text-white rounded text-xs font-bold"
              >
                Set
              </button>
              <button
                type="button"
                onClick={() => setIsEditingDayWage(false)}
                className="text-xs text-slate-400 hover:text-slate-600 px-1"
              >
                &times;
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900">
                {formatCurrency(currentPayableWage)}
              </span>
              {currentPayableWage !== defaultWage && (
                <span className="text-[10px] text-amber-700 bg-amber-100 px-1 rounded font-semibold">
                  Custom
                </span>
              )}
              <button
                type="button"
                onClick={handleStartEditWage}
                className="text-[11px] text-sky-700 hover:text-sky-900 underline font-semibold ml-1"
                title="Override payable wage for this day"
              >
                Adjust
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4 Large Touch Buttons */}
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
