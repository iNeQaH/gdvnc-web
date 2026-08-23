'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { en, vi, type DictKey } from '@/lib/dictionaries';

type Language = 'en' | 'vi';
type Vars = Record<string, string | number>;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: DictKey, vars?: Vars) => string;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`
  );
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: () => {},
  t: (key) => en[key] || key,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('vi');

  useEffect(() => {
    const saved = localStorage.getItem('gdvnc_language') as Language;
    if (saved === 'vi' || saved === 'en') {
      setLanguageState(saved);
    } else {
      setLanguageState('vi');
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('gdvnc_language', lang);
  };

  const t = useCallback(
    (key: DictKey, vars?: Vars): string => {
      const dictionary = language === 'en' ? en : vi;
      const raw = dictionary[key] || en[key] || key;
      return interpolate(raw, vars);
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
