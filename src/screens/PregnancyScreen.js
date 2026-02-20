/**
 * PregnancyScreen
 * Track pregnancies per animal with auto-calculated due dates,
 * a progress ring, and status management (pregnant/delivered/aborted).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';
import {
  getPregnancies, addPregnancy, updatePregnancyStatus,
  deletePregnancy, GESTATION_DAYS,
} from '../services/databaseService';
import { useAnimal } from '../context/AnimalContext';
import { useTranslation } from '../i18n/LanguageContext';

// ─── Progress Ring (SVG-free, CSS-style using View borders) ─────────

function ProgressRing({ percent, days }) {
  const color = percent >= 90 ? COLORS.danger : percent >= 60 ? COLORS.warning : COLORS.primary;
  return (
    <View style={styles.ringOuter}>
      <View style={[styles.ringInner, { borderColor: color }]}>
        <Text style={[styles.ringPercent, { color }]}>{Math.round(percent)}%</Text>
        <Text style={styles.ringLabel}>{days}d left</Text>
      </View>
    </View>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────

const STATUS_META = {
  pregnant:  { color: COLORS.primary, icon: 'heart-pulse',    label: 'pregnant' },
  delivered: { color: COLORS.safe,    icon: 'baby-face',      label: 'delivered' },
  aborted:   { color: COLORS.danger,  icon: 'close-circle',   label: 'aborted' },
};

// ─── Helpers ─────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function calcProgress(matingDate, gestationDays) {
  const mating = new Date(matingDate);
  const elapsed = (Date.now() - mating.getTime()) / (1000 * 60 * 60 * 24);
  return Math.min((elapsed / gestationDays) * 100, 100);
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

// ─── Component ───────────────────────────────────────────────────────

export default function PregnancyScreen() {
  const { t } = useTranslation();
  const { selectedAnimal } = useAnimal();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [matingDate, setMatingDate] = useState(todayStr());
  const [method, setMethod] = useState('natural');
  const [notes, setNotes] = useState('');

  useEffect(() => { load(); }, [selectedAnimal]);

  const load = useCallback(async () => {
    if (!selectedAnimal) { setRecords([]); setLoading(false); return; }
    setLoading(true);
    const data = await getPregnancies(selectedAnimal.id);
    setRecords(data);
    setLoading(false);
  }, [selectedAnimal]);

  const handleAdd = async () => {
    if (!matingDate) { Alert.alert(t('common.error'), t('pregnancy.enterDate')); return; }
    if (!selectedAnimal) { Alert.alert(t('common.error'), t('dashboard.noAnimalSelected')); return; }
    setSaving(true);
    await addPregnancy({
      animalId: selectedAnimal.id,
      species: selectedAnimal.species || 'cow',
      matingDate,
      method,
      notes: notes.trim(),
    });
    setSaving(false);
    setShowModal(false);
    setMatingDate(todayStr()); setMethod('natural'); setNotes('');
    load();
  };

  const handleStatusUpdate = (record) => {
    Alert.alert(t('pregnancy.updateStatus'), '', [
      { text: t('pregnancy.delivered'), onPress: async () => {
        await updatePregnancyStatus(record.id, 'delivered', todayStr()); load();
      }},
      { text: t('pregnancy.aborted'), style: 'destructive', onPress: async () => {
        await updatePregnancyStatus(record.id, 'aborted'); load();
      }},
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleDelete = (id) => {
    Alert.alert(t('common.confirm'), t('animals.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        await deletePregnancy(id); load();
      }},
    ]);
  };

  if (!selectedAnimal) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="cow" size={64} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>{t('dashboard.noAnimalSelected')}</Text>
      </View>
    );
  }

  const active = records.filter(r => r.status === 'pregnant');
  const past   = records.filter(r => r.status !== 'pregnant');

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Active Pregnancies */}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : active.length === 0 && past.length === 0 ? (
          <View style={styles.emptyInner}>
            <MaterialCommunityIcons name="baby-carriage" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>{t('pregnancy.noRecords')}</Text>
            <Text style={styles.emptyText}>{t('pregnancy.tapToAdd')}</Text>
          </View>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t('pregnancy.active')}</Text>
                {active.map(r => {
                  const daysLeft = daysUntil(r.expectedDelivery);
                  const pct = calcProgress(r.matingDate, r.gestationDays);
                  const meta = STATUS_META.pregnant;
                  return (
                    <View key={r.id} style={styles.card}>
                      <View style={styles.cardRow}>
                        <ProgressRing percent={pct} days={Math.max(0, daysLeft)} />
                        <View style={styles.cardInfo}>
                          <View style={[styles.statusBadge, { backgroundColor: meta.color + '20' }]}>
                            <MaterialCommunityIcons name={meta.icon} size={14} color={meta.color} />
                            <Text style={[styles.statusText, { color: meta.color }]}>
                              {t(`pregnancy.${meta.label}`)}
                            </Text>
                          </View>
                          <Text style={styles.infoRow}>
                            🐄 {t('pregnancy.matingDate')}: {r.matingDate}
                          </Text>
                          <Text style={styles.infoRow}>
                            🗓️ {t('pregnancy.dueDate')}: {r.expectedDelivery}
                          </Text>
                          <Text style={styles.infoRow}>
                            🧬 {t('pregnancy.method')}: {r.method === 'AI'
                              ? t('pregnancy.methodAI')
                              : t('pregnancy.methodNatural')}
                          </Text>
                          {r.notes ? <Text style={styles.notes}>{r.notes}</Text> : null}
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusUpdate(r)}>
                          <MaterialCommunityIcons name="update" size={16} color={COLORS.primary} />
                          <Text style={[styles.actionText, { color: COLORS.primary }]}>{t('pregnancy.updateStatus')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(r.id)} style={styles.deleteBtn}>
                          <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {past.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t('pregnancy.history')}</Text>
                {past.map(r => {
                  const meta = STATUS_META[r.status] || STATUS_META.delivered;
                  return (
                    <View key={r.id} style={[styles.card, styles.pastCard]}>
                      <View style={[styles.statusBadge, { backgroundColor: meta.color + '20', alignSelf: 'flex-start' }]}>
                        <MaterialCommunityIcons name={meta.icon} size={14} color={meta.color} />
                        <Text style={[styles.statusText, { color: meta.color }]}>
                          {t(`pregnancy.${meta.label}`)}
                        </Text>
                      </View>
                      <Text style={styles.infoRow}>🐄 {t('pregnancy.matingDate')}: {r.matingDate}</Text>
                      {r.actualDelivery
                        ? <Text style={styles.infoRow}>✅ {t('pregnancy.deliveredOn')}: {r.actualDelivery}</Text>
                        : <Text style={styles.infoRow}>📅 {t('pregnancy.dueDate')}: {r.expectedDelivery}</Text>
                      }
                      <TouchableOpacity onPress={() => handleDelete(r.id)} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('pregnancy.addRecord')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Method Toggle */}
            <View style={styles.toggleRow}>
              {['natural', 'AI'].map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.toggleBtn, method === m && styles.toggleBtnActive]}
                  onPress={() => setMethod(m)}
                >
                  <MaterialCommunityIcons
                    name={m === 'natural' ? 'heart' : 'needle'}
                    size={16}
                    color={method === m ? '#fff' : COLORS.textSecondary}
                  />
                  <Text style={[styles.toggleText, method === m && { color: '#fff' }]}>
                    {m === 'natural' ? t('pregnancy.methodNatural') : t('pregnancy.methodAI')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>{t('pregnancy.matingDate')} (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={matingDate}
              onChangeText={setMatingDate}
              placeholder="e.g. 2026-01-10"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>{t('health.notes')}</Text>
            <TextInput
              style={[styles.input, { height: 60 }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder={t('milk.notesHint')}
              placeholderTextColor={COLORS.textSecondary}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <><MaterialCommunityIcons name="content-save" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>{t('common.save')}</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyInner: { alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginHorizontal: 16,
    marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8,
  },

  card: {
    backgroundColor: COLORS.surface, marginHorizontal: 12, marginVertical: 6,
    borderRadius: 16, padding: 16, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  pastCard: { opacity: 0.85 },
  cardRow: { flexDirection: 'row', gap: 14 },
  cardInfo: { flex: 1, gap: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontWeight: '600', fontSize: 13 },
  deleteBtn: { padding: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  infoRow: { fontSize: 13, color: COLORS.textPrimary },
  notes: { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 2 },

  ringOuter: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  ringPercent: { fontSize: 16, fontWeight: '800' },
  ringLabel: { fontSize: 9, color: COLORS.textSecondary },

  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#E91E63', alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#E91E63', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },

  overlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

  toggleRow: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 12, backgroundColor: '#f0f0f0' },
  toggleBtnActive: { backgroundColor: '#E91E63' },
  toggleText: { fontWeight: '600', color: COLORS.textSecondary, fontSize: 13 },

  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 4 },
  input: { backgroundColor: COLORS.background, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.textPrimary, borderWidth: 1, borderColor: '#e0e0e0' },

  saveBtn: { backgroundColor: '#E91E63', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
