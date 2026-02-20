/**
 * TrackingMap - Native implementation (iOS / Android)
 * Shows all registered animals as markers on the map.
 * Tap a marker → onAnimalPress(animal, location) callback fires.
 */

import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GEOFENCE_DEFAULTS } from '../config/constants';

/**
 * Props:
 *  location        - { latitude, longitude } of the selected animal (live MQTT)
 *  isOutside       - bool
 *  selectedAnimal  - animal object { name, id, rfid }
 *  animalMarkers   - [{ animal, location }] for all registered animals
 *  onAnimalPress   - (animal, location) => void  — called when any marker is tapped
 */
const TrackingMap = forwardRef(({ location, isOutside, selectedAnimal, animalMarkers = [], onAnimalPress }, ref) => {
  const centerLat = location?.latitude || GEOFENCE_DEFAULTS.LATITUDE;
  const centerLon = location?.longitude || GEOFENCE_DEFAULTS.LONGITUDE;

  return (
    <MapView
      ref={ref}
      style={styles.map}
      initialRegion={{
        latitude: centerLat,
        longitude: centerLon,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }}
    >
      {/* Geofence Circle */}
      <Circle
        center={{ latitude: GEOFENCE_DEFAULTS.LATITUDE, longitude: GEOFENCE_DEFAULTS.LONGITUDE }}
        radius={GEOFENCE_DEFAULTS.RADIUS_METERS}
        strokeColor={COLORS.primaryDark}
        fillColor="rgba(46, 125, 50, 0.15)"
        strokeWidth={2}
      />

      {/* Other registered animals — last known GPS (amber) */}
      {animalMarkers.map(({ animal, location: loc }) => {
        if (!loc) return null;
        if (selectedAnimal && animal.id === selectedAnimal.id) return null;
        return (
          <Marker
            key={animal.docId || animal.id}
            coordinate={loc}
            onPress={() => onAnimalPress?.(animal, loc)}
          >
            <View style={[styles.markerContainer, styles.otherMarker]}>
              <MaterialCommunityIcons name="cow" size={22} color={COLORS.warning} />
              <Text style={[styles.markerLabel, { color: COLORS.warning }]} numberOfLines={1}>
                {animal.name}
              </Text>
            </View>
          </Marker>
        );
      })}

      {/* Selected Animal — live position (green / red), rendered last so it's on top */}
      {location && (
        <Marker
          coordinate={location}
          onPress={() => onAnimalPress?.(selectedAnimal, location)}
        >
          <View style={[styles.markerContainer, { borderColor: isOutside ? COLORS.danger : COLORS.primary }]}>
            <MaterialCommunityIcons
              name="cow"
              size={26}
              color={isOutside ? COLORS.danger : COLORS.primary}
            />
            {selectedAnimal?.name && (
              <Text style={[styles.markerLabel, { color: isOutside ? COLORS.danger : COLORS.primary }]} numberOfLines={1}>
                {selectedAnimal.name}
              </Text>
            )}
          </View>
        </Marker>
      )}
    </MapView>
  );
});

const styles = StyleSheet.create({
  map: { flex: 1 },
  markerContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    minWidth: 48,
  },
  otherMarker: { borderColor: COLORS.warning },
  markerLabel: {
    fontSize: 9,
    fontWeight: '700',
    maxWidth: 70,
    textAlign: 'center',
  },
});

export default TrackingMap;
