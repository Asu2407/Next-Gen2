/**
 * Module 11 — Offline-First Field Worker Sync View
 * Enables field rescue teams & shelter workers to capture:
 *  1. Rescue Completions
 *  2. Camp Check-ins
 *  3. Damage Observations
 * Saves to IndexedDB locally first with synced: false, then syncs automatically on network restore.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  saveFieldRecord,
  getAllFieldRecords,
  getUnsyncedFieldRecords,
  markRecordSynced,
} from './utils/fieldDb'
import { useLang } from './i18n/LangContext'
import LanguageSwitcher from './components/LanguageSwitcher'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''  // set VITE_API_BASE_URL when deployed; empty string uses the Vite dev proxy → localhost:8000

export default function FieldWorkerPage({ onBack }) {
  const { t } = useLang()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [activeFormTab, setActiveFormTab] = useState('rescue')
  const [records, setRecords] = useState([])
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncToast, setSyncToast] = useState('')

  // Form states
  // Rescue completion
  const [rescueCaseId, setRescueCaseId] = useState('')
  const [rescuedCount, setRescuedCount] = useState(1)
  const [rescueNotes, setRescueNotes] = useState('')

  // Camp check-in
  const [checkinName, setCheckinName] = useState('')
  const [checkinCampId, setCheckinCampId] = useState('camp-001')

  // Damage observation
  const [damageLocation, setDamageLocation] = useState('')
  const [damageDesc, setDamageDesc] = useState('')
  const [damagePhotoUrl, setDamagePhotoUrl] = useState('')

  // Load records from IndexedDB
  const refreshRecords = useCallback(async () => {
    try {
      const all = await getAllFieldRecords()
      // Sort newest first
      all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      setRecords(all)
      const unsynced = all.filter(r => r.synced === false)
      setUnsyncedCount(unsynced.length)
    } catch (e) {
      console.error('Error reading IndexedDB records:', e)
    }
  }, [])

  // Sync unsynced records to backend
  const syncPendingRecords = useCallback(async () => {
    if (!navigator.onLine) return
    setSyncing(true)
    try {
      const pending = await getUnsyncedFieldRecords()
      if (pending.length === 0) return

      let successCount = 0
      for (const rec of pending) {
        try {
          const res = await fetch(`${API_BASE}/api/field-sync/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: rec.client_id,
              record_type: rec.record_type,
              payload: rec.payload,
              timestamp: rec.timestamp,
            }),
          })
          if (res.ok) {
            await markRecordSynced(rec.client_id)
            successCount++
          }
        } catch (err) {
          console.warn(`Failed to sync record ${rec.client_id}:`, err)
        }
      }

      if (successCount > 0) {
        setSyncToast(`Synced ${successCount} record(s) to server!`)
        setTimeout(() => setSyncToast(''), 5000)
      }
      await refreshRecords()
    } finally {
      setSyncing(false)
    }
  }, [refreshRecords])

  // Network online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncPendingRecords()
    }
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    refreshRecords()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refreshRecords, syncPendingRecords])

  // Submit generic form handler
  const handleRecordSubmit = async (recordType, payloadData) => {
    const clientId = `cli-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const nowIso = new Date().toISOString()

    const newRecord = {
      client_id: clientId,
      record_type: recordType,
      payload: payloadData,
      timestamp: nowIso,
      synced: false,
    }

    // 1. Save to IndexedDB immediately (local-first persistence)
    await saveFieldRecord(newRecord)

    // 2. Attempt immediate background sync if online
    if (navigator.onLine) {
      try {
        const res = await fetch(`${API_BASE}/api/field-sync/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            record_type: recordType,
            payload: payloadData,
            timestamp: nowIso,
          }),
        })
        if (res.ok) {
          await markRecordSynced(clientId)
        }
      } catch (err) {
        console.warn('Network submit failed, queued for later sync:', err)
      }
    }

    await refreshRecords()
  }

  const handleRescueSubmit = async (e) => {
    e.preventDefault()
    if (!rescueCaseId.trim()) return
    await handleRecordSubmit('rescue_completion', {
      case_id: rescueCaseId,
      rescued_count: Number(rescuedCount),
      notes: rescueNotes,
    })
    setRescueCaseId('')
    setRescuedCount(1)
    setRescueNotes('')
  }

  const handleCheckinSubmit = async (e) => {
    e.preventDefault()
    if (!checkinName.trim()) return
    await handleRecordSubmit('camp_checkin', {
      person_name: checkinName,
      camp_id: checkinCampId,
    })
    setCheckinName('')
  }

  const handleDamageSubmit = async (e) => {
    e.preventDefault()
    if (!damageLocation.trim() || !damageDesc.trim()) return
    await handleRecordSubmit('damage_observation', {
      location: damageLocation,
      description: damageDesc,
      photo_url: damagePhotoUrl || null,
    })
    setDamageLocation('')
    setDamageDesc('')
    setDamagePhotoUrl('')
  }

  return (
    <div style={{
      width: '100vw', minHeight: '100vh', background: '#0b1220', color: '#e2e8f0',
      fontFamily: "'Inter','Segoe UI',sans-serif", padding: 20, boxSizing: 'border-box',
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, color: '#e2e8f0', padding: '6px 14px', cursor: 'pointer', fontSize: 13,
            }}
          >
            {t('btn.back')}
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: '#f1f5f9' }}>👷 {t('field.title')}</h2>
            <div style={{ fontSize: 11, color: '#64748b' }}>Local-First IndexedDB Capture Engine</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Network Status Badge */}
          <div style={{
            background: isOnline ? 'rgba(99,153,34,0.18)' : 'rgba(239,159,39,0.18)',
            border: `1px solid ${isOnline ? '#639922' : '#EF9F27'}`,
            color: isOnline ? '#a3d669' : '#fcd34d',
            padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{
                display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                background: isOnline ? '#639922' : '#EF9F27',
              }}
            />
            {isOnline ? t('field.online') : `${t('field.offline')} — ${unsyncedCount} ${t('field.unsynced')}`}
          </div>

          <button
            onClick={syncPendingRecords} disabled={syncing || !isOnline || unsyncedCount === 0}
            style={{
              background: isOnline && unsyncedCount > 0 ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.04)',
              border: isOnline && unsyncedCount > 0 ? '1px solid #ff8a70' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, color: isOnline && unsyncedCount > 0 ? '#ff8a70' : '#64748b',
              padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: isOnline && unsyncedCount > 0 ? 'pointer' : 'default',
            }}
          >
            {syncing ? t('field.syncing') : `${t('field.sync')} (${unsyncedCount}) ↻`}
          </button>
          <LanguageSwitcher />
        </div>
      </div>

      {syncToast && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(99,153,34,0.2)', border: '1px solid #639922',
            color: '#a3d669', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 12, fontWeight: 600,
          }}
        >
          {syncToast}
        </motion.div>
      )}

      <div className="view-card-stagger-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Form Column */}
        <div>
          <div style={{
            background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 18,
          }}>
            {/* Form Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
              {[
                { id: 'rescue', icon: '🚁', label: 'Rescue Completion' },
                { id: 'checkin', icon: '🏕️', label: 'Camp Check-in' },
                { id: 'damage', icon: '📷', label: 'Damage Observation' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFormTab(tab.id)}
                  style={{
                    background: activeFormTab === tab.id ? 'rgba(226,75,74,0.2)' : 'rgba(255,255,255,0.04)',
                    border: activeFormTab === tab.id ? '1px solid #E24B4A' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6, padding: '6px 10px', color: activeFormTab === tab.id ? '#fca5a5' : '#94a3b8',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: RESCUE COMPLETION */}
            {activeFormTab === 'rescue' && (
              <form onSubmit={handleRescueSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Log completed rescue operation</div>

                <input
                  type="text" placeholder="SOS Case ID (e.g. c1a2b3c4-0001) *" required
                  value={rescueCaseId} onChange={e => setRescueCaseId(e.target.value)}
                  style={inputStyle}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 11, color: '#94a3b8' }}>Rescued Count:</label>
                  <input
                    type="number" min="1" max="100" required
                    value={rescuedCount} onChange={e => setRescuedCount(e.target.value)}
                    style={{ ...inputStyle, width: 80 }}
                  />
                </div>
                <textarea
                  placeholder="Field Notes & Medical Condition..."
                  value={rescueNotes} onChange={e => setRescueNotes(e.target.value)}
                  style={{ ...inputStyle, height: 70, resize: 'vertical' }}
                />

                <button type="submit" style={submitBtnStyle}>
                  💾 Log Rescue Record (IndexedDB)
                </button>
              </form>
            )}

            {/* TAB 2: CAMP CHECK-IN */}
            {activeFormTab === 'checkin' && (
              <form onSubmit={handleCheckinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Check-in evacuee at relief shelter</div>

                <input
                  type="text" placeholder="Person Full Name *" required
                  value={checkinName} onChange={e => setCheckinName(e.target.value)}
                  style={inputStyle}
                />
                <select
                  value={checkinCampId} onChange={e => setCheckinCampId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="camp-001">Silchar Stadium Relief Shelter</option>
                  <option value="camp-002">Barpeta High School Relief Center</option>
                  <option value="camp-003">Tezpur District Shelter Center</option>
                  <option value="camp-004">Dibrugarh Flood Relief Hub</option>
                  <option value="camp-005">Nagaon Community Shelter</option>
                  <option value="camp-006">Guwahati West Secondary School</option>
                </select>

                <button type="submit" style={submitBtnStyle}>
                  💾 Log Camp Check-in (IndexedDB)
                </button>
              </form>
            )}

            {/* TAB 3: DAMAGE OBSERVATION */}
            {activeFormTab === 'damage' && (
              <form onSubmit={handleDamageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Log post-flood infrastructure damage</div>

                <input
                  type="text" placeholder="Location / Landmark *" required
                  value={damageLocation} onChange={e => setDamageLocation(e.target.value)}
                  style={inputStyle}
                />
                <textarea
                  placeholder="Damage Description (e.g. Dike breached 15m, bridge impassable)... *" required
                  value={damageDesc} onChange={e => setDamageDesc(e.target.value)}
                  style={{ ...inputStyle, height: 60, resize: 'vertical' }}
                />
                <input
                  type="text" placeholder="Optional Photo URL"
                  value={damagePhotoUrl} onChange={e => setDamagePhotoUrl(e.target.value)}
                  style={inputStyle}
                />

                <button type="submit" style={submitBtnStyle}>
                  💾 Log Damage Record (IndexedDB)
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Local Records History Column */}
        <div>
          <div style={{
            background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 18,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                📁 LOCAL INDEXEDDB STORED RECORDS ({records.length})
              </div>
              <span style={{ fontSize: 10, color: '#64748b' }}>
                Pending: <strong style={{ color: '#fcd34d' }}>{unsyncedCount}</strong>
              </span>
            </div>

            {records.length === 0 ? (
              <div style={{
                padding: 30, textAlign: 'center', color: '#475569', fontSize: 12,
                border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 8,
              }}>
                No local records captured yet. Use the form on the left to capture field records offline.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '65vh', overflowY: 'auto' }}>
                {records.map(rec => {
                  const isSynced = rec.synced === true
                  const typeLabel = rec.record_type === 'rescue_completion'
                    ? '🚁 RESCUE'
                    : rec.record_type === 'camp_checkin'
                    ? '🏕️ CHECK-IN'
                    : '📷 DAMAGE'

                  return (
                    <div
                      key={rec.client_id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: isSynced ? '1px solid rgba(99,153,34,0.3)' : '1px solid rgba(239,159,39,0.3)',
                        borderLeft: `3px solid ${isSynced ? '#639922' : '#EF9F27'}`,
                        borderRadius: '0 8px 8px 0', padding: '10px 12px', fontSize: 11,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#94a3b8', fontSize: 10 }}>
                          {typeLabel}
                        </span>
                        <span style={{
                          background: isSynced ? 'rgba(99,153,34,0.2)' : 'rgba(239,159,39,0.2)',
                          color: isSynced ? '#a3d669' : '#fcd34d', border: `1px solid ${isSynced ? '#639922' : '#EF9F27'}`,
                          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                        }}>
                          {isSynced ? '✓ SYNCED' : '⏳ PENDING SYNC'}
                        </span>
                      </div>

                      {/* Record Payload Display */}
                      {rec.record_type === 'rescue_completion' && (
                        <div>
                          <div style={{ color: '#f1f5f9', fontWeight: 600 }}>Case: {rec.payload.case_id}</div>
                          <div style={{ color: '#94a3b8' }}>Rescued: <strong>{rec.payload.rescued_count} victims</strong></div>
                          {rec.payload.notes && <div style={{ color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>"{rec.payload.notes}"</div>}
                        </div>
                      )}

                      {rec.record_type === 'camp_checkin' && (
                        <div>
                          <div style={{ color: '#f1f5f9', fontWeight: 600 }}>Person: {rec.payload.person_name}</div>
                          <div style={{ color: '#94a3b8' }}>Camp ID: {rec.payload.camp_id}</div>
                        </div>
                      )}

                      {rec.record_type === 'damage_observation' && (
                        <div>
                          <div style={{ color: '#f1f5f9', fontWeight: 600 }}>Location: {rec.payload.location}</div>
                          <div style={{ color: '#94a3b8' }}>"{rec.payload.description}"</div>
                        </div>
                      )}

                      <div style={{ fontSize: 9, color: '#475569', marginTop: 4 }}>
                        Client ID: {rec.client_id} · {rec.timestamp?.substring(11, 19)} UTC
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6, color: '#e2e8f0', fontSize: 12, padding: '8px 10px',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const submitBtnStyle = {
  width: '100%', padding: '9px 0', background: 'rgba(99,153,34,0.22)',
  border: '1px solid #639922', borderRadius: 6, color: '#a3d669',
  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
}
