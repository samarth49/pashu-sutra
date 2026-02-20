/**
 * Report Generation Service
 * Generates PDF and CSV reports from tracking and health data.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { fetchFeedData } from './adafruitService';
import { getVaccinations, getAlerts } from './databaseService';

/**
 * Generate and share a PDF report.
 * @param {Object} options - { startDate, endDate, includeTracking, includeHealth, includeAlerts }
 */
export async function generatePDFReport(options = {}) {
  const {
    startDate = null,
    endDate = null,
    includeTracking = true,
    includeHealth = true,
    includeAlerts = true,
  } = options;

  let trackingRows = '';
  let healthRows = '';
  let alertRows = '';

  // ─── Tracking Data ──────────────────────────────────────────────
  if (includeTracking) {
    const gpsData = await fetchFeedData('gpsloc', 30);
    const batteryData = await fetchFeedData('battery', 30);

    trackingRows = gpsData
      .filter((d) => filterByDate(d.created_at, startDate, endDate))
      .map(
        (d) => `
        <tr>
          <td>${formatDate(d.created_at)}</td>
          <td>${d.value}</td>
          <td>GPS</td>
        </tr>`
      )
      .join('');

    trackingRows += batteryData
      .filter((d) => filterByDate(d.created_at, startDate, endDate))
      .map(
        (d) => `
        <tr>
          <td>${formatDate(d.created_at)}</td>
          <td>${d.value}%</td>
          <td>Battery</td>
        </tr>`
      )
      .join('');
  }

  // ─── Health / Vaccination Data ──────────────────────────────────
  if (includeHealth) {
    const vaccinations = await getVaccinations();
    healthRows = vaccinations
      .filter((v) => filterByDate(v.date, startDate, endDate))
      .map(
        (v) => `
        <tr>
          <td>${formatDate(v.date)}</td>
          <td>${v.vaccineName}</td>
          <td>${v.animalId || '-'}</td>
          <td>${v.status}</td>
        </tr>`
      )
      .join('');
  }

  // ─── Alerts ─────────────────────────────────────────────────────
  if (includeAlerts) {
    const alerts = await getAlerts();
    alertRows = alerts
      .filter((a) => filterByDate(a.timestamp, startDate, endDate))
      .map(
        (a) => `
        <tr>
          <td>${formatDate(a.timestamp)}</td>
          <td>${a.type}</td>
          <td>${a.message}</td>
        </tr>`
      )
      .join('');
  }

  // ─── Build HTML ─────────────────────────────────────────────────
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #2E7D32; border-bottom: 2px solid #2E7D32; padding-bottom: 8px; }
          h2 { color: #1B5E20; margin-top: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #E8F5E9; color: #1B5E20; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <h1>🐄 Pashu-Sutra Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        ${startDate || endDate ? `<p>Period: ${startDate || 'Start'} → ${endDate || 'Now'}</p>` : ''}

        ${includeTracking ? `
          <h2>📍 Tracking Data</h2>
          <table>
            <tr><th>Time</th><th>Value</th><th>Type</th></tr>
            ${trackingRows || '<tr><td colspan="3">No data available</td></tr>'}
          </table>
        ` : ''}

        ${includeHealth ? `
          <h2>💉 Vaccination Records</h2>
          <table>
            <tr><th>Date</th><th>Vaccine</th><th>Animal</th><th>Status</th></tr>
            ${healthRows || '<tr><td colspan="4">No records</td></tr>'}
          </table>
        ` : ''}

        ${includeAlerts ? `
          <h2>🔔 Alert History</h2>
          <table>
            <tr><th>Time</th><th>Type</th><th>Message</th></tr>
            ${alertRows || '<tr><td colspan="3">No alerts</td></tr>'}
          </table>
        ` : ''}

        <div class="footer">Pashu-Sutra — Livestock Management System</div>
      </body>
    </html>
  `;

  // ─── Print / Share ──────────────────────────────────────────────
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
    return uri;
  } catch (error) {
    console.error('[Report] Error generating PDF:', error);
    throw error;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

function filterByDate(dateStr, start, end) {
  if (!start && !end) return true;
  const d = new Date(dateStr);
  if (start && d < new Date(start)) return false;
  if (end && d > new Date(end)) return false;
  return true;
}
