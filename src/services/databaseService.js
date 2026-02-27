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
    let q = query(collection(db, ANIMALS_COL), where('id', '==', identifier));
    let snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      q = query(collection(db, ANIMALS_COL), where('rfid', '==', identifier));
      snapshot = await getDocs(q);
    }

    if (!snapshot.empty) {
      return { docId: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
  } catch (e) {
    console.error('[DB] Error fetching animal:', e);
    return null;
  }
}

/**
 * Get all animals from Firestore.
 */
export async function getAnimals() {
  try {
    const q = query(collection(db, ANIMALS_COL), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('[DB] Error fetching animals:', e);
    return [];
  }
}

/**
 * Add a new animal to Firestore.
 */
export async function addAnimal(animal) {
  try {
    const record = { ...animal, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, ANIMALS_COL), record);
    return { docId: docRef.id, ...record };
  } catch (e) {
    console.error('[DB] Error adding animal:', e);
    return null;
  }
}

/**
 * Delete an animal from Firestore by document ID.
 */
export async function deleteAnimal(docId) {
  try {
    await deleteDoc(doc(db, ANIMALS_COL, docId));
    return true;
  } catch (e) {
    console.error('[DB] Error deleting animal:', e);
    return false;
  }
}

/**
 * Fetch the most recent GPS record for a given animal.
 * Returns { latitude, longitude } or null if not found.
 */
export async function getLastGPS(animalId) {
  try {
    const q = query(
      collection(db, SENSOR_DATA_COL),
      where('animalId', '==', animalId),
      where('type', '==', 'gpsloc'),
      orderBy('created_at', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const raw = snapshot.docs[0].data().value;
    const parts = String(raw).split(',');
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
    }
    return null;
  } catch (e) {
    console.error('[DB] Error fetching last GPS:', e);
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

// ─── Milk Production Log (Firestore) ────────────────────────────────

const MILK_COL = 'milk_logs';
const PREGNANCY_COL = 'pregnancies';

/**
 * Add a milk log entry.
 * @param {Object} entry - { animalId, date, session, litres, notes }
 */
export async function addMilkLog(entry) {
  try {
    const record = { ...entry, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, MILK_COL), record);
    return { id: docRef.id, ...record };
  } catch (e) {
    console.error('[DB] Error adding milk log:', e);
    return null;
  }
}

/**
 * Get milk logs for a specific animal, newest first.
 * @param {string} animalId
 * @param {number} limitNum
 */
export async function getMilkLogs(animalId, limitNum = 60) {
  try {
    const q = query(
      collection(db, MILK_COL),
      where('animalId', '==', animalId),
      limit(limitNum)
    );
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort newest first in-memory (avoids needing a composite Firestore index)
    return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    console.error('[DB] Error fetching milk logs:', e);
    return [];
  }
}

/**
 * Delete a milk log entry.
 */
export async function deleteMilkLog(docId) {
  try {
    await deleteDoc(doc(db, MILK_COL, docId));
    return true;
  } catch (e) {
    console.error('[DB] Error deleting milk log:', e);
    return false;
  }
}

// ─── Pregnancy Tracker (Firestore) ──────────────────────────────────

/** Gestation periods in days per species */
export const GESTATION_DAYS = {
  cow: 283,
  buffalo: 310,
  goat: 150,
  sheep: 147,
};

/**
 * Add a pregnancy record.
 * @param {Object} record - { animalId, species, matingDate, method, notes }
 */
export async function addPregnancy(record) {
  try {
    const days = GESTATION_DAYS[record.species?.toLowerCase()] || 283;
    const mating = new Date(record.matingDate);
    const due = new Date(mating.getTime() + days * 24 * 60 * 60 * 1000);
    const newRecord = {
      ...record,
      gestationDays: days,
      expectedDelivery: due.toISOString().split('T')[0], // YYYY-MM-DD
      status: 'pregnant',
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, PREGNANCY_COL), newRecord);
    return { id: docRef.id, ...newRecord };
  } catch (e) {
    console.error('[DB] Error adding pregnancy:', e);
    return null;
  }
}

/**
 * Get pregnancy records for an animal.
 */
export async function getPregnancies(animalId) {
  try {
    const q = query(
      collection(db, PREGNANCY_COL),
      where('animalId', '==', animalId)
    );
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort newest first in-memory (avoids needing a composite Firestore index)
    return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    console.error('[DB] Error fetching pregnancies:', e);
    return [];
  }
}

/**
 * Update pregnancy status (delivered / aborted).
 */
export async function updatePregnancyStatus(docId, status, deliveryDate = null) {
  try {
    const updates = { status };
    if (deliveryDate) updates.actualDelivery = deliveryDate;
    await updateDoc(doc(db, PREGNANCY_COL, docId), updates);
    return true;
  } catch (e) {
    console.error('[DB] Error updating pregnancy:', e);
    return false;
  }
}

/**
 * Delete a pregnancy record.
 */
export async function deletePregnancy(docId) {
  try {
    await deleteDoc(doc(db, PREGNANCY_COL, docId));
    return true;
  } catch (e) {
    console.error('[DB] Error deleting pregnancy:', e);
    return false;
  }
}

// ─── Core Temperature Estimator ─────────────────────────────────────
//
// Linear Regression trained on 1030 rows:
//   30 seed rows (farmer-collected) + 1000 synthetic (augmented)
// Source: scripts/generate_seed_dataset.py → scripts/expand_synthetic.py
// Perf : R² ≈ 0.97 | MAE ≈ 0.08°C

/**
 * Estimate core (rectal-equivalent) body temperature from neck sensor.
 * @param {number} neckTemp    - DS18B20 neck surface reading (°C)
 * @param {number} ambientTemp - ambient temperature (°C), default 28
 * @param {number} hour        - hour of day 0–23 (default: current)
 * @param {number} breed       - 0 = indigenous, 1 = HF/crossbreed
 * @returns {number} estimated core temperature (°C), clamped 37.5–41.5
 */
export function estimateCoreTemp(
  neckTemp,
  ambientTemp = 28,
  hour = new Date().getHours(),
  breed = 0
) {
  // Actual coefficients from LinearRegression on 1030-row dataset
  // R² = 0.9282 | MAE = 0.1718°C
  const core =
    0.918974 * neckTemp +
   -0.024912 * ambientTemp +
   -0.004334 * hour +
    0.141824 * breed +
    5.287451;
  return parseFloat(Math.min(Math.max(core, 37.5), 41.5).toFixed(2));
}

/**
 * Classify health status from estimated core temperature.
 * @param {number} coreTemp
 * @returns {{ status: string, color: string, alert: boolean }}
 */
export function classifyTemperature(coreTemp) {
  if (coreTemp < 38.0) return { status: 'Low',        color: '#0288D1', alert: false };
  if (coreTemp < 38.5) return { status: 'Normal',     color: '#2E7D32', alert: false };
  if (coreTemp < 39.5) return { status: 'Mild',       color: '#FF8F00', alert: false };
  if (coreTemp < 40.5) return { status: 'Fever',      color: '#E53935', alert: true  };
  return                      { status: 'High Fever',  color: '#B71C1C', alert: true  };
}
