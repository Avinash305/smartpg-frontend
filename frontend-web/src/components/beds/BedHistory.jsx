import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../ui/Card'
import { SortableTable } from '../ui/SortableTable'
import { getBedHistory } from '../../services/properties'
import { Button } from '../ui/Button'
import api from '../../services/api'
import Pagination from '../ui/Paginations'
import { useColorScheme } from '../../theme/colorSchemes'
import { FiSearch, FiRefreshCw } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { formatDateOnly } from '../../utils/dateUtils'

function StatusBadge({ value }) {
  const scheme = useColorScheme('default')
  const raw = value == null ? '' : String(value)
  const s = raw.trim().toLowerCase()
  // Map to shared badge styles from scheme
  let cls = scheme.neutral?.text
  if (s === 'active' || s === 'confirmed' || s === 'present') cls = scheme.available?.badge
  else if (s === 'reserved' || s === 'pending') cls = scheme.reserved?.badge
  else if (s === 'completed' || s === 'converted') cls = scheme.occupied?.badge
  else if (s === 'canceled' || s === 'cancelled') cls = scheme.maintenance?.badge
  const label = (!s || s === '-') ? '—' : raw
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${cls}`}>
      {label}
    </span>
  )
}

const BedHistory = ({ bed }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [sortBy, setSortBy] = useState('started_on')
  const [order, setOrder] = useState('desc')
  // pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [query, setQuery] = useState('')
  const { t } = useTranslation()
  const tr = (k, f, opt) => t(k, { defaultValue: f, ...(opt || {}) })

  const loadHistory = useCallback(async () => {
    if (!bed?.id) { setItems([]); return }
    setLoading(true)
    try {
      // Fetch stay-based bed history
      const histPromise = getBedHistory(bed.id)
      // Fetch bookings for this bed
      const bookingsPromise = api.get('/bookings/bookings/', { params: { bed: bed.id } }).then(r => Array.isArray(r.data) ? r.data : (Array.isArray(r.data?.results) ? r.data.results : []))

      const [hist, bookings] = await Promise.all([histPromise, bookingsPromise])

      // Normalize to common row shape and add a stable key
      const historyRows = (Array.isArray(hist) ? hist : []).map(row => ({
        ...row,
        key: `hist-${row.id}`,
      }))

      const bookingRows = bookings.map(b => ({
        key: `booking-${b.id}`,
        id: b.id, // keep original for reference (not used as rowKey)
        tenant_name: b.tenant_name,
        tenant: b.tenant_name,
        tenant_id: b.tenant || b.tenant_id,
        started_on: b.start_date,
        ended_on: b.end_date,
        stay_status: '-',
        booking_status: b.status,
        room_number: b.room_number,
        building_name: b.building_name,
      }))

      setItems([...historyRows, ...bookingRows])
    } catch (_) {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [bed?.id])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const label = bed?.number ? tr('beds.bed_with_number', 'Bed {{n}}', { n: bed.number }) : tr('beds.bed', 'Bed')

  // Filter by query (client-side)
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(r => {
      const fields = [
        r.tenant_name,
        r.tenant,
        r.room_number,
        r.building_name,
        r.booking_status,
        r.stay_status,
        r.started_on && formatDateOnly(r.started_on),
        r.ended_on && formatDateOnly(r.ended_on),
      ]
      return fields.some(v => String(v || '').toLowerCase().includes(q))
    })
  }, [items, query])

  // Reset to first page on query change
  useEffect(() => { setPage(1) }, [query])

  const scheme = useColorScheme('default')
  const columns = useMemo(() => ([
    { key: 'tenant', title: tr('tenants.tenant', 'Tenant'), sortable: true, Cell: ({ row }) => {
      const name = row.tenant_name || row.tenant || '-'
      const tid = row.tenant_id
      if (!tid) return <span>{name}</span>
      return (
        <button type="button" className={`${scheme.accents?.sky?.text} hover:underline cursor-pointer`} onClick={() => navigate(`/tenants/${tid}`)}>
          {name}
        </button>
      )
    } },
    { key: 'room_number', title: tr('rooms.room', 'Room'), sortable: true, accessor: (row) => row.room_number || '-' },
    { key: 'started_on', title: tr('stays.check_in', 'Check-in'), sortable: true, accessor: (row) => formatDateOnly(row.started_on) },
    { key: 'ended_on', title: tr('stays.check_out', 'Check-out'), sortable: true, Cell: ({ row }) => (
      row.ended_on
        ? <span>{formatDateOnly(row.ended_on)}</span>
        : <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${scheme.available?.badge}`}>{tr('stays.present', 'Present')}</span>
    ) },
    { key: 'stay_status', title: tr('stays.stay', 'Stay'), sortable: true, Cell: ({ row }) => {
      const val = row.stay_status || row.booking_status || ''
      return <StatusBadge value={val} />
    } },
    { key: 'booking_status', title: tr('bookings.booking', 'Booking'), sortable: true, Cell: ({ row }) => <StatusBadge value={row.booking_status} /> },
  ]), [navigate, scheme, t])

  const sortedData = useMemo(() => {
    const arr = [...filteredItems]
    const dir = order === 'asc' ? 1 : -1
    const getVal = (row) => {
      if (sortBy === 'tenant') return (row.tenant_name || row.tenant || '').toLowerCase()
      if (sortBy === 'started_on' || sortBy === 'ended_on') return row[sortBy] || ''
      if (sortBy === 'stay_status') return (row.stay_status || row.booking_status || '').toLowerCase()
      if (sortBy === 'booking_status') return (row.booking_status || '').toLowerCase()
      return row[sortBy]
    }
    arr.sort((a, b) => {
      const va = getVal(a)
      const vb = getVal(b)
      if (va === vb) return 0
      // Treat empty ended_on as far future to keep ongoing first in desc
      if (sortBy === 'ended_on') {
        const aEmpty = !va
        const bEmpty = !vb
        if (aEmpty && bEmpty) return 0
        if (aEmpty) return -1 * dir // ongoing comes before when desc
        if (bEmpty) return 1 * dir
      }
      return va > vb ? dir : -dir
    })
    return arr
  }, [filteredItems, sortBy, order])

  // derive page slice
  const total = sortedData.length
  const startIdx = (page - 1) * pageSize
  const endIdx = Math.min(startIdx + pageSize, total)
  const pagedData = sortedData.slice(startIdx, endIdx)

  const handleSort = (field, direction) => {
    setSortBy(field)
    setOrder(direction)
  }

  const showOccupiedNoHistoryHint = !loading && items.length === 0 && bed?.status === 'occupied'

  return (
    <Card
      title={tr('beds.history.title_for_label', 'Bed History for {{label}}', { label })}
      description={tr('beds.history.description', 'Recent stays and bookings for this bed')}
      padding="sm"
      actions={
        <div className="flex items-center gap-3">
          <div className="relative">
            <FiSearch className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${scheme.neutral?.muted}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr('common.search_placeholder', 'Search by tenant, room, status...')}
              className={`pl-8 pr-3 py-1.5 text-sm w-52 sm:w-60 rounded-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 ${scheme.neutral?.text}`}
            />
          </div>
          <span className={`text-xs sm:text-sm ${scheme.neutral?.muted}`}>{tr('common.total_count', 'Total: {{n}}', { n: filteredItems.length })}</span>
          <Button size="sm" variant="outline" onClick={loadHistory} disabled={loading} className="inline-flex items-center gap-2">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            <span>{loading ? tr('common.refreshing', 'Refreshing...') : tr('common.refresh', 'Refresh')}</span>
          </Button>
        </div>
      }
    >
      {showOccupiedNoHistoryHint && (
        <div className={`px-4 py-2 text-sm ${scheme.neutral?.text} border-b ${scheme.neutral?.divider}`}>
          {tr('beds.history.occupied_no_history_hint', 'Bed is marked as Occupied due to a Booking, but there is no Stay history yet. Create a Stay to track bed usage history.')}
        </div>
      )}
      <SortableTable
        columns={columns}
        data={pagedData}
        sortBy={sortBy}
        order={order}
        onSort={handleSort}
        loading={loading}
        rowKey="key"
        noDataText={tr('beds.history.no_history', 'No history found')}
        className="border-0 shadow-none rounded-none"
      />
      <Pagination
        currentPage={page}
        totalItems={total}
        itemsPerPage={pageSize}
        onPageChange={(p) => setPage(p)}
        onItemsPerPageChange={(n) => { setPageSize(n); setPage(1) }}
        itemsPerPageOptions={[5, 10, 25, 50, 100]}
      />
    </Card>
  )
}

export default BedHistory