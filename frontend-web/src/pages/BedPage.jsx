import React, { useEffect, useMemo, useState } from 'react'
import Card from '../components/ui/Card'
import { Button, PermissionButton } from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { FiGrid } from 'react-icons/fi'
import BedForm from '../components/beds/BedForm'
import BedsList from '../components/beds/BedsList'
import { useToast } from '../context/ToastContext'
import { useAuth, useCan } from '../context/AuthContext'
import { getRoom, getFloor, getBuilding } from '../services/properties'
import { useColorScheme } from '../theme/colorSchemes'
import { useTranslation } from 'react-i18next'

const BedPage = ({ roomId = null, embed = false }) => {
  const { currentUser } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editingBed, setEditingBed] = useState(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const { addToast } = useToast()
  const { can, permissions } = useCan()
  const isAdmin = !!currentUser && (currentUser.role === 'pg_admin' || currentUser.is_superuser)
  const scheme = useColorScheme('default')
  const { t } = useTranslation()
  const tr = (k, f, opt) => t(k, { defaultValue: f, ...(opt || {}) })

  // Resolve building id when a specific room context is provided
  const [buildingId, setBuildingId] = useState(null)
  const [buildingInactive, setBuildingInactive] = useState(false)
  useEffect(() => {
    let cancelled = false
    const resolve = async () => {
      if (!roomId) { if (!cancelled) { setBuildingId(null); setBuildingInactive(false) } ; return }
      try {
        const room = await getRoom(roomId)
        const floorId = (room && (typeof room.floor === 'object' ? room.floor?.id : room.floor)) || null
        if (!floorId) { if (!cancelled) { setBuildingId(null); setBuildingInactive(false) } ; return }
        const floor = await getFloor(floorId)
        const bId = floor?.building ?? null
        if (!cancelled) setBuildingId(bId)
      } catch (_) {
        if (!cancelled) { setBuildingId(null); setBuildingInactive(false) }
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [roomId])

  // Fetch building active state when we know the building id
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!buildingId) { if (!cancelled) setBuildingInactive(false); return }
      try {
        const b = await getBuilding(buildingId)
        if (!cancelled) setBuildingInactive(!(b?.is_active))
      } catch (_) {
        if (!cancelled) setBuildingInactive(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [buildingId])

  const canAdd = useMemo(() => {
    if (isAdmin) return true
    if (roomId && buildingId) return can('beds', 'add', buildingId)
    const hasGlobal = can('beds', 'add', 'global')
    const hasAnyBuilding = Object.entries(permissions || {}).some(([k, v]) => (
      k !== 'global' && v && v.beds && v.beds.add === true
    ))
    return hasGlobal || hasAnyBuilding
  }, [isAdmin, roomId, buildingId, can, permissions])

  const refresh = () => setRefreshToken((t) => t + 1)

  return (
    <div className="space-y-6">

      {/* Header */} 
      <Card padding="sm" hoverEffect={false} className="rounded-lg ring-1 ring-gray-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-md flex items-center justify-center ${scheme.accents?.indigo?.bg || 'bg-indigo-50'} ${scheme.accents?.indigo?.text || 'text-indigo-600'}`}>
              <FiGrid className="h-4 w-4" />
            </div>
            <h1 className="text-base sm:text-xl lg:text-2xl font-semibold text-gray-900 leading-snug truncate">{tr('beds.title', 'Beds')}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <PermissionButton
              module="beds"
              action="add"
              scopeId={(roomId && buildingId) ? buildingId : 'global'}
              reason={roomId ? tr('permissions.no_add_beds_building', "You don't have permission to add beds for this building.") : tr('permissions.no_add_beds', "You don't have permission to add beds.")}
              denyMessage={roomId ? tr('permissions.deny_add_beds_building', 'Permission denied: cannot add beds for this building.') : tr('permissions.deny_add_beds', 'Permission denied: cannot add beds.')}
              blocked={!!buildingInactive}
              blockedReason={tr('buildings.inactive_actions_blocked', 'This building is inactive. Activate it to make changes.')}
              blockedDenyMessage={tr('buildings.inactive_actions_blocked', 'This building is inactive. Activate it to make changes.')}
              denyToastType="error"
              onClick={() => setShowForm(true)}
            >
              {tr('beds.actions.add_bed', 'Add Bed')}
            </PermissionButton>
          </div>
        </div>
      </Card>

      {/* Beds List */}
      <BedsList
        roomId={roomId}
        refreshToken={refreshToken}
        buildingInactive={buildingInactive}
        onEdit={(bed) => setEditingBed(bed)}
      />

      {/* Add Bed Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={tr('beds.actions.add_bed', 'Add Bed')}
        maxWidth="lg"
      >
        <BedForm
          mode="create"
          roomId={roomId}
          onCancel={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refresh(); addToast({ message: tr('beds.toasts.created', 'Bed created successfully'), type: 'success' }) }}
        />
      </Modal>

      {/* Edit Bed Modal */}
      <Modal
        isOpen={!!editingBed}
        onClose={() => setEditingBed(null)}
        title={tr('beds.actions.edit_bed', 'Edit Bed')}
        maxWidth="lg"
      >
        {editingBed && (
          <BedForm
            mode="edit"
            initialValues={editingBed}
            roomId={roomId || editingBed.room}
            onCancel={() => setEditingBed(null)}
            onSaved={() => { setEditingBed(null); refresh(); addToast({ message: tr('beds.toasts.updated', 'Bed updated successfully'), type: 'success' }) }}
          />
        )}
      </Modal>
    </div>
  )
}

export default BedPage