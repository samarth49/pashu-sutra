/**
 * Settings Screen
 * Language toggle, alert phone, geofence radius configuration.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';
import { useTranslation } from '../i18n/LanguageContext';

export default function SettingsScreen() {
  const { t, language, setLanguage } = useTranslation();

  const handleLanguageChange = async (lang) => {
    await setLanguage(lang);
    Alert.alert(
      lang === 'hi' ? 'भाषा बदली गई' : 'Language Changed',
      lang === 'hi' ? 'ऐप अब हिंदी में है।' : 'App is now in English.'
    );
  };

  const renderLanguageBtn = (lang, label, flag) => {
    const selected = language === lang;
    return (
      <TouchableOpacity
        style={[styles.langBtn, selected && styles.langBtnSelected]}
        onPress={() => handleLanguageChange(lang)}
      >
        <Text style={styles.langFlag}>{flag}</Text>
        <Text style={[styles.langLabel, selected && styles.langLabelSelected]}>
          {label}
        </Text>
        {selected && (
          <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="cog-outline" size={32} color={COLORS.primary} />
        <View>
          <Text style={styles.title}>{t('settings.title')}</Text>
          <Text style={styles.subtitle}>App Preferences</Text>
        </View>
      </View>

      {/* Language Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <MaterialCommunityIcons name="translate" size={16} color={COLORS.primaryDark} />
          {'  '}{t('settings.language')}
        </Text>
        <View style={styles.langContainer}>
          {renderLanguageBtn('en', 'English', '🇬🇧')}
          {renderLanguageBtn('hi', 'हिंदी', '🇮🇳')}
        </View>
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.primaryDark} />
          {'  '}App Info
        </Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Name</Text>
            <Text style={styles.infoValue}>Pashu-Sutra</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>Smart Livestock Management</Text>
          </View>
        </View>
      </View>

      {/* Thresholds Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <MaterialCommunityIcons name="thermometer-alert" size={16} color={COLORS.primaryDark} />
          {'  '}{t('settings.thresholds')}
        </Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('settings.tempHigh')}</Text>
            <Text style={[styles.infoValue, { color: COLORS.danger }]}>39.5°C</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('settings.bpmHigh')}</Text>
            <Text style={[styles.infoValue, { color: '#E91E63' }]}>100 BPM</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('settings.batteryLow')}</Text>
            <Text style={[styles.infoValue, { color: COLORS.warning }]}>20%</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 24,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  section: {
    margin: 16,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 12,
    paddingLeft: 4,
  },
  langContainer: {
    gap: 10,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  langBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#E8F5E9',
  },
  langFlag: {
    fontSize: 24,
  },
  langLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  langLabelSelected: {
    color: COLORS.primary,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
