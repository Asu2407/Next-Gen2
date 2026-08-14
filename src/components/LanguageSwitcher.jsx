/**
 * SAHAYAK — Language Switcher
 * A compact 3-button pill (EN · हि · অস).
 * Styled with existing design tokens: --panel-bg, --panel-border, --cyan.
 * Position: top-right of any page header. Pass className/style to override placement.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { useLang } from '../i18n/LangContext'

export default function LanguageSwitcher({ style = {} }) {
  const { lang, setLang, langs } = useLang()

  return (
    <div
      role="group"
      aria-label="Language selector"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(8,14,26,0.7)',
        border: '1px solid var(--panel-border)',
        borderRadius: 8,
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      {langs.map((l, idx) => {
        const isActive = lang === l.code
        return (
          <motion.button
            key={l.code}
            onClick={() => setLang(l.code)}
            aria-pressed={isActive}
            title={l.native}
            whileTap={{ scale: 0.95 }}
            style={{
              position: 'relative',
              padding: '4px 10px',
              minWidth: 34,
              minHeight: 28,
              border: 'none',
              borderRight: idx < langs.length - 1 ? '1px solid var(--panel-border)' : 'none',
              background: isActive
                ? 'rgba(0,229,255,0.12)'
                : 'transparent',
              color: isActive ? 'var(--cyan)' : 'var(--text-muted)',
              fontSize: 11,
              fontWeight: isActive ? 700 : 400,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: isActive ? '0.04em' : '0',
              transition: 'background 0.18s ease, color 0.18s ease',
              outline: 'none',
            }}
            // Keyboard focus ring using outline (not box-shadow to avoid blur on text)
            onFocus={e => { e.currentTarget.style.outline = '2px solid var(--cyan)'; e.currentTarget.style.outlineOffset = '-2px' }}
            onBlur={e => { e.currentTarget.style.outline = 'none' }}
          >
            {isActive && (
              <motion.span
                layoutId="lang-active-bg"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,229,255,0.1)',
                  zIndex: 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 36 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>{l.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
