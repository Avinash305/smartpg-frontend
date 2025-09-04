import React, { useEffect, useMemo, useState, useRef } from 'react'
import { guarded, getFloors as fetchFloors } from '../../services/properties'
import { Button } from '../ui/Button'
import { SortableTable } from '../ui/SortableTable'
import Card from '../ui/Card'
import LoadingSpinner from '../ui/LoadingSpinner'
import { Link } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import FloorActions from './FloorActions'
import { useCan } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { FiGrid, FiList, FiBox, FiLayers, FiBarChart2, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import { createPortal } from 'react-dom'
import { useColorScheme } from '../../theme/colorSchemes'

const toFloorLabel = (n, t) => {
  const num = Number(n)
  if (Number.isNaN(num)) return t('floors.floor_label_unknown') || '-'
  if (num === 0) return t('floors.floor_label_ground') || 'Ground Floor'
  const s = ['th','st','nd','rd']
  const v = num % 100
  return `${num}${s[(v - 20) % 10] || s[v] || s[0]} ${t('floors.floor_label_suffix') || 'Floor'}`
}

// Inline stats for a single floor (capacity & occupancy bars)
const InlineFloorStats = ({ floorId, buildingScopeId, can }) => {
  const scheme = useColorScheme('default')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [stats, setStats] = useState({ rooms: 0, beds: 0, occupiedBeds: 0, occupiedRooms: 0 })
  const [tooltipRoom, setTooltipRoom] = useState({ show: false, x: 0, y: 0 })
  const [tooltipBed, setTooltipBed] = useState({ show: false, x: 0, y: 0 })
  const roomTipRef = useRef(null)
  const bedTipRef = useRef(null)
  const { t } = useTranslation()

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
    if (!floorId) return
    const api = guarded(can, buildingScopeId)
    setLoading(true)
    setErr('')
    Promise.all([
      api.getRooms({ floor: floorId, page_size: 1000 }).catch(() => ({ results: [] })),
      api.getBeds({ floor: floorId, page_size: 1000 }).catch(() => ({ results: [] })),
    ])
      .then(([roomsRes, bedsRes]) => {
        if (cancelled) return
        const roomsArr = Array.isArray(roomsRes) ? roomsRes : (roomsRes?.results || [])
        const bedsArr = Array.isArray(bedsRes) ? bedsRes : (bedsRes?.results || [])
        const occupiedBeds = bedsArr.filter(b => b.status === 'occupied').length
        const occupiedRoomIds = new Set(bedsArr.filter(b => b.status === 'occupied' && b.room).map(b => b.room))
        setStats({
          rooms: roomsArr.length,
          beds: bedsArr.length,
          occupiedBeds,
          occupiedRooms: occupiedRoomIds.size,
        })
      })
      .catch((e) => setErr(e?.response?.data?.detail || e.message || (t('floors.load_failed') || 'Failed to load floors')))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [floorId, buildingScopeId, can])

  if (err) return null
  const buildBar = (filled, total, length = 10) => {
    const pct = total > 0 ? Math.round((filled / total) * 100) : 0
    const blocks = Math.round((pct / 100) * length)
    const full = '█'.repeat(Math.max(0, Math.min(length, blocks)))
    const empty = '░'.repeat(Math.max(0, length - blocks))
    return { bar: `[${full}${empty}]`, pct }
  }

  const room = buildBar(stats.occupiedRooms, stats.rooms, 10)
  const bed = buildBar(stats.occupiedBeds, stats.beds, 12)
  const occupiedSeg = scheme?.occupied?.seg || 'bg-purple-500'
  const availableSeg = scheme?.available?.seg || 'bg-emerald-500'
  const occupiedDot = scheme?.occupied?.dot || 'bg-purple-500'
  const availableDot = scheme?.available?.dot || 'bg-emerald-500'
  const occupiedText = scheme?.accents?.purple?.text || 'text-purple-700'
  const availableText = scheme?.accents?.emerald?.text || 'text-emerald-700'

  return (
    <div className={"group text-[10px] sm:text-[11px] " + (scheme.neutral?.text || 'text-gray-700') + " space-y-1.5"}>
      <div className={"flex items-center gap-2 font-medium " + (scheme.neutral?.heading || 'text-gray-900')}>
        <FiLayers className="h-3.5 w-3.5" />
        <span>{t('floors.capacity') || 'Capacity'}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full ${scheme.accents?.amber?.bg || 'bg-amber-50'} ${scheme.accents?.amber?.text || 'text-amber-700'} ring-1 ${scheme.accents?.amber?.ring || 'ring-amber-200'} px-2 py-0.5 font-medium`}>
          <FiGrid className="h-3 w-3" /> {stats.rooms} {(t('floors.rooms') || 'Rooms')}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full ${scheme.accents?.emerald?.bg || 'bg-emerald-50'} ${scheme.accents?.emerald?.text || 'text-emerald-700'} ring-1 ${scheme.accents?.emerald?.ring || 'ring-emerald-200'} px-2 py-0.5 font-medium`}>
          <FiBox className="h-3 w-3" /> {stats.beds} {(t('floors.beds') || 'Beds')}
        </span>
      </div>

      <div className={"flex items-center gap-2 font-medium mt-1 " + (scheme.neutral?.heading || 'text-gray-900')}>
        <FiBarChart2 className="h-3.5 w-3.5" />
        <span>{t('floors.room_occupancy') || 'Room Occupancy'}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="relative h-1.5 sm:h-2 group-hover:h-2.5 transition-all w-full overflow-visible cursor-pointer"
          onMouseEnter={() => setTooltipRoom({ show: true, x: 0, y: 0 })}
          onMouseLeave={() => setTooltipRoom({ show: false, x: 0, y: 0 })}
          onMouseMove={(e) => { setTooltipRoom({ show: true, x: e.clientX, y: e.clientY }) }}
        >
          <div className={`absolute inset-0 ${scheme.neutral?.track || 'bg-gray-200'} rounded-full overflow-hidden shadow-inner`}>
            <div className="absolute inset-0 rounded-full overflow-hidden flex">
              <div className={`${occupiedSeg} h-full transition-all duration-300`} style={{ width: `${room.pct}%` }} />
              <div className={`${availableSeg} h-full transition-all duration-300`} style={{ width: `${Math.max(100 - room.pct, 0)}%` }} />
            </div>
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0) 40%), repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0, rgba(255,255,255,0.18) 6px, transparent 6px, transparent 12px)' }} />
          </div>
          {tooltipRoom.show && createPortal(
            <div
              ref={roomTipRef}
              className={`pointer-events-none fixed px-2.5 py-1.5 rounded-md ${scheme.neutral?.tooltipBg || 'bg-white'} ${(scheme.neutral?.heading || 'text-gray-900')} text-[11px] shadow-xl ring-1 ${scheme.neutral?.tooltipRing || 'ring-gray-200'} whitespace-normal break-words`}
              style={{ ...tipPos(tooltipRoom.x, tooltipRoom.y, roomTipRef), maxWidth: 'min(90vw, 360px)', zIndex: 2147483647 }}
            >
              <span className="inline-flex items-center gap-1">
                <span className={`inline-block h-2 w-2 rounded-full ${occupiedDot}`}></span>
                <span className={occupiedText}>{t('floors.tooltip_occupied', { pct: room.pct }) || `${room.pct}% occupied`}</span>
                <span className="opacity-70">({stats.occupiedRooms}/{stats.rooms})</span>
                <span className="mx-1 opacity-40">•</span>
                <span className={availableText}>{t('floors.tooltip_available', { pct: Math.max(100 - room.pct, 0) }) || `${100 - room.pct}% available`}</span>
                <span className="opacity-70">({Math.max(stats.rooms - stats.occupiedRooms,0)}/{stats.rooms})</span>
              </span>
            </div>, document.body
          )}
        </div>
        <div className={"shrink-0 tabular-nums " + occupiedText}><span className="text-[10px] sm:text-[11px]">{room.pct}% ({stats.occupiedRooms}/{stats.rooms})</span></div>
      </div>

      <div className={"flex items-center gap-2 font-medium mt-1 " + (scheme.neutral?.heading || 'text-gray-900')}>
        <FiBarChart2 className="h-3.5 w-3.5" />
        <span>{t('floors.bed_occupancy') || 'Bed Occupancy'}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="relative h-1.5 sm:h-2 group-hover:h-2.5 transition-all w-full overflow-visible cursor-pointer"
          onMouseEnter={() => setTooltipBed({ show: true, x: 0, y: 0 })}
          onMouseLeave={() => setTooltipBed({ show: false, x: 0, y: 0 })}
          onMouseMove={(e) => { setTooltipBed({ show: true, x: e.clientX, y: e.clientY }) }}
        >
          <div className={`absolute inset-0 ${scheme.neutral?.track || 'bg-gray-200'} rounded-full overflow-hidden shadow-inner`}>
            <div className="absolute inset-0 rounded-full overflow-hidden flex">
              <div className={`${occupiedSeg} h-full transition-all duration-300`} style={{ width: `${bed.pct}%` }} />
              <div className={`${availableSeg} h-full transition-all duration-300`} style={{ width: `${Math.max(100 - bed.pct, 0)}%` }} />
            </div>
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0) 40%), repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0, rgba(255,255,255,0.18) 6px, transparent 6px, transparent 12px)' }} />
          </div>
          {tooltipBed.show && createPortal(
            <div
              ref={bedTipRef}
              className={`pointer-events-none fixed px-2.5 py-1.5 rounded-md ${scheme.neutral?.tooltipBg || 'bg-white'} ${(scheme.neutral?.heading || 'text-gray-900')} text-[11px] shadow-xl ring-1 ${scheme.neutral?.tooltipRing || 'ring-gray-200'} whitespace-normal break-words`}
              style={{ ...tipPos(tooltipBed.x, tooltipBed.y, bedTipRef), maxWidth: 'min(90vw, 360px)', zIndex: 2147483647 }}
            >
              <span className="inline-flex items-center gap-1">
                <span className={`inline-block h-2 w-2 rounded-full ${occupiedDot}`}></span>
                <span className={occupiedText}>{t('floors.tooltip_occupied', { pct: bed.pct }) || `${bed.pct}% occupied`}</span>
                <span className="opacity-70">({stats.occupiedBeds}/{stats.beds})</span>
                <span className="mx-1 opacity-40">•</span>
                <span className={availableText}>{t('floors.tooltip_available', { pct: Math.max(100 - bed.pct, 0) }) || `${100 - bed.pct}% available`}</span>
                <span className="opacity-70">({Math.max(stats.beds - stats.occupiedBeds,0)}/{stats.beds})</span>
              </span>
            </div>, document.body
          )}
        </div>
        <div className={"shrink-0 tabular-nums " + occupiedText}><span className="text-[10px] sm:text-[11px]">{bed.pct}% ({stats.occupiedBeds}/{stats.beds})</span></div>
      </div>
    </div>
  )
}

const FloorsList = ({ buildingId = null, reloadKey = 0, onEdit = null }) => {
  const scheme = useColorScheme('default')
  const [floors, setFloors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('number')
  const [order, setOrder] = useState('asc')
  const getDefaultView = () => 'cards'
  const [view, setView] = useState(getDefaultView)
  const { addToast } = useToast()
  const { can } = useCan()
  const { t } = useTranslation()

  const load = () => {
    setLoading(true)
    const scope = buildingId || 'global'
    if (buildingId && !can('floors', 'view', buildingId)) {
      const msg = t('floors.permission_denied_for_building') || 'You do not have permission to view floors for this building'
      setError(msg)
      addToast({ type: 'warning', message: msg })
      setFloors([])
      setLoading(false)
      return
    }

    const params = { page_size: 1000 }
    if (buildingId) params.building = buildingId

    if (buildingId) {
      const api = guarded(can, buildingId)
      api.getFloors(params)
        .then((data) => {
          let arr = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
          setError('')
          setFloors(arr)
        })
        .catch((err) => {
          const status = err?.status || err?.response?.status
          if (status === 403) {
            setError(t('floors.permission_denied') || 'You do not have permission to view floors')
          } else {
            setError(err?.response?.data?.detail || err.message || (t('floors.load_failed') || 'Failed to load floors'))
          }
          addToast({ message: err?.response?.data?.detail || err.message || (t('floors.load_failed') || 'Failed to load floors'), type: 'error' })
        })
        .finally(() => setLoading(false))
    } else {
      // Global list: use guarded API if user has global permission; otherwise fetch unguarded and filter client-side
      const canViewGlobal = can('floors', 'view', 'global')
      const api = guarded(can, 'global')
      const listPromise = canViewGlobal ? api.getFloors(params) : fetchFloors(params)
      listPromise
        .then((data) => {
          let arr = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
          if (!canViewGlobal) {
            arr = arr.filter(f => can('floors', 'view', f?.building || f?.building_id || f?.buildingId))
            if (arr.length === 0) {
              setError(t('floors.permission_denied') || 'You do not have permission to view floors')
            } else {
              setError('')
            }
          } else {
            setError('')
          }
          setFloors(arr)
        })
        .catch((err) => {
          const status = err?.status || err?.response?.status
          if (status === 403) {
            setError(t('floors.permission_denied') || 'You do not have permission to view floors')
          } else {
            setError(err?.response?.data?.detail || err.message || (t('floors.load_failed') || 'Failed to load floors'))
          }
          addToast({ message: err?.response?.data?.detail || err.message || (t('floors.load_failed') || 'Failed to load floors'), type: 'error' })
        })
        .finally(() => setLoading(false))
    }
  }

  useEffect(() => {
    load()
  }, [buildingId, reloadKey])

  const onSort = (field, direction) => {
    setSortBy(field)
    setOrder(direction)
  }

  const sortedData = useMemo(() => {
    const data = [...floors]
    const dir = order === 'asc' ? 1 : -1
    return data.sort((a, b) => {
      const va = a[sortBy]
      const vb = b[sortBy]
      const v1 = sortBy === 'number' ? Number(va) : va
      const v2 = sortBy === 'number' ? Number(vb) : vb
      if (v1 == null && v2 == null) return 0
      if (v1 == null) return -1 * dir
      if (v2 == null) return 1 * dir
      if (typeof v1 === 'string' && typeof v2 === 'string') return v1.localeCompare(v2) * dir
      if (v1 > v2) return 1 * dir
      if (v1 < v2) return -1 * dir
      return 0
    })
  }, [floors, sortBy, order])

  const columns = [
    {
      key: 'number',
      title: <span className="capitalize">{t('floors.floors') || 'Floors'}</span>,
      accessor: (row) => toFloorLabel(row.number, t),
      sortable: true,
      Cell: ({ row }) => (
        <Link to={`/floors/${row.id}`} className={`${scheme.accents?.sky?.text || 'text-blue-600'} hover:underline`} onClick={(e) => e.stopPropagation()}>
          {toFloorLabel(row.number, t)}
        </Link>
      ),
    },
    ...(!buildingId ? [{ key: 'building', title: <span className="capitalize">{t('floors.building') || 'Building'}</span>, accessor: (row) => row.building_name || row.building || '-', sortable: true }] : []),
    {
      key: 'is_active',
      title: <span className="capitalize">{t('floors.status') || 'Status'}</span>,
      accessor: (row) => (row.is_active ? (t('floors.active') || 'Active') : (t('floors.inactive') || 'Inactive')),
      sortable: true,
      Cell: ({ row }) => (
        <span className={`inline-flex items-center gap-1 rounded-full ${row.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-700 ring-gray-200'} ring-1 px-2 py-0.5 text-[10px] sm:text-xs font-medium`}>
          {row.is_active ? <FiCheckCircle className="h-3 w-3" /> : <FiXCircle className="h-3 w-3" />}
          {row.is_active ? (t('floors.active') || 'Active') : (t('floors.inactive') || 'Inactive')}
        </span>
      ),
    },
    { key: 'notes', title: <span className="capitalize">{t('floors.notes') || 'Notes'}</span>, accessor: (row) => row.notes || '-', sortable: false },
    { key: 'actions', title: <span className="capitalize">{t('floors.actions') || 'Actions'}</span>, accessor: (row) => (
      <div className="flex items-center gap-2">
        <FloorActions floor={row} onChanged={() => load()} onEdit={onEdit} />
      </div>
    ), sortable: false, headerClassName: 'text-right' },
  ]

  if (loading) return (
    <div className="p-6 flex items-center justify-center">
      <LoadingSpinner label={t('floors.loading') || 'Loading floors...'} />
    </div>
  )
  if (error) return <div className={`p-4 ${scheme.accents?.rose?.text || 'text-rose-600'}`}>{error}</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant={view === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('list')}
          className="flex items-center gap-2"
        >
          <FiList />
          <span className="capitalize">{t('floors.list') || 'List'}</span>
        </Button>
        <Button
          variant={view === 'cards' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('cards')}
          className="flex items-center gap-2"
        >
          <FiGrid />
          <span className="capitalize">{t('floors.cards') || 'Cards'}</span>
        </Button>
      </div>

      {view === 'list' ? (
        <SortableTable
          columns={columns}
          data={sortedData}
          sortBy={sortBy}
          order={order}
          onSort={onSort}
          loading={loading}
          rowKey="id"
          noDataText={buildingId ? (t('floors.no_floors_for_building') || 'No floors found for this building') : (t('floors.no_floors') || 'No floors found')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:gap-6">
          {sortedData.length === 0 ? (
            <div className={`col-span-full text-center ${scheme.neutral?.emptyText || 'text-gray-500'} py-10`}>
              {buildingId ? (t('floors.no_floors_for_building') || 'No floors found for this building') : (t('floors.no_floors') || 'No floors found')}
            </div>
          ) : (
            sortedData.map((f) => (
              <Card
                className={"overflow-visible rounded-xl transition-transform hover:-translate-y-1 hover:shadow-xl ring-1 " + (scheme.neutral?.cardRing || 'ring-gray-100') + " hover:" + (scheme.neutral?.cardRingHover || 'ring-gray-300')}
                key={f.id}
                title={
                  <Link to={`/floors/${f.id}`} className={`${scheme.accents?.sky?.text || 'text-blue-600'} hover:underline`} onClick={(e) => e.stopPropagation()}>
                    {toFloorLabel(f.number, t)}
                  </Link>
                }
                description={
                  !buildingId ? (
                    <div className={"flex items-center gap-1 " + (scheme.neutral?.subtle || 'text-gray-600')}>
                      <FiLayers className="h-3.5 w-3.5" />
                      <span className="truncate">{f.building_name || ''}</span>
                    </div>
                  ) : ''
                }
                actions={
                  <div className="flex items-center gap-2">
                    <FloorActions floor={f} onChanged={() => load()} onEdit={onEdit} />
                  </div>
                }
                padding="xs"
              >
                <div className={"text-[11px] sm:text-xs space-y-0.5 " + (scheme.neutral?.text || 'text-gray-700')}>
                  {f.notes && (
                    <div className="truncate"><span className={scheme.neutral?.muted || 'text-gray-500'}>{t('floors.notes') || 'Notes'}:</span> {f.notes}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className={`inline-flex items-center gap-1 rounded-full ${f.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-700 ring-gray-200'} ring-1 px-2 py-0.5 text-[10px] sm:text-xs font-medium`}>
                      {f.is_active ? <FiCheckCircle className="h-3 w-3" /> : <FiXCircle className="h-3 w-3" />}
                      {f.is_active ? (t('floors.active') || 'Active') : (t('floors.inactive') || 'Inactive')}
                    </span>
                    {typeof f.rooms_count === 'number' && (
                      <span className={`inline-flex items-center gap-1 rounded-full ${scheme.accents?.amber?.bg || 'bg-amber-50'} ${scheme.accents?.amber?.text || 'text-amber-700'} ring-1 ${scheme.accents?.amber?.ring || 'ring-amber-200'} px-2 py-0.5 text-[10px] sm:text-xs font-medium`}>
                        <FiGrid className="h-3 w-3" /> {f.rooms_count} {(t('floors.rooms') || 'Rooms')}
                      </span>
                    )}
                    {typeof f.beds_count === 'number' && (
                      <span className={`inline-flex items-center gap-1 rounded-full ${scheme.accents?.emerald?.bg || 'bg-emerald-50'} ${scheme.accents?.emerald?.text || 'text-emerald-700'} ring-1 ${scheme.accents?.emerald?.ring || 'ring-emerald-200'} px-2 py-0.5 text-[10px] sm:text-xs font-medium`}>
                        <FiBox className="h-3 w-3" /> {f.beds_count} {(t('floors.beds') || 'Beds')}
                      </span>
                    )}
                  </div>

                  {/* Inline capacity & occupancy bars per floor */}
                  <div className="pt-1.5">
                    <InlineFloorStats floorId={f.id} buildingScopeId={f.building || f.building_id || f.buildingId} can={can} />
                  </div>
                </div>
                <div className={`mt-3 pt-3 border-t ${scheme.neutral?.divider || 'border-gray-100'} flex items-center justify-end gap-2`}>
                  <Link
                    to={`/floors/${f.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-sm ${(scheme.accents?.sky?.text || 'text-blue-600')} p-2 capitalize font-semibold transition-transform duration-150 hover:scale-[1.10]`}
                  >
                    {t('floors.view_details') || 'View details'}
                  </Link>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default FloorsList