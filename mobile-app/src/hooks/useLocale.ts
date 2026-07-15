import { useState, useCallback } from 'react'
import { translations, type Locale, type TranslationKey } from '@/i18n/translations'

const STORAGE_KEY = 'sv-locale'

function getInitial(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'he' || stored === 'en') return stored
  return navigator.language.startsWith('he') ? 'he' : 'en'
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(getInitial)

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem(STORAGE_KEY, l)
    setLocaleState(l)
    document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = l
  }, [])

  const t = useCallback(
    (key: TranslationKey) => translations[locale][key],
    [locale],
  )

  return { locale, setLocale, t, isRTL: locale === 'he' }
}
