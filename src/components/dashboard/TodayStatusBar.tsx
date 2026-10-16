import React from 'react';
import { SiteStats } from '../../types';

interface TodayStatusBarProps {
  stats: SiteStats;
}

export const TodayStatusBar: React.FC<TodayStatusBarProps> = ({ stats }) => {
  const total = stats.activeLaborers || 1;
  const presentPct = Math.round((stats.presentToday / total) * 100);
  const halfDayPct = Math.round((stats.halfDayToday / total) * 100);
  const absentPct = Math.round((stats.absentToday / total) * 100);
  const leavePct = Math.round((stats.leaveToday / total) * 100);
  const unmarkedPct = Math.max(0, 100 - (presentPct + halfDayPct + absentPct + leavePct));

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Attendance Progress</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
            {stats.completionPercentage}%
          </span>
        </div>
        <span className="text-xs text-slate-500">
          {stats.activeLaborers - stats.unmarkedToday} / {stats.activeLaborers} marked
        </span>
      </div>

      {/* Segmented Progress Bar */}
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
        {presentPct > 0 && (
          <div
            style={{ width: `${presentPct}%` }}
            className="h-full bg-emerald-600 transition-all duration-300"
            title={`Present: ${stats.presentToday} (${presentPct}%)`}
          />
        )}
        {halfDayPct > 0 && (
          <div
            style={{ width: `${halfDayPct}%` }}
            className="h-full bg-amber-500 transition-all duration-300"
            title={`Half Day: ${stats.halfDayToday} (${halfDayPct}%)`}
          />
        )}
        {absentPct > 0 && (
          <div
            style={{ width: `${absentPct}%` }}
            className="h-full bg-rose-600 transition-all duration-300"
            title={`Absent: ${stats.absentToday} (${absentPct}%)`}
          />
        )}
        {leavePct > 0 && (
          <div
            style={{ width: `${leavePct}%` }}
            className="h-full bg-sky-600 transition-all duration-300"
            title={`Leave: ${stats.leaveToday} (${leavePct}%)`}
          />
        )}
        {unmarkedPct > 0 && (
          <div
            style={{ width: `${unmarkedPct}%` }}
            className="h-full bg-slate-200 transition-all duration-300"
            title={`Unmarked: ${stats.unmarkedToday}`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs text-slate-600 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
          <span>Present ({stats.presentToday})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <span>Half Day ({stats.halfDayToday})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
          <span>Absent ({stats.absentToday})</span>
        </div>
        {stats.leaveToday > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" />
            <span>Leave ({stats.leaveToday})</span>
          </div>
        )}
        {stats.unmarkedToday > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
            <span>Unmarked ({stats.unmarkedToday})</span>
          </div>
        )}
      </div>
    </div>
  );
};
