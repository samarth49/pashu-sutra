/**
 * Language Context
 * Provides language selection globally. Persists choice to AsyncStorage.
 * Usage: const { t, language, setLanguage } = useTranslation();
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from './translations';

const LANGUAGE_KEY = '@pashusutra_language';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: () => '',
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    // Load persisted language on startup
    AsyncStorage.getItem(LANGUAGE_KEY).then((saved) => {
      if (saved && translations[saved]) {
        setLanguageState(saved);
      }
    });
  }, []);

  const setLanguage = async (lang) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  };

  /**
   * Translate a dot-notation key, e.g. t('dashboard.status')
   */
  const t = (key) => {
    const parts = key.split('.');
    let result = translations[language];
    for (const part of parts) {
      result = result?.[part];
    }
    return result ?? key; // fallback to key name if not found
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
