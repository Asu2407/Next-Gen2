/**
 * Renders active toasts triggered via showToast() from src/utils/toast.js.
 * Mounted once at the App root so it persists across tab switches
 * (map / tele / audit / field) and every module can surface errors
 * consistently instead of using the browser's native alert().
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { subscribeToast } from './utils/toast'

const TYPE_STYLE = {
  error:   { border: '#E24B4A', bg: 'rgba(226,75,74,0.12)', text: '#fca5a5', icon: '⚠' },
  success: { border: '#639922', bg: 'rgba(99,153,34,0.12)', text: '#bbf7d0', icon: '✓' },
}

export default function ToastHost() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    return subscribeToast((toast) => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 5000)
    })
  }, [])

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8,
      alignItems: 'center', pointerEvents: 'none', width: 'min(92vw, 420px)',
    }}>
      <AnimatePresence>
        {toasts.map(toast => {
          const cfg = TYPE_STYLE[toast.type] ?? TYPE_STYLE.error
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              onClick={() => dismiss(toast.id)}
              style={{
                pointerEvents: 'auto', cursor: 'pointer', width: '100%',
                background: 'rgba(8,14,26,0.96)', backdropFilter: 'blur(16px)',
                border: `1px solid ${cfg.border}55`, borderLeft: `4px solid ${cfg.border}`,
                borderRadius: 10, padding: '12px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${cfg.border}22`,
                fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
              }}
            >
              <span style={{ fontSize: 15, color: cfg.border, flexShrink: 0, lineHeight: 1.4 }}>{cfg.icon}</span>
              <span style={{ fontSize: 12.5, color: cfg.text, lineHeight: 1.4, flex: 1 }}>{toast.message}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>✕</span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
