/**
 * SAHAYAK — Root App Shell
 * Routes between:
 *   - MapView         (Module 3, 5, 7, 8, 10 — Command Dashboard & Map)
 *   - TelePage        (Module 4 — Tele-Maternity Emergency Bridge)
 *   - AuditPage       (Module 6 — System Audit & Government Accountability)
 *   - FieldWorkerPage (Module 11 — Offline-First Field Worker Sync)
 */

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LangProvider } from './i18n/LangContext'
import MapView from './MapView'
import TelePage from './TelePage'
import AuditPage from './AuditPage'
import FieldWorkerPage from './FieldWorkerPage'

// ─────────────────────────────────────────────────────────────────────────────
// DashboardBackground — "Hydrographic Contour Drift"
// Pure atmosphere layer. z-index 0, pointer-events none.
// Renders: topographic contour lines + faint hex grid + diagonal scan sweep.
// Uses only --cyan (#00E5FF) from the existing token palette at very low alpha.
// Implements prefers-reduced-motion: shows one static frame, no rAF loop.
// ─────────────────────────────────────────────────────────────────────────────
function DashboardBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Check reduced motion preference once on mount
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Cyan from design token: #00E5FF
    const CR = 0, CG = 229, CB = 255

    let rafId = null
    let startTime = null

    // ── Resize handler ───────────────────────────────────────────────────────
    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // ── Hex grid (static — drawn once per frame, no per-frame math) ─────────
    function drawHexGrid() {
      const w = canvas.width
      const h = canvas.height
      const R = 50  // hex circumradius

      ctx.save()
      ctx.strokeStyle = `rgba(${CR},${CG},${CB},0.028)`
      ctx.lineWidth = 0.55

      const HW = R * Math.sqrt(3)      // hex flat-to-flat width
      const HH = R * 2                 // hex height
      const VERT_STEP = HH * 0.75      // row vertical pitch

      for (let row = -1; row * VERT_STEP < h + HH; row++) {
        const xOffset = row % 2 === 0 ? 0 : HW / 2
        for (let col = -1; col * HW < w + HW; col++) {
          const cx = col * HW + xOffset
          const cy = row * VERT_STEP
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6
            const px = cx + R * Math.cos(angle)
            const py = cy + R * Math.sin(angle)
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.stroke()
        }
      }
      ctx.restore()
    }

    // ── Contour lines (animated — sinusoidal iso-lines drifting upward) ──────
    // Purpose: state indication — evokes slowly rising flood water level
    function drawContours(t) {
      const w = canvas.width
      const h = canvas.height
      const SPACING = 38          // px between contour lines
      const DRIFT_PX_PER_MS = 0.016
      const driftOffset = (t * DRIFT_PX_PER_MS) % SPACING

      ctx.save()
      ctx.lineWidth = 0.65
      ctx.strokeStyle = `rgba(${CR},${CG},${CB},0.058)`

      for (let y = -SPACING + driftOffset; y < h + SPACING; y += SPACING) {
        ctx.beginPath()
        const phaseShift = (y / h) * Math.PI * 1.8
        const amp1 = 13
        const amp2 = 5.5
        const freq1 = 0.0022
        const freq2 = freq1 * 2.4

        for (let x = 0; x <= w; x += 4) {
          const wy =
            y +
            Math.sin(x * freq1 + t * 0.00038 + phaseShift) * amp1 +
            Math.sin(x * freq2 + t * 0.00021 + phaseShift * 0.65) * amp2
          if (x === 0) ctx.moveTo(x, wy)
          else ctx.lineTo(x, wy)
        }
        ctx.stroke()
      }
      ctx.restore()
    }

    // ── Diagonal scan sweep (animated — satellite pass effect) ────────────────
    // Purpose: communicates live monitoring / real-time sensing
    function drawScanSweep(t) {
      const w = canvas.width
      const h = canvas.height
      const PERIOD_MS = 20000          // one full horizontal sweep every 20s
      const progress = (t % PERIOD_MS) / PERIOD_MS  // 0 → 1

      // Sweep center travels from -w to 2w (so it's fully off-screen at start/end)
      const sweepCx = (progress * 3 - 1) * w
      const sweepW = 280

      const grad = ctx.createLinearGradient(sweepCx - sweepW, 0, sweepCx + sweepW, 0)
      grad.addColorStop(0,   `rgba(${CR},${CG},${CB},0)`)
      grad.addColorStop(0.35,`rgba(${CR},${CG},${CB},0.028)`)
      grad.addColorStop(0.5, `rgba(${CR},${CG},${CB},0.048)`)
      grad.addColorStop(0.65,`rgba(${CR},${CG},${CB},0.028)`)
      grad.addColorStop(1,   `rgba(${CR},${CG},${CB},0)`)

      ctx.save()
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }

    // ── Main draw loop ────────────────────────────────────────────────────────
    function draw(timestamp) {
      if (!startTime) startTime = timestamp
      const t = timestamp - startTime

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawHexGrid()
      drawContours(t)
      drawScanSweep(t)

      rafId = requestAnimationFrame(draw)
    }

    if (REDUCED) {
      // Static single frame — still shows the hex grid and one contour snapshot
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawHexGrid()
      drawContours(0)
      // No scan sweep on static frame (it would show a stripe frozen mid-screen)
    } else {
      rafId = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="bg-canvas"
      aria-hidden="true"
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// App Shell
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('map')

  return (
    <LangProvider>
    <div style={{ width: '100vw', height: '100vh', background: '#080E1A', position: 'relative', overflow: 'hidden' }}>
      {/* Background atmosphere layer — z-index 0, pointer-events none */}
      <DashboardBackground />

      {/* Content layer — z-index 1, sits above canvas in all browsers */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ width: '100%', height: '100%' }}
            >
              <MapView
                onOpenTele={() => setActiveTab('tele')}
                onOpenAudit={() => setActiveTab('audit')}
                onOpenField={() => setActiveTab('field')}
              />
            </motion.div>
          )}

          {activeTab === 'tele' && (
            <motion.div
              key="tele"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ width: '100%', height: '100%', overflowY: 'auto' }}
            >
              <TelePage onBack={() => setActiveTab('map')} />
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div
              key="audit"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ width: '100%', height: '100%', overflowY: 'auto' }}
            >
              <AuditPage onBack={() => setActiveTab('map')} />
            </motion.div>
          )}

          {activeTab === 'field' && (
            <motion.div
              key="field"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ width: '100%', height: '100%', overflowY: 'auto' }}
            >
              <FieldWorkerPage onBack={() => setActiveTab('map')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </LangProvider>
  )
}