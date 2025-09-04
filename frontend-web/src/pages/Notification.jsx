import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useCan } from '../context/AuthContext'
import { guardedPayments } from '../services/payments'
import { SortableTable } from '../components/ui/SortableTable'
import Modal from '../components/ui/Modal'
import { PermissionButton } from '../components/ui/Button'
import PaymentForm from '../components/payment/PaymentForm'
import { useSearchParams } from 'react-router-dom'

const formatDate = (s) => {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d)) return String(s)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}:${mm}:${yyyy}`
}

const formatMoney = (v) => `₹ ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const StatusBadge = ({ status }) => {
  const s = String(status || '').toLowerCase()
  const map = {
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    open: 'bg-blue-100 text-blue-800 border-blue-200',
    partial: 'bg-amber-100 text-amber-800 border-amber-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
    overdue: 'bg-red-100 text-red-800 border-red-200',
    void: 'bg-gray-200 text-gray-700 border-gray-300',
  }
  const cls = map[s] || 'bg-gray-100 text-gray-800 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {String(status || '').toUpperCase() || '—'}
    </span>
  )
}

const isOverdue = (due, balance) => {
  if (!due) return false
  const dueDt = new Date(due)
  if (isNaN(dueDt)) return false
  return Number(balance || 0) > 0 && dueDt < new Date()
}

// Local read/unread tracking
const READ_KEY = 'invoice_reads'
const loadReadMap = () => {
  try {
    const raw = localStorage.getItem(READ_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}
const saveReadMap = (m) => {
  try { localStorage.setItem(READ_KEY, JSON.stringify(m || {})) } catch {}
}

// Tabs
const TABS = [
  { key: 'unread', label: 'Unread' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'pending', label: 'Pending Dues' },
  { key: 'next3', label: 'Next 3 Days' },
  { key: 'next7', label: 'Next 7 Days' },
]

// Color scheme for tab count badges
const COUNT_SCHEME = {
  unread: {
    active: 'bg-white text-indigo-700 border border-indigo-300',
    inactive: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  },
  overdue: {
    active: 'bg-white text-red-700 border border-red-300',
    inactive: 'bg-red-100 text-red-700 border border-red-200',
  },
  pending: {
    active: 'bg-white text-amber-700 border border-amber-300',
    inactive: 'bg-amber-100 text-amber-700 border border-amber-200',
  },
  next3: {
    active: 'bg-white text-sky-700 border border-sky-300',
    inactive: 'bg-sky-100 text-sky-700 border border-sky-200',
  },
  next7: {
    active: 'bg-white text-teal-700 border border-teal-300',
    inactive: 'bg-teal-100 text-teal-700 border border-teal-200',
  },
  _default: {
    active: 'bg-white text-gray-700 border border-gray-300',
    inactive: 'bg-gray-100 text-gray-700 border border-gray-200',
  },
}

// Color scheme for tab buttons
const TAB_SCHEME = {
  unread: {
    active: 'bg-indigo-600 text-white border-indigo-600',
    inactive: 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50',
  },
  overdue: {
    active: 'bg-red-600 text-white border-red-600',
    inactive: 'bg-white text-red-700 border-red-200 hover:bg-red-50',
  },
  pending: {
    active: 'bg-amber-600 text-white border-amber-600',
    inactive: 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50',
  },
  next3: {
    active: 'bg-sky-600 text-white border-sky-600',
    inactive: 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50',
  },
  next7: {
    active: 'bg-teal-600 text-white border-teal-600',
    inactive: 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50',
  },
  _default: {
    active: 'bg-blue-600 text-white border-blue-600',
    inactive: 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
  },
}

// Table theming per tab
const TABLE_SCHEME = {
  unread: {
    headerClassName: 'bg-gradient-to-r from-indigo-50 to-indigo-100',
    headerTextClassName: 'text-indigo-700',
    rowHoverClassName: 'hover:bg-indigo-50',
  },
  overdue: {
    headerClassName: 'bg-gradient-to-r from-red-50 to-red-100',
    headerTextClassName: 'text-red-700',
    rowHoverClassName: 'hover:bg-red-50',
  },
  pending: {
    headerClassName: 'bg-gradient-to-r from-amber-50 to-amber-100',
    headerTextClassName: 'text-amber-700',
    rowHoverClassName: 'hover:bg-amber-50',
  },
  next3: {
    headerClassName: 'bg-gradient-to-r from-sky-50 to-sky-100',
    headerTextClassName: 'text-sky-700',
    rowHoverClassName: 'hover:bg-sky-50',
  },
  next7: {
    headerClassName: 'bg-gradient-to-r from-teal-50 to-teal-100',
    headerTextClassName: 'text-teal-700',
    rowHoverClassName: 'hover:bg-teal-50',
  },
  _default: {
    headerClassName: 'bg-gradient-to-r from-blue-50 to-indigo-50',
    headerTextClassName: 'text-indigo-700',
    rowHoverClassName: 'hover:bg-blue-50',
  },
}

// Helpers to extract IDs from invoice object (best-effort across shapes)
const getInvoiceBuildingId = (inv) => {
  if (!inv || typeof inv !== 'object') return null
  const b = inv.booking || inv.reservation || inv.allocation || inv.booking_detail || inv.bookingInfo || {}
  const buildingObj = b.building || b.property || inv.building || inv.property || {}
  const prop = inv.property || inv.org || inv.organization || {}
  const candidates = [
    b.building_id, b.property_id, b.buildingId, b.propertyId,
    buildingObj?.id, prop?.id, inv.building_id, inv.property_id, inv.buildingId, inv.propertyId,
  ]
  for (const c of candidates) {
    const n = Number(c)
    if (!Number.isNaN(n) && n > 0) return n
  }
  return null
}
const getInvoiceTenantId = (inv) => {
  if (!inv || typeof inv !== 'object') return null
  const b = inv.booking || inv.reservation || inv.allocation || inv.booking_detail || inv.bookingInfo || {}
  const t = b.tenant || inv.tenant || {}
  const candidates = [
    t?.id, b?.tenant_id, inv?.tenant_id,
  ]
  for (const c of candidates) {
    const n = Number(c)
    if (!Number.isNaN(n) && n > 0) return n
  }
  return null
}
const getInvoiceBookingId = (inv) => {
  if (!inv || typeof inv !== 'object') return null
  const b = inv.booking || inv.reservation || inv.allocation || inv.booking_detail || inv.bookingInfo || {}
  const candidates = [b?.id, b?.booking_id, b?.reservation_id, b?.allocation_id]
  for (const c of candidates) {
    const n = Number(c)
    if (!Number.isNaN(n) && n > 0) return n
  }
  return null
}

function Notification() {
  const { can } = useCan()
  const api = useMemo(() => guardedPayments(can, 'global'), [can])

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('unread')
  const [readMap, setReadMap] = useState({})
  const [searchParams, setSearchParams] = useSearchParams()
  // building filter state
  const [buildingFilter, setBuildingFilter] = useState([]) // array of string ids
  // Pay modal state
  const [showPay, setShowPay] = useState(false)
  const [payInvoice, setPayInvoice] = useState(null)

  // sorting state for SortableTable
  const [sortBy, setSortBy] = useState('due_date')
  const [order, setOrder] = useState('asc')

  useEffect(() => { setReadMap(loadReadMap()) }, [])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (!t) return
    const valid = (TABS || []).some((x) => x.key === t)
    if (valid && t !== activeTab) setActiveTab(t)
  }, [searchParams])

  const markRead = (id) => {
    setReadMap((prev) => {
      const next = { ...(prev || {}), [id]: Date.now() }
      saveReadMap(next)
      return next
    })
  }

  // Refetch helper to be usable from button and on-mount
  const fetchPending = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const params = {
        page_size: 50,
        ordering: 'due_date',
        status__in: 'open,partial,overdue',
        balance_due__gt: 0,
      }
      if (buildingFilter && buildingFilter.length > 0) {
        params.building__in = buildingFilter.join(',')
      }
      const res = await api.getInvoices(params)
      const list = Array.isArray(res) ? res : (res?.results || [])
      const filtered = (list || []).filter((inv) => {
        const status = String(inv?.status || '').toLowerCase()
        const bal = Number(inv?.balance_due || 0)
        return bal > 0 && !['paid', 'void'].includes(status)
      })
      setItems(filtered)
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Failed to load pending invoices'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [api, buildingFilter])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  // Subscribe to Navbar global building filter
  useEffect(() => {
    // Initialize from localStorage set by Navbar
    try {
      const raw = localStorage.getItem('building_filter')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) setBuildingFilter(arr.map(String))
      }
    } catch {}
    // Listen to changes broadcast from Navbar
    const handler = (e) => {
      const arr = e?.detail?.selected
      if (Array.isArray(arr)) setBuildingFilter(arr.map(String))
    }
    window.addEventListener('building-filter-change', handler)
    return () => window.removeEventListener('building-filter-change', handler)
  }, [])

  // Date helpers
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x }
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x }
  const todayStart = startOfDay(new Date())
  const todayEnd = endOfDay(new Date())
  const inRange = (dateStr, from, to) => {
    if (!dateStr) return false
    const dt = new Date(dateStr)
    if (isNaN(dt)) return false
    return dt >= from && dt <= to
  }
 
  const categorized = useMemo(() => {
    const base = Array.isArray(items) ? items : []
    const unread = base.filter((inv) => !readMap[inv.id])
    const overdue = base.filter((inv) => isOverdue(inv?.due_date, inv?.balance_due))
    const pending = base // all pending invoices fetched (balance_due > 0 and not paid/void)
    const next3 = base.filter((inv) => {
      // Upcoming generated invoices by issue_date in next 3 days (strictly after today)
      const from = new Date(todayEnd.getTime() + 1)
      const to = endOfDay(new Date(todayStart.getTime() + 3*24*60*60*1000))
      return inRange(inv?.issue_date, from, to)
    })
    const next7 = base.filter((inv) => {
      // Upcoming generated invoices by issue_date in next 7 days (strictly after today)
      const from = new Date(todayEnd.getTime() + 1)
      const to = endOfDay(new Date(todayStart.getTime() + 7*24*60*60*1000))
      return inRange(inv?.issue_date, from, to)
    })
    return { unread, overdue, pending, next3, next7 }
  }, [items, readMap, todayStart, todayEnd])

  const listByTab = useMemo(() => {
    switch (activeTab) {
      case 'overdue': return categorized.overdue
      case 'pending': return categorized.pending
      case 'next3': return categorized.next3
      case 'next7': return categorized.next7
      case 'unread':
      default: return categorized.unread
    }
  }, [activeTab, categorized])

  // When viewing the Unread tab, auto-mark all currently listed as read and persist
  useEffect(() => {
    if (activeTab !== 'unread') return
    const unreadIds = (categorized.unread || []).map((inv) => inv.id)
    if (!unreadIds.length) return
    setReadMap((prev) => {
      const next = { ...(prev || {}) }
      let changed = false
      for (const id of unreadIds) {
        if (!next[id]) { next[id] = Date.now(); changed = true }
      }
      if (changed) saveReadMap(next)
      return next
    })
  }, [activeTab, categorized.unread])

  // sorting handler
  const handleSort = (field, dir) => {
    setSortBy(field)
    setOrder(dir)
  }

  // helper to get tenant display name
  const getTenantName = (inv) => {
    const t = inv?.tenant ?? inv?.tenant_name ?? inv?.tenant_details ?? inv?.tenantInfo
    if (!t) return '—'
    if (typeof t === 'object') {
      const name = t.name || t.full_name || [t.first_name, t.last_name].filter(Boolean).join(' ')
      return name || t.email?.split('@')[0] || t.username || String(t.id || '—')
    }
    const s = String(t)
    return s.includes('@') ? (s.split('@')[0] || s) : s
  }

  // helper to get tenant phone (to match InvoiceList display)
  const getTenantPhone = (inv) => {
    const t = inv?.tenant ?? inv?.tenant_details ?? inv?.tenantInfo
    if (!t || typeof t !== 'object') return ''
    const pick = (obj, keys) => keys.map(k => obj?.[k]).find(v => typeof v === 'string' && v.trim())
    const phone = pick(t, ['phone', 'phone_number', 'mobile', 'mobile_number', 'contact', 'contact_number'])
    return phone ? String(phone).trim() : ''
  }

  // sorted data according to SortableTable state
  const sortedData = useMemo(() => {
    const arr = [...(listByTab || [])]
    if (!sortBy) return arr
    const cmp = (a, b) => {
      let va = a?.[sortBy]
      let vb = b?.[sortBy]
      // custom fields
      if (sortBy === 'tenant') { va = getTenantName(a); vb = getTenantName(b) }
      if (sortBy === 'status') { va = String(a?.status || ''); vb = String(b?.status || '') }
      if (sortBy === 'due_date' || sortBy === 'issue_date') { va = va ? new Date(va).getTime() : 0; vb = vb ? new Date(vb).getTime() : 0 }
      if (sortBy === 'balance_due') { va = Number(a?.balance_due || 0); vb = Number(b?.balance_due || 0) }
      if (va < vb) return order === 'asc' ? -1 : 1
      if (va > vb) return order === 'asc' ? 1 : -1
      return 0
    }
    return arr.sort(cmp)
  }, [listByTab, sortBy, order])

  const columns = useMemo(() => ([
    {
      key: 'invoice_id',
      title: 'Invoice ID',
      sortable: true,
      accessor: (row) => row?.invoice_number || row?.id,
      Cell: ({ row }) => (
        <span className="font-mono text-gray-800">{row?.invoice_number || row?.id || '—'}</span>
      ),
    },
    { key: 'tenant', title: 'Tenant', sortable: true, Cell: ({ row }) => (
      <div className="leading-tight">
        <div className="text-gray-900">{getTenantName(row)}</div>
        {getTenantPhone(row) ? <div className="text-[11px] text-gray-500">{getTenantPhone(row)}</div> : null}
      </div>
    ) },
    { key: 'issue_date', title: 'Issue', sortable: true, accessor: (row) => formatDate(row?.issue_date) },
    { key: 'due_date', title: 'Due', sortable: true, Cell: ({ row }) => (
      <span className={isOverdue(row?.due_date, row?.balance_due) ? 'text-red-700 font-medium' : ''}>{formatDate(row?.due_date)}</span>
    ) },
    { key: 'total_amount', title: 'Total', sortable: true, accessor: (row) => formatMoney(row?.total_amount) },
    { key: 'balance_due', title: 'Balance', sortable: true, Cell: ({ row }) => {
      const val = Number(row?.balance_due || 0)
      const cls = val === 0 ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'
      return <span className={cls}>{formatMoney(val)}</span>
    } },
    { key: 'status', title: 'Status', sortable: true, Cell: ({ row }) => (
      <StatusBadge status={isOverdue(row?.due_date, row?.balance_due) ? 'overdue' : row?.status} />
    ) },
    {
      key: 'actions', title: 'Actions', sortable: false, Cell: ({ row }) => {
        const buildingId = getInvoiceBuildingId(row)
        const balance = Number(row?.balance_due || 0)
        return (
          <PermissionButton
            module="payments"
            action="add"
            scopeId={buildingId || 'global'}
            size="sm"
            variant="primary"
            disabled={!(balance > 0)}
            onClick={(e) => { e.stopPropagation?.(); setPayInvoice(row); setShowPay(true) }}
            reason={'You do not have permission to add payments for this building'}
            denyMessage={'Permission denied: cannot add payments for this building'}
          >
            Pay
          </PermissionButton>
        )
      }
    },
  ]), [readMap])

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Notifications</h1>
        {/* Building filter UI removed; uses Navbar's global building filter */}
      </div>

      <div className="mb-3">
        <h2 className="text-sm font-medium text-gray-700 mb-2">Pending Invoices</h2>
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto whitespace-nowrap">
          {TABS.map((t) => {
            const count = (categorized[t.key] || []).length
            const active = activeTab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTab(t.key)
                  const next = new URLSearchParams(searchParams)
                  next.set('tab', t.key)
                  setSearchParams(next)
                }}
                className={`inline-flex flex-shrink-0 px-3 py-1.5 rounded-full text-sm border ${(TAB_SCHEME[t.key] || TAB_SCHEME._default)[active ? 'active' : 'inactive']}`}
              >
                {t.label}
                <span className={`ml-2 inline-flex items-center justify-center min-w-[20px] px-1.5 rounded-full text-xs font-semibold ${
                  (COUNT_SCHEME[t.key] || COUNT_SCHEME._default)[active ? 'active' : 'inactive']
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
          {/* Refresh button removed */}
        </div>

        {error ? (
          <div className="py-2 px-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>
        ) : null}

        <SortableTable
          columns={columns}
          data={sortedData}
          sortBy={sortBy}
          order={order}
          onSort={handleSort}
          loading={loading}
          rowKey="id"
          noDataText={!loading && !error ? 'No items in this filter.' : ''}
          onRowClick={(row) => markRead(row.id)}
          className=""
          headerClassName={(TABLE_SCHEME[activeTab] || TABLE_SCHEME._default).headerClassName}
          headerTextClassName={(TABLE_SCHEME[activeTab] || TABLE_SCHEME._default).headerTextClassName}
          rowHoverClassName={(TABLE_SCHEME[activeTab] || TABLE_SCHEME._default).rowHoverClassName}
          
        />
      </div>

      <Modal
        isOpen={showPay}
        onClose={() => { setShowPay(false); setPayInvoice(null) }}
        title="Record Payment"
        maxWidth="md"
      >
        {payInvoice && (
          <PaymentForm
            tenantId={getInvoiceTenantId(payInvoice) || ''}
            bookingId={getInvoiceBookingId(payInvoice) || ''}
            defaultInvoiceId={payInvoice?.id}
            initialBuildingId={getInvoiceBuildingId(payInvoice) || ''}
            lockSelectors={true}
            onCancel={() => { setShowPay(false); setPayInvoice(null) }}
            onSuccess={() => { setShowPay(false); setPayInvoice(null); fetchPending() }}
          />
        )}
      </Modal>
    </div>
  )
}

export default Notification