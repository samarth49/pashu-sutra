/**
 * Pashu-Sutra App
 * Main entry point — wraps the app with Paper provider and Navigation.
 * Also runs vaccination reminder checker on startup and periodically.
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS, INTERVALS } from './src/config/constants';
import { checkVaccinationReminders } from './src/services/vaccinationChecker';

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
    // Check vaccination reminders on app start
    checkVaccinationReminders();

    // Then check periodically (every hour by default)
    const interval = setInterval(
      checkVaccinationReminders,
      INTERVALS.VACCINATION_CHECK_MS
    );

    return () => clearInterval(interval);
  }, []);

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" backgroundColor={COLORS.primaryDark} />
      <AppNavigator />
    </PaperProvider>
  );
}
