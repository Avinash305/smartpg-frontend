import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getInvoices } from '../../services/payments'
import { SortableTable } from '../ui/SortableTable'
import Pagination from '../ui/Paginations'
import Modal from '../ui/Modal'
import InvoiceDetails from './InvoiceDetails'
import SearchInput from '../ui/SearchInput'
import PaymentForm from '../payment/PaymentForm'
import { PermissionButton } from '../ui/Button'
import { Button } from '../ui/Button'
import Select from '../ui/Select'
import { DatePicker as UIDatePicker } from '../ui/DatePicker'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '../ui/DropdownMenu'
import { formatDateOnly, formatCurrency } from '../../utils/dateUtils'

const formatDate = (s) => {
  const out = formatDateOnly(s)
  return (out === 'N/A' || out === 'Invalid date') ? '—' : out
}

// Format a JS Date to 'YYYY-MM-DD' for backend query params
const toISODate = (d) => {
  if (!d) return ''
  try {
    const dt = new Date(d)
    if (isNaN(dt)) return ''
    const yyyy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch (e) { return '' }
}

const formatMoney = (v) => formatCurrency(v, 'INR')

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

const formatTenantText = (inv) => {
  const t = inv?.tenant ?? inv?.tenant_name ?? inv?.tenant_details ?? inv?.tenantInfo
  if (!t) return '—'
  const toStr = (v) => (typeof v === 'string' ? v.trim() : '')
  if (typeof t === 'object') {
    const name = toStr(t.name) || toStr(t.full_name) || `${toStr(t.first_name)} ${toStr(t.last_name)}`.trim()
    const email = toStr(t.email)
    const username = toStr(t.username)
    if (name) return name
    if (email) return email.split('@')[0] || email
    if (username) return username
    if (t.id != null) return String(t.id)
    return '—'
  }
  const s = toStr(t)
  return s.includes('@') ? (s.split('@')[0] || s) : s
}

const formatTenantPhone = (inv) => {
  const t = inv?.tenant ?? inv?.tenant_details ?? inv?.tenantInfo
  if (!t) return ''
  const pick = (obj, keys) => keys.map(k => obj?.[k]).find(v => typeof v === 'string' && v.trim())
  if (typeof t === 'object') {
    const phone = pick(t, ['phone', 'phone_number', 'mobile', 'mobile_number', 'contact', 'contact_number'])
    return phone ? String(phone).trim() : ''
  }
  return ''
}

function inRange(dateStr, from, to) {
  if (!from && !to) return true
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d)) return false
  const start = from ? new Date(new Date(from).setHours(0, 0, 0, 0)) : null
  const end = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : null
  if (start && d < start) return false
  if (end && d > end) return false
  return true
}

const InvoiceList = ({ tenantId, bookingId, buildings, limit = 10, className = '' }) => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [showPay, setShowPay] = useState(false)
  const [payInvoiceId, setPayInvoiceId] = useState(null)
  const [payBuildingId, setPayBuildingId] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)
  const filterButtonRef = useRef(null)

  // Sorting state
  const [sortBy, setSortBy] = useState('cycle_month')
  const [order, setOrder] = useState('desc')

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(limit || 10)

  // Date filter state (Issue Date)
  const [dateFrom, setDateFrom] = useState(null)
  const [dateTo, setDateTo] = useState(null)
  const [datePreset, setDatePreset] = useState('')

  // Status filter state
  const [statusFilters, setStatusFilters] = useState([])
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const keepStatusMenuOpenRef = useRef(false)

  // Stabilize buildings dependency to prevent re-fetch loops when parent doesn't pass it (or passes new array refs)
  const buildingsKey = useMemo(() => (
    Array.isArray(buildings) && buildings.length > 0 ? buildings.join(',') : ''
  ), [buildings])

  // Reset to first page when filters/search change to avoid empty pages after filtering
  useEffect(() => {
    setPage(1)
  }, [dateFrom, dateTo, datePreset, query, statusFilters, buildingsKey])

  // Display number of active filters (date only)
  const activeFilterCount = useMemo(() => {
    let n = 0
    const hasPreset = !!datePreset && datePreset !== 'custom'
    const hasCustomRange = datePreset === 'custom' && (dateFrom || dateTo)
    if (hasPreset || hasCustomRange) n += 1
    if (Array.isArray(statusFilters) && statusFilters.length > 0) n += 1
    return n
  }, [datePreset, dateFrom, dateTo, statusFilters])

  const params = useMemo(() => {
    const p = {}
    if (tenantId) p.tenant = tenantId
    if (bookingId) p.booking = bookingId
    // Request a large page to let client-side filters paginate locally
    p.page_size = 1000
    if (Array.isArray(buildings) && buildings.length > 0) {
      p['building__in'] = buildings.join(',')
    }
    if (dateFrom) {
      const v = toISODate(dateFrom)
      if (v) p['issue_date__gte'] = v
    }
    if (dateTo) {
      const v = toISODate(dateTo)
      if (v) p['issue_date__lte'] = v
    }
    // Backend status filters
    const wantPending = Array.isArray(statusFilters) && statusFilters.includes('pending')
    const wantOverdue = Array.isArray(statusFilters) && statusFilters.includes('overdue')
    const selStatuses = Array.isArray(statusFilters)
      ? statusFilters.filter(s => s && s !== 'pending' && s !== 'overdue')
      : []
    if (selStatuses.length > 0) p['status__in'] = selStatuses.join(',')
    if (wantPending) p.pending = true
    if (wantOverdue) p.overdue = true
    return p
  }, [tenantId, bookingId, buildingsKey, statusFilters, dateFrom, dateTo])

  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await getInvoices(params)
        const list = Array.isArray(res) ? res : (res?.results || [])
        if (alive) setItems(list)
      } catch (e) {
        if (alive) setError(e?.response?.data?.detail || 'Failed to load invoices')
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [params, refreshTick])

  // Try to extract a building id from an invoice row across possible shapes
  const getBuildingId = (inv) => {
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

  const columns = useMemo(() => ([
    {
      key: 'id', Header: 'Invoice ID', sortable: true, accessor: (row) => row.id, Cell: ({ value }) => (
        <button
          type="button"
          onClick={() => { setSelectedId(value); setShowDetails(true) }}
          className="text-blue-600 hover:text-blue-700 hover:underline font-bold cursor-pointer hover:scale-110"
        >
          ID# {value}
        </button>
      )
    },
    {
      key: 'tenant', Header: 'Tenant', sortable: false, accessor: (row) => row, Cell: ({ value: row }) => {
        const name = formatTenantText(row)
        const phone = formatTenantPhone(row)
        return (
          <div className="leading-tight">
            <div className="text-gray-900">{name}</div>
            {phone ? <div className="text-[11px] text-gray-500">{phone}</div> : null}
          </div>
        )
      }
    },
    { key: 'cycle_month', Header: 'Month', sortable: true, accessor: (row) => row.cycle_month, Cell: ({ value }) => formatDate(value) },
    {
      key: 'issue_date', Header: 'Issue', sortable: true, accessor: (row) => row.issue_date, Cell: ({ value }) => (
        <span className="text-gray-800">{formatDate(value)}</span>
      )
    },
    {
      key: 'due_date', Header: 'Due', sortable: true, accessor: (row) => row.due_date, Cell: ({ value, row }) => (
        <span className={isOverdue(value, row.balance_due) ? 'text-red-700 font-medium' : 'text-gray-800'}>
          {formatDate(value)}
        </span>
      )
    },
    {
      key: 'total_amount', Header: 'Total', sortable: true, accessor: (row) => Number(row.total_amount || 0), Cell: ({ value }) => (
        <span className="text-gray-900">{formatMoney(value)}</span>
      )
    },
    {
      key: 'balance_due', Header: 'Balance', sortable: true, accessor: (row) => Number(row.balance_due || 0), Cell: ({ value }) => (
        <span className={Number(value || 0) === 0 ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>
          {formatMoney(value)}
        </span>
      )
    },
    {
      key: 'status', Header: 'Status', sortable: true, accessor: (row) => row.status, Cell: ({ value, row }) => {
        const isOv = isOverdue(row?.due_date, row?.balance_due) && String(value || '').toLowerCase() !== 'paid'
        const computed = isOv ? 'overdue' : value
        return (
          <StatusBadge status={computed} />
        )
      }
    },
    {
      key: 'actions', Header: 'Actions', sortable: false, accessor: (row) => row, Cell: ({ row }) => {
        const due = Number(row?.balance_due || 0)
        const bid = getBuildingId(row)
        const scopeId = bid || 'global'
        const disabled = !(due > 0)
        return (
          <div className="flex items-center gap-2">
            <PermissionButton
              module="payments"
              action="add"
              scopeId={scopeId}
              size="sm"
              disabled={disabled}
              reason={bid ? "You don't have permission to record payments in this building" : "You don't have permission to record payments"}
              denyMessage={bid ? "Permission denied: cannot record payments for this building" : "Permission denied: cannot record payments"}
              onClick={() => { setPayInvoiceId(row.id); setPayBuildingId(bid ? String(bid) : ''); setShowPay(true); }}
            >
              Pay
            </PermissionButton>
          </div>
        )
      }
    },
  ]), [])

  useEffect(() => {
    const handler = (e) => {
      const target = e.target
      const path = typeof e.composedPath === 'function' ? e.composedPath() : []
      const withinPanel = (
        (filterRef.current && filterRef.current.contains(target)) ||
        (filterRef.current && path.includes(filterRef.current))
      )
      const withinButton = (
        (filterButtonRef.current && filterButtonRef.current.contains(target)) ||
        (filterButtonRef.current && path.includes(filterButtonRef.current))
      )
      const withinDatePickerPortal = !!(target && (target.closest && target.closest('.react-datepicker, .react-datepicker__portal')))
      const withinDropdown = !!(target && target.closest && target.closest('[data-dropdown-content]'))
      if (!withinPanel && !withinButton && !withinDatePickerPortal && !withinDropdown) setFilterOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setFilterOpen(false)
    }
    if (filterOpen) {
      document.addEventListener('click', handler)
      document.addEventListener('keydown', onKey)
    }
    return () => {
      document.removeEventListener('click', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [filterOpen])

  const filteredItems = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    const base = items || []
    // Apply issue date range filter only; status handled by backend
    const byDate = (dateFrom || dateTo)
      ? base.filter(inv => inRange(inv?.issue_date, dateFrom, dateTo))
      : base
    if (!q) return byDate
    return byDate.filter(inv => {
      const id = String(inv?.id ?? '').toLowerCase()
      const status = String(inv?.status ?? '').toLowerCase()
      const tenantTxt = formatTenantText(inv).toLowerCase()
      const phoneTxt = formatTenantPhone(inv).toLowerCase()
      const total = String(inv?.total_amount ?? '').toLowerCase()
      const bal = String(inv?.balance_due ?? '').toLowerCase()
      const cm = inv?.cycle_month ? new Date(inv.cycle_month).toLocaleDateString() : ''
      const issue = inv?.issue_date ? new Date(inv.issue_date).toLocaleDateString() : ''
      const due = inv?.due_date ? new Date(inv.due_date).toLocaleDateString() : ''
      const hay = [id, status, tenantTxt, phoneTxt, total, bal, cm, issue, due].join(' ')
      return hay.includes(q)
    })
  }, [items, query, dateFrom, dateTo])

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
      // Dates
      if (['cycle_month', 'issue_date', 'due_date'].includes(sortBy)) {
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

  // Pending (unpaid) invoice count across current filter/search (not limited by pagination)
  const pendingCount = useMemo(() => {
    return (filteredItems || []).reduce((acc, inv) => acc + (Number(inv?.balance_due || 0) > 0 ? 1 : 0), 0)
  }, [filteredItems])

  const overdueCount = useMemo(() => {
    return (filteredItems || []).reduce((acc, inv) => acc + (isOverdue(inv?.due_date, inv?.balance_due) ? 1 : 0), 0)
  }, [filteredItems])

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

  const applyDatePreset = (value) => {
    setDatePreset(value)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const setRange = (from, to) => { setDateFrom(from); setDateTo(to) }
    switch (value) {
      case '': setRange(null, null); break
      case 'today': setRange(todayStart, todayEnd); break
      case 'yesterday': {
        const yStart = new Date(todayStart); yStart.setDate(yStart.getDate() - 1)
        const yEnd = new Date(todayEnd); yEnd.setDate(yEnd.getDate() - 1)
        setRange(yStart, yEnd); break
      }
      case '7d': { const from = new Date(todayStart); from.setDate(from.getDate() - 6); setRange(from, todayEnd); break }
      case '30d': { const from = new Date(todayStart); from.setDate(from.getDate() - 29); setRange(from, todayEnd); break }
      case 'this_month': setRange(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)); break
      case 'last_month': setRange(new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)); break
      case 'this_year': setRange(new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)); break
      case 'custom': default: break
    }
  }

  const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending (Unpaid)' },
    { value: 'draft', label: 'Draft' },
    { value: 'open', label: 'Open' },
    { value: 'partial', label: 'Partially Paid' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'void', label: 'Void' },
  ]

  // Color scheme helpers to align with Notification page
  const STATUS_TRIGGER_SCHEME = {
    overdue: {
      cls: 'border-red-300 text-red-700 hover:border-red-400 focus:ring-red-500',
      icon: 'text-red-600',
    },
    pending: {
      cls: 'border-amber-300 text-amber-700 hover:border-amber-400 focus:ring-amber-500',
      icon: 'text-amber-600',
    },
    default: {
      cls: 'border-gray-300 text-gray-700 hover:border-gray-400 focus:ring-indigo-500',
      icon: 'text-gray-500',
    },
  }

  return (
    <div className={className}>
      {error && (
        <div className="py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>
      )}

      <div className="mb-3 flex flex-col sm:flex-row sm:justify-between gap-2 relative">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm text-gray-800 flex items-center gap-2 flex-nowrap">
            <span>Invoices</span>
            <span className="inline-flex items-center whitespace-nowrap rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[11px] font-medium">
              Pending: {pendingCount}
            </span>
            <span className="inline-flex items-center whitespace-nowrap rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-[11px] font-medium">
              Overdue: {overdueCount}
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end relative">
            <span
              ref={filterButtonRef}
              className="inline-flex"
            >
              <Button
                variant="outline"
                onClick={() => setFilterOpen(v => !v)}
                aria-expanded={filterOpen}
                aria-haspopup="dialog"
                className="h-8!"
              >
                <span className="inline-flex items-center gap-1">
                  <span>Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </span>
              </Button>
            </span>
            {filterOpen && (
              <div
                ref={filterRef}
                className="absolute top-full mt-2 z-20 bg-white border border-gray-200 rounded-md shadow-lg p-2 sm:p-3 w-45"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs sm:text-sm font-medium text-gray-700">Date Range</label>
                      <Select
                        value={datePreset}
                        onChange={(e) => applyDatePreset(e.target.value)}
                        placeholder="Select"
                        className='w-18! pl-2 '
                        options={[
                          { value: 'today', label: 'Today' },
                          { value: 'yesterday', label: 'Yesterday' },
                          { value: '7d', label: 'Last 7 days' },
                          { value: '30d', label: 'Last 30 days' },
                          { value: 'this_month', label: 'This Month' },
                          { value: 'last_month', label: 'Last Month' },
                          { value: 'this_year', label: 'This Year' },
                          { value: 'custom', label: 'Custom Range' },
                        ]}
                      />
                    </div>
                  </div>

                  {datePreset === 'custom' && (
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <div>
                        <UIDatePicker selected={dateFrom} onChange={(d) => setDateFrom(d)} label="Issue From" placeholderText="dd/mm/yyyy" isClearable />
                      </div>
                      <div>
                        <UIDatePicker selected={dateTo} onChange={(d) => setDateTo(d)} label="Issue To" placeholderText="dd/mm/yyyy" isClearable />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-700">Status</label>
                    <DropdownMenu
                      modal={false}
                      open={statusMenuOpen}
                      onOpenChange={(open) => {
                        // If a close was requested right after an item toggle, keep it open
                        if (!open && keepStatusMenuOpenRef.current) {
                          keepStatusMenuOpenRef.current = false
                          setStatusMenuOpen(true)
                          return
                        }
                        setStatusMenuOpen(open)
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        {(() => {
                          const tone = statusFilters.includes('overdue')
                            ? 'overdue'
                            : (statusFilters.includes('pending') ? 'pending' : 'default')
                          const scheme = STATUS_TRIGGER_SCHEME[tone]
                          return (
                            <button
                              type="button"
                              className={`inline-flex items-center gap-2 text-xs sm:text-sm rounded-md px-2 py-1 bg-white ${scheme.cls}`}
                              title="Filter by status"
                            >
                              <span className="inline">
                                {statusFilters.length === 0 ? 'All' : `${statusFilters.length} selected`}
                              </span>
                              <svg className={`w-3.5 h-3.5 ${scheme.icon}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )
                        })()}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-40" data-dropdown-content>
                        <div className="flex items-center px-2 py-1">
                          <DropdownMenuLabel className="p-0">Filter status</DropdownMenuLabel>
                          {statusFilters.length > 0 && (
                            <button
                              type="button"
                              className="ml-auto text-[11px] text-indigo-600 hover:underline"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStatusFilters([]); keepStatusMenuOpenRef.current = true; setStatusMenuOpen(true) }}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <DropdownMenuSeparator />
                        {STATUS_OPTIONS.map(opt => {
                          const checked = statusFilters.includes(opt.value)
                          return (
                            <DropdownMenuCheckboxItem
                              key={opt.value}
                              checked={checked}
                              onSelect={(e) => { e.preventDefault(); e.stopPropagation(); keepStatusMenuOpenRef.current = true; setStatusMenuOpen(true) }}
                              onCheckedChange={(v) => {
                                const isChecked = v === true
                                setStatusFilters(prev => (
                                  isChecked ? Array.from(new Set([...prev, opt.value])) : prev.filter(s => s !== opt.value)
                                ))
                                // Signal to keep menu open after this toggle
                                keepStatusMenuOpenRef.current = true
                                setStatusMenuOpen(true)
                              }}
                              className="pr-2"
                            >
                              {opt.label}
                            </DropdownMenuCheckboxItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setStatusFilters([]); setDatePreset(''); setDateFrom(null); setDateTo(null) }}>Clear</Button>
                    <Button size="sm" onClick={() => setFilterOpen(false)}>Apply</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search invoices..."
            className="w-full max-w-xs"
          />
        </div>
      </div>
      <SortableTable
        columns={columns}
        data={pagedItems}
        sortBy={sortBy}
        order={order}
        onSort={handleSort}
        loading={loading}
        rowKey="id"
        noDataText={loading ? 'Loading invoices...' : 'No invoices found.'}
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

      <Modal
        isOpen={showDetails}
        onClose={() => { setShowDetails(false); setSelectedId(null) }}
        title={selectedId ? `Invoice #${selectedId}` : 'Invoice'}
        maxWidth="4xl"
        className="max-w-5xl"
      >
        {selectedId ? (
          <div className="p-2">
            <InvoiceDetails invoiceId={selectedId} />
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={showPay}
        onClose={() => { setShowPay(false); setPayInvoiceId(null); }}
        title={payInvoiceId ? `Record Payment • Invoice #${payInvoiceId}` : 'Record Payment'}
        maxWidth="md"
      >
        {showPay ? (
          <div className="p-2">
            <PaymentForm
              defaultInvoiceId={payInvoiceId}
              initialBuildingId={payBuildingId || ''}
              lockSelectors={true}
              onCancel={() => { setShowPay(false); setPayInvoiceId(null); }}
              onSuccess={() => { setShowPay(false); setPayInvoiceId(null); setRefreshTick(t => t + 1); }}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default InvoiceList