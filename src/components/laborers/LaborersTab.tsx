import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  IndianRupee,
  ChevronRight,
  Edit2,
  Trash2,
  Building2,
  Check,
} from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';
import { Laborer, LaborCategory, LABOR_CATEGORIES } from '../../types';
import { CategoryBadge } from '../common/Badge';
import { formatCurrency } from '../../lib/wageCalculator';
import { LaborerFormModal } from './LaborerFormModal';
import { LaborerDetailModal } from './LaborerDetailModal';

interface LaborersTabProps {
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, description?: string) => void;
  onOpenSiteManagement?: () => void;
}

export const LaborersTab: React.FC<LaborersTabProps> = ({ onShowToast, onOpenSiteManagement }) => {
  const { allLaborers, refreshData, currentSite, deleteLaborer, updateLaborerWage } = useSite();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [laborerToEdit, setLaborerToEdit] = useState<Laborer | null>(null);
  const [selectedLaborer, setSelectedLaborer] = useState<Laborer | null>(null);

  // Inline Quick Wage editing state
  const [quickWageLabId, setQuickWageLabId] = useState<string | null>(null);
  const [quickWageVal, setQuickWageVal] = useState<string>('');

  const filteredLaborers = useMemo(() => {
    return allLaborers.filter((lab) => {
      const matchesSearch =
        lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lab.phone && lab.phone.includes(searchQuery));
      if (!matchesSearch) return false;

      if (selectedCategory !== 'all' && lab.category !== selectedCategory) {
        return false;
      }

      if (statusFilter === 'active' && !lab.is_active) return false;
      if (statusFilter === 'inactive' && lab.is_active) return false;

      return true;
    });
  }, [allLaborers, searchQuery, selectedCategory, statusFilter]);

  // Aggregate active daily payroll
  const activeDailyWageTotal = useMemo(() => {
    return allLaborers
      .filter((l) => l.is_active)
      .reduce((sum, l) => sum + (Number(l.daily_wage) || 0), 0);
  }, [allLaborers]);

  const handleQuickWageSave = async (e: React.MouseEvent, laborerId: string) => {
    e.stopPropagation();
    const parsed = parseFloat(quickWageVal);
    if (!isNaN(parsed) && parsed >= 0) {
      const res = await updateLaborerWage(laborerId, parsed);
      if (res.success) {
        onShowToast('success', 'Daily Wage Updated', `Set to ${formatCurrency(parsed)}/day`);
        await refreshData();
      } else {
        onShowToast('error', 'Failed to update wage', res.error);
      }
    }
    setQuickWageLabId(null);
  };

  const handleDeleteLaborerDirect = async (e: React.MouseEvent, laborer: Laborer) => {
    e.stopPropagation();
    const confirmed = confirm(
      `Permanently delete laborer "${laborer.name}"?\nAll attendance records will be removed.`
    );
    if (!confirmed) return;

    const res = await deleteLaborer(laborer.id);
    if (res.success) {
      onShowToast('info', 'Laborer Deleted', `${laborer.name} removed from site.`);
      await refreshData();
    } else {
      onShowToast('error', 'Failed to delete', res.error);
    }
  };

  // If no site is selected
  if (!currentSite) {
    return (
      <div className="space-y-4 pb-20 pt-6 text-center">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs max-w-md mx-auto">
          <Building2 className="w-12 h-12 mx-auto text-amber-500 mb-3" />
          <h3 className="font-bold text-slate-900 text-base mb-1">No Construction Site Selected</h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Please select or create a site first to add and manage laborers and their wages.
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

  return (
    <div className="space-y-3 pb-24 pt-2">
      {/* Top Header with Add Button */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Labor Management</h2>
          <p className="text-xs text-slate-500">
            {allLaborers.length} registered &bull; Daily Bill: {formatCurrency(activeDailyWageTotal)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLaborerToEdit(null);
            setIsAddOpen(true);
          }}
          className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Laborer</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or phone..."
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

      {/* Filter Row: Active/Inactive Toggles & Category Horizontal Scroll */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider mr-1">Status:</span>
          {(['active', 'all', 'inactive'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg capitalize text-xs transition-colors border ${
                statusFilter === s
                  ? 'bg-slate-900 text-white border-slate-900 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors border ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Trades ({allLaborers.length})
          </button>

          {LABOR_CATEGORIES.map((cat) => {
            const count = allLaborers.filter((l) => l.category === cat).length;
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

      {/* Laborers List */}
      <div className="space-y-2">
        {filteredLaborers.map((laborer) => {
          const isEditingThisWage = quickWageLabId === laborer.id;

          return (
            <div
              key={laborer.id}
              onClick={() => setSelectedLaborer(laborer)}
              className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 active:bg-slate-50 cursor-pointer transition-all"
            >
              <div className="min-w-0 flex items-center gap-3">
                {/* Category Trade Avatar */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                    laborer.category === 'Mason'
                      ? 'bg-amber-100 text-amber-900 border-amber-200'
                      : laborer.category === 'Helper'
                      ? 'bg-slate-100 text-slate-800 border-slate-200'
                      : laborer.category === 'Electrician'
                      ? 'bg-blue-100 text-blue-900 border-blue-200'
                      : laborer.category === 'Plumber'
                      ? 'bg-cyan-100 text-cyan-900 border-cyan-200'
                      : laborer.category === 'Carpenter'
                      ? 'bg-orange-100 text-orange-900 border-orange-200'
                      : laborer.category === 'Painter'
                      ? 'bg-purple-100 text-purple-900 border-purple-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {laborer.name.charAt(0)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-sm text-slate-900 leading-snug truncate">
                      {laborer.name}
                    </h4>
                    <CategoryBadge category={laborer.category} size="sm" />
                    {!laborer.is_active && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                    <span>{laborer.phone || 'No phone'}</span>
                    <span>&bull;</span>

                    {/* Inline Wage quick editor */}
                    {isEditingThisWage ? (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="font-bold text-slate-700">₹</span>
                        <input
                          type="number"
                          value={quickWageVal}
                          onChange={(e) => setQuickWageVal(e.target.value)}
                          className="w-16 px-1.5 py-0.5 text-xs font-bold bg-white border border-slate-300 rounded"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={(e) => handleQuickWageSave(e, laborer.id)}
                          className="p-1 bg-slate-900 text-white rounded text-xs"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickWageLabId(null);
                          }}
                          className="text-xs text-slate-400 hover:text-slate-600 px-0.5"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickWageLabId(laborer.id);
                          setQuickWageVal(String(laborer.daily_wage || 500));
                        }}
                        className="font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors"
                        title="Click to edit daily wage"
                      >
                        <IndianRupee className="w-2.5 h-2.5" />
                        <span>{formatCurrency(laborer.daily_wage)}/day</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons on row */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => {
                    setLaborerToEdit(laborer);
                    setIsAddOpen(true);
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  title="Edit laborer details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDeleteLaborerDirect(e, laborer)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete laborer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <ChevronRight className="w-4 h-4 text-slate-300 ml-1" />
              </div>
            </div>
          );
        })}

        {filteredLaborers.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center text-slate-400 text-xs border border-slate-200">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">No laborers found</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Add laborers to start tracking site attendance and wages.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      <LaborerFormModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        laborerToEdit={laborerToEdit}
        onSaved={() => {
          refreshData();
          onShowToast('success', laborerToEdit ? 'Laborer Updated' : 'Laborer Added');
        }}
        onDeleted={() => {
          refreshData();
          onShowToast('info', 'Laborer Deleted');
        }}
      />

      {/* Detail & History Modal */}
      <LaborerDetailModal
        isOpen={Boolean(selectedLaborer)}
        onClose={() => setSelectedLaborer(null)}
        laborer={selectedLaborer}
        onEdit={(lab) => {
          setSelectedLaborer(null);
          setLaborerToEdit(lab);
          setIsAddOpen(true);
        }}
      />
    </div>
  );
};
