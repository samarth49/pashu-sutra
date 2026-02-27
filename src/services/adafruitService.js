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
  console.log('[MQTT] connectMQTT called.');
  onDataCallback = onData;

  // Guard: if already connected, don't start another
  if (mqttClient && mqttClient.isConnected()) {
    console.log('[MQTT] Already connected. Skipping initialization.');
    return;
  }

  const clientId = 'PashuSutra_' + Math.random().toString(16).slice(2);
  console.log('[MQTT] Creating new client with ID:', clientId);

  mqttClient = new Paho.Client(
    'wss://io.adafruit.com/mqtt',
    clientId
  );

  mqttClient.onConnectionLost = (responseObject) => {
    if (responseObject.errorCode !== 0) {
      console.warn('[MQTT] Connection lost:', responseObject.errorMessage);
      onStatusChange?.('disconnected');
      // Auto-reconnect after a delay
      setTimeout(() => connectMQTT(onData, onStatusChange), 5000);
    }
  };

  mqttClient.onMessageArrived = (message) => {
    const topic = message.destinationName;
    const value = message.payloadString;
    const feedName = topic.split('/').pop();
    
    // VERY LOUD LOGGING for debugging
    console.log('-------------------------------------------');
    console.log(`📡 [MQTT RECEIVED] Topic: ${topic}`);
    console.log(`📦 [MQTT VALUE]: ${value}`);
    console.log('-------------------------------------------');

    let parsedValue = value;
    let animalId = 'Unknown';
    let rfidTag = 'N/A';

    try {
      const json = JSON.parse(value);
      if (json.val !== undefined) parsedValue = json.val;
      if (json.id) animalId = json.id;
      if (json.rfid) rfidTag = json.rfid;
      console.log(`[MQTT Debug] JSON Parsed: id=${animalId}, val=${parsedValue}`);
    } catch (e) {
      // ─── Support for "Livestock Record" multi-line format ──────────
      if (value.includes('ID:')) {
        const idMatch = value.match(/ID:\s*([^\s\n\r]+)/i);
        if (idMatch) animalId = idMatch[1].trim();
        
        const rfidMatch = value.match(/RFID:\s*([^\s\n\r]+)/i);
        if (rfidMatch) rfidTag = rfidMatch[1].trim();
        else rfidTag = animalId;

        const valMatch = value.match(/(\d+\.?\d*)/);
        if (valMatch) parsedValue = valMatch[0];
        
        console.log(`[MQTT Debug] Record Parsed: id=${animalId}, val=${parsedValue}`);
      } else {
        console.log(`[MQTT Debug] Plain text used: ${value}`);
      }
    }

    // Save for persistence
    saveSensorData({
      animalId,
      rfidTag,
      type: feedName,
      value: parsedValue,
      unit: getUnit(feedName),
    });

    // Send to UI
    onDataCallback?.({ 
      feed: feedName, 
      value: parsedValue, 
      animalId, 
      rfidTag, 
      timestamp: new Date() 
    });
  };

  mqttClient.connect({
    useSSL: true,
    userName: ADAFRUIT_IO.USERNAME,
    password: ADAFRUIT_IO.AIO_KEY,
    keepAliveInterval: 60,
    cleanSession: true,
    onSuccess: () => {
      console.log('[MQTT] Success: Connected to Adafruit IO');
      onStatusChange?.('connected');
      Object.values(FEEDS).forEach((feed) => {
        const topic = `${ADAFRUIT_IO.USERNAME}/feeds/${feed}`;
        mqttClient.subscribe(topic);
        console.log(`[MQTT] Subscribed to topic: ${topic}`);
      });
    },
    onFailure: (err) => {
      console.error('[MQTT] Connection failed:', err.errorMessage);
      onStatusChange?.('error');
    },
  });
}

export function disconnectMQTT() {
  if (mqttClient) {
    if (mqttClient.isConnected()) {
      mqttClient.disconnect();
    }
    mqttClient = null;
  }
}

const headers = {
  'X-AIO-Key': ADAFRUIT_IO.AIO_KEY,
  'Content-Type': 'application/json',
};

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
