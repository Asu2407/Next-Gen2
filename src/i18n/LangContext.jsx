/**
 * SAHAYAK — Language Context
 * Provides: lang (string), setLang (fn), t (fn)
 *
 * Persists the chosen language to localStorage so it survives page refresh.
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import T from './translations'

export const LANGS = [
  { code: 'en', label: 'EN',  native: 'English'  },
  { code: 'hi', label: 'हि',  native: 'हिन्दी'    },
  { code: 'as', label: 'অস', native: 'অসমীয়া'  },
]

const LangContext = createContext(null)

const STORAGE_KEY = 'sahayak_lang'

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved && LANGS.find(l => l.code === saved) ? saved : 'en'
  })

  const setLang = useCallback((code) => {
    setLangState(code)
    localStorage.setItem(STORAGE_KEY, code)
  }, [])

  // t(key) — returns the translated string for the current language.
  // Falls back: current lang → English → key itself (so missing keys are visible in dev)
  const t = useCallback((key) => {
    const entry = T[key]
    if (!entry) {
      if (import.meta.env.DEV) console.warn(`[i18n] Missing key: "${key}"`)
      return key
    }
    return entry[lang] ?? entry['en'] ?? key
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, setLang, t, langs: LANGS }}>
      {children}
    </LangContext.Provider>
  )
}

/** Use inside any component that needs translations. */
export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang() must be used inside <LangProvider>')
  return ctx
}
