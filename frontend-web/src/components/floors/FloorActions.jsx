import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/DropdownMenu'
import { FiMoreVertical, FiEdit, FiTrash2 } from 'react-icons/fi'
import Modal from '../ui/Modal'
import { useToast } from '../../context/ToastContext'
import { deleteFloor, guarded } from '../../services/properties'
import { useCan } from '../../context/AuthContext'
import Tooltip from '../ui/Tooltip'
import { useTranslation } from 'react-i18next'

// Helper to render human-friendly floor labels
const toFloorLabel = (n, t) => {
  const num = Number(n)
  if (Number.isNaN(num)) return t('floors.floor')
  if (num === 0) return t('floors.floor_label_ground')
  const s = ['th','st','nd','rd']
  const v = num % 100
  return `${num}${s[(v - 20) % 10] || s[v] || s[0]} ${t('floors.floor_label_suffix')}`
}

const FloorActions = ({ floor, onEdit, onChanged }) => {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState({ open: false })
  const { can, isPGAdmin } = useCan()
  const { t } = useTranslation()

  // Track occupied rooms info to block deletions
  const [occupiedInfo, setOccupiedInfo] = useState({ checked: false, count: 0, unknown: false })

  const buildingId = (() => {
    const b = floor?.building
    if (typeof b === 'number') return b
    if (b && typeof b === 'object' && 'id' in b) return Number(b.id)
    if (floor?.building_id) return Number(floor.building_id)
    return null
  })()

  const canEdit = isPGAdmin || can('floors', 'edit', buildingId || 'global')
  const canDelete = isPGAdmin || can('floors', 'delete', buildingId || 'global')

  // Prefetch occupancy when the menu opens so tooltip can show reason
  const fetchOccupiedInfo = async () => {
    if (!floor?.id || !buildingId || typeof can !== 'function') return 0
    try {
      const api = guarded(can, buildingId)
      const res = await api.getBeds({ floor: floor.id, page_size: 1000 })
      const arr = Array.isArray(res) ? res : (res?.results || [])
      const roomIds = arr
        .filter(b => b.status === 'occupied' && b.room)
        .map(b => (typeof b.room === 'object' ? b.room.id : b.room))
        .filter(id => id != null)
      const count = new Set(roomIds).size
      setOccupiedInfo({ checked: true, count, unknown: false })
      return count
    } catch (e) {
      // If we cannot verify (e.g., permission denied), block deletion conservatively
      setOccupiedInfo({ checked: true, count: 0, unknown: true })
      return null
    }
  }

  const ensureNoOccupiedRooms = async (e) => {
    const res = occupiedInfo.checked ? (occupiedInfo.unknown ? null : occupiedInfo.count) : await fetchOccupiedInfo()
    if (res === null || (typeof res === 'number' && res > 0)) {
      e?.preventDefault?.()
      if (res === null || occupiedInfo.unknown) {
        addToast({ type: 'error', message: t('floors.toasts_delete_blocked_unknown_occupancy') })
      } else {
        addToast({ type: 'error', message: t('floors.toasts_delete_blocked_occupied_rooms', { count: res }) })
      }
      return false
    }
    return true
  }

  const openConfirm = () => setConfirm({ open: true })
  const closeConfirm = () => setConfirm({ open: false })

  const performPermanentDelete = async () => {
    if (!floor?.id) return
    setLoading(true)
    try {
      await deleteFloor(floor.id)
      addToast({ message: t('floors.toasts_deleted_permanently'), type: 'success' })
      onChanged && onChanged('delete', floor)
    } catch (err) {
      addToast({ message: err?.response?.data?.detail || err.message || t('floors.toasts_delete_failed'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onConfirm = async (e) => {
    // Require holding Shift for permanent delete
    if (!e.shiftKey) {
      addToast({ message: t('floors.toasts_hold_shift_to_confirm'), type: 'error' })
      return
    }
    closeConfirm()
    await performPermanentDelete()
  }

  const label = toFloorLabel(floor?.number, t)
  const noEditMsg = t('floors.permissions.deny_edit')
  const noDeleteMsg = t('floors.permissions.deny_delete')

  return (
    <>
      <DropdownMenu onOpenChange={(open) => { if (open && !occupiedInfo.checked) { fetchOccupiedInfo() } }}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('floors.actions')}>
            <FiMoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-1">
          <Tooltip content={!canEdit ? noEditMsg : ''}>
            <span className="block">
              <DropdownMenuItem
                className={`w-full justify-start gap-2 ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                onSelect={(e) => {
                  if (!canEdit) {
                    e.preventDefault()
                    addToast({ type: 'warning', message: noEditMsg })
                    return
                  }
                  onEdit && onEdit(floor)
                }}
              >
                <FiEdit className="h-4 w-4 text-gray-500" />
                {t('floors.action_edit')}
              </DropdownMenuItem>
            </span>
          </Tooltip>
          <Tooltip content={!canDelete ? noDeleteMsg : (occupiedInfo.checked && (occupiedInfo.unknown ? t('floors.tooltip_delete_blocked_unknown_occupancy') : (occupiedInfo.count > 0 ? t('floors.tooltip_delete_blocked_occupied_rooms', { count: occupiedInfo.count }) : '')))}>
            <span className="block">
              <DropdownMenuItem
                className={`w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 ${(!canDelete || (occupiedInfo.checked && (occupiedInfo.unknown || occupiedInfo.count > 0))) ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={loading}
                onSelect={async (e) => {
                  if (!canDelete) {
                    e.preventDefault()
                    addToast({ type: 'warning', message: noDeleteMsg })
                    return
                  }
                  const ok = await ensureNoOccupiedRooms(e)
                  if (!ok) return
                  openConfirm()
                }}
              >
                <FiTrash2 className="h-4 w-4 text-red-600" />
                {t('floors.action_delete_permanently')}
              </DropdownMenuItem>
            </span>
          </Tooltip>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        isOpen={confirm.open}
        onClose={closeConfirm}
        title={t('floors.confirm_delete_title')}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {t('floors.confirm_delete_message', { name: label })}
          </p>
          <p className="text-xs text-gray-500">
            {t('floors.confirm_delete_alt_inactive_hint')}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeConfirm}>{t('floors.cancel')}</Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={loading}
            >
              {t('floors.delete_hold_shift')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default FloorActions