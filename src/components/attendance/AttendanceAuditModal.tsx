import React, { useEffect, useState } from 'react';
import { History, Shield, Clock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { supabase } from '../../lib/supabase';
import { Laborer, AttendanceAuditLog } from '../../types';
import { formatDate, formatCurrency } from '../../lib/wageCalculator';
import { StatusBadge } from '../common/Badge';

interface AttendanceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  laborer: Laborer | null;
  attendanceDate: string;
}

export const AttendanceAuditModal: React.FC<AttendanceAuditModalProps> = ({
  isOpen,
  onClose,
  laborer,
  attendanceDate,
}) => {
  const [logs, setLogs] = useState<AttendanceAuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !laborer) return;

    setLoading(true);
    supabase
      .from('attendance_audit_logs')
      .select('*, profiles:changed_by(name, phone)')
      .eq('laborer_id', laborer.id)
      .eq('attendance_date', attendanceDate)
      .order('changed_at', { ascending: false })
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          console.warn('Error fetching audit logs:', error.message);
          return;
        }

        const formatted = ((data || []) as (AttendanceAuditLog & { profiles?: { name: string } })[]).map((d) => ({
          ...d,
          changer_name: d.profiles?.name || 'Supervisor',
        }));
        setLogs(formatted);
      });
  }, [isOpen, laborer, attendanceDate]);

  if (!laborer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance Audit Trail"
      subtitle={`${laborer.name} &bull; ${formatDate(attendanceDate)}`}
    >
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-500">
            <Clock className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
            <p>Loading historical audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p>No corrections logged for this date.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Any updates to previously saved records will be automatically logged here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="py-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-slate-600" />
                    {log.changer_name || 'Authorized Supervisor'}
                  </span>
                  <span className="text-[11px]">
                    {new Date(log.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull;{' '}
                    {formatDate(log.changed_at.split('T')[0])}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-slate-500">Status changed:</span>
                  <StatusBadge status={log.old_status} size="sm" />
                  <span className="text-slate-400">&rarr;</span>
                  <StatusBadge status={log.new_status} size="sm" />
                </div>

                {log.old_wage_amount !== undefined && log.new_wage_amount !== undefined && (
                  <div className="text-[11px] text-slate-600">
                    Wage adjusted: {formatCurrency(log.old_wage_amount)} &rarr; {formatCurrency(log.new_wage_amount)}
                  </div>
                )}

                {log.reason && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 italic">
                    Reason: {log.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
