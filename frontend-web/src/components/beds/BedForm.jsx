import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { createBed, updateBed, getRooms, getRoom, getBeds } from '../../services/properties'
import { Button, PermissionButton } from '../ui/Button'
import { Input } from '../ui/Input'
import Label from '../ui/Label'
import Select from '../ui/Select'
import SearchableSelect from '../ui/SearchableSelect'
import { useToast } from '../../context/ToastContext'
import { useTranslation } from 'react-i18next'

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
]

const BedForm = ({ mode = 'create', initialValues = {}, roomId = null, onCancel, onSaved }) => {
  const [form, setForm] = useState({
    room: roomId || initialValues.room || '',
    number: initialValues.number || '',
    status: initialValues.status || 'available',
    monthly_rent: initialValues.monthly_rent ?? '',
    notes: initialValues.notes || '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [rooms, setRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [roomCapacity, setRoomCapacity] = useState(null)
  const [roomBedCount, setRoomBedCount] = useState(null)
  const [checkingRoomCapacity, setCheckingRoomCapacity] = useState(false)
  const { addToast } = useToast()
  const { t } = useTranslation()
  const tr = (k, f, opt) => t(k, { defaultValue: f, ...(opt || {}) })

  // Building scope for permission check
  const [buildingIdForPerm, setBuildingIdForPerm] = useState(null)

  const isEdit = mode === 'edit'
  const lockRoom = Boolean(roomId)

  const roomOptions = useMemo(() => {
    return rooms.map(r => ({
      value: r.id,
      label: tr('rooms.room_with_number', 'Room {{n}}', { n: r.number }),
      category: r.floor_display ? r.floor_display : undefined,
    }))
  }, [rooms, t])

  useEffect(() => {
    if (lockRoom) return
    const loadRooms = async () => {
      setLoadingRooms(true)
      try {
        const data = await getRooms()
        setRooms(Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [])
      } catch (e) {
        setRooms([])
        addToast({ message: tr('rooms.errors.load_failed', 'Failed to load rooms'), type: 'error' })
      } finally {
        setLoadingRooms(false)
      }
    }
    loadRooms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockRoom])

  // Resolve building id for permission scope using selected room -> floor -> building
  useEffect(() => {
    let cancelled = false
    const resolveBuilding = async () => {
      const selectedRoomId = lockRoom ? roomId : (typeof form.room === 'object' ? form.room?.value : form.room)
      if (!selectedRoomId) { if (!cancelled) setBuildingIdForPerm(null); return }
      try {
        const r = await getRoom(selectedRoomId)
        const floorId = (r && (typeof r.floor === 'object' ? r.floor?.id : r.floor)) || null
        if (!floorId) { if (!cancelled) setBuildingIdForPerm(null); return }
        const f = await (await import('../../services/properties')).getFloor(floorId)
        if (!cancelled) setBuildingIdForPerm(f?.building ?? null)
      } catch (_) {
        if (!cancelled) setBuildingIdForPerm(null)
      }
    }
    resolveBuilding()
    return () => { cancelled = true }
  }, [lockRoom, roomId, form.room])

  useEffect(() => {
    const roomId = typeof form.room === 'object' ? form.room?.value : form.room
    if (!roomId) {
      setRoomCapacity(null)
      setRoomBedCount(null)
      setErrors(prev => ({ ...prev, room: '' }))
      return
    }
    const loadStats = async () => {
      setCheckingRoomCapacity(true)
      try {
        // Try to get from already loaded rooms list first
        let capacity = null
        const r = rooms.find(x => x.id === roomId)
        if (r && typeof r.capacity === 'number') capacity = r.capacity
        if (capacity == null) {
          const roomData = await getRoom(roomId)
          capacity = roomData?.capacity ?? null
        }
        setRoomCapacity(capacity)
        const bedsData = await getBeds({ room: roomId })
        const beds = Array.isArray(bedsData?.results) ? bedsData.results : Array.isArray(bedsData) ? bedsData : []
        setRoomBedCount(beds.length)
        if (!isEdit && capacity != null && beds.length != null && beds.length >= capacity) {
          setErrors(prev => ({
            ...prev,
            room: tr('beds.validation.room_at_capacity', 'Cannot add more beds. Room capacity is {{capacity}} and it already has {{count}} bed(s).', { capacity, count: beds.length }),
          }))
        } else {
          setErrors(prev => ({ ...prev, room: '' }))
        }
      } catch (e) {
        setRoomCapacity(null)
        setRoomBedCount(null)
        setErrors(prev => ({ ...prev, room: '' }))
      } finally {
        setCheckingRoomCapacity(false)
      }
    }
    loadStats()
  }, [form.room, rooms, t])

  const setField = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.room) errs.room = tr('beds.validation.room_required', 'Room is required')
    if (!form.number || !String(form.number).trim()) errs.number = tr('beds.validation.number_required', 'Bed number is required')
    if (form.status === 'maintenance' && (!form.notes || !String(form.notes).trim())) {
      errs.notes = tr('beds.validation.maintenance_reason_required', 'Please provide a reason when setting status to maintenance.')
    }
    if (form.monthly_rent !== '' && (isNaN(Number(form.monthly_rent)) || Number(form.monthly_rent) < 0)) {
      errs.monthly_rent = tr('beds.validation.rent_non_negative', 'Monthly rent must be a non-negative number')
    }
    // Prevent adding bed if room is already at capacity
    if (roomCapacity != null && roomBedCount != null && roomBedCount >= roomCapacity && !isEdit) {
      errs.room = tr('beds.validation.room_at_capacity', 'Cannot add more beds. Room capacity is {{capacity}} and it already has {{count}} bed(s).', { capacity: roomCapacity, count: roomBedCount })
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!validate()) {
      // If capacity rule is violated, show a toast as well
      if (!isEdit && roomCapacity != null && roomBedCount != null && roomBedCount >= roomCapacity) {
        addToast({
          message: tr('beds.validation.room_at_capacity', 'Cannot add more beds. Room capacity is {{capacity}} and it already has {{count}} bed(s).', { capacity: roomCapacity, count: roomBedCount }),
          type: 'error',
        })
      }
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        room: typeof form.room === 'object' ? form.room.value : form.room,
        number: form.number,
        status: form.status,
        monthly_rent: form.monthly_rent === '' ? 0 : Number(form.monthly_rent),
        notes: form.notes,
      }

      const data = isEdit && initialValues?.id
        ? await updateBed(initialValues.id, payload)
        : await createBed(payload)

      onSaved?.(data)
    } catch (err) {
      const apiErrors = err?.response?.data || {}
      const mapped = {}
      Object.entries(apiErrors).forEach(([key, val]) => {
        if (Array.isArray(val)) mapped[key] = val.join(' ')
        else if (typeof val === 'string') mapped[key] = val
        else mapped[key] = String(val)
      })
      setErrors(mapped)
      const msg = apiErrors?.detail || err?.message || tr('beds.errors.save_failed', 'Failed to save bed')
      addToast({ message: msg, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedRoomOption = useMemo(() => {
    if (!form.room) return null
    if (typeof form.room === 'object') return form.room
    const opt = roomOptions.find(o => o.value === form.room)
    return opt || { value: form.room, label: tr('rooms.room_with_number', 'Room {{n}}', { n: form.room }) }
  }, [form.room, roomOptions, t])

  const statusOptions = useMemo(() => ([
    { value: 'available', label: tr('beds.available', 'Available') },
    { value: 'reserved', label: tr('beds.reserved', 'Reserved') },
    { value: 'occupied', label: tr('beds.occupied', 'Occupied') },
    { value: 'maintenance', label: tr('beds.maintenance', 'Maintenance') },
  ]), [t])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Room */}
      <div>
        <Label htmlFor="room">{tr('rooms.room', 'Room')}</Label>
        {lockRoom ? (
          <Input id="room" value={tr('rooms.room_hash_n', 'Room #{{n}}', { n: form.room })} disabled />
        ) : (
          <SearchableSelect
            options={roomOptions}
            value={selectedRoomOption}
            onChange={(opt) => setField('room', opt?.value)}
            loading={loadingRooms}
            placeholder={tr('rooms.search_placeholder', 'Search room by number')}
          />
        )}
        {checkingRoomCapacity && (
          <p className="mt-1 text-xs text-gray-500">{tr('rooms.checking_capacity', 'Checking capacity…')}</p>
        )}
        {errors.room && <p className="mt-1 text-xs text-red-600">{errors.room}</p>}
        {(!errors.room && roomCapacity != null && roomBedCount != null) && (
          <p className="mt-1 text-xs text-gray-600">{tr('rooms.capacity_summary', 'Capacity: {{capacity}} • Existing beds: {{count}}', { capacity: roomCapacity, count: roomBedCount })}</p>
        )}
      </div>

      {/* Bed Number */}
      <div>
        <Label htmlFor="number">{tr('beds.number', 'Bed Number')}</Label>
        <Input
          id="number"
          value={form.number}
          onChange={(e) => setField('number', e.target.value)}
          placeholder={tr('beds.number_placeholder', 'e.g., B1, 1, A-01')}
        />
        {errors.number && <p className="mt-1 text-xs text-red-600">{errors.number}</p>}
      </div>

      {/* Status */}
      <div>
        <Label htmlFor="status">{tr('beds.status', 'Status')}</Label>
        <Select
          id="status"
          value={form.status}
          onChange={(e) => setField('status', e.target.value)}
          options={statusOptions}
        />
        {errors.status && <p className="mt-1 text-xs text-red-600">{errors.status}</p>}
      </div>

      {/* Monthly Rent */}
      <div>
        <Label htmlFor="monthly_rent">{tr('beds.monthly_rent', 'Monthly Rent')}</Label>
        <Input
          id="monthly_rent"
          type="number"
          step="0.01"
          min="0"
          value={form.monthly_rent}
          onChange={(e) => setField('monthly_rent', e.target.value)}
          placeholder={tr('beds.rent_placeholder', 'e.g., 3500.00')}
        />
        {errors.monthly_rent && <p className="mt-1 text-xs text-red-600">{errors.monthly_rent}</p>}
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">{tr('beds.notes', 'Notes')}</Label>
        <Input
          id="notes"
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          placeholder={form.status === 'maintenance' ? tr('beds.notes_placeholder_maintenance', 'Reason for maintenance (required)') : tr('beds.notes_placeholder_optional', 'Optional notes')}
        />
        {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes}</p>}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>{tr('common.cancel', 'Cancel')}</Button>
        <PermissionButton
          type="submit"
          module="beds"
          action={isEdit ? 'edit' : 'add'}
          scopeId={buildingIdForPerm || 'global'}
          reason={isEdit ? tr('permissions.no_edit_beds_building', "You don't have permission to edit beds for this building.") : tr('permissions.no_add_beds', "You don't have permission to add beds.")}
          denyMessage={isEdit ? tr('permissions.deny_edit_beds_building', 'Permission denied: cannot edit beds for this building.') : tr('permissions.deny_add_beds', 'Permission denied: cannot add beds.')}
          disabled={submitting || (!isEdit && roomCapacity != null && roomBedCount != null && roomBedCount >= roomCapacity)}
        >
          {isEdit ? tr('common.save_changes', 'Save Changes') : tr('beds.actions.create_bed', 'Create Bed')}
        </PermissionButton>
      </div>
    </form>
  )
}

BedForm.propTypes = {
  mode: PropTypes.oneOf(['create', 'edit']),
  initialValues: PropTypes.object,
  roomId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onCancel: PropTypes.func,
  onSaved: PropTypes.func,
}

export default BedForm