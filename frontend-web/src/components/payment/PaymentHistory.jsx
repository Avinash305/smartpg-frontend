import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getPaymentsMerged } from '../../services/payments'
import { getInvoice } from '../../services/payments'
import { SortableTable } from '../ui/SortableTable'
import Pagination from '../ui/Paginations'
import Modal from '../ui/Modal'
import { Button, PermissionButton } from '../ui/Button'
import PaymentForm from './PaymentForm'
import PaymentDetails from './PaymentDetails'
import SearchInput from '../ui/SearchInput'
import AsyncGuard from '../common/AsyncGuard'
import { useCan } from '../../context/AuthContext'
import { DatePicker as UIDatePicker } from '../ui/DatePicker'
import Select from '../ui/Select'
import { formatDateTime, formatCurrency } from '../../utils/dateUtils'

const formatUser = (u) => {
  if (!u) return 'N/A'
  const toStr = (v) => (typeof v === 'string' ? v.trim() : '')
  if (typeof u === 'object') {
    const name = toStr(u.name)
    const email = toStr(u.email)
    const username = toStr(u.username)
    if (name) return name
    if (email) return email.split('@')[0] || email
    if (username) return username
    if (u.id != null) return String(u.id)
    return 'N/A'
  }
  return String(u)
}

// Best-effort tenant extractors (payment may come from different sources)
const tenantNameFromPayment = (row) => {
  const pickStr = (v) => (typeof v === 'string' ? v.trim() : '')
  const tryObj = (t) => {
    if (!t || typeof t !== 'object') return ''
    const name = pickStr(t.name) || pickStr(t.full_name) || `${pickStr(t.first_name)} ${pickStr(t.last_name)}`.trim()
    const email = pickStr(t.email)
    const username = pickStr(t.username)
    if (name) return name
    if (email) return email.split('@')[0] || email
    if (username) return username
    return ''
  }
  const candidates = [
    row?.tenant,
    row?.tenant_name,
    row?.tenant_details,
    row?.tenantInfo,
    // nested under invoice if available
    (row?.invoice && typeof row.invoice === 'object' ? (row.invoice?.tenant || row.invoice?.tenant_details) : null),
  ]
  for (const c of candidates) {
    if (!c) continue
    if (typeof c === 'string') {
      const s = pickStr(c)
      if (s) return s.includes('@') ? (s.split('@')[0] || s) : s
    }
    const nm = tryObj(c)
    if (nm) return nm
  }
  return '—'
}

const tenantPhoneFromPayment = (row) => {
  const pickPhone = (obj) => {
    if (!obj || typeof obj !== 'object') return ''
    const keys = ['phone', 'phone_number', 'mobile', 'mobile_number', 'contact', 'contact_number']
    for (const k of keys) {
      const v = obj?.[k]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return ''
  }
  const candidates = [
    row?.tenant,
    row?.tenant_details,
    row?.tenantInfo,
    (row?.invoice && typeof row.invoice === 'object' ? (row.invoice?.tenant || row.invoice?.tenant_details) : null),
  ]
  for (const c of candidates) {
    const p = pickPhone(c)
    if (p) return p
  }
  return ''
}

// Date range helpers
const now = () => new Date()
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x }
const endOfDay = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x }
const startOfMonth = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0,0,0,0); return x }
const endOfMonth = (d) => { const x = new Date(d.getFullYear(), d.getMonth() + 1, 0); x.setHours(23,59,59,999); return x }
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const startOfYear = (d) => { const x = new Date(d.getFullYear(), 0, 1); x.setHours(0,0,0,0); return x }
const endOfYear = (d) => { const x = new Date(d.getFullYear(), 11, 31); x.setHours(23,59,59,999); return x }

const getRange = (key) => {
  const today = now()
  switch (key) {
    case 'today':
      return { label: 'Today', start: startOfDay(today), end: endOfDay(today) }
    case 'last_7': {
      const end = endOfDay(today)
      const start = startOfDay(addDays(today, -6))
      return { label: 'Last 7 days', start, end }
    }
    case 'this_month': {
      const start = startOfMonth(today)
      const end = endOfDay(today)
      return { label: 'This month', start, end }
    }
    case 'last_month': {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      return { label: 'Last month', start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
    }
    case 'this_year': {
      return { label: 'This year', start: startOfYear(today), end: endOfYear(today) }
    }
    case 'last_year': {
      const last = new Date(today.getFullYear() - 1, 0, 1)
      return { label: 'Last year', start: startOfYear(last), end: endOfYear(last) }
    }
    case 'last_30': {
      const end = endOfDay(today)
      const start = startOfDay(addDays(today, -29))
      return { label: 'Last 30 days', start, end }
    }
    case 'last_90': {
      const end = endOfDay(today)
      const start = startOfDay(addDays(today, -89))
      return { label: 'Last 90 days', start, end }
    }
    case 'all':
    default:
      return { label: 'All time', start: null, end: null }
  }
}

const PaymentHistory = ({ tenantId, bookingId, buildings, limit = 10, className = '' }) => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  // Date range state
  const [dateRangeKey, setDateRangeKey] = useState('all')
  const [dateFrom, setDateFrom] = useState(null)
  const [dateTo, setDateTo] = useState(null)
  // Sorting state
  const [sortBy, setSortBy] = useState('received_at')
  const [order, setOrder] = useState('desc')

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(limit || 10)

  // local refresh trigger
  const [refreshTick, setRefreshTick] = useState(0)

  // modal/edit state
  const [showEdit, setShowEdit] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  // details modal state
  const [showDetails, setShowDetails] = useState(false)
  const [detailsPayment, setDetailsPayment] = useState(null)

  const { can } = useCan()

  // Stabilize buildings dep; parents sometimes pass a new array each render
  const buildingsKey = useMemo(() => (
    Array.isArray(buildings) && buildings.length > 0 ? buildings.join(',') : ''
  ), [buildings])

  const params = useMemo(() => {
    const p = {}
    if (tenantId) p.tenant = tenantId
    if (bookingId) p.booking = bookingId
    // `getPaymentsMerged` returns a merged array; we do client-side pagination
    // Still pass page_size hint in case backend improves in future
    if (limit) p.page_size = limit
    // Pass building filters to backend if available
    if (Array.isArray(buildings) && buildings.length > 0) {
      p['building__in'] = buildings.join(',')
    }
    return p
  }, [tenantId, bookingId, limit, refreshTick, buildingsKey])

  // Extract a building id from a payment row (best-effort across shapes)
  const getBuildingId = (row) => {
    // Prefer invoice if enriched
    const inv = row?.invoice
    const fromInv = (() => {
      if (!inv) return null
      // if number/string, no nested info
      if (typeof inv !== 'object') return null
      // Try nested booking/property/building shapes
      const b = inv.booking || inv.reservation || inv.allocation || inv.booking_detail || inv.bookingInfo || {}
      const buildingObj = b.building || b.property || inv.building || inv.property || {}
      const prop = inv.property || inv.org || inv.organization || {}
      // Accept common id spellings
      const candidates = [
        b.building_id, b.property_id, b.buildingId, b.propertyId,
        buildingObj?.id, prop?.id, inv.building_id, inv.property_id, inv.buildingId, inv.propertyId,
      ]
      for (const c of candidates) {
        const n = Number(c)
        if (!Number.isNaN(n) && n > 0) return n
      }
      return null
    })()
    if (fromInv) return Number(fromInv)
    // Direct fields on payment (from payments or bookings fallback)
    const directCandidates = [
      row?.building_id, row?.property_id, row?.buildingId, row?.propertyId, row?.building, row?.property,
      // Sometimes nested under booking on payment rows
      row?.booking?.building_id, row?.booking?.property_id, row?.booking?.buildingId, row?.booking?.propertyId,
    ]
    for (const c of directCandidates) {
      const n = Number(c)
      if (!Number.isNaN(n) && n > 0) return n
      if (c && typeof c === 'object' && c.id != null) {
        const n2 = Number(c.id)
        if (!Number.isNaN(n2) && n2 > 0) return n2
      }
    }
    return null
  }

  const renderInvoice = (inv) => {
    if (!inv) return '—'
    if (typeof inv === 'object') {
      // Try common fields
      if (inv.number) return inv.number
      if (inv.id) return `#${inv.id}`
      return JSON.stringify(inv)
    }
    return String(inv)
  }

  // Columns config for SortableTable (placed before filtering/sorting so it's available)
  const columns = useMemo(() => ([
    { key: 'id', Header: 'Payment ID', sortable: true, accessor: (row) => row.id, Cell: ({ value, row }) => (
      <button
        className="text-indigo-600 hover:underline cursor-pointer font-bold hover:scale-110"
        onClick={(e) => { e.stopPropagation?.(); setDetailsPayment(row); setShowDetails(true) }}
        title={`View details for ID# ${value}`}
      >
        ID# {value}
      </button>
    ) },
    { key: 'tenant', Header: 'Tenant', sortable: false, accessor: (row) => row, Cell: ({ value: row }) => {
      const name = tenantNameFromPayment(row)
      const phone = tenantPhoneFromPayment(row)
      return (
        <div className="leading-tight">
          <div className="text-gray-900">{name}</div>
          {phone ? <div className="text-[11px] text-gray-500">{phone}</div> : null}
        </div>
      )
    } },
    { key: 'amount', Header: 'Amount', sortable: true, accessor: (row) => Number(row.amount || 0), Cell: ({ value }) => formatCurrency(value, 'INR') },
    { key: 'method', Header: 'Method', sortable: true, accessor: (row) => (row?.method ? String(row.method).toUpperCase() : '—') },
    { key: 'invoice', Header: 'Invoice ID', sortable: false, accessor: (row) => row.invoice, Cell: ({ value }) => renderInvoice(value) },
    { key: 'updated_at', Header: 'Updated At', sortable: true, accessor: (row) => row.updated_at, Cell: ({ value }) => formatDateTime(value) },
    { 
      key: 'actions',
      Header: 'Actions',
      sortable: false,
      accessor: (row) => row,
      Cell: ({ value: row }) => {
        const buildingId = getBuildingId(row)
        const isPaymentsSource = (row?._source || 'payments') === 'payments'
        if (!isPaymentsSource) {
          return (
            <div className="flex">
              <Button
                size="xs"
                variant="outline"
                className="border-none opacity-50 cursor-not-allowed"
                disabled
                title="Edit not available for legacy/booking payments"
              >
                Edit
              </Button>
            </div>
          )
        }
        return (
          <div className="flex">
            <PermissionButton
              module="payments"
              action="edit"
              scopeId={buildingId || 'global'}
              size="xs"
              variant="outline"
              className="border-none"
              reason={'You do not have permission to edit payments for this building'}
              denyMessage={'Permission denied: cannot edit payments for this building'}
              onClick={() => { setEditingPayment(row); setShowEdit(true) }}
            >
              Edit
            </PermissionButton>
          </div>
        )
      },
    },
  ]), [])

  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        setLoading(true)
        setError('')
        const results = await getPaymentsMerged(params)
        if (!alive) return

        // Enrich: fetch invoice objects for rows that only have invoice id (to derive tenant name/phone)
        const rows = Array.isArray(results) ? results : (results?.results || [])
        const invoiceIds = new Set()
        for (const r of rows) {
          const inv = r?.invoice
          if (inv && (typeof inv !== 'object')) {
            invoiceIds.add(inv)
          }
        }

        let invoiceMap = {}
        if (invoiceIds.size > 0) {
          // Limit concurrent fetches to avoid overloading backend
          const cap = (Array.isArray(buildings) && buildings.length > 0) ? 200 : 25
          const ids = Array.from(invoiceIds).slice(0, cap) // higher cap when filtering by building
          try {
            const fetched = await Promise.all(ids.map(async (id) => {
              try { return [id, await getInvoice(id)] } catch (_) { return [id, null] }
            }))
            invoiceMap = Object.fromEntries(fetched)
          } catch (_) { /* ignore enrichment errors */ }
        }

        const enriched = rows.map(r => {
          const inv = r?.invoice
          if (inv && typeof inv !== 'object') {
            const full = invoiceMap[inv]
            if (full) return { ...r, invoice: full }
          }
          return r
        })

        setItems(enriched)
        setPage(1) // reset to first page on new fetch
      } catch (e) {
        if (alive) setError(e?.response?.data?.detail || 'Failed to load payment history')
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [params])

  // Client-side filter (by buildings first, then query)
  const filteredItems = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    // If we already sent building__in to backend, trust server filter and skip client-side building filter
    const serverPrefiltered = Array.isArray(buildings) && buildings.length > 0
    const base = serverPrefiltered ? (items || []) : (
      (Array.isArray(buildings) && buildings.length > 0)
        ? (items || []).filter((row) => {
            const bid = getBuildingId(row)
            return bid != null && buildings.includes(Number(bid))
          })
        : (items || [])
    )

    // Apply date range filter (received_at primary, fallback updated_at)
    let { start, end } = getRange(dateRangeKey)
    if (dateRangeKey === 'custom') {
      start = dateFrom ? startOfDay(new Date(dateFrom)) : null
      end = dateTo ? endOfDay(new Date(dateTo)) : null
    }
    const inRange = (row) => {
      if (!start && !end) return true
      const raw = row?.received_at || row?.updated_at
      if (!raw) return false
      const ts = new Date(raw).getTime()
      if (Number.isNaN(ts)) return false
      if (start && ts < start.getTime()) return false
      if (end && ts > end.getTime()) return false
      return true
    }
    const afterDate = base.filter(inRange)

    if (!q) return afterDate
    const asDate = (s) => {
      const d = s ? new Date(s) : null
      return d && !isNaN(d) ? d.toLocaleDateString() : ''
    }
    return afterDate.filter((row) => {
      const id = String(row?.id ?? '').toLowerCase()
      const amt = String(row?.amount ?? '').toLowerCase()
      const method = String(row?.method ?? '').toLowerCase()
      const status = String(row?.status ?? row?.payment_status ?? '').toLowerCase()
      const inv = row?.invoice
      const invStr = typeof inv === 'object' ? (inv.number || inv.id || '') : (inv || '')
      const invoiceTxt = String(invStr).toLowerCase()
      const name = tenantNameFromPayment(row).toLowerCase()
      const phone = tenantPhoneFromPayment(row).toLowerCase()
      const rcv = asDate(row?.received_at)
      const upd = asDate(row?.updated_at)
      const hay = [id, amt, method, status, invoiceTxt, name, phone, rcv, upd].join(' ')
      return hay.includes(q)
    })
  }, [items, query, buildingsKey, dateRangeKey, dateFrom, dateTo])

  // Client-side sort
  const sortedItems = useMemo(() => {
    if (!filteredItems?.length || !sortBy) return filteredItems || []
    const col = columns.find(c => (c.key || c.accessor) === sortBy)
    const getVal = (row) => {
      const acc = col?.accessor
      const v = typeof acc === 'function' ? acc(row) : row[acc] ?? row[col?.key]
      return v
    }
    const arr = [...filteredItems]
    arr.sort((a, b) => {
      const va = getVal(a)
      const vb = getVal(b)
      if (va == null && vb == null) return 0
      if (va == null) return order === 'asc' ? -1 : 1
      if (vb == null) return order === 'asc' ? 1 : -1
      // Date handling for received_at
      if (sortBy === 'received_at') {
        const da = new Date(va).getTime()
        const db = new Date(vb).getTime()
        return order === 'asc' ? da - db : db - da
      }
      // Date handling for created_at/updated_at
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        const da = new Date(va).getTime()
        const db = new Date(vb).getTime()
        return order === 'asc' ? da - db : db - da
      }
      if (typeof va === 'number' && typeof vb === 'number') {
        return order === 'asc' ? va - vb : vb - va
      }
      const sa = String(va)
      const sb = String(vb)
      return order === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa)
    })
    return arr
  }, [filteredItems, sortBy, order, columns])

  // Client-side pagination
  const totalItems = sortedItems.length || 0
  const totalPages = Math.max(1, Math.ceil(totalItems / (pageSize || 1)))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  const pagedItems = sortedItems.slice(start, end)

  const handleSort = (field, direction) => {
    setSortBy(field)
    setOrder(direction)
  }

  // control custom range popover visibility
  const [customOpen, setCustomOpen] = useState(false)
  const customWrapRef = useRef(null)

  // close custom popover on outside click
  useEffect(() => {
    if (!customOpen) return
    const onDown = (e) => {
      if (!customWrapRef.current) return
      if (!customWrapRef.current.contains(e.target)) {
        setCustomOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [customOpen])

  return (
    <div className={className}>
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-sm text-gray-600">Payments</div>
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
          <div className="relative w-52" ref={customWrapRef}>
            <Select
              value={dateRangeKey}
              onChange={(e) => {
                const v = e.target.value
                setDateRangeKey(v)
                setPage(1)
                if (v !== 'custom') { setDateFrom(null); setDateTo(null) }
                setCustomOpen(v === 'custom')
              }}
              options={[
                { value: 'all', label: 'All time' },
                { value: 'today', label: 'Today' },
                { value: 'last_7', label: 'Last 7 days' },
                { value: 'last_30', label: 'Last 30 days' },
                { value: 'this_month', label: 'This month' },
                { value: 'last_month', label: 'Last month' },
                { value: 'this_year', label: 'This year' },
                { value: 'last_year', label: 'Last year' },
                { value: 'last_90', label: 'Last 90 days' },
                { value: 'custom', label: 'Custom range…' },
              ]}
              className="text-sm"
              title="Filter by date range"
            />
            {(dateRangeKey === 'custom' && customOpen) && (
              <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-md p-2 flex gap-2">
                <UIDatePicker
                  selected={dateFrom}
                  onChange={(d) => { setDateFrom(d); setPage(1) }}
                  label="Received From"
                  placeholderText="dd/mm/yyyy"
                  isClearable
                />
                <UIDatePicker
                  selected={dateTo}
                  onChange={(d) => { setDateTo(d); setPage(1) }}
                  label="Received To"
                  placeholderText="dd/mm/yyyy"
                  isClearable
                />
              </div>
            )}
          </div>
          <div className="w-full">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search payments..."
              className="w-full max-w-xs"
            />
          </div>
        </div>
      </div>

      <AsyncGuard
        loading={loading}
        error={error}
        data={sortedItems}
        onRetry={() => setRefreshTick(t => t + 1)}
        emptyFallback={<div className="p-4 rounded-md border border-gray-200 bg-white text-gray-600">No payments found.</div>}
      >
        <SortableTable
          columns={columns}
          data={pagedItems}
          sortBy={sortBy}
          order={order}
          onSort={handleSort}
          rowKey="id"
          className=""
        />

        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={pageSize}
          onPageChange={setPage}
          onItemsPerPageChange={(n) => { setPageSize(n); setPage(1); }}
          itemsPerPageOptions={[5, 10, 25, 50, 100]}
          showGoto={false}
        />
      </AsyncGuard>

      <Modal
        isOpen={showEdit}
        onClose={() => { setShowEdit(false); setEditingPayment(null) }}
        title="Edit Payment"
        maxWidth="md"
      >
        {editingPayment && (
          <PaymentForm
            tenantId={tenantId}
            bookingId={bookingId}
            editPayment={editingPayment}
            onCancel={() => { setShowEdit(false); setEditingPayment(null) }}
            onSuccess={() => { setShowEdit(false); setEditingPayment(null); setRefreshTick(t => t + 1) }}
          />
        )}
      </Modal>

      <Modal
        isOpen={showDetails}
        onClose={() => { setShowDetails(false); setDetailsPayment(null) }}
        title="Payment Details"
        
        maxWidth="md"
      >
        <PaymentDetails payment={detailsPayment} />
      </Modal>
    </div>
  )
}

export default PaymentHistory