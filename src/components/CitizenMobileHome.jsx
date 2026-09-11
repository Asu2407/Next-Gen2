import React from 'react'
import { motion } from 'framer-motion'
import { useLang } from '../i18n/LangContext'
import SafetyGuidanceAccordion from './SafetyGuidanceAccordion'

export default function CitizenMobileHome({
  onOpenVoiceSOS,
  onOpenCamps,
  onOpenMissing,
  onOpenDoctor,
  onSwitchToRescuer,
  camps = [],
  riverGauges = [],
}) {
  const { t } = useLang()

  // Pick nearest safe camp (first operational camp from list)
  const nearestCamp = camps.length > 0 ? camps[0] : {
    name: 'Majuli College Ground Relief Camp',
    district: 'Majuli',
    capacity: 650,
    current_occupancy: 410,
    supplies: { water_liters: 12000, food_rations: 1400, medical_kits: 85 },
  }

  // Calculate highest alert gauge if available
  const criticalGauge = riverGauges.find(g => g.trend === 'rising' || g.rate_of_rise_cm_per_hour > 0) || riverGauges[0]

  return (
    <div
      className="mobile-hero-container view-section-enter"
      style={{
        width: '100%',
        maxWidth: 540,
        margin: '0 auto',
        padding: 'clamp(8px, 2.5vw, 14px) clamp(10px, 3vw, 16px) clamp(24px, 6vh, 48px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(8px, 2vh, 14px)',
        fontFamily: 'inherit',
      }}
    >
      {/* ── 1. LOCAL FLOOD ALERT BANNER ── */}
      <div
        className="river-surge-banner"
        style={{
          background: 'rgba(239, 159, 39, 0.12)',
          border: '1px solid rgba(239, 159, 39, 0.35)',
          borderRadius: 12,
          padding: 'clamp(8px, 2vw, 12px) clamp(10px, 2.8vw, 14px)',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(8px, 2.2vw, 12px)',
          position: 'relative',
        }}
      >
        {/* Living background water wave graphic */}
        <div className="river-wave-track">
          <svg width="100%" height="100%" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
              d="M0,40 C150,80 350,0 500,40 C650,80 850,0 1000,40 C1150,80 1200,50 1200,50 L1200,120 L0,120 Z"
              fill="#EF9F27"
            />
          </svg>
        </div>

        <motion.span
          animate={{ scale: [1, 1.15, 1], rotate: [0, 4, -4, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
          style={{ fontSize: 'clamp(20px, 5.5vw, 26px)', flexShrink: 0, position: 'relative', zIndex: 1 }}
        >
          🌊
        </motion.span>
        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 'clamp(9px, 2.4vw, 10.5px)', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {t('citizen.location')}
            </span>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#f59e0b',
                display: 'inline-block',
                boxShadow: '0 0 6px #f59e0b',
                animation: 'beacon-glow 1.5s infinite',
              }}
            />
          </div>
          <div style={{ fontSize: 'clamp(11px, 2.9vw, 12.5px)', fontWeight: 600, color: '#f8fafc', lineHeight: 1.3, marginTop: 2 }}>
            {criticalGauge
              ? `${criticalGauge.station_name}: ${t('map.rate_of_rise')} +${criticalGauge.rate_of_rise_cm_per_hour}cm/h (${t('citizen.status_warning')})`
              : t('citizen.status_warning')}
          </div>
        </div>
      </div>

      {/* ── 2. HERO EMERGENCY VOICE SOS BUTTON (THE BIG RED ACTION) ── */}
      <motion.button
        onClick={onOpenVoiceSOS}
        whileTap={{ scale: 0.96 }}
        className="citizen-sos-card"
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, rgba(226,75,74,0.25) 0%, rgba(15,20,35,0.96) 100%)',
          border: '2px solid #E24B4A',
          borderRadius: 18,
          padding: 'clamp(14px, 3.5vh, 22px) clamp(12px, 3vw, 16px)',
          cursor: 'pointer',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'clamp(8px, 1.8vh, 12px)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'inherit',
        }}
      >
        {/* Core microphone with acoustic radiating ripple waves */}
        <div style={{ position: 'relative', width: 'clamp(58px, 14vw, 72px)', height: 'clamp(58px, 14vw, 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Concentric expanding acoustic pulse waves */}
          <div className="sos-ripple-ring" style={{ width: '100%', height: '100%' }} />
          <div className="sos-ripple-ring" style={{ width: '100%', height: '100%' }} />
          <div className="sos-ripple-ring" style={{ width: '100%', height: '100%' }} />

          {/* Center pulsating button core */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: 'clamp(50px, 12vw, 62px)',
              height: 'clamp(50px, 12vw, 62px)',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(24px, 6vw, 30px)',
              boxShadow: '0 0 28px rgba(226,75,74,0.9), inset 0 0 12px rgba(255,255,255,0.4)',
            }}
          >
            🎙️
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: 'clamp(16px, 4.4vw, 19px)', fontWeight: 900, letterSpacing: '0.05em', color: '#ffffff', textTransform: 'uppercase' }}>
            {t('citizen.sos_btn')}
          </div>
          <div style={{ fontSize: 'clamp(10.5px, 2.7vw, 11.5px)', color: '#fca5a5', marginTop: 3, lineHeight: 1.35, maxWidth: 340 }}>
            {t('citizen.sos_sub')}
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            background: 'rgba(226,75,74,0.28)',
            border: '1px solid rgba(226,75,74,0.55)',
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 'clamp(8.5px, 2.2vw, 10px)',
            fontWeight: 700,
            color: '#fecaca',
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span>⚡</span>
          <span>AUTO-DETECTS GPS & DISPATCHES RESCUE BOATS</span>
        </div>
      </motion.button>

      {/* ── 3. NEAREST SAFE RELIEF CAMP ── */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(0, 229, 255, 0.2)',
          borderRadius: 14,
          padding: 'clamp(10px, 2.5vw, 14px) clamp(12px, 3vw, 16px)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 'clamp(9px, 2.3vw, 10px)', fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {t('citizen.camp_title')}
            </div>
            <div style={{ fontSize: 'clamp(12px, 3.2vw, 14px)', fontWeight: 700, color: '#f1f5f9', marginTop: 2 }}>
              🏕️ {nearestCamp.name}
            </div>
          </div>
          <span
            style={{
              background: 'rgba(99, 153, 34, 0.2)',
              color: '#4ade80',
              border: '1px solid rgba(99, 153, 34, 0.4)',
              fontSize: 'clamp(8.5px, 2.2vw, 9.5px)',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 12,
              whiteSpace: 'nowrap',
            }}
          >
            {t('citizen.camp_badge')}
          </span>
        </div>

        {/* Amenity tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, margin: '6px 0 10px' }}>
          <span style={{ fontSize: 'clamp(9px, 2.3vw, 10px)', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', padding: '2px 6px', borderRadius: 6 }}>
            🍞 {t('map.relief_camp')}: {nearestCamp.capacity - nearestCamp.current_occupancy} {t('map.beds')}
          </span>
          <span style={{ fontSize: 'clamp(9px, 2.3vw, 10px)', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', padding: '2px 6px', borderRadius: 6 }}>
            💧 Safe Drinking Water
          </span>
          <span style={{ fontSize: 'clamp(9px, 2.3vw, 10px)', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', padding: '2px 6px', borderRadius: 6 }}>
            🩺 Medical Officers Active
          </span>
        </div>

        <button
          onClick={onOpenCamps}
          style={{
            width: '100%',
            background: 'linear-gradient(90deg, rgba(0,229,255,0.15) 0%, rgba(2,132,199,0.25) 100%)',
            border: '1px solid #00E5FF',
            borderRadius: 10,
            padding: 'clamp(7px, 1.8vh, 10px) 12px',
            color: '#00E5FF',
            fontSize: 'clamp(11px, 2.8vw, 12px)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
            fontFamily: 'inherit',
          }}
        >
          <span>{t('citizen.view_camp')}</span>
        </button>
      </div>

      {/* ── 4. TWO ESSENTIAL CIVILIAN HUBS (GRID) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(6px, 2vw, 10px)' }}>
        {/* Missing Family Card */}
        <motion.button
          onClick={onOpenMissing}
          whileTap={{ scale: 0.98 }}
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14,
            padding: 'clamp(10px, 2.5vw, 14px) clamp(8px, 2vw, 12px)',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            color: 'inherit',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ fontSize: 'clamp(18px, 5vw, 24px)' }}>👨‍👩‍👧</div>
          <div>
            <div style={{ fontSize: 'clamp(11px, 2.8vw, 12.5px)', fontWeight: 700, color: '#f8fafc' }}>
              {t('citizen.missing_title')}
            </div>
            <div style={{ fontSize: 'clamp(9px, 2.3vw, 10px)', color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
              {t('citizen.missing_sub')}
            </div>
          </div>
          <div style={{ fontSize: 'clamp(9.5px, 2.4vw, 10.5px)', fontWeight: 700, color: '#38bdf8', marginTop: 'auto' }}>
            Check List ➔
          </div>
        </motion.button>

        {/* Tele-Health Doctor Card */}
        <motion.button
          onClick={onOpenDoctor}
          whileTap={{ scale: 0.98 }}
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(244,63,94,0.3)',
            borderRadius: 14,
            padding: 'clamp(10px, 2.5vw, 14px) clamp(8px, 2vw, 12px)',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            color: 'inherit',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ fontSize: 'clamp(18px, 5vw, 24px)' }}>🩺</div>
          <div>
            <div style={{ fontSize: 'clamp(11px, 2.8vw, 12.5px)', fontWeight: 700, color: '#f8fafc' }}>
              {t('citizen.doctor_title')}
            </div>
            <div style={{ fontSize: 'clamp(9px, 2.3vw, 10px)', color: '#fda4af', marginTop: 2, lineHeight: 1.3 }}>
              {t('citizen.doctor_sub')}
            </div>
          </div>
          <div style={{ fontSize: 'clamp(9.5px, 2.4vw, 10.5px)', fontWeight: 700, color: '#f43f5e', marginTop: 'auto' }}>
            Call Doctor ➔
          </div>
        </motion.button>
      </div>

      {/* ── 5. EMERGENCY 24x7 HELPLINES STRIP (1-TAP CALL) ── */}
      <div
        style={{
          background: 'rgba(8, 14, 26, 0.75)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: 'clamp(8px, 2vw, 10px) clamp(10px, 2.5vw, 14px)',
        }}
      >
        <div style={{ fontSize: 'clamp(8.5px, 2.2vw, 9.5px)', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          📞 {t('citizen.helpline_title')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'clamp(4px, 1.2vw, 6px)' }}>
          <a
            href="tel:1070"
            style={{
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: 'clamp(4px, 1vh, 6px) 2px',
              textAlign: 'center',
              color: '#f1f5f9',
              fontSize: 'clamp(9.5px, 2.4vw, 11px)',
              fontWeight: 700,
              display: 'block',
            }}
          >
            <div>SDRF</div>
            <div style={{ color: 'var(--cyan)', fontSize: 'clamp(10.5px, 2.8vw, 12px)' }}>1070</div>
          </a>
          <a
            href="tel:1078"
            style={{
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: 'clamp(4px, 1vh, 6px) 2px',
              textAlign: 'center',
              color: '#f1f5f9',
              fontSize: 'clamp(9.5px, 2.4vw, 11px)',
              fontWeight: 700,
              display: 'block',
            }}
          >
            <div>NDRF</div>
            <div style={{ color: '#f59e0b', fontSize: 'clamp(10.5px, 2.8vw, 12px)' }}>1078</div>
          </a>
          <a
            href="tel:108"
            style={{
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: 'clamp(4px, 1vh, 6px) 2px',
              textAlign: 'center',
              color: '#f1f5f9',
              fontSize: 'clamp(9.5px, 2.4vw, 11px)',
              fontWeight: 700,
              display: 'block',
            }}
          >
            <div>Ambulance</div>
            <div style={{ color: '#f43f5e', fontSize: 'clamp(10.5px, 2.8vw, 12px)' }}>108</div>
          </a>
        </div>
      </div>

      {/* ── 6. VISUAL "WHAT TO DO WHILE WAITING" ACCORDION (SAFETY FIRST) ── */}
      <SafetyGuidanceAccordion />

      {/* ── 7. SWIPE / MAP SWITCH SHORTCUT ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={onSwitchToRescuer}
          style={{
            background: 'linear-gradient(90deg, rgba(0,229,255,0.08) 0%, rgba(2,132,199,0.15) 100%)',
            border: '1px solid rgba(0,229,255,0.3)',
            borderRadius: 10,
            padding: 'clamp(8px, 1.8vh, 10px) 14px',
            color: 'var(--cyan)',
            fontSize: 'clamp(10.5px, 2.6vw, 11.5px)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}
        >
          <span>🗺️</span>
          <span>{t('citizen.view_map')}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#64748b', fontSize: 'clamp(8.5px, 2.2vw, 9.5px)', padding: '2px 0' }}>
          <span>👈</span>
          <span>{t('swipe.hint')}</span>
          <span>👉</span>
        </div>
      </div>
    </div>
  )
}
