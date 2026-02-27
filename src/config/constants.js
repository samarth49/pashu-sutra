/**
 * Application-wide constants and configuration.
 * Update these values with your actual Adafruit IO credentials.
 */

// ─── Adafruit IO Configuration ───────────────────────────────────────
export const ADAFRUIT_IO = {
  USERNAME: '',
  AIO_KEY: '',
  BROKER: 'io.adafruit.com',
  PORT: 443, // WebSocket Secure
  HTTP_BASE: 'https://io.adafruit.com/api/v2',
};

// ─── Feed Names (must match your Adafruit IO dashboard) ──────────────
export const FEEDS = {
  GPS_LOCATION: 'gpsloc',
  GEOFENCE: 'geofence',
  BATTERY: 'battery',
  BPM: 'bpm',
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
};

// ─── Health Thresholds ───────────────────────────────────────────────
export const HEALTH_THRESHOLDS = {
  TEMPERATURE_HIGH: 39.5,   // °C — above this is fever for cattle
  TEMPERATURE_LOW: 36.0,    // °C — below this is hypothermia
  BPM_HIGH: 100,            // BPM — above this is tachycardia
  BPM_LOW: 30,              // BPM — below this is bradycardia
  HUMIDITY_HIGH: 85,        // % — above this is uncomfortable
  BATTERY_LOW: 20,          // % — below this is critical
};

// ─── Geofence Defaults ───────────────────────────────────────────────
export const GEOFENCE_DEFAULTS = {
  LATITUDE: 18.47011077655484,
  LONGITUDE: 73.86976837618745,
  RADIUS_METERS: 50,
};

//─── Twilio Configuration (direct API — for demo/college project) ────
export const TWILIO_CONFIG = {
  ACCOUNT_SID: '',
  AUTH_TOKEN: '',
  FROM_PHONE: '',   // Twilio WhatsApp Sandbox
  ALERT_PHONE: '', // Must have joined sandbox first
};


// ─── App Theme Colors (Animal Husbandry / Nature) ────────────────────
export const COLORS = {
  primary: '#2E7D32',       // Forest Green
  primaryDark: '#1B5E20',
  primaryLight: '#A5D6A7',
  accent: '#FF8F00',        // Warm Amber
  background: '#F1F8E9',    // Light green tint
  surface: '#FFFFFF',
  textPrimary: '#212121',
  textSecondary: '#757575',
  danger: '#D32F2F',
  safe: '#388E3C',
  warning: '#F9A825',
  cardShadow: '#00000020',
};

// ─── Refresh Intervals ──────────────────────────────────────────────
export const INTERVALS = {
  MQTT_RECONNECT_MS: 5000,
  DATA_POLL_MS: 10000,
  VACCINATION_CHECK_MS: 3600000, // Check reminders every hour
};

// ─── GROQ LLM ───────────────────────────────────────────────────────
export const GROQ_API_KEY = '';


// ─── Nearby Veterinary Doctors (Mock Data) ───────────────────────────
export const NEARBY_VETS = [
  {
    name: 'Dr.  1',
    specialization: 'Bovine & Large Animal Medicine',
    location: 'Pune Nagar Road, Pune',
    phone: '',
  },
  {
    name: 'Dr.  2',
    specialization: 'Veterinary Internal Medicine',
    location: 'Hadapsar, Pune',
    phone: '',
  },
  {
    name: 'Dr.3',
    specialization: 'Livestock Health & Surgery',
    location: 'Khed, Pune District',
    phone: '',
  },
  
];

/**
 * Returns a random vet from the NEARBY_VETS list.
 * In a real app, this would be geo-sorted by distance.
 * @returns {Object} vet contact
 */
export function getNearestVet() {
  return NEARBY_VETS[Math.floor(Math.random() * NEARBY_VETS.length)];
}

