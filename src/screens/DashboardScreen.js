/**
 * Dashboard Screen
 * Live map tracking + status cards + health monitoring.
 * Shows real-time data from Adafruit IO feeds.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GEOFENCE_DEFAULTS, HEALTH_THRESHOLDS } from '../config/constants';
import { connectMQTT, disconnectMQTT, fetchLatestValue } from '../services/adafruitService';
import { addAlert, getLastGPS, getSensorHistory } from '../services/databaseService';
import { sendGeofenceAlert, sendHighTemperatureAlert, sendHighBPMAlert, sendLowBatteryAlert } from '../services/notificationService';
import TrackingMap from '../components/TrackingMap';
import { useTranslation } from '../i18n/LanguageContext';
import { useAnimal } from '../context/AnimalContext';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { selectedAnimal, animals } = useAnimal();
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [location, setLocation] = useState(null);
  const [battery, setBattery] = useState('--');
  const [geofenceStatus, setGeofenceStatus] = useState('Unknown');
  const [temperature, setTemperature] = useState('--');
  const [bpm, setBpm] = useState('--');
  const [humidity, setHumidity] = useState('--');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [animalMarkers, setAnimalMarkers] = useState([]);
  const [tappedAnimal, setTappedAnimal] = useState(null);     // marker tap modal
  const [animalStats, setAnimalStats] = useState(null);       // fetched stats
  const [statsLoading, setStatsLoading] = useState(false);
  const mapRef = useRef(null);

  const handleConnectionStatus = (status) => {
    setConnectionStatus(status);
    if (status === 'connected') {
      Alert.alert('✅ Connected', 'Successfully connected to Adafruit IO server');
    }
  };

  useEffect(() => {
    loadInitialData();
    connectMQTT(handleMQTTData, handleConnectionStatus);
    return () => disconnectMQTT();
  }, []);

  // Fetch last known GPS for every registered animal
  useEffect(() => {
    if (!animals || animals.length === 0) return;
    const fetchAllGPS = async () => {
      const markers = await Promise.all(
        animals.map(async (animal) => {
          const loc = await getLastGPS(animal.id);
          return { animal, location: loc };
        })
      );
      setAnimalMarkers(markers);
    };
    fetchAllGPS();
  }, [animals]);

  // Handles tapping any map marker — fetch stats for that animal from Firestore
  const onAnimalPress = async (animal, loc) => {
    if (!animal) return;
    setTappedAnimal({ ...animal, loc });
    setAnimalStats(null);
    setStatsLoading(true);
    try {
      const [temps, bpms, batts, geos] = await Promise.all([
        getSensorHistory(animal.id, 'temperature', 1),
        getSensorHistory(animal.id, 'bpm', 1),
        getSensorHistory(animal.id, 'battery', 1),
        getSensorHistory(animal.id, 'geofence', 1),
      ]);
      setAnimalStats({
        temp:     temps[0]?.value ?? '--',
        bpm:      bpms[0]?.value ?? '--',
        battery:  batts[0]?.value ?? '--',
        geofence: geos[0]?.value ?? '--',
        lat:      loc?.latitude?.toFixed(5) ?? '--',
        lon:      loc?.longitude?.toFixed(5) ?? '--',
      });
    } catch (e) {
      console.error('[Dashboard] Stats fetch error:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  // Safely extract the numeric/string value from either a plain string
  // or a JSON envelope like { "id": "Cow-002", "rfid": "...", "val": "37.5" }
  const extractVal = (raw) => {
    if (!raw) return null;
    try {
      const obj = JSON.parse(raw);
      if (obj && obj.val !== undefined) return String(obj.val);
    } catch (_) {}
    return String(raw);
  };

  const loadInitialData = async () => {
    try {
      const gps = await fetchLatestValue('gpsloc');
      if (gps?.value) parseGPSData(extractVal(gps.value));

      const bat = await fetchLatestValue('battery');
      if (bat?.value) setBattery(extractVal(bat.value));

      const geo = await fetchLatestValue('geofence');
      if (geo?.value) setGeofenceStatus(extractVal(geo.value));

      const temp = await fetchLatestValue('temperature');
      if (temp?.value) setTemperature(extractVal(temp.value));

      const heartRate = await fetchLatestValue('bpm');
      if (heartRate?.value) setBpm(extractVal(heartRate.value));

      const hum = await fetchLatestValue('humidity');
      if (hum?.value) setHumidity(extractVal(hum.value));
    } catch (e) {
      console.error('[Dashboard] Initial load error:', e);
    }
  };

  const handleMQTTData = ({ feed, value }) => {
    setLastUpdate(new Date());

    // ── Parse JSON envelope: { id, rfid, val } ──────────────────────
    let parsedVal = value;
    let senderId = null;
    try {
      const obj = JSON.parse(value);
      if (obj && obj.val !== undefined) {
        parsedVal = String(obj.val);
        senderId = obj.id;
      }
    } catch (_) {
      // plain string value (legacy format) — use as-is
    }

    // ── Only update dashboard if this message is from the selected animal ──
    if (senderId && selectedAnimal && senderId !== selectedAnimal.id) return;

    switch (feed) {
      case 'gpsloc':
        parseGPSData(parsedVal);
        // Also refresh this animal's marker in the herd list
        if (senderId) {
          setAnimalMarkers(prev =>
            prev.map(m =>
              m.animal.id === senderId
                ? { ...m, location: parseGPSCoords(parsedVal) }
                : m
            )
          );
        }
        break;
      case 'battery':
        setBattery(parsedVal);
        checkBatteryAlert(parseFloat(parsedVal));
        break;
      case 'geofence':
        setGeofenceStatus(parsedVal);
        if (parsedVal.toLowerCase().includes('outside')) {
          addAlert({
            type: 'geofence',
            message: 'Animal is outside the geofence!',
            data: { value: parsedVal },
          });
          sendGeofenceAlert('N/A', location?.latitude, location?.longitude);
        }
        break;
      case 'temperature':
        setTemperature(parsedVal);
        checkTemperatureAlert(parseFloat(parsedVal));
        break;
      case 'bpm':
        setBpm(parsedVal);
        checkBPMAlert(parseFloat(parsedVal));
        break;
      case 'humidity':
        setHumidity(parsedVal);
        break;
    }
  };

  // Helper: parse "lat,lon,alt" string → {latitude, longitude}
  const parseGPSCoords = (raw) => {
    try {
      const parts = String(raw).split(',');
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
      }
    } catch (_) {}
    return null;
  };

  const checkTemperatureAlert = (temp) => {
    if (temp > HEALTH_THRESHOLDS.TEMPERATURE_HIGH) {
      addAlert({
        type: 'health',
        message: `🌡️ HIGH TEMPERATURE: ${temp}°C (threshold: ${HEALTH_THRESHOLDS.TEMPERATURE_HIGH}°C)`,
        data: { value: temp, metric: 'temperature' },
      });
      // Send Twilio SMS
      sendHighTemperatureAlert('N/A', temp, HEALTH_THRESHOLDS.TEMPERATURE_HIGH);
    }
  };

  const checkBPMAlert = (heartRate) => {
    if (heartRate > HEALTH_THRESHOLDS.BPM_HIGH) {
      addAlert({
        type: 'health',
        message: `❤️ HIGH HEART RATE: ${heartRate} BPM (threshold: ${HEALTH_THRESHOLDS.BPM_HIGH} BPM)`,
        data: { value: heartRate, metric: 'bpm' },
      });
      // Send Twilio SMS
      sendHighBPMAlert('N/A', heartRate, HEALTH_THRESHOLDS.BPM_HIGH);
    }
  };

  const checkBatteryAlert = (batteryLevel) => {
    if (batteryLevel < HEALTH_THRESHOLDS.BATTERY_LOW) {
      addAlert({
        type: 'system',
        message: `🔋 LOW BATTERY: ${batteryLevel}% (threshold: ${HEALTH_THRESHOLDS.BATTERY_LOW}%)`,
        data: { value: batteryLevel, metric: 'battery' },
      });
      // Send Twilio SMS
      sendLowBatteryAlert('N/A', batteryLevel, HEALTH_THRESHOLDS.BATTERY_LOW);
    }
  };

  const parseGPSData = (value) => {
    try {
      const parts = value.split(',');
      let lat, lon;
      if (parts.length >= 4) {
        lat = parseFloat(parts[1]);
        lon = parseFloat(parts[2]);
      } else if (parts.length >= 2) {
        lat = parseFloat(parts[0]);
        lon = parseFloat(parts[1]);
      }

      if (!isNaN(lat) && !isNaN(lon)) {
        setLocation({ latitude: lat, longitude: lon });
        mapRef.current?.animateToRegion?.(
          {
            latitude: lat,
            longitude: lon,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          1000
        );
      }
    } catch (e) {
      console.warn('[GPS] Parse error:', e);
    }
  };

  const isOutside = geofenceStatus.toLowerCase().includes('outside');
  const tempNum = parseFloat(temperature);
  const bpmNum = parseFloat(bpm);
  const isTempHigh = !isNaN(tempNum) && tempNum > HEALTH_THRESHOLDS.TEMPERATURE_HIGH;
  const isBpmHigh = !isNaN(bpmNum) && bpmNum > HEALTH_THRESHOLDS.BPM_HIGH;

  const renderStatusCard = (isOutside, _, __) => (
    <View style={[Platform.OS === 'web' ? styles.cardWeb : styles.card, { borderLeftColor: isOutside ? COLORS.danger : COLORS.safe }]}>
      <MaterialCommunityIcons name={isOutside ? 'alert-circle' : 'shield-check'} size={28} color={isOutside ? COLORS.danger : COLORS.safe} />
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardLabel}>{t('dashboard.status')}</Text>
        <Text style={[styles.cardValue, { color: isOutside ? COLORS.danger : COLORS.safe }]}>
          {isOutside ? t('dashboard.alert') : t('dashboard.safe')}
        </Text>
      </View>
    </View>
  );

  const renderBatteryCard = (battery) => (
    <View style={[Platform.OS === 'web' ? styles.cardWeb : styles.card, { borderLeftColor: parseInt(battery) < 20 ? COLORS.danger : COLORS.accent }]}>
      <MaterialCommunityIcons name={parseInt(battery) < 20 ? 'battery-low' : parseInt(battery) < 60 ? 'battery-medium' : 'battery-high'} size={28} color={parseInt(battery) < 20 ? COLORS.danger : COLORS.accent} />
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardLabel}>{t('dashboard.battery')}</Text>
        <Text style={styles.cardValue}>{battery}%</Text>
      </View>
    </View>
  );

  const renderTimeCard = (lastUpdate) => (
    <View style={[Platform.OS === 'web' ? styles.cardWeb : styles.card, { borderLeftColor: COLORS.primary }]}>
      <MaterialCommunityIcons name="clock-outline" size={28} color={COLORS.primary} />
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardLabel}>{t('dashboard.lastUpdate')}</Text>
        <Text style={styles.cardValue}>{lastUpdate ? lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t('dashboard.waitingData')}</Text>
      </View>
    </View>
  );

  const renderTempCard = (isTempHigh, temperature) => (
    <View style={[Platform.OS === 'web' ? styles.cardWeb : styles.card, { borderLeftColor: isTempHigh ? COLORS.danger : COLORS.primary }]}>
      <MaterialCommunityIcons name="thermometer" size={28} color={isTempHigh ? COLORS.danger : COLORS.primary} />
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardLabel}>{t('dashboard.temperature')}</Text>
        <Text style={[styles.cardValue, isTempHigh && { color: COLORS.danger }]}>
          {temperature !== '--' ? `${parseFloat(temperature).toFixed(1)}°C` : '--'}
        </Text>
      </View>
    </View>
  );

  const renderBpmCard = (isBpmHigh, bpm) => (
    <View style={[Platform.OS === 'web' ? styles.cardWeb : styles.card, { borderLeftColor: isBpmHigh ? COLORS.danger : '#E91E63' }]}>
      <MaterialCommunityIcons name="heart-pulse" size={28} color={isBpmHigh ? COLORS.danger : '#E91E63'} />
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardLabel}>{t('dashboard.heartRate')}</Text>
        <Text style={[styles.cardValue, isBpmHigh && { color: COLORS.danger }]}>
          {bpm !== '--' ? `${parseFloat(bpm).toFixed(0)} BPM` : '--'}
        </Text>
      </View>
    </View>
  );

  const renderHumidityCard = (humidity) => (
    <View style={[Platform.OS === 'web' ? styles.cardWeb : styles.card, { borderLeftColor: '#0288D1' }]}>
      <MaterialCommunityIcons name="water-percent" size={28} color="#0288D1" />
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardLabel}>{t('dashboard.humidity')}</Text>
        <Text style={styles.cardValue}>{humidity !== '--' ? `${parseFloat(humidity).toFixed(0)}%` : '--'}</Text>
      </View>
    </View>
  );

  const renderHelpers = () => null; // Just a placeholder to keep JSX clean

  return (
    <View style={styles.container}>
      {/* Connection Status Banner */}
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor:
              connectionStatus === 'connected'
                ? COLORS.safe
                : connectionStatus === 'connecting'
                ? COLORS.warning
                : COLORS.danger,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={connectionStatus === 'connected' ? 'wifi' : 'wifi-off'}
          size={14}
          color="#fff"
        />
        <Text style={styles.statusBannerText}>
          {connectionStatus === 'connected'
            ? t('dashboard.connected')
            : connectionStatus === 'connecting'
            ? t('dashboard.connecting')
            : t('dashboard.disconnected')}
        </Text>
      </View>

      {/* Selected Animal Banner */}
      {selectedAnimal ? (
        <View style={styles.animalBanner}>
          <MaterialCommunityIcons name="cow" size={16} color={COLORS.primary} />
          <Text style={styles.animalBannerText}>
            {t('dashboard.watchingAnimal')}: <Text style={styles.animalBannerName}>{selectedAnimal.name}</Text>
            {'  '}•{'  '}ID: {selectedAnimal.id}
            {selectedAnimal.rfid ? `  •  RFID: ${selectedAnimal.rfid}` : ''}
          </Text>
        </View>
      ) : (
        <View style={[styles.animalBanner, { backgroundColor: '#FFF3E0' }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.warning} />
          <Text style={[styles.animalBannerText, { color: COLORS.warning }]}>
            {t('dashboard.noAnimalSelected')}
          </Text>
        </View>
      )}

      {/* Map Component (platform-aware) */}
      <TrackingMap
        ref={mapRef}
        location={location}
        isOutside={isOutside}
        selectedAnimal={selectedAnimal}
        animalMarkers={animalMarkers}
        onAnimalPress={onAnimalPress}
      />

      {/* Animal Stats Modal — shown when tapping a marker */}
      <Modal
        visible={!!tappedAnimal}
        transparent
        animationType="slide"
        onRequestClose={() => setTappedAnimal(null)}
      >
        <View style={styles.statsOverlay}>
          <View style={styles.statsCard}>
            {/* Header */}
            <View style={styles.statsHeader}>
              <View style={styles.statsAnimalIcon}>
                <MaterialCommunityIcons name="cow" size={28} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statsAnimalName}>{tappedAnimal?.name}</Text>
                <Text style={styles.statsAnimalMeta}>ID: {tappedAnimal?.id}  •  RFID: {tappedAnimal?.rfid || 'N/A'}</Text>
              </View>
              <TouchableOpacity onPress={() => setTappedAnimal(null)} style={styles.statsClose}>
                <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Stats Grid */}
            {statsLoading ? (
              <View style={styles.statsLoading}>
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text style={styles.statsLoadingText}>Fetching data...</Text>
              </View>
            ) : animalStats ? (
              <View style={styles.statsGrid}>
                {[
                  { icon: 'thermometer',   label: 'Temperature', value: animalStats.temp !== '--' ? `${parseFloat(animalStats.temp).toFixed(1)}°C` : '--', color: parseFloat(animalStats.temp) > 39.5 ? COLORS.danger : COLORS.primary },
                  { icon: 'heart-pulse',   label: 'Heart Rate',  value: animalStats.bpm  !== '--' ? `${animalStats.bpm} BPM` : '--',                     color: parseFloat(animalStats.bpm) > 100 ? COLORS.danger : '#E91E63' },
                  { icon: 'battery-high',  label: 'Battery',     value: animalStats.battery !== '--' ? `${animalStats.battery}%` : '--',                  color: parseFloat(animalStats.battery) < 20 ? COLORS.danger : COLORS.accent },
                  { icon: 'shield-check',  label: 'Geofence',    value: animalStats.geofence,                                                              color: animalStats.geofence === 'Outside' ? COLORS.danger : COLORS.safe },
                  { icon: 'map-marker',    label: 'Latitude',    value: tappedAnimal?.loc ? `${tappedAnimal.loc.latitude?.toFixed(5)}` : '--',             color: COLORS.primary },
                  { icon: 'map-marker',    label: 'Longitude',   value: tappedAnimal?.loc ? `${tappedAnimal.loc.longitude?.toFixed(5)}` : '--',            color: COLORS.primary },
                ].map((item, i) => (
                  <View key={i} style={styles.statsTile}>
                    <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                    <Text style={styles.statsTileValue} numberOfLines={1}>{item.value}</Text>
                    <Text style={styles.statsTileLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.statsNoData}>No data found for this animal yet.</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Helper functions for rendering cards to avoid duplication */}
      {renderHelpers()}

      {/* Status & Health Cards */}
      <ScrollView style={styles.cardsScroll} showsVerticalScrollIndicator={false}>
        {/* Row 1: Geofence + Battery + Last Update */}
        <View style={Platform.OS === 'web' ? styles.cardsContainerWeb : styles.cardsScrollRow}>
          {Platform.OS === 'web' ? (
            <View style={styles.cardsRowWeb}>
              {renderStatusCard(isOutside, battery, lastUpdate)}
              {renderBatteryCard(battery)}
              {renderTimeCard(lastUpdate)}
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.cardsRow}
            >
              {renderStatusCard(isOutside, battery, lastUpdate)}
              {renderBatteryCard(battery)}
              {renderTimeCard(lastUpdate)}
            </ScrollView>
          )}
        </View>

        {/* Row 2: Health Metrics */}
        <View style={Platform.OS === 'web' ? styles.cardsContainerWeb : styles.cardsScrollRow}>
          {Platform.OS === 'web' ? (
             <View style={styles.cardsRowWeb}>
                {renderTempCard(isTempHigh, temperature)}
                {renderBpmCard(isBpmHigh, bpm)}
                {renderHumidityCard(humidity)}
             </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.cardsRow}
            >
                {renderTempCard(isTempHigh, temperature)}
                {renderBpmCard(isBpmHigh, bpm)}
                {renderHumidityCard(humidity)}
            </ScrollView>
          )}
        </View>


        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 6,
  },
  statusBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardsScroll: {
    flexGrow: 0, 
  },
  cardsScrollRow: {
    marginBottom: 8,
  },
  cardsContainerWeb: {
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  cardsRow: {
    paddingHorizontal: 8,
    gap: 12,
  },
  cardsRowWeb: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  card: {
    width: 120, 
    height: 110,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginVertical: 4, 
  },
  cardWeb: {
    flex: 1, // Full width (distributed) for web
    height: 110,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 4,
    // Web shadow
    boxShadow: '0px 1px 3px rgba(0,0,0,0.2)',
    marginVertical: 4, 
  },
  cardTextContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  cardLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  animalBanner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#E8F5E9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  animalBannerText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    flex: 1,
  },
  animalBannerName: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  // ── Stats Modal ──────────────────────────────────────────────────────
  statsOverlay: {
    flex: 1,
    backgroundColor: '#00000060',
    justifyContent: 'flex-end',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsAnimalIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center',
  },
  statsAnimalName: {
    fontSize: 18, fontWeight: '800', color: COLORS.textPrimary,
  },
  statsAnimalMeta: {
    fontSize: 12, color: COLORS.textSecondary, marginTop: 2,
  },
  statsClose: { padding: 6 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statsTile: {
    width: '30%',
    flex: 1,
    minWidth: 90,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  statsTileValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  statsTileLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statsLoading: {
    alignItems: 'center', gap: 10, paddingVertical: 24,
  },
  statsLoadingText: {
    fontSize: 14, color: COLORS.textSecondary,
  },
  statsNoData: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
    paddingVertical: 20,
  },
});

