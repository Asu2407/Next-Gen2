/**
 * Module 4 — Tele-Maternity Emergency Bridge
 * Simulated call-connection flow for pregnant / labor Tier 1 cases.
 * Updates tele_health_status via PATCH /queue/{case_id} so the triage
 * dashboard reflects which cases have a nurse actively on the line.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Constants ──────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''  // set VITE_API_BASE_URL when deployed; empty string uses the Vite dev proxy → localhost:8000

// Canonical tier colors from GEMINI.md
const TIER_COLOR = {
  'Tier 1': '#E24B4A',
  'Tier 2': '#EF9F27',
  'Tier 3': '#639922',
}

// Simulated ANM nurse names
const NURSE_NAMES = [
  'ANM Priya Borthakur',
  'ANM Ritu Hazarika',
  'ANM Sanjukta Das',
  'ANM Meenakshi Gogoi',
  'ANM Dipika Choudhury',
]

// First-aid guidance script read out by nurse during maternity emergencies
const MATERNITY_SCRIPT = [
  {
    icon: '⏱',
    title: 'Time contractions',
    text: 'Ask how far apart contractions are. If under 5 min apart, delivery may be imminent — stay on the line.',
  },
  {
    icon: '🛏',
    title: 'Safe positioning',
    text: 'Help the mother lie on her left side to improve blood flow. Keep her elevated above floodwater level.',
  },
  {
    icon: '🫁',
    title: 'Breathing guidance',
    text: 'Instruct slow, deep breaths between contractions. Counting 4 in / 4 out helps regulate the pain response.',
  },
  {
    icon: '🚫',
    title: 'What to avoid',
    text: 'Do NOT attempt delivery without trained help. Avoid floodwater contact. Keep her warm — hypothermia risk is high.',
  },
  {
    icon: '📡',
    title: 'Keep line open',
    text: 'Stay connected. NDRF boat and medical team are en route. Relay live updates every 2 minutes.',
  },
]

// ── Animated audio waveform (10 bars, staggered) ──────────────────────────────
function AudioWaveform() {
  const heights = [0.4, 0.9, 0.6, 1.0, 0.5, 0.85, 0.45, 0.95, 0.6, 0.4]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          animate={{ scaleY: [h, h * 0.3, h, h * 0.7, h] }}
          transition={{
            repeat: Infinity,
            duration: 0.9 + i * 0.07,
            delay: i * 0.06,
            ease: 'easeInOut',
          }}
          style={{
            width: 3,
            height: 22,
            borderRadius: 2,
            background: 'var(--accent)',
            transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  )
}


// ── Live call timer (MM:SS) ───────────────────────────────────────────────────
function CallTimer({ running }) {
  const [seconds, setSeconds] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } else {
      clearInterval(ref.current)
      setSeconds(0)
    }
    return () => clearInterval(ref.current)
  }, [running])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', fontSize: 14, color: '#94a3b8' }}>
      {mm}:{ss}
    </span>
  )
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const cfg = {
    not_needed: { bg: 'rgba(100,116,139,0.18)', color: '#64748b', label: 'not needed'  },
    connecting: { bg: 'var(--t2-bg)',  color: 'var(--t2)', label: 'connecting…'  },
    connected:  { bg: 'var(--t1-bg)',   color: 'var(--t1)', label: 'on call'       },
    completed:  { bg: 'var(--t3-bg)',   color: 'var(--t3)', label: 'completed'     },
  }[status] ?? { bg: 'rgba(100,116,139,0.18)', color: '#64748b', label: status }


  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
      padding: '3px 9px', borderRadius: 20,
      border: `1px solid ${cfg.color}44`,
    }}>
      <motion.span
        animate={status === 'connected' ? { opacity: [1, 0.3, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.2 }}
        style={{
          width: 6, height: 6, borderRadius: '50%',
          background: cfg.color, display: 'inline-block', flexShrink: 0,
        }}
      />
      {cfg.label.toUpperCase()}
    </span>
  )
}

// ── Main TeleHealthBridge component ──────────────────────────────────────────
/**
 * Props:
 *   caseData         — full case object from the shared schema
 *   onStatusChange   — callback(caseId, newStatus) after each PATCH
 *   onClose          — optional close handler when used inside a modal
 */
export default function TeleHealthBridge({ caseData, onStatusChange, onClose }) {
  const [phase, setPhase] = useState('idle')           // idle | connecting | connected | completed
  const [localStatus, setLocalStatus] = useState(caseData?.tele_health_status ?? 'not_needed')
  const [nurseName] = useState(() => NURSE_NAMES[Math.floor(Math.random() * NURSE_NAMES.length)])
  const [patchError, setPatchError] = useState(null)

  const patchStatus = useCallback(async (newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/queue/${caseData.case_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tele_health_status: newStatus }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setLocalStatus(newStatus)
      onStatusChange?.(caseData.case_id, newStatus)
    } catch (e) {
      setPatchError(`Status update failed: ${e.message}`)
    }
  }, [caseData?.case_id, onStatusChange])

  const handleConnect = useCallback(async () => {
    setPatchError(null)
    setPhase('connecting')
    await patchStatus('connecting')
    setTimeout(async () => {
      setPhase('connected')
      await patchStatus('connected')
    }, 2000)
  }, [patchStatus])

  const handleEndCall = useCallback(async () => {
    setPhase('completed')
    await patchStatus('completed')
  }, [patchStatus])

  const handleReset = useCallback(async () => {
    setPhase('idle')
    await patchStatus('not_needed')
  }, [patchStatus])

  if (!caseData) return null

  const tierColor = TIER_COLOR[caseData.tier] ?? '#64748b'
  const isEligible =
    caseData.vulnerability_flags?.includes('pregnant') ||
    caseData.emergency_categories?.includes('labor')

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px 22px',
        color: 'var(--text-primary)',
        maxWidth: 480,
        width: '100%',
      }}
    >

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{
              background: tierColor, color: '#fff',
              fontSize: 9, fontWeight: 700, padding: '2px 7px',
              borderRadius: 4, letterSpacing: '0.07em',
            }}>
              {caseData.tier ?? '—'}
            </span>
            <StatusPill status={localStatus} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.4 }}>
            📍 {caseData.gps_or_landmark}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
            🎯 Urgency {caseData.urgency_score}/5 · {caseData.victim_count} person(s)
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#475569',
              cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Eligibility notice */}
      {!isEligible && (
        <div style={{
          background: 'rgba(239,159,39,0.09)', border: '1px solid #EF9F2733',
          borderRadius: 7, padding: '8px 11px', marginBottom: 12,
          fontSize: 11, color: '#EF9F27',
        }}>
          ⚠ No pregnant/labor flag on this case. Tele-maternity bridge is available but may not be the primary need.
        </div>
      )}

      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 16 }} />

      {/* ── Call flow phases ── */}
      <AnimatePresence mode="wait">

        {/* ── IDLE ── */}
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.65 }}>
              Connect this case to an available Auxiliary Nurse Midwife (ANM)
              for live remote guidance while the NDRF rescue boat is en route.
            </div>
            <motion.button
              onClick={handleConnect}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="btn-primary"
              style={{
                width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 16 }}>📞</span> Connect to nurse
            </motion.button>
          </motion.div>
        )}

        {/* ── CONNECTING ── */}
        {phase === 'connecting' && (
          <motion.div
            key="connecting"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ textAlign: 'center', padding: '24px 0' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                border: '3px solid rgba(56, 189, 248, 0.15)',
                borderTop: '3px solid var(--accent)',
                margin: '0 auto 16px',
              }}
            />
            <div style={{ color: 'var(--t2)', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
              Connecting…
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              Routing to nearest available ANM nurse
            </div>
          </motion.div>
        )}

        {/* ── CONNECTED ── */}
        {phase === 'connected' && (
          <motion.div
            key="connected"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Live call bar */}
            <div style={{
              background: 'var(--t1-bg)',
              border: '1px solid rgba(226, 75, 74, 0.25)',
              borderRadius: 10, padding: '11px 14px',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <motion.div
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  style={{ width: 9, height: 9, borderRadius: '50%', background: '#E24B4A', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{nurseName}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>District Health Mission · Assam</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AudioWaveform />
                <CallTimer running={phase === 'connected'} />
              </div>
            </div>

            {/* Script panel */}
            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                color: '#475569', marginBottom: 9,
              }}>
                NURSE GUIDANCE SCRIPT — MATERNITY EMERGENCY
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {MATERNITY_SCRIPT.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.09, duration: 0.22 }}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 8, padding: '8px 11px',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.55 }}>
                        {item.text}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* End call button */}
            <motion.button
              onClick={handleEndCall}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%', padding: '10px 0',
                background: 'rgba(100,116,139,0.1)',
                border: '1px solid rgba(100,116,139,0.25)',
                borderRadius: 9, cursor: 'pointer',
                color: '#94a3b8', fontWeight: 600, fontSize: 13,
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              <span style={{ fontSize: 14 }}>📵</span> End call — mark completed
            </motion.button>
          </motion.div>
        )}

        {/* ── COMPLETED ── */}
        {phase === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ textAlign: 'center', padding: '20px 0' }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{ fontSize: 38, marginBottom: 12 }}
            >
              ✅
            </motion.div>
            <div style={{ color: '#639922', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
              Call completed
            </div>
            <div style={{ color: '#64748b', fontSize: 11, lineHeight: 1.6, marginBottom: 20 }}>
              {nurseName} has been released.<br />
              Case status updated to <strong style={{ color: '#639922' }}>completed</strong>.
            </div>
            <motion.button
              onClick={handleReset}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '8px 22px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, cursor: 'pointer',
                color: '#94a3b8', fontSize: 12, fontFamily: 'inherit',
              }}
            >
              Reset for demo
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {patchError && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              marginTop: 12, padding: '8px 12px',
              background: 'rgba(226,75,74,0.1)',
              border: '1px solid #E24B4A33',
              borderRadius: 7, fontSize: 11, color: '#fca5a5',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span>⚠ {patchError}</span>
            <button
              onClick={() => setPatchError(null)}
              style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 14 }}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
