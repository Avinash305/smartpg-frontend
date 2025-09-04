import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getRooms, getFloor, guarded } from '../../services/properties'
import { Button } from '../ui/Button'
import { SortableTable } from '../ui/SortableTable'
import Card from '../ui/Card'
import { useToast } from '../../context/ToastContext'
import AsyncGuard from '../common/AsyncGuard'
import { useCan } from '../../context/AuthContext'
import RoomActions from './RoomActions'
import { FiGrid, FiBox, FiLayers, FiBarChart2, FiList } from 'react-icons/fi'
import { createPortal } from 'react-dom'
import { useColorScheme } from '../../theme/colorSchemes'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../utils/dateUtils'

const toReadableType = (v, tr) => {
  if (!v) return '-'
  if (v === 'single_sharing') return tr('rooms.types.single_sharing', 'Single Sharing')
  const [n] = String(v).split('_')
  const num = Number(n)
  if (!Number.isNaN(num)) return tr('rooms.types.n_sharing', '{{n}} Sharing', { n: num })
  return v
}

// Inline bed occupancy stats for a single room
const InlineRoomStats = ({ roomId, buildingScopeId, can }) => {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [stats, setStats] = useState({ beds: 0, occupiedBeds: 0, maintenanceBeds: 0 })
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0 })
  const tipRef = useRef(null)

  const tipPos = (x, y, ref) => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0
    const tipW = ref?.current ? ref.current.offsetWidth : 0
    const tipH = ref?.current ? ref.current.offsetHeight : 0
    const left = Math.min(Math.max(x - tipW / 2, 8), Math.max(8, vw - 8 - tipW))
    const top = Math.max(y - tipH - 10, 8)
    return { left, top }
  }

  useEffect(() => {
    let cancelled = false
    if (!roomId) return
    setLoading(true)
    setErr('')
    const hasGlobalBedsView = typeof can === 'function' ? can('beds', 'view', 'global') : false
    const scope = buildingScopeId || (hasGlobalBedsView ? 'global' : null)
    // If we don't have a usable scope or lack permission, skip stats to avoid client-side 403
    if (!scope || (typeof can === 'function' && !can('beds', 'view', scope))) {
      if (!cancelled) { setErr('no_permission'); setLoading(false) }
      return
    }
    const api = guarded(can, scope)
    api.getBeds({ room: roomId, page_size: 1000 })
      .then((bedsRes) => {
        if (cancelled) return
        const bedsArr = Array.isArray(bedsRes) ? bedsRes : (bedsRes?.results || [])
        const occupiedBeds = bedsArr.filter(b => b.status === 'occupied').length
        const maintenanceBeds = bedsArr.filter(b => b.status === 'maintenance').length
        setStats({ beds: bedsArr.length, occupiedBeds, maintenanceBeds })
      })
      .catch((e) => !cancelled && setErr(e?.response?.data?.detail || e.message || ''))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [roomId, buildingScopeId, can])

  // Ensure hooks order is stable on every render (before any early returns)
  const scheme = useColorScheme('default')
  const { t } = useTranslation()
  const tr = (key, fallback, opt) => t(key, { defaultValue: fallback, ...(opt || {}) })

  if (err || loading) return null
  const pct = stats.beds > 0 ? Math.round((stats.occupiedBeds / stats.beds) * 100) : 0
  const availableCount = Math.max(stats.beds - stats.occupiedBeds - (stats.maintenanceBeds || 0), 0)
  const availablePct = stats.beds > 0 ? Math.round((availableCount / stats.beds) * 100) : 0
  const maintPct = stats.beds > 0 ? Math.round(((stats.maintenanceBeds || 0) / stats.beds) * 100) : 0

  // Text colors from scheme for counts/hover
  // Use unified accent text classes directly (consistent after scheme unification)
  // Occupied switched to purple across the app
  const occupiedText = scheme.accents?.purple?.text || 'text-purple-700'
  const availableText = scheme.accents?.emerald?.text || 'text-emerald-700'
  const maintenanceText = scheme.accents?.slate?.text || 'text-slate-700'

  return (
    <div className="group text-[10px] sm:text-[11px] text-gray-700 space-y-1.5">
      <div className="flex items-center gap-2 text-gray-900 font-medium">
        <FiBarChart2 className="h-3.5 w-3.5" />
        <span>{t('rooms.bed_occupancy') || 'Bed Occupancy'}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="relative h-1.5 sm:h-2 group-hover:h-2.5 transition-all w-full overflow-visible cursor-pointer"
          onMouseEnter={() => setTooltip({ show: true, x: 0, y: 0 })}
          onMouseLeave={() => setTooltip({ show: false, x: 0, y: 0 })}
          onMouseMove={(e) => { setTooltip({ show: true, x: e.clientX, y: e.clientY }) }}
        >
          <div className={`absolute inset-0 ${scheme.neutral?.track || 'bg-gray-200'} rounded-full overflow-hidden shadow-inner`}>
            <div className="absolute inset-0 rounded-full overflow-hidden flex">
              {/* Occupied segment */}
              <div
                className={`${scheme.occupied.seg} h-full transition-all duration-300`}
                style={{ width: `${pct}%` }}
              />
              {/* Maintenance segment */}
              {maintPct > 0 && (
                <div
                  className={`${scheme.maintenance.seg} h-full transition-all duration-300`}
                  style={{ width: `${maintPct}%` }}
                />
              )}
              {/* Available segment fills the rest */}
              {availablePct > 0 && (
                <div
                  className={`${scheme.available.seg} h-full transition-all duration-300`}
                  style={{ width: `${availablePct}%` }}
                />
              )}
            </div>
            {/* Glossy/stripes overlay for visual depth */}
            <div
              className="absolute inset-0"
              style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0) 40%), repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0, rgba(255,255,255,0.18) 6px, transparent 6px, transparent 12px)' }}
            />
          </div>
          {tooltip.show && createPortal(
            <div
              ref={tipRef}
              className={`pointer-events-none fixed px-2.5 py-1.5 rounded-md ${scheme.neutral?.tooltipBg || 'bg-white'} ${(scheme.neutral?.heading || 'text-gray-900')} text-[11px] shadow-xl ring-1 ${scheme.neutral?.tooltipRing || 'ring-gray-200'} whitespace-normal break-words`}
              style={{ ...tipPos(tooltip.x, tooltip.y, tipRef), maxWidth: 'min(90vw, 360px)', zIndex: 2147483647 }}
            >
              <span className="inline-flex items-center gap-1">
                <span className={`inline-block h-2 w-2 rounded-full ${scheme.occupied?.dot}`}></span>
                <span className={occupiedText}>{pct}% {tr('rooms.occupied', 'Occupied')}</span>
                <span className="opacity-70">({stats.occupiedBeds}/{stats.beds})</span>
                <span className="mx-1 opacity-40">•</span>
                <span className={`inline-block h-2 w-2 rounded-full ${scheme.available?.dot}`}></span>
                <span className={availableText}>{availablePct}% {tr('rooms.available', 'Available')}</span>
                <span className="opacity-70">({availableCount}/{stats.beds})</span>
                {stats.maintenanceBeds > 0 && (
                  <>
                    <span className="mx-1 opacity-40">•</span>
                    <span className={`inline-block h-2 w-2 rounded-full ${scheme.maintenance?.dot}`}></span>
                    <span className={maintenanceText}>{stats.maintenanceBeds} {tr('rooms.maintenance', 'Maintenance')}</span>
                  </>
                )}
              </span>
            </div>, document.body
          )}
        </div>
        <div className={"shrink-0 tabular-nums " + occupiedText}><span className="text-[10px] sm:text-[11px]">{pct}% ({stats.occupiedBeds}/{stats.beds})</span></div>
      </div>
      {/* Labels with counts */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-medium border ${scheme.available.badge}`}>
          <span className={`inline-block h-2 w-2 rounded-full ${scheme.available.dot}`}></span>
          {tr('rooms.available', 'Available')}: {availableCount}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-medium border ${scheme.occupied.badge}`}>
          <span className={`inline-block h-2 w-2 rounded-full ${scheme.occupied.dot}`}></span>
          {tr('rooms.occupied', 'Occupied')}: {stats.occupiedBeds}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-medium border ${scheme.maintenance.badge}`}>
          <span className={`inline-block h-2 w-2 rounded-full ${scheme.maintenance.dot}`}></span>
          {tr('rooms.maintenance', 'Maintenance')}: {stats.maintenanceBeds}
        </span>
      </div>
    </div>
  )
}

const RoomsList = ({ floorId = null, reloadKey = 0, onEdit = null, buildingInactive = false }) => {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('number')
  const [order, setOrder] = useState('asc')
  // Default to 'cards' view for RoomsList
  const getDefaultView = () => 'cards'
  const [view, setView] = useState(getDefaultView)
  const { addToast } = useToast()
  const { can, permissions } = useCan()
  // Color scheme for badges/chips in RoomsList cards
  const scheme = useColorScheme('default')
  const { t } = useTranslation()
  const tr = (key, fallback, opt) => t(key, { defaultValue: fallback, ...(opt || {}) })

  const load = () => {
    setLoading(true)
    const params = { page_size: 1000 }
    if (floorId) params.floor = floorId

    // If a specific floor is provided, resolve its building and use building-scoped guarded API
    if (floorId) {
      setError('')
      getFloor(floorId)
        .then((floor) => {
          const buildingScopeId = floor?.building || floor?.building_id || floor?.buildingId
          if (!buildingScopeId) return Promise.reject(new Error(tr('rooms.load_failed', 'Failed to load rooms')))
          if (typeof can === 'function' && !can('rooms', 'view', buildingScopeId)) {
            const msg = tr('rooms.permission_denied', 'You do not have permission to view rooms')
            setError(msg)
            addToast({ type: 'warning', message: msg })
            setRooms([])
            return null
          }
          const api = guarded(can, buildingScopeId)
          return api.getRooms(params)
        })
        .then((data) => {
          if (data == null) return
          const arr = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
          setError('')
          setRooms(arr)
        })
        .catch((err) => {
          const status = err?.status || err?.response?.status
          if (status === 403) {
            setError(tr('rooms.permission_denied', 'You do not have permission to view rooms'))
          } else if (err) {
            setError(err?.response?.data?.detail || err.message || tr('rooms.load_failed', 'Failed to load rooms'))
          }
          if (err) addToast({ message: err?.response?.data?.detail || err.message || tr('rooms.load_failed', 'Failed to load rooms'), type: 'error' })
        })
        .finally(() => setLoading(false))
      return
    }

    // Global list
    const hasGlobalView = can('rooms', 'view', 'global')
    const api = guarded(can, 'global')
    const listPromise = hasGlobalView ? api.getRooms(params) : getRooms(params)
    listPromise
      .then((data) => {
        let arr = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
        if (!hasGlobalView) {
          // Filter to buildings the user can view
          arr = arr.filter(r => can('rooms', 'view', r?.building || r?.building_id || r?.buildingId))
          if (arr.length === 0) {
            const msg = tr('rooms.permission_denied', 'You do not have permission to view rooms')
            setError(msg)
          } else {
            setError('')
          }
        } else {
          setError('')
        }
        setRooms(arr)
      })
      .catch((err) => {
        const status = err?.status || err?.response?.status
        if (status === 403) {
          setError(tr('rooms.permission_denied', 'You do not have permission to view rooms'))
        } else {
          setError(err?.response?.data?.detail || err.message || tr('rooms.load_failed', 'Failed to load rooms'))
        }
        addToast({ message: err?.response?.data?.detail || err.message || tr('rooms.load_failed', 'Failed to load rooms'), type: 'error' })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [floorId, reloadKey])

  const onSort = (field, direction) => {
    setSortBy(field)
    setOrder(direction)
  }

  const sortedData = useMemo(() => {
    const data = [...rooms]
    const dir = order === 'asc' ? 1 : -1
    return data.sort((a, b) => {
      let v1 = a[sortBy]
      let v2 = b[sortBy]
      if (sortBy === 'monthly_rent' || sortBy === 'security_deposit' || sortBy === 'capacity') {
        v1 = Number(v1)
        v2 = Number(v2)
      }
      if (v1 == null && v2 == null) return 0
      if (v1 == null) return -1 * dir
      if (v2 == null) return 1 * dir
      if (typeof v1 === 'string' && typeof v2 === 'string') return v1.localeCompare(v2) * dir
      if (v1 > v2) return 1 * dir
      if (v1 < v2) return -1 * dir
      return 0
    })
  }, [rooms, sortBy, order])

  const columns = [
    { key: 'number', title: <span className="capitalize">{tr('rooms.room', 'Room')}</span>, accessor: (row) => (
      row?.id ? <Link to={`/rooms/${row.id}`} className={`${(scheme.accents?.sky?.text || 'text-blue-600')} hover:underline`} onClick={(e) => e.stopPropagation()}>{row.number || '-'}</Link> : (row.number || '-')
    ), sortable: true },
    ...(!floorId ? [{ key: 'floor_display', title: <span className="capitalize">{tr('rooms.floor', 'Floor')}</span>, accessor: (row) => row.floor_display || '-', sortable: true }] : []),
    { key: 'room_type', title: <span className="capitalize">{tr('rooms.type', 'Type')}</span>, accessor: (row) => toReadableType(row.room_type, tr), sortable: true },
    { key: 'capacity', title: <span className="capitalize">{tr('rooms.capacity', 'Capacity')}</span>, accessor: (row) => row.capacity ?? '-', sortable: true },
    { key: 'monthly_rent', title: <span className="capitalize">{tr('rooms.rent', 'Rent')}</span>, accessor: (row) => formatCurrency(row.monthly_rent), sortable: true },
    { key: 'security_deposit', title: <span className="capitalize">{tr('rooms.deposit', 'Deposit')}</span>, accessor: (row) => formatCurrency(row.security_deposit), sortable: true },
    { key: 'is_active', title: <span className="capitalize">{tr('rooms.available', 'Available')}</span>, accessor: (row) => (row.is_active ? tr('rooms.yes', 'Yes') : tr('rooms.no', 'No')), sortable: true },
    { key: 'actions', title: <span className="capitalize">{tr('rooms.actions', 'Actions')}</span>, accessor: (row) => (
      <div className="flex justify-end">
        <RoomActions room={row} onChanged={() => load()} onEdit={onEdit} buildingInactive={buildingInactive} />
      </div>
    ), sortable: false, headerClassName: 'text-right' },
  ]

  return (
    <AsyncGuard
      loading={loading}
      error={error}
      data={sortedData}
      onRetry={load}
      emptyFallback={<div className="text-center text-gray-500 py-10">{floorId ? tr('rooms.no_rooms_for_floor', 'No rooms found for this floor') : tr('rooms.no_rooms', 'No rooms found')}</div>}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
            className="flex items-center gap-2"
          >
            <FiList />
            <span className="capitalize">{tr('rooms.list', 'List')}</span>
          </Button>
          <Button
            variant={view === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('cards')}
            className="flex items-center gap-2"
          >
            <FiGrid />
            <span className="capitalize">{tr('rooms.cards', 'Cards')}</span>
          </Button>
        </div>

        {view === 'list' ? (
          <SortableTable
            columns={columns}
            data={sortedData}
            sortBy={sortBy}
            order={order}
            onSort={onSort}
            rowKey="id"
            loading={loading}
            noDataText={floorId ? tr('rooms.no_rooms_for_floor', 'No rooms found for this floor') : tr('rooms.no_rooms', 'No rooms found')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:gap-6">
            {sortedData.length === 0 ? (
              <div className={`col-span-full text-center ${scheme.neutral?.emptyText || 'text-gray-500'} py-10`}>
                {floorId ? tr('rooms.no_rooms_for_floor', 'No rooms found for this floor') : tr('rooms.no_rooms', 'No rooms found')}
              </div>
            ) : (
              sortedData.map((r) => (
                <Card
                  key={r.id}
                  className={"overflow-visible rounded-xl transition-transform hover:-translate-y-1 hover:shadow-xl ring-1 " + (scheme.neutral?.cardRing || 'ring-gray-100') + " hover:" + (scheme.neutral?.cardRingHover || 'ring-gray-300')}
                  title={
                    <div className="flex items-center gap-2">
                    
                      {r?.id ? (
                        <Link to={`/rooms/${r.id}`} className={`${(scheme.accents?.sky?.text || 'text-blue-600')} hover:underline`} onClick={(e) => e.stopPropagation()}>{tr('rooms.room', 'Room')} {r.number || '-'}</Link>
                      ) : (r.number || '-')}
                    </div>
                  }
                  description={!floorId ? (
                    <div className={"flex items-center gap-1 " + (scheme.neutral?.subtle || 'text-gray-600')}>
                      <FiLayers className="h-3.5 w-3.5" />
                      <span className="truncate">{r.floor_display || ''}</span>
                    </div>
                  ) : ''}
                  padding="xs"
                  actions={
                    <div className="flex items-center gap-2">
                      <RoomActions room={r} onChanged={() => load()} onEdit={onEdit} buildingInactive={buildingInactive} />
                    </div>
                  }
                >
                  <div className="text-[11px] sm:text-xs text-gray-700 grid grid-cols-2 gap-x-3 gap-y-1">
                    <div><span className="text-gray-500">{tr('rooms.rent', 'Rent')}:</span> {formatCurrency(r.monthly_rent)}</div>
                    <div><span className="text-gray-500">{tr('rooms.deposit', 'Deposit')}:</span> {formatCurrency(r.security_deposit)}</div>
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-gray-500">{tr('rooms.available', 'Available')}:</span>
                      {r.is_active ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium border ${scheme.accents?.emerald?.bg || 'bg-emerald-50'} ${scheme.accents?.emerald?.text || 'text-emerald-700'} border-emerald-100`}>{tr('rooms.yes', 'Yes')}</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium border ${scheme.accents?.rose?.bg || 'bg-rose-50'} ${scheme.accents?.rose?.text || 'text-rose-700'} border-rose-100`}>{tr('rooms.no', 'No')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {typeof r.capacity === 'number' && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium border ${scheme.accents?.amber?.bg || 'bg-amber-50'} ${scheme.accents?.amber?.text || 'text-amber-700'} border-amber-100`}>
                        <FiGrid className="h-3 w-3" /> {r.capacity} {tr('rooms.capacity', 'Capacity')}
                      </span>
                    )}
                    {r.room_type && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium border ${scheme.accents?.emerald?.bg || 'bg-emerald-50'} ${scheme.accents?.emerald?.text || 'text-emerald-700'} border-emerald-100`}>
                        <FiBox className="h-3 w-3" /> {toReadableType(r.room_type, tr)}
                      </span>
                    )}
                  </div>
                  {/* Inline bed occupancy bar per room */}
                  <div className="pt-1.5">
                    <InlineRoomStats roomId={r.id} buildingScopeId={r.building || r.building_id || r.buildingId} can={can} />
                  </div>
                  <div className={`mt-3 pt-3 border-t ${scheme.neutral?.divider || 'border-gray-100'} flex items-center justify-end gap-2`}>
                    <Link
                      to={`/rooms/${r.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-sm ${(scheme.accents?.sky?.text || 'text-blue-600')} p-2 capitalize font-semibold transition-transform duration-150 hover:scale-[1.10]`}
                    >
                      {tr('rooms.view_details', 'View details')}
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AsyncGuard>
  )
}

export default RoomsList