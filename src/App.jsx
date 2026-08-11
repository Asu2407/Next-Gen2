/**
 * SAHAYAK — Root App Shell
 * Routes between:
 *   - MapView         (Module 3, 5, 7, 8, 10 — Command Dashboard & Map)
 *   - TelePage        (Module 4 — Tele-Maternity Emergency Bridge)
 *   - AuditPage       (Module 6 — System Audit & Government Accountability)
 *   - FieldWorkerPage (Module 11 — Offline-First Field Worker Sync)
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MapView from './MapView'
import TelePage from './TelePage'
import AuditPage from './AuditPage'
import FieldWorkerPage from './FieldWorkerPage'

export default function App() {
  const [activeTab, setActiveTab] = useState('map')

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#080E1A', position: 'relative', overflow: 'hidden' }}>
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
  )
}