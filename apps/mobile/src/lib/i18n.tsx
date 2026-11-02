import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, use, useEffect, useState } from 'react';

// English is the source of truth: the Hindi dictionary must have exactly the same keys,
// which TypeScript enforces through `satisfies Record<Key, string>`.
const en = {
  appName: "Mummy's Kitchen",
  'tabs.orders': 'Orders',
  'tabs.newOrder': 'New order',
  'tabs.menu': 'Menu',
  'tabs.dues': 'Dues',
  'tabs.settings': 'Settings',
  'login.title': 'Enter PIN',
  'login.wrongPin': 'Wrong PIN, try again',
  'login.tooMany': 'Too many tries. Wait a minute.',
  'login.offline': 'No internet. Check connection and try again.',
  'settings.language': 'Language',
  'settings.logout': 'Log out',
  'settings.version': 'Version',
  'common.comingSoon': 'Coming soon',
  'common.retry': 'Retry',
} as const;

type Key = keyof typeof en;

const hi = {
  appName: 'मम्मीज़ किचन',
  'tabs.orders': 'ऑर्डर',
  'tabs.newOrder': 'नया ऑर्डर',
  'tabs.menu': 'मेन्यू',
  'tabs.dues': 'बकाया',
  'tabs.settings': 'सेटिंग',
  'login.title': 'पिन डालें',
  'login.wrongPin': 'गलत पिन, फिर से डालें',
  'login.tooMany': 'बहुत बार कोशिश हुई। एक मिनट रुकें।',
  'login.offline': 'इंटरनेट नहीं है। कनेक्शन देखकर फिर कोशिश करें।',
  'settings.language': 'भाषा',
  'settings.logout': 'लॉग आउट',
  'settings.version': 'वर्ज़न',
  'common.comingSoon': 'जल्द आ रहा है',
  'common.retry': 'फिर कोशिश करें',
} satisfies Record<Key, string>;

export type Language = 'en' | 'hi';
const dictionaries: Record<Language, Record<Key, string>> = { en, hi };
const STORAGE_KEY = 'language';

type I18n = { language: Language; setLanguage: (l: Language) => void; t: (key: Key) => string };
const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // First launch follows the phone's language; after that the user's choice is remembered per phone.
  const [language, setLanguageState] = useState<Language>(
    getLocales()[0]?.languageCode === 'hi' ? 'hi' : 'en',
  );

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((saved) => {
      if (saved === 'en' || saved === 'hi') setLanguageState(saved);
    });
  }, []);

  const setLanguage = (l: Language) => {
    setLanguageState(l);
    SecureStore.setItemAsync(STORAGE_KEY, l);
  };

  return (
    <I18nContext value={{ language, setLanguage, t: (key) => dictionaries[language][key] }}>
      {children}
    </I18nContext>
  );
}

export function useI18n(): I18n {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
