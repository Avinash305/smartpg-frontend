import React, { useEffect, useMemo, useState, useRef } from 'react'
import PropTypes from 'prop-types'
import Modal from '../ui/Modal'
import { Button } from '../ui/Button'
import { getFloors, getRooms, getBeds } from '../../services/properties'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'

function formatFloorLabel(n) {
  const num = Number(n)
  if (Number.isNaN(num)) return String(n)
  if (num === 0) return 'Ground Floor'
  const words = ['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth','Eleventh','Twelfth','Thirteenth','Fourteenth','Fifteenth','Sixteenth','Seventeenth','Eighteenth','Nineteenth','Twentieth']
  const label = words[num - 1] || `${num}th`
  return `${label} Floor`
}

const MoveBookingModal = ({ isOpen, booking, onClose, onMoved }) => {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { addToast } = useToast()

  // Options
  const [floors, setFloors] = useState([])
  const [rooms, setRooms] = useState([])
  const [beds, setBeds] = useState([])

  // Track previous values to decide when to clear cascade
  const prevFloorRef = useRef(null)
  const prevRoomRef = useRef(null)

  // Form state (building is fixed to current booking's building)
  const building = booking?.building || booking?.building_id || ''
  const current = {
    floor: String(booking?.floor || booking?.floor_id || ''),
    room: String(booking?.room || booking?.room_id || ''),
    bed: String(booking?.bed || booking?.bed_id || ''),
    floor_display: booking?.floor_display || '',
    room_number: booking?.room_number || '',
    bed_number: booking?.bed_number || '',
  }

  const [form, setForm] = useState({ floor: '', room: '', bed: '', notes: '' })

  // When modal opens, seed form with current values
  useEffect(() => {
    if (!isOpen) return
    setForm({ floor: current.floor, room: current.room, bed: current.bed, notes: '' })
    prevFloorRef.current = current.floor
    prevRoomRef.current = current.room
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Load floors on open
  useEffect(() => {
    if (!isOpen || !building) return
    let alive = true
    const run = async () => {
      try {
        const fl = await getFloors({ building })
        if (!alive) return
        const items = Array.isArray(fl) ? fl : fl?.results || []
        setFloors(items)
      } catch (_) { setFloors([]) }
    }
    run()
    return () => { alive = false }
  }, [isOpen, building])

  // Load rooms when floor changes (or list by building if no floor yet)
  useEffect(() => {
    if (!isOpen || !building) return
    let alive = true
    const run = async () => {
      try {
        const params = form.floor ? { floor: form.floor } : { building }
        const rr = await getRooms(params)
        if (!alive) return
        const items = Array.isArray(rr) ? rr : rr?.results || []
        setRooms(items)
        // After rooms load, if form.room is empty but current has a room that exists in list, prefill
        if (!form.room && current.room) {
          const exists = items.some(r => String(r.id) === String(current.room))
          if (exists) {
            setForm((f) => ({ ...f, room: String(current.room) }))
            prevRoomRef.current = String(current.room)
          }
        }
      } catch (_) { setRooms([]) }
    }
    run()
    // Clear deeper only if user actually changed floor to a different value (not just initial seed)
    if (prevFloorRef.current !== null && prevFloorRef.current !== form.floor) {
      setForm((f) => ({ ...f, room: '', bed: '' }))
      setBeds([])
    }
    prevFloorRef.current = form.floor
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.floor, isOpen, building])

  // Load beds when room changes
  useEffect(() => {
    if (!isOpen) return
    let alive = true
    const run = async () => {
      if (!form.room) { setBeds([]); return }
      try {
        const bb = await getBeds({ room: form.room })
        if (!alive) return
        const items = Array.isArray(bb) ? bb : bb?.results || []
        setBeds(items)
        // After beds load, if form.bed is empty and current bed exists AND is available, prefill
        if (!form.bed && current.bed) {
          const curr = items.find(b => String(b.id) === String(current.bed))
          if (curr && curr.status === 'available') {
            setForm((f) => ({ ...f, bed: String(current.bed) }))
          }
        }
      } catch (_) { setBeds([]) }
    }
    run()
    // Clear bed only if room actually changed (not initial seed)
    if (prevRoomRef.current !== null && prevRoomRef.current !== form.room) {
      setForm((f) => ({ ...f, bed: '' }))
    }
    prevRoomRef.current = form.room
    return () => { alive = false }
  }, [form.room, isOpen])

  // Derived: filtered beds (only available)
  const filteredBeds = useMemo(() => {
    return beds.filter((b) => b.status === 'available')
  }, [beds])

  // Selected bed object and availability flag
  const selectedBed = useMemo(() => beds.find(b => String(b.id) === String(form.bed)), [beds, form.bed])
  const bedIsAvailable = selectedBed ? (selectedBed.status === 'available') : false

  const disableSubmit = useMemo(() => !form.floor || !form.room || !form.bed || !bedIsAvailable || submitting, [form, submitting, bedIsAvailable])

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (disableSubmit) return
    // Guard: ensure selected bed is available
    if (!bedIsAvailable) {
      setError('Please select an available bed to move the tenant.')
      addToast({ type: 'error', message: 'Please select an available bed to move the tenant.', duration: 4000 })
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        // Only send changed location fields
        floor: form.floor,
        room: form.room,
        bed: form.bed,
        move_notes: form.notes || '',
      }
      await api.patch(`/bookings/bookings/${booking.id}/`, payload)
      addToast({ type: 'success', message: 'Tenant moved successfully.', duration: 3500 })
      onMoved?.()
    } catch (err) {
      const detail = err?.response?.data
      const msg = typeof detail === 'string' ? detail : (detail?.detail || 'Failed to move booking')
      setError(msg)
      addToast({ type: 'error', message: msg || 'Failed to move booking', duration: 5000 })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Move Tenant (Booking #${booking?.id || ''})`} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>}

        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm">
          <div className="text-gray-600">Current</div>
          <div className="font-medium">
            {booking?.building_name || 'Building'} • {current.floor_display || '-'} • {current.room_number || '-'} • {current.bed_number || '-'}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs sm:text-sm text-gray-700 mb-1">Floor</label>
            <select
              value={form.floor}
              onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
              className="w-full border rounded p-2 text-sm"
            >
              <option value="">Select floor</option>
              {floors.map((fl) => (
                <option key={fl.id} value={String(fl.id)}>{formatFloorLabel(fl.number)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm text-gray-700 mb-1">Room</label>
            <select
              value={form.room}
              onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
              className={`w-full border rounded p-2 text-sm ${!form.floor ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' : ''}`}
              disabled={!form.floor}
            >
              <option value="">Select room</option>
              {rooms.map((r) => (
                <option key={r.id} value={String(r.id)}>{r.number}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm text-gray-700 mb-1">Bed</label>
            <select
              value={form.bed}
              onChange={(e) => setForm((f) => ({ ...f, bed: e.target.value }))}
              className={`w-full border rounded p-2 text-sm ${!form.room ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' : ''}`}
              disabled={!form.room}
            >
              <option value="">Select bed</option>
              {filteredBeds.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.number} {b.status ? `(${b.status})` : ''}
                </option>
              ))}
            </select>
            {!filteredBeds.length && form.room && (
              <p className="mt-1 text-xs text-amber-700">No available beds in this room.</p>
            )}
            {form.bed && !bedIsAvailable && (
              <p className="mt-1 text-xs text-red-600">Selected bed is not available. Please choose another bed.</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            value={form.notes || ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
            placeholder="Reason/details for this move"
            className="w-full border rounded p-2 text-sm resize-y"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting} disabled={disableSubmit}>Move</Button>
        </div>
      </form>
    </Modal>
  )
}

MoveBookingModal.propTypes = {
  isOpen: PropTypes.bool,
  booking: PropTypes.object,
  onClose: PropTypes.func,
  onMoved: PropTypes.func,
}

export default MoveBookingModal
