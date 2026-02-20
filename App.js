/**
 * Pashu-Sutra App
 * Main entry point — wraps the app with Paper provider and Navigation.
 * Runs vaccination reminder checker on startup and periodically.
 * Flushes offline write queue by polling connectivity every 30s.
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS, INTERVALS } from './src/config/constants';
import { checkVaccinationReminders } from './src/services/vaccinationChecker';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { AnimalProvider } from './src/context/AnimalContext';
import { flushQueue, getPendingCount, isOnline } from './src/services/offlineService';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.accent,
    background: COLORS.background,
    surface: COLORS.surface,
  },
};

export default function App() {
  useEffect(() => {
    // ── Vaccination reminders ────────────────────────────────────────
    checkVaccinationReminders();
    const vacInterval = setInterval(checkVaccinationReminders, INTERVALS.VACCINATION_CHECK_MS);

    // ── Offline queue: poll every 30s and flush if back online ──────
    const offlineInterval = setInterval(async () => {
      const pending = await getPendingCount();
      if (pending > 0 && await isOnline()) {
        console.log(`[App] Online again. Flushing ${pending} queued items...`);
        await flushQueue();
      }
    }, 30000);

    return () => {
      clearInterval(vacInterval);
      clearInterval(offlineInterval);
    };
  }, []);

  return (
    <LanguageProvider>
      <AnimalProvider>
        <PaperProvider theme={theme}>
          <StatusBar style="light" backgroundColor={COLORS.primaryDark} />
          <AppNavigator />
        </PaperProvider>
      </AnimalProvider>
    </LanguageProvider>
  );
}
