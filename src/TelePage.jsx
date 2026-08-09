/**
 * Module 4 — Tele-Maternity Test Page
 * Lists all Tier 1 cases with pregnant/labor flags from the triage queue
 * and lets you trigger the TeleHealthBridge flow for each.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TeleHealthBridge from './TeleHealthBridge'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''  // set VITE_API_BASE_URL when deployed; empty string uses the Vite dev proxy → localhost:8000

// Tier colors — canonical from GEMINI.md
const TIER_COLOR = {
  'Tier 1': '#E24B4A',
  'Tier 2': '#EF9F27',
  'Tier 3': '#639922',
}

// Status display config
const STATUS_CFG = {
  not_needed: { color: '#475569', label: 'Not needed' },
  connecting:  { color: '#EF9F27', label: 'Connecting…' },
  connected:   { color: '#E24B4A', label: '● On call' },
  completed:   { color: '#639922', label: 'Completed' },
}

function isEligible(c) {
  return (
    c.vulnerability_flags?.includes('pregnant') ||
    c.emergency_categories?.includes('labor')
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ height = 80, radius = 10 }) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
      style={{
        height, borderRadius: radius,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    />
  )
}

// ── Case card ─────────────────────────────────────────────────────────────────
function CaseCard({ caseData, onConnect, activeId }) {
  const eligible = isEligible(caseData)
  const tierColor = TIER_COLOR[caseData.tier] ?? '#64748b'
  const statusCfg = STATUS_CFG[caseData.tele_health_status] ?? STATUS_CFG.not_needed
  const isActive = activeId === caseData.case_id

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={isActive ? '' : 'glass-panel'}
      style={{
        background: isActive ? 'var(--t1-bg)' : 'var(--panel-bg)',
        border: `1px solid ${isActive ? 'var(--t1)' : 'var(--panel-border)'}`,
        borderLeft: `4px solid ${tierColor}`,
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex', alignItems: 'center',
        gap: 14, transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      {/* Tier badge */}
      <div style={{
        background: `${tierColor}15`, border: `1px solid ${tierColor}33`,
        borderRadius: 8, padding: '6px 10px',
        textAlign: 'center', flexShrink: 0,
      }}>
        <div className="text-mono" style={{ color: tierColor, fontSize: 11, fontWeight: 700 }}>
          {caseData.tier?.replace('Tier ', 'T')}
        </div>
        <div className="text-mono" style={{ color: tierColor, fontSize: 16, fontWeight: 700 }}>
          {caseData.urgency_score}
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>/5</span>
        </div>
      </div>

      {/* Case info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {caseData.gps_or_landmark}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {eligible && (
            <span style={{
              background: 'var(--t1-bg)', color: 'var(--t1)',
              fontSize: 9, fontWeight: 700, padding: '2px 6px',
              borderRadius: 4, border: '1px solid rgba(226,75,74,0.3)',
              letterSpacing: '0.06em',
            }}>
              ♥ MATERNITY
            </span>
          )}
          {caseData.vulnerability_flags?.map(f => (
            <span key={f} className="text-mono" style={{
              background: 'var(--t2-bg)', color: 'var(--t2)',
              fontSize: 9, padding: '2px 6px', borderRadius: 4,
              border: '1px solid rgba(239,159,39,0.2)',
            }}>
              {f}
            </span>
          ))}
        </div>
        <div className="text-mono" style={{ fontSize: 10, color: statusCfg.color, marginTop: 6, fontWeight: 500 }}>
          {statusCfg.label}
        </div>
      </div>

      {/* Connect button */}
      <motion.button
        onClick={() => onConnect(caseData)}
        disabled={!eligible}
        whileHover={eligible ? { scale: 1.04 } : {}}
        whileTap={eligible ? { scale: 0.97 } : {}}
        className={eligible ? (isActive ? 'btn-primary' : 'btn-secondary') : ''}
        style={{
          flexShrink: 0,
          padding: '8px 14px',
          background: eligible
            ? (isActive ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.03)')
            : 'rgba(255,255,255,0.02)',
          border: eligible
            ? (isActive ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)')
            : '1px solid rgba(255,255,255,0.04)',
          borderRadius: 8, cursor: eligible ? 'pointer' : 'default',
          color: eligible ? (isActive ? 'var(--accent)' : 'var(--text-primary)') : 'var(--text-muted)',
          fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          minHeight: 34,
        }}
      >
        {eligible ? (isActive ? '📞 Active' : '📞 Connect') : 'Not eligible'}
      </motion.button>
    </motion.div>
  )
}

// ── Main Tele Page ────────────────────────────────────────────────────────────
export default function TelePage({ onBack }) {
  const [cases, setCases]         = useState(null)
  const [loadErr, setLoadErr]     = useState(null)
  const [activeCase, setActiveCase] = useState(null)
  const [statuses, setStatuses]   = useState({})   // live status overrides

  useEffect(() => {
    fetch(`${API_BASE}/triage/queue`)
      .then(r => r.json())
      .then(data => {
        const all = data.queue ?? []
        // Initial status map from server
        const init = {}
        all.forEach(c => { init[c.case_id] = c.tele_health_status })
        setStatuses(init)
        setCases(all)
      })
      .catch(e => setLoadErr(e.message))
  }, [])

  const handleStatusChange = useCallback((caseId, newStatus) => {
    setStatuses(prev => ({ ...prev, [caseId]: newStatus }))
  }, [])

  const handleConnect = useCallback((caseData) => {
    setActiveCase(prev => prev?.case_id === caseData.case_id ? null : caseData)
  }, [])

  // Merge live status overrides back into case objects
  const enrichedCases = (cases ?? []).map(c => ({
    ...c, tele_health_status: statuses[c.case_id] ?? c.tele_health_status,
  }))

  const eligibleCases = enrichedCases.filter(isEligible)
  const otherTier1    = enrichedCases.filter(c => c.tier === 'Tier 1' && !isEligible(c))

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      {/* ── Top nav ── */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 16, height: 56,
        background: 'rgba(10,16,30,0.95)', backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <motion.button
          onClick={onBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: 'none', border: 'none', color: '#64748b',
            cursor: 'pointer', fontSize: 20, display: 'flex',
            alignItems: 'center', gap: 6, fontFamily: 'inherit',
            padding: '4px 8px', borderRadius: 6,
          }}
        >
          ← <span style={{ fontSize: 13 }}>Map</span>
        </motion.button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: 'rgba(226,75,74,0.15)', color: '#E24B4A',
            fontSize: 9, fontWeight: 700, padding: '3px 8px',
            borderRadius: 4, letterSpacing: '0.07em',
          }}>
            MODULE 4
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
            Tele-Maternity Emergency Bridge
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {loadErr === null && cases !== null && (
            <>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                <span style={{ color: '#E24B4A', fontWeight: 700 }}>{eligibleCases.length}</span> eligible
              </span>
              <span style={{ fontSize: 11, color: '#475569' }}>·</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                <span style={{ color: enrichedCases.filter(c => c.tele_health_status === 'connected').length > 0 ? '#E24B4A' : '#64748b', fontWeight: 700 }}>
                  {enrichedCases.filter(c => c.tele_health_status === 'connected').length}
                </span> on call
              </span>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '28px 24px', display: 'flex', gap: 24 }}>

        {/* ── Left: case list ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Loading */}
          {cases === null && !loadErr && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(i => <Skeleton key={i} height={82} />)}
            </div>
          )}

          {/* Error */}
          {loadErr && (
            <div style={{
              background: 'rgba(226,75,74,0.1)', border: '1px solid #E24B4A33',
              borderRadius: 10, padding: '20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>⚠</div>
              <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 8 }}>
                Could not load triage queue
              </div>
              <div style={{ color: '#64748b', fontSize: 11 }}>{loadErr}</div>
              <button
                onClick={() => window.location.reload()}
                style={{
                  marginTop: 14, padding: '7px 16px',
                  background: 'rgba(226,75,74,0.15)',
                  border: '1px solid #E24B4A44',
                  borderRadius: 7, cursor: 'pointer',
                  color: '#fca5a5', fontSize: 12, fontFamily: 'inherit',
                }}
              >
                Retry
              </button>
            </div>
          )}

          {cases !== null && (
            <>
              {/* Eligible cases */}
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
                  color: '#E24B4A', marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    background: '#E24B4A', boxShadow: '0 0 6px #E24B4A88',
                  }} />
                  ELIGIBLE — PREGNANT / LABOR ({eligibleCases.length})
                </div>

                {eligibleCases.length === 0 ? (
                  <div style={{
                    padding: '24px', textAlign: 'center',
                    border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 10,
                    color: '#475569', fontSize: 12,
                  }}>
                    No eligible maternity cases in the current queue
                  </div>
                ) : (
                  <AnimatePresence>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {eligibleCases.map(c => (
                        <CaseCard
                          key={c.case_id}
                          caseData={c}
                          onConnect={handleConnect}
                          activeId={activeCase?.case_id}
                        />
                      ))}
                    </div>
                  </AnimatePresence>
                )}
              </div>

              {/* Other Tier 1 — for context */}
              {otherTier1.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
                    color: '#475569', marginBottom: 12,
                  }}>
                    OTHER TIER 1 — NOT ELIGIBLE FOR THIS BRIDGE ({otherTier1.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {otherTier1.map(c => (
                      <CaseCard
                        key={c.case_id}
                        caseData={c}
                        onConnect={handleConnect}
                        activeId={activeCase?.case_id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right: bridge panel ── */}
        <div style={{ width: 460, flexShrink: 0 }}>
          <AnimatePresence mode="wait">
            {activeCase ? (
              <motion.div
                key={activeCase.case_id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                style={{ position: 'sticky', top: 76 }}
              >
                <TeleHealthBridge
                  caseData={enrichedCases.find(c => c.case_id === activeCase.case_id) ?? activeCase}
                  onStatusChange={handleStatusChange}
                  onClose={() => setActiveCase(null)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                  position: 'sticky', top: 76,
                  border: '1px dashed rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: '40px 24px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.3 }}>📞</div>
                <div style={{ color: '#334155', fontSize: 13, lineHeight: 1.6 }}>
                  Select a case from the list to open the Tele-Maternity bridge
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
