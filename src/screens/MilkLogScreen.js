/**
 * MilkLogScreen
 * Log and track daily milk yield per animal.
 * Shows a 14-day trend chart, today's total, and weekly average.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Modal, ActivityIndicator, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { COLORS } from '../config/constants';
import { getMilkLogs, addMilkLog, deleteMilkLog } from '../services/databaseService';
import { useAnimal } from '../context/AnimalContext';
import { useTranslation } from '../i18n/LanguageContext';

const { width } = Dimensions.get('window');

// ─── Helpers ────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

// ─── Component ──────────────────────────────────────────────────────

export default function MilkLogScreen() {
  const { t } = useTranslation();
  const { selectedAnimal } = useAnimal();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [date, setDate] = useState(todayStr());
  const [session, setSession] = useState('morning'); // 'morning' | 'evening'
  const [litres, setLitres] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    load();
  }, [selectedAnimal]);

  const load = useCallback(async () => {
    if (!selectedAnimal) { setLogs([]); setLoading(false); return; }
    setLoading(true);
    const data = await getMilkLogs(selectedAnimal.id, 60);
    setLogs(data);
    setLoading(false);
  }, [selectedAnimal]);

  const handleAdd = async () => {
    if (!litres || isNaN(parseFloat(litres))) {
      Alert.alert(t('common.error'), t('milk.enterLitres'));
      return;
    }
    if (!selectedAnimal) {
      Alert.alert(t('common.error'), t('dashboard.noAnimalSelected'));
      return;
    }
    setSaving(true);
    await addMilkLog({
      animalId: selectedAnimal.id,
      date, session,
      litres: parseFloat(litres),
      notes: notes.trim(),
    });
    setSaving(false);
    setShowModal(false);
    resetForm();
    load();
  };

  const handleDelete = (id) => {
    Alert.alert(t('common.confirm'), t('milk.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        await deleteMilkLog(id); load();
      }},
    ]);
  };

  const resetForm = () => {
    setDate(todayStr()); setSession('morning'); setLitres(''); setNotes('');
  };

  // ── Stats ──────────────────────────────────────────────────────────

  const todayTotal = logs
    .filter(l => l.date === todayStr())
    .reduce((sum, l) => sum + (l.litres || 0), 0);

  const weekTotal = logs
    .filter(l => {
      const d = new Date(l.date);
      return (Date.now() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
    })
    .reduce((sum, l) => sum + (l.litres || 0), 0);

  const weekAvg = (weekTotal / 7).toFixed(1);

  // ── Chart Data: last 14 unique dates ──────────────────────────────

  const chartData = (() => {
    const dailyMap = {};
    logs.forEach(l => {
      dailyMap[l.date] = (dailyMap[l.date] || 0) + (l.litres || 0);
    });
    const sortedDays = Object.keys(dailyMap).sort().slice(-14);
    if (sortedDays.length < 2) return null;
    return {
      labels: sortedDays.map(formatDate),
      datasets: [{ data: sortedDays.map(d => dailyMap[d]) }],
    };
  })();

  // ── Render ─────────────────────────────────────────────────────────

  if (!selectedAnimal) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="cow" size={64} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>{t('dashboard.noAnimalSelected')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: COLORS.primary }]}>
            <MaterialCommunityIcons name="cup" size={28} color={COLORS.primary} />
            <Text style={styles.summaryValue}>{todayTotal.toFixed(1)} L</Text>
            <Text style={styles.summaryLabel}>{t('milk.today')}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: COLORS.accent }]}>
            <MaterialCommunityIcons name="chart-line" size={28} color={COLORS.accent} />
            <Text style={styles.summaryValue}>{weekAvg} L</Text>
            <Text style={styles.summaryLabel}>{t('milk.weeklyAvg')}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#0288D1' }]}>
            <MaterialCommunityIcons name="calendar-week" size={28} color="#0288D1" />
            <Text style={styles.summaryValue}>{weekTotal.toFixed(1)} L</Text>
            <Text style={styles.summaryLabel}>{t('milk.weekTotal')}</Text>
          </View>
        </View>

        {/* 14-Day Chart */}
        {chartData && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{t('milk.trend14')}</Text>
            <LineChart
              data={chartData}
              width={width - 48}
              height={180}
              chartConfig={{
                backgroundGradientFrom: COLORS.surface,
                backgroundGradientTo: COLORS.surface,
                color: (op = 1) => `rgba(46, 125, 50, ${op})`,
                labelColor: (op = 1) => `rgba(0,0,0,${op})`,
                strokeWidth: 2,
                decimalPlaces: 1,
                propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.primary },
              }}
              bezier
              style={{ borderRadius: 12 }}
              yAxisSuffix=" L"
            />
          </View>
        )}

        {/* Log Entries */}
        <Text style={styles.sectionTitle}>{t('milk.history')}</Text>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
        ) : logs.length === 0 ? (
          <View style={styles.emptyInner}>
            <MaterialCommunityIcons name="cup-off-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>{t('milk.noLogs')}</Text>
          </View>
        ) : (
          logs.map(log => (
            <View key={log.id} style={styles.logCard}>
              <View style={[styles.sessionBadge, { backgroundColor: log.session === 'morning' ? '#FFF3E0' : '#E3F2FD' }]}>
                <MaterialCommunityIcons
                  name={log.session === 'morning' ? 'weather-sunny' : 'weather-night'}
                  size={20}
                  color={log.session === 'morning' ? '#F57C00' : '#1976D2'}
                />
              </View>
              <View style={styles.logInfo}>
                <Text style={styles.logLitres}>{log.litres} L</Text>
                <Text style={styles.logMeta}>
                  {log.date}  •  {log.session === 'morning' ? t('milk.morning') : t('milk.evening')}
                </Text>
                {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => handleDelete(log.id)} style={styles.deleteBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))
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
              <Text style={styles.modalTitle}>{t('milk.logMilk')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Session Toggle */}
            <View style={styles.toggleRow}>
              {['morning', 'evening'].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.toggleBtn, session === s && styles.toggleBtnActive]}
                  onPress={() => setSession(s)}
                >
                  <MaterialCommunityIcons
                    name={s === 'morning' ? 'weather-sunny' : 'weather-night'}
                    size={18}
                    color={session === s ? '#fff' : COLORS.textSecondary}
                  />
                  <Text style={[styles.toggleText, session === s && { color: '#fff' }]}>
                    {s === 'morning' ? t('milk.morning') : t('milk.evening')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>{t('milk.date')}</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>{t('milk.litres')}</Text>
            <TextInput
              style={styles.input}
              value={litres}
              onChangeText={setLitres}
              placeholder="e.g. 8.5"
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>{t('health.notes')}</Text>
            <TextInput
              style={[styles.input, { height: 64 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('milk.notesHint')}
              multiline
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

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  emptyInner: { alignItems: 'center', padding: 32, gap: 8 },

  summaryRow: { flexDirection: 'row', gap: 8, padding: 12 },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 12,
    alignItems: 'center', borderLeftWidth: 4, gap: 4,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  summaryValue: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  summaryLabel: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center' },

  chartCard: { backgroundColor: COLORS.surface, marginHorizontal: 12, borderRadius: 16, padding: 16, marginBottom: 4 },
  chartTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginHorizontal: 16, marginTop: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },

  logCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    marginHorizontal: 12, marginVertical: 4, borderRadius: 14, padding: 12, gap: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
  },
  sessionBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logInfo: { flex: 1 },
  logLitres: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  logMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  logNotes: { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 2 },
  deleteBtn: { padding: 6 },

  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },

  overlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

  toggleRow: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 12, backgroundColor: '#f0f0f0' },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontWeight: '600', color: COLORS.textSecondary, fontSize: 13 },

  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 4 },
  input: { backgroundColor: COLORS.background, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.textPrimary, borderWidth: 1, borderColor: '#e0e0e0' },

  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
