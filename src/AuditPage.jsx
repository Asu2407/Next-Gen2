/**
 * Module 6 — System Audit & Government Accountability Dashboard
 * Three Part Cohesive View:
 *  Part 1: "Still Stranded" Overdue Alert System (3h T1, 6h T2/T3 threshold + live simulation)
 *  Part 2: Crowd-Sourced Relief Quality Feedback (Submissions & Feed)
 *  Part 3: Public Health Hazard Detection (2+ keyword match alerts)
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { showToast } from './utils/toast'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''  // set VITE_API_BASE_URL when deployed; empty string uses the Vite dev proxy → localhost:8000

// Canonical Tier Colors from GEMINI.md
const TIER_COLOR = {
  'Tier 1': '#E24B4A',
  'Tier 2': '#EF9F27',
  'Tier 3': '#639922',
}

const CATEGORY_ICONS = {
  water: '🚰',
  food: '🍲',
  sanitation: '🧹',
  medical: '🩺',
  general: '📝',
}

export default function AuditPage({ onBack }) {
  const [auditSummary, setAuditSummary] = useState(null)
  const [camps, setCamps]               = useState([])
  const [allCases, setAllCases]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  // Feedback form state
  const [formCampId, setFormCampId]     = useState('')
  const [formCategory, setFormCategory] = useState('water')
  const [formRating, setFormRating]     = useState(2)
  const [formText, setFormText]         = useState('')
  const [submittingFb, setSubmittingFb] = useState(false)
  const [fbSuccess, setFbSuccess]       = useState(false)

  // Simulation state
  const [simCaseId, setSimCaseId]       = useState('')
  const [simHours, setSimHours]         = useState(5.0)
  const [simulating, setSimulating]     = useState(false)
  const [simMessage, setSimMessage]     = useState('')

  const fetchAuditData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sumRes, campRes, qRes] = await Promise.all([
        fetch(`${API_BASE}/api/audit/summary`).then(r => r.json()),
        fetch(`${API_BASE}/api/camps`).then(r => r.json()),
        fetch(`${API_BASE}/triage/queue`).then(r => r.json()),
      ])

      setAuditSummary(sumRes)
      setCamps(campRes.camps ?? [])

      // Flatten cases
      const queueCases = qRes.queue ?? []
      setAllCases(queueCases)
      if (queueCases.length > 0 && !simCaseId) {
        setSimCaseId(queueCases[0].case_id)
      }
      if (campRes.camps?.length > 0 && !formCampId) {
        setFormCampId(campRes.camps[0].camp_id)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [simCaseId, formCampId])

  useEffect(() => { fetchAuditData() }, [fetchAuditData])

  // Submit Feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault()
    if (!formText.trim()) return

    setSubmittingFb(true)
    try {
      const res = await fetch(`${API_BASE}/api/audit/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camp_id: formCampId,
          feedback_text: formText,
          category: formCategory,
          rating: Number(formRating),
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setFormText('')
      setFbSuccess(true)
      setTimeout(() => setFbSuccess(false), 3000)
      fetchAuditData()
    } catch (err) {
      showToast(`Couldn't submit feedback: ${err.message}`, 'error')
    } finally {
      setSubmittingFb(false)
    }
  }

  // Simulate Overdue
  const handleSimulateOverdue = async () => {
    if (!simCaseId) return
    setSimulating(true)
    try {
      const res = await fetch(`${API_BASE}/api/audit/simulate-overdue/${simCaseId}?hours_ago=${simHours}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSimMessage(`⚡ Case ${data.case.gps_or_landmark || simCaseId} escalated to Tier 1 Overdue!`)
      setTimeout(() => setSimMessage(''), 4000)
      fetchAuditData()
    } catch (err) {
      showToast(`Couldn't simulate overdue: ${err.message}`, 'error')
    } finally {
      setSimulating(false)
    }
  }

  if (loading && !auditSummary) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0b1220', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
        fontFamily: "'Inter','Segoe UI',sans-serif", color: '#94a3b8',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid rgba(226,75,74,0.2)', borderTop: '3px solid #E24B4A',
          }}
        />
        Loading Audit & Accountability Dashboard…
      </div>
    )
  }

  const overdueCases = auditSummary?.overdue_cases ?? []
  const hazardAlerts = auditSummary?.hazard_alerts ?? []
  const recentFeedback = auditSummary?.recent_feedback ?? []

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      paddingBottom: 60,
    }}>
      {/* ── Top Header Bar ── */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 16, height: 56,
        background: 'rgba(10,16,30,0.95)', backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <motion.button
          onClick={onBack}
          whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}
          style={{
            background: 'none', border: 'none', color: '#64748b',
            cursor: 'pointer', fontSize: 18, display: 'flex',
            alignItems: 'center', gap: 6, fontFamily: 'inherit',
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
            MODULE 6
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
            System Audit & Accountability Dashboard
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            🚨 Overdue: <strong style={{ color: overdueCases.length > 0 ? '#E24B4A' : '#639922' }}>{overdueCases.length}</strong>
          </span>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            ⚠️ Hazards: <strong style={{ color: hazardAlerts.length > 0 ? '#EF9F27' : '#639922' }}>{hazardAlerts.length}</strong>
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── PART 1: OVERDUE ALERT SYSTEM ── */}
        <section
          className="glass-panel"
          style={{
            border: overdueCases.length > 0 ? '1px solid var(--t1)' : '1px solid var(--panel-border)',
            padding: '20px 22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🚨</span>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                  Part 1 — "Still Stranded" Overdue Rescue Alert System
                </h2>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                SLA Thresholds: Tier 1 &gt; 3 hours · Tier 2/3 &gt; 6 hours without check-in. Auto-escalated to Tier 1 Critical.
              </div>
            </div>

            {/* Overdue Badge Count */}
            {overdueCases.length > 0 && (
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                style={{
                  background: 'rgba(226,75,74,0.2)', border: '1px solid #E24B4A',
                  color: '#fca5a5', padding: '4px 12px', borderRadius: 20,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                }}
              >
                🚨 {overdueCases.length} CASE(S) OVERDUE
              </motion.div>
            )}
          </div>

          {/* Overdue Cases List */}
          {overdueCases.length === 0 ? (
            <div style={{
              padding: '18px', textAlign: 'center',
              border: '1px dashed rgba(99,153,34,0.3)', borderRadius: 10,
              background: 'rgba(99,153,34,0.05)', color: '#a3d669', fontSize: 12,
            }}>
              ✅ All dispatched rescue missions are currently operating within SLA check-in windows.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 18 }}>
              {overdueCases.map(c => (
                <motion.div
                  key={c.case_id}
                  animate={{ borderColor: ['rgba(226,75,74,0.3)', 'rgba(226,75,74,0.9)', 'rgba(226,75,74,0.3)'] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{
                    background: 'rgba(226,75,74,0.08)',
                    border: '1px solid #E24B4A',
                    borderLeft: '4px solid #E24B4A',
                    borderRadius: 10, padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{
                      background: '#E24B4A', color: '#fff', fontSize: 10, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em',
                    }}>
                      OVERDUE · TIER 1 ESCALATED
                    </span>
                    <span style={{ color: '#fca5a5', fontSize: 11, fontWeight: 700 }}>
                      ⏱ {c.overdue_hours}h since dispatch
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>
                    📍 {c.gps_or_landmark}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                    Urgency: <strong>{c.urgency_score}/5</strong> · Victims: <strong>{c.victim_count}</strong>
                    <br />
                    Flags: <span style={{ color: '#fcd34d' }}>{(c.vulnerability_flags ?? []).join(', ') || 'None'}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Overdue Simulation Trigger Tool */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)',
            borderRadius: 10, padding: '12px 16px', marginTop: 12,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <div className="text-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
              ⚡ DEMO SIMULATION TOOL:
            </div>
            <select
              value={simCaseId}
              onChange={e => setSimCaseId(e.target.value)}
              style={{
                background: '#0c1220', border: '1px solid var(--panel-border)',
                borderRadius: 8, color: 'var(--text-primary)', fontSize: 12, padding: '6px 10px',
                outline: 'none', fontFamily: 'inherit', flex: 1, minWidth: 200,
              }}
            >
              {allCases.map(c => (
                <option key={c.case_id} value={c.case_id}>
                  {c.tier}: {c.gps_or_landmark} (Case {c.case_id.substring(0, 8)}…)
                </option>
              ))}
            </select>

            <select
              value={simHours}
              onChange={e => setSimHours(Number(e.target.value))}
              style={{
                background: '#0c1220', border: '1px solid var(--panel-border)',
                borderRadius: 8, color: 'var(--text-primary)', fontSize: 12, padding: '6px 10px',
                outline: 'none', fontFamily: 'inherit', width: 140,
              }}
            >
              <option value={4.0}>Backdate 4 hours</option>
              <option value={5.5}>Backdate 5.5 hours</option>
              <option value={7.0}>Backdate 7 hours</option>
            </select>

            <motion.button
              onClick={handleSimulateOverdue}
              disabled={simulating || !simCaseId}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="btn-primary"
              style={{
                padding: '6px 14px',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {simulating ? 'Simulating…' : 'Trigger Overdue Escalation ➔'}
            </motion.button>

            {simMessage && (
              <span style={{ fontSize: 11, color: '#a3d669', fontWeight: 600 }}>{simMessage}</span>
            )}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* ── PART 3: PUBLIC HEALTH HAZARD DETECTION ── */}
          <section
            className="glass-panel"
            style={{
              border: hazardAlerts.length > 0 ? '1px solid var(--t2)' : '1px solid var(--panel-border)',
              padding: '20px 22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                Part 3 — Public Health Hazard Detection
              </h2>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>
              Scans crowd feedback for health hazard keywords (diarrhea, fever, contamination, etc.). Flags camps with 2+ reports.
            </div>

            {hazardAlerts.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#475569', fontSize: 12, border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 8 }}>
                No public health hazard alerts currently detected across camps.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {hazardAlerts.map(hz => (
                  <div
                    key={hz.camp_id}
                    style={{
                      background: 'rgba(239,159,39,0.08)',
                      border: '1px solid rgba(239,159,39,0.4)',
                      borderLeft: '4px solid #EF9F27',
                      borderRadius: 10, padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{
                        background: '#EF9F27', color: '#000', fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em',
                      }}>
                        ⚠️ HAZARD ALERT
                      </span>
                      <span style={{ color: '#EF9F27', fontSize: 11, fontWeight: 700 }}>
                        Score: {hz.hazard_score} matches
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
                      🏕️ {hz.camp_name}
                    </div>

                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, lineHeight: 1.4 }}>
                      {hz.reason}
                    </div>

                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {hz.matched_keywords.map(kw => (
                        <span key={kw} style={{
                          background: 'rgba(239,159,39,0.18)', color: '#fcd34d',
                          fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                        }}>
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            className="glass-panel"
            style={{
              border: '1px solid var(--panel-border)',
              padding: '20px 22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>✍️</span>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                Part 2 — Submit Relief Quality Feedback
              </h2>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>
              Crowd-sourced report submission for camp conditions, water, food, and medical status.
            </div>

            <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  SELECT RELIEF CAMP
                </label>
                <select
                  value={formCampId}
                  onChange={e => setFormCampId(e.target.value)}
                  style={{
                    width: '100%', background: '#0c1220', border: '1px solid var(--panel-border)',
                    borderRadius: 8, color: 'var(--text-primary)', fontSize: 12, padding: '8px 10px',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                >
                  {camps.map(c => (
                    <option key={c.camp_id} value={c.camp_id}>
                      {c.name} ({c.district})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                    CATEGORY
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    style={{
                      width: '100%', background: '#0c1220', border: '1px solid var(--panel-border)',
                      borderRadius: 8, color: 'var(--text-primary)', fontSize: 12, padding: '8px 10px',
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  >
                    <option value="water">🚰 Water Quality</option>
                    <option value="sanitation">🧹 Sanitation & Hygiene</option>
                    <option value="food">🍲 Food Supply</option>
                    <option value="medical">🩺 Medical / ANM</option>
                    <option value="general">📝 General</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                    RATING (1 - 5)
                  </label>
                  <select
                    value={formRating}
                    onChange={e => setFormRating(Number(e.target.value))}
                    style={{
                      width: '100%', background: '#0c1220', border: '1px solid var(--panel-border)',
                      borderRadius: 8, color: 'var(--text-primary)', fontSize: 12, padding: '8px 10px',
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  >
                    <option value={1}>⭐ 1 - Critical Issue</option>
                    <option value={2}>⭐⭐ 2 - Poor</option>
                    <option value={3}>⭐⭐⭐ 3 - Adequate</option>
                    <option value={4}>⭐⭐⭐⭐ 4 - Good</option>
                    <option value={5}>⭐⭐⭐⭐⭐ 5 - Excellent</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  FEEDBACK / OBSERVATION DETAILS
                </label>
                <textarea
                  rows={3}
                  value={formText}
                  onChange={e => setFormText(e.target.value)}
                  placeholder="Describe camp conditions, water smell, food arrival, or medical outbreak…"
                  style={{
                    width: '100%', background: '#0c1220', border: '1px solid var(--panel-border)',
                    borderRadius: 8, color: 'var(--text-primary)', fontSize: 12, padding: '8px 10px',
                    outline: 'none', fontFamily: 'inherit', resize: 'vertical',
                  }}
                />
              </div>

              <motion.button
                type="submit"
                disabled={submittingFb || !formText.trim()}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="btn-primary"
                style={{
                  padding: '9px 16px',
                  fontWeight: 600, fontSize: 13,
                  cursor: submittingFb || !formText.trim() ? 'default' : 'pointer',
                  width: '100%',
                }}
              >
                {submittingFb ? 'Submitting…' : 'Submit Feedback Report ➔'}
              </motion.button>

              {fbSuccess && (
                <div style={{ color: '#a3d669', fontSize: 11, fontWeight: 600, textAlign: 'center' }}>
                  ✅ Feedback submitted & audit log updated!
                </div>
              )}
            </form>
          </section>
        </div>

        {/* ── RECENT FEEDBACK AUDIT LOG FEED ── */}
        <section
          className="glass-panel"
          style={{
            border: '1px solid var(--panel-border)',
            padding: '20px 22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                📜 Live Relief Quality Audit Log
              </h3>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Recent crowd reports received across relief camps
              </div>
            </div>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Total Entries: <strong>{recentFeedback.length}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentFeedback.map(fb => (
              <div
                key={fb.feedback_id}
                style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: 9, padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{CATEGORY_ICONS[fb.category] ?? '📝'}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {fb.camp_name}
                    </span>
                    <span style={{
                      background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
                      fontSize: 9, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase',
                    }}>
                      {fb.category}
                    </span>
                  </div>
                  <span style={{ color: '#fcd34d', fontSize: 11 }}>
                    {'⭐'.repeat(fb.rating ?? 3)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 4 }}>
                  "{fb.feedback_text}"
                </div>
                <div className="text-mono" style={{ fontSize: 10, color: '#64748b' }}>
                  Logged at {fb.timestamp?.substring(0, 19).replace('T', ' ')}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
