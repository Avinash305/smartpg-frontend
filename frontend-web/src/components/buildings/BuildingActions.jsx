import React, { useEffect, useState } from 'react'
import { Button, PermissionButton } from '../ui/Button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/DropdownMenu'
import { FiMoreVertical, FiEdit, FiArchive, FiTrash2, FiCheckCircle } from 'react-icons/fi'
import Modal from '../ui/Modal'
import { useToast } from '../../context/ToastContext'
import { patchBuilding, deleteBuilding, getBuildings } from '../../services/properties'
import { useAuth } from '../../context/AuthContext'
import { useCan } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'

const BuildingActions = ({ building, onEdit, onChanged, activeCount: activeCountProp, maxBuildings: maxBuildingsProp }) => {
  const { currentUser, getPlanLimit } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, type: null })
  const { can } = useCan()
  const { t } = useTranslation()
  const isAdmin = !!currentUser && (currentUser.role === 'pg_admin' || currentUser.is_superuser)
  const canEdit = isAdmin || can('buildings', 'edit', building?.id || 'global')
  const canDelete = isAdmin || can('buildings', 'delete', building?.id || 'global')
  const inactive = !!building && building.is_active === false
  const inactiveMsg = t('buildings.inactive_actions_blocked') || 'This building is inactive. Activate it to make changes.'
  const [activeCount, setActiveCount] = useState(typeof activeCountProp === 'number' ? activeCountProp : 0)
  const maxBuildings = (
    typeof maxBuildingsProp === 'number'
      ? maxBuildingsProp
      : (() => { try { return getPlanLimit?.('max_buildings', Infinity) ?? Infinity } catch { return Infinity } })()
  )

  useEffect(() => {
    // If parent provided activeCount, keep it in sync; otherwise fetch once.
    if (typeof activeCountProp === 'number') {
      setActiveCount(activeCountProp)
      return
    }
    let mounted = true
    ;(async () => {
      try {
        const list = await getBuildings({ page_size: 1000 })
        if (!mounted) return
        const count = Array.isArray(list) ? list.filter(b => b?.is_active).length : 0
        setActiveCount(count)
      } catch (_) { /* ignore */ }
    })()
    return () => { mounted = false }
  }, [activeCountProp])

  const canActivateNow = (!!building && building.is_active === false && activeCount < maxBuildings)
  const isLastActive = (!!building && building.is_active === true && activeCount <= 1)

  if (!building) return null
  // If user cannot do any action, hide the menu
  if (!canEdit && !canDelete) return null

  const openConfirm = (type) => setConfirm({ open: true, type })
  const closeConfirm = () => setConfirm({ open: false, type: null })

  const performSoftDelete = async () => {
    if (!building?.id) return
    setLoading(true)
    try {
      await patchBuilding(building.id, { is_active: false })
      addToast({ message: t('buildings.toasts_marked_inactive'), type: 'success' })
      onChanged && onChanged('soft_delete', building)
      setActiveCount(c => Math.max(0, c - 1))
    } catch (err) {
      addToast({ message: err?.response?.data?.detail || err.message || t('buildings.toasts_soft_delete_failed'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const performReactivate = async () => {
    if (!building?.id) return
    setLoading(true)
    try {
      await patchBuilding(building.id, { is_active: true })
      addToast({ message: 'Building marked active', type: 'success' })
      onChanged && onChanged('activate', building)
      setActiveCount(c => c + 1)
    } catch (err) {
      const data = err?.response?.data
      let msg = data?.detail
      if (!msg && typeof data === 'object' && data) {
        const parts = []
        if (Array.isArray(data?.non_field_errors)) parts.push(data.non_field_errors.join(' '))
        if (typeof data?.is_active === 'string') parts.push(data.is_active)
        if (Array.isArray(data?.is_active)) parts.push(data.is_active.join(' '))
        if (parts.length) msg = parts.join(' ')
      }
      if (!msg) msg = err.message || 'Failed to activate building'
      addToast({ message: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const performPermanentDelete = async () => {
    if (!building?.id) return
    setLoading(true)
    try {
      await deleteBuilding(building.id)
      addToast({ message: t('buildings.toasts_deleted_permanently'), type: 'success' })
      onChanged && onChanged('delete', building)
    } catch (err) {
      addToast({ message: err?.response?.data?.detail || err.message || t('buildings.toasts_delete_failed'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onConfirm = async (e) => {
    const type = confirm.type
    // Require holding Shift for permanent delete
    if (type === 'delete' && !e.shiftKey) {
      addToast({ message: t('buildings.toasts_hold_shift_to_confirm'), type: 'error' })
      return
    }
    closeConfirm()
    if (type === 'soft') await performSoftDelete()
    if (type === 'activate') await performReactivate()
    if (type === 'delete') await performPermanentDelete()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('buildings.actions')}>
            <FiMoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {canEdit && (
            <DropdownMenuItem
              className={`group hover:bg-gray-50 ${inactive ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              title={inactive ? inactiveMsg : undefined}
              onSelect={(e) => {
                if (inactive) {
                  e.preventDefault()
                  addToast({ type: 'warning', message: inactiveMsg })
                  return
                }
                onEdit && onEdit(building)
              }}
            >
              <FiEdit className="mr-2 h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              {t('buildings.action_edit')}
            </DropdownMenuItem>
          )}
          {canEdit && !building.is_active && (
            <DropdownMenuItem
              className="group cursor-pointer hover:bg-gray-50"
              disabled={loading || !canActivateNow}
              title={!canActivateNow ? 'Cannot activate: plan limit reached' : undefined}
              onSelect={() => { openConfirm('activate') }}
            >
              <FiCheckCircle className="mr-2 h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              {canActivateNow ? 'Activate' : 'Activate (limit reached)'}
            </DropdownMenuItem>
          )}
          {canEdit && (
            <DropdownMenuItem
              className={`group hover:bg-gray-50 ${inactive ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={loading || isLastActive}
              title={inactive ? inactiveMsg : (isLastActive ? 'Cannot deactivate the last active building' : undefined)}
              onSelect={(e) => {
                if (inactive) {
                  e.preventDefault()
                  addToast({ type: 'warning', message: inactiveMsg })
                  return
                }
                openConfirm('soft')
              }}
            >
              <FiArchive className="mr-2 h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              {building.is_active === false ? t('buildings.action_inactive_soft_deleted') : (isLastActive ? 'Deactivate (last active)' : t('buildings.action_soft_delete'))}
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              className={`group hover:bg-red-50 ${inactive ? 'opacity-60 cursor-not-allowed text-red-400' : 'text-red-600 focus:text-red-700 hover:text-red-700'}`}
              disabled={loading}
              title={inactive ? inactiveMsg : undefined}
              onSelect={(e) => {
                if (inactive) {
                  e.preventDefault()
                  addToast({ type: 'warning', message: inactiveMsg })
                  return
                }
                openConfirm('delete')
              }}
            >
              <FiTrash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-red-700" />
              {t('buildings.action_delete_permanently')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        isOpen={confirm.open}
        onClose={closeConfirm}
        title={confirm.type === 'delete' ? t('buildings.confirm_delete_title') : (confirm.type === 'soft' ? t('buildings.confirm_soft_delete_title') : 'Confirm Activate')}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {confirm.type === 'delete'
              ? t('buildings.confirm_delete_message', { name: building?.name })
              : (confirm.type === 'soft'
                  ? t('buildings.confirm_soft_delete_message', { name: building?.name })
                  : `Activate building "${building?.name || ''}"?`)}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeConfirm}>{t('buildings.cancel')}</Button>
            {confirm.type === 'soft' ? (
              <PermissionButton
                module="buildings"
                action="edit"
                scopeId={building?.id || 'global'}
                denyMessage={t('buildings.permission_edit_deny')}
                onClick={onConfirm}
              >
                {t('buildings.soft_delete')}
              </PermissionButton>
            ) : confirm.type === 'activate' ? (
              <PermissionButton
                module="buildings"
                action="edit"
                scopeId={building?.id || 'global'}
                denyMessage={t('buildings.permission_edit_deny')}
                onClick={onConfirm}
              >
                Activate
              </PermissionButton>
            ) : (
              <PermissionButton
                module="buildings"
                action="delete"
                scopeId={building?.id || 'global'}
                denyMessage={t('buildings.permission_delete_deny')}
                onClick={onConfirm}
              >
                {t('buildings.delete_hold_shift')}
              </PermissionButton>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}

export default BuildingActions