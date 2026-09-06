/**
 * SAHAYAK Live Voice SOS Intake & Flood Surge Incident Simulator
 * Provides:
 *  - Multilingual voice recording simulation with animated audio waveform
 *  - High-impact emergency presets (Assamese, Bengali, English)
 *  - Live Flood Surge Simulator (burst ingestion to test real-time DVS triage & dedup)
 *  - Entity Extraction & Urgency Engine live feedback
 */

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { audioFx } from '../utils/audioFx'
import { showToast } from '../utils/toast'

const PRESET_SCENARIOS = [
  {
    id: 'maternity_majuli',
    title: '🤰 Majuli Island Maternity Emergency',
    lang: 'Assamese',
    transcript: 'মাজুলী কমলাবাৰী ঘাটৰ ওচৰত আমাৰ ঘৰ ডুব গৈছে। এজনী ৯ মাহৰ গৰ্ভৱতী মহিলা প্রৱল বিষত আছে। পানী ইতিমধ্যে বুকু সমান। সোনকালে এখন উদ্ধাৰকাৰী নাও পঠিয়াওক!',
    transEnglish: 'Our house near Majuli Kamalabari Ghat is submerged. A 9-month pregnant woman is in severe labor pain. Water is chest deep. Send a rescue boat immediately!',
    victimCount: 3,
    urgency: 'Tier 1'
  },
  {
    id: 'silchar_infant_surge',
    title: '👶 Silchar Barak Valley Rooftop Stranding',
    lang: 'Bengali / English',
    transcript: 'শিলচর অন্নপূর্ণা ঘাট, জল ছাদ ছুঁয়ে গেছে। ৮ জন মানুষ আটকে আছি, যার মধ্যে ২টি ছোট শিশু আছে। কারেন্ট নেই, খাবার নেই। দয়া করে উদ্ধার করুন!',
    transEnglish: 'Silchar Annapurna Ghat, floodwater reached roof level. 8 people stranded including 2 infants. No power or food. Please rescue!',
    victimCount: 8,
    urgency: 'Tier 1'
  },
  {
    id: 'barpeta_dialysis',
    title: '🩺 Barpeta Dialysis Patient Extraction',
    lang: 'Assamese / English',
    transcript: 'বৰপেটা মানাহ নদীৰ পানী বাঢ়ি আহিছে। আমাৰ ঘৰত এজন বৃদ্ধ ডায়বেটিচ আৰু ডায়ালাইচিচ ৰোগী আছে। ২৪ ঘণ্টাত চিকিৎসা নাপালে বিপদ হ’ব।',
    transEnglish: 'Barpeta Manas river waters rising rapidly. An elderly diabetic and dialysis patient is at home. Critical without hospital access in 24 hours.',
    victimCount: 4,
    urgency: 'Tier 1'
  },
  {
    id: 'morigaon_livestock',
    title: '🌾 Morigaon Shallow Silt Evacuation',
    lang: 'Assamese',
    transcript: 'মৰিগাঁও ভূৰাগাঁৱত বানপানী প্ৰৱেশ কৰিছে। ২ ফুট পলস আৰু বোকাত ট্ৰেক্টৰ বা সৰু নাও লাগিব। ৫ জন মানুহ আৰু পশুধন নিৰাপদ স্থানলৈ নিব লাগে।',
    transEnglish: 'Morigaon Bhuragaon shallow water ingress. 2 feet silt/mud. Need tractor or shallow canoe to move 5 people and cattle to relief camp.',
    victimCount: 5,
    urgency: 'Tier 2'
  }
]

export default function LiveIncidentSimulator({ isOpen, onClose, onCaseProcessed }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_SCENARIOS[0])
  const [customText, setCustomText] = useState('')
  const [selectedLang, setSelectedLang] = useState('Assamese')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractionResult, setExtractionResult] = useState(null)
  const [isSurging, setIsSurging] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // Waveform canvas animation
  const canvasRef = useRef(null)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200)
  }

  useEffect(() => {
    if (!isOpen) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId = null
    let step = 0

    function drawWave() {
      step += 0.08
      const w = canvas.width = 440
      const h = canvas.height = 70

      ctx.clearRect(0, 0, w, h)
      ctx.lineWidth = 2
      ctx.strokeStyle = isRecording ? '#E24B4A' : '#00E5FF'

      ctx.beginPath()
      const barCount = 32
      const barWidth = w / barCount

      for (let i = 0; i < barCount; i++) {
        const amp = isRecording
          ? Math.sin(step + i * 0.4) * 22 + Math.random() * 8
          : (Math.sin(step * 0.5 + i * 0.2) * 8 + 6)
        const barH = Math.max(4, Math.abs(amp))
        const x = i * barWidth + barWidth / 2
        const y = h / 2 - barH / 2

        ctx.fillStyle = isRecording ? 'rgba(226, 75, 74, 0.7)' : 'rgba(0, 229, 255, 0.6)'
        ctx.fillRect(x - 2, y, 4, barH)
      }

      animId = requestAnimationFrame(drawWave)
    }

    drawWave()
    return () => cancelAnimationFrame(animId)
  }, [isOpen, isRecording])

  if (!isOpen) return null

  const handleProcessIntake = async (textToProcess, langHint) => {
    setIsProcessing(true)
    audioFx.playRadioDispatch()
    try {
      const res = await fetch('/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_input: textToProcess || customText || selectedPreset.transcript,
          language_hint: langHint || selectedLang
        })
      })

      if (res.ok) {
        const data = await res.json()
        setExtractionResult(data.case)
        audioFx.playAlert()
        showToast(`🚨 Case registered: ${data.case.tier} (Urgency ${data.case.urgency_score}/5)`)
        if (onCaseProcessed) onCaseProcessed(data.case)
      } else {
        const err = await res.json()
        showToast(`⚠️ Intake error: ${err.detail || 'Failed'}`)
      }
    } catch (e) {
      showToast(`⚠️ Network error during intake: ${e.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSimulateSurge = async () => {
    setIsSurging(true)
    audioFx.playAlert()
    showToast('🌊 Ingesting 3 simultaneous disaster surge calls across Assam sectors...')

    for (const p of PRESET_SCENARIOS.slice(0, 3)) {
      try {
        await fetch('/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text_input: p.transcript, language_hint: p.lang })
        })
      } catch (e) {}
    }

    setIsSurging(false)
    showToast('✅ Flood surge ingested! Triage queue prioritized and deduplicated.')
    if (onCaseProcessed) onCaseProcessed()
    setTimeout(() => onClose(), 1200)
  }

  return (
    <div
      className={isClosing ? "view-section-exit" : "view-section-enter"}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(3, 7, 18, 0.88)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
      }}
    >
      <div
        className="view-card-stagger-in"
        style={{
          width: '100%', maxWidth: 760, background: '#080E1A',
          border: '1px solid rgba(0, 229, 255, 0.35)', borderRadius: 14,
          boxShadow: '0 0 50px rgba(0, 229, 255, 0.18), 0 20px 40px rgba(0,0,0,0.9)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
        }}
      >
        {/* Top Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
          background: 'rgba(15, 23, 42, 0.9)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🎙️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.08em' }}>
                MULTILINGUAL VOICE-TO-JSON SOS INTAKE & SIMULATOR
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                ASR Speech-to-Text · LLM Entity Extractor · Demographic Vulnerability Matrix
              </div>
            </div>
          </div>
          <button
            onClick={() => { audioFx.playTactile(); handleClose() }}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: '#ddd', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Audio Waveform Display */}
          <div style={{
            background: 'rgba(5, 10, 20, 0.9)', border: '1px solid rgba(0, 229, 255, 0.18)',
            borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 8
          }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: isRecording ? '#ff3b30' : 'var(--cyan)', fontWeight: 700 }}>
                {isRecording ? '🔴 RECORDING LIVE AUDIO...' : '📻 AUDIO INTAKE BUFFER READY'}
              </span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                CH: DUAL · SAMPLING: 44.1kHz · PCM-16
              </span>
            </div>
            <canvas ref={canvasRef} style={{ width: '100%', height: 60 }} />
          </div>

          {/* Quick Presets Selection */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.06em' }}>
              SELECT VERIFIED FLOOD INCIDENT SCENARIO
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
              {PRESET_SCENARIOS.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    audioFx.playTactile()
                    setSelectedPreset(p)
                    setCustomText('')
                  }}
                  style={{
                    background: selectedPreset.id === p.id && !customText ? 'rgba(0, 229, 255, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                    border: selectedPreset.id === p.id && !customText ? '1px solid var(--cyan)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8, padding: 10, cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{p.title}</div>
                    <span className="status-pill status-critical" style={{ fontSize: 8 }}>{p.urgency}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#00E5FF', fontStyle: 'italic', marginBottom: 4 }}>
                    "{p.transcript}"
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    🇬🇧 Translation: {p.transEnglish}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Voice/Text Input Area */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              OR ENTER RAW MULTILINGUAL SOS TRANSCRIPT
            </div>
            <textarea
              rows={3}
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              placeholder="e.g. 'Morigaon Bhuragaon, 4 elderly trapped on raised bed, water 4 feet deep...'"
              style={{
                width: '100%', background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: 8,
                padding: '10px 12px', color: '#fff', fontSize: 12, outline: 'none'
              }}
            />
          </div>

          {/* Extraction Result Card */}
          {extractionResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(0, 229, 255, 0.08)', border: '1px solid var(--cyan)',
                borderRadius: 8, padding: 12
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', marginBottom: 4 }}>
                ⚡ DVS ENGINE ENTITY EXTRACTION RESULTS
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#ddd' }}>
                <div>📍 Landmark: <strong>{extractionResult.gps_or_landmark}</strong></div>
                <div>👥 Victims: <strong>{extractionResult.victim_count}</strong></div>
                <div>🎯 Urgency Score: <strong>{extractionResult.urgency_score}/5</strong> ({extractionResult.tier})</div>
                <div>🚩 Flags: <strong>{extractionResult.vulnerability_flags?.join(', ') || 'None'}</strong></div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <button
              onClick={handleSimulateSurge}
              disabled={isSurging || isProcessing}
              style={{
                background: 'rgba(239, 159, 39, 0.15)', border: '1px solid #EF9F27',
                color: '#fcd34d', padding: '10px 16px', borderRadius: 8,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              🌊 {isSurging ? 'Simulating Surge...' : 'Simulate Flood Surge (+3 Calls)'}
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleProcessIntake()}
                disabled={isProcessing}
                style={{
                  background: 'linear-gradient(135deg, #00E5FF 0%, #0284c7 100%)',
                  color: '#050a14', border: 'none', padding: '10px 20px', borderRadius: 8,
                  fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 0 16px rgba(0, 229, 255, 0.4)'
                }}
              >
                🚀 {isProcessing ? 'Analyzing Audio...' : 'Process SOS Intake'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
