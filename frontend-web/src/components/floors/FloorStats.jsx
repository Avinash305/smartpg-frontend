import React, { useEffect, useMemo, useState } from 'react'
import { FiGrid, FiBox } from 'react-icons/fi'
import { getRooms, getBeds } from '../../services/properties'
import { useColorScheme } from '../../theme/colorSchemes'
import { useTranslation } from 'react-i18next'

const StatTile = ({ label, value, icon: Icon, color = 'text-indigo-600', bg = 'bg-indigo-50', sub = null, scheme }) => {
  const segPalette = {
    Active: 'bg-emerald-500',
    Inactive: 'bg-gray-300',
    Available: scheme?.available?.seg || 'bg-emerald-500',
    Occupied: scheme?.occupied?.seg || 'bg-rose-500',
    Reserved: scheme?.reserved?.seg || 'bg-amber-500',
    'Maint.': scheme?.maintenance?.seg || 'bg-rose-300',
    Maintenance: scheme?.maintenance?.seg || 'bg-rose-300',
  }
  const textPalette = {
    Active: 'text-emerald-700',
    Inactive: 'text-gray-600',
    Available: scheme?.accents?.emerald?.text || 'text-emerald-700',
    Occupied: scheme?.accents?.rose?.text || 'text-rose-700',
    Reserved: scheme?.accents?.amber?.text || 'text-amber-700',
    'Maint.': scheme?.accents?.rose?.text || 'text-rose-700',
    Maintenance: scheme?.accents?.rose?.text || 'text-rose-700',
  }
  const data = Array.isArray(sub) ? sub.filter(s => typeof s?.value === 'number' && !s?.meta) : []
  const meta = Array.isArray(sub) ? sub.filter(s => s?.meta) : []
  const total = data.reduce((acc, s) => acc + (s.value || 0), 0)
  const segments = total > 0 ? data.map(s => ({
    label: s.label,
    value: s.value,
    pct: (s.value / total) * 100,
    color: segPalette[s.label] || 'bg-gray-300',
    text: textPalette[s.label] || 'text-gray-700',
  })) : []

  const [hover, setHover] = useState({ show: false, text: '', x: 0, color: '' })

  const valueLen = String(value ?? 0).length
  const valueClass = valueLen >= 5
    ? 'text-sm sm:text-base'
    : valueLen >= 3
    ? 'text-base sm:text-lg'
    : 'text-lg sm:text-xl'

  const accentRing = color.includes('amber') || bg.includes('amber')
    ? 'ring-amber-200 hover:ring-amber-300'
    : (color.includes('emerald') || bg.includes('emerald'))
    ? 'ring-emerald-200 hover:ring-emerald-300'
    : 'ring-indigo-200 hover:ring-indigo-300'

  return (
    <div className={`rounded-lg border border-gray-200 ${bg} p-2.5 sm:p-3 hover:shadow-sm transition-all ${accentRing} ring-1`} title={`${label}: ${value ?? 0}`}>
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-md flex items-center justify-center ${bg} ${color}`}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <div className="min-w-0">
          <div className={`${valueClass} font-semibold text-gray-900 leading-tight`}>{value ?? 0}</div>
          <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
        </div>
      </div>
      {segments.length > 0 && (
        <>
          <div className="mt-2 relative">
            {hover.show && (
              <span
                className="pointer-events-none absolute -top-8 left-0 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-md bg-gray-900/90 text-white text-[10px] shadow-md z-10 flex items-center gap-1 transition-all border border-white/10 backdrop-blur-sm"
                style={{ left: `${hover.x}px` }}
              >
                <span className={`inline-block h-2 w-2 rounded-sm ${hover.color}`} />
                {hover.text}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-gray-900/90 border-r border-b border-white/10" />
              </span>
            )}
            <div
              className="h-1.5 sm:h-2 md:h-2.5 rounded-full overflow-hidden ring-1 flex gap-px bg-gradient-to-r from-gray-100 to-gray-50 ring-gray-200 relative"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const xRaw = e.clientX - rect.left
                const x = Math.min(Math.max(xRaw, 8), rect.width - 8)
                setHover(h => ({ ...h, x }))
              }}
              onMouseLeave={() => setHover({ show: false, text: '', x: 0 })}
            >
              {segments.map((seg, i) => (
                <div
                  key={seg.label}
                  className={`${seg.color} relative cursor-pointer h-full transition-[width,filter,opacity] duration-500 ease-out hover:opacity-95 hover:brightness-110 ${i === 0 ? 'rounded-l-full' : ''} ${i === segments.length - 1 ? 'rounded-r-full' : ''} ${i !== segments.length - 1 ? 'border-r border-white/30' : ''}`}
                  style={{
                    width: `${seg.pct}%`,
                    backgroundImage:
                      'linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0) 40%), repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0, rgba(255,255,255,0.18) 6px, transparent 6px, transparent 12px)'
                  }}
                  onMouseEnter={() => setHover({ show: true, text: `${seg.label}: ${Math.round(seg.pct)}% (${seg.value})`, x: hover.x, color: seg.color })}
                  aria-label={`${seg.label} ${Math.round(seg.pct)} percent`}
                  role="img"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/20 to-transparent mix-blend-overlay" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] sm:text-[10px] text-gray-700">
            {segments.map(seg => (
              <span key={seg.label} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/60 border border-gray-200">
                <span className={`inline-block h-2 w-2 rounded-sm ${seg.color}`} />
                <span className="text-gray-500">{seg.label}:</span>
                <span className={`${seg.text}`}>{Math.round(seg.pct)}% ({seg.value})</span>
              </span>
            ))}
          </div>
          {meta.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] sm:text-[10px] text-gray-700">
              {meta.map(m => (
                <span key={m.label} className="inline-flex items-center gap-1 px-1 py-0.5 rounded bg-gray-50 border border-gray-200">
                  <span className="text-gray-500">{m.label}:</span>
                  <span className="text-gray-800">{m.value ?? 0}</span>
                </span>
              ))}
            </div>
          )}
        </>
      )}
      {sub && segments.length === 0 && (
        <div className="mt-1 text-[10px] sm:text-[11px] text-gray-600 flex flex-wrap gap-x-3 gap-y-0.5">
          {sub.map((s) => (
            <span key={s.label}><span className="text-gray-500">{s.label}:</span> {s.value ?? 0}</span>
          ))}
        </div>
      )}
    </div>
  )
}

const FloorStats = ({ floorId = null, totalFloors = '-', totalRooms = '-', totalBeds = '-' }) => {
  const scheme = useColorScheme('default')
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [liveRooms, setLiveRooms] = useState(undefined)
  const [liveBeds, setLiveBeds] = useState(undefined)
  const [roomBreakdown, setRoomBreakdown] = useState({ active: undefined, inactive: undefined })
  const [bedBreakdown, setBedBreakdown] = useState({ available: undefined, occupied: undefined, reserved: undefined, maintenance: undefined })

  const needFetch = useMemo(() => (
    !!floorId && (totalRooms === '-' || totalBeds === '-')
  ), [floorId, totalRooms, totalBeds])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!needFetch) return
      setLoading(true)
      setError('')
      try {
        const params = { floor: floorId, page_size: 1000 }
        const [roomsRes, bedsRes] = await Promise.all([
          totalRooms === '-' ? getRooms(params).catch(() => ({ results: [] })) : Promise.resolve(null),
          totalBeds === '-' ? getBeds(params).catch(() => ({ results: [] })) : Promise.resolve(null),
        ])
        if (cancelled) return
        const roomsArr = totalRooms === '-' ? (Array.isArray(roomsRes) ? roomsRes : (roomsRes?.results ?? [])) : null
        const bedsArr = totalBeds === '-' ? (Array.isArray(bedsRes) ? bedsRes : (bedsRes?.results ?? [])) : null

        if (roomsArr) {
          setLiveRooms(roomsArr.length)
          const active = roomsArr.filter(r => r.is_active).length
          const inactive = roomsArr.length - active
          setRoomBreakdown({ active, inactive })
        }
        if (bedsArr) {
          setLiveBeds(bedsArr.length)
          const counts = bedsArr.reduce((acc, b) => {
            acc[b.status] = (acc[b.status] || 0) + 1
            return acc
          }, {})
          setBedBreakdown({
            available: counts.available || 0,
            occupied: counts.occupied || 0,
            reserved: counts.reserved || 0,
            maintenance: counts.maintenance || 0,
          })
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || err.message || 'Failed to load floor stats')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [needFetch, floorId, totalRooms, totalBeds])

  const values = {
    floors: totalFloors,
    rooms: totalRooms === '-' ? (liveRooms ?? '-') : totalRooms,
    beds: totalBeds === '-' ? (liveBeds ?? '-') : totalBeds,
  }

  return (
    <div className={`grid [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] gap-3 sm:gap-4`}>
      <StatTile
        label={t('floors.rooms') || 'Rooms'}
        value={values.rooms}
        icon={FiGrid}
        color={scheme.accents?.amber?.text || 'text-amber-700'}
        bg={scheme.accents?.amber?.bg || 'bg-amber-50'}
        scheme={scheme}
        sub={[
          { label: 'Active', value: roomBreakdown.active },
          { label: 'Inactive', value: roomBreakdown.inactive },
          { label: 'Tenants', value: bedBreakdown.occupied, meta: true },
        ]}
      />
      <StatTile
        label={t('floors.beds') || 'Beds'}
        value={values.beds}
        icon={FiBox}
        color={scheme.accents?.emerald?.text || 'text-emerald-700'}
        bg={scheme.accents?.emerald?.bg || 'bg-emerald-50'}
        scheme={scheme}
        sub={[
          { label: 'Available', value: bedBreakdown.available },
          { label: 'Occupied', value: bedBreakdown.occupied },
          { label: 'Reserved', value: bedBreakdown.reserved },
          { label: 'Maint.', value: bedBreakdown.maintenance },
        ]}
      />
      {loading && (
        <div className="col-span-full text-sm text-gray-500">Loading stats…</div>
      )}
      {error && (
        <div className="col-span-full text-sm text-red-600">{error}</div>
      )}
    </div>
  )
}

export default FloorStats