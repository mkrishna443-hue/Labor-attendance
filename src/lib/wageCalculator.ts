import { AttendanceStatus } from '../types';

/**
 * Calculates payable wage for an attendance status based on laborer's daily wage.
 * Default rules:
 * - Present = 1.0 * daily_wage
 * - Half Day = 0.5 * daily_wage
 * - Absent = 0.0
 * - Leave = 0.0
 */
export function calculateWageForStatus(dailyWage: number, status: AttendanceStatus): number {
  const wage = Number(dailyWage) || 0;
  switch (status) {
    case 'present':
      return Math.round(wage * 100) / 100;
    case 'half_day':
      return Math.round(wage * 0.5 * 100) / 100;
    case 'absent':
    case 'leave':
    default:
      return 0;
  }
}

/**
 * Calculates effective multiplier for an attendance status.
 */
export function getStatusMultiplier(status: AttendanceStatus): number {
  switch (status) {
    case 'present':
      return 1.0;
    case 'half_day':
      return 0.5;
    case 'absent':
    case 'leave':
    default:
      return 0.0;
  }
}

/**
 * Format currency in Indian Rupees (₹)
 */
export function formatCurrency(amount: number): string {
  const num = Math.round(Number(amount) || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format date in localized Indian format (e.g. "16 Oct 2026")
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
