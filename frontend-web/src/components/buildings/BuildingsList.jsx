import React, { useEffect, useMemo, useRef, useState } from 'react'
import { guarded, getBuildings, patchBuilding } from '../../services/properties'
import { Button } from '../ui/Button'
import { SortableTable } from '../ui/SortableTable'
import { FiGrid, FiList, FiMapPin, FiLayers, FiBox, FiBarChart2 } from 'react-icons/fi'
import Card from '../ui/Card'
import LoadingSpinner from '../ui/LoadingSpinner'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCan } from '../../context/AuthContext'
import BuildingActions from './BuildingActions'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { useColorScheme } from '../../theme/colorSchemes'
import { useToast } from '../../context/ToastContext'

// Helper to convert strings to Title Case while preserving number-prefixed tokens (e.g., "2nd" stays "2nd")
const toTitleCase = (str) => {
    if (!str) return ''
    return String(str)
        .split(/(\s+|[-_/,:]+)/) // keep delimiters
        .map(token => {
            // If token starts with a letter, capitalize first letter and lowercase the rest
            if (/^[A-Za-z]/.test(token)) {
                return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
            }
            // Otherwise (numbers, punctuation, spaces), return as-is
            return token
        })
        .join('')
}

// Compact inline stats per building card
const InlineBuildingStats = ({ buildingId, can, t }) => {
    const scheme = useColorScheme('default')
    const [loading, setLoading] = useState(true)
    const [err, setErr] = useState('')
    const [stats, setStats] = useState({ floors: 0, rooms: 0, beds: 0, occupiedBeds: 0, occupiedRooms: 0, maintenanceBeds: 0 })
    const [tooltipRoom, setTooltipRoom] = useState({ show: false, x: 0, y: 0 })
    const [tooltipBed, setTooltipBed] = useState({ show: false, x: 0, y: 0 })
    const roomTipRef = useRef(null)
    const bedTipRef = useRef(null)

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
        if (!buildingId) return
        const api = guarded(can, buildingId)
        setLoading(true)
        setErr('')
        Promise.all([
            api.getFloors({ building: buildingId, page_size: 1000 }).catch(() => ({ results: [] })),
            api.getRooms({ building: buildingId, page_size: 1000 }).catch(() => ({ results: [] })),
            api.getBeds({ building: buildingId, page_size: 1000 }).catch(() => ({ results: [] })),
        ])
            .then(([floorsRes, roomsRes, bedsRes]) => {
                if (cancelled) return
                const floorsArr = Array.isArray(floorsRes) ? floorsRes : (floorsRes?.results || [])
                const roomsArr = Array.isArray(roomsRes) ? roomsRes : (roomsRes?.results || [])
                const bedsArr = Array.isArray(bedsRes) ? bedsRes : (bedsRes?.results || [])
                const occupiedBeds = bedsArr.filter(b => b.status === 'occupied').length
                const maintenanceBeds = bedsArr.filter(b => b.status === 'maintenance').length
                const occupiedRoomIds = new Set(bedsArr.filter(b => b.status === 'occupied' && b.room).map(b => b.room))
                setStats({
                    floors: floorsArr.length,
                    rooms: roomsArr.length,
                    beds: bedsArr.length,
                    occupiedBeds,
                    maintenanceBeds,
                    occupiedRooms: occupiedRoomIds.size,
                })
            })
            .catch((e) => setErr(e?.response?.data?.detail || e.message || ''))
            .finally(() => !cancelled && setLoading(false))
        return () => { cancelled = true }
    }, [buildingId, can])

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
    // Scheme-based classes
    const occupiedSeg = scheme?.occupied?.seg || 'bg-purple-500'
    const maintenanceSeg = scheme?.maintenance?.seg || 'bg-rose-300'
    const availableSeg = scheme?.available?.seg || 'bg-emerald-500'
    const occupiedDot = scheme?.occupied?.dot || 'bg-purple-500'
    const maintenanceDot = scheme?.maintenance?.dot || 'bg-rose-300'
    const availableDot = scheme?.available?.dot || 'bg-emerald-500'
    const occupiedText = scheme?.accents?.purple?.text || 'text-purple-700'
    const availableText = scheme?.accents?.emerald?.text || 'text-emerald-700'
    const maintenanceText = scheme?.accents?.rose?.text || 'text-rose-700'

    return (
        <div className={"group text-[11px] sm:text-xs " + (scheme.neutral?.text || 'text-gray-700') + " space-y-2"}>
            <div className={"flex items-center gap-2 font-medium " + (scheme.neutral?.heading || 'text-gray-900')}>
                <FiLayers className="h-3.5 w-3.5" />
                <span>{t('buildings.pg_capacity')}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full ${scheme.accents?.indigo?.bg || 'bg-indigo-50'} ${scheme.accents?.indigo?.text || 'text-indigo-700'} ring-1 ${scheme.accents?.indigo?.ring || 'ring-indigo-200'} px-2 py-0.5 font-medium`}>
                    <FiLayers className="h-3 w-3" /> {stats.floors} {t('buildings.floors_label')}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full ${scheme.accents?.amber?.bg || 'bg-amber-50'} ${scheme.accents?.amber?.text || 'text-amber-700'} ring-1 ${scheme.accents?.amber?.ring || 'ring-amber-200'} px-2 py-0.5 font-medium`}>
                    <FiGrid className="h-3 w-3" /> {stats.rooms} {t('buildings.rooms_label')}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full ${scheme.accents?.emerald?.bg || 'bg-emerald-50'} ${scheme.accents?.emerald?.text || 'text-emerald-700'} ring-1 ${scheme.accents?.emerald?.ring || 'ring-emerald-200'} px-2 py-0.5 font-medium`}>
                    <FiBox className="h-3 w-3" /> {stats.beds} {t('buildings.beds_label')}
                </span>
            </div>

            <div className={"flex items-center gap-2 font-medium mt-1 " + (scheme.neutral?.heading || 'text-gray-900')}>
                <FiBarChart2 className="h-3.5 w-3.5" />
                <span>{t('buildings.room_occupancy')}</span>
            </div>
            <div className="flex items-center gap-2">
                <div
                  className="relative h-2 sm:h-2.5 group-hover:h-3 transition-all w-full overflow-visible cursor-pointer"
                  onMouseEnter={() => setTooltipRoom({ show: true, x: 0, y: 0 })}
                  onMouseLeave={() => setTooltipRoom({ show: false, x: 0, y: 0 })}
                  onMouseMove={(e) => {
                    setTooltipRoom({ show: true, x: e.clientX, y: e.clientY })
                  }}
                >
                    <div className={`absolute inset-0 ${scheme.neutral?.track || 'bg-gray-200'} rounded-full overflow-hidden shadow-inner`}>
                        <div className="absolute inset-0 rounded-full overflow-hidden flex">
                          {/* Occupied segment */}
                          <div className={`${occupiedSeg} h-full transition-all duration-300`} style={{ width: `${room.pct}%` }} />
                          {/* Available segment fills the rest for rooms */}
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
                          <span className={occupiedText}>{t('buildings.tooltip_occupied', { pct: room.pct })}</span>
                          <span className="opacity-70">({stats.occupiedRooms}/{stats.rooms})</span>
                          <span className="mx-1 opacity-40">•</span>
                          <span className={`inline-block h-2 w-2 rounded-full ${availableDot}`}></span>
                          <span className={availableText}>{t('buildings.tooltip_available', { pct: Math.max(100 - room.pct, 0) })}</span>
                          <span className="opacity-70">({Math.max(stats.rooms - stats.occupiedRooms,0)}/{stats.rooms})</span>
                        </span>
                      </div>, document.body
                    )}
                </div>
                <div className={"shrink-0 tabular-nums " + occupiedText}>{room.pct}% ({stats.occupiedRooms}/{stats.rooms})</div>
            </div>

            <div className={"flex items-center gap-2 font-medium mt-1 " + (scheme.neutral?.heading || 'text-gray-900')}>
                <FiBarChart2 className="h-3.5 w-3.5" />
                <span>{t('buildings.bed_occupancy')}</span>
            </div>
            <div className="flex items-center gap-2">
                <div
                  className="relative h-2 sm:h-2.5 group-hover:h-3 transition-all w-full overflow-visible cursor-pointer"
                  onMouseEnter={() => setTooltipBed({ show: true, x: 0, y: 0 })}
                  onMouseLeave={() => setTooltipBed({ show: false, x: 0, y: 0 })}
                  onMouseMove={(e) => {
                    setTooltipBed({ show: true, x: e.clientX, y: e.clientY })
                  }}
                >
                    <div className={`absolute inset-0 ${scheme.neutral?.track || 'bg-gray-200'} rounded-full overflow-hidden shadow-inner`}>
                        <div className="absolute inset-0 rounded-full overflow-hidden flex">
                          {/* Occupied segment */}
                          <div className={`${occupiedSeg} h-full transition-all duration-300`} style={{ width: `${bed.pct}%` }} />
                          {/* Maintenance segment */}
                          {stats.maintenanceBeds > 0 && (
                            <div className={`${maintenanceSeg} h-full transition-all duration-300`} style={{ width: `${Math.round((stats.maintenanceBeds / Math.max(stats.beds, 1)) * 100)}%` }} />
                          )}
                          {/* Available segment fills the rest */}
                          <div className={`${availableSeg} h-full transition-all duration-300`} style={{ width: `${Math.max(100 - bed.pct - Math.round((stats.maintenanceBeds / Math.max(stats.beds, 1)) * 100), 0)}%` }} />
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
                          <span className={occupiedText}>{t('buildings.tooltip_occupied', { pct: bed.pct })}</span>
                          <span className="opacity-70">({stats.occupiedBeds}/{stats.beds})</span>
                          <span className="mx-1 opacity-40">•</span>
                          {stats.maintenanceBeds > 0 && (
                            <>
                              <span className={`inline-block h-2 w-2 rounded-full ${maintenanceDot}`}></span>
                              <span className={maintenanceText}>{t('buildings.tooltip_maintenance', { pct: Math.round((stats.maintenanceBeds / Math.max(stats.beds, 1)) * 100) })}</span>
                              <span className="opacity-70">({stats.maintenanceBeds}/{stats.beds})</span>
                              <span className="mx-1 opacity-40">•</span>
                            </>
                          )}
                          <span className={`inline-block h-2 w-2 rounded-full ${availableDot}`}></span>
                          <span className={availableText}>{t('buildings.tooltip_available', { pct: Math.max(100 - bed.pct - Math.round((stats.maintenanceBeds / Math.max(stats.beds, 1)) * 100), 0) })}</span>
                          <span className="opacity-70">({Math.max(stats.beds - stats.occupiedBeds,0)}/{stats.beds})</span>
                        </span>
                      </div>, document.body
                    )}
                </div>
                <div className={"shrink-0 tabular-nums " + occupiedText}>{bed.pct}% ({stats.occupiedBeds}/{stats.beds})</div>
            </div>
        </div>
    )
}

const BuildingsList = ({ onEdit }) => {
    const [buildings, setBuildings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [sortBy, setSortBy] = useState('name')
    const [order, setOrder] = useState('asc')
    const getDefaultView = () => {
        return 'cards'
     }
     const [view, setView] = useState(getDefaultView) // 'list' | 'cards'
    const { currentUser, getPlanLimit } = useAuth()
    const { can } = useCan()
    const { t } = useTranslation()
    const scheme = useColorScheme('default')
    const { addToast } = useToast()
    // actions handled by BuildingActions component

    const load = () => {
        setLoading(true)
        // For global list: only use guarded if user has global view; otherwise call unguarded and filter client-side
        const canViewGlobal = can('buildings', 'view', 'global')
        const propsApi = guarded(can, 'global')
        const listPromise = canViewGlobal
          ? propsApi.getBuildings({ page_size: 1000 })
          : getBuildings({ page_size: 1000 })

        listPromise
            .then((data) => {
                let arr = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
                // Defensive client-side filter by role in case backend returns broader scope
                const role = currentUser?.role
                if (role === 'pg_admin') {
                    const adminId = currentUser?.id
                    arr = arr.filter(b => (b?.owner === adminId) || (b?.owner?.id === adminId))
                } else if (role === 'pg_staff') {
                    const adminId = currentUser?.pg_admin_id
                    arr = arr.filter(b => (b?.owner === adminId) || (b?.owner?.id === adminId))
                }
                // Permission-based visibility: if no global view, only keep buildings with per-building view
                if (!canViewGlobal) {
                    arr = arr.filter(b => can('buildings', 'view', b?.id))
                }
                if (!canViewGlobal && arr.length === 0) {
                    setError(t('buildings.permission_denied'))
                } else {
                    setError('')
                }
                setBuildings(arr)
            })
            .catch(err => {
                const status = err?.status || err?.response?.status
                if (status === 403) {
                    setError(t('buildings.permission_denied'))
                } else {
                    setError(err?.response?.data?.detail || err.message || t('buildings.load_failed'))
                }
            })
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        load()
        // Reload when user or permissions change (e.g., after login or role update)
    }, [currentUser?.id, currentUser?.permissions])

    const onSort = (field, direction) => {
        setSortBy(field)
        setOrder(direction)
    }

    const sortedData = useMemo(() => {
        const data = [...buildings]
        const dir = order === 'asc' ? 1 : -1
        return data.sort((a, b) => {
            const va = a[sortBy]
            const vb = b[sortBy]
            if (va == null && vb == null) return 0
            if (va == null) return -1 * dir
            if (vb == null) return 1 * dir
            if (typeof va === 'string' && typeof vb === 'string') {
                return va.localeCompare(vb) * dir
            }
            if (va > vb) return 1 * dir
            if (va < vb) return -1 * dir
            return 0
        })
    }, [buildings, sortBy, order])

    // List-level activation gating
    const activeCount = useMemo(() => buildings.filter(b => b?.is_active).length, [buildings])
    const maxBuildings = useMemo(() => {
        try { return getPlanLimit?.('max_buildings', Infinity) ?? Infinity } catch { return Infinity }
    }, [getPlanLimit])

    // Auto-enforce: if activeCount exceeds plan limit, automatically deactivate newest active buildings
    const [enforcing, setEnforcing] = useState(false)
    useEffect(() => {
        if (enforcing) return
        if (!Number.isFinite(maxBuildings)) return
        if (activeCount <= maxBuildings) return
        const isAdmin = !!currentUser && (currentUser.role === 'pg_admin' || currentUser.is_superuser)
        if (!isAdmin) return
        setEnforcing(true)
        ;(async () => {
            try {
                const surplus = activeCount - maxBuildings
                if (surplus <= 0) return
                // Choose candidates: active buildings, prefer most recently updated/created; fallback by id desc
                const candidates = buildings
                  .filter(b => b?.is_active)
                  .sort((a, b) => {
                      const ad = new Date(b?.updated_at || b?.created_at || 0) - new Date(a?.updated_at || a?.created_at || 0)
                      if (!Number.isNaN(ad) && ad !== 0) return ad
                      return (b?.id || 0) - (a?.id || 0)
                  })
                  .filter(b => can('buildings', 'edit', b?.id))
                  .slice(0, surplus)
                let deactivated = 0
                for (const b of candidates) {
                    try {
                        await patchBuilding(b.id, { is_active: false })
                        deactivated += 1
                    } catch (_) {
                        // ignore individual failures; continue
                    }
                }
                if (deactivated > 0) {
                    addToast({
                        message: t('buildings.auto_deactivated_due_to_plan_limit', { count: deactivated }) || `Automatically deactivated ${deactivated} building(s) due to plan limit.`,
                        type: 'warning',
                    })
                    load()
                }
            } finally {
                setEnforcing(false)
            }
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCount, maxBuildings, buildings, currentUser?.role, currentUser?.is_superuser])

    // Auto-reactivate: if plan allows more actives and some buildings are inactive, optionally reactivate
    const [reinstating, setReinstating] = useState(false)
    useEffect(() => {
        if (reinstating) return
        if (!Number.isFinite(maxBuildings)) return
        if (activeCount >= maxBuildings) return
        const isAdmin = !!currentUser && (currentUser.role === 'pg_admin' || currentUser.is_superuser)
        if (!isAdmin) return
        const available = Math.max(0, maxBuildings - activeCount)
        if (available <= 0) return
        setReinstating(true)
        ;(async () => {
            try {
                const candidates = buildings
                  .filter(b => !b?.is_active)
                  .sort((a, b) => {
                      const ad = new Date(b?.updated_at || b?.created_at || 0) - new Date(a?.updated_at || a?.created_at || 0)
                      if (!Number.isNaN(ad) && ad !== 0) return ad
                      return (b?.id || 0) - (a?.id || 0)
                  })
                  .filter(b => can('buildings', 'edit', b?.id))
                  .slice(0, available)
                let activated = 0
                for (const b of candidates) {
                    try {
                        await patchBuilding(b.id, { is_active: true })
                        activated += 1
                    } catch (_) {
                        // ignore individual failures; continue
                    }
                }
                if (activated > 0) {
                    addToast({
                        message: t('buildings.auto_reactivated_due_to_plan_headroom', { count: activated }) || `Automatically re-activated ${activated} building(s) as your plan allows.`,
                        type: 'success',
                    })
                    load()
                }
            } finally {
                setReinstating(false)
            }
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCount, maxBuildings, buildings, currentUser?.role, currentUser?.is_superuser])

    const getTypeMeta = (value, scheme) => {
        const norm = (value ?? '')
            .toString()
            .toLowerCase()
            .replace(/[-_\s]/g, '') // co-living | co_living | co living -> coliving
        switch (norm) {
            case 'boys':
                return { label: t('buildings.type_boys'), class: `${scheme?.accents?.sky?.bg || 'bg-sky-50'} ${scheme?.accents?.sky?.text || 'text-sky-700'} ring-1 ${scheme?.accents?.sky?.ring || 'ring-sky-200'}` }
            case 'girls':
                return { label: t('buildings.type_girls'), class: `${scheme?.accents?.rose?.bg || 'bg-rose-50'} ${scheme?.accents?.rose?.text || 'text-rose-700'} ring-1 ${scheme?.accents?.rose?.ring || 'ring-rose-200'}` }
            case 'coliving':
                return { label: t('buildings.type_coliving'), class: `${scheme?.accents?.purple?.bg || 'bg-purple-50'} ${scheme?.accents?.purple?.text || 'text-purple-700'} ring-1 ${scheme?.accents?.purple?.ring || 'ring-purple-200'}` }
            default: {
                const label = value ? String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—'
                return { label, class: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200' }
            }
        }
    }

    const columns = [
        {
            key: 'name',
            title: <span className="capitalize">{t('buildings.name')}</span>,
            accessor: 'name',
            sortable: true,
            Cell: ({ row }) => (
                <Link to={`/buildings/${row.id}`} className={`${scheme.accents?.sky?.text || 'text-blue-600'} hover:underline`} onClick={(e) => e.stopPropagation()}>
                    {toTitleCase(row.name)}
                </Link>
            ),
        },
        { key: 'city', title: <span className="capitalize">{t('buildings.city')}</span>, accessor: 'city', sortable: true, Cell: ({ row }) => toTitleCase(row.city) },
        { key: 'state', title: <span className="capitalize">{t('buildings.state')}</span>, accessor: 'state', sortable: true, Cell: ({ row }) => toTitleCase(row.state) },
        {
            key: 'property_type',
            title: <span className="capitalize">{t('buildings.type')}</span>,
            accessor: 'property_type',
            sortable: true,
            Cell: ({ row }) => {
                const meta = getTypeMeta(row.property_type, scheme)
                return (
                    <span className={`inline-flex items-center gap-1 rounded-full text-xs font-medium ${meta.class}`}>
                        {meta.label}
                    </span>
                )
            },
        },
        {
            key: 'is_active',
            title: <span className="capitalize">{t('buildings.status')}</span>,
            accessor: (row) => (row.is_active ? t('buildings.active') : t('buildings.inactive')),
            sortable: true,
            Cell: ({ row }) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.is_active ? (scheme.accents?.emerald?.bg || 'bg-emerald-50') + ' ' + (scheme.accents?.emerald?.text || 'text-emerald-700') : (scheme.neutral?.inactiveChipBg || 'bg-gray-100') + ' ' + (scheme.neutral?.inactiveChipText || 'text-gray-700') + ' ring-1 ' + (scheme.neutral?.border || 'ring-gray-200')}`}>
                    {row.is_active ? t('buildings.active') : t('buildings.inactive')}
                </span>
            ),
        },
        {
            key: 'actions',
            title: <span className="capitalize">{t('buildings.actions')}</span>,
            sortable: false,
            accessor: () => '',
            Cell: ({ row }) => (
                <div className="flex gap-2">
                    <BuildingActions
                        building={row}
                        onEdit={onEdit}
                        onChanged={() => load()}
                        activeCount={activeCount}
                        maxBuildings={maxBuildings}
                    />
                </div>
            ),
        },
    ]
 
    if (loading) return (
        <div className="p-6 flex items-center justify-center">
            <LoadingSpinner label={t('buildings.loading')} />
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
                    <span className="capitalize">{t('buildings.list')}</span>
                </Button>
                <Button
                    variant={view === 'cards' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('cards')}
                    className="flex items-center gap-2"
                >
                    <FiGrid />
                    <span className="capitalize">{t('buildings.cards')}</span>
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
                    noDataText={t('buildings.no_buildings')}
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {sortedData.length === 0 ? (
                        <div className={`col-span-full text-center ${scheme.neutral?.emptyText || 'text-gray-500'} py-10`}>{t('buildings.no_buildings')}</div>
                    ) : (
                        sortedData.map((b) => (
                            <Card
                                className={"overflow-visible rounded-xl transition-transform hover:-translate-y-1 hover:shadow-xl ring-1 " + (scheme.neutral?.cardRing || 'ring-gray-100') + " hover:" + (scheme.neutral?.cardRingHover || 'ring-gray-300')}
                                key={b.id}
                                title={
                                    <Link to={`/buildings/${b.id}`} className={`${scheme.accents?.sky?.text || 'text-blue-600'} hover:underline`} onClick={(e) => e.stopPropagation()}>
                                        {toTitleCase(b.name)}
                                    </Link>
                                }
                                description={
                                    <div className={"flex items-center gap-1 " + (scheme.neutral?.subtle || 'text-gray-600')}>
                                        <FiMapPin className="h-3.5 w-3.5" />
                                        <span className="truncate">{toTitleCase(`${b.city || ''}${b.city && b.state ? ', ' : ''}${b.state || ''}`)}</span>
                                    </div>
                                }
                                actions={
                                    <div className="flex items-center gap-2">
                                        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${b.is_active ? (scheme.accents?.emerald?.bg || 'bg-emerald-50') + ' ' + (scheme.accents?.emerald?.text || 'text-emerald-700') + ' ring-1 ' + (scheme.accents?.emerald?.ring || 'ring-emerald-200') : (scheme.neutral?.inactiveChipBg || 'bg-gray-100') + ' ' + (scheme.neutral?.inactiveChipText || 'text-gray-700') + ' ring-1 ' + (scheme.neutral?.border || 'ring-gray-200')}`}>
                                            {b.is_active ? t('buildings.active') : t('buildings.inactive')}
                                        </span>
                                        {(() => { const meta = getTypeMeta(b.property_type, scheme); return (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${meta.class}`}>
                                                {meta.label}
                                            </span>
                                        )})()}
                                        <BuildingActions
                                            building={b}
                                            onEdit={onEdit}
                                            onChanged={() => load()}
                                            activeCount={activeCount}
                                            maxBuildings={maxBuildings}
                                        />
                                    </div>
                                }
                                padding="sm"
                            >
                                <div className={"text-xs sm:text-sm space-y-1 " + (scheme.neutral?.text || 'text-gray-700')}>
                                    {b.address_line && (
                                        <div className="truncate"><span className={scheme.neutral?.muted || 'text-gray-500'}>{t('buildings.address_label')}:</span> {toTitleCase(b.address_line)}</div>
                                    )}
                                    {b.code && (
                                        <div className="truncate"><span className={scheme.neutral?.muted || 'text-gray-500'}>{t('buildings.code') !== 'buildings.code' ? t('buildings.code') : 'Code'}:</span> {b.code}</div>
                                    )}
                                    {b.notes && (
                                        <div className="truncate"><span className={scheme.neutral?.muted || 'text-gray-500'}>{t('buildings.notes_label')}:</span> {toTitleCase(b.notes)}</div>
                                    )}
                                    {b.pincode && (
                                        <div className="truncate"><span className={scheme.neutral?.muted || 'text-gray-500'}>{t('buildings.pincode') !== 'buildings.pincode' ? t('buildings.pincode') : 'Pincode'}:</span> {b.pincode}</div>
                                    )}
                                    <InlineBuildingStats buildingId={b.id} can={can} t={t} />
                                </div>
                                <div className={`mt-3 pt-3 border-t ${scheme.neutral?.divider || 'border-gray-100'} flex items-center justify-end gap-2`}>
                                    <Link
                                      to={`/buildings/${b.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`text-xs ${(scheme.accents?.sky?.text || 'text-blue-600')} hover:underline capitalize`}
                                    >
                                      {t('buildings.view_details')}
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

export default BuildingsList
