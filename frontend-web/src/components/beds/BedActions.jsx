import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '../ui/Button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/DropdownMenu'
import { FiMoreVertical, FiEdit, FiTrash2, FiLogIn, FiLogOut } from 'react-icons/fi'
import Modal from '../ui/Modal'
import { useToast, emitToast } from '../../context/ToastContext'
import { deleteBed, guarded } from '../../services/properties'
import { listStays, patchStay } from '../../services/tenants'
import { getBuildings, getFloors, getRooms, getRoom, getFloor } from '../../services/properties'
import api from '../../services/api'
import BookingForm from '../bookings/BookingForm'
import { useAuth, useCan } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'
import Tooltip from '../ui/Tooltip'

const todayISO = () => new Date().toISOString().slice(0, 10)

const BedActions = ({ bed, onEdit, onChanged, buildingInactive = false, bookingOnly = false }) => {
  const { currentUser } = useAuth()
  const { addToast } = useToast()
  const { can, isPGAdmin, permissions } = useCan()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, type: null })
  const [activeStay, setActiveStay] = useState(null)
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [editBookingOpen, setEditBookingOpen] = useState(false)
  const [existingBooking, setExistingBooking] = useState(null)
  const isAdmin = !!currentUser && (currentUser.role === 'pg_admin' || currentUser.is_superuser)
  const { t } = useTranslation()
  const tr = (k, f, opt) => t(k, { defaultValue: f, ...(opt || {}) })
  const blockedMsg = tr('buildings.inactive_actions_blocked', 'This building is inactive. Activate it to make changes.')

  // Derive building id for permission scope from bed -> room -> floor
  const [buildingId, setBuildingId] = useState(null)
  useEffect(() => {
    let cancelled = false
    const resolve = async () => {
      try {
        const r = bed?.room ? await getRoom(bed.room) : null
        const floorId = r ? (typeof r.floor === 'object' ? r.floor?.id : r.floor) : null
        if (!floorId) { if (!cancelled) setBuildingId(null); return }
        const f = await getFloor(floorId)
        if (!cancelled) setBuildingId(f?.building ?? null)
      } catch (_) {
        if (!cancelled) setBuildingId(null)
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [bed?.room])

  const canEditBed = useMemo(() => {
    if (isPGAdmin) return true
    if (buildingId) return typeof can === 'function' && can('beds', 'edit', buildingId)
    const hasGlobal = typeof can === 'function' && can('beds', 'edit', 'global')
    const hasAnyBuilding = Object.entries(permissions || {}).some(([k, v]) => (
      k !== 'global' && v && v.beds && v.beds.edit === true
    ))
    return hasGlobal || hasAnyBuilding
  }, [isPGAdmin, buildingId, can, permissions])

  const canDeleteBed = useMemo(() => {
    if (isPGAdmin) return true
    if (buildingId) return typeof can === 'function' && can('beds', 'delete', buildingId)
    const hasGlobal = typeof can === 'function' && can('beds', 'delete', 'global')
    const hasAnyBuilding = Object.entries(permissions || {}).some(([k, v]) => (
      k !== 'global' && v && v.beds && v.beds.delete === true
    ))
    return hasGlobal || hasAnyBuilding
  }, [isPGAdmin, buildingId, can, permissions])

  // Booking permissions scoped by building
  const canAddBooking = useMemo(() => {
    if (isPGAdmin) return true
    if (buildingId) return typeof can === 'function' && can('bookings', 'add', buildingId)
    const hasGlobal = typeof can === 'function' && can('bookings', 'add', 'global')
    const hasAnyBuilding = Object.entries(permissions || {}).some(([k, v]) => (
      k !== 'global' && v && v.bookings && v.bookings.add === true
    ))
    return hasGlobal || hasAnyBuilding
  }, [isPGAdmin, buildingId, can, permissions])

  const canEditBooking = useMemo(() => {
    if (isPGAdmin) return true
    if (buildingId) return typeof can === 'function' && can('bookings', 'edit', buildingId)
    const hasGlobal = typeof can === 'function' && can('bookings', 'edit', 'global')
    const hasAnyBuilding = Object.entries(permissions || {}).some(([k, v]) => (
      k !== 'global' && v && v.bookings && v.bookings.edit === true
    ))
    return hasGlobal || hasAnyBuilding
  }, [isPGAdmin, buildingId, can, permissions])

  // Occupancy info to block deletion when bed is occupied or when occupancy cannot be verified
  const [occupiedInfo, setOccupiedInfo] = useState({ checked: false, occupied: false, unknown: false })

  const fetchOccupiedInfo = async () => {
    if (!bed?.id || !buildingId || typeof can !== 'function') {
      // Cannot verify occupancy without scope/permissions; block deletion
      setOccupiedInfo({ checked: true, occupied: false, unknown: true })
      return null
    }
    try {
      const api = guarded(can, buildingId)
      const latest = await api.getBed(bed.id)
      const isOcc = (latest?.status === 'occupied')
      setOccupiedInfo({ checked: true, occupied: isOcc, unknown: false })
      return isOcc
    } catch (e) {
      setOccupiedInfo({ checked: true, occupied: false, unknown: true })
      return null
    }
  }

  const ensureNotOccupied = async (e) => {
    const res = occupiedInfo.checked ? (occupiedInfo.unknown ? null : occupiedInfo.occupied) : await fetchOccupiedInfo()
    if (res === null || res === true) {
      e?.preventDefault?.()
      if (res === null || occupiedInfo.unknown) {
        addToast({ type: 'error', message: tr('beds.toasts_delete_blocked_unknown_occupancy', 'Cannot delete bed because occupancy cannot be verified.') })
      } else {
        addToast({ type: 'error', message: tr('beds.toasts_delete_blocked_occupied', 'Cannot delete bed because it is occupied.') })
      }
      return false
    }
    return true
  }

  // Building/Floor/Room cascading
  const [buildings, setBuildings] = useState([])
  const [floors, setFloors] = useState([])
  const [rooms, setRooms] = useState([])
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [selectedFloor, setSelectedFloor] = useState('')
  const [selectedRoom, setSelectedRoom] = useState('')

  const loadExistingBooking = useCallback(async () => {
    if (!bed?.id) { setExistingBooking(null); return }
    try {
      const res = await api.get('/bookings/bookings/', { params: { bed: bed.id, page_size: 100, ordering: '-start_date' } })
      const items = Array.isArray(res.data) ? res.data : (res.data?.results || [])
      const today = new Date(); const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const candidates = items.filter(b => {
        const st = b?.status
        if (!['pending', 'reserved', 'confirmed'].includes(st)) return false
        if (b?.end_date) { const end = new Date(b.end_date); if (!isNaN(end) && end < midnight) return false }
        return true
      })
      setExistingBooking(candidates[0] || null)
    } catch (_) {
      setExistingBooking(null)
    }
  }, [bed?.id])

  useEffect(() => {
    const loadActive = async () => {
      if (!bed?.id) { setActiveStay(null); return }
      try {
        const items = await listStays({})
        const match = (Array.isArray(items) ? items : []).find(it => it?.bed === bed.id && it?.status === 'active')
        setActiveStay(match || null)
      } catch (_) {
        setActiveStay(null)
      }
    }
    loadActive()
    loadExistingBooking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bed?.id, loadExistingBooking])

  if (!bed) return null

  const openConfirm = (type) => setConfirm({ open: true, type })
  const closeConfirm = () => setConfirm({ open: false, type: null })

  const openCheckin = async () => {
    try {
      // Always load buildings list (for display)
      const blds = await getBuildings({})
      setBuildings(Array.isArray(blds) ? blds : [])

      // Preselect based on current bed hierarchy and derive building id
      let bId = null
      if (bed?.room) {
        try {
          const roomData = await getRoom(bed.room)
          const floorData = await getFloor(roomData.floor)
          bId = floorData.building
          setSelectedBuilding(String(bId))
          // Load floors for the building
          const fl = await getFloors({ building: bId })
          setFloors(Array.isArray(fl) ? fl : [])
          setSelectedFloor(String(floorData.id))
          // Load rooms for the floor
          const rms = await getRooms({ floor: floorData.id })
          setRooms(Array.isArray(rms) ? rms : [])
          setSelectedRoom(String(roomData.id))
        } catch (e) {
          setSelectedBuilding('')
          setSelectedFloor('')
          setSelectedRoom('')
          setFloors([])
          setRooms([])
        }
      }
    } catch (e) {
      setBuildings([])
      setFloors([])
      setRooms([])
      setSelectedBuilding('')
      setSelectedFloor('')
      setSelectedRoom('')
    } finally {
      // Open modal after prefill to ensure BookingForm picks up initialValues
      setCheckinOpen(true)
    }
  }

  const performCheckout = async () => {
    if (!activeStay?.id) return
    setLoading(true)
    try {
      await patchStay(activeStay.id, { status: 'completed', actual_check_out: todayISO() })
      addToast({ message: tr('beds.toasts.checked_out_success', 'Tenant checked out successfully'), type: 'success' })
      setActiveStay(null)
      onChanged && onChanged('checkout', bed)
    } catch (err) {
      addToast({ message: err?.response?.data?.detail || err.message || tr('beds.errors.checkout_failed', 'Checkout failed'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const performPermanentDelete = async () => {
    if (!bed?.id) return
    setLoading(true)
    try {
      await deleteBed(bed.id)
      addToast({ message: tr('beds.toasts.deleted_permanently', 'Bed deleted permanently'), type: 'success' })
      onChanged && onChanged('delete', bed)
    } catch (err) {
      addToast({ message: err?.response?.data?.detail || err.message || tr('beds.errors.delete_failed', 'Delete failed'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onConfirm = async (e) => {
    const type = confirm.type
    if (type === 'delete' && !e.shiftKey) {
      addToast({ message: tr('common.hold_shift_to_confirm', 'Hold Shift and click Delete to confirm permanent deletion'), type: 'error' })
      return
    }
    closeConfirm()
    if (type === 'checkout') await performCheckout()
    if (type === 'delete') await performPermanentDelete()
  }

  const label = bed?.number ? tr('beds.bed_with_number', 'Bed {{n}}', { n: bed.number }) : tr('beds.bed', 'Bed')
  const canCheckin = bed.status !== 'maintenance' && bed.status !== 'occupied'
  const canCheckout = bed.status === 'occupied' && !!activeStay
  const hasExistingBooking = !!existingBooking

  const deleteTooltip = useMemo(() => {
    if (buildingInactive) return blockedMsg
    if (!canDeleteBed) {
      return buildingId
        ? tr('permissions.no_delete_beds_building', "You don't have permission to delete beds for this building.")
        : tr('permissions.no_delete_beds', "You don't have permission to delete beds.")
    }
    if (occupiedInfo.checked) {
      if (occupiedInfo.unknown) return tr('beds.tooltip_delete_blocked_unknown_occupancy', 'Cannot delete: occupancy cannot be verified for this bed')
      if (occupiedInfo.occupied) return tr('beds.tooltip_delete_blocked_occupied', 'Cannot delete: this bed is occupied')
    }
    return ''
  }, [buildingInactive, blockedMsg, canDeleteBed, buildingId, occupiedInfo])

  return (
    <>
      <DropdownMenu onOpenChange={(open) => { if (open && !occupiedInfo.checked) { fetchOccupiedInfo() } }}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={tr('common.actions', 'Actions')}>
            <FiMoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {hasExistingBooking ? (
            <DropdownMenuItem
              className={`group cursor-pointer hover:bg-gray-50 ${(!canEditBooking || buildingInactive) ? 'opacity-60 cursor-not-allowed' : ''}`}
              title={buildingInactive ? blockedMsg : (canEditBooking ? '' : (buildingId ? tr('permissions.no_edit_bookings_building', "You don't have permission to edit bookings for this building.") : tr('permissions.no_edit_bookings', "You don't have permission to edit bookings.")))}
              onSelect={(e) => {
                if (buildingInactive) {
                  e?.preventDefault?.()
                  emitToast({ type: 'error', message: blockedMsg })
                  return
                }
                if (!canEditBooking) {
                  e?.preventDefault?.()
                  emitToast({ type: 'warning', message: buildingId ? tr('permissions.no_edit_bookings_building', "You don't have permission to edit bookings for this building.") : tr('permissions.no_edit_bookings', "You don't have permission to edit bookings.") })
                  return
                }
                setEditBookingOpen(true)
              }}
            >
              <FiEdit className="mr-2 h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              {tr('bookings.actions.edit_booking', 'Edit Booking')}
            </DropdownMenuItem>
          ) : canCheckin && (
            <DropdownMenuItem className="p-0">
              <Button
                variant="ghost"
                className={`w-full justify-start px-2 py-2 text-left ${(!canAddBooking || buildingInactive) ? 'opacity-60 cursor-not-allowed' : ''}`}
                title={buildingInactive ? blockedMsg : (canAddBooking ? '' : (buildingId ? tr('permissions.no_create_bookings_building', "You don't have permission to create bookings for this building.") : tr('permissions.no_create_bookings', "You don't have permission to create bookings.")))}
                onClick={(e) => {
                  if (buildingInactive) {
                    e?.preventDefault?.()
                    emitToast({ type: 'error', message: blockedMsg })
                    return
                  }
                  if (!canAddBooking) {
                    e?.preventDefault?.()
                    emitToast({ type: 'warning', message: buildingId ? tr('permissions.no_create_bookings_building', "You don't have permission to create bookings for this building.") : tr('permissions.no_create_bookings', "You don't have permission to create bookings.") })
                    return
                  }
                  openCheckin()
                }}
              >
                <FiLogIn className="mr-2 h-4 w-4 text-gray-500" />
                {tr('bookings.actions.new_booking', 'New Booking')}
              </Button>
            </DropdownMenuItem>
          )}
          {!bookingOnly && canCheckout && (
            <DropdownMenuItem
              className={`group cursor-pointer hover:bg-gray-50 ${buildingInactive ? 'opacity-60 cursor-not-allowed' : ''}`}
              title={buildingInactive ? blockedMsg : ''}
              disabled={loading}
              onSelect={(e) => {
                if (buildingInactive) {
                  e?.preventDefault?.()
                  emitToast({ type: 'error', message: blockedMsg })
                  return
                }
                openConfirm('checkout')
              }}
            >
              <FiLogOut className="mr-2 h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              {tr('beds.actions.check_out', 'Check-out')}
            </DropdownMenuItem>
          )}
          {/* Bed-level Edit/Delete shown only when bookingOnly is false */}
          {!bookingOnly && (
            <>
              <Tooltip content={deleteTooltip}>
                <span className="block">
                  <DropdownMenuItem
                    className={`group cursor-pointer hover:bg-red-50 ${(!canDeleteBed || buildingInactive || (occupiedInfo.checked && (occupiedInfo.unknown || occupiedInfo.occupied))) ? 'opacity-60 text-gray-400 hover:text-gray-400 cursor-not-allowed' : 'text-red-600 focus:text-red-700 hover:text-red-700'}`}
                    disabled={loading}
                    onSelect={async (e) => {
                      if (buildingInactive) {
                        e?.preventDefault?.()
                        emitToast({ type: 'error', message: blockedMsg })
                        return
                      }
                      if (!canDeleteBed) {
                        e?.preventDefault?.()
                        emitToast({ type: 'warning', message: buildingId ? tr('permissions.no_delete_beds_building', "You don't have permission to delete beds for this building.") : tr('permissions.no_delete_beds', "You don't have permission to delete beds.") })
                        return
                      }
                      const ok = await ensureNotOccupied(e)
                      if (!ok) return
                      openConfirm('delete')
                    }}
                  >
                    <FiTrash2 className={`mr-2 h-4 w-4 ${(!canDeleteBed || buildingInactive || (occupiedInfo.checked && (occupiedInfo.unknown || occupiedInfo.occupied))) ? 'text-gray-400' : 'text-red-600 group-hover:text-red-700'}`} />
                    {tr('common.delete_permanently', 'Delete Permanently')}
                  </DropdownMenuItem>
                </span>
              </Tooltip>
              <DropdownMenuItem
                className={`group cursor-pointer hover:bg-gray-50 ${(!canEditBed || buildingInactive) ? 'opacity-60 cursor-not-allowed' : ''}`}
                title={buildingInactive ? blockedMsg : (canEditBed ? '' : (buildingId ? tr('permissions.no_edit_beds_building', "You don't have permission to edit beds for this building.") : tr('permissions.no_edit_beds', "You don't have permission to edit beds.")))}
                onSelect={(e) => {
                  if (buildingInactive) {
                    e?.preventDefault?.()
                    emitToast({ type: 'error', message: blockedMsg })
                    return
                  }
                  if (!canEditBed) {
                    e?.preventDefault?.()
                    emitToast({ type: 'warning', message: buildingId ? tr('permissions.no_edit_beds_building', "You don't have permission to edit beds for this building.") : tr('permissions.no_edit_beds', "You don't have permission to edit beds.") })
                    return
                  }
                  onEdit && onEdit(bed)
                }}
              >
                <FiEdit className={`mr-2 h-4 w-4 ${!canEditBed ? 'text-gray-400' : 'text-gray-500 group-hover:text-gray-700'}`} />
                {tr('common.edit', 'Edit')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {!bookingOnly && (
        <Modal
          isOpen={confirm.open}
          onClose={closeConfirm}
          title={
            confirm.type === 'delete'
              ? tr('beds.dialogs.delete_title', 'Delete Bed')
              : confirm.type === 'checkout'
                ? tr('beds.dialogs.checkout_title', 'Check-out Tenant')
                : tr('common.confirm', 'Confirm')
          }
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              {confirm.type === 'delete'
                ? tr('beds.dialogs.delete_description', 'This will permanently delete "{{label}}". This action cannot be undone.', { label })
                : confirm.type === 'checkout'
                  ? tr('beds.dialogs.checkout_description', 'Proceed to check-out current tenant from "{{label}}"? This will set today\'s date as actual checkout.', { label })
                  : ''}
            </p>
            {confirm.type === 'delete' && (
              <p className="text-xs text-gray-500">{tr('beds.confirm_delete_alt_inactive_hint', 'Tip: Instead of deleting, you can mark this bed inactive from Edit.')}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeConfirm}>{tr('common.cancel', 'Cancel')}</Button>
              {confirm.type === 'delete' ? (
                <Button
                  variant="destructive"
                  onClick={onConfirm}
                >
                  {tr('common.delete_hold_shift', 'Delete (Hold Shift)')}
                </Button>
              ) : (
                <Button onClick={onConfirm}>{tr('beds.actions.confirm_checkout', 'Confirm Check-out')}</Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Booking modals */}
      <Modal isOpen={checkinOpen} onClose={() => setCheckinOpen(false)} title={tr('bookings.titles.new_for_label', 'New Booking for {{label}}', { label })} maxWidth="lg">
        <BookingForm
          mode="create"
          lockLocation={true}
          initialValues={{
            building: selectedBuilding,
            floor: selectedFloor,
            room: selectedRoom,
            bed: bed?.id ? String(bed.id) : '',
            status: 'confirmed',
            start_date: todayISO(),
          }}
          statusOptions={[
            { value: 'confirmed', label: tr('bookings.status.confirmed', 'Confirmed') },
            { value: 'reserved', label: tr('bookings.status.reserved', 'Reserved') },
            { value: 'pending', label: tr('bookings.status.pending', 'Pending') },
          ]}
          onCancel={() => setCheckinOpen(false)}
          onSaved={async () => { setCheckinOpen(false); await loadExistingBooking(); onChanged && onChanged('booking_created', bed) }}
        />
      </Modal>

      <Modal isOpen={editBookingOpen} onClose={() => setEditBookingOpen(false)} title={tr('bookings.titles.edit_for_label', 'Edit Booking for {{label}}', { label })} maxWidth="lg">
        {existingBooking && (
          <BookingForm
            mode="edit"
            lockLocation={true}
            initialValues={{
              id: existingBooking.id,
              tenant: existingBooking.tenant,
              building: existingBooking.building,
              floor: existingBooking.floor,
              room: existingBooking.room,
              bed: existingBooking.bed,
              status: existingBooking.status,
              source: existingBooking.source,
              start_date: existingBooking.start_date,
              end_date: existingBooking.end_date,
              monthly_rent: existingBooking.monthly_rent,
              security_deposit: existingBooking.security_deposit,
              discount_amount: existingBooking.discount_amount,
              maintenance_amount: existingBooking.maintenance_amount,
              notes: existingBooking.notes,
            }}
            statusOptions={[
              { value: 'confirmed', label: tr('bookings.status.confirmed', 'Confirmed') },
              { value: 'reserved', label: tr('bookings.status.reserved', 'Reserved') },
              { value: 'pending', label: tr('bookings.status.pending', 'Pending') },
              { value: 'canceled', label: tr('bookings.status.canceled', 'Canceled') },
            ]}
            onCancel={() => setEditBookingOpen(false)}
            onSaved={async () => { setEditBookingOpen(false); await loadExistingBooking(); onChanged && onChanged('booking_updated', bed) }}
          />
        )}
      </Modal>
    </>
  )
}

export default BedActions