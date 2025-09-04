import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/DropdownMenu'
import { FiMoreVertical, FiEdit, FiTrash2 } from 'react-icons/fi'
import Modal from '../ui/Modal'
import { useToast } from '../../context/ToastContext'
import { deleteRoom, getFloor, guarded } from '../../services/properties'
import { useCan } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'
import Tooltip from '../ui/Tooltip'

const RoomActions = ({ room, onEdit, onChanged, buildingInactive = false }) => {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState({ open: false })
  const { can, isPGAdmin, permissions } = useCan()
  const { t } = useTranslation()
  const tr = (key, fallback) => {
    const val = t(key)
    return val !== key ? val : fallback
  }

  // Try to determine building id for precise permission checks
  const floorId = useMemo(() => {
    if (!room) return null
    // room.floor may be an id or an object { id, ... }
    const f = room.floor
    return (f && typeof f === 'object') ? f.id : f
  }, [room])
  const [buildingId, setBuildingId] = useState(() => room?.building || room?.building_id || null)

  useEffect(() => {
    // If building is directly on room, use it
    if (room?.building || room?.building_id) {
      setBuildingId(room.building ?? room.building_id)
      return
    }
    // Else fetch the floor to learn its building
    if (!buildingId && floorId) {
      let cancelled = false
      getFloor(floorId)
        .then((f) => { if (!cancelled) setBuildingId(f?.building ?? null) })
        .catch(() => { /* ignore */ })
      return () => { cancelled = true }
    }
  }, [room?.building, room?.building_id, floorId])

  const canEdit = useMemo(() => {
    if (isPGAdmin) return true
    if (buildingId) return can('rooms', 'edit', buildingId)
    // Fallback: allow if user has any rooms:edit at any scope or global
    const hasGlobal = can('rooms', 'edit', 'global')
    const hasAnyBuilding = Object.entries(permissions || {}).some(([k, v]) => (
      k !== 'global' && v && v.rooms && v.rooms.edit === true
    ))
    return hasGlobal || hasAnyBuilding
  }, [isPGAdmin, buildingId, can, permissions])

  const canDelete = useMemo(() => {
    if (isPGAdmin) return true
    if (buildingId) return can('rooms', 'delete', buildingId)
    const hasGlobal = can('rooms', 'delete', 'global')
    const hasAnyBuilding = Object.entries(permissions || {}).some(([k, v]) => (
      k !== 'global' && v && v.rooms && v.rooms.delete === true
    ))
    return hasGlobal || hasAnyBuilding
  }, [isPGAdmin, buildingId, can, permissions])

  if (!room) return null

  // Occupancy info to block deletion when room has any occupied beds
  const [occupiedInfo, setOccupiedInfo] = useState({ checked: false, count: 0, unknown: false })

  const fetchOccupiedInfo = async () => {
    if (!room?.id || !buildingId || typeof can !== 'function') {
      // Cannot verify occupancy without scope/permissions; block deletion
      setOccupiedInfo({ checked: true, count: 0, unknown: true })
      return null
    }
    try {
      const api = guarded(can, buildingId)
      const res = await api.getBeds({ room: room.id, page_size: 1000 })
      const arr = Array.isArray(res) ? res : (res?.results || [])
      const count = arr.filter(b => b.status === 'occupied').length
      setOccupiedInfo({ checked: true, count, unknown: false })
      return count
    } catch (e) {
      // If we cannot verify (e.g., permission denied), block deletion conservatively
      setOccupiedInfo({ checked: true, count: 0, unknown: true })
      return null
    }
  }

  const ensureNoOccupiedBeds = async (e) => {
    const res = occupiedInfo.checked ? (occupiedInfo.unknown ? null : occupiedInfo.count) : await fetchOccupiedInfo()
    if (res === null || (typeof res === 'number' && res > 0)) {
      e?.preventDefault?.()
      if (res === null || occupiedInfo.unknown) {
        addToast({ type: 'error', message: tr('rooms.toasts_delete_blocked_unknown_occupancy', 'Cannot delete room because occupancy cannot be verified.') })
      } else {
        addToast({ type: 'error', message: tr('rooms.toasts_delete_blocked_occupied_beds', 'Cannot delete room. {{count}} bed(s) are occupied.').replace('{{count}}', String(res)) })
      }
      return false
    }
    return true
  }

  const openConfirm = () => setConfirm({ open: true })
  const closeConfirm = () => setConfirm({ open: false })

  const performPermanentDelete = async () => {
    if (!room?.id) return
    setLoading(true)
    try {
      await deleteRoom(room.id)
      addToast({ message: tr('rooms.toasts.deleted_permanently', 'Room deleted permanently'), type: 'success' })
      onChanged && onChanged('delete', room)
    } catch (err) {
      addToast({ message: err?.response?.data?.detail || err.message || tr('rooms.toasts.delete_failed', 'Delete failed'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onConfirm = async (e) => {
    if (!e.shiftKey) {
      addToast({ message: tr('rooms.toasts.hold_shift_to_confirm', 'Hold Shift and click Delete to confirm permanent deletion'), type: 'error' })
      return
    }
    closeConfirm()
    await performPermanentDelete()
  }

  const label = room?.number || tr('rooms.room', 'Room')

  const blockedMsg = tr('buildings.inactive_actions_blocked', 'This building is inactive. Activate it to make changes.')

  return (
    <>
      <DropdownMenu onOpenChange={(open) => { if (open && !occupiedInfo.checked) { fetchOccupiedInfo() } }}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Actions">
            <FiMoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-1">
          <DropdownMenuItem className="p-0">
            <Tooltip content={buildingInactive ? blockedMsg : (!canEdit ? (buildingId ? tr('rooms.permissions.deny_edit', 'Permission denied: cannot edit rooms for this building.') : tr('rooms.permissions.reason_edit', "You don't have permission to edit rooms.")) : '')}>
              <span className="block">
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-2 py-2 text-left ${(!canEdit || buildingInactive) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={(e) => {
                    if (buildingInactive) {
                      e.preventDefault()
                      addToast({ type: 'error', message: blockedMsg })
                      return
                    }
                    if (!canEdit) {
                      e.preventDefault()
                      addToast({ type: 'warning', message: buildingId ? tr('rooms.permissions.deny_edit', 'Permission denied: cannot edit rooms for this building.') : tr('rooms.permissions.reason_edit', "You don't have permission to edit rooms.") })
                      return
                    }
                    onEdit && onEdit(room)
                  }}
                >
                  <FiEdit className="mr-2 h-4 w-4 text-gray-500" />
                  {tr('rooms.action_edit', 'Edit')}
                </Button>
              </span>
            </Tooltip>
          </DropdownMenuItem>
          <Tooltip content={buildingInactive
            ? blockedMsg
            : (!canDelete
              ? (buildingId ? tr('rooms.permissions.deny_delete', 'Permission denied: cannot delete rooms for this building.') : tr('rooms.permissions.reason_delete', "You don't have permission to delete rooms."))
              : (occupiedInfo.checked && (occupiedInfo.unknown
                  ? tr('rooms.tooltip_delete_blocked_unknown_occupancy', 'Cannot delete: occupancy cannot be verified for this room')
                  : (occupiedInfo.count > 0 ? tr('rooms.tooltip_delete_blocked_occupied_beds', 'Cannot delete: {{count}} occupied bed(s) in this room').replace('{{count}}', String(occupiedInfo.count)) : ''))))}>
            <span className="block">
              <DropdownMenuItem
                className={`group cursor-pointer hover:bg-red-50 text-red-600 focus:text-red-700 hover:text-red-700 ${(!canDelete || buildingInactive || (occupiedInfo.checked && (occupiedInfo.unknown || occupiedInfo.count > 0))) ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={loading}
                onSelect={async (e) => {
                  if (buildingInactive) {
                    e.preventDefault()
                    addToast({ type: 'error', message: blockedMsg })
                    return
                  }
                  if (!canDelete) {
                    e.preventDefault()
                    addToast({ type: 'warning', message: buildingId ? tr('rooms.permissions.deny_delete', 'Permission denied: cannot delete rooms for this building.') : tr('rooms.permissions.reason_delete', "You don't have permission to delete rooms.") })
                    return
                  }
                  const ok = await ensureNoOccupiedBeds(e)
                  if (!ok) return
                  openConfirm()
                }}
              >
                <FiTrash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-red-700" />
                {tr('rooms.action_delete_permanently', 'Delete Permanently')}
              </DropdownMenuItem>
            </span>
          </Tooltip>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        isOpen={confirm.open}
        onClose={closeConfirm}
        title={tr('rooms.confirm_delete_title', 'Delete Room')}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {tr('rooms.confirm_delete_message', `This will permanently delete "${label}". This action cannot be undone.`).replace('{{name}}', label)}
          </p>
          <p className="text-xs text-gray-500">
            {tr('rooms.confirm_delete_alt_inactive_hint', 'Tip: Instead of deleting, you can mark this room inactive from Edit.')}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeConfirm}>{tr('rooms.cancel', 'Cancel')}</Button>
            <Button
              className={'bg-red-50 text-red-700 hover:bg-red-100'}
              onClick={onConfirm}
            >
              {tr('rooms.delete_hold_shift', 'Delete (Hold Shift)')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default RoomActions