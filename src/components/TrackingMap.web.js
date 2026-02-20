/**
 * TrackingMap - Web fallback implementation
 * Displays location info as text since react-native-maps is not available on web.
 */

import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';

const TrackingMap = forwardRef(({ location, isOutside }, ref) => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="map-marker" size={48} color={COLORS.primary} />
      <Text style={styles.title}>Live Location</Text>
      {location ? (
        <Text style={styles.coords}>
          📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </Text>
      ) : (
        <Text style={styles.coords}>Waiting for GPS data...</Text>
      )}
      <Text style={styles.note}>
        Map view available on mobile devices (iOS / Android)
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  coords: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  note: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default TrackingMap;
