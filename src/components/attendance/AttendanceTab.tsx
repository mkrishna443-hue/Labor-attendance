import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Users,
  Search,
  RotateCcw,
  RefreshCw,
  Save,
  Building2,
  UserPlus,
  Check,
} from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';
import { Laborer, AttendanceStatus, LABOR_CATEGORIES } from '../../types';
import { LaborerAttendanceCard } from './LaborerAttendanceCard';
import { AttendanceAuditModal } from './AttendanceAuditModal';
import { LaborerFormModal } from '../laborers/LaborerFormModal';
import { Modal } from '../common/Modal';
import { supabase } from '../../lib/supabase';
import { enqueueAttendance } from '../../lib/offlineSync';
import { calculateWageForStatus, formatDate, getTodayDateString, formatCurrency } from '../../lib/wageCalculator';

interface AttendanceTabProps {
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, description?: string) => void;
  onOpenSiteManagement?: () => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ onShowToast, onOpenSiteManagement }) => {
  const {
    currentSite,
    laborers,
    attendanceMap,
    selectedDate,
    setSelectedDate,
    refreshData,
    deleteAttendanceRecord,
    isOnline,
  } = useSite();
  const { user } = useAuth();

  // Local draft state for attendance statuses, notes, and custom daily wages
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [draftWages, setDraftWages] = useState<Record<string, number>>({});
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
  const [editingLaborer, setEditingLaborer] = useState<Laborer | null>(null);
  const [isAddLaborerOpen, setIsAddLaborerOpen] = useState(false);

  // Synchronize when date changes
  useEffect(() => {
    const initialStatuses: Record<string, AttendanceStatus> = {};
    const initialNotes: Record<string, string> = {};
    const initialWages: Record<string, number> = {};

    laborers.forEach((lab) => {
      const existing = attendanceMap[lab.id];
      if (existing) {
        initialStatuses[lab.id] = existing.status;
        initialWages[lab.id] = Number(existing.wage_amount) || calculateWageForStatus(lab.daily_wage, existing.status);
        if (existing.notes) {
          initialNotes[lab.id] = existing.notes;
        }
      }
    });

    setDraftStatuses(initialStatuses);
    setDraftNotes(initialNotes);
    setDraftWages(initialWages);
    setHasUnsavedChanges(false);
  }, [selectedDate]);

  // Synchronize initial load from attendanceMap without overwriting active unsaved changes
  useEffect(() => {
    const loadedStatuses: Record<string, AttendanceStatus> = {};
    const loadedNotes: Record<string, string> = {};
    const loadedWages: Record<string, number> = {};

    laborers.forEach((lab) => {
      const existing = attendanceMap[lab.id];
      if (existing) {
        loadedStatuses[lab.id] = existing.status;
        loadedWages[lab.id] = Number(existing.wage_amount) || calculateWageForStatus(lab.daily_wage, existing.status);
        if (existing.notes) {
          loadedNotes[lab.id] = existing.notes;
        }
      }
    });

    setDraftStatuses((prev) => ({ ...loadedStatuses, ...prev }));
    setDraftNotes((prev) => ({ ...loadedNotes, ...prev }));
    setDraftWages((prev) => ({ ...loadedWages, ...prev }));
  }, [attendanceMap, laborers]);

  // Date Navigation
  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Instant 1-Tap Status Change & Auto-Save
  const handleStatusChange = async (laborerId: string, status: AttendanceStatus) => {
    const lab = laborers.find((l) => l.id === laborerId);
    if (!lab || !currentSite) return;

    const isTogglingOff = draftStatuses[laborerId] === status;
    const nextStatus = isTogglingOff ? undefined : status;

    // 1. Immediately update local state so UI updates instantly
    setDraftStatuses((prev) => {
      const next = { ...prev };
      if (isTogglingOff) {
        delete next[laborerId];
      } else {
        next[laborerId] = status;
      }
      return next;
    });

    const calculatedWage = nextStatus ? calculateWageForStatus(lab.daily_wage, nextStatus) : 0;
    const finalWage = draftWages[laborerId] !== undefined && !isTogglingOff ? draftWages[laborerId] : calculatedWage;

    setDraftWages((prev) => {
      const next = { ...prev };
      if (isTogglingOff) {
        delete next[laborerId];
      } else {
        next[laborerId] = finalWage;
      }
      return next;
    });

    // 2. Auto-save to Supabase or offline queue immediately
    try {
      if (isTogglingOff) {
        await deleteAttendanceRecord(laborerId, selectedDate);
        onShowToast('info', 'Attendance Unmarked', `Cleared attendance for ${lab.name}`);
      } else {
        const record = {
          site_id: currentSite.id,
          laborer_id: laborerId,
          attendance_date: selectedDate,
          status: nextStatus!,
          wage_amount: finalWage,
          notes: draftNotes[laborerId] || '',
          recorded_by: user?.id,
        };

        if (!isOnline) {
          enqueueAttendance([record]);
          onShowToast('warning', 'Saved to Offline Queue', 'Will sync automatically when online.');
        } else {
          const { error } = await supabase.from('attendance').upsert([record], {
            onConflict: 'laborer_id,attendance_date',
          });

          if (error) {
            console.error('Attendance save error:', error);
            if (error.message.includes('row-level security') || error.code === '42501') {
              onShowToast(
                'error',
                'Permission Error (RLS)',
                'Please run the SQL update in your Supabase SQL Editor to allow attendance saves.'
              );
            } else {
              onShowToast('error', 'Database Error', error.message);
            }
          } else {
            const statusLabel =
              status === 'present'
                ? 'Present (Full Day)'
                : status === 'half_day'
                ? 'Half Day (0.5 Wage)'
                : status === 'absent'
                ? 'Absent (0 Wage)'
                : 'Leave Approved';

            onShowToast('success', `${lab.name}: ${statusLabel}`, `Payable: ${formatCurrency(finalWage)}`);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating attendance';
      onShowToast('error', 'Error', msg);
    }
  };

  const handleClearAttendance = async (laborerId: string) => {
    const lab = laborers.find((l) => l.id === laborerId);
    setDraftStatuses((prev) => {
      const next = { ...prev };
      delete next[laborerId];
      return next;
    });
    setDraftWages((prev) => {
      const next = { ...prev };
      delete next[laborerId];
      return next;
    });
    setDraftNotes((prev) => {
      const next = { ...prev };
      delete next[laborerId];
      return next;
    });

    const res = await deleteAttendanceRecord(laborerId, selectedDate);
    if (res.success) {
      onShowToast('info', 'Attendance Cleared', `Unmarked ${lab?.name || 'laborer'} for this date.`);
    } else {
      onShowToast('error', 'Failed to clear', res.error);
    }
  };

  const handleWageOverride = async (laborerId: string, newWage: number) => {
    const lab = laborers.find((l) => l.id === laborerId);
    const currentStatus = draftStatuses[laborerId];
    if (!lab || !currentSite || !currentStatus) return;

    setDraftWages((prev) => ({
      ...prev,
      [laborerId]: newWage,
    }));

    // Save wage update directly
    const record = {
      site_id: currentSite.id,
      laborer_id: laborerId,
      attendance_date: selectedDate,
      status: currentStatus,
      wage_amount: newWage,
      notes: draftNotes[laborerId] || '',
      recorded_by: user?.id,
    };

    if (isOnline) {
      await supabase.from('attendance').upsert([record], { onConflict: 'laborer_id,attendance_date' });
    }
    onShowToast('info', 'Daily wage adjusted', `Wage overridden to ${formatCurrency(newWage)} for this day.`);
  };

  // Quick Action: Mark All Present & Save Immediately
  const handleMarkAllPresent = async () => {
    if (!currentSite || laborers.length === 0) return;

    const recordsToSave: any[] = [];
    const updatedStatuses = { ...draftStatuses };
    const updatedWages = { ...draftWages };

    laborers.forEach((lab) => {
      if (!updatedStatuses[lab.id]) {
        updatedStatuses[lab.id] = 'present';
        const wage = calculateWageForStatus(lab.daily_wage, 'present');
        updatedWages[lab.id] = wage;

        recordsToSave.push({
          site_id: currentSite.id,
          laborer_id: lab.id,
          attendance_date: selectedDate,
          status: 'present',
          wage_amount: wage,
          notes: draftNotes[lab.id] || '',
          recorded_by: user?.id,
        });
      }
    });

    if (recordsToSave.length === 0) {
      onShowToast('info', 'All workers already marked');
      return;
    }

    setDraftStatuses(updatedStatuses);
    setDraftWages(updatedWages);

    try {
      if (!isOnline) {
        enqueueAttendance(recordsToSave);
        onShowToast('warning', 'Saved to Offline Queue', `${recordsToSave.length} workers queued.`);
      } else {
        const { error } = await supabase.from('attendance').upsert(recordsToSave, {
          onConflict: 'laborer_id,attendance_date',
        });

        if (error) {
          throw error;
        }

        onShowToast(
          'success',
          'All Marked Present',
          `Successfully recorded attendance for ${recordsToSave.length} laborers.`
        );
        await refreshData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save attendance';
      onShowToast('error', 'Save Failed', msg);
    }
  };

  // Quick Action: Reset drafts
  const handleResetDrafts = () => {
    if (confirm('Discard unsaved attendance changes for this date?')) {
      const initialStatuses: Record<string, AttendanceStatus> = {};
      const initialWages: Record<string, number> = {};
      laborers.forEach((lab) => {
        const existing = attendanceMap[lab.id];
        if (existing) {
          initialStatuses[lab.id] = existing.status;
          initialWages[lab.id] = Number(existing.wage_amount) || calculateWageForStatus(lab.daily_wage, existing.status);
        }
      });
      setDraftStatuses(initialStatuses);
      setDraftWages(initialWages);
      setHasUnsavedChanges(false);
    }
  };

  // Manual Bulk Save
  const handleSaveAttendance = async () => {
    if (!currentSite || laborers.length === 0 || isSaving) return;

    setIsSaving(true);

    try {
      const recordsToSave = Object.entries(draftStatuses).map(([laborerId, status]) => {
        const laborer = laborers.find((l) => l.id === laborerId);
        const defaultWage = laborer ? calculateWageForStatus(laborer.daily_wage, status) : 0;
        const finalWage = draftWages[laborerId] !== undefined ? draftWages[laborerId] : defaultWage;

        return {
          site_id: currentSite.id,
          laborer_id: laborerId,
          attendance_date: selectedDate,
          status,
          wage_amount: finalWage,
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
      onShowToast('success', 'Attendance Saved', `Recorded attendance for ${recordsToSave.length} laborers.`);
      await refreshData();
    } catch (err: unknown) {
      setIsSaving(false);
      const msg = err instanceof Error ? err.message : 'Failed to save attendance';
      onShowToast('error', 'Error Saving Attendance', msg);
    }
  };

  // Filtered Laborers List
  const filteredLaborers = useMemo(() => {
    return laborers.filter((l) => {
      const matchesSearch =
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.phone && l.phone.includes(searchQuery));
      if (!matchesSearch) return false;

      if (selectedCategory !== 'all' && l.category !== selectedCategory) {
        return false;
      }

      if (filterUnmarkedOnly) {
        return !draftStatuses[l.id];
      }

      return true;
    });
  }, [laborers, searchQuery, selectedCategory, filterUnmarkedOnly, draftStatuses]);

  const markedCount = Object.keys(draftStatuses).length;
  const unmarkedCount = Math.max(0, laborers.length - markedCount);

  // Total payable wages today
  const totalDayCost = useMemo(() => {
    return Object.entries(draftStatuses).reduce((sum, [labId, status]) => {
      const lab = laborers.find((l) => l.id === labId);
      if (!lab) return sum;
      const wage = draftWages[labId] !== undefined
        ? draftWages[labId]
        : calculateWageForStatus(lab.daily_wage, status);
      return sum + wage;
    }, 0);
  }, [draftStatuses, draftWages, laborers]);

  // Note Modal Handlers
  const handleOpenNotes = (laborer: Laborer) => {
    setNotesLaborer(laborer);
    setActiveNoteText(draftNotes[laborer.id] || '');
  };

  const handleSaveNote = async () => {
    if (notesLaborer && currentSite) {
      setDraftNotes((prev) => ({
        ...prev,
        [notesLaborer.id]: activeNoteText.trim(),
      }));

      // If already marked, update note in DB
      const currentStatus = draftStatuses[notesLaborer.id];
      if (currentStatus) {
        const currentWage = draftWages[notesLaborer.id] || calculateWageForStatus(notesLaborer.daily_wage, currentStatus);
        await supabase.from('attendance').upsert({
          site_id: currentSite.id,
          laborer_id: notesLaborer.id,
          attendance_date: selectedDate,
          status: currentStatus,
          wage_amount: currentWage,
          notes: activeNoteText.trim(),
          recorded_by: user?.id,
        }, { onConflict: 'laborer_id,attendance_date' });
      }

      onShowToast('info', 'Note Saved', `Remark updated for ${notesLaborer.name}`);
    }
    setNotesLaborer(null);
  };

  // If no site is selected
  if (!currentSite) {
    return (
      <div className="space-y-4 pb-20 pt-6 text-center">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs max-w-md mx-auto">
          <Building2 className="w-12 h-12 mx-auto text-amber-500 mb-3" />
          <h3 className="font-bold text-slate-900 text-base mb-1">No Construction Site Selected</h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Create or select a construction site to start recording and managing daily labor attendance.
          </p>
          {onOpenSiteManagement && (
            <button
              type="button"
              onClick={onOpenSiteManagement}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
            >
              + Create or Select Site
            </button>
          )}
        </div>
      </div>
    );
  }

  // If site has no laborers added
  if (laborers.length === 0) {
    return (
      <div className="space-y-4 pb-20 pt-6 text-center">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs max-w-md mx-auto">
          <Users className="w-12 h-12 mx-auto text-amber-500 mb-3" />
          <h3 className="font-bold text-slate-900 text-base mb-1">No Laborers on {currentSite.name}</h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Add your workers (Masons, Helpers, Carpenters, etc.) and their daily wages to begin marking attendance.
          </p>
          <button
            type="button"
            onClick={() => setIsAddLaborerOpen(true)}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add First Laborer</span>
          </button>
        </div>

        <LaborerFormModal
          isOpen={isAddLaborerOpen}
          onClose={() => setIsAddLaborerOpen(false)}
          onSaved={async () => {
            await refreshData();
            onShowToast('success', 'Laborer Added');
          }}
        />
      </div>
    );
  }

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
          const currentWage = draftWages[laborer.id];
          const isSavedInDb = Boolean(attendanceMap[laborer.id]);

          return (
            <LaborerAttendanceCard
              key={laborer.id}
              laborer={laborer}
              status={currentStatus}
              notes={currentNote}
              wageAmount={currentWage}
              isSavedInDb={isSavedInDb}
              hasAuditLogs={isSavedInDb}
              onStatusChange={(status) => handleStatusChange(laborer.id, status)}
              onClearAttendance={() => handleClearAttendance(laborer.id)}
              onWageOverride={(newWage) => handleWageOverride(laborer.id, newWage)}
              onEditLaborer={() => setEditingLaborer(laborer)}
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
                {markedCount} of {laborers.length} marked &bull; {formatCurrency(totalDayCost)}
              </p>
              <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold mt-0.5">
                <Check className="w-3 h-3" />
                <span>1-Tap Auto-Saved</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={isSaving || markedCount === 0}
              className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Re-Sync All</span>
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

      {/* Edit / Add Laborer Modal right from Attendance */}
      <LaborerFormModal
        isOpen={Boolean(editingLaborer) || isAddLaborerOpen}
        onClose={() => {
          setEditingLaborer(null);
          setIsAddLaborerOpen(false);
        }}
        laborerToEdit={editingLaborer}
        onSaved={async () => {
          await refreshData();
          onShowToast('success', editingLaborer ? 'Laborer Updated' : 'Laborer Added');
        }}
        onDeleted={async () => {
          await refreshData();
          onShowToast('info', 'Laborer Deleted');
        }}
      />
    </div>
  );
};
