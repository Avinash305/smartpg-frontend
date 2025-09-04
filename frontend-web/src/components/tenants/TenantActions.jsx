import React, { useState } from 'react'
import { Button, PermissionButton } from '../ui/Button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator } from '../ui/DropdownMenu'
import { FiMoreVertical, FiEdit, FiArchive, FiTrash2 } from 'react-icons/fi'
import Modal from '../ui/Modal'
import { useToast, emitToast } from '../../context/ToastContext'
import { patchTenant, deleteTenant } from '../../services/tenants'
import { useCan } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

const TenantActions = ({ tenant, onEdit, onChanged }) => {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, type: null })
  const { can, isPGAdmin } = useCan()
  const { t } = useTranslation()
  const tr = (key, fallback, opt) => t(key, { defaultValue: fallback, ...(opt || {}) })

  if (!tenant) return null

  const openConfirm = (type) => setConfirm({ open: true, type })
  const closeConfirm = () => setConfirm({ open: false, type: null })

  const performSoftDelete = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      await patchTenant(tenant.id, { is_active: false })
      addToast({ message: tr('tenants.toasts.marked_inactive', 'Tenant marked inactive'), type: 'success' })
      onChanged && onChanged('soft_delete', tenant)
    } catch (err) {
      addToast({ message: err?.response?.data?.detail || err.message || tr('tenants.errors.soft_delete_failed', 'Soft delete failed'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const performPermanentDelete = async () => {
    if (!tenant?.id) return
    setLoading(true)
    try {
      await deleteTenant(tenant.id)
      addToast({ message: tr('tenants.toasts.deleted_permanently', 'Tenant deleted permanently'), type: 'success' })
      onChanged && onChanged('delete', tenant)
    } catch (err) {
      addToast({ message: err?.response?.data?.detail || err.message || tr('tenants.errors.delete_failed', 'Delete failed'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onConfirm = async (e) => {
    const type = confirm.type
    if (type === 'delete' && !e.shiftKey) {
      addToast({ message: tr('tenants.errors.hold_shift_delete', 'Hold Shift and click Delete to confirm permanent deletion'), type: 'error' })
      return
    }
    closeConfirm()
    if (type === 'soft') await performSoftDelete()
    if (type === 'delete') await performPermanentDelete()
  }

  const label = tenant?.full_name || tr('tenants.tenant_id_label', 'Tenant #{{id}}', { id: tenant?.id })
  const buildingId = tenant?.building_id || (typeof tenant?.building === 'number' ? tenant.building : null)
  const canEdit = isPGAdmin || (buildingId != null ? can('tenants', 'edit', buildingId) : can('tenants', 'edit', 'global'))
  const canDelete = isPGAdmin || (buildingId != null ? can('tenants', 'delete', buildingId) : can('tenants', 'delete', 'global'))
  const denyEdit = () => emitToast({ type: 'warning', message: tr('tenants.permission_edit_deny', "You don't have permission to edit tenants for this building.") })
  const denyDelete = () => emitToast({ type: 'warning', message: tr('tenants.permission_delete_deny', "You don't have permission to delete tenants for this building.") })

  // Booking status option for this tenant
  const [activeBooking, setActiveBooking] = useState(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const canEditBooking = isPGAdmin || (buildingId != null ? can('bookings', 'edit', buildingId) : can('bookings', 'edit', 'global'))
  const scopeId = buildingId != null ? String(buildingId) : 'global'
  const buildingSuffix = scopeId && scopeId !== 'global' ? ` for building ${scopeId}` : ''

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
  const formatStatusLabel = (s) => {
    const v = String(s || '-').replace(/_/g, ' ')
    return v.charAt(0).toUpperCase() + v.slice(1)
  }
  const computeAllowedStatuses = (current) => {
    return String(current) === 'confirmed' ? ['canceled', 'checked_out'] : ['pending', 'reserved', 'confirmed', 'canceled']
  }
  const loadActiveBooking = async () => {
    if (!tenant?.id) { setActiveBooking(null); return }
    setBookingLoading(true)
    try {
      const res = await api.get('/bookings/bookings/', { params: { tenant: tenant.id, page_size: 50, ordering: '-start_date' } })
      const items = Array.isArray(res.data) ? res.data : (res.data?.results || [])
      const today = new Date(); const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const candidates = items.filter(b => {
        const st = b?.status
        if (!['pending', 'reserved', 'confirmed'].includes(st)) return false
        if (b?.end_date) { const end = new Date(b.end_date); if (!isNaN(end) && end < midnight) return false }
        return true
      })
      setActiveBooking(candidates[0] || null)
    } catch (_) {
      setActiveBooking(null)
    } finally {
      setBookingLoading(false)
    }
  }
  const doUpdateBookingStatus = async (newStatus) => {
    if (!activeBooking?.id) return
    setStatusLoading(true)
    try {
      if (!canEditBooking) {
        addToast({ message: tr('bookings.permissions.update_status_deny', "You don't have permission to update booking status{{suffix}}.", { suffix: buildingSuffix }), type: 'warning' })
        return
      }
      const current = String(activeBooking.status || '')
      const allowed = computeAllowedStatuses(current)
      if (!allowed.includes(newStatus)) {
        addToast({ message: tr('bookings.status.transition_denied_after_confirmed', "Cannot change from {{from}} to {{to}}. Only 'Canceled' or 'Checked Out' is allowed after Confirmed.", { from: formatStatusLabel(current), to: formatStatusLabel(newStatus) }), type: 'warning' })
        return
      }
      await api.patch(`/bookings/bookings/${activeBooking.id}/`, { status: newStatus })
      setActiveBooking({ ...activeBooking, status: newStatus })
      onChanged && onChanged('booking_status_changed', tenant)
      addToast({ message: tr('bookings.toasts.status_updated', 'Booking status updated to {{status}}', { status: formatStatusLabel(newStatus) }), type: 'success' })
    } catch (err) {
      const msg = err?.response?.data ?
        (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)) :
        (err?.message || 'Failed to update status')
      addToast({ message: msg, type: 'error' })
    } finally {
      setStatusLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu onOpenChange={(open) => { if (open) loadActiveBooking() }}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={tr('tenants.actions', 'Actions')}>
            <FiMoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Booking Status submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              className={`group cursor-pointer ${!activeBooking ? 'opacity-60 cursor-not-allowed' : ''}`}
              title={!activeBooking ? tr('bookings.status.no_active_found', 'No active booking found') : ''}
            >
              <span className="inline-flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${getStatusDotClass(activeBooking?.status)}`} />
                {tr('bookings.status.menu_label', 'Booking Status')}: {' '}
                <span className="font-medium">
                  {bookingLoading ? tr('common.loading', 'Loading...') : (activeBooking ? formatStatusLabel(activeBooking.status) : tr('bookings.status.none', 'None'))}
                </span>
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {activeBooking ? (
                <DropdownMenuRadioGroup
                  value={String(activeBooking.status || '')}
                  onValueChange={(val) => {
                    if (!val || val === activeBooking.status) return
                    if (!canEditBooking) {
                      addToast({ message: tr('bookings.permissions.update_status_deny', "You don't have permission to update booking status{{suffix}}.", { suffix: buildingSuffix }), type: 'warning' })
                      return
                    }
                    doUpdateBookingStatus(val)
                  }}
                >
                  {computeAllowedStatuses(String(activeBooking.status || '')).map((key) => {
                    const fallback = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
                    const label = tr(`bookings.status.options.${key}`, fallback)
                    return (
                      <DropdownMenuRadioItem
                        key={key}
                        value={key}
                        className={`cursor-pointer ${!canEditBooking || statusLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                        onClick={(e) => {
                          if (!canEditBooking || statusLoading) {
                            e.preventDefault()
                            e.stopPropagation()
                          }
                        }}
                      >
                        <span className={`h-2 w-2 rounded-full ${getStatusDotClass(key)}`} />
                        {label}
                      </DropdownMenuRadioItem>
                    )
                  })}
                </DropdownMenuRadioGroup>
              ) : (
                <div className="px-3 py-2 text-xs text-gray-500">{bookingLoading ? tr('common.loading', 'Loading...') : tr('bookings.status.no_active', 'No active booking')}</div>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="group cursor-pointer hover:bg-gray-50"
            onSelect={(e) => {
              if (!canEdit) { e.preventDefault(); denyEdit(); return }
              onEdit && onEdit(tenant)
            }}
          >
            <FiEdit className="mr-2 h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            {tr('tenants.edit', 'Edit')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="group cursor-pointer hover:bg-gray-50"
            disabled={loading || tenant.is_active === false}
            onSelect={(e) => { if (!canDelete) { e.preventDefault(); denyDelete(); return } openConfirm('soft') }}
          >
            <FiArchive className="mr-2 h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            {tenant.is_active === false ? tr('tenants.inactive_soft_deleted', 'Inactive (Soft Deleted)') : tr('tenants.soft_delete', 'Soft Delete')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="group cursor-pointer hover:bg-red-50 text-red-600 focus:text-red-700 hover:text-red-700"
            disabled={loading}
            onSelect={(e) => { if (!canDelete) { e.preventDefault(); denyDelete(); return } openConfirm('delete') }}
          >
            <FiTrash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-red-700" />
            {tr('tenants.delete_permanently', 'Delete Permanently')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        isOpen={confirm.open}
        onClose={closeConfirm}
        title={confirm.type === 'delete' ? tr('tenants.modals.delete_title', 'Delete Tenant') : tr('tenants.modals.soft_delete_title', 'Soft Delete Tenant')}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {confirm.type === 'delete'
              ? tr('tenants.modals.delete_description', 'This will permanently delete "{{label}}". This action cannot be undone.', { label })
              : tr('tenants.modals.soft_delete_description', 'Mark "{{label}}" as inactive? You can restore it later by setting Active to true.', { label })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeConfirm}>{tr('common.cancel', 'Cancel')}</Button>
            <PermissionButton
              module="tenants"
              action="delete"
              scopeId={buildingId || 'global'}
              variant={confirm.type === 'delete' ? 'destructive' : 'primary'}
              denyMessage={tr('tenants.permission_delete_deny', 'You do not have permission to delete tenants for this building.')}
              onClick={onConfirm}
            >
              {confirm.type === 'delete' ? tr('tenants.delete_confirm_shift', 'Delete (Hold Shift)') : tr('tenants.soft_delete_confirm', 'Soft Delete')}
            </PermissionButton>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default TenantActions