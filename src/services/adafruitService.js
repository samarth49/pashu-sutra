/**
 * Adafruit IO Service
 * Handles MQTT connection and HTTP API calls to fetch live
 * and historical data from Adafruit IO feeds.
 */

import Paho from 'paho-mqtt';
import { ADAFRUIT_IO, FEEDS } from '../config/constants';
import { saveSensorData } from './databaseService';

// Helper to get unit
const getUnit = (feed) => {
  if (feed.includes('temp')) return '°C';
  if (feed.includes('bpm')) return 'BPM';
  if (feed.includes('batt')) return '%';
  if (feed.includes('hum')) return '%';
  return '';
};

// ─── MQTT Client (Singleton) ────────────────────────────────────────

let mqttClient = null;
let onDataCallback = null;

/**
 * Initialize and connect to Adafruit IO via MQTT over WebSockets.
 * @param {Function} onData - callback receiving { feed, value } objects
 * @param {Function} onStatusChange - callback receiving connection status string
 */
export function connectMQTT(onData, onStatusChange) {
  onDataCallback = onData;

  const clientId = 'PashuSutra_' + Math.random().toString(16).slice(2);

  mqttClient = new Paho.Client(
    'wss://io.adafruit.com/mqtt/',
    clientId
  );

  mqttClient.onConnectionLost = (responseObject) => {
    console.warn('[MQTT] Connection lost:', responseObject.errorMessage);
    onStatusChange?.('disconnected');
    // Auto-reconnect after a delay
    setTimeout(() => connectMQTT(onData, onStatusChange), 5000);
  };

  mqttClient.onMessageArrived = (message) => {
    const topic = message.destinationName;
    const value = message.payloadString;
    const feedName = topic.split('/').pop(); // e.g. "gpsloc"
    console.log(`[MQTT] ${feedName}: ${value}`);

    // Parse payload (expecting JSON now: { id: "cow1", rfid: "RFID-001", val: 38.5 })
    let parsedValue = value;
    let animalId = 'Unknown';
    let rfidTag = 'N/A';

    try {
      const json = JSON.parse(value);
      if (json.val !== undefined) parsedValue = json.val;
      if (json.id) animalId = json.id;
      if (json.rfid) rfidTag = json.rfid;
    } catch (e) {
      // Fallback for old plain text format
    }

    // Save to Firestore (Persistence)
    saveSensorData({
      animalId,
      rfidTag,
      type: feedName,
      value: parsedValue,
      unit: getUnit(feedName),
    });

    onDataCallback?.({ feed: feedName, value: parsedValue, animalId, rfidTag, timestamp: new Date() });
  };

  mqttClient.connect({
    useSSL: true,
    userName: ADAFRUIT_IO.USERNAME,
    password: ADAFRUIT_IO.AIO_KEY,
    onSuccess: () => {
      console.log('[MQTT] Connected to Adafruit IO');
      onStatusChange?.('connected');
      // Subscribe to all feeds
      Object.values(FEEDS).forEach((feed) => {
        const topic = `${ADAFRUIT_IO.USERNAME}/feeds/${feed}`;
        mqttClient.subscribe(topic);
        console.log(`[MQTT] Subscribed: ${topic}`);
      });
    },
    onFailure: (err) => {
      console.error('[MQTT] Connection failed:', err.errorMessage);
      onStatusChange?.('error');
    },
  });
}

/**
 * Disconnect the MQTT client gracefully.
 */
export function disconnectMQTT() {
  if (mqttClient?.isConnected()) {
    mqttClient.disconnect();
  }
}

// ─── HTTP API (for historical / last-value data) ─────────────────────

const headers = {
  'X-AIO-Key': ADAFRUIT_IO.AIO_KEY,
  'Content-Type': 'application/json',
};

/**
 * Fetch the last N data points for a specific feed.
 * @param {string} feedKey - e.g. "gpsloc"
 * @param {number} limit - number of data points
 * @returns {Promise<Array>} Array of { id, value, created_at }
 */
export async function fetchFeedData(feedKey, limit = 50) {
  try {
    const url = `${ADAFRUIT_IO.HTTP_BASE}/${ADAFRUIT_IO.USERNAME}/feeds/${feedKey}/data?limit=${limit}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`[Adafruit] Error fetching ${feedKey}:`, error);
    return [];
  }
}

/**
 * Fetch the latest value for a feed.
 * @param {string} feedKey
 * @returns {Promise<Object|null>} Latest data point or null
 */
export async function fetchLatestValue(feedKey) {
  try {
    const url = `${ADAFRUIT_IO.HTTP_BASE}/${ADAFRUIT_IO.USERNAME}/feeds/${feedKey}/data/last`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`[Adafruit] Error fetching latest ${feedKey}:`, error);
    return null;
  }
}
