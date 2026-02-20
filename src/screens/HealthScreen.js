/**
 * Health Screen
 * Vaccination schedule management with local database.
 * Supports adding, viewing, completing, and deleting vaccination records.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';
import {
  getVaccinations,
  addVaccination,
  updateVaccination,
  deleteVaccination,
} from '../services/databaseService';
import { useTranslation } from '../i18n/LanguageContext';

// ─── Common Vaccines for Quick Select ─────────────────────────────
const COMMON_VACCINES = [
  'FMD (Foot & Mouth)',
  'Brucellosis',
  'Black Quarter',
  'Hemorrhagic Septicemia',
  'Anthrax',
  'Theileriosis',
  'PPR (Peste des Petits)',
  'Deworming',
];

export default function HealthScreen() {
  const { t } = useTranslation();
  const [vaccinations, setVaccinations] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all | scheduled | completed
  const [showVaccineDropdown, setShowVaccineDropdown] = useState(false);

  // Form state
  const [animalId, setAnimalId] = useState('');
  const [rfidTag, setRfidTag] = useState('');
  const [vaccineName, setVaccineName] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadVaccinations();
  }, []);

  const loadVaccinations = async () => {
    const data = await getVaccinations();
    setVaccinations(data);
  };

  const handleAdd = async () => {
    if (!vaccineName.trim()) {
      Alert.alert('Required', 'Please select or enter a vaccine name');
      return;
    }
    if (!date.trim()) {
      Alert.alert('Required', 'Please enter a date (DD/MM/YYYY)');
      return;
    }

    await addVaccination({
      animalId: animalId.trim() || 'General',
      rfidTag: rfidTag.trim() || 'N/A',
      vaccineName: vaccineName.trim(),
      date: date.trim(),
      notes: notes.trim(),
      status: 'scheduled',
    });

    // Reset form
    setAnimalId('');
    setRfidTag('');
    setVaccineName('');
    setDate('');
    setNotes('');
    setShowAddModal(false);
    loadVaccinations();
  };

  const handleComplete = async (id) => {
    await updateVaccination(id, { status: 'completed' });
    loadVaccinations();
  };

  const handleDelete = (id) => {
    Alert.alert(t('common.confirm'), t('animals.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteVaccination(id);
          loadVaccinations();
        },
      },
    ]);
  };

  const filteredVaccinations = vaccinations.filter((v) => {
    if (filter === 'all') return true;
    return v.status === filter;
  });

  const scheduledCount = vaccinations.filter((v) => v.status === 'scheduled').length;
  const completedCount = vaccinations.filter((v) => v.status === 'completed').length;

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: COLORS.warning }]}>
          <Text style={styles.summaryNumber}>{scheduledCount}</Text>
          <Text style={styles.summaryLabel}>{t('health.scheduled')}</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: COLORS.safe }]}>
          <Text style={styles.summaryNumber}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>{t('health.completed')}</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.summaryNumber}>{vaccinations.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { key: 'all',       label: t('common.select') },
          { key: 'scheduled', label: t('health.scheduled') },
          { key: 'completed', label: t('health.completed') },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterBtnText, filter === f.key && styles.filterBtnTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Records List */}
      <ScrollView style={styles.list}>
        {filteredVaccinations.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="needle" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>{t('health.noRecords')}</Text>
            <Text style={styles.emptySubtext}>{t('health.addRecord')}</Text>
          </View>
        ) : (
          filteredVaccinations.map((vac) => (
            <View key={vac.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View style={styles.recordIcon}>
                  <MaterialCommunityIcons
                    name={vac.status === 'completed' ? 'check-circle' : 'clock-outline'}
                    size={24}
                    color={vac.status === 'completed' ? COLORS.safe : COLORS.warning}
                  />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordVaccine}>{vac.vaccineName}</Text>
                  <Text style={styles.recordAnimal}>
                    🐄 {vac.animalId} • 📅 {vac.date}
                  </Text>
                  {vac.rfidTag && vac.rfidTag !== 'N/A' ? (
                    <Text style={styles.recordRfid}>🏷️ RFID: {vac.rfidTag}</Text>
                  ) : null}
                  {vac.notes ? (
                    <Text style={styles.recordNotes}>{vac.notes}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.recordActions}>
                {vac.status === 'scheduled' && (
                  <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={() => handleComplete(vac.id)}
                  >
                    <MaterialCommunityIcons name="check" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(vac.id)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Add FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Vaccination Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('health.addVaccination')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Vaccine Dropdown */}
            <Text style={styles.inputLabel}>{t('health.vaccineName')}</Text>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setShowVaccineDropdown(!showVaccineDropdown)}
            >
              <Text style={vaccineName ? styles.dropdownText : styles.dropdownPlaceholder}>
                {vaccineName || 'Select a vaccine...'}
              </Text>
              <MaterialCommunityIcons
                name={showVaccineDropdown ? 'chevron-up' : 'chevron-down'}
                size={22}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            {showVaccineDropdown && (
              <View style={styles.dropdownList}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {COMMON_VACCINES.map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[
                        styles.dropdownItem,
                        vaccineName === v && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setVaccineName(v);
                        setShowVaccineDropdown(false);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={vaccineName === v ? 'radiobox-marked' : 'radiobox-blank'}
                        size={20}
                        color={vaccineName === v ? COLORS.primary : COLORS.textSecondary}
                      />
                      <Text
                        style={[
                          styles.dropdownItemText,
                          vaccineName === v && styles.dropdownItemTextActive,
                        ]}
                      >
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Or type a custom vaccine name..."
              value={vaccineName}
              onChangeText={(text) => {
                setVaccineName(text);
                setShowVaccineDropdown(false);
              }}
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>{t('health.animalId')}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. COW-001"
              value={animalId}
              onChangeText={setAnimalId}
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>{t('health.rfidTag')}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. RFID-00234"
              value={rfidTag}
              onChangeText={setRfidTag}
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>{t('health.date')} (DD/MM/YYYY)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 25/02/2026"
              value={date}
              onChangeText={setDate}
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>{t('health.notes')}</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Any additional notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholderTextColor={COLORS.textSecondary}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
              <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
            <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  summaryRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    elevation: 1,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
    paddingHorizontal: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  recordCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  recordIcon: {},
  recordInfo: {
    flex: 1,
  },
  recordVaccine: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  recordAnimal: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recordNotes: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  recordRfid: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  completeBtn: {
    backgroundColor: COLORS.safe,
    borderRadius: 20,
    padding: 8,
  },
  deleteBtn: {
    backgroundColor: '#fde8e8',
    borderRadius: 20,
    padding: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dropdownText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  dropdownList: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#E8F5E9',
  },
  dropdownItemText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
