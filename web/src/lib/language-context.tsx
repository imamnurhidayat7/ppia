"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { translations, TranslationKey } from "./translations";

type Language = "en" | "id";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Default context values
const defaultContext: LanguageContextType = {
  language: "en",
  setLanguage: () => {},
  t: (key) => translations.en[key] || key,
};

/**
 * The interface language is English. There is no language switcher any more —
 * it only ever existed inside the dashboard, and CMS content is entered once
 * rather than per language, so switching changed built-in fallback copy but not
 * the words an editor actually typed.
 *
 * Any value stored by the old switcher is deliberately ignored: without a
 * switcher, a visitor whose browser still held "id" would have no way back.
 * The context stays because public components use it to pick fallback copy.
 */
function getInitialLanguage(): Language {
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Use initializer function to avoid hydration mismatch and setState in effect
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("ppia-language", lang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  }, [language]);

  const contextValue = { language, setLanguage: handleSetLanguage, t };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return defaultContext;
  }
  return context;
}
