'use client';
import { useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';

export function HtmlLangSync() {
  const { language } = useLanguage();
  useEffect(() => {
    document.documentElement.lang = language === 'id' ? 'id' : 'en';
  }, [language]);
  return null;
}
