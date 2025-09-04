import React, { useEffect, useMemo, useState } from 'react'
import { Card } from '../ui/Card'
import { useColorScheme } from '../../theme/colorSchemes'
import { getBeds, getRooms, getBuildings } from '../../services/properties'
import { useTranslation } from 'react-i18next'
import { FiHome, FiLayers, FiGrid } from 'react-icons/fi'
import { Bed as BedIcon } from 'lucide-react'
import SearchableSelect from '../ui/SearchableSelect'
import BedActions from '../beds/BedActions'

const SHARING_OPTIONS = [
  { key: 'single_sharing', label: 'No Sharing', cap: 1 },
  { key: '2_sharing', label: '2 - Sharing', cap: 2 },
  { key: '3_sharing', label: '3 - Sharing', cap: 3 },
  { key: '4_sharing', label: '4 - Sharing', cap: 4 },
  { key: '5_sharing', label: '5 - Sharing', cap: 5 },
  { key: '6_sharing', label: '6 - Sharing', cap: 6 },
  { key: '7_sharing', label: '7 - Sharing', cap: 7 },
  { key: '8_sharing', label: '8 - Sharing', cap: 8 },
  { key: '9_sharing', label: '9 - Sharing', cap: 9 },
  { key: '10_sharing', label: '10 - Sharing', cap: 10 },
  { key: '11_sharing', label: '11 - Sharing', cap: 11 },
  { key: '12_sharing', label: '12 - Sharing', cap: 12 },
  { key: '13_sharing', label: '13 - Sharing', cap: 13 },
  { key: '14_sharing', label: '14 - Sharing', cap: 14 },
  { key: '15_sharing', label: '15 - Sharing', cap: 15 },
]

export default function BedAvailabilityCard({
  title,
  selectedBuildings = [], // optional building id filter from dashboard context
  buildingLabel,
  scheme,
  className = '',
}) {
  const { t } = useTranslation()
  const colors = useColorScheme(scheme)

  // Data stores
  const [buildings, setBuildings] = useState([]) // [{id, name}]
  const [roomsByBuilding, setRoomsByBuilding] = useState({}) // { [buildingId]: Room[] }
  const [bedsByBuilding, setBedsByBuilding] = useState({}) // { [buildingId]: Bed[] }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)

  // UI selections
  const [sharing, setSharing] = useState('single_sharing')
  const [selBuildingId, setSelBuildingId] = useState(null)
  const [selFloorId, setSelFloorId] = useState(null)
  const [selRoomId, setSelRoomId] = useState(null)

  // Reset deeper selections when higher level changes
  useEffect(() => { setSelFloorId(null); setSelRoomId(null) }, [selBuildingId])
  useEffect(() => { setSelRoomId(null) }, [selFloorId])
  useEffect(() => { setSelBuildingId(null); setSelFloorId(null); setSelRoomId(null) }, [sharing])

  // Load buildings, then rooms+beds per building
  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        // 1) Buildings list (respect dashboard selection if provided)
        const bResp = await getBuildings({ page_size: 1000, is_active: true })
        const allBuildings = Array.isArray(bResp?.results) ? bResp.results : (Array.isArray(bResp) ? bResp : [])
        const ids = (Array.isArray(selectedBuildings) && selectedBuildings.length)
          ? new Set(selectedBuildings.map(String))
          : null
        const usableBuildings = allBuildings.filter(b => !ids || ids.has(String(b.id)))
        if (!alive) return
        setBuildings(usableBuildings)

        // 2) Fetch rooms per building (we need room_type to filter by sharing)
        const roomResults = await Promise.all(
          usableBuildings.map(b => getRooms({ building: b.id, page_size: 1000 }).catch(() => ({ results: [] })))
        )
        const rMap = {}
        usableBuildings.forEach((b, i) => {
          const data = roomResults[i]
          rMap[b.id] = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
        })
        if (!alive) return
        setRoomsByBuilding(rMap)

        // 3) Fetch beds per building
        const bedResults = await Promise.all(
          usableBuildings.map(b => getBeds({ building: b.id, page_size: 1000 }).catch(() => ({ results: [] })))
        )
        const bMap = {}
        usableBuildings.forEach((b, i) => {
          const data = bedResults[i]
          bMap[b.id] = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
        })
        if (!alive) return
        setBedsByBuilding(bMap)
      } catch (e) {
        if (alive) setError(t('dashboard.bed_availability.load_failed', 'Failed to load bed availability'))
      } finally {
        if (alive) setLoading(false)
      } 
    }
    load()
    return () => { alive = false }
  }, [selectedBuildings, t, refreshTick])

  // Utilities
  const normalizeStatus = (s) => {
    const x = String(s || '').toLowerCase()
    const isOccupied = ['occupied','in_use','inuse','running','assigned','engaged'].includes(x)
    const isReserved = ['reserved','booked','hold','on_hold','blocked_for_booking','awaiting_checkin','confirmed'].includes(x)
    const isMaintenance = ['maintenance','repair','repairs','blocked','unavailable','out_of_service','oos','cleaning'].includes(x)
    const isAvailable = ['available','vacant','free','open','ready'].includes(x) || (!isOccupied && !isReserved && !isMaintenance)
    if (isOccupied) return 'occupied'
    if (isReserved) return 'reserved'
    if (isMaintenance) return 'maintenance'
    if (isAvailable) return 'available'
    return 'available'
  }

  const countByStatus = (beds) => {
    const out = { available: 0, occupied: 0, reserved: 0, maintenance: 0 }
    ;(beds || []).forEach(b => {
      const s = normalizeStatus(b?.status)
      if (out[s] != null) out[s] += 1
    })
    return out
  }

  // Derived: per-building filtered by sharing
  const derived = useMemo(() => {
    const perBuilding = buildings.map((b) => {
      const rooms = roomsByBuilding[b.id] || []
      const eligibleRooms = rooms.filter(r => r?.room_type === sharing)
      const roomIds = new Set(eligibleRooms.map(r => r.id))
      const beds = (bedsByBuilding[b.id] || []).filter(x => roomIds.has(x?.room))
      const counts = countByStatus(beds)

      // Floors snapshot within building (only eligible)
      const floorsMap = {}
      eligibleRooms.forEach(r => {
        const fid = r.floor
        const name = r.floor_display || `Floor ${fid}`
        if (!floorsMap[fid]) floorsMap[fid] = { id: fid, name, rooms: [], beds: [] }
        floorsMap[fid].rooms.push(r)
      })
      const floorList = Object.values(floorsMap)
      floorList.forEach(f => {
        const rset = new Set(f.rooms.map(r => r.id))
        f.beds = beds.filter(bd => rset.has(bd.room))
        f.counts = countByStatus(f.beds)
      })
      // sort floors by available desc
      floorList.sort((a, b) => (b.counts?.available || 0) - (a.counts?.available || 0))

      // Rooms snapshot by floor
      const roomsByFloor = {}
      eligibleRooms.forEach(r => {
        const key = `${r.floor}`
        if (!roomsByFloor[key]) roomsByFloor[key] = []
        const roomBeds = beds.filter(bd => bd.room === r.id)
        roomsByFloor[key].push({ ...r, beds: roomBeds, counts: countByStatus(roomBeds) })
      })
      // sort rooms for each floor by available desc
      Object.keys(roomsByFloor).forEach(k => {
        roomsByFloor[k].sort((a, b) => (b.counts?.available || 0) - (a.counts?.available || 0))
      })

      return { building: b, rooms: eligibleRooms, beds, counts, floors: floorList, roomsByFloor }
    })
    // sort buildings by available desc
    perBuilding.sort((a, b) => (b.counts?.available || 0) - (a.counts?.available || 0))
    return { perBuilding }
  }, [buildings, roomsByBuilding, bedsByBuilding, sharing])

  // Available counts by sharing type (across current building filter)
  const availabilityBySharing = useMemo(() => {
    const out = {}
    const bList = Array.isArray(buildings) ? buildings : []
    for (const opt of SHARING_OPTIONS) {
      let total = 0
      for (const b of bList) {
        const rooms = Array.isArray(roomsByBuilding?.[b.id]) ? roomsByBuilding[b.id] : []
        const eligibleRooms = rooms.filter(r => r?.room_type === opt.key)
        const roomIds = new Set(eligibleRooms.map(r => r.id))
        const beds = (bedsByBuilding?.[b.id] || []).filter(x => roomIds.has(x?.room))
        const c = countByStatus(beds)
        total += c.available || 0
      }
      out[opt.key] = total
    }
    return out
  }, [buildings, roomsByBuilding, bedsByBuilding])

  // Options for the sharing selector with available counts
  const sharingOptions = useMemo(() => {
    return SHARING_OPTIONS.map(opt => ({
      value: opt.key,
      label: opt.label,
      count: availabilityBySharing?.[opt.key] ?? 0,
    }))
  }, [availabilityBySharing])

  const renderSharingOption = (option) => (
    <div className="flex items-center justify-between w-full">
      <span className="text-sm">{option.label}</span>
      <span className="text-emerald-600 text-xs flex items-center gap-1">
        ({option.count} <BedIcon className="w-3.5 h-3.5" /> {t('beds.status.available', 'available')})
      </span>
    </div>
  )

  // Overall totals across ALL sharing types (ignores sharing filter)
  const aggregateAllCounts = useMemo(() => {
    const totals = { available: 0, occupied: 0, reserved: 0, maintenance: 0, total: 0 }
    const list = Array.isArray(buildings) ? buildings : []
    for (const b of list) {
      const beds = Array.isArray(bedsByBuilding?.[b.id]) ? bedsByBuilding[b.id] : []
      const c = countByStatus(beds)
      totals.available += c.available || 0
      totals.occupied += c.occupied || 0
      totals.reserved += c.reserved || 0
      totals.maintenance += c.maintenance || 0
    }
    totals.total = totals.available + totals.occupied + totals.reserved + totals.maintenance
    return totals
  }, [buildings, bedsByBuilding])

  // Aggregate totals across all buildings for summary
  const aggregateCounts = useMemo(() => {
    const totals = { available: 0, occupied: 0, reserved: 0, maintenance: 0, total: 0 }
    const list = Array.isArray(derived?.perBuilding) ? derived.perBuilding : []
    for (const item of list) {
      const c = item?.counts || {}
      totals.available += c.available || 0
      totals.occupied += c.occupied || 0
      totals.reserved += c.reserved || 0
      totals.maintenance += c.maintenance || 0
    }
    totals.total = totals.available + totals.occupied + totals.reserved + totals.maintenance
    return totals
  }, [derived])

  // Current selections derived
  const currentBuilding = useMemo(() => derived.perBuilding.find(x => String(x.building.id) === String(selBuildingId)), [derived, selBuildingId])
  const currentFloors = currentBuilding?.floors || []
  const currentRooms = useMemo(() => (selFloorId ? (currentBuilding?.roomsByFloor?.[String(selFloorId)] || []) : []), [currentBuilding, selFloorId])
  const currentBeds = useMemo(() => {
    if (!selRoomId) return []
    const r = (currentRooms || []).find(rr => rr.id === selRoomId)
    return r?.beds || []
  }, [currentRooms, selRoomId])

  const legendItem = (dotCls, label) => (
    <div className="flex items-center gap-2 text-xs">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotCls}`} />
      <span>{label}</span>
    </div>
  )

  const statusPill = (s) => {
    const map = {
      available: { cls: `${colors?.available?.badge || 'bg-emerald-50'} text-emerald-700 border border-emerald-200`, label: t('beds.status.available', 'Available') },
      occupied: { cls: `${colors?.occupied?.badge || 'bg-purple-50'} text-purple-700 border border-purple-200`, label: t('beds.status.occupied', 'Occupied') },
      reserved: { cls: `${colors?.reserved?.badge || 'bg-amber-50'} text-amber-700 border border-amber-200`, label: t('beds.status.reserved', 'Reserved') },
      maintenance: { cls: `${colors?.maintenance?.badge || 'bg-rose-50'} text-rose-700 border border-rose-200`, label: t('beds.status.maintenance', 'Maintenance') },
    }
    return map[s] || map.available
  }

  // Auto-select first available building/floor/room to reduce clicks
  useEffect(() => {
    if (!selBuildingId && derived.perBuilding.length) {
      const first = derived.perBuilding.find(x => (x.counts?.available || 0) > 0) || derived.perBuilding[0]
      if (first) setSelBuildingId(first.building.id)
    }
  }, [sharing, derived, selBuildingId])

  useEffect(() => {
    if (selBuildingId && !selFloorId) {
      const floors = currentFloors || []
      if (floors.length) {
        const first = floors.find(f => (f.counts?.available || 0) > 0) || floors[0]
        setSelFloorId(first.id)
      }
    }
  }, [selBuildingId, currentFloors, selFloorId])

  useEffect(() => {
    if (selFloorId && !selRoomId) {
      const rooms = currentRooms || []
      if (rooms.length) {
        const first = rooms.find(r => (r.counts?.available || 0) > 0) || rooms[0]
        setSelRoomId(first.id)
      }
    }
  }, [selFloorId, currentRooms, selRoomId])

  return (
    <Card
      title={title || t('dashboard.bed_availability.title', 'Bed Availability')}
      padding="sm"
      className={className}
      actions={!loading && !error ? (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className={`px-2 py-0.5 rounded-md border text-[10px] sm:text-xs bg-white ${ (colors?.neutral?.border || 'ring-gray-200').replace('ring-','border-') }`}>
            {t('dashboard.bed_availability.total_beds', 'Total')}: {aggregateAllCounts.total}
          </div>
          <div className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs ${statusPill('available').cls}`}>
            {t('beds.status.available', 'Avail')}: {aggregateAllCounts.available}
          </div>
          <div className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs ${statusPill('occupied').cls}`}>
            {t('beds.status.occupied', 'Occ')}: {aggregateAllCounts.occupied}
          </div>
          <div className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs ${statusPill('reserved').cls}`}>
            {t('beds.status.reserved', 'Res')}: {aggregateAllCounts.reserved}
          </div>
          <div className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs ${statusPill('maintenance').cls}`}>
            {t('beds.status.maintenance', 'Maint')}: {aggregateAllCounts.maintenance}
          </div>
        </div>
      ) : null}
    >
      {/* Sharing selector */}
      <div className="mb-3">
        <div className="text-xs font-medium mb-2">{t('dashboard.bed_availability.sharing_type', 'Sharing Type')}</div>
        <div className="max-w-xs">
          <SearchableSelect
            options={sharingOptions}
            value={sharing}
            onChange={(opt) => setSharing(opt.value)}
            placeholder={t('dashboard.bed_availability.sharing_type', 'Sharing Type')}
            className="text-sm"
            optionRenderer={renderSharingOption}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3">
          {legendItem(colors?.available?.dot || 'bg-emerald-500', t('dashboard.occupancy.legend.available', 'Available'))}
          {legendItem(colors?.occupied?.dot || 'bg-purple-500', t('dashboard.occupancy.legend.occupied', 'Occupied'))}
          {legendItem(colors?.reserved?.dot || 'bg-amber-500', t('dashboard.occupancy.legend.reserved', 'Reserved'))}
          {legendItem(colors?.maintenance?.dot || 'bg-rose-400', t('dashboard.occupancy.legend.maintenance', 'Maintenance'))}
        </div>

        {/* Totals summary */}
        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-2">
            <div className={`px-2 py-1 rounded-md border text-xs bg-white ${ (colors?.neutral?.border || 'ring-gray-200').replace('ring-','border-') }`}>
              {t('dashboard.bed_availability.total_beds', 'Total Beds')}: {aggregateCounts.total}
            </div>
            <div className={`px-2 py-1 rounded-md text-xs ${statusPill('available').cls}`}>
              {t('beds.status.available', 'Available')}: {aggregateCounts.available}
            </div>
            <div className={`px-2 py-1 rounded-md text-xs ${statusPill('occupied').cls}`}>
              {t('beds.status.occupied', 'Occupied')}: {aggregateCounts.occupied}
            </div>
            <div className={`px-2 py-1 rounded-md text-xs ${statusPill('reserved').cls}`}>
              {t('beds.status.reserved', 'Reserved')}: {aggregateCounts.reserved}
            </div>
            <div className={`px-2 py-1 rounded-md text-xs ${statusPill('maintenance').cls}`}>
              {t('beds.status.maintenance', 'Maintenance')}: {aggregateCounts.maintenance}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-xs text-gray-500">{t('common.loading', 'Loading...')}</div>
        ) : error ? (
          <div className="text-xs text-red-600">{error}</div>
        ) : null}
      </div>

      {/* 4-column hierarchy */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Blocks (Buildings) */}
        <div className="border rounded-lg overflow-auto flex flex-col max-h-[60vh] sm:max-h-[65vh]">
          <div className={`px-3 py-2 text-sm font-semibold flex items-center gap-2 sticky top-0 z-10 ${(colors?.neutral?.inactiveChipBg || 'bg-rose-50')}`}>
            <FiHome className={`${colors?.accents?.purple?.text || 'text-purple-700'}`} />
            {t('dashboard.bed_availability.blocks', 'Blocks')}
          </div>
          <div className="p-2 divide-y">
            {derived.perBuilding.length === 0 ? (
              <div className="text-xs p-3 text-gray-500">{t('dashboard.bed_availability.no_data_for_sharing', 'No data available for selected sharing type')}</div>
            ) : (
              derived.perBuilding.map(({ building, counts }) => (
                <button
                  key={building.id}
                  type="button"
                  onClick={() => setSelBuildingId(building.id)}
                  className={`w-full text-left px-2 py-2 rounded-md hover:bg-gray-50 flex items-center gap-2 ${String(selBuildingId) === String(building.id) ? 'bg-gray-50' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colors?.available?.seg || 'bg-emerald-500'} text-white`}>
                    <FiHome className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{building.name}</div>
                    <div className="text-[11px] text-gray-500">
                      {t('dashboard.occupancy.legend.available', 'Available')}: {counts.available}
                      {' • '}
                      {t('dashboard.occupancy.legend.reserved', 'Reserved')}: {counts.reserved}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Floors */}
        <div className="border rounded-lg overflow-auto flex flex-col max-h-[60vh] sm:max-h-[65vh]">
          <div className={`px-3 py-2 text-sm font-semibold flex items-center gap-2 sticky top-0 z-10 ${(colors?.neutral?.inactiveChipBg || 'bg-rose-50')}`}>
            <FiLayers className={`${colors?.accents?.purple?.text || 'text-purple-700'}`} />
            {t('dashboard.bed_availability.floors', 'Floors')}
          </div>
          <div className="p-2 divide-y">
            {!selBuildingId ? (
              <div className="text-xs p-3 text-gray-500">{t('dashboard.bed_availability.select_block', 'Select a block')}</div>
            ) : (currentFloors.length === 0 ? (
              <div className="text-xs p-3 text-gray-500">{t('dashboard.bed_availability.no_data_for_sharing', 'No data available for selected sharing type')}</div>
            ) : (
              currentFloors.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelFloorId(f.id)}
                  className={`w-full text-left px-2 py-2 rounded-md hover:bg-gray-50 flex items-center gap-2 ${String(selFloorId) === String(f.id) ? 'bg-gray-50' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colors?.reserved?.seg || 'bg-amber-500'} text-white`}>
                    <FiLayers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{f.name}</div>
                    <div className="text-[11px] text-gray-500">
                      {t('dashboard.occupancy.legend.available', 'Available')}: {f.counts?.available || 0}
                      {' • '}
                      {t('dashboard.occupancy.legend.reserved', 'Reserved')}: {f.counts?.reserved || 0}
                    </div>
                  </div>
                </button>
              ))
            ))}
          </div>
        </div>

        {/* Rooms */}
        <div className="border rounded-lg overflow-auto flex flex-col max-h-[60vh] sm:max-h-[65vh]">
          <div className={`px-3 py-2 text-sm font-semibold flex items-center gap-2 sticky top-0 z-10 ${(colors?.neutral?.inactiveChipBg || 'bg-rose-50')}`}>
            <FiGrid className={`${colors?.accents?.purple?.text || 'text-purple-700'}`} />
            {t('dashboard.bed_availability.rooms', 'Rooms')}
          </div>
          <div className="p-2 divide-y">
            {!selFloorId ? (
              <div className="text-xs p-3 text-gray-500">{t('dashboard.bed_availability.select_floor', 'Select a floor')}</div>
            ) : (currentRooms.length === 0 ? (
              <div className="text-xs p-3 text-gray-500">{t('dashboard.bed_availability.no_data_for_sharing', 'No data available for selected sharing type')}</div>
            ) : (
              currentRooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelRoomId(r.id)}
                  className={`w-full text-left px-2 py-2 rounded-md hover:bg-gray-50 flex items-center gap-2 ${String(selRoomId) === String(r.id) ? 'bg-gray-50' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colors?.occupied?.seg || 'bg-purple-500'} text-white`}>
                    <BedIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t('rooms.room', 'Room')} {r.number}</div>
                    <div className="text-[11px] text-gray-500">
                      {t('dashboard.occupancy.legend.available', 'Available')}: {r.counts?.available || 0}
                      {' • '}
                      {t('dashboard.occupancy.legend.reserved', 'Reserved')}: {r.counts?.reserved || 0}
                    </div>
                  </div>
                </button>
              ))
            ))}
          </div>
        </div>

        {/* Beds */}
        <div className="border rounded-lg overflow-auto flex flex-col max-h-[60vh]">
          <div className={`px-3 py-2 text-sm font-semibold flex items-center gap-2 sticky top-0 z-10 ${(colors?.neutral?.inactiveChipBg || 'bg-rose-50')}`}>
            <BedIcon className={`${colors?.accents?.purple?.text || 'text-purple-700'}`} />
            {t('dashboard.bed_availability.beds', 'Beds')}
          </div>
          <div className="p-2">
            {!selRoomId ? (
              <div className="text-xs p-3 text-gray-500">{t('dashboard.bed_availability.select_room', 'Select a room')}</div>
            ) : (currentBeds.length === 0 ? (
              <div className="text-xs p-3 text-gray-500">{t('dashboard.bed_availability.no_beds', 'No beds')}</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {currentBeds.map((b) => {
                  const pill = statusPill(normalizeStatus(b.status))
                  return (
                    <div key={b.id} className={`px-1 py-1 rounded-md text-[12px] ${pill.cls} flex items-center justify-between gap-2`}>
                      <div className="flex items-center">
                        <BedIcon className="w-4 h-4 opacity-80" />
                        <span className="truncate">{t('beds.bed', 'Bed')} {b.number}</span>
                      </div>
                      <div className="shrink-0">
                        <BedActions
                          bed={b}
                          buildingInactive={false}
                          onChanged={() => setRefreshTick((x) => x + 1)}
                          bookingOnly={true}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
