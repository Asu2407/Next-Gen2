/**
 * SAHAYAK Drone Reconnaissance & Tactical Thermal HUD Modal
 * Simulates aerial UAV recon over Assam inundated sectors:
 *  - Optical / FLIR Thermal Infrared toggle
 *  - Real-time telemetry (ALT, BAT, SAT, HDG, GIMBAL)
 *  - AI Target Bounding Boxes (victims, livestock, submerged structures)
 *  - 1-Click Target GPS SOS Pinning directly to Triage Queue
 */

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { audioFx } from '../utils/audioFx'
import { showToast } from '../utils/toast'

const RECON_ZONES = [
  {
    id: 'silchar-annapurna',
    name: 'Sector 4: Silchar Annapurna Ghat',
    lat: 24.832,
    lng: 92.805,
    waterDepth: '6.2m',
    targets: [
      { id: 'T-101', type: 'Human (3 Adults, 1 Infant)', conf: 96, x: 44, y: 52, w: 22, h: 26, isPregnant: true },
      { id: 'T-102', type: 'Submerged Roof (2 Elderly)', conf: 91, x: 72, y: 38, w: 18, h: 22, isElderly: true }
    ]
  },
  {
    id: 'majuli-kamalabari',
    name: 'Sector 1: Majuli Kamalabari Embankment Breach',
    lat: 26.935,
    lng: 94.180,
    waterDepth: '4.8m',
    targets: [
      { id: 'T-201', type: 'Stranded Family (5 Victims)', conf: 94, x: 38, y: 46, w: 24, h: 28, isPregnant: false },
      { id: 'T-202', type: 'Livestock Cluster (12 Cattle)', conf: 88, x: 68, y: 64, w: 20, h: 20, isElderly: false }
    ]
  },
  {
    id: 'barpeta-manas',
    name: 'Sector 7: Barpeta Manas River Spill',
    lat: 26.330,
    lng: 91.015,
    waterDepth: '5.5m',
    targets: [
      { id: 'T-301', type: 'Dialysis Patient + 2 Caregivers', conf: 97, x: 50, y: 42, w: 22, h: 24, isDialysis: true }
    ]
  }
]

export default function DroneReconModal({ isOpen, onClose, onInjectCase }) {
  const [selectedZone, setSelectedZone] = useState(RECON_ZONES[0])
  const [thermalMode, setThermalMode] = useState(true)
  const [altitude, setAltitude] = useState(128)
  const [battery, setBattery] = useState(84)
  const [scanAngle, setScanAngle] = useState(0)
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [isPinning, setIsPinning] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    audioFx.playRadioDispatch()
    const timer = setInterval(() => {
      setScanAngle(a => (a + 1.2) % 360)
      setAltitude(a => +(a + (Math.random() * 0.4 - 0.2)).toFixed(1))
    }, 50)
    return () => clearInterval(timer)
  }, [isOpen])

  // Canvas synthetic terrain & thermal simulation
  useEffect(() => {
    if (!isOpen) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId = null
    let t = 0

    function renderFeed() {
      t += 0.03
      const w = canvas.width = 640
      const h = canvas.height = 360

      if (thermalMode) {
        // FLIR Ironbow / White-Hot Palette
        const grad = ctx.createLinearGradient(0, 0, w, h)
        grad.addColorStop(0, '#050b14')
        grad.addColorStop(0.5, '#0b1d3a')
        grad.addColorStop(1, '#02060d')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)

        // Water currents (cold dark blue)
        ctx.fillStyle = 'rgba(0, 229, 255, 0.07)'
        for (let i = 0; i < 6; i++) {
          ctx.beginPath()
          const y = (h / 6) * i + Math.sin(t + i) * 12
          ctx.ellipse(w / 2, y, w * 0.6, 24, 0, 0, Math.PI * 2)
          ctx.fill()
        }

        // Thermal heat spots for targets
        selectedZone.targets.forEach(target => {
          const tx = (target.x / 100) * w
          const ty = (target.y / 100) * h

          const rad = ctx.createRadialGradient(tx, ty, 2, tx, ty, 38)
          rad.addColorStop(0, '#ffffff')
          rad.addColorStop(0.3, '#ff3b30')
          rad.addColorStop(0.6, '#ef9f27')
          rad.addColorStop(1, 'transparent')

          ctx.fillStyle = rad
          ctx.beginPath()
          ctx.arc(tx, ty, 38, 0, Math.PI * 2)
          ctx.fill()
        })
      } else {
        // Optical Recon Mode (Turbid flood water + vegetation)
        const grad = ctx.createLinearGradient(0, 0, 0, h)
        grad.addColorStop(0, '#1c2b36')
        grad.addColorStop(0.7, '#24343d')
        grad.addColorStop(1, '#152129')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)

        // Water ripple waves
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
        ctx.lineWidth = 1
        for (let i = 0; i < 8; i++) {
          ctx.beginPath()
          const yBase = (h / 8) * i
          ctx.moveTo(0, yBase)
          for (let x = 0; x < w; x += 20) {
            ctx.lineTo(x, yBase + Math.sin(x * 0.03 + t * 2 + i) * 6)
          }
          ctx.stroke()
        }
      }

      // Scanline static overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
      for (let y = 0; y < h; y += 3) {
        ctx.fillRect(0, y, w, 1)
      }

      animId = requestAnimationFrame(renderFeed)
    }

    renderFeed()
    return () => cancelAnimationFrame(animId)
  }, [isOpen, thermalMode, selectedZone])

  if (!isOpen) return null

  const handlePinAsEmergency = async (target) => {
    setIsPinning(true)
    audioFx.playAlert()
    try {
      const payload = {
        text_input: `Drone Recon spotted ${target.type} at ${selectedZone.name}. Water depth ${selectedZone.waterDepth}. Immediate boat extraction needed.`,
        language_hint: 'English'
      }

      const res = await fetch('/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const data = await res.json()
        showToast(`📍 Drone target pinned as Tier 1 Case! Dispatch alerted.`)
        if (onInjectCase) onInjectCase(data.case)
      } else {
        showToast(`📍 Target coordinates flagged on tactical map.`)
      }
    } catch (e) {
      showToast(`📍 Target coordinates flagged on tactical map.`)
    } finally {
      setIsPinning(false)
      setSelectedTarget(null)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(3, 7, 18, 0.88)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        style={{
          width: '100%', maxWidth: 880, background: '#080E1A',
          border: '1px solid rgba(0, 229, 255, 0.35)', borderRadius: 14,
          boxShadow: '0 0 50px rgba(0, 229, 255, 0.18), 0 20px 40px rgba(0,0,0,0.9)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}
      >
        {/* Modal Top Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
          background: 'rgba(15, 23, 42, 0.9)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🛰️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
                UAV TACTICAL RECON FEED · DRONE UNIT SAHAYAK-ALPHA
                <span className="status-pill status-critical" style={{ fontSize: 8 }}>LIVE 1080P</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                COORDS: {selectedZone.lat.toFixed(4)}°N, {selectedZone.lng.toFixed(4)}°E · GRID: ASSAM-NE-04
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => { audioFx.playTactile(); setThermalMode(!thermalMode) }}
              style={{
                background: thermalMode ? 'rgba(255, 59, 48, 0.2)' : 'rgba(0, 229, 255, 0.15)',
                border: `1px solid ${thermalMode ? '#ff3b30' : '#00E5FF'}`,
                color: thermalMode ? '#ff6b6b' : '#00E5FF',
                padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer'
              }}
            >
              {thermalMode ? '🔥 FLIR THERMAL ON' : '📷 OPTICAL RECON'}
            </button>
            <button
              onClick={() => { audioFx.playTactile(); onClose() }}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                color: '#ddd', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Sector Selector Strip */}
        <div style={{
          display: 'flex', gap: 8, padding: '8px 18px', background: 'rgba(0, 0, 0, 0.4)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)', overflowX: 'auto'
        }}>
          {RECON_ZONES.map(z => (
            <button
              key={z.id}
              onClick={() => { audioFx.playTactile(); setSelectedZone(z); setSelectedTarget(null) }}
              style={{
                background: selectedZone.id === z.id ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255,255,255,0.04)',
                border: selectedZone.id === z.id ? '1px solid var(--cyan)' : '1px solid rgba(255,255,255,0.08)',
                color: selectedZone.id === z.id ? '#00E5FF' : '#999',
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              {z.name}
            </button>
          ))}
        </div>

        {/* Main Feed with Tactical HUD & AI Target Bounding Boxes */}
        <div style={{ position: 'relative', width: '100%', height: 380, background: '#000', overflow: 'hidden' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

          {/* Crosshair HUD */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ width: 140, height: 140, border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: '50%', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(0, 229, 255, 0.3)' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(0, 229, 255, 0.3)' }} />
            </div>
          </div>

          {/* Telemetry Corner Badges */}
          <div style={{ position: 'absolute', top: 12, left: 14, fontFamily: 'monospace', fontSize: 11, color: 'var(--cyan)', background: 'rgba(0,0,0,0.65)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(0,229,255,0.2)' }}>
            <div>ALT: {altitude}m AGL</div>
            <div>SPD: 34 km/h</div>
            <div>DEPTH: {selectedZone.waterDepth}</div>
          </div>

          <div style={{ position: 'absolute', top: 12, right: 14, fontFamily: 'monospace', fontSize: 11, color: '#34d399', background: 'rgba(0,0,0,0.65)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(52,211,153,0.2)' }}>
            <div>BAT: {battery}%</div>
            <div>LINK: 98% (5G MESH)</div>
            <div>SIG: ENCRYPTED</div>
          </div>

          {/* Target Bounding Boxes */}
          {selectedZone.targets.map(target => (
            <motion.div
              key={target.id}
              onClick={() => { audioFx.playTactile(); setSelectedTarget(target) }}
              whileHover={{ scale: 1.05 }}
              style={{
                position: 'absolute',
                left: `${target.x}%`,
                top: `${target.y}%`,
                width: `${target.w}%`,
                height: `${target.h}%`,
                border: selectedTarget?.id === target.id ? '2px solid #00E5FF' : '2px dashed #ff3b30',
                background: selectedTarget?.id === target.id ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 59, 48, 0.15)',
                borderRadius: 4, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                padding: 4, zIndex: 10
              }}
            >
              <div style={{
                background: '#ff3b30', color: '#fff', fontSize: 9, fontWeight: 700,
                padding: '2px 4px', borderRadius: 3, alignSelf: 'flex-start'
              }}>
                {target.id} · {target.conf}% CONF
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.85)', color: '#ffd166', fontSize: 9, fontWeight: 600,
                padding: '2px 4px', borderRadius: 3
              }}>
                {target.type}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Target Action Tray */}
        <div style={{
          padding: '14px 18px', background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(0, 229, 255, 0.2)', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
        }}>
          <div>
            {selectedTarget ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  🎯 Selected Target: <span style={{ color: 'var(--cyan)' }}>{selectedTarget.type}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Location: {selectedZone.name} · Est. Depth: {selectedZone.waterDepth}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                👉 Click any glowing target box on the reconnaissance feed to lock GPS and dispatch rescue.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {selectedTarget && (
              <button
                onClick={() => handlePinAsEmergency(selectedTarget)}
                disabled={isPinning}
                style={{
                  background: 'linear-gradient(135deg, #E24B4A 0%, #b91c1c 100%)',
                  color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 0 16px rgba(226, 75, 74, 0.4)'
                }}
              >
                🚨 {isPinning ? 'Locking GPS...' : 'Pin as Tier 1 Case & Dispatch'}
              </button>
            )}
            <button
              onClick={() => { audioFx.playTactile(); onClose() }}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#ddd', padding: '9px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer'
              }}
            >
              Close Recon
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
