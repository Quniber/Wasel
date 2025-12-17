import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import ar from './locales/ar.json';

const LANGUAGE_KEY = 'app-language';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

// Get stored language or device language
const getStoredLanguage = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored && (stored === 'en' || stored === 'ar')) {
      return stored;
    }
    // Default to device language if supported
    const deviceLang = Localization.locale.split('-')[0];
    return deviceLang === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
};

// Initialize i18n
export const initI18n = async () => {
  const language = await getStoredLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  return language;
};

// Change language
export const changeLanguage = async (lang: 'en' | 'ar') => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
};

// Check if RTL
export const isRTL = () => i18n.language === 'ar';

export default i18n;
