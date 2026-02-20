/**
 * Reports Screen
 * Allows users to generate comprehensive health reports for specific animals.
 * Fetches data from Firestore (Vaccinations) and Adafruit IO (Health Metrics).
 * Generates a PDF using expo-print and allows sharing via expo-sharing.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { COLORS } from '../config/constants';
import { getVaccinations, getAnimal, getSensorHistory, getMilkLogs, getPregnancies } from '../services/databaseService';
import { useTranslation } from '../i18n/LanguageContext';
import { useAnimal } from '../context/AnimalContext';

export default function ReportsScreen() {
  const { t } = useTranslation();
  const { selectedAnimal } = useAnimal();

  const [animalDetails, setAnimalDetails] = useState({
    name: '',
    id: '',
    rfid: '',
    owner: ''
  });
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('health');

  // Auto-fill fields when a selected animal is available
  useEffect(() => {
    if (selectedAnimal) {
      setAnimalDetails({
        name: selectedAnimal.name || '',
        id: selectedAnimal.id || '',
        rfid: selectedAnimal.rfid || '',
        owner: selectedAnimal.owner || '',
      });
    }
  }, [selectedAnimal]);

  const generateReport = async () => {
    if (!animalDetails.id.trim() && !animalDetails.rfid.trim()) {
      Alert.alert('Missing Info', 'Please enter an Animal ID or RFID Tag to generate a report.');
      return;
    }

    setLoading(true);
    try {
      // 0. Auto-fetch details if not full
      if (!animalDetails.name) {
        const details = await getAnimal(animalDetails.id || animalDetails.rfid);
        if (details) {
          setAnimalDetails(prev => ({ ...prev, ...details }));
        }
      }

      // 1. Fetch Data
      const vaccinations = await getVaccinations();
      // Filter vaccinations by ID/RFID
      const animalVax = vaccinations.filter(v => 
        (animalDetails.id && v.animalId?.toLowerCase().includes(animalDetails.id.toLowerCase())) ||
        (animalDetails.rfid && v.rfidTag?.toLowerCase().includes(animalDetails.rfid.toLowerCase()))
      );

      // Fetch persistent sensor history from Firestore
      const idToSearch = animalDetails.id || 'Unknown';
      const [tempData, bpmData, battData, geoData, milkLogs, pregnancies] = await Promise.all([
        getSensorHistory(idToSearch, 'temperature', 50),
        getSensorHistory(idToSearch, 'bpm', 50),
        getSensorHistory(idToSearch, 'battery', 10),
        getSensorHistory(idToSearch, 'geofence', 50),
        getMilkLogs(idToSearch, 60),
        getPregnancies(idToSearch),
      ]);

      // Calculate Averages
      const avgTemp = tempData.length ? (tempData.reduce((a, b) => a + parseFloat(b.value), 0) / tempData.length).toFixed(1) : '--';
      const avgBpm = bpmData.length ? (bpmData.reduce((a, b) => a + parseFloat(b.value), 0) / bpmData.length).toFixed(0) : '--';
      const lastBattery = battData.length > 0 ? `${parseFloat(battData[0].value).toFixed(0)}%` : '--';
      const lastLoc = geoData.length > 0 ? geoData[0].value : 'Unknown';
      // Only keep Outside events for activity log
      const outsideEvents = geoData.filter(g => String(g.value).toLowerCase().includes('outside'));

      // Calculate milk daily averages
      const milkByDay = {};
      milkLogs.forEach(l => {
        milkByDay[l.date] = (milkByDay[l.date] || 0) + (l.litres || 0);
      });

      // 2. Generate HTML
      const html = generateHTML(animalDetails, animalVax, avgTemp, avgBpm, lastBattery, lastLoc, outsideEvents, milkByDay, pregnancies);

      // 3. Create PDF
      const { uri } = await Print.printToFileAsync({ html });
      console.log('PDF generated at:', uri);

      // 4. Share PDF
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }

    } catch (error) {
      console.error('Report Error:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    }
    setLoading(false);
  };

  const generateHTML = (details, vax, avgTemp, avgBpm, lastBattery, lastLoc, outsideEvents, milkByDay = {}, pregnancies = []) => {
    const date = new Date().toLocaleString();
    
    // Rows for vaccination table
    const vaxRows = vax.map(v => `
      <tr>
        <td>${v.vaccineName}</td>
        <td>${v.date}</td>
        <td><span class="status-${v.status}">${v.status.toUpperCase()}</span></td>
        <td>${v.notes || '-'}</td>
      </tr>
    `).join('');

    // Rows for activity/geofence Log — OUTSIDE events only
    const activityRows = outsideEvents.slice(0, 10).map(g => `
      <tr>
        <td>${new Date(g.created_at).toLocaleString()}</td>
        <td>${g.value}</td>
      </tr>
    `).join('');

    // Rows for milk daily-average table
    const milkDays = Object.keys(milkByDay).sort().reverse().slice(0, 30);
    const milkRows = milkDays.map(day => {
      const total = milkByDay[day].toFixed(1);
      const sessions = (vax => vax)(0); // placeholder
      return `<tr><td>${day}</td><td>${total} L</td></tr>`;
    }).join('');
    const milkTotal = milkDays.reduce((s, d) => s + milkByDay[d], 0).toFixed(1);
    const milkAvg = milkDays.length ? (milkTotal / milkDays.length).toFixed(1) : '--';

    // Rows for pregnancy table
    const pregnancyRows = pregnancies.slice(0, 10).map(p => {
      const statusColor = p.status === 'pregnant' ? '#2E7D32' : p.status === 'delivered' ? '#1565C0' : '#B71C1C';
      return `
        <tr>
          <td>${p.matingDate || '-'}</td>
          <td>${p.expectedDelivery || '-'}</td>
          <td style="color: ${statusColor}; font-weight: bold">${(p.status || '').toUpperCase()}</td>
          <td>${p.method || '-'}</td>
          <td>${p.actualDelivery || '-'}</td>
        </tr>`;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica', sans-serif; color: #333; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid ${COLORS.primary}; padding-bottom: 10px; }
          .logo { font-size: 24px; font-weight: bold; color: ${COLORS.primary}; }
          .timestamp { font-size: 12px; color: #666; margin-top: 5px; }
          
          .section { margin-bottom: 25px; }
          .section-title { font-size: 16px; font-weight: bold; color: ${COLORS.primaryDark}; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
          
          .grid { display: flex; flex-wrap: wrap; gap: 20px; }
          .card { flex: 1; min-width: 150px; background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid ${COLORS.accent}; }
          .card-label { font-size: 12px; color: #666; }
          .card-value { font-size: 18px; font-weight: bold; color: #333; margin-top: 5px; }
          
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: ${COLORS.surface}; color: #333; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          
          .status-completed { color: ${COLORS.safe}; font-weight: bold; }
          .status-scheduled { color: ${COLORS.warning}; font-weight: bold; }
          
          .footer { text-align: center; font-size: 10px; color: #999; margin-top: 50px; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Pashu-Sutra Health Report 🐄</div>
          <div class="timestamp">Generated on: ${date}</div>
        </div>

        <div class="section">
          <div class="section-title">Animal Profile</div>
          <div class="grid">
            <div class="card">
              <div class="card-label">Name</div>
              <div class="card-value">${details.name || 'N/A'}</div>
            </div>
            <div class="card">
              <div class="card-label">Animal ID</div>
              <div class="card-value">${details.id || 'N/A'}</div>
            </div>
            <div class="card">
              <div class="card-label">RFID Tag</div>
              <div class="card-value">${details.rfid || 'N/A'}</div>
            </div>
            <div class="card">
              <div class="card-label">Owner</div>
              <div class="card-value">${details.owner || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Health Vitals (Recent Average)</div>
          <div class="grid">
            <div class="card" style="border-left-color: ${COLORS.danger}">
              <div class="card-label">Avg Temp</div>
              <div class="card-value">${avgTemp}°C</div>
            </div>
            <div class="card" style="border-left-color: #E91E63">
              <div class="card-label">Avg Heart Rate</div>
              <div class="card-value">${avgBpm} BPM</div>
            </div>
            <div class="card" style="border-left-color: #FF8F00">
              <div class="card-label">Last Battery</div>
              <div class="card-value">${lastBattery}</div>
            </div>
            <div class="card" style="border-left-color: ${COLORS.primary}">
              <div class="card-label">Last Status</div>
              <div class="card-value">${lastLoc}</div>
            </div>
          </div>
        </div>

        <!-- 🥛 Milk Production Section -->
        <div class="section">
          <div class="section-title">🥛 Milk Production Log</div>
          <div class="grid" style="margin-bottom: 12px">
            <div class="card" style="border-left-color: #2E7D32">
              <div class="card-label">Total (shown period)</div>
              <div class="card-value">${milkTotal} L</div>
            </div>
            <div class="card" style="border-left-color: #0288D1">
              <div class="card-label">Daily Average</div>
              <div class="card-value">${milkAvg} L/day</div>
            </div>
            <div class="card" style="border-left-color: #6A1B9A">
              <div class="card-label">Days Recorded</div>
              <div class="card-value">${milkDays.length}</div>
            </div>
          </div>
          ${milkRows.length ? `
            <table>
              <tr><th>Date</th><th>Total Yield (L)</th></tr>
              ${milkRows}
            </table>
          ` : '<p>No milk logs recorded yet.</p>'}
        </div>

        <!-- 🤰 Pregnancy Section -->
        <div class="section">
          <div class="section-title">🤰 Pregnancy Records</div>
          ${pregnancyRows.length ? `
            <table>
              <tr>
                <th>Mating Date</th>
                <th>Expected Delivery</th>
                <th>Status</th>
                <th>Method</th>
                <th>Actual Delivery</th>
              </tr>
              ${pregnancyRows}
            </table>
          ` : '<p>No pregnancy records found.</p>'}
        </div>

        <div class="section">
          <div class="section-title">Vaccination History</div>
          ${vaxRows.length ? `
            <table>
              <tr>
                <th>Vaccine</th>
                <th>Date</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
              ${vaxRows}
            </table>
          ` : '<p>No records found.</p>'}
        </div>

        <div class="section">
          <div class="section-title">Recent Activity Log</div>
          ${activityRows.length ? `
            <table>
              <tr>
                <th>Time</th>
                <th>Event</th>
              </tr>
              ${activityRows}
            </table>
          ` : '<p>No recent activity.</p>'}
        </div>

        <div class="footer">
          Generated via Pashu-Sutra App • Smart Livestock Management System
        </div>
      </body>
      </html>
    `;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="file-document-outline" size={32} color={COLORS.primary} />
        <View>
          <Text style={styles.title}>Generate Report</Text>
          <Text style={styles.subtitle}>Export detailed health analysis as PDF</Text>
        </View>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.sectionHeader}>Animal Details</Text>
        
        <Text style={styles.label}>Animal Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Bessie"
          value={animalDetails.name}
          onChangeText={(t) => setAnimalDetails({ ...animalDetails, name: t })}
        />

        <Text style={styles.label}>Animal ID *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. COW-001"
          value={animalDetails.id}
          onChangeText={(t) => setAnimalDetails({ ...animalDetails, id: t })}
        />

        <Text style={styles.label}>RFID Tag</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. RFID-12345"
          value={animalDetails.rfid}
          onChangeText={(t) => setAnimalDetails({ ...animalDetails, rfid: t })}
        />

        <Text style={styles.label}>Owner Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. John Doe"
          value={animalDetails.owner}
          onChangeText={(t) => setAnimalDetails({ ...animalDetails, owner: t })}
        />

        <View style={{ height: 20 }} />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={generateReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="printer" size={24} color="#fff" />
              <Text style={styles.btnText}>Geneate & Share PDF</Text>
            </>
          )}
        </TouchableOpacity>
        
        <Text style={styles.hint}>
          * Generates a PDF including vaccination history, recent health stats, and activity logs.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 24,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  form: {
    padding: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    paddingLeft: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    color: COLORS.textPrimary,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  btnDisabled: {
    backgroundColor: '#ccc',
    elevation: 0,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
