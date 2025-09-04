import React, { useEffect, useState, useCallback } from 'react'
import heroImg from '../assets/react.svg'
import SectionHeader from '../components/dashboard/SectionHeader'
import OccupancyCard from '../components/dashboard/OccupancyCard'
import BookingsTrendCard from '../components/dashboard/BookingsTrendCard'
import CashflowCard from '../components/dashboard/CashflowCard'
import PaymentCard from '../components/dashboard/PaymentCard'
import RecentActivitiesCard from '../components/activities/RecentActivitiesCard'
import { listBookings } from '../services/bookings'
import { getBeds, getBuildings } from '../services/properties'
import api from '../services/api'
import { useTranslation } from 'react-i18next'
import { formatDateOnly } from '../utils/dateUtils'

const Dashboard = () => {
  const { t } = useTranslation()
  // Global building filter wiring (from Navbar)
  const [selectedBuildings, setSelectedBuildings] = useState([]) // array of string ids
  // Fallback: active buildings when no selection yet
  const [activeBuildingIds, setActiveBuildingIds] = useState([])

  // Dashboard data state
  const [bookingStatusCounts, setBookingStatusCounts] = useState([])
  const [bookingMonthlyTrends, setBookingMonthlyTrends] = useState([])
  const [bookingSources, setBookingSources] = useState([])
  const [bookingDaily, setBookingDaily] = useState([])
  const [occupancy, setOccupancy] = useState({ available: 0, occupied: 0, reserved: 0, maintenance: 0 })
  const [totalBedsShown, setTotalBedsShown] = useState(0)

  // Bookings Trend date range state
  const [bkRangeMode, setBkRangeMode] = useState('preset')
  const [bkPresetKey, setBkPresetKey] = useState('last30')
  const [bkStart, setBkStart] = useState('')
  const [bkEnd, setBkEnd] = useState('')

  // Helpers for human label used by the card
  const bkRangeLabel = (() => {
    if (bkRangeMode === 'preset') {
      const key = bkPresetKey || 'range'
      return t(`common.date_ranges.${key}`, key.replace(/_/g, ' '))
    }
    if (bkRangeMode === 'custom' && bkStart && bkEnd) return `${formatDateOnly(bkStart)} → ${formatDateOnly(bkEnd)}`
    return t('common.date_ranges.range')
  })()

  // Restore initial selection from localStorage and subscribe to navbar events
  useEffect(() => {
    try {
      const raw = localStorage.getItem('building_filter')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) setSelectedBuildings(arr.map(String))
      }
    } catch { }

    const onChange = (e) => {
      const arr = e?.detail?.selected
      if (Array.isArray(arr)) setSelectedBuildings(arr.map(String))
    }
    window.addEventListener('building-filter-change', onChange)
    return () => window.removeEventListener('building-filter-change', onChange)
  }, [])

  // Load active building IDs once (fallback when Navbar hasn't broadcast yet)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await getBuildings({ page_size: 1000, is_active: true })
        const list = Array.isArray(res) ? res : (res?.results || [])
        if (!alive) return
        setActiveBuildingIds(list.map((b) => String(b.id)))
      } catch {
        if (alive) setActiveBuildingIds([])
      }
    })()
    return () => { alive = false }
  }, [])

  // Use selected buildings if any, else fallback to active buildings
  const effectiveSelectedBuildings = (selectedBuildings?.length ? selectedBuildings : activeBuildingIds)
  const buildingLabel = effectiveSelectedBuildings.length ? effectiveSelectedBuildings.join(', ') : 'All'
  // For components that accept a single building (e.g., CashflowCard), scope only when exactly one is selected
  const singleBuildingId = effectiveSelectedBuildings.length === 1 ? effectiveSelectedBuildings[0] : undefined

  // Helpers for date boundaries
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

  // Fetch occupancy by aggregating Beds status across selected buildings
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const sel = Array.isArray(effectiveSelectedBuildings) ? effectiveSelectedBuildings.filter(Boolean) : []
        let bedsArrays = []
        if (sel.length === 0) {
          // No building filter -> fetch all (capped by page_size)
          const r = await getBeds({ page_size: 1000 })
          bedsArrays = [Array.isArray(r) ? r : (Array.isArray(r?.results) ? r.results : [])]
        } else if (sel.length === 1) {
          const r = await getBeds({ building: sel[0], page_size: 1000 })
          bedsArrays = [Array.isArray(r) ? r : (Array.isArray(r?.results) ? r.results : [])]
        } else {
          // Multiple buildings -> fetch each separately and merge
          const promises = sel.map((bid) => getBeds({ building: bid, page_size: 1000 }).catch(() => ({ results: [] })))
          const results = await Promise.all(promises)
          bedsArrays = results.map((r) => Array.isArray(r) ? r : (Array.isArray(r?.results) ? r.results : []))
        }
        const beds = bedsArrays.flat()

        let available = 0, occupied = 0, reserved = 0, maintenance = 0
        const norm = (s) => String(s || '').toLowerCase()
        for (const b of beds) {
          const st = norm(b?.status)
          const isOccupied = ['occupied', 'in_use', 'inuse', 'running', 'assigned', 'engaged'].includes(st)
          const isReserved = ['reserved', 'booked', 'hold', 'on_hold', 'blocked_for_booking', 'awaiting_checkin', 'confirmed'].includes(st)
          const isMaintenance = ['maintenance', 'repair', 'repairs', 'blocked', 'unavailable', 'out_of_service', 'oos', 'cleaning'].includes(st)
          const isAvailable = ['available', 'vacant', 'free', 'open', 'ready'].includes(st) || (!isOccupied && !isReserved && !isMaintenance)
          if (isOccupied) occupied += 1
          else if (isReserved) reserved += 1
          else if (isMaintenance) maintenance += 1
          else if (isAvailable) available += 1
        }
        if (!alive) return
        setOccupancy({ available, occupied, reserved, maintenance })
        setTotalBedsShown(available + occupied + reserved + maintenance)
      } catch (e) {
        if (!alive) return
        setOccupancy({ available: 0, occupied: 0, reserved: 0, maintenance: 0 })
        setTotalBedsShown(0)
      }
    }
    load()
    return () => { alive = false }
  }, [effectiveSelectedBuildings])

  // Fetch bookings to compute status counts (aggregated) with date range filter
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const sel = Array.isArray(effectiveSelectedBuildings) ? effectiveSelectedBuildings.filter(Boolean) : []
        let arrays = []
        if (sel.length === 0) {
          const rows = await listBookings({ page_size: 1000 })
          arrays = [Array.isArray(rows) ? rows : (rows?.results || [])]
        } else if (sel.length === 1) {
          const rows = await listBookings({ building: sel[0], page_size: 1000 })
          arrays = [Array.isArray(rows) ? rows : (rows?.results || [])]
        } else {
          const promises = sel.map((bid) => listBookings({ building: bid, page_size: 1000 }).catch(() => ({ results: [] })))
          const results = await Promise.all(promises)
          arrays = results.map((rows) => Array.isArray(rows) ? rows : (rows?.results || []))
        }
        let arr = arrays.flat()

        // Build date range boundaries
        const now = new Date()
        const todayStart = startOfDay(now).getTime()
        const todayEnd = endOfDay(now).getTime()
        const computeRange = () => {
          if (bkRangeMode === 'preset') {
            const y = now.getFullYear(); const m = now.getMonth(); const d = now.getDate()
            const presets = {
              today: { start: todayStart, end: todayEnd },
              yesterday: (() => { const s = startOfDay(new Date(y, m, d - 1)).getTime(); const e = endOfDay(new Date(y, m, d - 1)).getTime(); return { start: s, end: e } })(),
              last7: { start: startOfDay(new Date(y, m, d - 6)).getTime(), end: todayEnd },
              last15: { start: startOfDay(new Date(y, m, d - 14)).getTime(), end: todayEnd },
              last30: { start: startOfDay(new Date(y, m, d - 29)).getTime(), end: todayEnd },
              this_month: { start: startOfDay(new Date(y, m, 1)).getTime(), end: todayEnd },
              last_month: (() => { const s = startOfDay(new Date(y, m - 1, 1)).getTime(); const e = endOfDay(new Date(y, m, 0)).getTime(); return { start: s, end: e } })(),
              this_year: { start: startOfDay(new Date(y, 0, 1)).getTime(), end: todayEnd },
              last_year: (() => { const s = startOfDay(new Date(y - 1, 0, 1)).getTime(); const e = endOfDay(new Date(y - 1, 11, 31)).getTime(); return { start: s, end: e } })(),
            }
            return presets[bkPresetKey] || { start: startOfDay(new Date(y, m, d - 29)).getTime(), end: todayEnd }
          }
          if (bkRangeMode === 'custom' && bkStart && bkEnd) {
            const s = new Date(bkStart)
            const e = new Date(bkEnd)
            return { start: startOfDay(s).getTime(), end: endOfDay(e).getTime() }
          }
          return { start: startOfDay(new Date(y, m, d - 29)).getTime(), end: todayEnd }
        }
        const { start: rangeStart, end: rangeEnd } = computeRange()

        // Choose a timestamp for booking row to filter by
        const tsFor = (r) => {
          const fields = [
            r?.created_at,
            r?.booked_at,
            r?.start_date,
            r?.end_date,
            r?.updated_at,
          ]
          for (const v of fields) {
            if (!v) continue
            const t = new Date(v).getTime()
            if (!Number.isNaN(t)) return t
          }
          return NaN
        }

        arr = arr.filter((r) => {
          const t = tsFor(r)
          return Number.isFinite(t) && t >= rangeStart && t <= rangeEnd
        })

        // Normalize statuses for counts
        const mapStatus = (s) => {
          const x = String(s || '').toLowerCase()
          if (x === 'no_show') return 'pending'
          if (x === 'canceled') return 'cancelled'
          return x
        }
        const counts = { pending: 0, reserved: 0, confirmed: 0, cancelled: 0, converted: 0, checked_out: 0, other: 0 }
        for (const r of arr) {
          const k = mapStatus(r?.status)
          if (Object.prototype.hasOwnProperty.call(counts, k)) counts[k] += 1
          else counts.other += 1
        }
        if (alive) {
          const data = Object.entries(counts).map(([status, count]) => ({ status, count }))
          setBookingStatusCounts(data)
        }

        // Build Monthly trends (bookings & cancellations)
        const monthKey = (d) => {
          const dt = new Date(d)
          const y = dt.getFullYear()
          const m = dt.toLocaleString('default', { month: 'short' })
          return `${m} ${y}`
        }
        const monthlyMap = new Map()
        for (const r of arr) {
          const t = tsFor(r)
          if (!Number.isFinite(t)) continue
          const key = monthKey(t)
          const cur = monthlyMap.get(key) || { month: key, bookings: 0, cancellations: 0, revenue: 0 }
          cur.bookings += 1
          if (mapStatus(r?.status) === 'cancelled') cur.cancellations += 1
          monthlyMap.set(key, cur)
        }

        // Sources breakdown with simple conversion rate = (confirmed+converted)/total
        const srcMap = new Map()
        for (const r of arr) {
          const src = String(r?.source || 'other').toLowerCase()
          const m = mapStatus(r?.status)
          const cur = srcMap.get(src) || { source: src, bookings: 0, confirmed: 0 }
          cur.bookings += 1
          if (m === 'confirmed' || m === 'converted') cur.confirmed += 1
          srcMap.set(src, cur)
        }
        const sources = Array.from(srcMap.values()).map((s) => ({
          source: s.source,
          bookings: s.bookings,
          conversion: s.bookings ? Number(((s.confirmed / s.bookings) * 100).toFixed(1)) : 0,
        }))

        // Daily pattern by weekday (Mon..Sun)
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const dayMap = new Map(dayNames.map((n) => [n, { day: n, bookings: 0 }]))
        for (const r of arr) {
          const t = tsFor(r)
          if (!Number.isFinite(t)) continue
          const d = new Date(t).getDay()
          const key = dayNames[d]
          const cur = dayMap.get(key) || { day: key, bookings: 0 }
          cur.bookings += 1
          dayMap.set(key, cur)
        }
        // Order Mon..Sun
        const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((k) => dayMap.get(k) || { day: k, bookings: 0 })

        if (alive) {
          const monthly = Array.from(monthlyMap.values()).sort((a, b) => {
            // Sort by year then month
            const pa = a.month.split(' ')
            const pb = b.month.split(' ')
            const ya = Number(pa[1] || 0), yb = Number(pb[1] || 0)
            const ma = new Date(`${pa[0]} 1, ${ya}`).getMonth()
            const mb = new Date(`${pb[0]} 1, ${yb}`).getMonth()
            return ya === yb ? ma - mb : ya - yb
          })
          setBookingMonthlyTrends(monthly)
          setBookingSources(sources)
          setBookingDaily(orderedDays)
        }

      } catch (_) {
        if (alive) {
          setBookingStatusCounts([])
          setBookingMonthlyTrends([])
          setBookingSources([])
          setBookingDaily([])
        }
      }
    }
    load()
    return () => { alive = false }
  }, [effectiveSelectedBuildings, bkRangeMode, bkPresetKey, bkStart, bkEnd])

  // Cashflow fetcher that supports multi-building aggregation
  const cashflowFetcher = useCallback(async ({ presetKey, start, end, buildingId }) => {
    const paramsFor = (bid) => (
      presetKey
        ? { preset: presetKey, building_id: bid }
        : { start, end, building_id: bid }
    )

    const endpoint = '/dashboard/cashflow/'
    const sel = Array.isArray(effectiveSelectedBuildings) ? effectiveSelectedBuildings.filter(Boolean) : []

    // 0 or 1 building -> defer to backend single call
    if (sel.length <= 1) {
      const resp = await api.get(endpoint, { params: paramsFor(buildingId ? Number(buildingId) : undefined) })
      return resp.data
    }

    // Multiple buildings -> fetch each and merge
    const results = await Promise.all(sel.map((bid) => (
      api.get(endpoint, { params: paramsFor(Number(bid)) })
        .then(r => r.data)
        .catch(() => ({ monthly: [], categories: [], daily: [], daily_by_weekday: [] }))
    )))

    // Merge monthly by month key
    const monthlyMap = new Map()
    for (const data of results) {
      for (const row of (Array.isArray(data?.monthly) ? data.monthly : [])) {
        const key = row.month
        const cur = monthlyMap.get(key) || { month: key, income: 0, expenses: 0, net: 0 }
        cur.income += Number(row.income || 0)
        cur.expenses += Number(row.expenses || 0)
        cur.net += Number(row.net || 0)
        monthlyMap.set(key, cur)
      }
    }
    const monthly = Array.from(monthlyMap.values()).sort((a, b) => String(a.month).localeCompare(String(b.month)))

    // Merge categories by name
    const catMap = new Map()
    for (const data of results) {
      for (const row of (Array.isArray(data?.categories) ? data.categories : [])) {
        const key = row.name
        const cur = catMap.get(key) || { name: key, value: 0 }
        cur.value += Number(row.value || 0)
        catMap.set(key, cur)
      }
    }
    const categories = Array.from(catMap.values())

    // Merge daily by date/day key
    const dayMap = new Map()
    for (const data of results) {
      for (const row of (Array.isArray(data?.daily) ? data.daily : [])) {
        const key = row.date || row.day
        const cur = dayMap.get(key) || { date: key, amount: 0 }
        cur.amount += Number(row.amount || 0)
        dayMap.set(key, cur)
      }
    }
    const daily = Array.from(dayMap.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))

    // Merge Income vs Expenses by Weekday (Mon..Sun)
    const wdOrder = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    const wdMap = new Map(wdOrder.map((w) => [w, { weekday: w, income: 0, expenses: 0 }]))
    for (const data of results) {
      const arr = Array.isArray(data?.daily_by_weekday) ? data.daily_by_weekday : []
      for (const row of arr) {
        const raw = row?.weekday
        if (!raw) continue
        const key3 = String(raw).slice(0,3)
        const proper = wdOrder.find((w) => w.toLowerCase() === key3.toLowerCase())
        if (!proper) continue
        const cur = wdMap.get(proper) || { weekday: proper, income: 0, expenses: 0 }
        const inc = Number(row?.income || 0)
        const exp = Number(row?.expenses || 0)
        cur.income += Number.isFinite(inc) ? inc : 0
        cur.expenses += Number.isFinite(exp) ? exp : 0
        wdMap.set(proper, cur)
      }
    }
    const daily_by_weekday = wdOrder.map((w) => ({
      weekday: w,
      income: Number(wdMap.get(w)?.income || 0),
      expenses: Number(wdMap.get(w)?.expenses || 0),
    }))

    return { monthly, categories, daily, daily_by_weekday }
  }, [effectiveSelectedBuildings])

  return (
    <div className="space-y-4 px-1 sm:px-2 md:px-4 max-w-screen-2xl mx-auto w-full">
      <SectionHeader
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch">
        {/* Occupancy: compact, keep single column on md/xl */}
        <div className="md:col-span-1 h-full min-w-0">
          <OccupancyCard selectedBuildings={effectiveSelectedBuildings} occupancy={occupancy} totalBedsShown={totalBedsShown} className="h-full" />
        </div>

        {/* Payments summary */}
        <div className="md:col-span-1 h-full min-w-0">
          <PaymentCard
            selectedBuildings={effectiveSelectedBuildings}
            buildingLabel={buildingLabel}
            className="h-full"
          />
        </div>
        {/* Bed availability moved to standalone page at /bed-availability */}
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full items-stretch'>
        {/* Bookings Trend: side-by-side with Cashflow on lg; full width on xl */}
        <div className="min-w-0 h-full">
          <BookingsTrendCard
            className="h-full"
            selectedBuildings={effectiveSelectedBuildings}
            buildingLabel={buildingLabel}
            bookingStatusCounts={bookingStatusCounts}
            bookingMonthlyTrends={bookingMonthlyTrends}
            bookingSources={bookingSources}
            bookingDaily={bookingDaily}
            // Range wiring for BookingsTrendCard
            rangeLabel={bkRangeLabel}
            rangeMode={bkRangeMode}
            presetKey={bkPresetKey}
            customStart={bkStart}
            customEnd={bkEnd}
            setRangeMode={setBkRangeMode}
            setPresetKey={setBkPresetKey}
            setCustomStart={setBkStart}
            setCustomEnd={setBkEnd}
          />
        </div>

        {/* Cashflow: side-by-side with Bookings on lg; full width on xl */}
        <div className="min-w-0 h-full">
          <CashflowCard className="h-full" buildingId={singleBuildingId ? Number(singleBuildingId) : undefined} fetcher={cashflowFetcher} />
        </div>
      </div>
      {/* Recent Activities */}
      <div>
        <RecentActivitiesCard
          selectedBuildings={effectiveSelectedBuildings}
          title={`Recent activity`}
          maxItems={25}
          debug={true}
        />
      </div>
    </div>
  )
}

export default Dashboard