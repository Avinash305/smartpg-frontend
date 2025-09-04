import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { SortableTable } from '../ui/SortableTable'
import { Input } from '../ui/Input'
import Select from '../ui/Select'
import Pagination from '../ui/Paginations'
import { DatePicker as UIDatePicker } from '../ui/DatePicker'
import { Button } from '../ui/Button'
import BookingActions from './BookingActions'
import AsyncGuard from '../common/AsyncGuard'
import { formatDateOnly, formatCurrency } from '../../utils/dateUtils'

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'no_show', label: 'No Show' },
]

// Status helpers for consistent color scheme
const formatStatusLabel = (s) => String(s || '-').replace(/_/g, ' ')
const getStatusBadgeClass = (s) => {
  switch (String(s || '')) {
    case 'pending':
      return 'text-amber-700 bg-amber-50 border border-amber-200'
    case 'reserved':
      return 'text-indigo-700 bg-indigo-50 border border-indigo-200'
    case 'confirmed':
      return 'text-emerald-700 bg-emerald-50 border border-emerald-200'
    case 'canceled':
      return 'text-red-700 bg-red-50 border border-red-200'
    case 'no_show':
      return 'text-slate-700 bg-slate-50 border border-slate-200'
    default:
      return 'text-gray-700 bg-gray-50 border border-gray-200'
  }
}

const BookingsList = ({ refreshSignal = 0, onEdit }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState(null)
  const [dateTo, setDateTo] = useState(null)
  const [datePreset, setDatePreset] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'start_date', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState([])
  const [buildingFilter, setBuildingFilter] = useState([])
  const [tenantPhoneMap, setTenantPhoneMap] = useState({})

  // Initialize building filter from Navbar's global filter and subscribe to changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem('building_filter')
      const arr = raw ? JSON.parse(raw) : []
      setBuildingFilter(Array.isArray(arr) ? arr.map(String) : [])
    } catch {}
    const handler = (e) => {
      const arr = (e?.detail?.selected || []).map(String)
      setBuildingFilter(arr)
    }
    window.addEventListener('building-filter-change', handler)
    return () => window.removeEventListener('building-filter-change', handler)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { ordering: sortConfig.direction === 'asc' ? sortConfig.key : `-${sortConfig.key}`, page_size: 1000 }
      if (statusFilter !== 'all') params.status = statusFilter
      if (buildingFilter && buildingFilter.length > 0) params.building__in = buildingFilter.join(',')
      const res = await api.get('/bookings/bookings/', { params })
      const items = Array.isArray(res.data) ? res.data : res.data?.results || []
      setData(items)
    } catch (e) {
      setError('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [refreshSignal, buildingFilter])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    if (filterOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filterOpen])

  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        const tenants = await listTenants({ page_size: 1000, ordering: 'full_name' })
        const arr = Array.isArray(tenants) ? tenants : tenants?.results || []
        if (!alive) return
        const map = {}
        for (const t of arr) {
          if (t?.id) map[String(t.id)] = t.phone || t.mobile || t.phone_number || ''
        }
        setTenantPhoneMap(map)
      } catch (_) {
        // ignore
      }
    }
    run()
    return () => { alive = false }
  }, [])

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

  const inRange = (dateStr, from, to) => {
    if (!from && !to) return true
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (isNaN(d)) return false
    const start = from ? new Date(new Date(from).setHours(0,0,0,0)) : null
    const end = to ? new Date(new Date(to).setHours(23,59,59,999)) : null
    if (start && d < start) return false
    if (end && d > end) return false
    return true
  }

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return data.filter((b) => {
      if (!b) return false
      const name = (b.tenant_name || b.tenant_full_name || b.tenant?.full_name || '').toLowerCase()
      const phone = (b.tenant_phone || b.tenant?.phone || '').toLowerCase()
      const matchesSearch = !q || name.includes(q) || phone.includes(q)
      const matchesStatus = statusFilter === 'all' || (b.status || '') === statusFilter
      const matchesDate = inRange(b.start_date, dateFrom, dateTo)
      const matchesBuilding = (buildingFilter || []).length === 0 || (buildingFilter || []).includes(String(b.building || b.building_id))
      return matchesSearch && matchesStatus && matchesDate && matchesBuilding
    })
  }, [data, searchTerm, statusFilter, dateFrom, dateTo, buildingFilter])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const { key, direction } = sortConfig
    if (!key) return arr
    arr.sort((a, b) => {
      let aVal = a[key]; let bVal = b[key]
      if (key === 'tenant') { aVal = a.tenant_name || a.tenant_full_name || a.tenant?.full_name || ''; bVal = b.tenant_name || b.tenant_full_name || b.tenant?.full_name || '' }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortConfig])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, statusFilter, sortConfig, dateFrom, dateTo, buildingFilter])

  const totalPages = Math.ceil(sorted.length / itemsPerPage) || 1
  const paginated = useMemo(() => (
    sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  ), [sorted, currentPage, itemsPerPage])

  const handleSort = (key, direction) => setSortConfig({ key, direction })

  const handleRowToggle = (row, willExpand) => {
    if (!row?.id) return
    setExpandedRowKeys((prev) => {
      const set = new Set(prev)
      if (willExpand) set.add(row.id); else set.delete(row.id)
      return Array.from(set)
    })
  }

  const renderExpanded = (row) => (
    <div className="p-3 sm:p-4 bg-white rounded-md border border-gray-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
        <div>
          <div className="text-gray-500">Property</div>
          <div className="font-medium">{row.building_name || '-'} • {row.floor_display || '-'} • {row.room_number || '-'} • {row.bed_number || '-'}</div>
        </div>
        <div>
          <div className="text-gray-500">Pricing</div>
          <div className="font-medium">{formatCurrency(row.monthly_rent || 0)} rent • {formatCurrency(row.security_deposit || 0)} deposit</div>
        </div>
      </div>
    </div>
  )

  const columns = [
    { key: 'id', Header: '# ID', sortable: true, accessor: (r) => r.id, Cell: ({ value, row }) => (
      row?.id ? <Link to={`/bookings/${row.id}`} onClick={(e)=>e.stopPropagation()} className="text-blue-600 hover:underline">{value}</Link> : <span>-</span>
    ) },
    {
      key: 'tenant', Header: 'Tenant', sortable: true, accessor: () => '',
      Cell: ({ row }) => (
        <div className="flex flex-col">
          {row?.tenant ? (
            <Link to={`/tenants/${row.tenant}`} onClick={(e)=>e.stopPropagation()} className="font-medium text-blue-600 hover:underline">{row.tenant_full_name || row.tenant_name || row.tenant?.full_name || 'Tenant'}</Link>
          ) : (
            <span className="text-gray-800">{row.tenant_full_name || row.tenant_name || 'Tenant'}</span>
          )}
          <span className="text-[11px] text-gray-500">
            {(row.tenant_phone || row.tenant?.phone || tenantPhoneMap[String(row.tenant || '')]) ? (
              <a
                href={`tel:${row.tenant_phone || row.tenant?.phone || tenantPhoneMap[String(row.tenant || '')]}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-gray-700"
              >
                {row.tenant_phone || row.tenant?.phone || tenantPhoneMap[String(row.tenant || '')]}
              </a>
            ) : 'N/A'}
          </span>
        </div>
      )
    },
    { key: 'Check-In', Header: 'Check-In', sortable: true, accessor: (r) => r.start_date, Cell: ({ value }) => <span className="text-gray-700">{formatDateOnly(value)}</span> },
    { key: 'Check-Out', Header: 'Check-Out', sortable: true, accessor: (r) => r.end_date, Cell: ({ value }) => <span className="text-gray-700">{formatDateOnly(value)}</span> },
    { key: 'status', Header: 'Status', sortable: true, accessor: (r) => r.status, Cell: ({ value }) => (
      <span className={`capitalize inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs ${getStatusBadgeClass(value)}`}>
        {formatStatusLabel(value)}
      </span>
    ) },
    {
      key: 'actions', Header: 'Actions', sortable: false, accessor: () => '',
      Cell: ({ row }) => (
        <div className="flex justify-end">
          <BookingActions
            booking={row}
            onEdit={onEdit}
            onChanged={fetchData}
            onBedAffected={() => { /* Refresh bookings to reflect any cascaded changes */ fetchData() }}
          />
        </div>
      ), headerClassName: 'text-right'
    },
  ]

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3 sm:mb-4 relative">
        <div className="flex-1">
          <Input type="text" placeholder="Search bookings (tenant/phone)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="w-full sm:w-auto">
          <Button variant="outline" onClick={() => setFilterOpen((v) => !v)}>
            Filters{(statusFilter !== 'all' || datePreset || dateFrom || dateTo) ? ' (1)' : ''}
          </Button>
        </div>

        {filterOpen && (
          <div ref={filterRef} className="absolute right-0 top-full mt-2 z-20 w-full sm:w-[520px] bg-white border border-gray-200 rounded-md shadow-lg p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={statusOptions} />
              </div>
              <div className="hidden" />
              <div className="hidden" />
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <Select
                  value={datePreset}
                  onChange={(e) => applyDatePreset(e.target.value)}
                  placeholder="Select date range"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
                <UIDatePicker selected={dateFrom} onChange={(d) => setDateFrom(d)} label="Start From" placeholderText="dd/mm/yyyy" isClearable />
                <UIDatePicker selected={dateTo} onChange={(d) => setDateTo(d)} label="Start To" placeholderText="dd/mm/yyyy" isClearable />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => { setStatusFilter('all'); setDatePreset(''); setDateFrom(null); setDateTo(null) }}>Clear</Button>
              <Button size="sm" onClick={() => setFilterOpen(false)}>Apply</Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <AsyncGuard
          loading={loading}
          error={error}
          data={sorted}
          onRetry={fetchData}
          emptyFallback={<div className="p-4 text-gray-600">No bookings found</div>}
          className=""
        >
          <SortableTable
            columns={columns}
            data={paginated}
            sortBy={sortConfig.key}
            order={sortConfig.direction}
            onSort={handleSort}
            loading={false}
            noDataText={'No bookings found'}
            rowKey="id"
            expandable
            expandedRowKeys={expandedRowKeys}
            renderExpanded={renderExpanded}
            onRowToggle={handleRowToggle}
          />
        </AsyncGuard>
      </div>

      <div className="flex justify-end mt-3 sm:mt-4">
        <Pagination
          currentPage={currentPage}
          totalItems={sorted.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          maxVisiblePages={5}
          onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1) }}
        />
      </div>
    </div>
  )
}

export default BookingsList