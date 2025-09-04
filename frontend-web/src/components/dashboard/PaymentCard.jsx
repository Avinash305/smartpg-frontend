import React, { useEffect, useMemo, useState } from 'react'
import { Card } from '../ui/Card'
import { useColorScheme } from '../../theme/colorSchemes'
import { getPaymentsMerged, getInvoices } from '../../services/payments'
import DateRangeMenu from '../filters/DateRangeMenu'
import { CreditCard, Calendar, Clock, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../../utils/dateUtils'

export default function PaymentCard({
  title = 'Payments',
  selectedBuildings = [],
  buildingLabel = 'All',
  scheme,
  className = '',
}) {
  const colors = useColorScheme(scheme)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Date range state for filtering the recent list
  const [range, setRange] = useState({ mode: 'preset', presetKey: 'last30' })
  // Dues KPIs
  const [duesCounts, setDuesCounts] = useState({ pending: 0, overdue: 0, next3: 0, next7: 0 })
  const [duesSums, setDuesSums] = useState({ overdueAmount: 0, upcoming3Amount: 0, upcoming7Amount: 0, pendingAmount: 0 })

  useEffect(() => {
    let alive = true
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        // Normalize selected buildings to numeric ids
        const sel = Array.isArray(selectedBuildings)
          ? selectedBuildings
              .filter(Boolean)
              .map((b) => {
                const v = (b && typeof b === 'object') ? (b.id ?? b.pk ?? b.value ?? b.key ?? b.building_id ?? b.property_id ?? b) : b
                const n = Number(v)
                return Number.isNaN(n) ? null : n
              })
              .filter((n) => n != null)
          : []

        let params = { page_size: 1000 }
        if (sel.length === 1) params.building = sel[0]
        else if (sel.length > 1) params['building__in'] = sel.join(',')

        const data = await getPaymentsMerged(params)
        const list = Array.isArray(data) ? data : (data?.results || [])
        if (alive) setPayments(list)
      } catch (e) {
        if (alive) {
          setPayments([])
          setError('Failed to load payments')
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [selectedBuildings])

  // Fetch open invoices and compute dues KPIs
  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        // Normalize selected buildings to numeric ids
        const sel = Array.isArray(selectedBuildings)
          ? selectedBuildings
              .filter(Boolean)
              .map((b) => {
                const v = (b && typeof b === 'object') ? (b.id ?? b.pk ?? b.value ?? b.key ?? b.building_id ?? b.property_id ?? b) : b
                const n = Number(v)
                return Number.isNaN(n) ? null : n
              })
              .filter((n) => n != null)
          : []

        let invoices = []
        if (sel.length === 0) {
          const resp = await getInvoices({ pending: true, page_size: 1000 })
          invoices = Array.isArray(resp) ? resp : (resp?.results || [])
        } else if (sel.length === 1) {
          const resp = await getInvoices({ pending: true, building: sel[0], building_id: sel[0], page_size: 1000 })
          invoices = Array.isArray(resp) ? resp : (resp?.results || [])
          // If backend doesn't filter as expected, fallback to client filtering
          if (!invoices.length) {
            const allResp = await getInvoices({ pending: true, page_size: 1000 })
            const all = Array.isArray(allResp) ? allResp : (allResp?.results || [])
            const normId = (v) => (v && typeof v === 'object' ? (v.id ?? v.pk ?? v.value ?? v.key ?? null) : v)
            const invoiceBuildingId = (inv) => (
              inv?.building_id ??
              normId(inv?.building) ??
              inv?.booking?.building_id ??
              inv?.tenant?.building_id ??
              inv?.property_id ??
              normId(inv?.property) ??
              inv?.booking?.property_id ??
              null
            )
            const target = String(sel[0])
            invoices = all.filter((inv) => String(invoiceBuildingId(inv)) === target)
          }
        } else {
          const resp = await getInvoices({ pending: true, building__in: sel.join(','), page_size: 1000 })
          invoices = Array.isArray(resp) ? resp : (resp?.results || [])
        }

        // Compute KPIs
        const now = new Date()
        const end3 = new Date(now); end3.setDate(end3.getDate() + 3); end3.setHours(23,59,59,999)
        const end7 = new Date(now); end7.setDate(end7.getDate() + 7); end7.setHours(23,59,59,999)
        const todayStart = new Date(now); todayStart.setHours(0,0,0,0)

        const balance = (inv) => Number(
          inv?.balance_due ?? inv?.amount_due ?? inv?.total_due ?? inv?.balance ?? inv?.outstanding ?? inv?.outstanding_amount ?? 0
        ) || 0
        const parseDue = (inv) => {
          // Only consider actual due fields for classifying overdue/upcoming.
          // If no due date, treat as pending-without-deadline (counted in pending only).
          const s = inv?.due_date || inv?.expected_payment_date || inv?.payment_due_date || inv?.due_on || inv?.due
          const d = s ? new Date(s) : null
          return d && !Number.isNaN(d.getTime()) ? d : null
        }

        let pending = 0, overdue = 0, next3 = 0, next7 = 0
        let overdueAmount = 0, upcoming3Amount = 0, upcoming7Amount = 0, pendingAmount = 0
        for (const inv of invoices) {
          const bal = balance(inv)
          if (bal <= 0) continue
          const due = parseDue(inv)
          if (due && due < todayStart) { overdue += 1; overdueAmount += bal; continue }
          pending += 1; pendingAmount += bal
          if (due && due >= todayStart && due <= end3) { next3 += 1; upcoming3Amount += bal }
          if (due && due >= todayStart && due <= end7) { next7 += 1; upcoming7Amount += bal }
        }
        if (alive) {
          setDuesCounts({ pending, overdue, next3, next7 })
          setDuesSums({ overdueAmount, upcoming3Amount, upcoming7Amount, pendingAmount })
        }
      } catch (_) {
        if (alive) {
          setDuesCounts({ pending: 0, overdue: 0, next3: 0, next7: 0 })
          setDuesSums({ overdueAmount: 0, upcoming3Amount: 0, upcoming7Amount: 0, pendingAmount: 0 })
        }
      }
    }
    run()
    return () => { alive = false }
  }, [selectedBuildings])

  // Helpers
  const toTime = (v) => {
    if (!v) return NaN
    try { return new Date(v).getTime() } catch { return NaN }
  }
  const todayBounds = useMemo(() => {
    const now = new Date()
    const s = new Date(now); s.setHours(0,0,0,0)
    const e = new Date(now); e.setHours(23,59,59,999)
    return { start: s.getTime(), end: e.getTime(), now }
  }, [])

  const amt = (p) => Number(p?.amount || 0)
  const ts = (p) => toTime(p?.received_at || p?.paid_on || p?.updated_at || p?.created_at)

  // Compute current filter range from DateRangeMenu value
  const currentRange = useMemo(() => {
    const now = new Date()
    const todayStart = (() => { const d = new Date(now); d.setHours(0,0,0,0); return d.getTime() })()
    const todayEnd = (() => { const d = new Date(now); d.setHours(23,59,59,999); return d.getTime() })()
    if (range?.mode === 'preset') {
      const y = now.getFullYear(); const m = now.getMonth(); const d = now.getDate()
      const presets = {
        today: { start: todayStart, end: todayEnd, label: 'Today' },
        yesterday: (() => { const s = new Date(y, m, d - 1); s.setHours(0,0,0,0); const e = new Date(y, m, d - 1); e.setHours(23,59,59,999); return { start: s.getTime(), end: e.getTime(), label: 'Yesterday' } })(),
        last7: { start: (() => { const s = new Date(y, m, d - 6); s.setHours(0,0,0,0); return s.getTime() })(), end: todayEnd, label: 'Last 7 days' },
        last15: { start: (() => { const s = new Date(y, m, d - 14); s.setHours(0,0,0,0); return s.getTime() })(), end: todayEnd, label: 'Last 15 days' },
        last30: { start: (() => { const s = new Date(y, m, d - 29); s.setHours(0,0,0,0); return s.getTime() })(), end: todayEnd, label: 'Last 30 days' },
        this_month: { start: (() => { const s = new Date(y, m, 1); s.setHours(0,0,0,0); return s.getTime() })(), end: todayEnd, label: 'This month' },
        last_month: (() => { const s = new Date(y, m - 1, 1); s.setHours(0,0,0,0); const e = new Date(y, m, 0); e.setHours(23,59,59,999); return { start: s.getTime(), end: e.getTime(), label: 'Last month' } })(),
        this_year: { start: (() => { const s = new Date(y, 0, 1); s.setHours(0,0,0,0); return s.getTime() })(), end: todayEnd, label: 'This year' },
        last_year: (() => { const s = new Date(y - 1, 0, 1); s.setHours(0,0,0,0); const e = new Date(y - 1, 11, 31); e.setHours(23,59,59,999); return { start: s.getTime(), end: e.getTime(), label: 'Last year' } })(),
      }
      return presets[range?.presetKey] || presets.last30
    }
    if (range?.mode === 'custom' && range?.start && range?.end) {
      const s = new Date(range.start); s.setHours(0,0,0,0)
      const e = new Date(range.end); e.setHours(23,59,59,999)
      return { start: s.getTime(), end: e.getTime(), label: `${range.start} → ${range.end}` }
    }
    // default fallback
    const s = new Date(now); s.setDate(now.getDate() - 29); s.setHours(0,0,0,0)
    return { start: s.getTime(), end: todayEnd, label: 'Last 30 days' }
  }, [range])

  // Aggregations
  const totals = useMemo(() => {
    let today = 0, todayCount = 0
    let rangeTotal = 0, rangeCount = 0
    for (const p of payments) {
      const t = ts(p)
      if (!Number.isFinite(t)) continue
      if (t >= todayBounds.start && t <= todayBounds.end) { today += amt(p); todayCount += 1 }
      if (t >= currentRange.start && t <= currentRange.end) { rangeTotal += amt(p); rangeCount += 1 }
    }
    return { today, total: rangeTotal, todayCount, totalCount: rangeCount }
  }, [payments, todayBounds, currentRange])

  return (
    <Card
      title={title}
      actions={(
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-gray-500">{currentRange.label}</span>
          <DateRangeMenu value={range} onChange={setRange} compactTrigger align="right" />
        
        </div>
      )}
      padding="sm"
      className={className}
    >
      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Link to="/payments" className="block">
          <div className="bg-white p-3 rounded-lg shadow hover:ring-2 hover:ring-blue-200 transition">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <CreditCard className={`${colors?.accents?.emerald?.icon || 'text-green-600'}`} size={18} />
                <h4 className="text-gray-600 text-xs">Today's Collections</h4>
              </div>
            </div>
            <p className={`text-xl font-bold leading-tight ${colors?.accents?.emerald?.value || 'text-emerald-700'}`}>{formatCurrency(totals.today)}</p>
            <p className="text-gray-500 text-xs">{totals.todayCount.toLocaleString('en-IN')} payments</p>
          </div>
        </Link>
        <Link to="/payments" className="block">
          <div className="bg-white p-3 rounded-lg shadow hover:ring-2 hover:ring-blue-200 transition">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Calendar className={`${colors?.accents?.indigo?.icon || 'text-blue-500'}`} size={18} />
                <h4 className="text-gray-600 text-xs">{currentRange.label} Collections</h4>
              </div>
            </div>
            <p className={`text-xl font-bold leading-tight ${colors?.accents?.indigo?.value || 'text-indigo-700'}`}>{formatCurrency(totals.total)}</p>
            <p className="text-gray-500 text-xs">{totals.totalCount.toLocaleString('en-IN')} payments</p>
          </div>
        </Link>
      </div>

      {/* Dues KPIs */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <Link to="/notifications?tab=pending" className="block">
          <div className="bg-white p-3 rounded-lg shadow hover:ring-2 hover:ring-blue-200 transition">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Clock className={`${colors?.kpi?.pending?.icon || 'text-orange-500'}`} size={18} />
                <h4 className="text-gray-600 text-xs">Pending Dues</h4>
              </div>
            </div>
            <p className={`text-xl font-bold leading-tight ${colors?.kpi?.pending?.value || 'text-orange-600'}`}>{formatCurrency(duesSums.pendingAmount)}</p>
            <p className="text-gray-500 text-xs">{duesCounts.pending.toLocaleString('en-IN')} invoices</p>
          </div>
        </Link>
        <Link to="/notifications?tab=overdue" className="block">
          <div className="bg-white p-3 rounded-lg shadow hover:ring-2 hover:ring-blue-200 transition">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <AlertCircle className={`${colors?.kpi?.overdue?.icon || 'text-red-600'}`} size={18} />
                <h4 className="text-gray-600 text-xs">Overdue Dues</h4>
              </div>
            </div>
            <p className={`text-xl font-bold leading-tight ${colors?.kpi?.overdue?.value || 'text-red-700'}`}>{formatCurrency(duesSums.overdueAmount)}</p>
            <p className="text-gray-500 text-xs">{duesCounts.overdue.toLocaleString('en-IN')} invoices</p>
          </div>
        </Link>
        <Link to="/notifications?tab=next3" className="block">
          <div className="bg-white p-3 rounded-lg shadow hover:ring-2 hover:ring-blue-200 transition">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Calendar className={`${colors?.kpi?.upcoming3?.icon || 'text-blue-500'}`} size={18} />
                <h4 className="text-gray-600 text-xs">Due Next 3 Days</h4>
              </div>
            </div>
            <p className={`text-xl font-bold leading-tight ${colors?.kpi?.upcoming3?.value || 'text-sky-700'}`}>{formatCurrency(duesSums.upcoming3Amount)}</p>
            <p className="text-gray-500 text-xs">{duesCounts.next3.toLocaleString('en-IN')} invoices</p>
          </div>
        </Link>
        <Link to="/notifications?tab=next7" className="block">
          <div className="bg-white p-3 rounded-lg shadow hover:ring-2 hover:ring-blue-200 transition">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Calendar className={`${colors?.kpi?.upcoming7?.icon || 'text-blue-500'}`} size={18} />
                <h4 className="text-gray-600 text-xs">Due Next 7 Days</h4>
              </div>
            </div>
            <p className={`text-xl font-bold leading-tight ${colors?.kpi?.upcoming7?.value || 'text-teal-700'}`}>{formatCurrency(duesSums.upcoming7Amount)}</p>
            <p className="text-gray-500 text-xs">{duesCounts.next7.toLocaleString('en-IN')} invoices</p>
          </div>
        </Link>
      </div>
    </Card>
  )
}