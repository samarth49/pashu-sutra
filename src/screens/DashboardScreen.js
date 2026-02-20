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
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GEOFENCE_DEFAULTS, HEALTH_THRESHOLDS } from '../config/constants';
import { connectMQTT, disconnectMQTT, fetchLatestValue } from '../services/adafruitService';
import { addAlert } from '../services/databaseService';
import { sendGeofenceAlert, sendHighTemperatureAlert, sendHighBPMAlert, sendLowBatteryAlert } from '../services/notificationService';
import TrackingMap from '../components/TrackingMap';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [location, setLocation] = useState(null);
  const [battery, setBattery] = useState('--');
  const [geofenceStatus, setGeofenceStatus] = useState('Unknown');
  const [temperature, setTemperature] = useState('--');
  const [bpm, setBpm] = useState('--');
  const [humidity, setHumidity] = useState('--');
  const [lastUpdate, setLastUpdate] = useState(null);
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

  const loadInitialData = async () => {
    try {
      const gps = await fetchLatestValue('gpsloc');
      if (gps?.value) parseGPSData(gps.value);

      const bat = await fetchLatestValue('battery');
      if (bat?.value) setBattery(bat.value);

      const geo = await fetchLatestValue('geofence');
      if (geo?.value) setGeofenceStatus(geo.value);

      const temp = await fetchLatestValue('temperature');
      if (temp?.value) setTemperature(temp.value);

      const heartRate = await fetchLatestValue('bpm');
      if (heartRate?.value) setBpm(heartRate.value);

      const hum = await fetchLatestValue('humidity');
      if (hum?.value) setHumidity(hum.value);
    } catch (e) {
      console.error('[Dashboard] Initial load error:', e);
    }
  };

  const handleMQTTData = ({ feed, value }) => {
    setLastUpdate(new Date());

    switch (feed) {
      case 'gpsloc':
        parseGPSData(value);
        break;
      case 'battery':
        setBattery(value);
        checkBatteryAlert(parseFloat(value));
        break;
      case 'geofence':
        setGeofenceStatus(value);
        if (value.toLowerCase().includes('outside')) {
          addAlert({
            type: 'geofence',
            message: 'Animal is outside the geofence!',
            data: { value },
          });
          // Send Twilio SMS
          sendGeofenceAlert('N/A', location?.latitude, location?.longitude);
        }
        break;
      case 'temperature':
        setTemperature(value);
        checkTemperatureAlert(parseFloat(value));
        break;
      case 'bpm':
        setBpm(value);
        checkBPMAlert(parseFloat(value));
        break;
      case 'humidity':
        setHumidity(value);
        break;
    }
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
        <Text style={styles.cardLabel}>Status</Text>
        <Text style={[styles.cardValue, { color: isOutside ? COLORS.danger : COLORS.safe }]}>
          {isOutside ? '⚠ Alert' : '✓ Safe'}
        </Text>
      </View>
    </View>
  );

  const renderBatteryCard = (battery) => (
    <View style={[Platform.OS === 'web' ? styles.cardWeb : styles.card, { borderLeftColor: parseInt(battery) < 20 ? COLORS.danger : COLORS.accent }]}>
      <MaterialCommunityIcons name={parseInt(battery) < 20 ? 'battery-low' : parseInt(battery) < 60 ? 'battery-medium' : 'battery-high'} size={28} color={parseInt(battery) < 20 ? COLORS.danger : COLORS.accent} />
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardLabel}>Battery</Text>
        <Text style={styles.cardValue}>{battery}%</Text>
      </View>
    </View>
  );

  const renderTimeCard = (lastUpdate) => (
    <View style={[Platform.OS === 'web' ? styles.cardWeb : styles.card, { borderLeftColor: COLORS.primary }]}>
      <MaterialCommunityIcons name="clock-outline" size={28} color={COLORS.primary} />
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardLabel}>Last Update</Text>
        <Text style={styles.cardValue}>{lastUpdate ? lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Wait...'}</Text>
      </View>
    </View>
  );

  const renderTempCard = (isTempHigh, temperature) => (
    <View style={[Platform.OS === 'web' ? styles.cardWeb : styles.card, { borderLeftColor: isTempHigh ? COLORS.danger : COLORS.primary }]}>
      <MaterialCommunityIcons name="thermometer" size={28} color={isTempHigh ? COLORS.danger : COLORS.primary} />
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardLabel}>Temp</Text>
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
        <Text style={styles.cardLabel}>Heart Rate</Text>
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
        <Text style={styles.cardLabel}>Humidity</Text>
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
            ? 'Live Connected'
            : connectionStatus === 'connecting'
            ? 'Connecting...'
            : 'Disconnected'}
        </Text>
      </View>

      {/* Map Component (platform-aware) */}
      <TrackingMap ref={mapRef} location={location} isOutside={isOutside} />

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
});
