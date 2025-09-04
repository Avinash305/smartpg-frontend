import React, { useEffect, useMemo, useState } from 'react'
import Label from '../ui/Label'
import { Button, PermissionButton } from '../ui/Button'
import { getFloors, getRooms, createRoom, updateRoom, createBed, getBeds, updateBed, getFloor } from '../../services/properties'
import { useToast } from '../../context/ToastContext'
import { useTranslation } from 'react-i18next'

const RoomForm = ({ initialValues = {}, mode = 'create', onCancel = () => {}, onSaved = () => {}, floorId }) => {
  const { t } = useTranslation()
  const tr = (k, f, opt) => t(k, { defaultValue: f, ...(opt || {}) })

  // Backend fields: floor (id), number (string), room_type (choice), monthly_rent (decimal), security_deposit (decimal), is_active (bool), notes (text)
  const [form, setForm] = useState({
    floor: '',
    number: initialValues.number ?? '',
    room_type: initialValues.room_type ?? 'single_sharing',
    monthly_rent: initialValues.monthly_rent ?? '',
    security_deposit: initialValues.security_deposit ?? '0',
    is_active: initialValues.is_active ?? true,
    notes: initialValues.notes ?? '',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [floors, setFloors] = useState([])
  const [loadingFloors, setLoadingFloors] = useState(false)
  const needsFloorSelect = !floorId && !initialValues.floor
  const { addToast } = useToast()

  // For permission scope (building-level)
  const [buildingIdForPerm, setBuildingIdForPerm] = useState(null)

  // Beds derived from room_type capacity, editable
  const capacityFromType = (t) => {
    if (t === 'single_sharing') return 1
    const n = parseInt(String(t).split('_', 1)[0], 10)
    return Number.isNaN(n) ? 1 : n
  }
  const [beds, setBeds] = useState([])
  const [autoBedNumbers, setAutoBedNumbers] = useState(true)

  const makeBedNumber = (index) => {
    const rn = String(form.number || '').trim()
    return rn ? `${rn}-${index + 1}` : String(index + 1)
  }

  // Compute currently selected floor id across modes
  const getId = (v) => (v && typeof v === 'object' ? v.id : v)
  const selectedFloorId = useMemo(() => getId(floorId) ?? getId(initialValues.floor) ?? form.floor, [floorId, initialValues.floor, form.floor])

  // Find selected floor from list when available (contains building id)
  const selectedFloor = useMemo(() => {
    if (!Array.isArray(floors)) return null
    const idNum = Number(selectedFloorId)
    return floors.find(f => Number(f?.id) === idNum) || null
  }, [floors, selectedFloorId])

  // Initialize/regenerate beds when room_type changes
  useEffect(() => {
    const cap = capacityFromType(form.room_type)
    setBeds((prev) => {
      let next = [...prev]
      // First time or empty -> generate
      if (next.length === 0) {
        return Array.from({ length: cap }, (_, i) => ({ id: undefined, number: makeBedNumber(i), status: 'available', monthly_rent: form.monthly_rent, notes: '', _syncedWithRoom: true }))
      }
      // Adjust length
      if (cap > next.length) {
        const add = Array.from({ length: cap - next.length }, (_, i) => ({ id: undefined, number: makeBedNumber(next.length + i), status: 'available', monthly_rent: form.monthly_rent, notes: '', _syncedWithRoom: true }))
        next = [...next, ...add]
      } else if (cap < next.length) {
        next = next.slice(0, cap)
      }
      // If auto numbering, reassign numbers to match prefix and sequence
      if (autoBedNumbers) {
        next = next.map((b, i) => ({ ...b, number: makeBedNumber(i) }))
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.room_type])

  // When room number changes, if auto mode, update bed numbers with new prefix
  useEffect(() => {
    if (!autoBedNumbers) return
    setBeds((prev) => prev.map((b, i) => ({ ...b, number: makeBedNumber(i) })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.number])

  const handleBedChange = (idx, field, value) => {
    setBeds((prev) => prev.map((b, i) => {
      if (i !== idx) return b
      const updated = { ...b, [field]: value }
      if (field === 'monthly_rent') {
        updated._syncedWithRoom = false
      }
      return updated
    }))
    if (field === 'number') setAutoBedNumbers(false)
  }
  const regenerateBedNumbers = () => {
    setBeds((prev) => prev.map((b, i) => ({ ...b, number: makeBedNumber(i) })))
    setAutoBedNumbers(true)
  }

  useEffect(() => {
    if (needsFloorSelect) {
      setLoadingFloors(true)
      getFloors({})
        .then((data) => {
          const arr = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
          setFloors(arr)
        })
        .catch((e) => { setFloors([]); addToast({ message: tr('floors.load_failed', 'Failed to load floors'), type: 'error' }) })
        .finally(() => setLoadingFloors(false))
    }
  }, [needsFloorSelect])

  // In edit mode (or when floors list lacks building), fetch the floor to get its building id for permission scope
  useEffect(() => {
    if (!selectedFloorId) return
    // Prefer floors list if it includes building id
    if (selectedFloor?.building) {
      setBuildingIdForPerm(selectedFloor.building)
      return
    }
    // Fallback: fetch single floor to get building id
    let cancelled = false
    getFloor(selectedFloorId)
      .then((f) => { if (!cancelled) setBuildingIdForPerm(f?.building ?? null) })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [selectedFloorId, selectedFloor?.building])

  const ROOM_TYPES = useMemo(() => {
    const base = [{ value: 'single_sharing', label: tr('rooms.types.single_sharing', 'Single Sharing') }]
    for (let n = 2; n <= 15; n++) base.push({ value: `${n}_sharing`, label: tr('rooms.types.n_sharing', '{{n}} Sharing', { n }) })
    return base
  }, [t])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!floorId && !initialValues.floor && !form.floor) newErrors.floor = tr('rooms.errors.floor_required', 'Floor is required')
    if (!form.number || !String(form.number).trim()) newErrors.number = tr('rooms.errors.number_required', 'Room number is required')
    if (!form.room_type) newErrors.room_type = tr('rooms.errors.room_type_required', 'Room type is required')
    if (form.monthly_rent === '' || isNaN(Number(form.monthly_rent)) || Number(form.monthly_rent) < 0) newErrors.monthly_rent = 'Monthly rent must be a non-negative number'
    if (form.security_deposit === '' || isNaN(Number(form.security_deposit)) || Number(form.security_deposit) < 0) newErrors.security_deposit = 'Security deposit must be a non-negative number'

    // Beds validation (create mode only)
    if (mode !== 'edit') {
      const cap = capacityFromType(form.room_type)
      if (beds.length !== cap) newErrors.beds = tr('rooms.errors.capacity_required', `Beds must match capacity (${cap})`)
      const nums = beds.map(b => String(b.number).trim()).filter(Boolean)
      const hasEmpty = nums.length !== beds.length
      const hasDup = new Set(nums.map(n => n.toLowerCase())).size !== nums.length
      if (hasEmpty) newErrors.beds = (newErrors.beds ? newErrors.beds + '. ' : '') + tr('rooms.errors.bed_number_required', 'Each bed must have a number')
      if (hasDup) newErrors.beds = (newErrors.beds ? newErrors.beds + '. ' : '') + tr('rooms.errors.bed_number_unique', 'Bed numbers must be unique')
    }
    // In edit mode, ensure non-empty and unique numbers (capacity can differ)
    if (mode === 'edit' && beds.length > 0) {
      const nums = beds.map(b => String(b.number).trim()).filter(Boolean)
      const hasEmpty = nums.length !== beds.length
      const hasDup = new Set(nums.map(n => n.toLowerCase())).size !== nums.length
      if (hasEmpty) newErrors.beds = (newErrors.beds ? newErrors.beds + '. ' : '') + tr('rooms.errors.bed_number_required', 'Each bed must have a number')
      if (hasDup) newErrors.beds = (newErrors.beds ? newErrors.beds + '. ' : '') + tr('rooms.errors.bed_number_unique', 'Bed numbers must be unique')
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const selectedFloorId = getId(floorId) ?? getId(initialValues.floor) ?? form.floor
      // Client-side duplicate check for number within the floor
      if (mode !== 'edit' && selectedFloorId) {
        try {
          // Fetch rooms for the selected floor (request large page size if supported)
          const existing = await getRooms({ floor: selectedFloorId, page_size: 1000 })
          const list = Array.isArray(existing)
            ? existing
            : (Array.isArray(existing?.results) ? existing.results : [])

          const isDup = Array.isArray(list) && list.some(
            (r) => String(r.number).trim().toLowerCase() === String(form.number).trim().toLowerCase()
          )
          if (isDup) {
            setErrors((prev) => ({ ...prev, number: tr('rooms.errors.number_duplicate', 'This room number already exists on the selected floor.') }))
            return
          }
        } catch (e) {
          // Non-blocking: if pre-check fails, proceed and rely on backend unique constraint
        }
      }

      const payload = {
        floor: Number(selectedFloorId),
        number: String(form.number).trim(),
        room_type: form.room_type,
        monthly_rent: Number(form.monthly_rent),
        security_deposit: Number(form.security_deposit),
        is_active: Boolean(form.is_active),
        notes: form.notes,
      }

      let saved
      if (mode === 'edit' && initialValues?.id) {
        saved = await updateRoom(initialValues.id, payload)
      } else {
        saved = await createRoom(payload)
      }

      // After room saved (especially on create), create/update beds when creating a new room
      if (saved?.id && mode !== 'edit') {
        await Promise.all(
          beds.map((b) =>
            createBed({
              room: saved.id,
              number: String(b.number).trim(),
              status: b.status || 'available',
              monthly_rent: b.monthly_rent === '' ? 0 : Number(b.monthly_rent),
              notes: '',
            })
          )
        )
      }
      // In edit mode, update existing beds with edited values (numbers/status/rent)
      if (saved?.id && mode === 'edit' && beds.length > 0) {
        await Promise.all(
          beds
            .filter(b => b.id) // update only existing beds
            .map((b) =>
              updateBed(b.id, {
                room: saved.id,
                number: String(b.number).trim(),
                status: b.status || 'available',
                monthly_rent: b.monthly_rent === '' ? 0 : Number(b.monthly_rent),
                notes: b.notes ?? '',
              })
            )
        )
      }
      setSubmitError('')
      onSaved(saved)
    } catch (err) {
      const data = err?.response?.data
      if (data && typeof data === 'object') {
        const fieldErrs = {}
        if (data.floor) fieldErrs.floor = Array.isArray(data.floor) ? data.floor.join(' ') : String(data.floor)
        if (data.number) fieldErrs.number = Array.isArray(data.number) ? data.number.join(' ') : String(data.number)
        if (data.room_type) fieldErrs.room_type = Array.isArray(data.room_type) ? data.room_type.join(' ') : String(data.room_type)
        if (data.monthly_rent) fieldErrs.monthly_rent = Array.isArray(data.monthly_rent) ? data.monthly_rent.join(' ') : String(data.monthly_rent)
        if (data.security_deposit) fieldErrs.security_deposit = Array.isArray(data.security_deposit) ? data.security_deposit.join(' ') : String(data.security_deposit)
        if (data.non_field_errors) setSubmitError(Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : String(data.non_field_errors))
        setErrors(prev => ({ ...prev, ...fieldErrs }))
        if (!Object.keys(fieldErrs).length && typeof data === 'string') setSubmitError(data)
        const msg = typeof data === 'string' ? data : (data.detail || tr('rooms.save_failed', 'Failed to save room'))
        addToast({ message: msg, type: 'error' })
      } else {
        const msg = err?.message || tr('rooms.save_failed', 'Failed to save room')
        setSubmitError(msg)
        addToast({ message: msg, type: 'error' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  // When room monthly_rent changes, update beds that are still synced or empty
  useEffect(() => {
    setBeds((prev) => prev.map((b) => (
      b._syncedWithRoom || b.monthly_rent === ''
        ? { ...b, monthly_rent: form.monthly_rent, _syncedWithRoom: true }
        : b
    )))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.monthly_rent])

  const isEdit = mode === 'edit'

  // Load existing beds in edit mode for display (read-only)
  useEffect(() => {
    const loadBeds = async () => {
      if (!isEdit || !initialValues?.id) return
      try {
        const data = await getBeds({ room: initialValues.id, page_size: 1000 })
        const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
        setBeds(list.map(b => ({
          id: b.id,
          number: b.number,
          status: b.status,
          monthly_rent: b.monthly_rent ?? '',
          notes: b.notes ?? '',
          _syncedWithRoom: false,
        })))
      } catch (e) {
        // ignore; keep beds as-is
      }
    }
    loadBeds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, initialValues?.id])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitError && (
        <div className="text-xs sm:text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
          {submitError}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {needsFloorSelect && (
          <div className="sm:col-span-2">
            <Label htmlFor="floor">{tr('floors.floor', 'Floor')}</Label>
            <select
              id="floor"
              name="floor"
              value={form.floor}
              onChange={handleChange}
              required
              disabled={loadingFloors}
              className={`flex h-9 sm:h-10 w-full rounded-md border ${errors.floor ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="" disabled>{loadingFloors ? tr('floors.loading', 'Loading floors...') : tr('floors.placeholders.select_floor', 'Select floor')}</option>
              {floors.map(f => (
                <option key={f.id} value={f.id}>
                  {f.building_name ? `${f.building_name} - ` : ''}{(typeof f.number === 'number' ? (f.number === 0 ? 'Ground Floor' : `${f.number} Floor`) : f.number)}
                </option>
              ))}
            </select>
            {errors.floor && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.floor}</p>}
          </div>
        )}
        <div>
          <Label htmlFor="number">{tr('rooms.labels.number', 'Room Number')}</Label>
          <input
            id="number"
            name="number"
            value={form.number}
            onChange={handleChange}
            placeholder="e.g., 101, A-1"
            className={`flex h-9 sm:h-10 w-full rounded-md border ${errors.number ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
          {errors.number && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.number}</p>}
        </div>
        <div>
          <Label htmlFor="room_type">{tr('rooms.labels.room_type', 'Room Type')}</Label>
          <select
            id="room_type"
            name="room_type"
            value={form.room_type}
            onChange={handleChange}
            className={`flex h-9 sm:h-10 w-full rounded-md border ${errors.room_type ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          >
            {ROOM_TYPES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.room_type && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.room_type}</p>}
        </div>
        <div>
          <Label htmlFor="monthly_rent">{tr('rooms.labels.monthly_rent', 'Monthly Rent')}</Label>
          <input
            id="monthly_rent"
            name="monthly_rent"
            type="number"
            min="0"
            step="0.01"
            value={form.monthly_rent}
            onChange={handleChange}
            className={`flex h-9 sm:h-10 w-full rounded-md border ${errors.monthly_rent ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
          {errors.monthly_rent && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.monthly_rent}</p>}
        </div>
        <div>
          <Label htmlFor="security_deposit">{tr('rooms.labels.security_deposit', 'Security Deposit')}</Label>
          <input
            id="security_deposit"
            name="security_deposit"
            type="number"
            min="0"
            step="0.01"
            value={form.security_deposit}
            onChange={handleChange}
            className={`flex h-9 sm:h-10 w-full rounded-md border ${errors.security_deposit ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
          {errors.security_deposit && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.security_deposit}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">{tr('rooms.labels.notes', 'Notes')}</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={form.notes}
            onChange={handleChange}
            placeholder="Optional notes about this room"
            className={`flex w-full rounded-md border ${errors.notes ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-700">
            <input
              type="checkbox"
              name="is_active"
              checked={!!form.is_active}
              onChange={handleChange}
              className="h-4 w-4"
            />
            {tr('rooms.labels.active', 'Active')}
          </label>
        </div>

        {/* Beds section (editable in edit mode) */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <Label>{tr('rooms.labels.beds', 'Beds')} ({tr('rooms.capacity', 'Capacity')} {capacityFromType(form.room_type)})</Label>
            <div className="flex items-center gap-2">
              {/* <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                <input type="checkbox" checked={autoBedNumbers} onChange={(e) => setAutoBedNumbers(e.target.checked)} className="h-4 w-4" />
                Auto numbering
              </label> */}
              {!isEdit && (
                <Button type="button" variant="outline" size="sm" onClick={regenerateBedNumbers}>{tr('rooms.labels.auto_number', 'Auto-number 1..N')}</Button>
              )}
            </div>
          </div>
          {errors.beds && <div className="mb-2 text-xs sm:text-sm text-red-600">{errors.beds}</div>}
          <div className="space-y-2">
            {beds.map((b, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-3">
                  <Label htmlFor={`bed-number-${idx}`}>{tr('rooms.labels.bed_number', 'Bed Number')}</Label>
                  <input
                    id={`bed-number-${idx}`}
                    value={b.number}
                    onChange={(e) => handleBedChange(idx, 'number', e.target.value)}
                    disabled={false}
                    className="flex h-9 sm:h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label htmlFor={`bed-status-${idx}`}>{tr('rooms.labels.status', 'Status')}</Label>
                  <select
                    id={`bed-status-${idx}`}
                    value={b.status}
                    onChange={(e) => handleBedChange(idx, 'status', e.target.value)}
                    disabled={false}
                    className="flex h-9 sm:h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="sm:col-span-6">
                  <Label htmlFor={`bed-monthly-rent-${idx}`}>{tr('rooms.labels.monthly_rent', 'Monthly Rent')}</Label>
                  <input
                    id={`bed-monthly-rent-${idx}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={b.monthly_rent}
                    onChange={(e) => handleBedChange(idx, 'monthly_rent', e.target.value)}
                    disabled={false}
                    placeholder="e.g., 3500.00"
                    className="flex h-9 sm:h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>{tr('settings.localization.cancel', 'Cancel')}</Button>
        <PermissionButton
          type="submit"
          module="rooms"
          action={mode === 'edit' ? 'edit' : 'add'}
          scopeId={(buildingIdForPerm ?? selectedFloor?.building) || 'global'}
          loading={submitting}
          reason={mode === 'edit' ? tr('rooms.permissions.reason_edit', "You don't have permission to edit rooms for this building.") : tr('rooms.permissions.reason_add', "You don't have permission to create rooms.")}
          denyMessage={mode === 'edit' ? tr('rooms.permissions.deny_edit', 'Permission denied: cannot edit rooms for this building.') : tr('rooms.permissions.deny_add', 'Permission denied: cannot create rooms.')}
        >
          {mode === 'edit' ? tr('rooms.buttons.save_changes', 'Save Changes') : tr('rooms.buttons.create_room', 'Create Room')}
        </PermissionButton>
      </div>
    </form>
  )
}

export default RoomForm