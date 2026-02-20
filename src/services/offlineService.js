/**
 * offlineService.js
 * Offline-first write queue using AsyncStorage.
 * When offline → enqueue writes locally.
 * When back online → flush queue to Firestore.
 *
 * Uses a fetch-based connectivity check (no external netinfo package needed).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMilkLog, addPregnancy, addVaccination } from './databaseService';

const QUEUE_KEY = '@pashusutra_offline_queue';

// ─── Connectivity check ──────────────────────────────────────────────

/**
 * Returns true if we can reach the internet, false otherwise.
 * Pings Google's generate_204 endpoint (< 1 KB, instant).
 */
export async function isOnline() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://clients3.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

// ─── Queue management ────────────────────────────────────────────────

async function getQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue) {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[Offline] saveQueue error:', e);
  }
}

/**
 * Enqueue a write operation for later sync.
 */
export async function enqueue(collectionName, data) {
  const queue = await getQueue();
  queue.push({ collection: collectionName, data, queuedAt: new Date().toISOString() });
  await saveQueue(queue);
  console.log(`[Offline] Queued ${collectionName}. Queue size: ${queue.length}`);
}

/**
 * Flush all queued writes to Firestore.
 * Returns count of successfully synced items.
 */
export async function flushQueue() {
  const queue = await getQueue();
  if (queue.length === 0) return 0;

  console.log(`[Offline] Flushing ${queue.length} items...`);
  const failed = [];
  let synced = 0;

  for (const item of queue) {
    try {
      switch (item.collection) {
        case 'milk':        await addMilkLog(item.data);     break;
        case 'pregnancy':   await addPregnancy(item.data);   break;
        case 'vaccination': await addVaccination(item.data); break;
        default: break;
      }
      synced++;
    } catch (e) {
      console.error('[Offline] Failed to sync item:', item, e);
      failed.push(item);
    }
  }

  await saveQueue(failed);
  console.log(`[Offline] Done. Synced: ${synced}, Failed: ${failed.length}`);
  return synced;
}

/**
 * Offline-aware wrapper: writes to Firestore if online, else queues.
 */
export async function offlineWrite(collectionName, data, writeFn) {
  const online = await isOnline();
  if (online) {
    const result = await writeFn(data);
    return { saved: !!result, offline: false };
  }
  await enqueue(collectionName, data);
  return { saved: true, offline: true };
}

/**
 * Returns count of items waiting to be synced.
 */
export async function getPendingCount() {
  const q = await getQueue();
  return q.length;
}
