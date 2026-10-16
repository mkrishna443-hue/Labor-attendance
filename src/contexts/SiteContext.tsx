import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  ConstructionSite,
  Laborer,
  AttendanceRecord,
  SiteStats,
  PendingAttendanceSync,
} from '../types';
import {
  getPendingQueue,
  subscribePendingQueue,
  syncPendingAttendance,
} from '../lib/offlineSync';
import { calculateWageForStatus, getTodayDateString } from '../lib/wageCalculator';

interface SiteContextType {
  sites: ConstructionSite[];
  currentSite: ConstructionSite | null;
  setCurrentSite: (site: ConstructionSite | null) => void;
  laborers: Laborer[];
  allLaborers: Laborer[]; // includes inactive
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  attendanceMap: Record<string, AttendanceRecord>;
  stats: SiteStats;
  isLoading: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  pendingQueue: PendingAttendanceSync[];
  refreshData: () => Promise<void>;
  syncNow: () => Promise<{ successCount: number; failedCount: number }>;
  createNewSite: (name: string, address: string) => Promise<{ success: boolean; error?: string; site?: ConstructionSite }>;
  updateSite: (siteId: string, name: string, address: string) => Promise<{ success: boolean; error?: string }>;
  deleteSite: (siteId: string) => Promise<{ success: boolean; error?: string }>;
  deleteLaborer: (laborerId: string) => Promise<{ success: boolean; error?: string }>;
  updateLaborerWage: (laborerId: string, newWage: number) => Promise<{ success: boolean; error?: string }>;
  deleteAttendanceRecord: (laborerId: string, date: string) => Promise<{ success: boolean; error?: string }>;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

const CURRENT_SITE_KEY = 'labortrack_current_site_id';

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [currentSite, setCurrentSiteState] = useState<ConstructionSite | null>(null);
  const [laborers, setLaborers] = useState<Laborer[]>([]);
  const [allLaborers, setAllLaborers] = useState<Laborer[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingQueue, setPendingQueue] = useState<PendingAttendanceSync[]>([]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (user) {
        syncNow();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribeQueue = subscribePendingQueue((q) => {
      setPendingQueue(q);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeQueue();
    };
  }, [user]);

  const setCurrentSite = (site: ConstructionSite | null) => {
    setCurrentSiteState(site);
    if (site) {
      localStorage.setItem(CURRENT_SITE_KEY, site.id);
    } else {
      localStorage.removeItem(CURRENT_SITE_KEY);
    }
  };

  // Fetch sites accessible to user
  const fetchSites = useCallback(async (): Promise<ConstructionSite[]> => {
    if (!user) {
      setSites([]);
      setCurrentSiteState(null);
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('construction_sites')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.warn('Error fetching sites:', error.message);
        return [];
      }

      const siteList = (data as ConstructionSite[]) || [];
      setSites(siteList);

      const savedSiteId = localStorage.getItem(CURRENT_SITE_KEY);
      const matched = siteList.find((s) => s.id === savedSiteId);
      if (matched) {
        setCurrentSiteState(matched);
      } else if (siteList.length > 0) {
        setCurrentSiteState(siteList[0]);
        localStorage.setItem(CURRENT_SITE_KEY, siteList[0].id);
      } else {
        setCurrentSiteState(null);
      }

      return siteList;
    } catch (err) {
      console.error('Exception fetching sites:', err);
      return [];
    }
  }, [user]);

  // Fetch laborers for current site
  const fetchLaborers = useCallback(async (siteId: string) => {
    try {
      const { data, error } = await supabase
        .from('laborers')
        .select('*')
        .eq('site_id', siteId)
        .order('name');

      if (error) {
        console.warn('Error fetching laborers:', error.message);
        return;
      }

      const all = (data as Laborer[]) || [];
      setAllLaborers(all);
      setLaborers(all.filter((l) => l.is_active));
    } catch (err) {
      console.error('Exception fetching laborers:', err);
    }
  }, []);

  // Fetch attendance records for current site & selected date
  const fetchAttendance = useCallback(async (siteId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('site_id', siteId)
        .eq('attendance_date', date);

      if (error) {
        console.warn('Error fetching attendance:', error.message);
        return;
      }

      const map: Record<string, AttendanceRecord> = {};
      ((data as AttendanceRecord[]) || []).forEach((rec) => {
        map[rec.laborer_id] = rec;
      });

      // Overlay pending offline records
      const queue = getPendingQueue();
      queue.forEach((q) => {
        if (q.site_id === siteId && q.attendance_date === date) {
          map[q.laborer_id] = {
            id: q.tempId,
            site_id: q.site_id,
            laborer_id: q.laborer_id,
            attendance_date: q.attendance_date,
            status: q.status,
            wage_amount: q.wage_amount,
            notes: q.notes,
            created_at: new Date(q.timestamp).toISOString(),
            updated_at: new Date(q.timestamp).toISOString(),
          };
        }
      });

      setAttendanceMap(map);
    } catch (err) {
      console.error('Exception fetching attendance:', err);
    }
  }, []);

  // Master refresh data
  const refreshData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const siteList = await fetchSites();
    const activeSite = currentSite || siteList[0];
    if (activeSite) {
      await Promise.all([
        fetchLaborers(activeSite.id),
        fetchAttendance(activeSite.id, selectedDate),
      ]);
    } else {
      setLaborers([]);
      setAllLaborers([]);
      setAttendanceMap({});
    }
    setIsLoading(false);
  }, [user, currentSite, selectedDate, fetchSites, fetchLaborers, fetchAttendance]);

  useEffect(() => {
    refreshData();
  }, [user, refreshData]);

  useEffect(() => {
    if (currentSite) {
      fetchLaborers(currentSite.id);
      fetchAttendance(currentSite.id, selectedDate);
    } else {
      setLaborers([]);
      setAllLaborers([]);
      setAttendanceMap({});
    }
  }, [currentSite, selectedDate, fetchLaborers, fetchAttendance]);

  // Statistics calculation
  const stats: SiteStats = useMemo(() => {
    const totalLaborers = allLaborers.length;
    const activeLaborers = laborers.length;

    let presentToday = 0;
    let absentToday = 0;
    let halfDayToday = 0;
    let leaveToday = 0;
    let estimatedDailyWages = 0;

    laborers.forEach((lab) => {
      const att = attendanceMap[lab.id];
      if (att) {
        if (att.status === 'present') {
          presentToday++;
          estimatedDailyWages += Number(att.wage_amount) || calculateWageForStatus(lab.daily_wage, 'present');
        } else if (att.status === 'half_day') {
          halfDayToday++;
          estimatedDailyWages += Number(att.wage_amount) || calculateWageForStatus(lab.daily_wage, 'half_day');
        } else if (att.status === 'absent') {
          absentToday++;
        } else if (att.status === 'leave') {
          leaveToday++;
        }
      }
    });

    const markedCount = presentToday + absentToday + halfDayToday + leaveToday;
    const unmarkedToday = Math.max(0, activeLaborers - markedCount);
    const completionPercentage = activeLaborers > 0 ? Math.round((markedCount / activeLaborers) * 100) : 0;

    return {
      totalLaborers,
      activeLaborers,
      presentToday,
      absentToday,
      halfDayToday,
      leaveToday,
      unmarkedToday,
      completionPercentage,
      estimatedDailyWages,
    };
  }, [allLaborers, laborers, attendanceMap]);

  // Sync action
  const syncNow = async (): Promise<{ successCount: number; failedCount: number }> => {
    if (isSyncing || !isOnline) {
      return { successCount: 0, failedCount: 0 };
    }
    setIsSyncing(true);
    try {
      const res = await syncPendingAttendance(supabase, user?.id);
      if (currentSite) {
        await fetchAttendance(currentSite.id, selectedDate);
      }
      return { successCount: res.successCount, failedCount: res.failedCount };
    } finally {
      setIsSyncing(false);
    }
  };

  // Create new site (Any authenticated supervisor)
  const createNewSite = async (name: string, address: string) => {
    try {
      const { data, error } = await supabase
        .from('construction_sites')
        .insert({
          name: name.trim(),
          address: address.trim(),
          is_active: true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const newSite = data as ConstructionSite;

      // Assign creator to site_members
      if (user?.id) {
        await supabase.from('site_members').upsert({
          site_id: newSite.id,
          user_id: user.id,
          role: 'admin',
        }, { onConflict: 'site_id,user_id' });
      }

      setSites((prev) => [...prev, newSite]);
      setCurrentSite(newSite);
      return { success: true, site: newSite };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create site';
      return { success: false, error: msg };
    }
  };

  // Edit site details
  const updateSite = async (siteId: string, name: string, address: string) => {
    try {
      const { error } = await supabase
        .from('construction_sites')
        .update({
          name: name.trim(),
          address: address.trim(),
        })
        .eq('id', siteId);

      if (error) throw error;

      setSites((prev) =>
        prev.map((s) => (s.id === siteId ? { ...s, name: name.trim(), address: address.trim() } : s))
      );
      if (currentSite?.id === siteId) {
        setCurrentSiteState({ ...currentSite, name: name.trim(), address: address.trim() });
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update site';
      return { success: false, error: msg };
    }
  };

  // Delete site
  const deleteSite = async (siteId: string) => {
    try {
      const { error } = await supabase
        .from('construction_sites')
        .delete()
        .eq('id', siteId);

      if (error) throw error;

      const remaining = sites.filter((s) => s.id !== siteId);
      setSites(remaining);
      if (currentSite?.id === siteId) {
        const next = remaining.length > 0 ? remaining[0] : null;
        setCurrentSite(next);
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete site';
      return { success: false, error: msg };
    }
  };

  // Delete laborer
  const deleteLaborer = async (laborerId: string) => {
    try {
      const { error } = await supabase
        .from('laborers')
        .delete()
        .eq('id', laborerId);

      if (error) throw error;

      setAllLaborers((prev) => prev.filter((l) => l.id !== laborerId));
      setLaborers((prev) => prev.filter((l) => l.id !== laborerId));
      setAttendanceMap((prev) => {
        const next = { ...prev };
        delete next[laborerId];
        return next;
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete laborer';
      return { success: false, error: msg };
    }
  };

  // Quick update laborer wage
  const updateLaborerWage = async (laborerId: string, newWage: number) => {
    try {
      const { error } = await supabase
        .from('laborers')
        .update({ daily_wage: newWage })
        .eq('id', laborerId);

      if (error) throw error;

      setAllLaborers((prev) =>
        prev.map((l) => (l.id === laborerId ? { ...l, daily_wage: newWage } : l))
      );
      setLaborers((prev) =>
        prev.map((l) => (l.id === laborerId ? { ...l, daily_wage: newWage } : l))
      );

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update wage';
      return { success: false, error: msg };
    }
  };

  // Delete / Clear single attendance record
  const deleteAttendanceRecord = async (laborerId: string, date: string) => {
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('laborer_id', laborerId)
        .eq('attendance_date', date);

      if (error) throw error;

      setAttendanceMap((prev) => {
        const next = { ...prev };
        delete next[laborerId];
        return next;
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove attendance record';
      return { success: false, error: msg };
    }
  };

  return (
    <SiteContext.Provider
      value={{
        sites,
        currentSite,
        setCurrentSite,
        laborers,
        allLaborers,
        selectedDate,
        setSelectedDate,
        attendanceMap,
        stats,
        isLoading,
        isSyncing,
        isOnline,
        pendingQueue,
        refreshData,
        syncNow,
        createNewSite,
        updateSite,
        deleteSite,
        deleteLaborer,
        updateLaborerWage,
        deleteAttendanceRecord,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = (): SiteContextType => {
  const ctx = useContext(SiteContext);
  if (!ctx) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return ctx;
};
