/**
 * Module 3, 5, 6, 7, 8 & 10 — ResqNet AI Tactical Command Dashboard
 * Responsive UI/UX Upgrade:
 *  1. Smooth Heatmap Overlay (leaflet.heat gradient)
 *  2. Dark vignette boundary mask isolating Assam operational area
 *  3. Numbered case markers displaying victim_count sized by urgency_score
 *  4. Mobile-adaptive Bottom Sheet Drawer for panels (<768px viewports)
 *  5. Compact Mobile Top Bar with Hamburger Menu toggle
 *  6. Control-room glassmorphism design system & high-contrast typography
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  MapContainer, TileLayer, Polygon, Marker, Tooltip, Popup, Polyline,
  useMap, ZoomControl,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'
import { motion, AnimatePresence } from 'framer-motion'

// ── Constants ──────────────────────────────────────────────────────────────────
const API_BASE = ''  // Vite proxy → localhost:8000

const TIER = {
  'Tier 1': { color: '#E24B4A', glow: 'rgba(226,75,74,0.55)',  label: 'T1 · Critical' },
  'Tier 2': { color: '#EF9F27', glow: 'rgba(239,159,39,0.45)', label: 'T2 · High'     },
  'Tier 3': { color: '#639922', glow: 'rgba(99,153,34,0.40)',  label: 'T3 · Standard' },
}

const ZONE_COLOR = { red: '#E24B4A', yellow: '#EF9F27', green: '#639922' }

const RISK_COLOR = {
  critical: '#E24B4A',
  high: '#EF9F27',
  moderate: '#fde047',
  low: '#639922',
}

const ASSAM_BOUNDING_MASK = [
  [
    [-90, -180],
    [-90, 180],
    [90, 180],
    [90, -180],
  ],
  [
    [24.0, 90.0],
    [28.2, 90.0],
    [28.2, 95.8],
    [24.0, 95.8],
    [24.0, 90.0],
  ],
]

// Desktop Panel Slide Animation
const desktopPanelVariants = {
  hidden:  { x: '110%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 320, damping: 32 } },
  exit:    { x: '110%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
}

// Mobile Bottom Sheet Animation
const mobileDrawerVariants = {
  hidden:  { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 340, damping: 32 } },
  exit:    { y: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function jitter(caseId) {
  let hash = 0
  for (let i = 0; i < caseId.length; i++) {
    hash = (hash * 31 + caseId.charCodeAt(i)) | 0
  }
  const dx = ((hash & 0xfff) / 0xfff - 0.5) * 0.006
  const dy = (((hash >> 12) & 0xfff) / 0xfff - 0.5) * 0.005
  return [dx, dy]
}

function geoRingToLeaflet(ring) {
  return ring.map(([lng, lat]) => [lat, lng])
}

function makeCaseIcon(tier, isOverdue = false, size = 22, victimCount = 1, mergedCount = 1) {
  const meta = TIER[tier] || TIER['Tier 3']
  const isT1 = tier === 'Tier 1'
  const finalColor = isOverdue ? '#E24B4A' : meta.color
  const isMerged = mergedCount > 1

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
        ${(isT1 || isOverdue) ? `<div class="t1-ring" style="background:${finalColor}66;"></div>` : ''}
        <div class="${(isT1 || isOverdue) ? 't1-core' : 'tier-dot'}"
             style="position:absolute;inset:0;border-radius:50%;
                    background:${finalColor};
                    border:${isMerged ? '2.5px solid #38bdf8' : `2px solid rgba(255,255,255,${isT1 ? 0.9 : 0.6})`};
                    box-shadow:0 0 ${isT1 ? 12 : 5}px ${meta.glow};
                    display:flex;align-items:center;justify-content:center;">
          <span style="color:#ffffff;font-size:${size >= 24 ? '11px' : '10px'};font-weight:700;font-family:'Inter',sans-serif;line-height:1;z-index:2;text-shadow:0 1px 2px rgba(0,0,0,0.8);">
            ${victimCount}
          </span>
        </div>
        ${isMerged ? `<div style="position:absolute;top:-4px;right:-4px;background:#0284c7;color:#fff;font-size:8px;font-weight:800;border-radius:50%;width:13px;height:13px;display:flex;align-items:center;justify-content:center;border:1px solid #fff;box-shadow:0 0 4px #38bdf8;">${mergedCount}</div>` : ''}
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 6],
    tooltipAnchor: [size / 2 + 4, 0],
  })
}

function makeCampIcon(status, hasHazard = false) {
  const statusColor = hasHazard ? '#EF9F27' : (status === 'Full' ? '#E24B4A' : status === 'Near Capacity' ? '#EF9F27' : '#639922')
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:8px;background:rgba(10,16,30,0.95);border:2px solid ${statusColor};box-shadow:0 0 10px ${statusColor}88;"></div>
        <span style="position:relative;font-size:15px;z-index:1;">${hasHazard ? '⚠️' : '🏕️'}</span>
      </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
    tooltipAnchor: [16, 0],
  })
}

function makeGaugeIcon(risk) {
  const color = RISK_COLOR[risk] ?? '#639922'
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(10,16,30,0.92);border:2px solid ${color};box-shadow:0 0 10px ${color}aa;"></div>
        <span style="position:relative;font-size:13px;z-index:1;">🌊</span>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

function HeatmapLayer({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !points || points.length === 0) return
    const heat = L.heatLayer(points, {
      radius: 42,
      blur: 26,
      maxZoom: 11,
      max: 1.0,
      gradient: {
        0.2: '#34D399',
        0.55: '#F59E0B',
        0.8: '#EF9F27',
        1.0: '#E24B4A',
      },
    }).addTo(map)

    return () => {
      map.removeLayer(heat)
    }
  }, [map, points])
  return null
}

function FitBoundsController({ bounds, trigger }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10 })
    }
  }, [map, bounds, trigger])
  return null
}

function CenterController({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, 12, { animate: true })
    }
  }, [map, center])
  return null
}

function LoadingScreen({ error, onRetry }) {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #0b1220 0%, #111827 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 18,
      fontFamily: "'Inter','Segoe UI',sans-serif", padding: 20, textAlign: 'center',
    }}>
      {!error ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '3px solid rgba(226,75,74,0.2)', borderTop: '3px solid #E24B4A',
            }}
          />
          <div style={{ color: '#94a3b8', fontSize: 14, letterSpacing: '0.08em' }}>
            Initializing disaster heatmap & operational telemetry…
          </div>
        </>
      ) : (
        <div style={{ color: '#E24B4A', fontSize: 13, maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
          Backend unreachable — make sure{' '}
          <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>
            uvicorn app.main:app --reload
          </code>{' '}
          is running at <strong>localhost:8000</strong>.
          <br /><br />
          <span style={{ color: '#64748b', fontSize: 11 }}>{error}</span>
          <br /><br />
          <motion.button
            onClick={onRetry}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            style={{
              padding: '10px 22px',
              background: 'rgba(226,75,74,0.15)', border: '1px solid #E24B4A55',
              borderRadius: 8, cursor: 'pointer', color: '#fca5a5',
              fontSize: 13, fontFamily: 'inherit',
            }}
          >
            Retry
          </motion.button>
        </div>
      )}
    </div>
  )
}

function CasePopupContent({ props, onFindNearestCamp }) {
  const meta = TIER[props.tier] || TIER['Tier 3']
  const isOverdue = props.is_overdue === true
  const mergedCount = props.merged_count ?? 1
  const mergedReports = props.merged_reports ?? []
  const [showReports, setShowReports] = useState(false)

  return (
    <div style={{
      background: '#0f172a', color: '#e2e8f0',
      borderRadius: 10, padding: '12px 14px',
      minWidth: 230, maxWidth: 290, fontSize: 12,
      border: `1px solid ${isOverdue ? '#E24B4A' : meta.color + '33'}`,
      boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
      fontFamily: "'Inter','Segoe UI',sans-serif",
    }}>
      {isOverdue && (
        <div style={{
          background: 'rgba(226,75,74,0.2)', border: '1px solid #E24B4A',
          color: '#fca5a5', fontSize: 10, fontWeight: 700,
          padding: '3px 8px', borderRadius: 5, marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          🚨 OVERDUE — {props.overdue_hours}h SINCE DISPATCH
        </div>
      )}

      {mergedCount > 1 && (
        <div style={{
          background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.4)',
          color: '#38bdf8', fontSize: 10, fontWeight: 700,
          padding: '4px 8px', borderRadius: 5, marginBottom: 8,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>🔗 {mergedCount} CALL REPORTS CLUSTERED</span>
          <button
            onClick={() => setShowReports(!showReports)}
            style={{
              background: 'none', border: 'none', color: '#38bdf8',
              fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline',
            }}
          >
            {showReports ? 'Hide' : 'View Calls'}
          </button>
        </div>
      )}

      {showReports && mergedReports.length > 0 && (
        <div style={{
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6, padding: '6px 8px', marginBottom: 8, maxHeight: 110, overflowY: 'auto',
          fontSize: 10, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {mergedReports.map((r, idx) => (
            <div key={idx} style={{ borderBottom: idx < mergedReports.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: 4 }}>
              <div style={{ color: '#38bdf8', fontWeight: 600 }}>Call #{idx + 1}</div>
              <div style={{ color: '#e2e8f0' }}>"{r.raw_transcript}"</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{
          background: meta.color, color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em',
        }}>
          {props.tier ?? 'Unknown'}
        </span>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>🎯 {props.urgency_score ?? '?'}/5 · 👥 {props.victim_count ?? 1}</span>
      </div>
      <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 6, lineHeight: 1.4 }}>
        📍 {props.gps_or_landmark || 'Unknown location'}
      </div>
      {props.zone_type && (
        <div style={{ fontSize: 11, color: ZONE_COLOR[props.zone_type] ?? '#94a3b8', marginBottom: 6 }}>
          ⬡ {props.zone_label || props.zone_type} — {props.zone_depth}
        </div>
      )}
      {props.recommended_asset && (
        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: 6,
          padding: '7px 9px', marginTop: 8,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ color: '#94a3b8', fontSize: 10, marginBottom: 3, fontWeight: 600, letterSpacing: '0.06em' }}>
            RECOMMENDED ASSET
          </div>
          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 12 }}>
            🚁 {props.recommended_asset}
          </div>
        </div>
      )}
      {props.vulnerability_flags?.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {props.vulnerability_flags.map(f => (
            <span key={f} style={{
              background: 'rgba(239,159,39,0.15)', color: '#fcd34d',
              fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
            }}>
              {f}
            </span>
          ))}
        </div>
      )}

      {onFindNearestCamp && (
        <button
          onClick={() => onFindNearestCamp(props)}
          style={{
            marginTop: 12, width: '100%', padding: '8px 10px', minHeight: 38,
            background: 'rgba(99,153,34,0.18)', border: '1px solid rgba(99,153,34,0.4)',
            borderRadius: 6, color: '#a3d669', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: 'inherit', transition: 'background 0.15s',
          }}
        >
          🏕️ Route to Nearest Safe Shelter
        </button>
      )}
    </div>
  )
}

function QueuePanel({ queue, filter, onFindNearestCamp, overdueCases }) {
  const tiers = queue?.tiers ?? {}
  const f = filter.toLowerCase().trim()

  const overdueMap = useMemo(() => {
    const map = {}
    if (overdueCases) {
      overdueCases.forEach(c => { map[c.case_id] = c })
    }
    return map
  }, [overdueCases])

  const filterCases = (cases) => !f
    ? cases
    : cases.filter(c =>
        c.gps_or_landmark?.toLowerCase().includes(f) ||
        c.tier?.toLowerCase().includes(f)
      )

  return (
    <>
      <PanelHeader icon="📡" title="Live Priority Queue" subtitle={`${queue?.total_cases ?? 0} active cases`} />
      {['Tier 1', 'Tier 2', 'Tier 3'].map(tierKey => {
        const allCases = tiers[tierKey] ?? []
        const cases = filterCases(allCases)
        const meta = TIER[tierKey]
        return (
          <div key={tierKey} style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              color: meta.color, marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: meta.color, boxShadow: `0 0 6px ${meta.glow}`,
              }} />
              {tierKey} · {cases.length}{f ? ` of ${allCases.length}` : ''} {cases.length === 1 ? 'case' : 'cases'}
            </div>
            {cases.length === 0 ? (
              <div style={{ color: '#475569', fontSize: 11, paddingLeft: 14 }}>
                {f ? 'No matches' : '—'}
              </div>
            ) : (
              cases.map(c => {
                const ov = overdueMap[c.case_id]
                const isOverdue = Boolean(ov)
                const mergedCount = c.merged_count ?? 1

                return (
                  <div
                    key={c.case_id}
                    className={`card-tier-${tierKey === 'Tier 1' ? '1' : tierKey === 'Tier 2' ? '2' : '3'} ${isOverdue ? 'pulse-t1' : ''}`}
                    style={{
                      padding: '10px 12px',
                      marginBottom: 8,
                      borderRadius: '0 8px 8px 0',
                      border: isOverdue ? '1px solid var(--t1)' : '1px solid rgba(255, 255, 255, 0.04)',
                      borderLeft: `3px solid ${isOverdue ? 'var(--t1)' : 'var(--t' + (tierKey === 'Tier 1' ? '1' : tierKey === 'Tier 2' ? '2' : '3') + ')'}`,
                      transition: 'transform 0.2s ease, border-color 0.2s ease',
                    }}
                  >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      {(() => {
                        const pill = getStatusPill(c.tier, isOverdue)
                        return (
                          <span className={`status-pill ${pill.cls}`}>
                            {pill.label}
                          </span>
                        )
                      })()}

                      {isOverdue && (
                        <motion.div
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          style={{
                            fontSize: 9, fontWeight: 700, color: 'var(--t1)',
                            letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          🚨 OVERDUE — {ov.overdue_hours}h
                        </motion.div>
                      )}

                      {mergedCount > 1 && (
                        <span style={{
                          background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)',
                          color: 'var(--cyan)', fontSize: 9, fontWeight: 700, padding: '1px 6px',
                          borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3,
                        }}>
                          🔗 {mergedCount} merged
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {c.gps_or_landmark || 'Unknown location'}
                    </div>
                    <div className="text-mono" style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span>🎯 {c.urgency_score ?? '?'}/5</span>
                      <span>👥 {c.victim_count ?? '?'}</span>
                      {(c.vulnerability_flags?.length > 0) && (
                        <span style={{ color: 'var(--t2)', fontWeight: 500 }}>⚑ {c.vulnerability_flags.join(', ')}</span>
                      )}
                    </div>
                    <button
                      onClick={() => onFindNearestCamp?.({ ...c, is_overdue: isOverdue, overdue_hours: ov?.overdue_hours })}
                      className="btn-primary"
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        minHeight: 28,
                        fontSize: 10,
                      }}
                    >
                      🏕️ Find Nearest Shelter ➔
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )
      })}
    </>
  )
}

function InsightsPanel({ cases, onLocateCase }) {
  const worstHit = useMemo(() => {
    if (!cases) return []
    return [...cases].sort((a, b) => {
      const uA = a.properties?.urgency_score ?? 0
      const uB = b.properties?.urgency_score ?? 0
      if (uB !== uA) return uB - uA
      const vA = a.properties?.victim_count ?? 0
      const vB = b.properties?.victim_count ?? 0
      return vB - vA
    }).slice(0, 5)
  }, [cases])

  return (
    <>
      <PanelHeader icon="🔥" title="Worst-Hit Locations" subtitle="Synthesized high-impact priority targets" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {worstHit.map((item, idx) => {
          const p = item.properties
          const tier = p.tier
          const color = TIER[tier]?.color ?? '#E24B4A'
          const coords = item.geometry?.coordinates ?? [92.8, 26.1]
          const mergedCount = p.merged_count ?? 1

          return (
            <div
              key={p.case_id}
              className={`card-tier-${tier === 'Tier 1' ? '1' : tier === 'Tier 2' ? '2' : '3'}`}
              style={{
                borderRadius: '0 8px 8px 0',
                padding: '12px 14px',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderLeft: `4px solid ${color}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    background: `${color}15`, color: color, fontWeight: 700, fontSize: 10,
                    padding: '2px 6px', borderRadius: 4, border: `1px solid ${color}33`,
                  }}>
                    #{idx + 1} IMPACT
                  </span>
                  <span className="text-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)' }}>
                    🎯 {p.urgency_score}/5
                  </span>
                  {mergedCount > 1 && (
                    <span style={{ background: 'rgba(56,189,248,0.12)', color: 'var(--accent)', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3 }}>
                      🔗 {mergedCount} calls
                    </span>
                  )}
                </div>
                <span className="text-mono" style={{ color: color, fontSize: 11, fontWeight: 700 }}>
                  {tier}
                </span>
              </div>

              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                📍 {p.gps_or_landmark}
              </div>

              <div className="text-mono" style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 10, marginBottom: 8 }}>
                <span>👥 <strong>{p.victim_count}</strong> victims</span>
                {p.vulnerability_flags?.length > 0 && (
                  <span style={{ color: 'var(--t2)', fontWeight: 500 }}>⚑ {p.vulnerability_flags.join(', ')}</span>
                )}
              </div>

              <button
                onClick={() => onLocateCase?.([coords[1], coords[0]])}
                className="btn-secondary"
                style={{
                  width: '100%', padding: '6px 0', minHeight: 28, fontSize: 10,
                }}
              >
                Locate Target on Map ➔
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

function CampsPanel({ camps, queue, onFindRouteForCase, selectedRoute, onClearRoute, onHighlightCamp, hazardAlerts }) {
  const [tagFilter, setTagFilter] = useState('all')
  const [selectedCaseId, setSelectedCaseId] = useState('')

  const hazardCampIds = useMemo(() => {
    return new Set((hazardAlerts ?? []).map(h => h.camp_id))
  }, [hazardAlerts])

  const allCases = useMemo(() => {
    const list = []
    if (queue?.tiers) {
      Object.values(queue.tiers).forEach(arr => list.push(...arr))
    }
    return list
  }, [queue])

  const filteredCamps = useMemo(() => {
    if (!camps) return []
    if (tagFilter === 'all') return camps
    return camps.filter(c => c.resource_tags?.[tagFilter] === true)
  }, [camps, tagFilter])

  const handleRouteClick = () => {
    const targetCase = allCases.find(c => c.case_id === selectedCaseId)
    if (targetCase && onFindRouteForCase) {
      onFindRouteForCase(targetCase)
    }
  }

  return (
    <>
      <PanelHeader icon="🏕" title="Relief Camps & Inventory" subtitle={`${camps?.length ?? 0} operational shelters in Assam`} />

      {selectedRoute && (
        <div style={{
          background: 'rgba(99,153,34,0.15)', border: '1px solid rgba(99,153,34,0.4)',
          borderRadius: 9, padding: '10px 12px', marginBottom: 14, fontSize: 11, color: '#a3d669',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, letterSpacing: '0.05em' }}>🗺️ SUGGESTED ROUTE ACTIVE</span>
            <button onClick={onClearRoute} style={{ background: 'none', border: 'none', color: '#a3d669', cursor: 'pointer', fontSize: 16, fontWeight: 700, padding: 0 }}>×</button>
          </div>
          <div style={{ color: '#e2e8f0', fontSize: 11, marginBottom: 2 }}>From: <strong>{selectedRoute.caseLandmark}</strong></div>
          <div style={{ color: '#e2e8f0', fontSize: 11 }}>To: <strong>{selectedRoute.campName}</strong> ({selectedRoute.distanceKm} km away)</div>
        </div>
      )}

      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 9, padding: '10px 12px', marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 6, letterSpacing: '0.05em' }}>
          🎯 FIND SAFE SHELTER FOR SOS CASE
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <select
            value={selectedCaseId}
            onChange={e => setSelectedCaseId(e.target.value)}
            style={{
              flex: 1, minWidth: 140, minHeight: 36, background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6, color: '#e2e8f0', fontSize: 11, padding: '6px 8px', outline: 'none', fontFamily: 'inherit',
            }}
          >
            <option value="">Select SOS case location…</option>
            {allCases.map(c => (
              <option key={c.case_id} value={c.case_id}>
                {c.tier}: {c.gps_or_landmark}
              </option>
            ))}
          </select>
          <button
            onClick={handleRouteClick}
            disabled={!selectedCaseId}
            style={{
              background: selectedCaseId ? 'rgba(99,153,34,0.25)' : 'rgba(255,255,255,0.04)',
              border: selectedCaseId ? '1px solid #639922' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6, color: selectedCaseId ? '#a3d669' : '#475569',
              padding: '0 12px', minHeight: 36, fontSize: 11, fontWeight: 600, cursor: selectedCaseId ? 'pointer' : 'default',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            Route ➔
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: 6 }}>
          FILTER BY RESOURCE TAG
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Camps' },
            { id: 'anm_nurse', label: '🩺 Nurse' },
            { id: 'clean_water', label: '🚰 Water' },
            { id: 'baby_food', label: '🍼 Baby Food' },
            { id: 'livestock_fodder_area', label: '🌾 Fodder' },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setTagFilter(btn.id)}
              style={{
                background: tagFilter === btn.id ? 'rgba(99,153,34,0.2)' : 'rgba(255,255,255,0.04)',
                border: tagFilter === btn.id ? '1px solid #639922' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 5, padding: '5px 9px', fontSize: 10, fontWeight: 600,
                color: tagFilter === btn.id ? '#a3d669' : '#94a3b8', minHeight: 32,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {filteredCamps.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#475569', fontSize: 11, border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 8 }}>
          No camps match the selected resource filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredCamps.map(camp => {
            const hasHazard = hazardCampIds.has(camp.camp_id)
            const statusColor = camp.status === 'Full' ? '#E24B4A' : camp.status === 'Near Capacity' ? '#EF9F27' : '#639922'
            const pct = camp.occupancy_pct ?? Math.round((camp.current_occupancy / camp.capacity) * 100)

            return (
              <div
                key={camp.camp_id}
                style={{
                  background: hasHazard ? 'rgba(239,159,39,0.08)' : 'rgba(255,255,255,0.03)',
                  border: hasHazard ? '1px solid rgba(239,159,39,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  borderLeft: `3px solid ${hasHazard ? '#EF9F27' : statusColor}`,
                  borderRadius: '0 8px 8px 0', padding: '10px 12px',
                }}
              >
                {hasHazard && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#EF9F27', letterSpacing: '0.05em', marginBottom: 4 }}>
                    ⚠️ PUBLIC HEALTH HAZARD ALERT (AUDIT FLAGGED)
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{camp.name}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{camp.district} District</div>
                  </div>
                  <span style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44`, fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>
                    {camp.status}
                  </span>
                </div>
                <div style={{ marginTop: 8, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>
                    <span>Occupancy</span>
                    <span>{camp.current_occupancy} / {camp.capacity} beds ({pct}%)</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: statusColor }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                  {camp.resource_tags?.clean_water && <span style={{ background: 'rgba(147,197,253,0.12)', color: '#93c5fd', fontSize: 9, padding: '2px 5px', borderRadius: 4 }}>🚰 Water</span>}
                  {camp.resource_tags?.anm_nurse && <span style={{ background: 'rgba(252,165,165,0.12)', color: '#fca5a5', fontSize: 9, padding: '2px 5px', borderRadius: 4 }}>🩺 Nurse</span>}
                  {camp.resource_tags?.baby_food && <span style={{ background: 'rgba(253,224,71,0.12)', color: '#fde047', fontSize: 9, padding: '2px 5px', borderRadius: 4 }}>🍼 Baby Food</span>}
                  {camp.resource_tags?.livestock_fodder_area && <span style={{ background: 'rgba(134,239,172,0.12)', color: '#86efac', fontSize: 9, padding: '2px 5px', borderRadius: 4 }}>🌾 Fodder</span>}
                </div>
                <button onClick={() => onHighlightCamp?.(camp)} style={{ marginTop: 8, width: '100%', padding: '6px 0', minHeight: 32, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, color: '#94a3b8', fontSize: 10, cursor: 'pointer' }}>
                  Locate Camp on Map ➔
                </button>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function ReunificationPanel({ reports, onReportSubmitted, onResolveReport }) {
  const [reporterName, setReporterName] = useState('')
  const [reporterContact, setReporterContact] = useState('')
  const [missingName, setMissingName] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reporterName.trim() || !missingName.trim() || !location.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/missing-persons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_name: reporterName,
          reporter_contact: reporterContact,
          missing_person_name: missingName,
          last_known_location: location,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      setReporterName('')
      setReporterContact('')
      setMissingName('')
      setLocation('')
      onReportSubmitted?.()
    } catch (err) {
      alert(`Error submitting report: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%', minHeight: 36, background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6, color: '#e2e8f0', fontSize: 11, padding: '6px 8px',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <>
      <PanelHeader icon="🔍" title="Family Reunification" subtitle="Missing person reports & camp check-in matcher" />

      {/* Report Form */}
      <form onSubmit={handleSubmit} style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 9, padding: '10px 12px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>
          📝 SUBMIT MISSING PERSON REPORT
        </div>

        <input
          type="text" placeholder="Missing Person Name *" required
          value={missingName} onChange={e => setMissingName(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text" placeholder="Last Known Location / Landmark *" required
          value={location} onChange={e => setLocation(e.target.value)}
          style={inputStyle}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <input
            type="text" placeholder="Reporter Name *" required
            value={reporterName} onChange={e => setReporterName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text" placeholder="Contact Number *" required
            value={reporterContact} onChange={e => setReporterContact(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button
          type="submit" disabled={submitting || !missingName || !reporterName}
          style={{
            padding: '8px 12px', minHeight: 38, background: 'rgba(226,75,74,0.18)',
            border: '1px solid #E24B4A', borderRadius: 6, color: '#fca5a5',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {submitting ? 'Matching…' : 'Submit & Match Camps ➔'}
        </button>
      </form>

      {/* Reports Feed */}
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: 8 }}>
        REGISTRY REPORTS ({reports?.length ?? 0})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(reports ?? []).map(rep => {
          const isMatch = rep.status === 'Possible Match'
          const isReunited = rep.status === 'Reunited'
          const badgeColor = isReunited ? '#639922' : isMatch ? '#EF9F27' : '#64748b'

          return (
            <div
              key={rep.report_id}
              style={{
                background: isMatch ? 'rgba(239,159,39,0.08)' : isReunited ? 'rgba(99,153,34,0.08)' : 'rgba(255,255,255,0.03)',
                border: isMatch ? '1px solid rgba(239,159,39,0.4)' : isReunited ? '1px solid rgba(99,153,34,0.4)' : '1px solid rgba(255,255,255,0.08)',
                borderLeft: `3px solid ${badgeColor}`,
                borderRadius: '0 8px 8px 0', padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>
                  {rep.missing_person_name}
                </span>
                <span style={{
                  background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}44`,
                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, letterSpacing: '0.04em',
                }}>
                  {rep.status}
                </span>
              </div>

              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
                Last seen: {rep.last_known_location}
              </div>

              {/* Matched Details Banner */}
              {isMatch && rep.match_details && (
                <div style={{
                  background: 'rgba(239,159,39,0.15)', border: '1px solid rgba(239,159,39,0.3)',
                  borderRadius: 6, padding: '7px 9px', margin: '6px 0', fontSize: 10, color: '#fcd34d',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>
                    🎯 CAMP CHECK-IN MATCH FOUND!
                  </div>
                  <div>Checked in at: <strong>{rep.match_details.matched_camp_name}</strong></div>
                  <div>Check-in time: {rep.match_details.check_in_time?.substring(11, 16)} UTC</div>

                  <button
                    onClick={() => onResolveReport?.(rep.report_id)}
                    style={{
                      marginTop: 6, width: '100%', padding: '6px 0', minHeight: 34,
                      background: 'rgba(99,153,34,0.25)', border: '1px solid #639922',
                      borderRadius: 5, color: '#a3d669', fontSize: 10, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Mark as Reunited 🎉
                  </button>
                </div>
              )}

              {isReunited && (
                <div style={{ fontSize: 10, color: '#a3d669', fontWeight: 600, marginTop: 4 }}>
                  🎉 Reunited with family at shelter
                </div>
              )}

              <div style={{ fontSize: 9, color: '#475569', marginTop: 4 }}>
                Reporter: {rep.reporter_name} ({rep.reporter_contact})
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function EarlyWarningPanel({ riverGauges, predictions, onDispatchAlert, alertToast, onHighlightStation }) {
  const [dispatchingRegion, setDispatchingRegion] = useState('')

  const handleAlert = async (regionName) => {
    setDispatchingRegion(regionName)
    try {
      await onDispatchAlert?.(regionName)
    } finally {
      setDispatchingRegion('')
    }
  }

  return (
    <>
      <PanelHeader icon="⚡" title="Predictive Early Warning" subtitle="CWC river gauges & IMD rainfall telemetry (Simulated)" />

      {alertToast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(226,75,74,0.2)', border: '1px solid #E24B4A',
            color: '#fca5a5', fontSize: 11, fontWeight: 700, padding: '10px 12px',
            borderRadius: 8, marginBottom: 14, boxShadow: '0 4px 14px rgba(226,75,74,0.3)',
          }}
        >
          📢 {alertToast}
        </motion.div>
      )}

      {/* CWC RIVER GAUGE CARDS */}
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: 8 }}>
        CWC RIVER MONITORING STATIONS ({riverGauges?.length ?? 0})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
        {(riverGauges ?? []).map(g => {
          const isDanger = g.current_level_m >= g.danger_level_m
          const isWarning = g.current_level_m >= g.warning_level_m
          const color = isDanger ? '#E24B4A' : isWarning ? '#EF9F27' : '#639922'
          const pct = Math.min(100, Math.max(10, Math.round((g.current_level_m / (g.danger_level_m * 1.05)) * 100)))

          return (
            <div
              key={g.station_id}
              style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderLeft: `3px solid ${color}`, borderRadius: '0 8px 8px 0', padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{g.station_name}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{g.river_name} · {g.district}</div>
                </div>
                <span style={{
                  background: `${color}22`, color: color, border: `1px solid ${color}44`,
                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                }}>
                  {g.trend === 'rising' ? '↗ RISING' : g.trend === 'falling' ? '↘ FALLING' : '→ STABLE'}
                </span>
              </div>

              <div style={{ marginTop: 8, marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>
                  <span>Level: <strong>{g.current_level_m}m</strong></span>
                  <span>Danger: <strong>{g.danger_level_m}m</strong></span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#64748b' }}>
                <span>Rate of rise: <strong style={{ color: g.rate_of_rise_cm_per_hour > 0 ? '#fca5a5' : '#94a3b8' }}>+{g.rate_of_rise_cm_per_hour} cm/h</strong></span>
                <button
                  onClick={() => onHighlightStation?.([g.lat, g.lng])}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 9 }}
                >
                  View on Map ➔
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* RANKED RISK PREDICTIONS */}
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: 8 }}>
        PREDICTED INUNDATION RISK MODEL
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(predictions ?? []).map(p => {
          const color = RISK_COLOR[p.predicted_flood_risk] ?? '#639922'
          const isCritical = p.predicted_flood_risk === 'critical'

          return (
            <div
              key={p.station_id}
              style={{
                background: isCritical ? 'rgba(226,75,74,0.08)' : 'rgba(255,255,255,0.03)',
                border: isCritical ? '1px solid rgba(226,75,74,0.35)' : '1px solid rgba(255,255,255,0.08)',
                borderLeft: `4px solid ${color}`, borderRadius: '0 8px 8px 0', padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>
                  {p.region_name}
                </span>
                <span style={{
                  background: `${color}22`, color: color, border: `1px solid ${color}44`,
                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase',
                }}>
                  {p.predicted_flood_risk} RISK
                </span>
              </div>

              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                ⏳ <strong>{p.estimated_hours_until_flooding === 0 ? '0.0 hrs — DANGER BREACHED' : `${p.estimated_hours_until_flooding} hrs until inundation`}</strong>
              </div>

              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>
                IMD Rain Alert: <strong style={{ color: p.rainfall_alert === 'very_heavy' ? '#E24B4A' : '#f59e0b' }}>{p.rainfall_alert}</strong>
              </div>

              <button
                onClick={() => handleAlert(p.district)}
                disabled={dispatchingRegion === p.district}
                style={{
                  width: '100%', padding: '7px 0', minHeight: 36,
                  background: isCritical ? 'rgba(226,75,74,0.22)' : 'rgba(255,255,255,0.05)',
                  border: isCritical ? '1px solid #E24B4A' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 5, color: isCritical ? '#fca5a5' : '#e2e8f0',
                  fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {dispatchingRegion === p.district ? 'Broadcasting Alert…' : '📢 Send Pre-Emptive Alert'}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

function PanelHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{title}</span>
      </div>
      {subtitle && (
        <div style={{ color: '#64748b', fontSize: 11, marginTop: 4, paddingLeft: 24 }}>
          {subtitle}
        </div>
      )}
      <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, transparent 100%)', marginTop: 12 }} />
    </div>
  )
}

function btnStyle(active = false, accent = false) {
  return {
    background: active
      ? 'rgba(0, 229, 255, 0.12)'
      : accent ? 'rgba(0, 229, 255, 0.06)' : 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(10px)',
    color: active ? '#00E5FF' : accent ? '#7dd3fc' : '#ccd6e0',
    border: active
      ? '1px solid rgba(0, 229, 255, 0.5)'
      : accent ? '1px solid rgba(0, 229, 255, 0.2)' : '1px solid rgba(0, 229, 255, 0.08)',
    borderRadius: 9,
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
    display: 'flex', alignItems: 'center', gap: 8,
    textAlign: 'left',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s, transform 0.1s',
    minHeight: 38,
    boxShadow: active ? '0 0 14px rgba(0,229,255,0.3)' : 'none',
  }
}

// Derive a status pill label from case properties
function getStatusPill(tier, isOverdue) {
  if (isOverdue) return { label: 'OVERDUE', cls: 'status-overdue' }
  if (tier === 'Tier 1') return { label: 'CRITICAL', cls: 'status-critical' }
  if (tier === 'Tier 2') return { label: 'RESCUING', cls: 'status-rescuing' }
  return { label: 'SAFE', cls: 'status-safe' }
}


// ── Main MapView ───────────────────────────────────────────────────────────────
export default function MapView({ onOpenTele, onOpenAudit, onOpenField }) {
  const [mapData, setMapData]             = useState(null)
  const [queue,   setQueue]               = useState(null)
  const [campsData, setCampsData]         = useState(null)
  const [auditSummary, setAuditSummary]   = useState(null)
  const [missingReports, setMissingReports] = useState([])
  const [riverGauges, setRiverGauges]     = useState([])
  const [riskPredictions, setRiskPredictions] = useState([])
  const [alertToast, setAlertToast]       = useState('')

  const [panel,   setPanel]               = useState(null)
  const [loadErr, setLoadErr]             = useState(null)
  const [filter,  setFilter]              = useState('')
  const [lastUpdated, setLastUpdated]     = useState(null)
  const [refreshing, setRefreshing]       = useState(false)
  const [fitTrigger, setFitTrigger]       = useState(0)
  const [mapCenter, setMapCenter]         = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(null)

  // Mobile responsiveness state (<768px)
  const [isMobile, setIsMobile]           = useState(window.innerWidth < 768)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchAll = useCallback(async () => {
    setRefreshing(true)
    setLoadErr(null)
    try {
      const [md, q, c, aud, rep, gauges, risk] = await Promise.all([
        fetch(`${API_BASE}/api/map-data`).then(r => r.json()),
        fetch(`${API_BASE}/triage/queue`).then(r => r.json()),
        fetch(`${API_BASE}/api/camps`).then(r => r.json()),
        fetch(`${API_BASE}/api/audit/summary`).then(r => r.json()),
        fetch(`${API_BASE}/api/missing-persons`).then(r => r.json()),
        fetch(`${API_BASE}/api/river-gauge-data`).then(r => r.json()),
        fetch(`${API_BASE}/api/flood-risk-prediction`).then(r => r.json()),
      ])
      setMapData(md)
      setQueue(q)
      setCampsData(c.camps ?? [])
      setAuditSummary(aud)
      setMissingReports(rep.reports ?? [])
      setRiverGauges(gauges.stations ?? [])
      setRiskPredictions(risk.predictions ?? [])
      setLastUpdated(new Date())
    } catch (e) {
      setLoadErr(e.message)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const timer = setInterval(() => {
      fetchAll()
    }, 30000)
    return () => clearInterval(timer)
  }, [fetchAll])

  const handlePanelBtn = useCallback((key) => {
    setPanel(prev => prev === key ? null : key)
    if (isMobile) {
      setMobileMenuOpen(false)
    }
  }, [isMobile])

  const handleFindNearestCamp = useCallback(async (caseObj) => {
    try {
      const lat = caseObj._lat ?? caseObj.geometry?.coordinates[1] ?? caseObj.lat
      const lng = caseObj._lng ?? caseObj.geometry?.coordinates[0] ?? caseObj.lng
      const landmark = caseObj.gps_or_landmark || caseObj.landmark || 'SOS Location'

      if (lat == null || lng == null) return

      const res = await fetch(`${API_BASE}/api/camps/nearest?lat=${lat}&lng=${lng}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const nearest = data.nearest_camp

      if (nearest) {
        setSelectedRoute({
          caseLoc: [lat, lng],
          campLoc: [nearest.lat, nearest.lng],
          campName: nearest.name,
          campId: nearest.camp_id,
          distanceKm: nearest.distance_km,
          caseLandmark: landmark,
        })
        setPanel('camps')
        setMapCenter([nearest.lat, nearest.lng])
      }
    } catch (e) {
      console.error('Error finding nearest camp:', e)
    }
  }, [])

  const handleHighlightCamp = useCallback((camp) => {
    if (camp?.lat != null && camp?.lng != null) {
      setMapCenter([camp.lat, camp.lng])
    }
  }, [])

  const handleResolveReport = useCallback(async (reportId) => {
    try {
      const res = await fetch(`${API_BASE}/api/missing-persons/${reportId}/resolve`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      fetchAll()
    } catch (e) {
      alert(`Error resolving report: ${e.message}`)
    }
  }, [fetchAll])

  const handleDispatchAlert = useCallback(async (regionName) => {
    try {
      const res = await fetch(`${API_BASE}/api/early-warning/alert/${encodeURIComponent(regionName)}`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAlertToast(`Broadcast dispatched for ${regionName} via IVR/SMS!`)
      setTimeout(() => setAlertToast(''), 6000)
    } catch (e) {
      alert(`Error dispatching alert: ${e.message}`)
    }
  }, [])

  const caseFeatures = useMemo(() => mapData?.cases?.features ?? [], [mapData])
  const floodFeatures = useMemo(() => mapData?.flood_zones?.features ?? [], [mapData])

  const heatPoints = useMemo(() => {
    const pts = []
    floodFeatures.forEach(feat => {
      const type = feat.properties?.zone_type
      const weight = type === 'red' ? 1.0 : type === 'yellow' ? 0.6 : 0.25
      const ring = feat.geometry?.coordinates?.[0] ?? []

      let sumLat = 0, sumLng = 0
      ring.forEach(([lng, lat]) => {
        pts.push([lat, lng, weight])
        sumLat += lat
        sumLng += lng
      })
      if (ring.length > 0) {
        const cLat = sumLat / ring.length
        const cLng = sumLng / ring.length
        pts.push([cLat, cLng, Math.min(1.0, weight * 1.3)])
        for (let i = 0; i < ring.length - 1; i++) {
          const mLat = (ring[i][1] + ring[i+1][1]) / 2
          const mLng = (ring[i][0] + ring[i+1][0]) / 2
          pts.push([mLat, mLng, weight * 0.95])
        }
      }
    })

    caseFeatures.forEach(c => {
      const [lng, lat] = c.geometry.coordinates
      const urg = c.properties?.urgency_score ?? 3
      const weight = urg >= 5 ? 0.95 : urg === 4 ? 0.75 : 0.5
      pts.push([lat, lng, weight])
    })

    return pts
  }, [floodFeatures, caseFeatures])

  const hazardCampIds = useMemo(() => {
    return new Set((auditSummary?.hazard_alerts ?? []).map(h => h.camp_id))
  }, [auditSummary])

  const overdueMap = useMemo(() => {
    const map = {}
    if (auditSummary?.overdue_cases) {
      auditSummary.overdue_cases.forEach(c => { map[c.case_id] = c })
    }
    return map
  }, [auditSummary])

  const filterLower = filter.toLowerCase().trim()
  const visibleCases = useMemo(() => {
    if (!filterLower) return caseFeatures
    return caseFeatures.filter(f => {
      const p = f.properties
      return (
        p.gps_or_landmark?.toLowerCase().includes(filterLower) ||
        p.tier?.toLowerCase().includes(filterLower)
      )
    })
  }, [caseFeatures, filterLower])

  const bounds = useMemo(() => {
    if (caseFeatures.length === 0) return null
    const lats = caseFeatures.map(f => f.geometry.coordinates[1])
    const lngs = caseFeatures.map(f => f.geometry.coordinates[0])
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ]
  }, [caseFeatures])

  // ── Derived live metrics (must be before any early returns — Rules of Hooks) ──
  const totalSOS = useMemo(() => {
    if (!queue?.tiers) return 0
    return Object.values(queue.tiers).reduce((s, arr) => s + arr.length, 0)
  }, [queue])

  const totalTrapped = useMemo(() => {
    if (!queue?.tiers) return 0
    return Object.values(queue.tiers).reduce((s, arr) =>
      s + arr.reduce((ss, c) => ss + (c.victim_count ?? 1), 0), 0)
  }, [queue])

  const boatsDeployed = useMemo(() => {
    if (!queue?.tiers) return 0
    const t1 = (queue.tiers['Tier 1'] ?? []).length
    const t2 = (queue.tiers['Tier 2'] ?? []).length
    return Math.max(t1, Math.round((t1 + t2) * 0.6))
  }, [queue])

  const riverDangerPct = useMemo(() => {
    if (!riverGauges.length) return null
    return Math.max(...riverGauges.map(g =>
      Math.round((g.current_level_m / g.danger_level_m) * 100)
    ))
  }, [riverGauges])

  const fmtTime = (d) => d
    ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  if (!mapData && loadErr)  return <LoadingScreen error={loadErr} onRetry={fetchAll} />
  if (!mapData)             return <LoadingScreen />

  return (
    <div style={{
      width: '100vw', height: '100vh', position: 'relative',
      background: 'var(--bg-primary)', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
      overflow: 'hidden',
    }}>

      {/* Radar sweep */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
        <div className="radar-sweep" />
      </div>

      {/* ── LIVE METRICS HEADER BAR ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        background: 'rgba(8, 14, 26, 0.92)',
        backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(0, 229, 255, 0.15)',
        boxShadow: '0 2px 24px rgba(0,0,0,0.7), 0 1px 0 rgba(0,229,255,0.08)',
        display: 'flex', alignItems: 'stretch',
        height: isMobile ? 54 : 62,
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 18px',
          borderRight: '1px solid rgba(0,229,255,0.1)',
          flexShrink: 0,
        }}>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#00E5FF', boxShadow: '0 0 10px rgba(0,229,255,0.8)',
            }}
          />
          <div>
            <div style={{ color: '#00E5FF', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', lineHeight: 1 }}>
              RESQNET AI
            </div>
            <div style={{ color: 'rgba(0,229,255,0.45)', fontSize: 8, fontWeight: 600, letterSpacing: '0.12em' }}>
              FLOOD RESCUE COMMAND
            </div>
          </div>
        </div>

        {/* Metric tiles */}
        {!isMobile && (
          <div style={{ display: 'flex', flex: 1, alignItems: 'stretch' }}>
            {/* Active SOS */}
            <div className="metric-card">
              <span className="metric-label">Active SOS Requests</span>
              <span className={`metric-value live-value ${totalSOS > 5 ? 'alert' : ''}`}>
                {totalSOS}
              </span>
              <span className="metric-sub">across Assam districts</span>
            </div>

            {/* People Trapped */}
            <div className="metric-card">
              <span className="metric-label">People Trapped</span>
              <span className={`metric-value live-value ${totalTrapped > 20 ? 'alert' : 'warn'}`}>
                {totalTrapped}
              </span>
              <span className="metric-sub">estimated victims</span>
            </div>

            {/* Boats Deployed */}
            <div className="metric-card">
              <span className="metric-label">Boats Deployed</span>
              <span className="metric-value live-value">
                {boatsDeployed}
              </span>
              <span className="metric-sub">rescue assets active</span>
            </div>

            {/* River Level */}
            <div className="metric-card">
              <span className="metric-label">River Level Status</span>
              <span className={`metric-value ${
                riverDangerPct == null ? '' :
                riverDangerPct >= 95 ? 'alert' :
                riverDangerPct >= 75 ? 'warn' : 'safe'
              }`}>
                {riverDangerPct != null ? `${riverDangerPct}%` : '—'}
              </span>
              <span className="metric-sub">
                {riverDangerPct == null ? 'loading gauges…' :
                 riverDangerPct >= 95 ? '⚠ danger level reached' :
                 riverDangerPct >= 75 ? 'approaching danger' : 'within safe range'}
              </span>
            </div>
          </div>
        )}

        {/* Right: LIVE badge + refresh + timestamp */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
          borderLeft: '1px solid rgba(0,229,255,0.1)',
          flexShrink: 0, marginLeft: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.span
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              style={{
                display: 'inline-block', width: 7, height: 7,
                borderRadius: '50%', background: '#00E5FF', boxShadow: '0 0 8px rgba(0,229,255,0.9)',
              }}
            />
            <span style={{ color: '#00E5FF', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>LIVE</span>
          </div>
          <div style={{ width: 1, height: 18, background: 'rgba(0,229,255,0.15)' }} />
          <span style={{ color: '#555f70', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>
            {lastUpdated ? fmtTime(lastUpdated) : '——:——'}
          </span>
          <motion.button
            onClick={fetchAll} disabled={refreshing}
            whileHover={refreshing ? {} : { scale: 1.1 }} whileTap={refreshing ? {} : { scale: 0.92 }}
            title="Refresh data"
            style={{
              background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: 7, width: 28, height: 28, cursor: refreshing ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00E5FF', fontSize: 14,
            }}
          >
            <motion.span animate={refreshing ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}>↻</motion.span>
          </motion.button>
          <motion.button
            onClick={() => setFitTrigger(t => t + 1)}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
            title="Reset map view"
            style={{
              background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: 7, width: 28, height: 28, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00E5FF', fontSize: 14,
            }}
          >
            ⊕
          </motion.button>
          {isMobile && (
            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              whileTap={{ scale: 0.94 }}
              style={{
                background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.35)',
                borderRadius: 8, color: '#00E5FF', padding: '5px 12px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              ☰
            </motion.button>
          )}
        </div>
      </div>

      {/* Leaflet MapContainer */}
      <MapContainer
        style={{ width: '100%', height: '100%', paddingTop: isMobile ? 54 : 62, background: '#080E1A', zIndex: 0 }}
        center={[26.2, 92.8]}
        zoom={7}
        zoomControl={false}
        attributionControl={true}
      >
        <ZoomControl position={isMobile ? "topright" : "bottomright"} />

        {bounds && <FitBoundsController bounds={bounds} trigger={fitTrigger} />}
        {mapCenter && <CenterController center={mapCenter} />}

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO &copy; OpenStreetMap'
          subdomains="abcd"
          maxZoom={20}
          detectRetina={true}
        />

        {/* DARK VIGNETTE MASK */}
        <Polygon
          positions={ASSAM_BOUNDING_MASK}
          pathOptions={{
            fillColor: '#050a14', fillOpacity: 0.62,
            stroke: true, color: '#334155', weight: 1.5, dashArray: '5, 5',
          }}
        />

        {/* HEATMAP LAYER */}
        <HeatmapLayer points={heatPoints} />

        {/* FLOOD POLYGONS */}
        {floodFeatures.map(feature => {
          const zoneType = feature.properties?.zone_type
          const color    = ZONE_COLOR[zoneType] ?? '#94a3b8'
          const positions = geoRingToLeaflet(feature.geometry.coordinates[0])
          return (
            <Polygon
              key={feature.id}
              positions={positions}
              pathOptions={{
                color, fillColor: color, fillOpacity: 0.18,
                weight: 1.5, opacity: 0.8, dashArray: '6 4',
              }}
            >
              <Tooltip sticky direction="top" offset={[0, -4]} className="resqnet-tooltip">
                <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 11 }}>
                  <strong style={{ color }}>{feature.properties.label}</strong>
                  <br />{feature.properties.depth}
                </div>
              </Tooltip>
            </Polygon>
          )
        })}

        {/* ROUTE POLYLINE */}
        {selectedRoute && (
          <Polyline
            positions={[selectedRoute.caseLoc, selectedRoute.campLoc]}
            pathOptions={{ color: '#34D399', weight: 4, opacity: 0.9, dashArray: '8, 8' }}
          >
            <Tooltip permanent sticky direction="center" className="resqnet-tooltip">
              <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399' }}>
                Suggested Route ({selectedRoute.distanceKm} km)
              </div>
            </Tooltip>
          </Polyline>
        )}

        {/* CWC RIVER GAUGE MARKERS */}
        {riverGauges.map(g => {
          const isDanger = g.current_level_m >= g.danger_level_m
          const isWarning = g.current_level_m >= g.warning_level_m
          const risk = isDanger ? 'critical' : isWarning ? 'high' : 'moderate'
          const icon = makeGaugeIcon(risk)

          return (
            <Marker
              key={g.station_id}
              position={[g.lat, g.lng]}
              icon={icon}
            >
              <Tooltip direction="top" offset={[0, -14]} className="resqnet-tooltip">
                <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 11 }}>
                  🌊 <strong>CWC Gauge: {g.station_name}</strong>
                  <br />Level: {g.current_level_m}m (Danger: {g.danger_level_m}m)
                </div>
              </Tooltip>
              <Popup offset={[0, -14]} className="resqnet-popup" closeButton={false}>
                <div style={{
                  background: '#0f172a', color: '#e2e8f0', borderRadius: 10, padding: '12px 14px',
                  minWidth: 210, fontSize: 12, border: `1px solid ${RISK_COLOR[risk]}44`,
                  fontFamily: "'Inter','Segoe UI',sans-serif",
                }}>
                  <div style={{ color: RISK_COLOR[risk], fontWeight: 700, fontSize: 10, marginBottom: 4 }}>
                    🌊 CWC RIVER MONITORING STATION
                  </div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>{g.station_name}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>{g.river_name} · {g.district}</div>
                  <div style={{ fontSize: 11, color: '#e2e8f0' }}>Current Level: <strong>{g.current_level_m}m</strong></div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Danger Level: <strong>{g.danger_level_m}m</strong></div>
                  <div style={{ fontSize: 11, color: g.rate_of_rise_cm_per_hour > 0 ? '#fca5a5' : '#a3d669', marginTop: 4 }}>
                    Trend: {g.trend} (+{g.rate_of_rise_cm_per_hour} cm/h)
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* CAMP MARKERS */}
        {(campsData ?? []).map(camp => {
          const hasHazard = hazardCampIds.has(camp.camp_id)
          const statusColor = hasHazard ? '#EF9F27' : (camp.status === 'Full' ? '#E24B4A' : camp.status === 'Near Capacity' ? '#EF9F27' : '#639922')
          const icon = makeCampIcon(camp.status, hasHazard)

          return (
            <Marker
              key={camp.camp_id}
              position={[camp.lat, camp.lng]}
              icon={icon}
            >
              <Tooltip direction="top" offset={[0, -16]} className="resqnet-tooltip">
                <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 11 }}>
                  {hasHazard && <span style={{ color: '#EF9F27', fontWeight: 700, marginRight: 4 }}>⚠️ HAZARD</span>}
                  <span style={{
                    display: 'inline-block', background: statusColor, color: '#fff',
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, marginRight: 5,
                  }}>
                    CAMP: {camp.status}
                  </span>
                  {camp.name}
                </div>
              </Tooltip>

              <Popup offset={[0, -16]} className="resqnet-popup" closeButton={false}>
                <div style={{
                  background: '#0f172a', color: '#e2e8f0', borderRadius: 10, padding: '12px 14px',
                  minWidth: 220, maxWidth: 280, fontSize: 12, border: `1px solid ${statusColor}44`,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.6)', fontFamily: "'Inter','Segoe UI',sans-serif",
                }}>
                  {hasHazard && (
                    <div style={{
                      background: 'rgba(239,159,39,0.18)', border: '1px solid #EF9F27',
                      color: '#fcd34d', fontSize: 10, fontWeight: 700, padding: '3px 8px',
                      borderRadius: 5, marginBottom: 8,
                    }}>
                      ⚠️ PUBLIC HEALTH HAZARD ALERT
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{
                      background: statusColor, color: '#fff', fontSize: 10, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em',
                    }}>
                      RELIEF CAMP
                    </span>
                    <span style={{ color: statusColor, fontSize: 11, fontWeight: 700 }}>
                      {camp.status}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 2, lineHeight: 1.4 }}>
                    🏕️ {camp.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>
                    {camp.district} District
                  </div>
                  <div style={{ fontSize: 11, color: '#e2e8f0', marginBottom: 4 }}>
                    Occupancy: {camp.current_occupancy} / {camp.capacity} beds ({camp.occupancy_pct}%)
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${Math.min(camp.occupancy_pct, 100)}%`, background: statusColor }} />
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* NUMBERED CASE MARKERS */}
        {visibleCases.map(feature => {
          const [rawLng, rawLat] = feature.geometry.coordinates
          const props = feature.properties
          const ov = overdueMap[props.case_id]
          const isOverdue = Boolean(ov)

          const [dx, dy] = jitter(props.case_id)
          const lng = rawLng + dx
          const lat = rawLat + dy

          const urg = props.urgency_score ?? 3
          const sz = urg >= 5 ? 28 : urg === 4 ? 24 : urg === 3 ? 20 : 18
          const victimCount = props.victim_count ?? 1
          const mergedCount = props.merged_count ?? 1
          const icon = makeCaseIcon(props.tier, isOverdue, sz, victimCount, mergedCount)

          return (
            <Marker
              key={props.case_id}
              position={[lat, lng]}
              icon={icon}
            >
              <Tooltip direction="top" offset={[0, -sz / 2 - 4]} opacity={1} className="resqnet-tooltip">
                <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 11 }}>
                  {isOverdue && <span style={{ color: '#E24B4A', fontWeight: 700, marginRight: 4 }}>🚨 OVERDUE</span>}
                  {mergedCount > 1 && <span style={{ color: '#38bdf8', fontWeight: 700, marginRight: 4 }}>🔗 {mergedCount} REPS</span>}
                  <span style={{
                    display: 'inline-block',
                    background: TIER[props.tier]?.color ?? '#E24B4A', color: '#fff',
                    fontSize: 9, fontWeight: 700, padding: '1px 5px',
                    borderRadius: 3, marginRight: 5, letterSpacing: '0.05em',
                  }}>
                    {props.tier}
                  </span>
                  {props.gps_or_landmark} ({victimCount} victims)
                </div>
              </Tooltip>

              <Popup offset={[0, -sz / 2 - 4]} className="resqnet-popup" closeButton={false}>
                <CasePopupContent
                  props={{ ...props, is_overdue: isOverdue, overdue_hours: ov?.overdue_hours }}
                  onFindNearestCamp={handleFindNearestCamp}
                />
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* ── FLOATING LEFT TOOLBAR (DESKTOP) ── */}
      {!isMobile ? (
        <div style={{
          position: 'absolute',
          top: 80, /* below 62px header */
          left: 16,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: 'center',
        }}>
          {/* Search bar */}
          <div style={{
            background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(14px)',
            border: '1px solid rgba(0,229,255,0.14)',
            borderRadius: 10, padding: '5px 10px',
            display: 'flex', alignItems: 'center', gap: 6,
            width: 200, marginBottom: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}>
            <span style={{ color: '#00E5FF', fontSize: 12, opacity: 0.7 }}>🔍</span>
            <input
              type="text"
              placeholder="Filter location / tier…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: '#ddd', fontSize: 11, flex: 1,
                fontFamily: 'inherit', caretColor: '#00E5FF',
              }}
            />
            {filter && (
              <button
                onClick={() => setFilter('')}
                style={{ background: 'none', border: 'none', color: '#555f70', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}
              >×</button>
            )}
          </div>

          {/* Main panel buttons — icon only */}
          {[
            { key: 'queue',         icon: '🆘', tip: 'Trapped / SOS Queue' },
            { key: 'insights',      icon: '🔥', tip: 'Worst-Hit Locations' },
            { key: 'camps',         icon: '🏕', tip: 'Relief Camps & Inventory' },
            { key: 'reunification', icon: '👨‍👩‍👧', tip: 'Missing Persons Registry' },
            { key: 'early_warning', icon: '🌊', tip: 'River Gauge / Early Warning' },
            { key: null,            icon: '🗺️', tip: 'Map Only (close panel)' },
          ].map(btn => (
            <motion.button
              key={btn.tip}
              onClick={() => handlePanelBtn(btn.key)}
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
              className={`toolbar-btn${btn.key !== null && panel === btn.key ? ' active' : ''}`}
              data-tooltip={btn.tip}
              title={btn.tip}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{btn.icon}</span>
            </motion.button>
          ))}

          <div className="toolbar-divider" />

          {/* Module links */}
          {[
            { fn: onOpenTele,  icon: '📞', tip: 'Tele-Maternity Bridge (M4)' },
            { fn: onOpenAudit, icon: '📜', tip: 'System Audit & Accountability (M6)' },
            { fn: onOpenField, icon: '👷', tip: 'Field Worker Portal (M11)' },
          ].map(btn => (
            <motion.button
              key={btn.tip}
              onClick={btn.fn}
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
              className="toolbar-btn"
              data-tooltip={btn.tip}
              title={btn.tip}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{btn.icon}</span>
            </motion.button>
          ))}
        </div>
      ) : (
        /* MOBILE — menu toggle only (header bar has the button) */
        null
      )}

      {/* MOBILE EXPANDABLE MENU MODAL */}
      <AnimatePresence>
        {isMobile && mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute', top: 60, left: 12, right: 12, zIndex: 30,
              background: 'rgba(10,16,30,0.96)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14,
              padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
            }}
          >
            {[
              { key: 'queue',         icon: '📡', label: 'Queue' },
              { key: 'insights',      icon: '🔥', label: 'Worst Hit' },
              { key: 'camps',         icon: '🏕', label: 'Camps' },
              { key: 'reunification', icon: '🔍', label: 'Missing' },
              { key: 'early_warning', icon: '⚡', label: 'Warning' },
              { key: null,            icon: '🗺', label: 'Map only' },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={() => handlePanelBtn(btn.key)}
                style={btnStyle(btn.key !== null && panel === btn.key)}
              >
                <span style={{ fontSize: 14 }}>{btn.icon}</span>
                {btn.label}
              </button>
            ))}

            <div style={{ gridColumn: 'span 2', height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

            <button onClick={() => { onOpenTele(); setMobileMenuOpen(false) }} style={btnStyle(false, true)}>
              <span>📞</span> Tele-health
            </button>
            <button onClick={() => { onOpenAudit(); setMobileMenuOpen(false) }} style={btnStyle(false, true)}>
              <span>📜</span> System Audit
            </button>
            <button onClick={() => { onOpenField(); setMobileMenuOpen(false) }} style={{ ...btnStyle(false, true), gridColumn: 'span 2' }}>
              <span>👷</span> Field Portal (Offline)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop top-right: removed (controls now in metrics header bar) */}

      {/* ── LEGEND (DESKTOP ONLY) ── */}
      {!isMobile && (
        <div style={{
          position: 'absolute', bottom: 24, left: 16, zIndex: 10,
          background: 'rgba(8, 14, 26, 0.88)', backdropFilter: 'blur(14px)',
          border: '1px solid rgba(0,229,255,0.14)', borderRadius: 10, padding: '10px 14px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          <div style={{ color: 'rgba(0,229,255,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 8 }}>
            HEATMAP & FLOOD INTENSITY
          </div>
          <div style={{
            height: 6, borderRadius: 3, marginBottom: 6,
            background: 'linear-gradient(90deg, #34D399 0%, #F59E0B 40%, #EF9F27 75%, #E24B4A 100%)',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555f70', fontSize: 9, marginBottom: 8 }}>
            <span>Safe</span><span>Shallow</span><span>Danger</span>
          </div>
          <div style={{ height: 1, background: 'rgba(0,229,255,0.08)', margin: '6px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { icon: '🌊', color: '#93c5fd', label: 'CWC River Gauge' },
              { icon: '🚨', color: '#FF3B30',  label: 'Overdue Alert' },
              { icon: '🔗', color: '#00E5FF',  label: 'SOS Cluster' },
              { icon: '⚠️', color: '#fcd34d',  label: 'Health Hazard' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10 }}>{item.icon}</span>
                <span style={{ color: item.color, fontSize: 9, fontWeight: 600 }}>{item.label}</span>
              </div>
            ))}
          </div>
          {/* Status Pills Legend */}
          <div style={{ height: 1, background: 'rgba(0,229,255,0.08)', margin: '6px 0' }} />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <span className="status-pill status-critical">CRITICAL</span>
            <span className="status-pill status-rescuing">RESCUING</span>
            <span className="status-pill status-safe">SAFE</span>
          </div>
        </div>
      )}

      {/* SIDE PANEL (DESKTOP >768px) vs BOTTOM SHEET DRAWER (MOBILE <768px) */}
      <AnimatePresence mode="wait">
        {panel && (
          <motion.div
            key={panel}
            variants={isMobile ? mobileDrawerVariants : desktopPanelVariants}
            initial="hidden" animate="visible" exit="exit"
            style={isMobile ? mobileDrawerStyle : desktopPanelStyle}
          >
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div className="mobile-drawer-handle" />
                <button
                  onClick={() => setPanel(null)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8',
                    width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16,
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {panel === 'queue' && (
              <QueuePanel
                queue={queue}
                filter={filter}
                onFindNearestCamp={handleFindNearestCamp}
                overdueCases={auditSummary?.overdue_cases}
              />
            )}
            {panel === 'insights' && (
              <InsightsPanel
                cases={caseFeatures}
                onLocateCase={(loc) => setMapCenter(loc)}
              />
            )}
            {panel === 'camps' && (
              <CampsPanel
                camps={campsData}
                queue={queue}
                onFindRouteForCase={handleFindNearestCamp}
                selectedRoute={selectedRoute}
                onClearRoute={() => setSelectedRoute(null)}
                onHighlightCamp={handleHighlightCamp}
                hazardAlerts={auditSummary?.hazard_alerts}
              />
            )}
            {panel === 'reunification' && (
              <ReunificationPanel
                reports={missingReports}
                onReportSubmitted={fetchAll}
                onResolveReport={handleResolveReport}
              />
            )}
            {panel === 'early_warning' && (
              <EarlyWarningPanel
                riverGauges={riverGauges}
                predictions={riskPredictions}
                onDispatchAlert={handleDispatchAlert}
                alertToast={alertToast}
                onHighlightStation={(loc) => setMapCenter(loc)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const desktopPanelStyle = {
  position: 'absolute',
  top: 80, /* below 62px header + gap */
  right: 16,
  bottom: 16,
  width: 278,
  background: 'rgba(8, 14, 26, 0.88)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(0, 229, 255, 0.18)',
  borderRadius: 14,
  padding: '16px 14px',
  color: 'var(--text-primary)',
  zIndex: 10,
  overflowY: 'auto',
  fontFamily: 'inherit',
  boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,255,0.05)',
}

const mobileDrawerStyle = {
  position: 'fixed',
  bottom: 0, left: 0, right: 0,
  maxHeight: '75vh',
  background: 'rgba(8, 14, 26, 0.96)',
  backdropFilter: 'blur(24px)',
  borderTop: '1px solid rgba(0, 229, 255, 0.2)',
  borderRadius: '20px 20px 0 0',
  padding: '12px 16px 24px 16px',
  color: 'var(--text-primary)',
  zIndex: 40,
  overflowY: 'auto',
  fontFamily: 'inherit',
  boxShadow: '0 -8px 40px rgba(0,0,0,0.9), 0 -1px 0 rgba(0,229,255,0.1)',
}