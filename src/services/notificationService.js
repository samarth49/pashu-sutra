/**
 * Notification Service — Direct Twilio REST API
 * Sends SMS messages using Twilio's API directly from the client.
 * (For demo/college project use — production apps should use a backend.)
 */

import { TWILIO_CONFIG, HEALTH_THRESHOLDS } from '../config/constants';
import { encode as btoa } from 'base-64';

// ─── Alert Message Templates ─────────────────────────────────────────

const ALERT_TEMPLATES = {
  geofence: (data) =>
    `🚨 PASHU-SUTRA ALERT\nAnimal [${data.rfidTag || 'N/A'}] is OUTSIDE the geofence!\nLocation: ${data.latitude || '?'}, ${data.longitude || '?'}\nTime: ${new Date().toLocaleString('en-IN')}\n⚠️ Immediate attention required.`,

  temperature_high: (data) =>
    `🌡️ PASHU-SUTRA HEALTH ALERT\nAnimal [${data.rfidTag || 'N/A'}] — HIGH TEMPERATURE!\nReading: ${data.value}°C (Threshold: ${data.threshold}°C)\nTime: ${new Date().toLocaleString('en-IN')}\n⚕️ Check for illness immediately.`,

  bpm_high: (data) =>
    `❤️ PASHU-SUTRA HEALTH ALERT\nAnimal [${data.rfidTag || 'N/A'}] — HIGH HEART RATE!\nReading: ${data.value} BPM (Threshold: ${data.threshold} BPM)\nTime: ${new Date().toLocaleString('en-IN')}\n⚕️ Check for stress/illness.`,

  battery_low: (data) =>
    `🔋 PASHU-SUTRA SYSTEM ALERT\nDevice for Animal [${data.rfidTag || 'N/A'}] has LOW BATTERY!\nReading: ${data.value}% (Threshold: ${data.threshold}%)\nTime: ${new Date().toLocaleString('en-IN')}\n⚠️ Charge device immediately.`,

  vaccination_2days: (data) =>
    `📋 PASHU-SUTRA REMINDER\nVaccination "${data.vaccineName}" for Animal [${data.rfidTag || 'N/A'}] is due in 2 days (${data.date}).`,

  vaccination_1day: (data) =>
    `⚠️ PASHU-SUTRA REMINDER\nVaccination "${data.vaccineName}" for Animal [${data.rfidTag || 'N/A'}] is due TOMORROW (${data.date}).`,

  vaccination_today: (data) =>
    `🔴 PASHU-SUTRA URGENT\nVaccination "${data.vaccineName}" for Animal [${data.rfidTag || 'N/A'}] is due TODAY!\n💉 Please administer immediately.`,
};

// ─── Send SMS via Twilio REST API ────────────────────────────────────

async function sendTwilioSMS(to, body) {
  const { ACCOUNT_SID, AUTH_TOKEN, FROM_PHONE } = TWILIO_CONFIG;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;

  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', FROM_PHONE);
  params.append('Body', body);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const result = await response.json();

  if (response.ok) {
    console.log(`[Twilio] SMS sent: ${result.sid}`);
    return { success: true, messageSid: result.sid };
  } else {
    console.error(`[Twilio] Error: ${result.message}`);
    return { success: false, error: result.message };
  }
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Send a notification via Twilio SMS.
 * @param {string} alertType - Template key
 * @param {Object} data - Alert-specific data
 */
export async function sendNotification(alertType, data) {
  const { ALERT_PHONE } = TWILIO_CONFIG;

  if (!ALERT_PHONE) {
    console.warn('[Notify] ALERT_PHONE not set in constants.js — skipping');
    return { success: false, error: 'ALERT_PHONE not configured' };
  }

  const templateFn = ALERT_TEMPLATES[alertType];
  if (!templateFn) {
    console.error(`[Notify] Unknown alert type: ${alertType}`);
    return { success: false, error: `Unknown alert type: ${alertType}` };
  }

  try {
    const body = templateFn(data);
    return await sendTwilioSMS(ALERT_PHONE, body);
  } catch (error) {
    console.error('[Notify] Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ─── Convenience Methods ─────────────────────────────────────────────

export function sendGeofenceAlert(rfidTag, latitude, longitude) {
  return sendNotification('geofence', { rfidTag, latitude, longitude });
}

export function sendHighTemperatureAlert(rfidTag, value, threshold) {
  return sendNotification('temperature_high', { rfidTag, value, threshold });
}

export function sendHighBPMAlert(rfidTag, value, threshold) {
  return sendNotification('bpm_high', { rfidTag, value, threshold });
}

export function sendLowBatteryAlert(rfidTag, value, threshold) {
  return sendNotification('battery_low', { rfidTag, value, threshold });
}

export function sendVaccinationReminder(rfidTag, vaccineName, date, daysUntil) {
  const type =
    daysUntil === 0
      ? 'vaccination_today'
      : daysUntil === 1
      ? 'vaccination_1day'
      : 'vaccination_2days';

  return sendNotification(type, { rfidTag, vaccineName, date });
}
