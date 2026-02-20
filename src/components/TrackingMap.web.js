/**
 * TrackingMap - Web fallback
 * Shows a list of all registered animals with their last known GPS.
 */

import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';

const TrackingMap = forwardRef(({ location, isOutside, selectedAnimal, animalMarkers = [] }, ref) => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="map-marker-multiple" size={40} color={COLORS.primary} />
      <Text style={styles.title}>Live Locations</Text>
      <Text style={styles.note}>Full map available on iOS / Android</Text>

      {/* Selected animal */}
      {selectedAnimal && (
        <View style={[styles.animalRow, { borderLeftColor: isOutside ? COLORS.danger : COLORS.primary }]}>
          <MaterialCommunityIcons name="cow" size={20} color={isOutside ? COLORS.danger : COLORS.primary} />
          <View>
            <Text style={styles.animalName}>{selectedAnimal.name} ★</Text>
            {location
              ? <Text style={styles.coords}>📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>
              : <Text style={styles.coords}>Waiting for GPS...</Text>
            }
          </View>
        </View>
      )}

      {/* Other animals */}
      {animalMarkers.map(({ animal, location: loc }) => {
        if (selectedAnimal && animal.id === selectedAnimal.id) return null;
        return (
          <View key={animal.docId || animal.id} style={[styles.animalRow, { borderLeftColor: COLORS.warning }]}>
            <MaterialCommunityIcons name="cow" size={20} color={COLORS.warning} />
            <View>
              <Text style={styles.animalName}>{animal.name}</Text>
              {loc
                ? <Text style={styles.coords}>📍 {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</Text>
                : <Text style={styles.coords}>No GPS data</Text>
              }
            </View>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8F5E9', padding: 16, gap: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  note: { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic' },
  animalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 10,
    padding: 10, borderLeftWidth: 4, width: '90%',
  },
  animalName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  coords: { fontSize: 12, color: COLORS.textSecondary },
});

export default TrackingMap;
