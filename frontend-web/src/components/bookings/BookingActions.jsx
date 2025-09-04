import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Button, PermissionButton } from '../ui/Button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator } from '../ui/DropdownMenu'
import MoveBookingModal from './MoveBookingModal'
import Modal from '../ui/Modal'
import BookingForm from './BookingForm'
import { useToast } from '../../context/ToastContext'
import { useCan } from '../../context/AuthContext'

/**
 * BookingActions: Action controls for a booking item
 *
 * Props:
 * - booking: booking object with at least { id, status }
 * - onEdit: function(booking) -> void  (optional)
 * - onChanged: function() -> void  (optional) called after a destructive/update action completes
 * - onBedAffected: function(bedId) -> void  (optional) called when booking status changes or booking is deleted
 */
export default function BookingActions({ booking, onEdit, onChanged, onBedAffected }) {
  const [loading, setLoading] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteType, setDeleteType] = useState('soft') // 'soft' | 'hard'
  const [confirmHardAck, setConfirmHardAck] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editInitial, setEditInitial] = useState(null)
  const { addToast } = useToast()
  const { can, isPGAdmin } = useCan()

  if (!booking?.id) return null

  // Scope and per-action permissions
  const scopeId = String(booking?.building?.id ?? booking?.building_id ?? booking?.building ?? 'global')
  const canEditBooking = isPGAdmin || can('bookings', 'edit', scopeId)
  const canDeleteBooking = isPGAdmin || can('bookings', 'delete', scopeId)
  const canViewBooking = isPGAdmin || can('bookings', 'view', scopeId)

  // Status color scheme (kept consistent across app)
  const getStatusBadgeClass = (s) => {
    switch (String(s || '')) {
      case 'pending':
        return 'text-amber-700 bg-amber-50 border border-amber-200'
      case 'reserved':
        return 'text-indigo-700 bg-indigo-50 border border-indigo-200'
      case 'confirmed':
        return 'text-emerald-700 bg-emerald-50 border border-emerald-200'
      case 'canceled':
        return 'text-red-700 bg-red-50 border border-red-200'
      case 'checked_out':
        return 'text-slate-700 bg-slate-50 border border-slate-200'
      default:
        return 'text-gray-700 bg-gray-50 border border-gray-200'
    }
  }
  const getStatusDotClass = (s) => {
    switch (String(s || '')) {
      case 'pending':
        return 'bg-amber-500'
      case 'reserved':
        return 'bg-indigo-500'
      case 'confirmed':
        return 'bg-emerald-500'
      case 'canceled':
        return 'bg-red-500'
      case 'checked_out':
        return 'bg-slate-500'
      default:
        return 'bg-gray-400'
    }
  }
  const formatStatusLabel = (s) => String(s || '-').replace(/_/g, ' ')

  // Business rule:
  // - Before confirmed: allow any status selection
  // - After confirmed: only allow transition to canceled or checked_out
  // - After canceled: allow any status again
  const computeAllowedStatuses = (current) => {
    if (current === 'confirmed') return ['canceled', 'checked_out']
    return ['pending', 'reserved', 'confirmed', 'canceled']
  }

  const doUpdateStatus = async (newStatus) => {
    setLoading(true)
    try {
      if (!canEditBooking) {
        addToast({ message: `You don't have permission to update booking status${scopeId && scopeId !== 'global' ? ` for building ${scopeId}` : ''}.`, type: 'warning' })
        return
      }

      // Enforce only the confirmed->canceled restriction
      const current = String(booking?.status || '')
      const allowed = computeAllowedStatuses(current)
      if (!allowed.includes(newStatus)) {
        addToast({ message: `Cannot change from ${formatStatusLabel(current)} to ${formatStatusLabel(newStatus)}. Only 'Canceled' or 'Checked Out' is allowed after Confirmed.`, type: 'warning' })
        return
      }

      // Informational hints about backend auto-derivation; do not block
      const hasBed = Boolean((booking?.bed && (booking.bed.id ?? booking.bed)) || booking?.bed_id)
      if (newStatus === 'pending' && hasBed) {
        addToast({ message: 'Note: Backend will not keep Pending while a bed is assigned; it may auto-set to Reserved/Confirmed.', type: 'info' })
      }
      const startDate = booking?.start_date
      if (newStatus === 'reserved' && hasBed && startDate) {
        const today = new Date(); const todayStr = today.toISOString().slice(0,10)
        if (String(startDate) <= todayStr) {
          addToast({ message: 'Note: Check-in is today/past; backend may set this to Confirmed.', type: 'info' })
        }
      }

      await api.patch(`/bookings/bookings/${booking.id}/`, { status: newStatus })
      // Notify parent so it can refetch the affected bed to reflect new bed.status
      const bedId = (booking?.bed && (booking.bed.id ?? booking.bed)) || booking?.bed_id || null
      if (bedId) onBedAffected?.(bedId)
      onChanged?.()
      addToast({ message: `Booking status updated to ${String(newStatus).replace(/_/g, ' ')}`, type: 'success' })
    } catch (err) {
      // Surface backend validation/permission errors
      const msg = err?.response?.data ?
        (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)) :
        (err?.message || 'Failed to update status')
      addToast({ message: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const doHardDelete = async () => {
    setLoading(true)
    try {
      await api.delete(`/bookings/bookings/${booking.id}/`)
      setDeleteOpen(false)
      // Booking removed; free up bed
      const bedId = (booking?.bed && (booking.bed.id ?? booking.bed)) || booking?.bed_id || null
      if (bedId) onBedAffected?.(bedId)
      onChanged?.()
      addToast({ message: 'Booking deleted successfully', type: 'success' })
    } catch (_) {
      addToast({ message: 'Failed to delete booking', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const doSoftDelete = async () => {
    await doUpdateStatus('canceled')
    setDeleteOpen(false)
  }

  const isCanceled = String(booking.status || '') === 'canceled'
  const status = String(booking.status || '')

  const openEdit = async () => {
    if (!canEditBooking) {
      addToast({ message: `You don't have permission to edit bookings${scopeId && scopeId !== 'global' ? ` for building ${scopeId}` : ''}.`, type: 'warning' })
      return
    }
    if (onEdit) {
      // If parent supplied custom edit handler, delegate to it
      onEdit(booking)
      return
    }
    setEditOpen(true)
    setEditLoading(true)
    try {
      const res = await api.get(`/bookings/bookings/${booking.id}/`)
      const b = res.data || {}
      const pickId = (v) => (v && typeof v === 'object' ? (v.id ?? '') : v ?? '')
      // Normalize fields expected by BookingForm
      const normalized = {
        ...b,
        tenant: pickId(b.tenant) || b.tenant_id || '',
        building: pickId(b.building) || b.building_id || '',
        floor: pickId(b.floor) || b.floor_id || '',
        room: pickId(b.room) || b.room_id || '',
        bed: pickId(b.bed) || b.bed_id || '',
      }
      setEditInitial(normalized)
    } catch (_) {
      const b = booking || {}
      const pickId = (v) => (v && typeof v === 'object' ? (v.id ?? '') : v ?? '')
      const fallback = {
        ...b,
        tenant: pickId(b.tenant) || b.tenant_id || '',
        building: pickId(b.building) || b.building_id || '',
        floor: pickId(b.floor) || b.floor_id || '',
        room: pickId(b.room) || b.room_id || '',
        bed: pickId(b.bed) || b.bed_id || '',
      }
      setEditInitial(fallback)
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center rounded border px-2 py-1 bg-white hover:bg-gray-50 ${loading ? 'pointer-events-none opacity-50' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className={`mr-1 h-2 w-2 rounded-full ${getStatusDotClass(status)}`}/>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-600">
              <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
            </svg>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()} align="end" className="min-w-[220px]">
          {/* Nested Status submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={`cursor-pointer ${!canEditBooking ? 'opacity-60 cursor-not-allowed' : ''}`} title={!canEditBooking ? "You don't have permission to update status" : ''}>
              <span className="inline-flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${getStatusDotClass(status)}`} />
                Status: <span className="font-medium">{formatStatusLabel(status)}</span>
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={status}
                onValueChange={(val) => {
                  if (!val || val === status) return
                  if (!canEditBooking) {
                    addToast({ message: `You don't have permission to update booking status${scopeId && scopeId !== 'global' ? ` for building ${scopeId}` : ''}.`, type: 'warning' })
                    return
                  }
                  doUpdateStatus(val)
                }}
              >
                {computeAllowedStatuses(status).map((key) => {
                  const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
                  return (
                    <DropdownMenuRadioItem
                      key={key}
                      value={key}
                      className={`cursor-pointer ${!canEditBooking ? 'opacity-60 cursor-not-allowed' : ''}`}
                      onClick={(e) => {
                        if (!canEditBooking) {
                          e.preventDefault()
                          e.stopPropagation()
                          addToast({ message: `You don't have permission to update booking status${scopeId && scopeId !== 'global' ? ` for building ${scopeId}` : ''}.`, type: 'warning' })
                        }
                      }}
                    >
                      {!canEditBooking && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-600">
                          <path fillRule="evenodd" d="M10 1.5a4 4 0 00-4 4V7H5a2.5 2.5 0 00-2.5 2.5v5A2.5 2.5 0 005 17h10a2.5 2.5 0 002.5-2.5v-5A2.5 2.5 0 0015 7h-1V5.5a4 4 0 00-4-4zm-2.5 5V5.5a2.5 2.5 0 115 0V6.5h-5z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`h-2 w-2 rounded-full ${getStatusDotClass(key)}`} />
                      {label}
                    </DropdownMenuRadioItem>
                  )
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          {/* View */}
          <DropdownMenuItem
            className={`cursor-pointer ${!canViewBooking ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={!canViewBooking ? "You don't have permission to view this booking" : ''}
            onClick={(e) => {
              e.stopPropagation()
              if (!canViewBooking) {
                addToast({ message: `You don't have permission to view bookings${scopeId && scopeId !== 'global' ? ` for building ${scopeId}` : ''}.`, type: 'warning' })
                return
              }
            }}
          >
            <Link to={`/bookings/${booking.id}`} onClick={(e) => e.stopPropagation()} className="block w-full">
              View
            </Link>
          </DropdownMenuItem>
          {/* Edit */}
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); if (!canEditBooking) { addToast({ message: `You don't have permission to edit this booking${scopeId && scopeId !== 'global' ? ` (building ${scopeId})` : ''}.`, type: 'warning' }); return } openEdit() }}
            className={`cursor-pointer ${!canEditBooking ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={!canEditBooking ? "You don't have permission to edit this booking" : ''}
          >
            <span className="inline-flex items-center gap-2">
              {!canEditBooking && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-600">
                  <path fillRule="evenodd" d="M10 1.5a4 4 0 00-4 4V7H5a2.5 2.5 0 00-2.5 2.5v5A2.5 2.5 0 005 17h10a2.5 2.5 0 002.5-2.5v-5A2.5 2.5 0 0015 7h-1V5.5a4 4 0 00-4-4zm-2.5 5V5.5a2.5 2.5 0 115 0V6.5h-5z" clipRule="evenodd" />
                </svg>
              )}
              Edit
            </span>
          </DropdownMenuItem>
          {/* Move Tenant (floor/room/bed) */}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              if (!canEditBooking) {
                addToast({ message: `You don't have permission to move tenants for this booking${scopeId && scopeId !== 'global' ? ` (building ${scopeId})` : ''}.`, type: 'warning' })
                return
              }
              setMoveOpen(true)
            }}
            className={`cursor-pointer ${!canEditBooking ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={!canEditBooking ? "You don't have permission to move tenants for this booking" : ''}
          >
            <span className="inline-flex items-center gap-2">
              {!canEditBooking && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-600">
                  <path fillRule="evenodd" d="M10 1.5a4 4 0 00-4 4V7H5a2.5 2.5 0 00-2.5 2.5v5A2.5 2.5 0 005 17h10a2.5 2.5 0 002.5-2.5v-5A2.5 2.5 0 0015 7h-1V5.5a4 4 0 00-4-4zm-2.5 5V5.5a2.5 2.5 0 115 0V6.5h-5z" clipRule="evenodd" />
                </svg>
              )}
              Move Tenant
            </span>
          </DropdownMenuItem>
          {/* Delete */}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              if (!canDeleteBooking) {
                addToast({ message: `You don't have permission to delete bookings${scopeId && scopeId !== 'global' ? ` for building ${scopeId}` : ''}.`, type: 'warning' })
                return
              }
              setDeleteType(e.shiftKey ? 'hard' : 'soft')
              setConfirmHardAck(false)
              setDeleteOpen(true)
            }}
            className={`cursor-pointer text-red-600 focus:text-red-700 ${!canDeleteBooking ? 'opacity-60 cursor-not-allowed' : ''}`}
            title="Hold Shift to preselect permanent delete"
          >
            <span className="inline-flex items-center gap-2">
              {!canDeleteBooking && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-600">
                  <path fillRule="evenodd" d="M10 1.5a4 4 0 00-4 4V7H5a2.5 2.5 0 00-2.5 2.5v5A2.5 2.5 0 005 17h10a2.5 2.5 0 002.5-2.5v-5A2.5 2.5 0 0015 7h-1V5.5a4 4 0 00-4-4zm-2.5 5V5.5a2.5 2.5 0 115 0V6.5h-5z" clipRule="evenodd" />
                </svg>
              )}
              Delete
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {loading && (
        <span className="ml-1 inline-flex items-center text-gray-400" title="Working...">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
      {/* Move modal */}
      {moveOpen && (
        <MoveBookingModal
          isOpen={moveOpen}
          booking={booking}
          onClose={() => setMoveOpen(false)}
          onMoved={() => { setMoveOpen(false); onChanged?.() }}
        />
      )}
      {/* Delete confirmation modal */}
      {deleteOpen && (
        <Modal
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          title="Delete Booking"
          maxWidth="sm"
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Choose how you want to delete this booking.
            </p>
            <div className="space-y-2">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="delete_type"
                  value="soft"
                  checked={deleteType === 'soft'}
                  onChange={() => { setDeleteType('soft'); setConfirmHardAck(false) }}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Move to Trash (Soft delete)</div>
                  <div className="text-xs text-gray-600">Marks status as canceled. You can restore later.</div>
                </div>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="delete_type"
                  value="hard"
                  checked={deleteType === 'hard'}
                  onChange={() => { setDeleteType('hard'); setConfirmHardAck(false) }}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Permanently delete</div>
                  <div className="text-xs text-gray-600">This will remove the booking permanently.</div>
                </div>
              </label>
              {deleteType === 'hard' && (
                <label className="mt-2 flex items-start gap-2 rounded border border-red-200 bg-red-50 p-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-600"
                    checked={confirmHardAck}
                    onChange={(e) => setConfirmHardAck(e.target.checked)}
                  />
                  <span className="text-xs text-red-700">
                    I understand this action cannot be undone and will permanently delete this booking.
                  </span>
                </label>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setDeleteOpen(false)} disabled={loading}>Cancel</Button>
              <PermissionButton
                module="bookings"
                action="delete"
                scopeId={String(booking?.building?.id ?? booking?.building_id ?? booking?.building ?? 'global')}
                type="button"
                onClick={() => { deleteType === 'hard' ? doHardDelete() : doSoftDelete() }}
                disabled={(deleteType === 'hard' && !confirmHardAck)}
                loading={loading}
                className={deleteType === 'hard' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                denyMessage={`You don't have permission to delete bookings${(booking?.building || booking?.building_id) ? ` for building ${booking?.building?.id ?? booking?.building_id ?? booking?.building}` : ''}.`}
              >
                {deleteType === 'hard' ? 'Delete permanently' : 'Move to Trash'}
              </PermissionButton>
            </div>
          </div>
        </Modal>
      )}
      {/* Edit modal */}
      {editOpen && (
        <Modal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit Booking"
          maxWidth="lg"
        >
          {editLoading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : (
            <BookingForm
              mode="edit"
              initialValues={editInitial}
              onCancel={() => setEditOpen(false)}
              onSaved={() => { setEditOpen(false); onChanged?.() }}
            />
          )}
        </Modal>
      )}
    </div>
  )
}

BookingActions.propTypes = {
  booking: PropTypes.object,
  onEdit: PropTypes.func,
  onChanged: PropTypes.func,
  // Optional: parent can refetch bed by id to show updated bed.status
  onBedAffected: PropTypes.func,
}