import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '../i18n/LangContext'

export default function SafetyGuidanceAccordion() {
  const { t } = useLang()
  const [openSection, setOpenSection] = useState('power') // default first section open

  const items = [
    {
      id: 'power',
      icon: '⚡',
      badge: 'DO FIRST',
      badgeColor: '#EF9F27',
      title: t('safety.power_title'),
      desc: t('safety.power_desc'),
      points: [
        'Turn off main electrical breaker switch.',
        'Close LPG cooking cylinder knob firmly.',
        'Never stand in water while handling appliances.',
      ],
    },
    {
      id: 'high_ground',
      icon: '🏠',
      badge: 'LIFE-SAVING',
      badgeColor: '#E24B4A',
      title: t('safety.high_ground_title'),
      desc: t('safety.high_ground_desc'),
      points: [
        'Climb to concrete roof or 1st floor immediately.',
        'Wave bright cloth / torch to signal UAV Drones & NDRF boats.',
        'Never enter an enclosed attic without a roof escape exit.',
      ],
    },
    {
      id: 'water',
      icon: '💧',
      badge: 'HEALTH',
      badgeColor: '#00E5FF',
      title: t('safety.water_title'),
      desc: t('safety.water_desc'),
      points: [
        'Never consume raw or turbid floodwater.',
        'Use chlorine water purification tablets if available.',
        'Keep dry rations in air-tight plastic containers.',
      ],
    },
    {
      id: 'battery',
      icon: '🔋',
      badge: 'COMMUNICATION',
      badgeColor: '#639922',
      title: t('safety.battery_title'),
      desc: t('safety.battery_desc'),
      points: [
        'Switch phone to Ultra Power Saving mode.',
        'Lower brightness and disable GPS/Hotspot when idle.',
        'Send short Voice SOS or SMS rather than long phone calls.',
      ],
    },
    {
      id: 'maternity',
      icon: '🤰',
      badge: 'SPECIAL CARE',
      badgeColor: '#f43f5e',
      title: t('safety.maternity_title'),
      desc: t('safety.maternity_desc'),
      points: [
        'Wrap infants and elderly in clean dry plastic-shielded blankets.',
        'Keep pregnancy & doctor records inside a sealed bag.',
        'Tap "Call Emergency Doctor" for direct obstetrician advice.',
      ],
    },
  ]

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 229, 255, 0.22)',
        borderRadius: 14,
        padding: 'clamp(10px, 2.5vw, 14px) clamp(12px, 3vw, 16px)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 'clamp(14px, 3.5vw, 16px)' }}>🛡️</span>
            <span style={{ fontSize: 'clamp(11.5px, 3vw, 13px)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.02em' }}>
              {t('safety.title')}
            </span>
          </div>
          <div style={{ fontSize: 'clamp(9px, 2.3vw, 10px)', color: '#94a3b8', marginTop: 2 }}>
            {t('safety.sub')}
          </div>
        </div>
        <span
          style={{
            fontSize: 'clamp(8.5px, 2.2vw, 9.5px)',
            background: 'rgba(0, 229, 255, 0.12)',
            color: 'var(--cyan)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            padding: '2px 7px',
            borderRadius: 10,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          Safety First
        </span>
      </div>

      {/* Accordion list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item) => {
          const isOpen = openSection === item.id
          return (
            <div
              key={item.id}
              style={{
                background: isOpen ? 'rgba(8, 14, 26, 0.9)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isOpen ? 'rgba(0, 229, 255, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderLeft: isOpen ? `3px solid ${item.badgeColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                overflow: 'hidden',
                transition: 'all 0.18s ease',
              }}
            >
              {/* Accordion Bar */}
              <button
                onClick={() => setOpenSection(isOpen ? null : item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'clamp(8px, 1.8vh, 10px) clamp(8px, 2.2vw, 12px)',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                  outline: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 'clamp(14px, 3.5vw, 16px)', flexShrink: 0 }}>{item.icon}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 'clamp(11px, 2.8vw, 12.5px)', fontWeight: 700, color: isOpen ? '#ffffff' : '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 6 }}>
                  <span
                    style={{
                      fontSize: 'clamp(8px, 2vw, 9px)',
                      color: item.badgeColor,
                      background: `${item.badgeColor}22`,
                      border: `1px solid ${item.badgeColor}55`,
                      padding: '1px 5px',
                      borderRadius: 4,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {item.badge}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ fontSize: 10, color: '#94a3b8', display: 'inline-block' }}
                  >
                    ▼
                  </motion.span>
                </div>
              </button>

              {/* Collapsible Content */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        padding: '0 clamp(10px, 2.5vw, 14px) clamp(10px, 2vh, 12px)',
                        fontSize: 'clamp(10px, 2.5vw, 11px)',
                        color: '#cbd5e1',
                        lineHeight: 1.45,
                      }}
                    >
                      <div style={{ marginBottom: 6, color: '#f1f5f9' }}>{item.desc}</div>
                      <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {item.points.map((pt, idx) => (
                          <li key={idx} style={{ color: '#94a3b8' }}>
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
