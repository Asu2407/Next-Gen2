/**
 * Module 3, 5, 6, 7, 8 & 10 — SAHAYAK Tactical Command Dashboard
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
import { motion, AnimatePresence } from 'framer-motion'
import { showToast } from './utils/toast'
import { useLang } from './i18n/LangContext'
import LanguageSwitcher from './components/LanguageSwitcher'
import { audioFx } from './utils/audioFx'
import DroneReconModal from './components/DroneReconModal'
import LiveIncidentSimulator from './components/LiveIncidentSimulator'
import TeleHealthBridge from './TeleHealthBridge'

// ── Constants ──────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''  // Vite proxy → localhost:8000

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

function makeStationIcon(agency) {
  const color = agency === 'IAF' ? '#a78bfa' : agency === 'NDRF' ? '#38bdf8' : '#34d399'
  const svgContent = agency === 'IAF'
    ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M12 6v4"/><path d="M7 10h10a4 4 0 0 1 4 4v2H3v-2a4 4 0 0 1 4-4z"/><path d="M5 19h14"/><path d="M7 16v3"/><path d="M17 16v3"/></svg>`
    : agency === 'NDRF'
    ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20c3-1.5 6 1.5 9 0s6-1.5 9 0"/><path d="M4 16l2.5-9h11l2.5 9z"/><path d="M12 3v4"/></svg>`
    : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;
                    background:radial-gradient(circle, ${color}33 0%, transparent 70%);
                    box-shadow:0 0 16px 4px ${color}55;" class="station-pulse"></div>
        <div style="position:relative;z-index:2;width:30px;height:30px;
                    border-radius:8px;
                    background:rgba(5,10,20,0.95);
                    border:2px solid ${color};
                    box-shadow:0 0 12px ${color}bb;
                    display:flex;align-items:center;justify-content:center;">
          ${svgContent}
        </div>
      </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
    tooltipAnchor: [23, 0],
  })
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
  // Outer glow ring size
  const ringSize = size + 18

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:${ringSize}px;height:${ringSize}px;display:flex;align-items:center;justify-content:center;">
        <!-- Teal outer glow ring (satellite style) -->
        <div style="position:absolute;inset:0;border-radius:50%;
                    background:radial-gradient(circle, ${finalColor}44 0%, #00E5FF22 55%, transparent 75%);
                    box-shadow:0 0 ${isT1 ? 22 : 14}px 6px ${'#00E5FF'}44;
                    animation:${(isT1 || isOverdue) ? 'satellitePulse 1.8s ease-in-out infinite' : 'none'};"></div>
        <!-- Inner marker: dark rounded square with color border -->
        <div style="position:relative;z-index:2;width:${size}px;height:${size}px;
                    border-radius:${Math.round(size * 0.28)}px;
                    background:rgba(5,10,20,0.92);
                    border:2px solid ${finalColor};
                    box-shadow:0 0 ${isT1 ? 14 : 8}px ${finalColor}cc, inset 0 0 6px rgba(0,0,0,0.6);
                    display:flex;align-items:center;justify-content:center;">
          <span style="color:${finalColor};font-size:${size >= 24 ? '11px' : '10px'};font-weight:800;font-family:'Inter',sans-serif;line-height:1;text-shadow:0 0 4px ${finalColor}99;">
            ${victimCount}
          </span>
        </div>
        ${isMerged ? `<div style="position:absolute;top:0;right:0;z-index:3;background:#0284c7;color:#fff;font-size:8px;font-weight:800;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff;box-shadow:0 0 6px #38bdf8;">${mergedCount}</div>` : ''}
      </div>`,
    iconSize: [ringSize, ringSize],
    iconAnchor: [ringSize / 2, ringSize / 2],
    popupAnchor: [0, -ringSize / 2 - 4],
    tooltipAnchor: [ringSize / 2 + 2, 0],
  })
}

function makeCampIcon(status, hasHazard = false) {
  const statusColor = hasHazard ? '#EF9F27' : (status === 'Full' ? '#E24B4A' : status === 'Near Capacity' ? '#EF9F27' : '#639922')
  const svgContent = hasHazard
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF9F27" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-18-7 18"/><path d="M12 3v18"/><path d="M8 21l4-9 4 9"/></svg>`

  // Satellite-style: dark rounded-square with colored glow ring
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;
                    background:radial-gradient(circle, ${statusColor}22 0%, transparent 70%);
                    box-shadow:0 0 14px 4px ${statusColor}44;"></div>
        <div style="position:relative;z-index:2;width:30px;height:30px;
                    border-radius:8px;
                    background:rgba(5,10,20,0.95);
                    border:2px solid ${statusColor};
                    box-shadow:0 0 10px ${statusColor}88;
                    display:flex;align-items:center;justify-content:center;">
          ${svgContent}
        </div>
      </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
    tooltipAnchor: [23, 0],
  })
}

function makeGaugeIcon(risk) {
  const color = RISK_COLOR[risk] ?? '#639922'
  const svgContent = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c3-1.8 6 1.8 9 0s6-1.8 9 0"/><path d="M2 12c3-1.8 6 1.8 9 0s6-1.8 9 0"/><path d="M2 18c3-1.8 6 1.8 9 0s6-1.8 9 0"/></svg>`

  // Satellite-style: dark rounded-square with teal glow ring
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;
                    background:radial-gradient(circle, #00E5FF22 0%, transparent 70%);
                    box-shadow:0 0 12px 4px #00E5FF33;"></div>
        <div style="position:relative;z-index:2;width:28px;height:28px;
                    border-radius:8px;
                    background:rgba(5,10,20,0.95);
                    border:2px solid ${color};
                    box-shadow:0 0 10px ${color}aa;
                    display:flex;align-items:center;justify-content:center;">
          ${svgContent}
        </div>
      </div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -22],
  })
}

function HeatmapLayer({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !points || points.length === 0) return

    let heatLayerInstance = null
    let active = true

    const loadAndAddHeatLayer = async () => {
      if (typeof window !== 'undefined') {
        window.L = L
      }
      if (!L.heatLayer) {
        await import('leaflet.heat')
      }
      if (!active) return

      // Satellite-optimised heatmap: larger radius + soft blur + teal→amber→red gradient
      heatLayerInstance = L.heatLayer(points, {
        radius: 58,
        blur: 38,
        maxZoom: 12,
        max: 1.0,
        gradient: {
          0.0:  '#00E5FF11',
          0.15: '#34D399',
          0.35: '#22d3ee',
          0.55: '#F59E0B',
          0.78: '#EF9F27',
          1.0:  '#E24B4A',
        },
      }).addTo(map)
    }

    loadAndAddHeatLayer()

    return () => {
      active = false
      if (heatLayerInstance && map) {
        map.removeLayer(heatLayerInstance)
      }
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

function CasePopupContent({ props, onFindNearestCamp, onDispatchRescue }) {
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

      {/* Dispatch & Shelter Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
        {props.is_dispatched ? (
          <div style={{
            padding: '6px 8px', background: 'rgba(52, 211, 153, 0.15)',
            border: '1px solid #34d399', borderRadius: 6, fontSize: 10, color: '#34d399',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span>🚤 UNIT EN ROUTE: {props.dispatch_station || 'NDRF Base'}</span>
            <strong>ETA {props.eta_minutes || 14}m</strong>
          </div>
        ) : onDispatchRescue ? (
          <button
            onClick={() => onDispatchRescue(props, 'ndrf-patgaon-guwahati', props.recommended_asset || 'NDRF Motorized Inflatable Boat')}
            style={{
              width: '100%', padding: '8px 10px', minHeight: 34,
              background: 'linear-gradient(135deg, #00E5FF 0%, #0284c7 100%)', border: 'none',
              borderRadius: 6, color: '#050a14', fontSize: 11, fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'inherit', boxShadow: '0 0 12px rgba(0, 229, 255, 0.35)'
            }}
          >
            🚤 Dispatch {props.recommended_asset || 'Rescue Unit'}
          </button>
        ) : null}

        {onFindNearestCamp && (
          <button
            onClick={() => onFindNearestCamp(props)}
            style={{
              width: '100%', padding: '7px 10px', minHeight: 32,
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
    </div>
  )
}

function QueuePanel({ queue, filter, onFindNearestCamp, onDispatchRescue, overdueCases, onConnectTele, activeTeleCaseId }) {
  const { t } = useLang()
  const [activeCategoryTab, setActiveCategoryTab] = useState('all') // 'all' | 'medical' | 't1' | 'oncall'
  const [activeVulnChip, setActiveVulnChip] = useState(null) // null | 'pregnant' | 'infant' | 'elderly' | 'dialysis' | 'disabled' | 'injured'
  const tiers = queue?.tiers ?? {}
  const f = filter.toLowerCase().trim()

  const overdueMap = useMemo(() => {
    const map = {}
    if (overdueCases) {
      overdueCases.forEach(c => { map[c.case_id] = c })
    }
    return map
  }, [overdueCases])

  // Helper to identify medical & maternity cases
  const isMedicalCase = useCallback((c) => {
    const vFlags = (c.vulnerability_flags || []).map(x => String(x).toLowerCase())
    const eCats = (c.emergency_categories || []).map(x => String(x).toLowerCase())
    const hasMedicalFlag = vFlags.some(flag => ['pregnant', 'infant', 'elderly', 'disabled', 'dialysis', 'medical', 'cardiac', 'injury'].includes(flag))
    const hasMedicalCat = eCats.some(cat => ['medical', 'labor', 'maternity', 'injury', 'dialysis', 'casualty'].includes(cat))
    const hasActiveStatus = c.tele_health_status && c.tele_health_status !== 'not_needed'
    return hasMedicalFlag || hasMedicalCat || hasActiveStatus
  }, [])

  const isMaternityCase = useCallback((c) => {
    const vFlags = (c.vulnerability_flags || []).map(x => String(x).toLowerCase())
    const eCats = (c.emergency_categories || []).map(x => String(x).toLowerCase())
    return vFlags.includes('pregnant') || eCats.includes('labor') || eCats.includes('maternity')
  }, [])

  // Quick aggregate statistics across all tiers
  const stats = useMemo(() => {
    let total = 0
    let medicalCount = 0
    let t1Count = 0
    let onCallCount = 0

    Object.values(tiers).forEach(cases => {
      cases.forEach(c => {
        total++
        if (isMedicalCase(c)) medicalCount++
        if (c.tier === 'Tier 1') t1Count++
        if (['connected', 'connecting'].includes(c.tele_health_status)) onCallCount++
      })
    })

    return { total, medicalCount, t1Count, onCallCount }
  }, [tiers, isMedicalCase])

  // Dynamic demographic counts across all cases
  const vulnCounts = useMemo(() => {
    const counts = {
      pregnant: 0,
      infant: 0,
      elderly: 0,
      dialysis: 0,
      disabled: 0,
      injured: 0,
    }
    Object.values(tiers).forEach(cases => {
      cases.forEach(c => {
        const vFlags = (c.vulnerability_flags || []).map(x => String(x).toLowerCase())
        const eCats = (c.emergency_categories || []).map(x => String(x).toLowerCase())
        if (vFlags.includes('pregnant') || eCats.includes('labor') || eCats.includes('maternity')) counts.pregnant++
        if (vFlags.includes('infant') || vFlags.includes('child')) counts.infant++
        if (vFlags.includes('elderly')) counts.elderly++
        if (vFlags.includes('dialysis')) counts.dialysis++
        if (vFlags.includes('disabled')) counts.disabled++
        if (vFlags.includes('injured') || vFlags.includes('injury') || eCats.includes('injury')) counts.injured++
      })
    })
    return counts
  }, [tiers])

  const filterCases = (cases) => {
    return cases.filter(c => {
      // 1. Text filter match
      const matchesText = !f ||
        c.gps_or_landmark?.toLowerCase().includes(f) ||
        c.tier?.toLowerCase().includes(f) ||
        c.vulnerability_flags?.some(vf => vf.toLowerCase().includes(f)) ||
        c.emergency_categories?.some(ec => ec.toLowerCase().includes(f))

      if (!matchesText) return false

      // 2. Category tab filter
      if (activeCategoryTab === 'medical') {
        if (!isMedicalCase(c)) return false
      } else if (activeCategoryTab === 't1') {
        if (c.tier !== 'Tier 1') return false
      } else if (activeCategoryTab === 'oncall') {
        if (!['connected', 'connecting', 'completed'].includes(c.tele_health_status)) return false
      }

      // 3. Demographic Vulnerability Quick-Filter Chip
      if (activeVulnChip) {
        const vFlags = (c.vulnerability_flags || []).map(x => String(x).toLowerCase())
        const eCats = (c.emergency_categories || []).map(x => String(x).toLowerCase())
        if (activeVulnChip === 'pregnant' && !(vFlags.includes('pregnant') || eCats.includes('labor') || eCats.includes('maternity'))) return false
        if (activeVulnChip === 'infant' && !(vFlags.includes('infant') || vFlags.includes('child'))) return false
        if (activeVulnChip === 'elderly' && !vFlags.includes('elderly')) return false
        if (activeVulnChip === 'dialysis' && !vFlags.includes('dialysis')) return false
        if (activeVulnChip === 'disabled' && !vFlags.includes('disabled')) return false
        if (activeVulnChip === 'injured' && !(vFlags.includes('injured') || vFlags.includes('injury') || eCats.includes('injury'))) return false
      }

      return true
    })
  }

  return (
    <>
      <PanelHeader
        icon="🆘"
        title={t('panel.queue_title')}
        subtitle={`${stats.total} ${t('queue.cases')} · ${stats.medicalCount} medical/maternity priority`}
      />

      {/* Category Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: 6,
        marginBottom: 12,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {[
          { key: 'all', label: t('queue.tab_all'), count: stats.total, color: 'var(--cyan)' },
          { key: 'medical', label: t('queue.tab_medical'), count: stats.medicalCount, color: '#f43f5e' },
          { key: 't1', label: t('queue.tab_t1'), count: stats.t1Count, color: '#E24B4A' },
          { key: 'oncall', label: t('queue.tab_oncall'), count: stats.onCallCount, color: '#38bdf8' },
        ].map(tab => {
          const isActive = activeCategoryTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveCategoryTab(tab.key)}
              style={{
                background: isActive ? `${tab.color}22` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? tab.color : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8,
                padding: '6px 10px',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? `0 0 10px ${tab.color}33` : 'none',
                fontFamily: 'inherit',
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                background: isActive ? tab.color : 'rgba(255,255,255,0.1)',
                color: isActive ? '#050a14' : 'var(--text-muted)',
                fontSize: 9,
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: 10,
              }}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Demographic Vulnerability Quick-Filter Chips */}
      <div style={{
        marginBottom: 16,
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(0,229,255,0.1)',
        borderRadius: 10,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          color: '#94a3b8', marginBottom: 6,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: 'var(--cyan)' }}>⚡</span>
            <span>{t('vuln.filter_label')}</span>
          </span>
          {activeVulnChip && (
            <button
              onClick={() => setActiveVulnChip(null)}
              style={{
                background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)',
                color: '#00E5FF', borderRadius: 10, padding: '2px 8px',
                fontSize: 10, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              ✕ {t('vuln.clear')}
            </button>
          )}
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}>
          {[
            { key: 'pregnant', icon: '🤰', label: t('vuln.pregnant'), count: vulnCounts.pregnant, color: '#f43f5e', glow: 'rgba(244,63,94,0.3)' },
            { key: 'infant',   icon: '👶', label: t('vuln.infant'),   count: vulnCounts.infant,   color: '#fb923c', glow: 'rgba(251,146,60,0.3)' },
            { key: 'elderly',  icon: '🧓', label: t('vuln.elderly'),  count: vulnCounts.elderly,  color: '#facc15', glow: 'rgba(250,204,21,0.3)' },
            { key: 'dialysis', icon: '🩸', label: t('vuln.dialysis'), count: vulnCounts.dialysis, color: '#ec4899', glow: 'rgba(236,72,153,0.3)' },
            { key: 'disabled', icon: '♿', label: t('vuln.disabled'), count: vulnCounts.disabled, color: '#a855f7', glow: 'rgba(168,85,247,0.3)' },
            { key: 'injured',  icon: '🩹', label: t('vuln.injured'),  count: vulnCounts.injured,  color: '#38bdf8', glow: 'rgba(56,189,248,0.3)' },
          ].map(chip => {
            const isActive = activeVulnChip === chip.key
            return (
              <button
                key={chip.key}
                onClick={() => setActiveVulnChip(isActive ? null : chip.key)}
                style={{
                  background: isActive ? `${chip.color}25` : 'rgba(15,23,42,0.6)',
                  border: `1px solid ${isActive ? chip.color : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 14,
                  padding: '4px 9px',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isActive ? `0 0 10px ${chip.glow}, inset 0 0 4px ${chip.glow}` : 'none',
                  transform: isActive ? 'scale(1.02)' : 'none',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)'
                    e.currentTarget.style.color = '#e2e8f0'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.currentTarget.style.color = '#94a3b8'
                  }
                }}
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
                <span style={{
                  background: isActive ? chip.color : 'rgba(255,255,255,0.08)',
                  color: isActive ? '#050a14' : '#64748b',
                  fontSize: 9,
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: 8,
                  minWidth: 14,
                  textAlign: 'center',
                }}>
                  {chip.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {['Tier 1', 'Tier 2', 'Tier 3'].map(tierKey => {
        const allCases = tiers[tierKey] ?? []
        const cases = filterCases(allCases)
        const meta = TIER[tierKey]

        if ((activeCategoryTab !== 'all' || activeVulnChip) && cases.length === 0) return null

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
              {tierKey} · {cases.length}{f || activeCategoryTab !== 'all' ? ` of ${allCases.length}` : ''} {cases.length === 1 ? 'case' : 'cases'}
            </div>

            {cases.length === 0 ? (
              <div style={{ color: '#475569', fontSize: 11, paddingLeft: 14 }}>
                {f ? t('queue.no_match') : '—'}
              </div>
            ) : (
              cases.map(c => {
                const ov = overdueMap[c.case_id]
                const isOverdue = Boolean(ov)
                const mergedCount = c.merged_count ?? 1
                const isMaternity = isMaternityCase(c)
                const isMedical = isMedicalCase(c)
                const isOnCall = c.tele_health_status === 'connected'
                const isConnecting = c.tele_health_status === 'connecting'
                const isCompleted = c.tele_health_status === 'completed'
                const isThisActive = activeTeleCaseId === c.case_id

                return (
                  <div
                    key={c.case_id}
                    className={`card-tier-${tierKey === 'Tier 1' ? '1' : tierKey === 'Tier 2' ? '2' : '3'} ${isOverdue || isOnCall ? 'pulse-t1' : ''}`}
                    style={{
                      padding: '11px 13px',
                      marginBottom: 8,
                      borderRadius: '0 8px 8px 0',
                      border: isOnCall
                        ? '1px solid #E24B4A'
                        : isOverdue
                        ? '1px solid var(--t1)'
                        : isThisActive
                        ? '1px solid var(--cyan)'
                        : '1px solid rgba(255, 255, 255, 0.04)',
                      borderLeft: `3px solid ${isOnCall ? '#E24B4A' : isOverdue ? 'var(--t1)' : 'var(--t' + (tierKey === 'Tier 1' ? '1' : tierKey === 'Tier 2' ? '2' : '3') + ')'}`,
                      transition: 'transform 0.2s ease, border-color 0.2s ease',
                      background: isThisActive ? 'rgba(0, 229, 255, 0.05)' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {(() => {
                          const pill = getStatusPill(c.tier, isOverdue)
                          return (
                            <span className={`status-pill ${pill.cls}`}>
                              {t(pill.labelKey).toUpperCase()}
                            </span>
                          )
                        })()}

                        {isMaternity && (
                          <span style={{
                            background: 'rgba(244,63,94,0.18)',
                            color: '#f43f5e',
                            border: '1px solid rgba(244,63,94,0.4)',
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            letterSpacing: '0.04em',
                          }}>
                            {t('queue.maternity_badge')}
                          </span>
                        )}

                        {!isMaternity && isMedical && (
                          <span style={{
                            background: 'rgba(56,189,248,0.15)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56,189,248,0.3)',
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}>
                            {t('queue.medical_badge')}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {isOnCall && (
                          <motion.span
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            style={{
                              background: 'rgba(226,75,74,0.2)',
                              color: '#E24B4A',
                              border: '1px solid rgba(226,75,74,0.5)',
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 12,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E24B4A' }} />
                            ON CALL
                          </motion.span>
                        )}

                        {isConnecting && (
                          <span style={{
                            background: 'rgba(239,159,39,0.2)',
                            color: '#EF9F27',
                            border: '1px solid rgba(239,159,39,0.4)',
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 12,
                          }}>
                            ⏳ CONNECTING
                          </span>
                        )}

                        {isCompleted && (
                          <span style={{
                            background: 'rgba(99,153,34,0.2)',
                            color: '#639922',
                            border: '1px solid rgba(99,153,34,0.4)',
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 12,
                          }}>
                            ✓ VISITED
                          </span>
                        )}

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
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                      📍 {c.gps_or_landmark || 'Unknown location'}
                    </div>

                    <div className="text-mono" style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span>🎯 {c.urgency_score ?? '?'}/5</span>
                      <span>👥 {c.victim_count ?? '?'} victim(s)</span>
                      {(c.vulnerability_flags?.length > 0) && (
                        <span style={{ color: 'var(--t2)', fontWeight: 500 }}>⚑ {c.vulnerability_flags.join(', ')}</span>
                      )}
                    </div>

                    {/* Action Grid (Shelter, Dispatch, Doctor Bridge) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 6 }}>
                      <button
                        onClick={() => onFindNearestCamp?.({ ...c, is_overdue: isOverdue, overdue_hours: ov?.overdue_hours })}
                        className="btn-primary"
                        style={{
                          padding: '6px 4px',
                          minHeight: 28,
                          fontSize: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        🏕️ Shelter ➔
                      </button>

                      <button
                        onClick={() => onDispatchRescue?.(c, 'ndrf-patgaon-guwahati', c.recommended_asset || 'NDRF Motorized Boat')}
                        style={{
                          padding: '6px 4px',
                          minHeight: 28,
                          fontSize: 10,
                          fontWeight: 700,
                          background: c.is_dispatched ? 'rgba(52, 211, 153, 0.15)' : 'rgba(0, 229, 255, 0.15)',
                          border: c.is_dispatched ? '1px solid #34d399' : '1px solid var(--cyan)',
                          color: c.is_dispatched ? '#34d399' : '#00E5FF',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        {c.is_dispatched ? '✓ Dispatched' : '🚤 Dispatch'}
                      </button>

                      <button
                        onClick={() => onConnectTele?.(c)}
                        style={{
                          padding: '6px 6px',
                          minHeight: 28,
                          fontSize: 10,
                          fontWeight: 700,
                          background: isOnCall
                            ? 'rgba(226,75,74,0.25)'
                            : isMaternity
                            ? 'linear-gradient(135deg, rgba(244,63,94,0.2) 0%, rgba(226,75,74,0.25) 100%)'
                            : 'rgba(56,189,248,0.12)',
                          border: isOnCall
                            ? '1px solid #E24B4A'
                            : isMaternity
                            ? '1px solid #f43f5e'
                            : '1px solid rgba(56,189,248,0.35)',
                          color: isOnCall
                            ? '#fca5a5'
                            : isMaternity
                            ? '#fca5a5'
                            : '#38bdf8',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          boxShadow: isMaternity ? '0 0 10px rgba(244,63,94,0.25)' : 'none',
                        }}
                      >
                        {isOnCall ? '📞 Active Call' : isMaternity ? '♥ Doctor Call' : '🩺 Doctor Call'}
                      </button>
                    </div>
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
  const { t } = useLang()
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
      <PanelHeader icon="🔥" title={t('sidebar.insights')} subtitle={t('panel.impact')} />

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
                    #{idx + 1} {t('panel.impact')}
                  </span>
                  <span className="text-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)' }}>
                    🎯 {p.urgency_score}/5
                  </span>
                  {mergedCount > 1 && (
                    <span style={{ background: 'rgba(56,189,248,0.12)', color: 'var(--accent)', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3 }}>
                      🔗 {mergedCount} {t('panel.calls')}
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
                <span>👥 <strong>{p.victim_count}</strong> {t('panel.victims')}</span>
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
                {t('panel.locate')}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

function CampsPanel({ camps, queue, onFindRouteForCase, selectedRoute, onClearRoute, onHighlightCamp, hazardAlerts }) {
  const { t } = useLang()
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
      <PanelHeader icon="🏕" title={t('panel.camps_title')} subtitle={`${camps?.length ?? 0} ${t('panel.camps_sub')}`} />

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
                    <span>{t('map.occupancy')}</span>
                    <span>{camp.current_occupancy} / {camp.capacity} {t('map.beds')} ({pct}%)</span>
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
  const { t } = useLang()
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

function HydrographChart({ history, dangerLevel, warningLevel, dischargeCusecs }) {
  if (!history || history.length === 0) return null
  const minVal = Math.min(...history, (warningLevel || history[0]) * 0.98)
  const maxVal = Math.max(...history, (dangerLevel || history[history.length - 1]) * 1.02)
  const range = maxVal - minVal || 1

  const points = history.map((val, i) => {
    const x = (i / (history.length - 1)) * 260 + 20
    const y = 80 - ((val - minVal) / range) * 55 + 10
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const dangerY = dangerLevel ? (80 - ((dangerLevel - minVal) / range) * 55 + 10) : null
  const warningY = warningLevel ? (80 - ((warningLevel - minVal) / range) * 55 + 10) : null

  return (
    <div style={{ marginTop: 8, background: 'rgba(5, 10, 20, 0.75)', borderRadius: 6, padding: '8px 10px', border: '1px solid rgba(0, 229, 255, 0.18)' }}>
      <div style={{ fontSize: 9, color: 'var(--cyan)', fontWeight: 700, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
        <span>24H RIVER HYDROGRAPH (CWC TELEMETRY)</span>
        {dischargeCusecs && <span style={{ color: '#94a3b8' }}>FLOW: {dischargeCusecs.toLocaleString()} cusecs</span>}
      </div>
      <svg width="100%" height="70" viewBox="0 0 300 90" style={{ overflow: 'visible' }}>
        {warningY && <line x1="15" y1={warningY} x2="285" y2={warningY} stroke="#EF9F27" strokeDasharray="3 3" strokeWidth="1" />}
        {dangerY && <line x1="15" y1={dangerY} x2="285" y2={dangerY} stroke="#E24B4A" strokeDasharray="3 3" strokeWidth="1" />}
        <polyline points={points} fill="none" stroke="#00E5FF" strokeWidth="2.5" />
        {history.length > 0 && (
          <circle
            cx={280}
            cy={80 - ((history[history.length - 1] - minVal) / range) * 55 + 10}
            r="4" fill="#00E5FF" stroke="#fff" strokeWidth="1.5"
          />
        )}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>
        <span>-24h</span>
        <span style={{ color: '#EF9F27' }}>-- Warning</span>
        <span style={{ color: '#E24B4A' }}>-- Danger</span>
        <span>Now</span>
      </div>
    </div>
  )
}

function EarlyWarningPanel({ riverGauges, predictions, onDispatchAlert, alertToast, onHighlightStation }) {
  const { t } = useLang()
  const [dispatchingRegion, setDispatchingRegion] = useState('')
  const [expandedStation, setExpandedStation] = useState(null)

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
        {t('panel.cwc_stations')} ({riverGauges?.length ?? 0})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
        {(riverGauges ?? []).map(g => {
          const isDanger = g.current_level_m >= g.danger_level_m
          const isWarning = g.current_level_m >= g.warning_level_m
          const color = isDanger ? '#E24B4A' : isWarning ? '#EF9F27' : '#639922'
          const pct = Math.min(100, Math.max(10, Math.round((g.current_level_m / (g.danger_level_m * 1.05)) * 100)))
          const isExpanded = expandedStation === g.station_id

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
                  {g.trend === 'rising' ? t('panel.rising') : g.trend === 'falling' ? t('panel.falling') : t('panel.stable')}
                </span>
              </div>

              <div style={{ marginTop: 8, marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>
                  <span>{t('map.level')}: <strong>{g.current_level_m}m</strong></span>
                  <span>{t('map.danger')}: <strong>{g.danger_level_m}m</strong></span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color }} />
                </div>
              </div>

              {/* Hydrograph Chart */}
              <HydrographChart
                history={g.history_24h}
                dangerLevel={g.danger_level_m}
                warningLevel={g.warning_level_m}
                dischargeCusecs={g.discharge_cusecs}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#64748b', marginTop: 8 }}>
                <span>{t('map.rate_of_rise')}: <strong style={{ color: g.rate_of_rise_cm_per_hour > 0 ? '#fca5a5' : '#94a3b8' }}>+{g.rate_of_rise_cm_per_hour} cm/h</strong></span>
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
        {t('panel.risk_model')}
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
                  {p.predicted_flood_risk} {t('panel.risk')}
                </span>
              </div>

              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                ⏳ <strong>{p.estimated_hours_until_flooding === 0 ? '0.0 hrs — DANGER BREACHED' : `${p.estimated_hours_until_flooding} hrs until inundation`}</strong>
              </div>

              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>
                {t('panel.rain_alert')}: <strong style={{ color: p.rainfall_alert === 'very_heavy' ? '#E24B4A' : '#f59e0b' }}>{p.rainfall_alert}</strong>
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
  // Use strings matching translation keys, or pass down translation function if needed, 
  // but since it's a global we might need to handle it in rendering.
  // Actually, we can return the translation key directly, or wait until render.
  if (isOverdue) return { labelKey: 'queue.overdue', cls: 'status-overdue' }
  if (tier === 'Tier 1') return { labelKey: 'tier.critical', cls: 'status-critical' }
  if (tier === 'Tier 2') return { labelKey: 'tier.rescuing', cls: 'status-rescuing' }
  return { labelKey: 'tier.safe', cls: 'status-safe' }
}


// ── Main MapView ───────────────────────────────────────────────────────────────
export default function MapView({ onOpenTele, onOpenAudit, onOpenField }) {
  const { t } = useLang()
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
  const [activeDispatchRoute, setActiveDispatchRoute] = useState(null)

  // Modals & Sound FX
  const [isDroneOpen, setIsDroneOpen]         = useState(false)
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)
  const [activeTeleCase, setActiveTeleCase]   = useState(null)
  const [isAudioMuted, setIsAudioMuted]       = useState(() => audioFx.isMuted())

  const handleTeleStatusChange = useCallback((caseId, newStatus) => {
    setQueue(prevQueue => {
      if (!prevQueue?.tiers) return prevQueue
      const newTiers = {}
      for (const [tierKey, cases] of Object.entries(prevQueue.tiers)) {
        newTiers[tierKey] = cases.map(c => c.case_id === caseId ? { ...c, tele_health_status: newStatus } : c)
      }
      return { ...prevQueue, tiers: newTiers }
    })
    setActiveTeleCase(prev => prev && prev.case_id === caseId ? { ...prev, tele_health_status: newStatus } : prev)
  }, [])

  // Mobile responsiveness state (<768px)
  const [isMobile, setIsMobile]           = useState(window.innerWidth < 768)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleAudio = useCallback(() => {
    const nextMuted = !isAudioMuted
    setIsAudioMuted(nextMuted)
    audioFx.setMuted(nextMuted)
    if (!nextMuted) audioFx.playTactile()
    showToast(nextMuted ? '🔇 Tactical Audio Muted' : '🔊 Tactical Audio Active')
  }, [isAudioMuted])

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

  const handleDispatchRescue = useCallback(async (caseObj, stationId, assetType) => {
    try {
      audioFx.playRadioDispatch()
      const res = await fetch(`${API_BASE}/api/dispatch-rescue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseObj.case_id,
          station_id: stationId,
          asset_type: assetType,
          timestamp: new Date().toISOString()
        })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setActiveDispatchRoute({
        waypoints: data.route_waypoints,
        stationName: data.station.name,
        assetType: assetType || data.station.type,
        distanceKm: data.distance_km,
        etaMinutes: data.eta_minutes,
        caseLandmark: caseObj.gps_or_landmark
      })
      showToast(`🚤 Dispatched ${assetType || 'Rescue Boat'} from ${data.station.name}! ETA: ${data.eta_minutes} mins`)
      fetchAll()
    } catch (e) {
      showToast(`⚠️ Dispatch error: ${e.message}`)
    }
  }, [fetchAll])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetchAll()
    const timer = setInterval(() => {
      fetchAll()
    }, 30000)
    return () => clearInterval(timer)
  }, [fetchAll])

  const [isExitingPanel, setIsExitingPanel] = useState(false)
  const prevPanelRef = useRef(null)
  const isSubSwap = prevPanelRef.current !== null && panel !== null && prevPanelRef.current !== panel

  useEffect(() => {
    prevPanelRef.current = panel
  }, [panel])

  const closePanel = useCallback((afterCloseCb) => {
    setIsExitingPanel(true)
    setTimeout(() => {
      setPanel(null)
      setIsExitingPanel(false)
      if (typeof afterCloseCb === 'function') afterCloseCb()
    }, 200)
  }, [])

  const handlePanelBtn = useCallback((key) => {
    if (key === null || key === panel) {
      if (panel) {
        closePanel()
      }
    } else {
      setPanel(key)
    }
    if (isMobile) {
      setMobileMenuOpen(false)
    }
  }, [panel, isMobile, closePanel])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isDroneOpen) { setIsDroneOpen(false); return }
        if (isSimulatorOpen) { setIsSimulatorOpen(false); return }
        if (panel) { closePanel(); return }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [panel, isDroneOpen, isSimulatorOpen, closePanel])

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
        overflow: 'hidden',
      }}>
        {/* Tactical Brand Emblem Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '0 14px',
          borderRight: '1px solid rgba(0,229,255,0.12)',
          flexShrink: 0,
        }}>
          <div style={{
            position: 'relative', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(2, 132, 199, 0.3) 100%)',
            border: '1.5px solid rgba(0, 229, 255, 0.65)',
            borderRadius: 8,
            boxShadow: '0 0 16px rgba(0, 229, 255, 0.4), inset 0 0 8px rgba(0, 229, 255, 0.15)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L4 5.5V11.5C4 16.5 7.4 21.1 12 22.3C16.6 21.1 20 16.5 20 11.5V5.5L12 2Z"
                stroke="#00E5FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="rgba(0, 229, 255, 0.12)" />
              <path d="M7 13C8.5 11.8 10 14.2 12 13C14 11.8 15.5 14.2 17 13"
                stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M7 16C8.5 14.8 10 17 12 16C14 14.8 15.5 17 17 16"
                stroke="#00E5FF" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="12" cy="7.5" r="1.8" fill="#00E5FF" />
            </svg>
          </div>
          <div>
            <div style={{
              color: '#00E5FF', fontSize: 13, fontWeight: 900,
              letterSpacing: '0.06em', lineHeight: 1.1,
              textShadow: '0 0 10px rgba(0, 229, 255, 0.5)'
            }}>
              SAHAYAK
            </div>
            <div className="brand-sub" style={{ color: 'rgba(0,229,255,0.5)', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.12em' }}>
              FLOOD RESCUE COMMAND
            </div>
          </div>
        </div>

        {/* Metric tiles */}
        {!isMobile && (
          <div className="header-metrics-container" style={{ display: 'flex', flex: '1 1 0', alignItems: 'stretch', minWidth: 0, overflow: 'hidden' }}>
            {/* Active SOS */}
            <div className="metric-card">
              <span className="metric-label">{t('metric.sos_label')}</span>
              <span className={`metric-value live-value ${totalSOS > 5 ? 'alert' : ''}`}>
                {totalSOS}
              </span>
              <span className="metric-sub">{t('metric.sos_sub')}</span>
            </div>

            {/* People Trapped */}
            <div className="metric-card">
              <span className="metric-label">{t('metric.trapped_label')}</span>
              <span className={`metric-value live-value ${totalTrapped > 20 ? 'alert' : 'warn'}`}>
                {totalTrapped}
              </span>
              <span className="metric-sub">{t('metric.trapped_sub')}</span>
            </div>

            {/* Boats Deployed */}
            <div className="metric-card">
              <span className="metric-label">{t('metric.boats_label')}</span>
              <span className="metric-value live-value">
                {boatsDeployed}
              </span>
              <span className="metric-sub">{t('metric.boats_sub')}</span>
            </div>

            {/* River Level */}
            <div className="metric-card">
              <span className="metric-label">{t('metric.river_label')}</span>
              <span className={`metric-value ${
                riverDangerPct == null ? '' :
                riverDangerPct >= 95 ? 'alert' :
                riverDangerPct >= 75 ? 'warn' : 'safe'
              }`}>
                {riverDangerPct != null ? `${riverDangerPct}%` : '—'}
              </span>
              <span className="metric-sub">
                {riverDangerPct == null ? t('metric.river_loading') :
                 riverDangerPct >= 95 ? t('metric.river_danger') :
                 riverDangerPct >= 75 ? t('metric.river_approach') : t('metric.river_safe')}
              </span>
            </div>
          </div>
        )}

        {/* Right: LIVE badge + refresh + timestamp + controls */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
          borderLeft: '1px solid rgba(0,229,255,0.1)',
          flexShrink: 0, marginLeft: 'auto',
        }}>
          <div className="header-live-badge" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <motion.span
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              style={{
                display: 'inline-block', width: 6, height: 6,
                borderRadius: '50%', background: '#00E5FF', boxShadow: '0 0 8px rgba(0,229,255,0.9)',
              }}
            />
            <span style={{ color: '#00E5FF', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em' }}>LIVE</span>
          </div>

          <span className="header-time-display" style={{ color: '#555f70', fontSize: 9.5, fontFamily: 'JetBrains Mono, monospace' }}>
            {lastUpdated ? fmtTime(lastUpdated) : '——:——'}
          </span>

          {/* Tactical Action Trays: SOS Simulator, Drone Recon, Audio */}
          <motion.button
            onClick={() => { audioFx.playTactile(); setIsSimulatorOpen(true) }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            title="Voice SOS Intake & Live Surge Simulator"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(2, 132, 199, 0.25) 100%)',
              border: '1px solid var(--cyan)', borderRadius: 7, padding: '4px 8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              color: 'var(--cyan)', fontSize: 10.5, fontWeight: 700, minHeight: 28,
            }}
          >
            <span>🎙️</span>
            <span className="header-btn-label">Voice SOS</span>
          </motion.button>

          <motion.button
            onClick={() => { audioFx.playTactile(); setIsDroneOpen(true) }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            title="UAV Thermal Drone Reconnaissance"
            style={{
              background: 'linear-gradient(135deg, rgba(226, 75, 74, 0.15) 0%, rgba(185, 28, 28, 0.25) 100%)',
              border: '1px solid #E24B4A', borderRadius: 7, padding: '4px 8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              color: '#fca5a5', fontSize: 10.5, fontWeight: 700, minHeight: 28,
            }}
          >
            <span>🛰️</span>
            <span className="header-btn-label">Drone Recon</span>
          </motion.button>

          <motion.button
            onClick={toggleAudio}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
            title={isAudioMuted ? "Unmute Tactical Sound FX" : "Mute Tactical Sound FX"}
            style={{
              background: isAudioMuted ? 'rgba(255,255,255,0.04)' : 'rgba(0,229,255,0.1)',
              border: `1px solid ${isAudioMuted ? 'rgba(255,255,255,0.1)' : 'rgba(0,229,255,0.3)'}`,
              borderRadius: 7, width: 28, height: 28, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isAudioMuted ? '#64748b' : '#00E5FF', fontSize: 12, flexShrink: 0,
            }}
          >
            {isAudioMuted ? '🔇' : '🔊'}
          </motion.button>

          <motion.button
            onClick={fetchAll} disabled={refreshing}
            whileHover={refreshing ? {} : { scale: 1.1 }} whileTap={refreshing ? {} : { scale: 0.92 }}
            title="Refresh data"
            style={{
              background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: 7, width: 28, height: 28, cursor: refreshing ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00E5FF', fontSize: 13, flexShrink: 0,
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
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00E5FF', fontSize: 13, flexShrink: 0,
            }}
          >
            ⊕
          </motion.button>

          <LanguageSwitcher style={{ flexShrink: 0 }} />

          {isMobile && (
            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              whileTap={{ scale: 0.94 }}
              style={{
                background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.35)',
                borderRadius: 8, color: '#00E5FF', padding: '4px 10px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
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

        {/* Satellite base layer — Esri World Imagery */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri &mdash; Source: Esri, USGS, NOAA'
          maxZoom={19}
        />
        {/* Optional hillshade labels overlay for readability */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution=''
          maxZoom={19}
          opacity={0.6}
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
              <Tooltip sticky direction="top" offset={[0, -4]} className="Sahayak-tooltip">
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
            <Tooltip permanent sticky direction="center" className="Sahayak-tooltip">
              <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399' }}>
                Suggested Route ({selectedRoute.distanceKm} km)
              </div>
            </Tooltip>
          </Polyline>
        )}

        {/* RESCUE ASSET BASES */}
        {(mapData?.rescue_stations ?? []).map(station => (
          <Marker
            key={station.station_id}
            position={[station.lat, station.lng]}
            icon={makeStationIcon(station.agency)}
          >
            <Tooltip direction="top" offset={[0, -16]} className="Sahayak-tooltip">
              <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 11 }}>
                <strong style={{ color: station.agency === 'IAF' ? '#a78bfa' : '#38bdf8' }}>{station.agency}</strong> · {station.name}
                <br /><span style={{ color: '#94a3b8' }}>Freq: {station.contact_freq}</span>
              </div>
            </Tooltip>
            <Popup offset={[0, -16]} className="Sahayak-popup" closeButton={false}>
              <div style={{
                background: '#0f172a', color: '#e2e8f0', borderRadius: 10, padding: '12px 14px',
                minWidth: 230, fontSize: 12, border: '1px solid rgba(0, 229, 255, 0.4)',
                fontFamily: "'Inter','Segoe UI',sans-serif"
              }}>
                <div style={{ color: 'var(--cyan)', fontWeight: 700, fontSize: 10, marginBottom: 4 }}>
                  🛡️ RESCUE ASSET DEPLOYMENT BASE
                </div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{station.name}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8 }}>{station.type} · {station.contact_freq}</div>
                <div style={{ fontSize: 11, color: '#e2e8f0', marginBottom: 4 }}>
                  ⚡ Readied Assets:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10, color: '#cbd5e1' }}>
                  {Object.entries(station.assets_available || {}).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{k.replace(/_/g, ' ')}:</span>
                      <strong style={{ color: 'var(--cyan)' }}>{v}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ACTIVE DISPATCH VECTOR ROUTE */}
        {activeDispatchRoute && (
          <Polyline
            positions={activeDispatchRoute.waypoints}
            pathOptions={{ color: '#00E5FF', weight: 4, opacity: 0.95, className: 'dispatch-route-active' }}
          >
            <Tooltip permanent sticky direction="center" className="Sahayak-tooltip">
              <div style={{ fontSize: 11, fontWeight: 800, color: '#00E5FF' }}>
                🚤 {activeDispatchRoute.assetType} en route to {activeDispatchRoute.caseLandmark} (ETA {activeDispatchRoute.etaMinutes}m)
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
              <Tooltip direction="top" offset={[0, -14]} className="Sahayak-tooltip">
                <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 11 }}>
                  🌊 <strong>{t('map.cwc_gauge')}: {g.station_name}</strong>
                  <br />{t('map.level')}: {g.current_level_m}m ({t('map.danger')}: {g.danger_level_m}m)
                </div>
              </Tooltip>
              <Popup offset={[0, -14]} className="Sahayak-popup" closeButton={false}>
                <div style={{
                  background: '#0f172a', color: '#e2e8f0', borderRadius: 10, padding: '12px 14px',
                  minWidth: 210, fontSize: 12, border: `1px solid ${RISK_COLOR[risk]}44`,
                  fontFamily: "'Inter','Segoe UI',sans-serif",
                }}>
                  <div style={{ color: RISK_COLOR[risk], fontWeight: 700, fontSize: 10, marginBottom: 4 }}>
                    🌊 {t('map.cwc_station')}
                  </div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>{g.station_name}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>{g.river_name} · {g.district}</div>
                  <div style={{ fontSize: 11, color: '#e2e8f0' }}>{t('map.current_level')}: <strong>{g.current_level_m}m</strong></div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{t('map.danger_level')}: <strong>{g.danger_level_m}m</strong></div>
                  <div style={{ fontSize: 11, color: g.rate_of_rise_cm_per_hour > 0 ? '#fca5a5' : '#a3d669', marginTop: 4 }}>
                    {t('map.trend')}: {g.trend} (+{g.rate_of_rise_cm_per_hour} cm/h)
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
              <Tooltip direction="top" offset={[0, -16]} className="Sahayak-tooltip">
                <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 11 }}>
                  {hasHazard && <span style={{ color: '#EF9F27', fontWeight: 700, marginRight: 4 }}>⚠️ {t('map.hazard')}</span>}
                  <span style={{
                    display: 'inline-block', background: statusColor, color: '#fff',
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, marginRight: 5,
                  }}>
                    {t('map.camp')}: {camp.status}
                  </span>
                  {camp.name}
                </div>
              </Tooltip>

              <Popup offset={[0, -16]} className="Sahayak-popup" closeButton={false}>
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
                      {t('map.relief_camp')}
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
                    {t('map.occupancy')}: {camp.current_occupancy} / {camp.capacity} {t('map.beds')} ({camp.occupancy_pct}%)
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
              <Tooltip direction="top" offset={[0, -sz / 2 - 4]} opacity={1} className="Sahayak-tooltip">
                <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 11 }}>
                  {isOverdue && <span style={{ color: '#E24B4A', fontWeight: 700, marginRight: 4 }}>🚨 {t('map.overdue')}</span>}
                  {mergedCount > 1 && <span style={{ color: '#38bdf8', fontWeight: 700, marginRight: 4 }}>🔗 {mergedCount} {t('map.reps')}</span>}
                  <span style={{
                    display: 'inline-block',
                    background: TIER[props.tier]?.color ?? '#E24B4A', color: '#fff',
                    fontSize: 9, fontWeight: 700, padding: '1px 5px',
                    borderRadius: 3, marginRight: 5, letterSpacing: '0.05em',
                  }}>
                    {props.tier === 'Tier 1' ? t('tier.t1') : props.tier === 'Tier 2' ? t('tier.t2') : t('tier.t3')}
                  </span>
                  {props.gps_or_landmark} ({victimCount} {t('panel.victims')})
                </div>
              </Tooltip>

              <Popup offset={[0, -sz / 2 - 4]} className="Sahayak-popup" closeButton={false}>
                <CasePopupContent
                  props={{ ...props, is_overdue: isOverdue, overdue_hours: ov?.overdue_hours }}
                  onFindNearestCamp={handleFindNearestCamp}
                  onDispatchRescue={handleDispatchRescue}
                />
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* ── PERSISTENT LEFT SIDEBAR (DESKTOP) — MISSION CONTROL layout ── */}
      {!isMobile ? (
        <div
          className="sidebar-container"
          style={{
            position: 'absolute',
            top: 62, left: 0, bottom: 0,
            width: 230,
            zIndex: 15,
            background: 'rgba(8,14,26,0.97)',
            backdropFilter: 'blur(18px)',
            borderRight: '1px solid rgba(0,229,255,0.14)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
          }}
        >
          {/* Heading */}
          <div className="sidebar-heading" style={{ padding: '16px 18px 8px' }}>
            <div style={{ fontSize: 13, color: '#00E5FF', fontWeight: 700, letterSpacing: '0.08em' }}>
              {t('sidebar.title')}
            </div>
          </div>

          {/* Search bar */}
          <div className="sidebar-search" style={{
            margin: '0 12px 10px', background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(0,229,255,0.14)',
            borderRadius: 8, padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ color: '#00E5FF', fontSize: 12, opacity: 0.7 }}>🔍</span>
            <input
              type="text"
              placeholder={t('sidebar.filter')}
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

          {/* RESPONSE group */}
          <SidebarGroupLabel>{t('sidebar.grp_response')}</SidebarGroupLabel>
          {[
            { key: null,       icon: '🗺️', label: t('sidebar.tactical_map') },
            { key: 'queue',    icon: '🆘', label: t('sidebar.queue') },
            { key: 'insights', icon: '🔥', label: t('sidebar.insights') },
          ].map(btn => (
            <SidebarRow key={btn.label} active={btn.key !== null && panel === btn.key || (btn.key === null && panel === null)} onClick={() => handlePanelBtn(btn.key)}>
              <span style={{ fontSize: 16 }}>{btn.icon}</span> {btn.label}
            </SidebarRow>
          ))}

          {/* RESOURCES group */}
          <SidebarGroupLabel>{t('sidebar.grp_resources')}</SidebarGroupLabel>
          {[
            { key: 'camps',         icon: '🏕️', label: t('sidebar.camps') },
            { key: 'reunification', icon: '👨‍👩‍👧', label: t('sidebar.missing') },
          ].map(btn => (
            <SidebarRow key={btn.label} active={panel === btn.key} onClick={() => handlePanelBtn(btn.key)}>
              <span style={{ fontSize: 16 }}>{btn.icon}</span> {btn.label}
            </SidebarRow>
          ))}

          {/* INTELLIGENCE group */}
          <SidebarGroupLabel>{t('sidebar.grp_intel')}</SidebarGroupLabel>
          <SidebarRow active={panel === 'early_warning'} onClick={() => handlePanelBtn('early_warning')}>
            <span style={{ fontSize: 16 }}>🌊</span> {t('sidebar.early_warning')}
          </SidebarRow>

          {/* MODULES group */}
          <SidebarGroupLabel>{t('sidebar.grp_modules')}</SidebarGroupLabel>
          <SidebarRow onClick={onOpenAudit}>
            <span style={{ fontSize: 16 }}>📜</span> {t('sidebar.audit_log')}
          </SidebarRow>
          <SidebarRow onClick={onOpenField}>
            <span style={{ fontSize: 16 }}>👷</span> {t('sidebar.field_portal')}
          </SidebarRow>

          <div style={{ flex: 1 }} />
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
              { key: 'queue',         icon: '🆘', label: t('sidebar.queue') },
              { key: 'insights',      icon: '🔥', label: t('mobile.worst_hit') },
              { key: 'camps',         icon: '🏕', label: t('sidebar.camps') },
              { key: 'reunification', icon: '🔍', label: t('mobile.missing') },
              { key: 'early_warning', icon: '⚡', label: t('mobile.warning') },
              { key: null,            icon: '🗺', label: t('mobile.map_only') },
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

            <button onClick={() => { onOpenAudit(); setMobileMenuOpen(false) }} style={btnStyle(false, true)}>
              <span>📜</span> {t('mobile.audit')}
            </button>
            <button onClick={() => { onOpenField(); setMobileMenuOpen(false) }} style={btnStyle(false, true)}>
              <span>👷</span> {t('mobile.field')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LEGEND (DESKTOP ONLY) — matches satellite map reference ── */}
      {!isMobile && (
        <div style={{
          position: 'absolute', bottom: 24, left: 260, zIndex: 10,
          background: 'rgba(6, 11, 22, 0.92)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 16px',
          boxShadow: '0 6px 28px rgba(0,0,0,0.75)',
          minWidth: 190,
        }}>
          {/* Title */}
          <div style={{ color: '#ddd', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 10, textTransform: 'uppercase' }}>
            Heatmap &amp; Flood Intensity
          </div>

          {/* Gradient bar */}
          <div style={{
            height: 7, borderRadius: 4, marginBottom: 5,
            background: 'linear-gradient(90deg, #34D399 0%, #22d3ee 25%, #F59E0B 55%, #EF9F27 78%, #E24B4A 100%)',
            boxShadow: '0 0 8px rgba(226,75,74,0.35)',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 9, marginBottom: 10 }}>
            <span>Safe</span><span>Shallow</span><span>Danger</span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 10 }} />

          {/* Icon legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { icon: '🌊', color: '#93c5fd', label: t('map.cwc_gauge') },
              { icon: '🚨', color: '#FF3B30',  label: 'Overdue Alert'   },
              { icon: '🔗', color: '#00E5FF',  label: 'SOS Cluster'     },
              { icon: '⚠️', color: '#fcd34d',  label: t('map.hazard')   },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 11, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ color: item.color, fontSize: 10, fontWeight: 600 }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Status pills */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '10px 0 8px' }} />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <span className="status-pill status-critical">{t('tier.critical').toUpperCase()}</span>
            <span className="status-pill status-rescuing">{t('tier.rescuing').toUpperCase()}</span>
            <span className="status-pill status-safe">{t('tier.safe').toUpperCase()}</span>
          </div>
        </div>
      )}

      {/* FULL-PAGE CONTENT AREA beside the sidebar (desktop) or full screen (mobile) */}
      {(panel || isExitingPanel) && (
        <div
          key="fullpage-panel-section"
          className={isExitingPanel ? 'view-section-exit' : 'view-section-enter'}
          style={fullPageStyle(isMobile)}
        >
          {/* Header Close button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button
              onClick={() => closePanel()}
              title="Return to Flood Map (Esc)"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8',
                height: 32, padding: '0 12px', borderRadius: 16, cursor: 'pointer', fontSize: 12,
                display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8' }}
            >
              <span style={{ fontSize: 13 }}>✕</span>
              <span>{t('btn.back') || 'Return to Map'}</span>
            </button>
          </div>

          <FullPageShell
            key={panel || 'active-subview'}
            className={isSubSwap ? 'view-card-sub-swap' : 'view-card-stagger-in'}
          >
            {panel === 'queue' && (
              <QueuePanel
                queue={queue}
                filter={filter}
                onFindNearestCamp={handleFindNearestCamp}
                onDispatchRescue={handleDispatchRescue}
                overdueCases={auditSummary?.overdue_cases}
                onConnectTele={(caseObj) => setActiveTeleCase(caseObj)}
                activeTeleCaseId={activeTeleCase?.case_id}
              />
            )}
            {panel === 'insights' && (
              <InsightsPanel
                cases={caseFeatures}
                onLocateCase={(loc) => { setMapCenter(loc); closePanel() }}
              />
            )}
            {panel === 'camps' && (
              <CampsPanel
                camps={campsData}
                queue={queue}
                onFindRouteForCase={handleFindNearestCamp}
                selectedRoute={selectedRoute}
                onClearRoute={() => setSelectedRoute(null)}
                onHighlightCamp={(camp) => { handleHighlightCamp(camp); closePanel() }}
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
                onHighlightStation={(loc) => { setMapCenter(loc); closePanel() }}
              />
            )}
          </FullPageShell>
        </div>
      )}

      {/* UAV Drone Reconnaissance Modal */}
      <DroneReconModal
        isOpen={isDroneOpen}
        onClose={() => setIsDroneOpen(false)}
        onInjectCase={() => fetchAll()}
      />

      {/* Multilingual Voice SOS & Surge Simulator Modal */}
      <LiveIncidentSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onCaseProcessed={() => fetchAll()}
      />

      {/* Tele-Health & Maternity Bridge Modal */}
      <AnimatePresence>
        {activeTeleCase && (
          <div
            key="tele-health-modal-overlay"
            className="view-section-enter"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(5, 10, 20, 0.78)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveTeleCase(null)
            }}
          >
            <div className="view-card-stagger-in" style={{ width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto' }}>
              <TeleHealthBridge
                caseData={(() => {
                  if (queue?.tiers) {
                    for (const cases of Object.values(queue.tiers)) {
                      const found = cases.find(c => c.case_id === activeTeleCase.case_id)
                      if (found) return found
                    }
                  }
                  return activeTeleCase
                })()}
                onStatusChange={handleTeleStatusChange}
                onClose={() => setActiveTeleCase(null)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Sidebar helper components ──────────────────────────────────────────────
function SidebarGroupLabel({ children }) {
  return (
    <div
      className="sidebar-group-label"
      style={{
        padding: '10px 18px 4px',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
        color: 'rgba(0,229,255,0.4)', textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  )
}

function SidebarRow({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`sidebar-row ${active ? 'active' : ''}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '8px 18px', border: 'none',
        background: active ? 'rgba(0,229,255,0.1)' : 'transparent',
        borderLeft: active ? '3px solid #00E5FF' : '3px solid transparent',
        color: active ? '#00E5FF' : '#999',
        fontSize: 13, fontWeight: active ? 500 : 400,
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#ddd' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#999' } }}
    >
      {children}
    </button>
  )
}

// Full-page content area: sits beside the sidebar on desktop
function FullPageShell({ children, className = '' }) {
  return (
    <div className={className} style={{ padding: '16px 24px 48px', maxWidth: 980, margin: '0 auto' }}>
      {children}
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

function fullPageStyle(isMobile) {
  return {
    position: 'absolute',
    top: isMobile ? 54 : 62,
    left: isMobile ? 0 : 230,
    right: 0,
    bottom: 0,
    zIndex: 25,
    background: 'var(--bg-primary)',
    overflowY: 'auto',
    padding: isMobile ? '16px' : '24px 20px 48px',
  }
}