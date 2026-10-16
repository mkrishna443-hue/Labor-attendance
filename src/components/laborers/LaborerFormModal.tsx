import React, { useState, useEffect } from 'react';
import { User, Phone, Briefcase, IndianRupee, FileText, Check, AlertCircle, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Laborer, LaborCategory, LABOR_CATEGORIES } from '../../types';
import { supabase } from '../../lib/supabase';
import { useSite } from '../../contexts/SiteContext';

interface LaborerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  laborerToEdit?: Laborer | null;
  onSaved: () => void;
  onDeleted?: () => void;
}

const COMMON_WAGES = [400, 500, 600, 700, 750, 800, 900, 1000];

export const LaborerFormModal: React.FC<LaborerFormModalProps> = ({
  isOpen,
  onClose,
  laborerToEdit,
  onSaved,
  onDeleted,
}) => {
  const { currentSite, deleteLaborer } = useSite();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<LaborCategory>('Helper');
  const [dailyWage, setDailyWage] = useState<string>('500');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (laborerToEdit) {
      setName(laborerToEdit.name);
      setPhone(laborerToEdit.phone || '');
      setCategory(laborerToEdit.category);
      setDailyWage(String(laborerToEdit.daily_wage || 500));
      setIsActive(laborerToEdit.is_active);
      setNotes(laborerToEdit.notes || '');
    } else {
      setName('');
      setPhone('');
      setCategory('Helper');
      setDailyWage('500');
      setIsActive(true);
      setNotes('');
    }
    setErrorMsg(null);
  }, [laborerToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSite) {
      setErrorMsg('No site selected. Please create or select a site first.');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Please enter laborer name');
      return;
    }

    const wageNum = parseFloat(dailyWage);
    if (isNaN(wageNum) || wageNum < 0) {
      setErrorMsg('Please enter a valid daily wage');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        site_id: currentSite.id,
        name: name.trim(),
        phone: phone.trim(),
        category,
        daily_wage: wageNum,
        is_active: isActive,
        notes: notes.trim(),
      };

      if (laborerToEdit) {
        const { error } = await supabase
          .from('laborers')
          .update(payload)
          .eq('id', laborerToEdit.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('laborers')
          .insert(payload);

        if (error) throw error;
      }

      setIsLoading(false);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Failed to save laborer details';
      setErrorMsg(msg);
    }
  };

  const handleDelete = async () => {
    if (!laborerToEdit) return;
    const confirmed = confirm(
      `Permanently delete "${laborerToEdit.name}"?\nAll attendance records for this laborer will be removed.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    const res = await deleteLaborer(laborerToEdit.id);
    setIsDeleting(false);

    if (res.success) {
      if (onDeleted) onDeleted();
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to delete laborer');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={laborerToEdit ? 'Edit Laborer Details' : 'Add New Laborer'}
      subtitle={`Site: ${currentSite?.name || 'Selected Site'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            Full Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            required
            autoFocus
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            Contact Phone (Optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
          />
        </div>

        {/* Labor Trade / Category */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-slate-500" />
            Labor Trade / Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as LaborCategory)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white font-medium"
          >
            {LABOR_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Daily Wage in INR */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-slate-500" />
              Daily Wage Rate (₹) *
            </label>
            <span className="text-xs font-bold text-slate-900">₹{dailyWage || 0}/day</span>
          </div>

          <input
            type="number"
            min="0"
            step="10"
            value={dailyWage}
            onChange={(e) => setDailyWage(e.target.value)}
            placeholder="500"
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
          />

          {/* Preset Wage Chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[11px] text-slate-400 self-center mr-1">Presets:</span>
            {COMMON_WAGES.map((wage) => (
              <button
                key={wage}
                type="button"
                onClick={() => setDailyWage(String(wage))}
                className={`px-2 py-0.5 rounded text-xs font-semibold border transition-colors ${
                  dailyWage === String(wage)
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ₹{wage}
              </button>
            ))}
          </div>
        </div>

        {/* Active Status Checkbox */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <span className="font-semibold text-xs text-slate-900 block">Active Status</span>
            <span className="text-[11px] text-slate-500 block">
              Inactive laborers are hidden from daily attendance but retain history.
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900" />
          </label>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Additional Remarks (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Aadhaar details, emergency contact..."
            rows={2}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white resize-none"
          />
        </div>

        {/* Action Buttons: Delete + Cancel + Save */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {laborerToEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isDeleting}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{laborerToEdit ? 'Save Changes' : 'Register Laborer'}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
