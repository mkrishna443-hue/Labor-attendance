import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Download,
  Printer,
  IndianRupee,
  Users,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';
import { supabase } from '../../lib/supabase';
import { AttendanceRecord, Laborer, LaborCategory } from '../../types';
import { formatCurrency, formatDate, getTodayDateString } from '../../lib/wageCalculator';
import { downloadCsv } from '../../lib/csvExport';
import { CategoryBadge } from '../common/Badge';

export const ReportsTab: React.FC = () => {
  const { currentSite, allLaborers } = useSite();

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
  useEffect(() => {
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

  return (
    <div className="space-y-4 pb-28 pt-2">
      {/* Top Header & Export Actions */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Attendance &amp; Wage Reports</h2>
          <p className="text-xs text-slate-500">
            {formatDate(startDate)} &mdash; {formatDate(endDate)}
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

        {/* Date Inputs if Custom */}
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
            <span>Total Wage Cost</span>
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

      {/* Category-Wise Breakdown Table */}
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

      {/* Detailed Laborer-wise Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wider">
            Worker-wise Attendance &amp; Payable Wages
          </h3>
          <span className="text-xs text-slate-500">{laborerSummaries.length} workers</span>
        </div>

        <div className="divide-y divide-slate-100">
          {laborerSummaries.map(({ laborer, presentDays, halfDays, absentDays, totalWages, manDays }) => (
            <div key={laborer.id} className="p-3.5 hover:bg-slate-50 transition-colors text-xs">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{laborer.name}</span>
                    <CategoryBadge category={laborer.category} size="sm" />
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Rate: {formatCurrency(laborer.daily_wage)}/day &bull; Phone: {laborer.phone || 'N/A'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-slate-900 block">{formatCurrency(totalWages)}</span>
                  <span className="text-[10px] font-semibold text-emerald-700">{manDays} man-days</span>
                </div>
              </div>

              {/* Attendance Breakdown Pills */}
              <div className="flex items-center gap-1.5 pt-1 text-[11px]">
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

          {laborerSummaries.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p>No laborers recorded for this site yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
