import React from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  ArrowRight,
  IndianRupee,
  CalendarCheck2,
  Calendar,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';
import { KpiCard } from './KpiCard';
import { TodayStatusBar } from './TodayStatusBar';
import { StatusBadge, CategoryBadge } from '../common/Badge';
import { formatCurrency, formatDate, getTodayDateString } from '../../lib/wageCalculator';
import { TabType } from '../layout/BottomNav';

interface DashboardTabProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenSiteManagement: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  onNavigateTab,
  onOpenSiteManagement,
}) => {
  const { currentSite, laborers, attendanceMap, stats, selectedDate } = useSite();
  const { profile, isAdmin } = useAuth();

  const isToday = selectedDate === getTodayDateString();

  // Sort marked laborers to show at top
  const markedLaborers = laborers.filter((l) => Boolean(attendanceMap[l.id]));

  return (
    <div className="space-y-4 pb-20 pt-2">
      {/* Top Welcome Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(selectedDate)}</span>
              {isToday && <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded text-[10px] font-bold">TODAY</span>}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              Hello, {profile?.name || 'Supervisor'}
            </h2>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Site</span>
            <span className="text-xs font-bold text-slate-200 truncate max-w-[140px] block">
              {currentSite?.name || 'No Site Selected'}
            </span>
          </div>
        </div>

        {/* Prominent Mark Attendance Action Button */}
        {currentSite ? (
          <button
            type="button"
            onClick={() => onNavigateTab('attendance')}
            className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold rounded-xl flex items-center justify-between shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-950/10 flex items-center justify-center">
                <CalendarCheck2 className="w-5 h-5 text-slate-950" />
              </div>
              <div className="text-left">
                <p className="text-sm font-extrabold leading-tight">
                  {stats.unmarkedToday > 0 ? `Mark Today's Attendance` : `Review & Edit Attendance`}
                </p>
                <p className="text-xs text-slate-900 font-medium opacity-90">
                  {stats.unmarkedToday > 0
                    ? `${stats.unmarkedToday} laborer(s) remaining unmarked`
                    : `All active laborers marked (${stats.activeLaborers}/${stats.activeLaborers})`}
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-950 text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        ) : (
          <div className="p-3 bg-slate-800 rounded-xl text-xs text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Please select or create a site to continue.
            </span>
            {isAdmin && (
              <button
                onClick={onOpenSiteManagement}
                className="bg-amber-500 text-slate-950 px-3 py-1 font-bold rounded-lg text-xs"
              >
                Manage Sites
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI 4-Card Grid */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Registered"
          value={stats.activeLaborers}
          subtext={`of ${stats.totalLaborers} total`}
          icon={Users}
          colorVariant="navy"
          onClick={() => onNavigateTab('laborers')}
        />

        <KpiCard
          label="Present Today"
          value={stats.presentToday}
          subtext={`${stats.activeLaborers > 0 ? Math.round((stats.presentToday / stats.activeLaborers) * 100) : 0}% attendance`}
          icon={UserCheck}
          colorVariant="emerald"
          onClick={() => onNavigateTab('attendance')}
        />

        <KpiCard
          label="Absent Today"
          value={stats.absentToday}
          subtext="Full day absent"
          icon={UserX}
          colorVariant="rose"
          onClick={() => onNavigateTab('attendance')}
        />

        <KpiCard
          label="Half Day"
          value={stats.halfDayToday}
          subtext="0.5 day wage"
          icon={Clock}
          colorVariant="amber"
          onClick={() => onNavigateTab('attendance')}
        />
      </div>

      {/* Attendance Progress Bar */}
      <TodayStatusBar stats={stats} />

      {/* Today's Estimated Wage Cost Card */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold">
            <IndianRupee className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Labor Wages</span>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.estimatedDailyWages)}</p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('reports')}
          className="text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
        >
          <span>Wage Report</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Recent Attendance Summary Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Today's Attendance List</h3>
          <button
            onClick={() => onNavigateTab('attendance')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            View All ({laborers.length})
          </button>
        </div>

        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {laborers.slice(0, 6).map((laborer) => {
            const record = attendanceMap[laborer.id];
            return (
              <div
                key={laborer.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-sm"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 truncate">{laborer.name}</span>
                    <CategoryBadge category={laborer.category} size="sm" />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {laborer.phone || 'No phone'} &bull; Wage: {formatCurrency(laborer.daily_wage)}/day
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <StatusBadge status={record?.status} size="sm" />
                </div>
              </div>
            );
          })}

          {laborers.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p>No laborers registered for this site yet.</p>
              <button
                onClick={() => onNavigateTab('laborers')}
                className="mt-3 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1"
              >
                Add Laborers
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
