import { SupabaseClient } from '@supabase/supabase-js';
import { PendingAttendanceSync } from '../types';

const QUEUE_STORAGE_KEY = 'labortrack_pending_attendance_sync';

type QueueListener = (queue: PendingAttendanceSync[]) => void;
const listeners: Set<QueueListener> = new Set();

export function getPendingQueue(): PendingAttendanceSync[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingAttendanceSync[];
  } catch (e) {
    console.error('Failed to read offline attendance queue:', e);
    return [];
  }
}

function saveQueue(queue: PendingAttendanceSync[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    notifyListeners();
  } catch (e) {
    console.error('Failed to save offline attendance queue:', e);
  }
}

export function subscribePendingQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  listener(getPendingQueue());
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  const q = getPendingQueue();
  listeners.forEach((fn) => {
    try {
      fn(q);
    } catch (err) {
      console.error('Error in queue listener:', err);
    }
  });
}

/**
 * Add records to pending sync queue. Merges updates if laborer+date already exists.
 */
export function enqueueAttendance(records: Omit<PendingAttendanceSync, 'tempId' | 'timestamp'>[]): PendingAttendanceSync[] {
  const currentQueue = getPendingQueue();
  const newItems: PendingAttendanceSync[] = [];

  records.forEach((rec) => {
    // Check if an entry for this laborer & date already exists in the queue
    const existingIndex = currentQueue.findIndex(
      (q) => q.laborer_id === rec.laborer_id && q.attendance_date === rec.attendance_date
    );

    const fullRecord: PendingAttendanceSync = {
      ...rec,
      tempId: existingIndex >= 0 ? currentQueue[existingIndex].tempId : `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
    };

    if (existingIndex >= 0) {
      currentQueue[existingIndex] = fullRecord;
    } else {
      currentQueue.push(fullRecord);
    }
    newItems.push(fullRecord);
  });

  saveQueue(currentQueue);
  return newItems;
}

/**
 * Remove an item from the queue
 */
export function dequeueAttendance(tempId: string): void {
  const queue = getPendingQueue().filter((item) => item.tempId !== tempId);
  saveQueue(queue);
}

/**
 * Clear all pending sync records
 */
export function clearPendingQueue(): void {
  saveQueue([]);
}

export interface SyncResult {
  successCount: number;
  failedCount: number;
  remainingQueue: PendingAttendanceSync[];
  errors: string[];
}

/**
 * Synchronize all pending records with Supabase.
 * Uses onConflict on (laborer_id, attendance_date) to prevent duplicates.
 */
export async function syncPendingAttendance(
  supabase: SupabaseClient,
  userId?: string
): Promise<SyncResult> {
  const queue = getPendingQueue();
  if (queue.length === 0) {
    return { successCount: 0, failedCount: 0, remainingQueue: [], errors: [] };
  }

  const successfullySyncedIds: string[] = [];
  const errors: string[] = [];

  for (const item of queue) {
    try {
      const payload: Record<string, unknown> = {
        site_id: item.site_id,
        laborer_id: item.laborer_id,
        attendance_date: item.attendance_date,
        status: item.status,
        wage_amount: item.wage_amount,
        notes: item.notes || '',
      };

      if (userId) {
        payload.recorded_by = userId;
      }

      const { error } = await supabase
        .from('attendance')
        .upsert(payload, {
          onConflict: 'laborer_id,attendance_date',
        });

      if (error) {
        throw error;
      }

      successfullySyncedIds.push(item.tempId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown sync failure';
      errors.push(message);
      // Update item with error in queue
      item.error = message;
    }
  }

  // Filter out synced items
  const remaining = queue.filter((item) => !successfullySyncedIds.includes(item.tempId));
  saveQueue(remaining);

  return {
    successCount: successfullySyncedIds.length,
    failedCount: remaining.length,
    remainingQueue: remaining,
    errors,
  };
}
