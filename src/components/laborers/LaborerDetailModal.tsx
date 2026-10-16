import React, { useEffect, useState } from 'react';
import { Calendar, Edit3, Clock, Trash2, Check, IndianRupee, Power } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Laborer, AttendanceRecord } from '../../types';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/wageCalculator';
import { CategoryBadge, StatusBadge } from '../common/Badge';
import { useSite } from '../../contexts/SiteContext';

interface LaborerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  laborer: Laborer | null;
  onEdit: (laborer: Laborer) => void;
}

export const LaborerDetailModal: React.FC<LaborerDetailModalProps> = ({
  isOpen,
  onClose,
  laborer,
  onEdit,
}) => {
  const { deleteLaborer, updateLaborerWage, refreshData } = useSite();

  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditingWage, setIsEditingWage] = useState(false);
  const [newWageInput, setNewWageInput] = useState('');
  const [isUpdatingWage, setIsUpdatingWage] = useState(false);

  useEffect(() => {
    if (!isOpen || !laborer) {
      setIsEditingWage(false);
      return;
    }

    setNewWageInput(String(laborer.daily_wage || 500));
    setLoading(true);
    supabase
      .from('attendance')
      .select('*')
      .eq('laborer_id', laborer.id)
      .order('attendance_date', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          console.warn('Error fetching attendance history:', error.message);
          return;
        }
        setHistory((data || []) as AttendanceRecord[]);
      });
  }, [isOpen, laborer]);

  if (!laborer) return null;

  // Calculate cumulative stats from history
  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let totalWagesEarned = 0;

  history.forEach((rec) => {
    if (rec.status === 'present') presentDays++;
    else if (rec.status === 'half_day') halfDays++;
    else if (rec.status === 'absent') absentDays++;
    else if (rec.status === 'leave') leaveDays++;

    totalWagesEarned += Number(rec.wage_amount) || 0;
  });

  const handleSaveWage = async () => {
    const wageVal = parseFloat(newWageInput);
    if (isNaN(wageVal) || wageVal < 0) return;

    setIsUpdatingWage(true);
    await updateLaborerWage(laborer.id, wageVal);
    setIsUpdatingWage(false);
    setIsEditingWage(false);
    await refreshData();
  };

  const handleToggleActive = async () => {
    const updatedStatus = !laborer.is_active;
    await supabase.from('laborers').update({ is_active: updatedStatus }).eq('id', laborer.id);
    await refreshData();
    onClose();
  };

  const handleDelete = async () => {
    const confirmed = confirm(
      `Permanently delete "${laborer.name}"?\nAll past attendance and records for this laborer will be removed.`
    );
    if (!confirmed) return;

    await deleteLaborer(laborer.id);
    await refreshData();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={laborer.name}
      subtitle={`Trade: ${laborer.category}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Worker</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleActive}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
                laborer.is_active
                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{laborer.is_active ? 'Make Inactive' : 'Activate Worker'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(laborer);
              }}
              className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-800"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Profile Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Contact Number:</span>
            <span className="text-xs font-semibold text-slate-800">{laborer.phone || 'Not provided'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Trade:</span>
            <CategoryBadge category={laborer.category} size="sm" />
          </div>

          {/* Daily Wage with in-place editor */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
              Daily Base Wage:
            </span>

            {isEditingWage ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={newWageInput}
                  onChange={(e) => setNewWageInput(e.target.value)}
                  className="w-20 px-2 py-1 text-xs font-bold bg-white border border-slate-300 rounded"
                  autoFocus
                />
                <button
                  onClick={handleSaveWage}
                  disabled={isUpdatingWage}
                  className="px-2 py-1 bg-slate-900 text-white rounded text-xs font-bold"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setIsEditingWage(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 px-1"
                >
                  &times;
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{formatCurrency(laborer.daily_wage)}/day</span>
                <button
                  type="button"
                  onClick={() => setIsEditingWage(true)}
                  className="text-[11px] font-semibold text-sky-700 hover:underline"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Status:</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${laborer.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
              {laborer.is_active ? 'Active Worker' : 'Inactive Worker'}
            </span>
          </div>

          {laborer.notes && (
            <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
              <span className="font-semibold text-slate-700 block">Notes:</span>
              <p className="mt-0.5 italic">{laborer.notes}</p>
            </div>
          )}
        </div>

        {/* 30-Day Cumulative Summary Grid */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Recent Attendance Summary (Last 30 Records)
          </h4>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Days Present</span>
              <span className="text-lg font-bold text-emerald-700">
                {presentDays} <span className="text-xs text-slate-400 font-normal">full + {halfDays} half</span>
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Total Wages Earned</span>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(totalWagesEarned)}</span>
            </div>
          </div>
        </div>

        {/* Attendance History Timeline */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Attendance Log
          </h4>
          {loading ? (
            <div className="py-6 text-center text-xs text-slate-400">
              <Clock className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-400" />
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No attendance logged yet for this worker.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
              {history.map((record) => (
                <div key={record.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-800">{formatDate(record.attendance_date)}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700">{formatCurrency(record.wage_amount)}</span>
                    <StatusBadge status={record.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
