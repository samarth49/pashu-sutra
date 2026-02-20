/**
 * Database Service
 * - Vaccinations: stored in Firebase Firestore (cloud-synced)
 * - Alerts: stored in AsyncStorage (local, fast)
 *
 * Vaccination records include RFID tag for animal identification.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
} from 'firebase/firestore';

// ─── Storage Keys (Local) ────────────────────────────────────────────

const KEYS = {
  ALERTS: '@pashusutra_alerts',
  SENT_REMINDERS: '@pashusutra_sent_reminders',
};

// ─── Firestore Collection ────────────────────────────────────────────

const VACCINATIONS_COL = 'vaccinations';
const ANIMALS_COL = 'animals';
const SENSOR_DATA_COL = 'sensor_data';

// ─── Vaccination Records (Firestore) ─────────────────────────────────

/**
 * Get all vaccination records from Firestore.
 * @returns {Promise<Array>} List of vaccination objects.
 */
export async function getVaccinations() {
  try {
    const q = query(collection(db, VACCINATIONS_COL), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (e) {
    console.error('[DB] Error fetching vaccinations:', e);
    return [];
  }
}

/**
 * Add a new vaccination record to Firestore.
 * @param {Object} record - { animalId, vaccineName, date, notes, status, rfidTag }
 * @returns {Promise<Object>} The saved record with Firestore ID.
 */
export async function addVaccination(record) {
  try {
    const newRecord = {
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      ...record,
    };
    const docRef = await addDoc(collection(db, VACCINATIONS_COL), newRecord);
    return { id: docRef.id, ...newRecord };
  } catch (e) {
    console.error('[DB] Error adding vaccination:', e);
    return null;
  }
}

/**
 * Update an existing vaccination record in Firestore.
 * @param {string} id - Firestore document ID
 * @param {Object} updates
 * @returns {Promise<boolean>}
 */
export async function updateVaccination(id, updates) {
  try {
    const docRef = doc(db, VACCINATIONS_COL, id);
    await updateDoc(docRef, updates);
    return true;
  } catch (e) {
    console.error('[DB] Error updating vaccination:', e);
    return false;
  }
}

/**
 * Delete a vaccination record from Firestore.
 * @param {string} id - Firestore document ID
 */
export async function deleteVaccination(id) {
  try {
    await deleteDoc(doc(db, VACCINATIONS_COL, id));
  } catch (e) {
    console.error('[DB] Error deleting vaccination:', e);
  }
}

// ─── Animal Registry (Firestore) ──────────────────────────────────────

/**
 * Get animal details by ID or RFID.
 * @param {string} identifier - Animal ID or RFID tag
 */
export async function getAnimal(identifier) {
  try {
    // Try by ID first
    let q = query(collection(db, ANIMALS_COL), where('id', '==', identifier));
    let snapshot = await getDocs(q);
    
    // If not found, try by RFID
    if (snapshot.empty) {
      q = query(collection(db, ANIMALS_COL), where('rfid', '==', identifier));
      snapshot = await getDocs(q);
    }

    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
  } catch (e) {
    console.error('[DB] Error fetching animal:', e);
    return null;
  }
}

// ─── Sensor Data History (Firestore) ─────────────────────────────────

/**
 * Save a sensor reading to Firestore.
 * @param {Object} data - { animalId, type, value, unit }
 */
export async function saveSensorData(data) {
  try {
    await addDoc(collection(db, SENSOR_DATA_COL), {
      ...data,
      created_at: new Date().toISOString(),
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error('[DB] Error saving sensor data:', e);
  }
}

/**
 * Get sensor history for a specific animal.
 * @param {string} animalId 
 * @param {string} type - 'temperature', 'bpm', etc.
 * @param {number} limitNum 
 */
export async function getSensorHistory(animalId, type, limitNum = 50) {
  try {
    const q = query(
      collection(db, SENSOR_DATA_COL),
      where('animalId', '==', animalId),
      where('type', '==', type),
      orderBy('created_at', 'desc'),
      limit(limitNum)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('[DB] Error fetching sensor history:', e);
    return [];
  }
}

// ─── Alert Logs (AsyncStorage — local) ──────────────────────────────

async function getList(key) {
  try {
    const json = await AsyncStorage.getItem(key);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error(`[DB] Error reading ${key}:`, e);
    return [];
  }
}

async function saveList(key, data) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`[DB] Error saving ${key}:`, e);
  }
}

/**
 * Get all alert logs.
 * @returns {Promise<Array>}
 */
export async function getAlerts() {
  return getList(KEYS.ALERTS);
}

/**
 * Log a new alert (e.g. geofence breach, health warning).
 * @param {Object} alert - { type, message, data, rfidTag }
 * @returns {Promise<Object>}
 */
export async function addAlert(alert) {
  const list = await getList(KEYS.ALERTS);
  const newAlert = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    read: false,
    ...alert,
  };
  list.unshift(newAlert);
  if (list.length > 100) list.length = 100;
  await saveList(KEYS.ALERTS, list);
  return newAlert;
}

/**
 * Mark an alert as read.
 * @param {string} id
 */
export async function markAlertRead(id) {
  const list = await getList(KEYS.ALERTS);
  const alert = list.find((a) => a.id === id);
  if (alert) {
    alert.read = true;
    await saveList(KEYS.ALERTS, list);
  }
}

/**
 * Clear all alerts.
 */
export async function clearAlerts() {
  await saveList(KEYS.ALERTS, []);
}

// ─── Sent Reminder Tracking ─────────────────────────────────────────

/**
 * Check if a reminder has already been sent.
 * @param {string} key - Unique key like "vaccId_2days"
 * @returns {Promise<boolean>}
 */
export async function isReminderSent(key) {
  const sent = await getList(KEYS.SENT_REMINDERS);
  return sent.includes(key);
}

/**
 * Mark a reminder as sent.
 * @param {string} key
 */
export async function markReminderSent(key) {
  const sent = await getList(KEYS.SENT_REMINDERS);
  if (!sent.includes(key)) {
    sent.push(key);
    await saveList(KEYS.SENT_REMINDERS, sent);
  }
}
