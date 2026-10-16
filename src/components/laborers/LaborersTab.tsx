import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Briefcase,
  IndianRupee,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';
import { Laborer, LaborCategory, LABOR_CATEGORIES } from '../../types';
import { CategoryBadge } from '../common/Badge';
import { formatCurrency } from '../../lib/wageCalculator';
import { LaborerFormModal } from './LaborerFormModal';
import { LaborerDetailModal } from './LaborerDetailModal';

interface LaborersTabProps {
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, description?: string) => void;
}

export const LaborersTab: React.FC<LaborersTabProps> = ({ onShowToast }) => {
  const { allLaborers, refreshData, currentSite } = useSite();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [laborerToEdit, setLaborerToEdit] = useState<Laborer | null>(null);
  const [selectedLaborer, setSelectedLaborer] = useState<Laborer | null>(null);

  const filteredLaborers = useMemo(() => {
    return allLaborers.filter((lab) => {
      // Search
      const matchesSearch =
        lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lab.phone && lab.phone.includes(searchQuery));
      if (!matchesSearch) return false;

      // Category
      if (selectedCategory !== 'all' && lab.category !== selectedCategory) {
        return false;
      }

      // Status
      if (statusFilter === 'active' && !lab.is_active) return false;
      if (statusFilter === 'inactive' && lab.is_active) return false;

      return true;
    });
  }, [allLaborers, searchQuery, selectedCategory, statusFilter]);

  return (
    <div className="space-y-3 pb-24 pt-2">
      {/* Top Header with Add Button */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Labor Management</h2>
          <p className="text-xs text-slate-500">
            {allLaborers.length} registered on {currentSite?.name || 'this site'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLaborerToEdit(null);
            setIsAddOpen(true);
          }}
          disabled={!currentSite}
          className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
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
        {filteredLaborers.map((laborer) => (
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

                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>{laborer.phone || 'No phone'}</span>
                  <span>&bull;</span>
                  <span className="font-bold text-slate-800">{formatCurrency(laborer.daily_wage)}/day</span>
                </div>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
        ))}

        {filteredLaborers.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center text-slate-400 text-xs border border-slate-200">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">No laborers found</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Add laborers to start tracking site attendance.
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
