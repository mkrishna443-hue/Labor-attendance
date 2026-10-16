import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Download,
  Printer,
  IndianRupee,
  Users,
  CheckCircle2,
  Building2,
  Search,
  Edit2,
  ChevronRight,
} from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';
import { supabase } from '../../lib/supabase';
import { AttendanceRecord, Laborer, LaborCategory, LABOR_CATEGORIES } from '../../types';
import { formatCurrency, formatDate, getTodayDateString } from '../../lib/wageCalculator';
import { downloadCsv } from '../../lib/csvExport';
import { CategoryBadge } from '../common/Badge';
import { LaborerDetailModal } from '../laborers/LaborerDetailModal';
import { LaborerFormModal } from '../laborers/LaborerFormModal';

interface ReportsTabProps {
  onOpenSiteManagement?: () => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ onOpenSiteManagement }) => {
  const { currentSite, allLaborers, refreshData } = useSite();

  // Date range presets
  const today = getTodayDateString();
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(today);

  // Loaded attendance records in date range
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string>('all');

  // Modals for editing laborer or viewing history
  const [selectedLaborer, setSelectedLaborer] = useState<Laborer | null>(null);
  const [editingLaborer, setEditingLaborer] = useState<Laborer | null>(null);

  // Handle preset clicks
  const applyPreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const str = y.toISOString().split('T')[0];
      setStartDate(str);
      setEndDate(str);
    } else if (preset === 'week') {
      const w = new Date();
      w.setDate(w.getDate() - 6);
      setStartDate(w.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(today);
    }
  };

  // Fetch records whenever site or date range changes
  const fetchRecords = () => {
    if (!currentSite) return;

    setLoading(true);
    supabase
      .from('attendance')
      .select('*')
      .eq('site_id', currentSite.id)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: true })
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          console.warn('Error fetching reports data:', error.message);
          return;
        }
        setRecords((data || []) as AttendanceRecord[]);
      });
  };

  useEffect(() => {
    fetchRecords();
  }, [currentSite, startDate, endDate]);

  // Calculations per laborer
  const laborerSummaries = useMemo(() => {
    const map: Record<
      string,
      {
        laborer: Laborer;
        presentDays: number;
        halfDays: number;
        absentDays: number;
        leaveDays: number;
        manDays: number;
        totalWages: number;
      }
    > = {};

    allLaborers.forEach((lab) => {
      map[lab.id] = {
        laborer: lab,
        presentDays: 0,
        halfDays: 0,
        absentDays: 0,
        leaveDays: 0,
        manDays: 0,
        totalWages: 0,
      };
    });

    records.forEach((rec) => {
      if (map[rec.laborer_id]) {
        if (rec.status === 'present') {
          map[rec.laborer_id].presentDays += 1;
          map[rec.laborer_id].manDays += 1;
        } else if (rec.status === 'half_day') {
          map[rec.laborer_id].halfDays += 1;
          map[rec.laborer_id].manDays += 0.5;
        } else if (rec.status === 'absent') {
          map[rec.laborer_id].absentDays += 1;
        } else if (rec.status === 'leave') {
          map[rec.laborer_id].leaveDays += 1;
        }
        map[rec.laborer_id].totalWages += Number(rec.wage_amount) || 0;
      }
    });

    return Object.values(map).sort((a, b) => b.totalWages - a.totalWages);
  }, [allLaborers, records]);

  // Filtered laborer summaries
  const filteredSummaries = useMemo(() => {
    return laborerSummaries.filter(({ laborer }) => {
      const matchSearch =
        laborer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (laborer.phone && laborer.phone.includes(searchQuery));
      if (!matchSearch) return false;

      if (selectedTrade !== 'all' && laborer.category !== selectedTrade) {
        return false;
      }

      return true;
    });
  }, [laborerSummaries, searchQuery, selectedTrade]);

  // Aggregate totals
  const totalCost = laborerSummaries.reduce((acc, curr) => acc + curr.totalWages, 0);
  const totalManDays = laborerSummaries.reduce((acc, curr) => acc + curr.manDays, 0);
  const totalPresentCount = laborerSummaries.reduce((acc, curr) => acc + curr.presentDays, 0);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const catMap: Record<
      string,
      { category: LaborCategory; workersCount: number; manDays: number; totalWages: number }
    > = {};

    laborerSummaries.forEach(({ laborer, manDays, totalWages }) => {
      if (!catMap[laborer.category]) {
        catMap[laborer.category] = {
          category: laborer.category,
          workersCount: 0,
          manDays: 0,
          totalWages: 0,
        };
      }
      catMap[laborer.category].workersCount += 1;
      catMap[laborer.category].manDays += manDays;
      catMap[laborer.category].totalWages += totalWages;
    });

    return Object.values(catMap).sort((a, b) => b.totalWages - a.totalWages);
  }, [laborerSummaries]);

  // Export to CSV
  const handleExportCsv = () => {
    const siteName = currentSite?.name || 'Site';
    const filename = `Attendance_Report_${siteName}_${startDate}_to_${endDate}`;

    const headers = [
      'Laborer Name',
      'Contact Phone',
      'Category / Trade',
      'Daily Wage (₹)',
      'Days Present (Full)',
      'Half Days',
      'Days Absent',
      'Leave Days',
      'Total Man-Days',
      'Total Payable Wages (₹)',
      'Status',
    ];

    const rows = laborerSummaries.map(({ laborer, presentDays, halfDays, absentDays, leaveDays, manDays, totalWages }) => [
      laborer.name,
      laborer.phone || '',
      laborer.category,
      laborer.daily_wage,
      presentDays,
      halfDays,
      absentDays,
      leaveDays,
      manDays,
      totalWages,
      laborer.is_active ? 'Active' : 'Inactive',
    ]);

    downloadCsv(filename, headers, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  // If no site is selected
  if (!currentSite) {
    return (
      <div className="space-y-4 pb-20 pt-6 text-center">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs max-w-md mx-auto">
          <Building2 className="w-12 h-12 mx-auto text-amber-500 mb-3" />
          <h3 className="font-bold text-slate-900 text-base mb-1">No Construction Site Selected</h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Please select or create a site first to review attendance summaries and wage bill reports.
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
    <div className="space-y-4 pb-28 pt-2">
      {/* Top Header & Export Actions */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Attendance &amp; Wage Summary</h2>
          <p className="text-xs text-slate-500">
            {formatDate(startDate)} &mdash; {formatDate(endDate)} &bull; {currentSite.name}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 print:hidden">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={laborerSummaries.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            title="Download CSV for Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold p-2 rounded-xl text-xs transition-colors"
            title="Print report"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Range Selector Card */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-2.5 print:hidden">
        {/* Preset Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors border ${
                datePreset === p.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDatePreset('custom');
                setStartDate(e.target.value);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDatePreset('custom');
                setEndDate(e.target.value);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 text-white rounded-xl p-3.5 border border-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold mb-1">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Total Wage Bill</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white tracking-tight">{formatCurrency(totalCost)}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">For selected period</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total Man-Days</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{totalManDays}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{totalPresentCount} full days</span>
        </div>
      </div>

      {/* Category-Wise Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wider">
            Trade Category Breakdown
          </h3>
          <span className="text-xs text-slate-500 font-medium">{categoryBreakdown.length} trades</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {categoryBreakdown.map((cat) => {
            const costPct = totalCost > 0 ? Math.round((cat.totalWages / totalCost) * 100) : 0;
            return (
              <div key={cat.category} className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={cat.category} size="sm" />
                    <span className="text-slate-500">
                      {cat.workersCount} worker(s) &bull; {cat.manDays} man-days
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-900">{formatCurrency(cat.totalWages)}</p>
                  <span className="text-[10px] text-slate-400">{costPct}% of total cost</span>
                </div>
              </div>
            );
          })}

          {categoryBreakdown.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-xs">No records in this period.</div>
          )}
        </div>
      </div>

      {/* Detailed Laborer-wise Summary Table with Edit Options */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wider">
              Worker-wise Attendance &amp; Payable Wages
            </h3>
            <p className="text-[11px] text-slate-400">Tap a worker or edit button to update details &amp; daily wage</p>
          </div>
          <span className="text-xs text-slate-500 font-semibold">{filteredSummaries.length} workers</span>
        </div>

        {/* Search & Filter inside summary */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter summary by worker name..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <select
            value={selectedTrade}
            onChange={(e) => setSelectedTrade(e.target.value)}
            className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="all">All Trades</option>
            {LABOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredSummaries.map(({ laborer, presentDays, halfDays, absentDays, totalWages, manDays }) => (
            <div
              key={laborer.id}
              onClick={() => setSelectedLaborer(laborer)}
              className="p-3.5 hover:bg-slate-50 transition-colors text-xs cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{laborer.name}</span>
                    <CategoryBadge category={laborer.category} size="sm" />
                    {!laborer.is_active && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Daily Rate: <strong className="text-slate-700">{formatCurrency(laborer.daily_wage)}</strong> &bull; Phone: {laborer.phone || 'N/A'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-slate-900 block">{formatCurrency(totalWages)}</span>
                    <span className="text-[10px] font-semibold text-emerald-700">{manDays} man-days</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLaborer(laborer);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors ml-1"
                    title="Edit laborer details and daily wage"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>

              {/* Attendance Breakdown Pills */}
              <div className="flex items-center gap-1.5 pt-1 text-[11px] flex-wrap">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                  {presentDays} Present
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                  {halfDays} Half Day
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 font-semibold border border-rose-200">
                  {absentDays} Absent
                </span>
              </div>
            </div>
          ))}

          {filteredSummaries.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p>No laborers recorded for this site yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Laborer History / Details Modal */}
      <LaborerDetailModal
        isOpen={Boolean(selectedLaborer)}
        onClose={() => setSelectedLaborer(null)}
        laborer={selectedLaborer}
        onEdit={(lab) => {
          setSelectedLaborer(null);
          setEditingLaborer(lab);
        }}
      />

      {/* Laborer Edit Form Modal */}
      <LaborerFormModal
        isOpen={Boolean(editingLaborer)}
        onClose={() => setEditingLaborer(null)}
        laborerToEdit={editingLaborer}
        onSaved={async () => {
          await refreshData();
          fetchRecords();
        }}
        onDeleted={async () => {
          await refreshData();
          fetchRecords();
        }}
      />
    </div>
  );
};
