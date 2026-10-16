import React from 'react';
import { Home, CalendarCheck2, Users, FileSpreadsheet } from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';

export type TabType = 'home' | 'attendance' | 'laborers' | 'reports';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const { stats } = useSite();

  const tabs: { id: TabType; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: Home },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: CalendarCheck2,
      badge: stats.unmarkedToday > 0 ? stats.unmarkedToday : undefined,
    },
    { id: 'laborers', label: 'Laborers', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex items-stretch justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 select-none transition-colors relative ${
                isActive
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? 'bg-slate-100 text-slate-950' : ''
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </div>

                {/* Badge for unmarked attendance */}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950 border border-white leading-tight">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'text-slate-950' : 'text-slate-500'}`}>
                {tab.label}
              </span>

              {/* Active Tab Indicator Bar */}
              {isActive && (
                <div className="absolute top-0 inset-x-4 h-0.5 bg-slate-900 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
