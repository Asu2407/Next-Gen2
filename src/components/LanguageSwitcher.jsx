/**
 * SAHAYAK — Language Switcher
 * - Desktop: Compact 3-button pill (EN · हि · অস)
 * - Mobile: Ultra-compact dropdown menu with subtle arrow, saving precious top-bar space
 * Styled with existing design tokens: --panel-bg, --panel-border, --cyan.
 */

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '../i18n/LangContext'

export default function LanguageSwitcher({ isMobile = false, style = {} }) {
  const { lang, setLang, langs } = useLang()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const currentLang = langs.find(l => l.code === lang) || langs[0]

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [dropdownOpen])

  // ── MOBILE DROPDOWN VERSION ──
  if (isMobile) {
    return (
      <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', flexShrink: 0, ...style }}>
        <motion.button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          whileTap={{ scale: 0.94 }}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
          aria-label="Select language"
          title={`Language: ${currentLang.native}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '4px clamp(4px, 1.4vw, 7px)',
            minHeight: 28,
            background: dropdownOpen ? 'rgba(0,229,255,0.2)' : 'rgba(8,14,26,0.7)',
            border: `1px solid ${dropdownOpen ? 'var(--cyan)' : 'var(--panel-border)'}`,
            borderRadius: 8,
            color: 'var(--cyan)',
            fontSize: 'clamp(10px, 2.7vw, 11.5px)',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ fontSize: 'clamp(11px, 2.8vw, 13px)' }}>🌐</span>
          <span>{currentLang.label}</span>
          <span style={{ fontSize: 8, opacity: 0.75, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
            ▼
          </span>
        </motion.button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              role="listbox"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                zIndex: 60,
                background: 'rgba(10,16,30,0.96)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(0,229,255,0.3)',
                borderRadius: 10,
                padding: '4px',
                minWidth: 100,
                boxShadow: '0 8px 24px rgba(0,0,0,0.85), 0 0 12px rgba(0,229,255,0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {langs.map((l) => {
                const isActive = lang === l.code
                return (
                  <button
                    key={l.code}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      setLang(l.code)
                      setDropdownOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      background: isActive ? 'rgba(0,229,255,0.15)' : 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      color: isActive ? 'var(--cyan)' : '#cbd5e1',
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <span>{l.native}</span>
                    <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 700 }}>{l.label}</span>
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── DESKTOP PILL VERSION ──
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
