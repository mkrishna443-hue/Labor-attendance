import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Users,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  AlertCircle,
  Save,
  MessageSquare,
} from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';
import { Laborer, AttendanceStatus, LABOR_CATEGORIES, LaborCategory } from '../../types';
import { LaborerAttendanceCard } from './LaborerAttendanceCard';
import { AttendanceAuditModal } from './AttendanceAuditModal';
import { Modal } from '../common/Modal';
import { supabase } from '../../lib/supabase';
import { enqueueAttendance } from '../../lib/offlineSync';
import { calculateWageForStatus, formatDate, getTodayDateString } from '../../lib/wageCalculator';

interface AttendanceTabProps {
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, description?: string) => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ onShowToast }) => {
  const {
    currentSite,
    laborers,
    attendanceMap,
    selectedDate,
    setSelectedDate,
    refreshData,
    isOnline,
  } = useSite();
  const { user } = useAuth();

  // Local draft state for attendance statuses and notes before save
  // Key: laborer_id -> status
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterUnmarkedOnly, setFilterUnmarkedOnly] = useState(false);

  // Modals
  const [auditLaborer, setAuditLaborer] = useState<Laborer | null>(null);
  const [notesLaborer, setNotesLaborer] = useState<Laborer | null>(null);
  const [activeNoteText, setActiveNoteText] = useState('');

  // Synchronize draft state when attendanceMap or selectedDate changes
  React.useEffect(() => {
    const initialStatuses: Record<string, AttendanceStatus> = {};
    const initialNotes: Record<string, string> = {};

    laborers.forEach((lab) => {
      const existing = attendanceMap[lab.id];
      if (existing) {
        initialStatuses[lab.id] = existing.status;
        if (existing.notes) {
          initialNotes[lab.id] = existing.notes;
        }
      }
    });

    setDraftStatuses(initialStatuses);
    setDraftNotes(initialNotes);
    setHasUnsavedChanges(false);
  }, [attendanceMap, selectedDate, laborers]);

  // Date Navigation
  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleStatusChange = (laborerId: string, status: AttendanceStatus) => {
    setDraftStatuses((prev) => {
      // Toggle off if tapping same status
      if (prev[laborerId] === status) {
        const next = { ...prev };
        delete next[laborerId];
        return next;
      }
      return { ...prev, [laborerId]: status };
    });
    setHasUnsavedChanges(true);
  };

  // Quick Action: Mark All Present
  const handleMarkAllPresent = () => {
    const updated = { ...draftStatuses };
    laborers.forEach((lab) => {
      // If not already marked, mark as present
      if (!updated[lab.id]) {
        updated[lab.id] = 'present';
      }
    });
    setDraftStatuses(updated);
    setHasUnsavedChanges(true);
    onShowToast('info', 'All unmarked laborers marked Present', 'Tap "Save Attendance" below to commit.');
  };

  // Quick Action: Reset drafts
  const handleResetDrafts = () => {
    if (confirm('Discard unsaved attendance changes for this date?')) {
      const initialStatuses: Record<string, AttendanceStatus> = {};
      laborers.forEach((lab) => {
        const existing = attendanceMap[lab.id];
        if (existing) {
          initialStatuses[lab.id] = existing.status;
        }
      });
      setDraftStatuses(initialStatuses);
      setHasUnsavedChanges(false);
    }
  };

  // Save Attendance (Bulk Upsert)
  const handleSaveAttendance = async () => {
    if (!currentSite || laborers.length === 0 || isSaving) return;

    setIsSaving(true);

    try {
      // Build array of records to upsert
      const recordsToSave = Object.entries(draftStatuses).map(([laborerId, status]) => {
        const laborer = laborers.find((l) => l.id === laborerId);
        const wage = laborer ? calculateWageForStatus(laborer.daily_wage, status) : 0;
        return {
          site_id: currentSite.id,
          laborer_id: laborerId,
          attendance_date: selectedDate,
          status,
          wage_amount: wage,
          notes: draftNotes[laborerId] || '',
          recorded_by: user?.id,
        };
      });

      if (recordsToSave.length === 0) {
        setIsSaving(false);
        onShowToast('warning', 'No attendance marked', 'Mark at least one laborer before saving.');
        return;
      }

      if (!isOnline) {
        // Enqueue offline
        enqueueAttendance(recordsToSave);
        setIsSaving(false);
        setHasUnsavedChanges(false);
        onShowToast(
          'warning',
          'Saved to Offline Queue',
          `${recordsToSave.length} record(s) queued. Will sync automatically when reconnected.`
        );
        refreshData();
        return;
      }

      // Online: Upsert to Supabase
      const { error } = await supabase
        .from('attendance')
        .upsert(recordsToSave, {
          onConflict: 'laborer_id,attendance_date',
        });

      if (error) {
        throw error;
      }

      setIsSaving(false);
      setHasUnsavedChanges(false);
      onShowToast('success', 'Attendance Saved Successfully', `Recorded attendance for ${recordsToSave.length} laborers.`);
      await refreshData();
    } catch (err: unknown) {
      setIsSaving(false);
      console.warn('Network or DB error saving attendance, falling back to local queue:', err);
      // Fallback: save to offline queue so work is never lost!
      const fallbackRecords = Object.entries(draftStatuses).map(([laborerId, status]) => {
        const laborer = laborers.find((l) => l.id === laborerId);
        const wage = laborer ? calculateWageForStatus(laborer.daily_wage, status) : 0;
        return {
          site_id: currentSite.id,
          laborer_id: laborerId,
          attendance_date: selectedDate,
          status,
          wage_amount: wage,
          notes: draftNotes[laborerId] || '',
          recorded_by: user?.id,
        };
      });

      enqueueAttendance(fallbackRecords);
      setHasUnsavedChanges(false);
      onShowToast(
        'warning',
        'Saved to Local Queue',
        'Network interrupted. Records safely saved locally and will sync when connection stabilizes.'
      );
    }
  };

  // Filtered Laborers List
  const filteredLaborers = useMemo(() => {
    return laborers.filter((l) => {
      // Search
      const matchesSearch =
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.phone && l.phone.includes(searchQuery));
      if (!matchesSearch) return false;

      // Category filter
      if (selectedCategory !== 'all' && l.category !== selectedCategory) {
        return false;
      }

      // Unmarked only filter
      if (filterUnmarkedOnly) {
        return !draftStatuses[l.id];
      }

      return true;
    });
  }, [laborers, searchQuery, selectedCategory, filterUnmarkedOnly, draftStatuses]);

  const markedCount = Object.keys(draftStatuses).length;
  const unmarkedCount = Math.max(0, laborers.length - markedCount);

  // Note Modal Handlers
  const handleOpenNotes = (laborer: Laborer) => {
    setNotesLaborer(laborer);
    setActiveNoteText(draftNotes[laborer.id] || '');
  };

  const handleSaveNote = () => {
    if (notesLaborer) {
      setDraftNotes((prev) => ({
        ...prev,
        [notesLaborer.id]: activeNoteText.trim(),
      }));
      setHasUnsavedChanges(true);
    }
    setNotesLaborer(null);
  };

  return (
    <div className="space-y-3 pb-32 pt-2">
      {/* Date Header & Stepper Card */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => changeDateByDays(-1)}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          aria-label="Previous Day"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <label className="relative cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
            <Calendar className="w-4 h-4 text-slate-700" />
            <span className="font-bold text-sm text-slate-900">{formatDate(selectedDate)}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>

          {selectedDate !== getTodayDateString() && (
            <button
              type="button"
              onClick={() => setSelectedDate(getTodayDateString())}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => changeDateByDays(1)}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          aria-label="Next Day"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Bulk Action Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between gap-2 shadow-xs">
        <div className="text-xs">
          <span className="text-slate-400">Marked: </span>
          <strong className="text-white">
            {markedCount} / {laborers.length}
          </strong>
          {unmarkedCount > 0 ? (
            <span className="text-amber-400 font-semibold ml-1.5">({unmarkedCount} unmarked)</span>
          ) : (
            <span className="text-emerald-400 font-semibold ml-1.5">(Complete)</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleResetDrafts}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded"
              title="Reset unsaved changes"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark All Present</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search laborer name or phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills & Unmarked Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterUnmarkedOnly(!filterUnmarkedOnly)}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors border ${
              filterUnmarkedOnly
                ? 'bg-amber-500 text-slate-950 border-amber-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            ⚠️ Unmarked ({unmarkedCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors border ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Trades ({laborers.length})
          </button>

          {LABOR_CATEGORIES.map((cat) => {
            const count = laborers.filter((l) => l.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors border ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Laborer Cards List */}
      <div className="space-y-2.5">
        {filteredLaborers.map((laborer) => {
          const currentStatus = draftStatuses[laborer.id];
          const currentNote = draftNotes[laborer.id];
          const isSavedInDb = Boolean(attendanceMap[laborer.id]);

          return (
            <LaborerAttendanceCard
              key={laborer.id}
              laborer={laborer}
              status={currentStatus}
              notes={currentNote}
              isSavedInDb={isSavedInDb}
              hasAuditLogs={isSavedInDb}
              onStatusChange={(status) => handleStatusChange(laborer.id, status)}
              onOpenNotes={() => handleOpenNotes(laborer)}
              onOpenAudit={() => setAuditLaborer(laborer)}
            />
          );
        })}

        {filteredLaborers.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center text-slate-400 text-xs border border-slate-200">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">No laborers found</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Try adjusting your search query or category filters.
            </p>
          </div>
        )}
      </div>

      {/* Fixed Bottom Save Action Bar */}
      {laborers.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {markedCount} of {laborers.length} laborers marked
              </p>
              <p className="text-[11px] text-slate-500">
                {hasUnsavedChanges ? '⚠️ Unsaved changes' : 'All marks saved'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={isSaving || markedCount === 0}
              className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all ${
                hasUnsavedChanges
                  ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 ring-2 ring-amber-400/50'
                  : 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      <Modal
        isOpen={Boolean(notesLaborer)}
        onClose={() => setNotesLaborer(null)}
        title="Attendance Note / Remark"
        subtitle={notesLaborer ? `${notesLaborer.name} &bull; ${formatDate(selectedDate)}` : ''}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNotesLaborer(null)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              Save Note
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <textarea
            value={activeNoteText}
            onChange={(e) => setActiveNoteText(e.target.value)}
            placeholder="e.g. Left early at 2 PM, Site transfer, Overtime approved..."
            rows={4}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white resize-none"
            autoFocus
          />
        </div>
      </Modal>

      {/* Audit Modal */}
      <AttendanceAuditModal
        isOpen={Boolean(auditLaborer)}
        onClose={() => setAuditLaborer(null)}
        laborer={auditLaborer}
        attendanceDate={selectedDate}
      />
    </div>
  );
};
