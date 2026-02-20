/**
 * TrackingMap - Native implementation (iOS / Android)
 * Uses react-native-maps for native map rendering.
 */

import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GEOFENCE_DEFAULTS } from '../config/constants';

const TrackingMap = forwardRef(({ location, isOutside }, ref) => {
  return (
    <MapView
      ref={ref}
      style={styles.map}
      initialRegion={{
        latitude: location?.latitude || GEOFENCE_DEFAULTS.LATITUDE,
        longitude: location?.longitude || GEOFENCE_DEFAULTS.LONGITUDE,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Circle
        center={{
          latitude: GEOFENCE_DEFAULTS.LATITUDE,
          longitude: GEOFENCE_DEFAULTS.LONGITUDE,
        }}
        radius={GEOFENCE_DEFAULTS.RADIUS_METERS}
        strokeColor={COLORS.primaryDark}
        fillColor="rgba(46, 125, 50, 0.15)"
        strokeWidth={2}
      />

      {location && (
        <Marker coordinate={location} title="Animal Location">
          <View style={styles.markerContainer}>
            <MaterialCommunityIcons
              name="cow"
              size={28}
              color={isOutside ? COLORS.danger : COLORS.primary}
            />
          </View>
        </Marker>
      )}
    </MapView>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
});

export default TrackingMap;
