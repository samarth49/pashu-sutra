const mqtt = require('mqtt');
const readline = require('readline');

// ─── Configuration ───────────────────────────────────────────────────

// COPIED FROM constants.js
const ADAFRUIT_IO = {
  USERNAME: 'ProtonX',
  AIO_KEY: 'aio_CgEp823IbWQjikfQCBoZq7QRaeDx',
  BROKER: 'io.adafruit.com',
  PORT: 8883, // MQTT Secure Port
};

const FEED_PREFIX = `${ADAFRUIT_IO.USERNAME}/feeds`;
const FEEDS = {
  GPS: `${FEED_PREFIX}/gpsloc`,
  BATTERY: `${FEED_PREFIX}/battery`,
  BPM: `${FEED_PREFIX}/bpm`,
  TEMP: `${FEED_PREFIX}/temperature`,
  HUMIDITY: `${FEED_PREFIX}/humidity`,
  GEOFENCE: `${FEED_PREFIX}/geofence`,
};

// Center of Geofence (Updated from constants.js)
const GEOFENCE_CENTER = { lat: 18.47011077655484, lon: 73.86976837618745 };

// ─── Simulation States ───────────────────────────────────────────────

const MODES = {
  1: { name: 'NORMAL (Healthy, Safe)',     temp: 37.5, bpm: 75,  batt: 85,  lat: 0, lon: 0 },
  2: { name: 'LOW BATTERY (< 20%)',        temp: 37.5, bpm: 75,  batt: 15,  lat: 0, lon: 0 },
  3: { name: 'HIGH TEMP (> 39.5°C)',       temp: 40.5, bpm: 75,  batt: 80,  lat: 0, lon: 0 },
  4: { name: 'HIGH BPM (> 100)',           temp: 37.5, bpm: 110, batt: 80,  lat: 0, lon: 0 },
  5: { name: 'GEOFENCE BREACH (Outside)',  temp: 37.5, bpm: 75,  batt: 80,  lat: 0.005, lon: 0.005 }, // Offset to be outside
};

// ─── Helper Functions ────────────────────────────────────────────────

function jitter(value, amount = 0.5) {
  return value + (Math.random() * amount * 2 - amount);
}

function getGPS(baseLat, baseLon, offsetLat, offsetLon) {
  // Add small random movement
  const lat = baseLat + offsetLat + (Math.random() * 0.0002 - 0.0001);
  const lon = baseLon + offsetLon + (Math.random() * 0.0002 - 0.0001);
  return `${lat.toFixed(6)},${lon.toFixed(6)},0`; // 0 is altitude
}

// ─── Main Script ─────────────────────────────────────────────────────

const client = mqtt.connect(`mqtts://${ADAFRUIT_IO.BROKER}`, {
  port: ADAFRUIT_IO.PORT,
  username: ADAFRUIT_IO.USERNAME,
  password: ADAFRUIT_IO.AIO_KEY,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

client.on('connect', () => {
  console.log(`\n✅ Connected to Adafruit IO as ${ADAFRUIT_IO.USERNAME}`);
  startMenu();
});

client.on('error', (err) => {
  console.error('❌ MQTT Error:', err.message);
  process.exit(1);
});

function startMenu() {
  console.log('\n─── SELECT SIMULATION MODE ───');
  Object.keys(MODES).forEach(key => {
    console.log(`${key}. ${MODES[key].name}`);
  });
  console.log('Q. Quit');

  rl.question('\nEnter choice (1-5): ', (choice) => {
    if (choice.toLowerCase() === 'q') {
      console.log('Exiting...');
      client.end();
      process.exit(0);
    }

    const mode = MODES[choice];
    if (!mode) {
      console.log('❌ Invalid choice. Try again.');
      startMenu();
      return;
    }

    console.log(`\n🚀 Starting Simulation: ${mode.name}`);
    console.log('Press Ctrl+C to stop this mode and return to menu.\n');

    startSimulation(mode);
  });
}

function startSimulation(mode) {
  const interval = setInterval(() => {
    // 1. Temperature
    const temp = jitter(mode.temp, 0.2).toFixed(1);
    const tempPayload = JSON.stringify({ id: "Cow-001", rfid: "Rfid-001", val: temp });
    client.publish(FEEDS.TEMP, tempPayload);
    
    // 2. BPM
    const bpm = Math.round(jitter(mode.bpm, 2));
    const bpmPayload = JSON.stringify({ id: "Cow-001", rfid: "Rfid-001", val: bpm });
    client.publish(FEEDS.BPM, bpmPayload);

    // 3. Battery
    let battery = mode.batt; 
    if (mode.name.includes('LOW BATTERY')) {
        battery = jitter(15, 1).toFixed(0);
    } else {
        battery = jitter(85, 0.5).toFixed(0);
    }
    const battPayload = JSON.stringify({ id: "Cow-001", rfid: "Rfid-001", val: battery });
    client.publish(FEEDS.BATTERY, battPayload);

    // 4. Humidity
    const humidity = Math.round(jitter(60, 5));
    const humPayload = JSON.stringify({ id: "Cow-001", rfid: "Rfid-001", val: humidity });
    client.publish(FEEDS.HUMIDITY, humPayload);

    // 5. GPS
    const gpsData = getGPS(GEOFENCE_CENTER.lat, GEOFENCE_CENTER.lon, mode.lat, mode.lon);
    const gpsPayload = JSON.stringify({ id: "Cow-001", rfid: "Rfid-001", val: gpsData });
    client.publish(FEEDS.GPS, gpsPayload);

    // 6. Geofence Status
    const geofenceStatus = (mode.lat === 0 && mode.lon === 0) ? 'Inside' : 'Outside';
    const geoPayload = JSON.stringify({ id: "Cow-001", rfid: "Rfid-001", val: geofenceStatus });
    client.publish(FEEDS.GEOFENCE, geoPayload);

    console.log(`📡 Published (Cow-001 / Rfid-001): Temp=${temp}°C, BPM=${bpm}, Batt=${battery}%`);

  }, 5000); // Publish every 5 seconds

  // Handle Ctrl+C to stop interval but keep script running
  const onSigInt = () => {
    clearInterval(interval);
    process.removeListener('SIGINT', onSigInt); // Remove this specific listener
    console.log('\n🛑 Simulation stopped.');
    startMenu();
  };

  // We need to override the default SIGINT behavior for readline
  rl.on('SIGINT', onSigInt);
}
