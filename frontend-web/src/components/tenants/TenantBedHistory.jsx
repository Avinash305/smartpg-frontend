import React, { useEffect, useMemo, useState } from 'react'
import { listBedHistory } from '../../services/tenants'
import api from '../../services/api'
import { SortableTable } from '../ui/SortableTable'
import Pagination from '../ui/Paginations'
import { formatDateOnly } from '../../utils/dateUtils'

const formatDate = (dateStr) => formatDateOnly(dateStr)

function StatusBadge({ row }) {
  const bstat = (row.booking_status || '').toLowerCase()
  const sstat = (row.stay_status || '').toLowerCase()
  const isEnded = !!row.ended_on

  let label = '—'
  let cls = 'bg-gray-100 text-gray-700'

  if (bstat) {
    if (bstat === 'pending') {
      label = 'Pending'
      cls = 'bg-amber-100 text-amber-800'
    } else if (bstat === 'reserved') {
      label = 'Reserved'
      cls = 'bg-blue-100 text-blue-800'
    } else if (bstat === 'confirmed') {
      label = 'Confirmed'
      cls = 'bg-green-100 text-green-800'
    } else if (bstat === 'canceled') {
      label = 'Canceled'
      cls = 'bg-red-100 text-red-800'
    } else if (bstat === 'converted') {
      label = 'Converted'
      cls = 'bg-slate-100 text-slate-800'
    }
  } else {
    // Fallback to stay status if booking status is not available
    if (sstat === 'active' && !isEnded) {
      label = 'Active'
      cls = 'bg-green-100 text-green-800'
    } else if (sstat === 'reserved') {
      label = 'Reserved'
      cls = 'bg-amber-100 text-amber-800'
    } else if (sstat === 'completed' || isEnded) {
      label = 'Completed'
      cls = 'bg-gray-100 text-gray-700'
    } else if (sstat === 'canceled') {
      label = 'Canceled'
      cls = 'bg-red-100 text-red-800'
    }
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

export default function TenantBedHistory({ items = [], limit = 10, tenantId, className = '' }) {
  const [fetched, setFetched] = useState([])
  const [bookingRows, setBookingRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [sortBy, setSortBy] = useState('started_on')
  const [order, setOrder] = useState('desc')

  // client-side pagination
  const [pageSize, setPageSize] = useState(limit || 10)
  const [page, setPage] = useState(1)

  const shouldFetch = !Array.isArray(items) || items.length === 0

  const params = useMemo(() => {
    const p = {}
    if (tenantId) p.tenant = tenantId
    if (limit) p.page_size = limit
    return p
  }, [tenantId, limit])

  // Reset page when tenant or inputs change
  useEffect(() => { setPage(1) }, [tenantId, limit])

  // Fetch bed history (stays)
  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!shouldFetch) return
      try {
        setLoading(true)
        setError('')
        const data = await listBedHistory(params)
        const results = Array.isArray(data) ? data : (data?.results || [])
        if (alive) setFetched(results)
      } catch (e) {
        if (alive) setError(e?.response?.data?.detail || 'Failed to load bed history')
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [shouldFetch, tenantId, params])

  // Fetch bookings for this tenant and map to history-like rows
  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!tenantId) { setBookingRows([]); return }
      try {
        setLoading(true)
        const resp = await api.get('/bookings/bookings/', { params: { tenant: tenantId, page_size: limit } })
        const list = Array.isArray(resp.data) ? resp.data : (Array.isArray(resp.data?.results) ? resp.data.results : [])
        const rows = list.map(b => ({
          key: `booking-${b.id}`,
          id: b.id,
          building_name: b.building_name,
          room_number: b.room_number,
          bed_number: b.bed_number,
          started_on: b.start_date,
          ended_on: b.end_date,
          booking_status: b.status,
          notes: b.notes,
        }))
        if (alive) setBookingRows(rows)
      } catch (e) {
        if (alive) {
          // Do not override existing error from history; just log booking fetch error
          console.warn('Failed to load bookings for tenant', e)
          setBookingRows([])
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [tenantId, limit])

  // Choose base history rows (from props or fetched), add stable keys
  const baseRows = useMemo(() => {
    const source = shouldFetch ? fetched : (limit ? items.slice(0, limit) : items)
    return (source || []).map(r => ({ ...r, key: r.key || `hist-${r.id}` }))
  }, [shouldFetch, fetched, items, limit])

  // Merge
  const merged = useMemo(() => ([...baseRows, ...bookingRows]), [baseRows, bookingRows])

  // Sort
  const sortedData = useMemo(() => {
    const arr = [...merged]
    const dir = order === 'asc' ? 1 : -1
    const getVal = (row) => {
      if (sortBy === 'building_name' || sortBy === 'room_number' || sortBy === 'bed_number') return (row[sortBy] || '').toLowerCase()
      if (sortBy === 'started_on' || sortBy === 'ended_on') return row[sortBy] || ''
      if (sortBy === 'status') return (row.booking_status || row.stay_status || '').toLowerCase()
      if (sortBy === 'notes') return (row.notes || '').toLowerCase()
      return row[sortBy]
    }
    arr.sort((a, b) => {
      const va = getVal(a)
      const vb = getVal(b)
      if (va === vb) return 0
      // For ended_on, empty is considered far future to keep ongoing first in desc
      if (sortBy === 'ended_on') {
        const aEmpty = !va
        const bEmpty = !vb
        if (aEmpty && bEmpty) return 0
        if (aEmpty) return -1 * dir
        if (bEmpty) return 1 * dir
      }
      return va > vb ? dir : -dir
    })
    return arr
  }, [merged, sortBy, order])

  // Pagination
  const total = sortedData.length
  const startIdx = (page - 1) * pageSize
  const endIdx = Math.min(startIdx + pageSize, total)
  const pagedData = sortedData.slice(startIdx, endIdx)

  const columns = useMemo(() => ([
    { key: 'building_name', title: 'Building', sortable: true, accessor: (row) => row.building_name || `#${row.building_id || '—'}` },
    { key: 'room_number', title: 'Room', sortable: true, accessor: (row) => row.room_number || '—' },
    { key: 'bed_number', title: 'Bed', sortable: true, accessor: (row) => row.bed_number || '—' },
    { key: 'started_on', title: 'Check-in', sortable: true, accessor: (row) => formatDate(row.started_on) },
    { key: 'ended_on', title: 'Check-out', sortable: true, accessor: (row) => row.ended_on ? formatDate(row.ended_on) : '—' },
    { key: 'status', title: 'Status', sortable: true, Cell: ({ row }) => <StatusBadge row={row} /> },
    { key: 'notes', title: 'Notes', sortable: true, accessor: (row) => row.notes || '—' },
  ]), [])

  const handleSort = (field, direction) => {
    setSortBy(field)
    setOrder(direction)
    setPage(1)
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      </div>
    )
  }

  return (
    <div className={`p-3 sm:p-4 ${className}`}>
      <SortableTable
        columns={columns}
        data={pagedData}
        sortBy={sortBy}
        order={order}
        onSort={handleSort}
        loading={loading && merged.length === 0}
        rowKey="key"
        noDataText="No bed history available"
      />

      <Pagination
        currentPage={page}
        totalItems={total}
        itemsPerPage={pageSize}
        onPageChange={(p) => setPage(p)}
        onItemsPerPageChange={(n) => { setPageSize(n); setPage(1) }}
        itemsPerPageOptions={[5, 10, 25, 50, 100]}
      />
    </div>
  )
}

function Th({ children }) {
  return (
    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  )
}

function Td({ children, title }) {
  return (
    <td className="px-3 py-2 text-sm whitespace-nowrap" title={title}>
      {children}
    </td>
  )
}