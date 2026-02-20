/**
 * Animals Screen
 * List, add and delete animals in the herd.
 * Tap an animal to set it as the monitored one (AnimalContext).
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../config/constants';
import { useTranslation } from '../i18n/LanguageContext';
import { useAnimal } from '../context/AnimalContext';
import { addAnimal, deleteAnimal } from '../services/databaseService';

const SPECIES_OPTIONS = ['cow', 'buffalo', 'goat', 'sheep'];
const SPECIES_ICONS = { cow: 'cow', buffalo: 'cow', goat: 'sheep', sheep: 'sheep' };

const emptyForm = { name: '', id: '', rfid: '', owner: '', species: 'cow' };

export default function AnimalsScreen() {
  const { t } = useTranslation();
  const { selectedAnimal, setSelectedAnimal, animals, loadAnimals } = useAnimal();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { loadAnimals(); }, []));

  const handleAdd = async () => {
    if (!form.name.trim() || !form.id.trim()) {
      Alert.alert('Missing Fields', 'Name and Animal ID are required.');
      return;
    }
    setSaving(true);
    const saved = await addAnimal(form);
    if (saved) {
      await loadAnimals();
      setShowForm(false);
      setForm(emptyForm);
      // Auto-select the newly added animal
      await setSelectedAnimal(saved);
    }
    setSaving(false);
  };

  const handleDelete = (animal) => {
    Alert.alert(
      t('common.confirm'),
      t('animals.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteAnimal(animal.docId);
            if (selectedAnimal?.docId === animal.docId) {
              await setSelectedAnimal(null);
            }
            await loadAnimals();
          },
        },
      ]
    );
  };

  const renderAnimalCard = (animal) => {
    const isSelected = selectedAnimal?.docId === animal.docId;
    return (
      <TouchableOpacity
        key={animal.docId}
        style={[styles.animalCard, isSelected && styles.animalCardSelected]}
        onPress={() => setSelectedAnimal(animal)}
        activeOpacity={0.8}
      >
        <View style={[styles.animalIcon, isSelected && styles.animalIconSelected]}>
          <MaterialCommunityIcons
            name={SPECIES_ICONS[animal.species] || 'cow'}
            size={28}
            color={isSelected ? '#fff' : COLORS.primary}
          />
        </View>
        <View style={styles.animalInfo}>
          <Text style={styles.animalName}>{animal.name}</Text>
          <Text style={styles.animalMeta}>ID: {animal.id}  •  RFID: {animal.rfid || 'N/A'}</Text>
          <Text style={styles.animalOwner}>👤 {animal.owner || 'N/A'}</Text>
        </View>
        <View style={styles.animalActions}>
          {isSelected ? (
            <View style={styles.selectedBadge}>
              <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.primary} />
              <Text style={styles.selectedText}>{t('animals.selected')}</Text>
            </View>
          ) : (
            <Text style={styles.tapText}>{t('animals.tapToSelect')}</Text>
          )}
          <TouchableOpacity onPress={() => handleDelete(animal)} style={styles.deleteBtn}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="barn" size={32} color={COLORS.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('animals.title')}</Text>
          <Text style={styles.subtitle}>
            {animals.length} animal{animals.length !== 1 ? 's' : ''} registered
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          <Text style={styles.addBtnText}>{t('animals.addAnimal')}</Text>
        </TouchableOpacity>
      </View>

      {/* Animal List */}
      <ScrollView style={styles.list} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {animals.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cow-off" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>{t('animals.noAnimals')}</Text>
            <Text style={styles.emptySubtitle}>{t('animals.addFirst')}</Text>
          </View>
        ) : (
          animals.map(renderAnimalCard)
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Add Animal Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('animals.addAnimal')}</Text>

            {[
              { key: 'name', label: t('animals.name'), placeholder: 'e.g. Lakshmi', required: true },
              { key: 'id', label: t('animals.id'), placeholder: 'e.g. COW-001', required: true },
              { key: 'rfid', label: t('animals.rfid'), placeholder: 'e.g. RFID-001' },
              { key: 'owner', label: t('animals.owner'), placeholder: 'e.g. Ramesh' },
            ].map(field => (
              <View key={field.key}>
                <Text style={styles.fieldLabel}>
                  {field.label}{field.required ? ' *' : ''}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChangeText={(v) => setForm(f => ({ ...f, [field.key]: v }))}
                />
              </View>
            ))}

            {/* Species Selector */}
            <Text style={styles.fieldLabel}>{t('animals.species')}</Text>
            <View style={styles.speciesRow}>
              {SPECIES_OPTIONS.map(sp => (
                <TouchableOpacity
                  key={sp}
                  style={[styles.speciesBtn, form.species === sp && styles.speciesBtnActive]}
                  onPress={() => setForm(f => ({ ...f, species: sp }))}
                >
                  <Text style={[styles.speciesBtnText, form.species === sp && { color: '#fff' }]}>
                    {t(`animals.${sp}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowForm(false); setForm(emptyForm); }}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: 20, backgroundColor: COLORS.surface,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { flex: 1 },
  animalCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 16, flexDirection: 'row', alignItems: 'center',
    gap: 14, borderWidth: 2, borderColor: 'transparent',
    elevation: 2, shadowColor: '#00000015',
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
  },
  animalCardSelected: { borderColor: COLORS.primary, backgroundColor: '#F1F8E9' },
  animalIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
  },
  animalIconSelected: { backgroundColor: COLORS.primary },
  animalInfo: { flex: 1 },
  animalName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  animalMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  animalOwner: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  animalActions: { alignItems: 'flex-end', gap: 8 },
  selectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectedText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  tapText: { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic' },
  deleteBtn: { padding: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary },
  emptySubtitle: { fontSize: 14, color: '#bbb', textAlign: 'center' },
  modalOverlay: {
    flex: 1, backgroundColor: '#00000080',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 10, maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
    borderWidth: 1, borderColor: '#ddd', marginBottom: 4,
  },
  speciesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  speciesBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primary,
  },
  speciesBtnActive: { backgroundColor: COLORS.primary },
  speciesBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: {
    flex: 1, backgroundColor: COLORS.primary,
    padding: 14, borderRadius: 12, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
