import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '../i18n/LangContext'

// Assam flood response key districts
const ASSAM_DISTRICTS = [
  { name: 'Cachar / Silchar', district: 'Cachar', lat: 24.8333, lng: 92.7789, icon: '📍', severity: 'Critical' },
  { name: 'Majuli Island', district: 'Majuli', lat: 26.9500, lng: 94.2167, icon: '🏝️', severity: 'Critical' },
  { name: 'Dibrugarh', district: 'Dibrugarh', lat: 27.4728, lng: 94.9120, icon: '🌊', severity: 'High' },
  { name: 'Kamrup / Guwahati', district: 'Kamrup', lat: 26.1445, lng: 91.7362, icon: '🏙️', severity: 'High' },
  { name: 'Hojai / Lanka', district: 'Hojai', lat: 25.9964, lng: 92.8680, icon: '📍', severity: 'Moderate' },
  { name: 'Dhubri', district: 'Dhubri', lat: 26.0200, lng: 89.9700, icon: '📍', severity: 'Moderate' },
  { name: 'Barpeta', district: 'Barpeta', lat: 26.3200, lng: 91.0000, icon: '📍', severity: 'Moderate' },
  { name: 'Morigaon', district: 'Morigaon', lat: 26.2500, lng: 92.3400, icon: '📍', severity: 'Moderate' },
]

export default function DistrictCampSearch({
  camps = [],
  cases = [],
  onSelectLocation,
  activeLocation,
  onClearLocation,
  isMobile = false,
  style = {},
}) {
  const { t } = useLang()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Format and filter locations
  const searchResults = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()

    // 1. Districts
    const matchingDistricts = ASSAM_DISTRICTS.filter(d =>
      !q || d.name.toLowerCase().includes(q) || d.district.toLowerCase().includes(q)
    ).map(d => ({
      id: `district-${d.district}`,
      type: 'district',
      title: d.name,
      subtitle: `Assam District · ${d.severity} Alert`,
      icon: d.icon,
      lat: d.lat,
      lng: d.lng,
      district: d.district,
    }))

    // 2. Relief Camps
    const matchingCamps = camps.filter(c =>
      !q || c.name.toLowerCase().includes(q) || (c.district && c.district.toLowerCase().includes(q))
    ).map(c => ({
      id: `camp-${c.camp_id || c.name}`,
      type: 'camp',
      title: c.name,
      subtitle: `Relief Camp (${c.district || 'Assam'}) · ${c.capacity - (c.current_occupancy || 0)} beds free`,
      icon: '🏕️',
      lat: c.lat || (c.coordinates ? c.coordinates[1] : 26.2),
      lng: c.lng || (c.coordinates ? c.coordinates[0] : 92.8),
      district: c.district,
      raw: c,
    }))

    return {
      districts: matchingDistricts.slice(0, 6),
      camps: matchingCamps.slice(0, 6),
      total: matchingDistricts.length + matchingCamps.length,
    }
  }, [searchTerm, camps])

  const handleSelect = (loc) => {
    onSelectLocation?.(loc)
    setIsOpen(false)
    setSearchTerm('')
  }

  // ── RENDER ──
  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', ...style }}>
      {/* Search trigger bar / active pill */}
      {activeLocation ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(0,229,255,0.15)',
            border: '1px solid var(--cyan)',
            borderRadius: 14,
            padding: isMobile ? '2px 6px' : '3px 8px',
            fontSize: 'clamp(9.5px, 2.4vw, 11px)',
            fontWeight: 700,
            color: 'var(--cyan)',
            boxShadow: '0 0 10px rgba(0,229,255,0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{activeLocation.icon || '📍'}</span>
          <span style={{ maxWidth: isMobile ? 65 : 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeLocation.district || activeLocation.title}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClearLocation?.()
            }}
            title="Clear filter"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--cyan)',
              cursor: 'pointer',
              fontSize: 10,
              padding: '0 1px',
              display: 'flex',
              alignItems: 'center',
              outline: 'none',
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Search district or camp"
          title="Quick Search & Filter by District or Camp"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? 0 : 6,
            background: isOpen ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isOpen ? 'var(--cyan)' : 'rgba(0,229,255,0.25)'}`,
            borderRadius: 8,
            width: isMobile ? 28 : 'auto',
            height: 28,
            padding: isMobile ? 0 : '0 10px',
            color: 'var(--cyan)',
            fontSize: isMobile ? 12 : 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: isMobile ? 13 : 12 }}>🔍</span>
          {!isMobile && <span>{t('search.all_districts')}</span>}
          {!isMobile && <span style={{ fontSize: 8, opacity: 0.7 }}>▼</span>}
        </button>
      )}

      {/* Dropdown Search & Results Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: isMobile ? 'auto' : 0,
              right: isMobile ? 0 : 'auto',
              width: isMobile ? 'clamp(280px, 86vw, 340px)' : 330,
              zIndex: 70,
              background: 'rgba(10, 16, 30, 0.98)',
              backdropFilter: 'blur(22px)',
              WebkitBackdropFilter: 'blur(22px)',
              border: '1px solid rgba(0,229,255,0.35)',
              borderRadius: 12,
              padding: '10px 12px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.85), 0 0 16px rgba(0,229,255,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {/* Search Input Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(0,229,255,0.3)',
                borderRadius: 8,
                padding: '6px 8px',
              }}
            >
              <span style={{ color: 'var(--cyan)', fontSize: 13 }}>🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search.placeholder')}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: 11.5,
                  fontFamily: 'inherit',
                  caretColor: 'var(--cyan)',
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: 0 }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick District Filter Chips */}
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                {t('search.results')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {ASSAM_DISTRICTS.slice(0, 4).map(d => (
                  <button
                    key={d.district}
                    onClick={() => handleSelect({ type: 'district', title: d.name, district: d.district, lat: d.lat, lng: d.lng, icon: d.icon })}
                    style={{
                      background: 'rgba(0,229,255,0.08)',
                      border: '1px solid rgba(0,229,255,0.25)',
                      borderRadius: 6,
                      padding: '3px 6px',
                      color: '#cbd5e1',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <span>{d.icon}</span>
                    <span>{d.district}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Result list */}
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
              {searchResults.total === 0 ? (
                <div style={{ padding: '12px 8px', textAlign: 'center', color: '#64748b', fontSize: 11 }}>
                  {t('search.no_match')}
                </div>
              ) : (
                <>
                  {/* Districts group */}
                  {searchResults.districts.length > 0 && (
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--cyan)', fontWeight: 700, padding: '2px 4px', textTransform: 'uppercase' }}>
                        Districts & Flood Zones
                      </div>
                      {searchResults.districts.map(d => (
                        <button
                          key={d.id}
                          onClick={() => handleSelect(d)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 6,
                            color: '#f1f5f9',
                            fontSize: 11.5,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            transition: 'background 0.12s ease',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.12)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{d.icon}</span>
                            <div>
                              <div style={{ fontWeight: 700 }}>{d.title}</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>{d.subtitle}</div>
                            </div>
                          </div>
                          <span style={{ color: 'var(--cyan)', fontSize: 11 }}>➔</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Relief Camps group */}
                  {searchResults.camps.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 9, color: '#4ade80', fontWeight: 700, padding: '2px 4px', textTransform: 'uppercase' }}>
                        Relief Camps & Shelters
                      </div>
                      {searchResults.camps.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleSelect(c)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 6,
                            color: '#f1f5f9',
                            fontSize: 11.5,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            transition: 'background 0.12s ease',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.12)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{c.icon}</span>
                            <div>
                              <div style={{ fontWeight: 700 }}>{c.title}</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>{c.subtitle}</div>
                            </div>
                          </div>
                          <span style={{ color: '#4ade80', fontSize: 11 }}>➔</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
