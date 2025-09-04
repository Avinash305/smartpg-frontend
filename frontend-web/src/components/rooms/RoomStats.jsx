import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiBox, FiUsers } from 'react-icons/fi'
import { getBeds } from '../../services/properties'

const StatTile = ({ label, value, icon: Icon, color = 'text-indigo-600', bg = 'bg-indigo-50', sub = null }) => (
  <div className={`p-4 rounded-lg border border-gray-200 ${bg} flex items-center gap-3`}>
    <div className={`h-10 w-10 rounded-md flex items-center justify-center ${bg} ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <div className="text-2xl font-semibold text-gray-900">{value ?? '-'}</div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      {sub && (
        <div className="mt-1 text-[11px] text-gray-600 flex flex-wrap gap-x-3 gap-y-0.5">
          {sub.map((s) => (
            <span key={s.label}><span className="text-gray-500">{s.label}:</span> {s.value ?? 0}</span>
          ))}
        </div>
      )}
    </div>
  </div>
)

const RoomStats = ({ roomId = null, room = null }) => {
  const { t } = useTranslation()
  const tr = (k, f, opt) => t(k, { defaultValue: f, ...(opt || {}) })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bedsCount, setBedsCount] = useState(undefined)
  const [bedBreakdown, setBedBreakdown] = useState({ available: undefined, occupied: undefined, reserved: undefined, maintenance: undefined })

  const capacity = room?.capacity ?? '-'

  const needFetch = useMemo(() => !!roomId, [roomId])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!needFetch) return
      setLoading(true)
      setError('')
      try {
        const params = { room: roomId, page_size: 1000 }
        const res = await getBeds(params).catch(() => ({ results: [] }))
        if (cancelled) return
        const bedsArr = Array.isArray(res) ? res : (res?.results ?? [])
        setBedsCount(bedsArr.length)
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
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || err.message || 'Failed to load room stats')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [needFetch, roomId])

  const occupied = bedBreakdown.occupied ?? (typeof room?.occupied_beds === 'number' ? room.occupied_beds : undefined)
  const utilization = (typeof occupied === 'number' && typeof capacity === 'number') ? `${occupied}/${capacity}` : '-'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">  
      <StatTile
        label="Beds"
        value={bedsCount ?? (typeof room?.beds_count === 'number' ? room.beds_count : '-')}
        icon={FiBox}
        color="text-emerald-600"
        bg="bg-emerald-50"
        sub={[
          { label: tr('rooms.available', 'Available'), value: bedBreakdown.available },
          { label: tr('rooms.occupied', 'Occupied'), value: bedBreakdown.occupied },
          { label: tr('rooms.reserved', 'Reserved'), value: bedBreakdown.reserved },
          { label: tr('rooms.maintenance', 'Maintenance'), value: bedBreakdown.maintenance },
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

export default RoomStats