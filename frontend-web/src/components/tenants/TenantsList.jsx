import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { listTenants } from '../../services/tenants'
import { SortableTable } from '../ui/SortableTable'
import { Input } from '../ui/Input'
import Select from '../ui/Select'
import Pagination from '../ui/Paginations'
import { DatePicker as UIDatePicker } from '../ui/DatePicker'
import { Button } from '../ui/Button'
import TenantActions from './TenantActions'
import AsyncGuard from '../common/AsyncGuard'
import { useTranslation } from 'react-i18next'
import { formatDateOnly, formatCurrency } from '../../utils/dateUtils'
import { FiUsers, FiUserCheck, FiUserX } from 'react-icons/fi'

// Resolve media URL (handles relative paths returned by backend)
const resolveMediaUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  const origin = apiBase.replace(/\/?api\/?$/i, '').replace(/\/+$/, '')
  const path = `/${String(url).replace(/^\/+/, '')}`
  return `${origin}${path}`
}

// Avatar cell with robust fallback to initials
const AvatarCell = ({ row }) => {
  const [errored, setErrored] = useState(false)
  const src = resolveMediaUrl(row?.avatar_url || row?.avatar || row?.photo)
  const initial = (row?.full_name || '').trim().charAt(0).toUpperCase() || 'T'
  const showImage = !!src && !errored
  const { t } = useTranslation()
  const tr = (key, fallback, opt) => t(key, { defaultValue: fallback, ...(opt || {}) })

  return (
    <Link to={`/tenants/${row?.id}`} className="inline-flex items-center">
      {showImage ? (
        <img
          src={src}
          alt={row?.full_name || tr('tenants.avatar_alt', 'Tenant')}
          className="h-8 w-8 rounded-full object-cover border border-gray-200"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium">
          {initial}
        </div>
      )}
    </Link>
  )
}

const TenantsList = ({ refreshSignal, onEdit }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | inactive
  const [genderFilter, setGenderFilter] = useState('all') // all | male | female | other
  const [dateFrom, setDateFrom] = useState(null)
  const [dateTo, setDateTo] = useState(null)
  // '' means no selection (shows placeholder). Other values: today | yesterday | 7d | 30d | this_month | last_month | this_year | custom
  const [datePreset, setDatePreset] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)
  const [buildingFilter, setBuildingFilter] = useState([])
  const { t } = useTranslation()
  const tr = (key, fallback, opt) => t(key, { defaultValue: fallback, ...(opt || {}) })

  // Counts (respect current server-side building filter; ignore client-side filters)
  const totalCount = data.length
  const activeCount = useMemo(() => data.filter((t) => !!t?.is_active).length, [data])
  const inactiveCount = totalCount - activeCount

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (buildingFilter && buildingFilter.length > 0) {
        params.building__in = buildingFilter.join(',')
      }

      const res = await listTenants(params)
      const items = Array.isArray(res) ? res : res?.results || []
      setData(items)
    } catch (e) {
      if (e.response && e.response.status === 403) {
        setError(tr('tenants.errors.permission_denied', 'You do not have permission to view Tenants for the selected scope'))
      } else {
        setError(tr('tenants.errors.load_failed', 'Failed to load Tenants'))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal, buildingFilter])

  // Subscribe to Navbar building filter (localStorage + custom event)
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false)
      }
    }
    if (filterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [filterOpen])

  // Helpers
  const formatDateStr = (s) => formatDateOnly(s)

  const getCheckIn = (t) => t.check_in || t.checkin || t.check_in_date || t.checkin_date || t.move_in_date
  const getCheckOut = (t) => t.check_out || t.checkout || t.check_out_date || t.checkout_date || t.move_out_date

  // Date range check (inclusive)
  const inRange = (dateStr, from, to) => {
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

  // Preset handler
  const applyDatePreset = (value) => {
    setDatePreset(value)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const setRange = (from, to) => { setDateFrom(from); setDateTo(to) }

    switch (value) {
      case '': // placeholder selected / cleared
        setRange(null, null)
        break
      case 'today':
        setRange(todayStart, todayEnd)
        break
      case 'yesterday': {
        const yStart = new Date(todayStart); yStart.setDate(yStart.getDate() - 1)
        const yEnd = new Date(todayEnd); yEnd.setDate(yEnd.getDate() - 1)
        setRange(yStart, yEnd)
        break
      }
      case '7d': {
        const from = new Date(todayStart); from.setDate(from.getDate() - 6)
        setRange(from, todayEnd)
        break
      }
      case '30d': {
        const from = new Date(todayStart); from.setDate(from.getDate() - 29)
        setRange(from, todayEnd)
        break
      }
      case 'this_month': {
        const from = new Date(now.getFullYear(), now.getMonth(), 1)
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        setRange(from, to)
        break
      }
      case 'last_month': {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
        setRange(from, to)
        break
      }
      case 'this_year': {
        const from = new Date(now.getFullYear(), 0, 1)
        const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        setRange(from, to)
        break
      }
      case 'custom':
      default:
        setRange(null, null)
        break
    }
  }

  const clearFilters = () => {
    setStatusFilter('all')
    setGenderFilter('all')
    setDatePreset('')
    setDateFrom(null)
    setDateTo(null)
  }

  const activeFilterCount = (() => {
    let c = 0
    if (statusFilter !== 'all') c += 1
    if (genderFilter !== 'all') c += 1
    if ((datePreset && datePreset !== 'custom') || dateFrom || dateTo) c += 1
    return c
  })()

  // Filters (client-side: search/status/gender/date only; building handled by server)
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return data.filter((t) => {
      if (!t) return false
      const name = (t.full_name || '').toLowerCase()
      const phone = (t.phone || '').toLowerCase()
      const matchesSearch = !q || name.includes(q) || phone.includes(q)
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? t.is_active : !t.is_active)
      const matchesGender = genderFilter === 'all' || (t.gender || '').toLowerCase() === genderFilter.toLowerCase()

      const ci = getCheckIn(t)
      const matchesDate = inRange(ci, dateFrom, dateTo)

      return matchesSearch && matchesStatus && matchesGender && matchesDate
    })
  }, [data, searchTerm, statusFilter, genderFilter, dateFrom, dateTo])

  // Sorting
  const sorted = useMemo(() => {
    const arr = [...filtered]
    const { key, direction } = sortConfig
    if (!key) return arr
    arr.sort((a, b) => {
      let aVal = key === 'name' ? (a.full_name || '') : a[key] ?? ''
      let bVal = key === 'name' ? (b.full_name || '') : b[key] ?? ''
      aVal = String(aVal).toLowerCase()
      bVal = String(bVal).toLowerCase()
      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortConfig])

  // Reset page on filter/sort changes
  useEffect(() => { setCurrentPage(1) }, [searchTerm, statusFilter, genderFilter, sortConfig, dateFrom, dateTo])

  // Pagination
  const totalPages = Math.ceil(sorted.length / itemsPerPage) || 1
  const paginated = useMemo(() => (
    sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  ), [sorted, currentPage, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [totalPages, currentPage])

  const handleSort = (key, direction) => setSortConfig({ key, direction })

  // Columns
  const columns = [
    {
      key: 'avatar',
      Header: tr('tenants.table_headers.avatar', 'Profile'),
      sortable: false,
      accessor: () => '',
      Cell: ({ row }) => (
        <AvatarCell row={row} />
      )
    },
    {
      key: 'full_name',
      Header: tr('tenants.table_headers.name', 'Name'),
      sortable: true,
      accessor: 'full_name',
      Cell: ({ value, row }) => (
        <div className="flex flex-col">
          <Link to={`/tenants/${row?.id}`} className="font-medium text-blue-600 hover:underline">
            {value || tr('tenants.not_available', 'N/A')}
          </Link>
          {row?.phone && <span className="text-[11px] text-gray-500">{row.phone}</span>}
        </div>
      )
    },
    {
      key: 'check_in',
      Header: tr('tenants.table_headers.checkin', 'Check-in'),
      sortable: true,
      accessor: (row) => getCheckIn(row),
      Cell: ({ value }) => <span className="text-gray-700">{formatDateStr(value)}</span>
    },
    {
      key: 'check_out',
      Header: tr('tenants.table_headers.checkout', 'Check-out'),
      sortable: true,
      accessor: (row) => getCheckOut(row),
      Cell: ({ value }) => <span className="text-gray-700">{formatDateStr(value)}</span>
    },
    {
      key: 'gender',
      Header: tr('tenants.table_headers.gender', 'Gender'),
      sortable: true,
      accessor: 'gender',
      Cell: ({ value }) => <span className="capitalize text-gray-700">{value || tr('tenants.not_available', 'N/A')}</span>
    },
    {
      key: 'balance',
      Header: tr('tenants.table_headers.balance', 'Balance'),
      sortable: true,
      accessor: 'balance',
      Cell: ({ value }) => {
        const balance = parseFloat(value) || 0
        const isPositive = balance > 0
        const isNegative = balance < 0
        return (
          <span className={`font-medium ${
            isPositive ? 'text-red-600' : isNegative ? 'text-green-600' : 'text-gray-700'
          }`}>
            {formatCurrency(Math.abs(balance))}
            {isNegative && tr('tenants.balance_credit', ' (Credit)')}
          </span>
        )
      }
    },
    {
      key: 'booking_status',
      Header: tr('tenants.table_headers.booking_status', 'Booking Status'),
      sortable: true,
      accessor: 'booking_status',
      Cell: ({ value }) => {
        const v = (value || '').toString()
        const label = v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || tr('tenants.not_available', 'N/A')
        const cls = {
          pending: 'bg-amber-100 text-amber-800',
          reserved: 'bg-blue-100 text-blue-800',
          confirmed: 'bg-green-100 text-green-800',
          canceled: 'bg-red-100 text-red-800',
          converted: 'bg-gray-100 text-gray-800',
          checked_out: 'bg-gray-100 text-gray-800',
        }[v] || 'bg-gray-100 text-gray-800'
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold leading-4 whitespace-nowrap ${cls}`}>
            {label}
          </span>
        )
      }
    },
    {
      key: 'is_active',
      Header: tr('tenants.table_headers.status', 'Status'),
      sortable: true,
      accessor: 'is_active',
      Cell: ({ value }) => (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold leading-4 whitespace-nowrap ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? tr('tenants.active', 'Active') : tr('tenants.inactive', 'Inactive')}
        </span>
      )
    },
    {
      key: 'actions',
      Header: tr('tenants.table_headers.actions', 'Actions'),
      sortable: false,
      accessor: () => '',
      Cell: ({ row }) => (
        <TenantActions tenant={row} onEdit={onEdit} onChanged={() => fetchData()} />
      ),
    },
  ]

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Summary stats - inline responsive row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-gray-200 bg-white">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-indigo-50 text-indigo-600">
            <FiUsers className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs text-gray-500">{tr('tenants.counts.total', 'Total')}</span>
          <span className="text-sm font-semibold text-gray-900">{totalCount}</span>
        </div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-gray-200 bg-white">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-50 text-emerald-600">
            <FiUserCheck className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs text-gray-500">{tr('tenants.counts.active', 'Active')}</span>
          <span className="text-sm font-semibold text-gray-900">{activeCount}</span>
        </div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-gray-200 bg-white">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-rose-50 text-rose-600">
            <FiUserX className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs text-gray-500">{tr('tenants.counts.inactive', 'Inactive')}</span>
          <span className="text-sm font-semibold text-gray-900">{inactiveCount}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3 sm:mb-4 relative">
        <div className="flex-1">
          <Input
            type="text"
            placeholder={tr('tenants.placeholders.search', 'Search Tenants...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto">
          <Button variant="outline" onClick={() => setFilterOpen((v) => !v)}>
            {tr('tenants.filters', 'Filters')}{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </Button>
        </div>

        {filterOpen && (
          <div ref={filterRef} className="absolute right-0 top-full mt-2 z-20 w-full sm:w-[520px] bg-white border border-gray-200 rounded-md shadow-lg p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{tr('tenants.status', 'Status')}</label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: tr('tenants.all_statuses', 'All Statuses') },
                    { value: 'active', label: tr('tenants.active', 'Active') },
                    { value: 'inactive', label: tr('tenants.inactive', 'Inactive') },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{tr('tenants.gender', 'Gender')}</label>
                <Select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  options={[
                    { value: 'all', label: tr('tenants.all_genders', 'All Genders') },
                    { value: 'male', label: tr('tenants.gender_options.male', 'Male') },
                    { value: 'female', label: tr('tenants.gender_options.female', 'Female') },
                    { value: 'other', label: tr('tenants.gender_options.other', 'Other') },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{tr('tenants.date_range', 'Date Range')}</label>
                <Select
                  value={datePreset}
                  onChange={(e) => applyDatePreset(e.target.value)}
                  placeholder={tr('tenants.placeholders.date_range', 'Select date range')}
                  options={[
                    { value: 'today', label: tr('tenants.date_presets.today', 'Today') },
                    { value: 'yesterday', label: tr('tenants.date_presets.yesterday', 'Yesterday') },
                    { value: '7d', label: tr('tenants.date_presets.last_7_days', 'Last 7 days') },
                    { value: '30d', label: tr('tenants.date_presets.last_30_days', 'Last 30 days') },
                    { value: 'this_month', label: tr('tenants.date_presets.this_month', 'This Month') },
                    { value: 'last_month', label: tr('tenants.date_presets.last_month', 'Last Month') },
                    { value: 'this_year', label: tr('tenants.date_presets.this_year', 'This Year') },
                    { value: 'custom', label: tr('tenants.date_presets.custom', 'Custom Range') },
                  ]}
                />
              </div>
            </div>

            {datePreset === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
                <UIDatePicker
                  selected={dateFrom}
                  onChange={(d) => setDateFrom(d)}
                  label={tr('tenants.date_from', 'Check-in From')}
                  placeholderText={tr('tenants.placeholders.date', 'dd/mm/yyyy')}
                  isClearable
                />
                <UIDatePicker
                  selected={dateTo}
                  onChange={(d) => setDateTo(d)}
                  label={tr('tenants.date_to', 'Check-in To')}
                  placeholderText={tr('tenants.placeholders.date', 'dd/mm/yyyy')}
                  isClearable
                />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={clearFilters}>{tr('tenants.clear_filters', 'Clear')}</Button>
              <Button size="sm" onClick={() => setFilterOpen(false)}>{tr('tenants.apply_filters', 'Apply')}</Button>
            </div>
          </div>
        )}
      </div>

      <AsyncGuard
        loading={loading}
        error={error}
        data={sorted}
        onRetry={fetchData}
        emptyFallback={<div className="p-4 rounded-md border border-gray-200 bg-white text-gray-600">{tr('tenants.no_tenants', 'No Tenants found')}</div>}
      >
        <div className="bg-white rounded-lg shadow">
          <SortableTable
            columns={columns}
            data={paginated}
            sortBy={sortConfig.key}
            order={sortConfig.direction}
            onSort={handleSort}
            rowKey="id"
          />
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
      </AsyncGuard>
    </div>
  )
}

export default TenantsList