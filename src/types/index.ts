export type UserRole = 'admin' | 'supervisor';

export type LaborCategory =
  | 'Mason'
  | 'Helper'
  | 'Electrician'
  | 'Plumber'
  | 'Carpenter'
  | 'Painter'
  | 'Welder'
  | 'Tile Worker'
  | 'Bar Bender'
  | 'Supervisor'
  | 'Other';

export const LABOR_CATEGORIES: LaborCategory[] = [
  'Mason',
  'Helper',
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'Welder',
  'Tile Worker',
  'Bar Bender',
  'Supervisor',
  'Other',
];

export interface Profile {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface ConstructionSite {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SiteMember {
  id: string;
  site_id: string;
  user_id: string;
  role: UserRole;
  created_at?: string;
  profile?: Profile;
}

export interface Laborer {
  id: string;
  site_id: string;
  name: string;
  phone?: string;
  category: LaborCategory;
  daily_wage: number;
  is_active: boolean;
  photo_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type AttendanceStatus = 'present' | 'half_day' | 'absent' | 'leave';

export interface AttendanceRecord {
  id: string;
  site_id: string;
  laborer_id: string;
  attendance_date: string; // 'YYYY-MM-DD'
  status: AttendanceStatus;
  wage_amount: number;
  recorded_by?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  laborer?: Laborer;
}

export interface AttendanceAuditLog {
  id: string;
  attendance_id: string;
  site_id: string;
  laborer_id: string;
  attendance_date: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_status?: AttendanceStatus;
  new_status?: AttendanceStatus;
  old_wage_amount?: number;
  new_wage_amount?: number;
  changed_by?: string;
  changed_at: string;
  reason?: string;
  changer_name?: string;
  laborer_name?: string;
}

export interface PendingAttendanceSync {
  tempId: string;
  site_id: string;
  laborer_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  wage_amount: number;
  notes?: string;
  timestamp: number;
  error?: string;
}

export interface SiteStats {
  totalLaborers: number;
  activeLaborers: number;
  presentToday: number;
  absentToday: number;
  halfDayToday: number;
  leaveToday: number;
  unmarkedToday: number;
  completionPercentage: number;
  estimatedDailyWages: number;
}
