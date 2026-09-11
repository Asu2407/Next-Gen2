import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '../i18n/LangContext'

export default function RescuerMobilePeekSheet({
  queue,
  onOpenQueue,
  onOpenDrone,
  onDispatchRescue,
  onFindNearestCamp,
  onConnectTele,
}) {
  const { t } = useLang()
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeVulnFilter, setActiveVulnFilter] = useState(null)

  const tiers = queue?.tiers ?? {}
  const t1Cases = tiers['Tier 1'] ?? []
  const t2Cases = tiers['Tier 2'] ?? []
  const allCases = [...t1Cases, ...t2Cases]

  // Filter cases for the peek sheet
  const displayCases = (allCases).filter(c => {
    if (!activeVulnFilter) return true
    const vFlags = (c.vulnerability_flags || []).map(x => String(x).toLowerCase())
    const eCats = (c.emergency_categories || []).map(x => String(x).toLowerCase())
    if (activeVulnFilter === 'pregnant') return vFlags.includes('pregnant') || eCats.includes('labor') || eCats.includes('maternity')
    if (activeVulnFilter === 'infant') return vFlags.includes('infant') || vFlags.includes('child')
    if (activeVulnFilter === 'elderly') return vFlags.includes('elderly')
    if (activeVulnFilter === 'dialysis') return vFlags.includes('dialysis')
    return true
  }).slice(0, 4)

  return (
    <div
      className="rescuer-bottom-drawer"
      style={{
        height: isExpanded ? '72vh' : 64,
        maxHeight: '78vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'inherit',
        overflow: 'hidden',
      }}
    >
      {/* ── DRAG HANDLE & PEEK HEADER ── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '8px 14px 10px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          userSelect: 'none',
        }}
      >
        {/* Subtle touch indicator */}
        <div
          style={{
            width: 38,
            height: 4,
            borderRadius: 2,
            background: 'rgba(0,229,255,0.4)',
          }}
        />

        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 13, color: '#E24B4A' }}>🚨</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>
              {t1Cases.length} {t('tier.critical')} T1 Cases
            </span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              · {allCases.length} Active
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenQueue()
              }}
              style={{
                background: 'rgba(0,229,255,0.12)',
                border: '1px solid rgba(0,229,255,0.3)',
                borderRadius: 8,
                padding: '4px 8px',
                color: '#00E5FF',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t('rescuer.open_queue')} ➔
            </button>
            <span style={{ color: '#64748b', fontSize: 13 }}>
              {isExpanded ? '▼' : '▲'}
            </span>
          </div>
        </div>
      </div>

      {/* ── EXPANDED DRAWER CONTENT ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '0 clamp(10px, 2.5vw, 14px) 24px',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(8px, 1.8vh, 12px)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* Quick Vulnerability Filter Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', padding: '4px 2px 6px', flexShrink: 0 }}>
              {[
                { key: 'pregnant', label: '🤰 Pregnant' },
                { key: 'infant',   label: '👶 Infants' },
                { key: 'elderly',  label: '🧓 Elderly' },
                { key: 'dialysis', label: '🩸 Dialysis' },
              ].map(chip => {
                const isActive = activeVulnFilter === chip.key
                return (
                  <button
                    key={chip.key}
                    onClick={() => setActiveVulnFilter(isActive ? null : chip.key)}
                    style={{
                      background: isActive ? 'rgba(0,229,255,0.22)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isActive ? '#00E5FF' : 'rgba(255,255,255,0.14)'}`,
                      borderRadius: 14,
                      padding: '4px clamp(8px, 2vw, 12px)',
                      color: isActive ? '#00E5FF' : '#94a3b8',
                      fontSize: 'clamp(10px, 2.6vw, 11.5px)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {chip.label}
                  </button>
                )
              })}
              {activeVulnFilter && (
                <button
                  onClick={() => setActiveVulnFilter(null)}
                  style={{ background: 'none', border: 'none', color: '#00E5FF', fontSize: 11, cursor: 'pointer', padding: '0 4px' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Case list preview */}
            {displayCases.map(c => {
              const isPregnant = (c.vulnerability_flags || []).includes('pregnant')
              const isMedical = (c.emergency_categories || []).includes('medical') || (c.emergency_categories || []).includes('labor') || isPregnant

              return (
                <div
                  key={c.case_id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(226, 75, 74, 0.3)',
                    borderLeft: '3px solid #E24B4A',
                    borderRadius: 10,
                    padding: 'clamp(8px, 2vw, 10px) clamp(10px, 2.5vw, 12px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ fontSize: 'clamp(11px, 2.9vw, 12.5px)', fontWeight: 700, color: '#f8fafc', lineHeight: 1.3 }}>
                      📍 {c.gps_or_landmark}
                    </div>
                    <span style={{ fontSize: 9, background: 'rgba(226,75,74,0.25)', color: '#fca5a5', padding: '1px 6px', borderRadius: 4, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {c.tier}
                    </span>
                  </div>

                  <div style={{ fontSize: 'clamp(9.5px, 2.4vw, 10.5px)', color: '#94a3b8', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>👥 {c.victim_count || 1} victims</span>
                    {c.vulnerability_flags?.length > 0 && (
                      <span style={{ color: '#f59e0b' }}>
                        ⚑ {c.vulnerability_flags.join(', ')}
                      </span>
                    )}
                  </div>

                  {/* 1-Tap Field Action Buttons */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button
                      onClick={() => onFindNearestCamp?.(c)}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(0,229,255,0.3)',
                        borderRadius: 6,
                        padding: '6px 4px',
                        color: 'var(--cyan)',
                        fontSize: 'clamp(9.5px, 2.4vw, 11px)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      🏕️ Shelter ➔
                    </button>
                    <button
                      onClick={() => onDispatchRescue?.(c, null, 'NDRF Rescue Boat')}
                      style={{
                        flex: 1.2,
                        background: 'linear-gradient(90deg, rgba(0,229,255,0.2) 0%, rgba(2,132,199,0.35) 100%)',
                        border: '1px solid #00E5FF',
                        borderRadius: 6,
                        padding: '6px 4px',
                        color: '#ffffff',
                        fontSize: 'clamp(9.5px, 2.4vw, 11px)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      🚤 1-Tap Dispatch
                    </button>
                    {isMedical && (
                      <button
                        onClick={() => onConnectTele?.(c)}
                        style={{
                          background: 'rgba(244,63,94,0.2)',
                          border: '1px solid rgba(244,63,94,0.5)',
                          borderRadius: 6,
                          padding: '6px 8px',
                          color: '#fda4af',
                          fontSize: 'clamp(9.5px, 2.4vw, 11px)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        🩺
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={onOpenQueue}
                style={{
                  flex: 1,
                  background: 'rgba(0,229,255,0.1)',
                  border: '1px solid #00E5FF',
                  borderRadius: 8,
                  padding: '8px clamp(6px, 2vw, 10px)',
                  color: '#00E5FF',
                  fontSize: 'clamp(10.5px, 2.6vw, 12px)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                📋 {t('rescuer.open_queue')} ({allCases.length})
              </button>
              <button
                onClick={onOpenDrone}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  padding: '8px clamp(8px, 2vw, 14px)',
                  color: '#f1f5f9',
                  fontSize: 'clamp(10.5px, 2.6vw, 12px)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                🛰️ {t('rescuer.drone')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
