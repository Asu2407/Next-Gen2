/**
 * ResqNet AI — Root App Shell
 * Routes between:
 *   - MapView         (Module 3, 5, 7, 8, 10 — Command Dashboard & Map)
 *   - TelePage        (Module 4 — Tele-Maternity Emergency Bridge)
 *   - AuditPage       (Module 6 — System Audit & Government Accountability)
 *   - FieldWorkerPage (Module 11 — Offline-First Field Worker Sync)
 */

import React, { useState, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MapView from './MapView'
import ToastHost from './ToastHost'

// MapView loads eagerly (it's the default view). The other three tabs are
// lazy-loaded so the initial bundle only pays for what's shown on first paint.
const TelePage = lazy(() => import('./TelePage'))
const AuditPage = lazy(() => import('./AuditPage'))
const FieldWorkerPage = lazy(() => import('./FieldWorkerPage'))

const TabFallback = () => (
  <div style={{
    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#080E1A', color: '#64748b', fontSize: 12, fontFamily: "'Inter',sans-serif",
  }}>
    Loading module…
  </div>
)

export default function App() {
  const [activeTab, setActiveTab] = useState('map')

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#080E1A', position: 'relative', overflow: 'hidden' }}>
      <ToastHost />
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
            <Suspense fallback={<TabFallback />}>
              <TelePage onBack={() => setActiveTab('map')} />
            </Suspense>
          </motion.div>
        )}

        {activeTab === 'audit' && (
          <motion.div
            key="audit"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ width: '100%', height: '100%', overflowY: 'auto' }}
          >
            <Suspense fallback={<TabFallback />}>
              <AuditPage onBack={() => setActiveTab('map')} />
            </Suspense>
          </motion.div>
        )}

        {activeTab === 'field' && (
          <motion.div
            key="field"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ width: '100%', height: '100%', overflowY: 'auto' }}
          >
            <Suspense fallback={<TabFallback />}>
              <FieldWorkerPage onBack={() => setActiveTab('map')} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}