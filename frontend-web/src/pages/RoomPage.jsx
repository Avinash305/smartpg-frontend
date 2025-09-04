import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import { Button, PermissionButton } from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { FiHome, FiArrowLeft } from 'react-icons/fi'
import RoomForm from '../components/rooms/RoomForm'
import RoomsList from '../components/rooms/RoomsList'
import { useToast } from '../context/ToastContext'
import { useAuth, useCan } from '../context/AuthContext'
import { getFloor, getBuilding } from '../services/properties'
import { useColorScheme } from '../theme/colorSchemes'
import { useTranslation } from 'react-i18next'

const RoomPage = ({ floorId = null, embed = false }) => {
  const { t } = useTranslation()
  const tr = (k, f) => t(k, { defaultValue: f })
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selected, setSelected] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const { addToast } = useToast()
  const isAdmin = !!currentUser && (currentUser.role === 'pg_admin' || currentUser.is_superuser)
  const { can, permissions } = useCan()
  const scheme = useColorScheme('default')

  // Resolve building id if a specific floor is in context
  const [buildingId, setBuildingId] = useState(null)
  const [buildingInactive, setBuildingInactive] = useState(false)
  useEffect(() => {
    let cancelled = false
    const resolve = async () => {
      if (!floorId) { if (!cancelled) { setBuildingId(null); setBuildingInactive(false) } ; return }
      try {
        const floor = await getFloor(floorId)
        const bId = floor?.building ?? null
        if (!cancelled) setBuildingId(bId)
      } catch (_) {
        if (!cancelled) { setBuildingId(null); setBuildingInactive(false) }
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [floorId])

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
    if (floorId && buildingId) return can('rooms', 'add', buildingId)
    const hasGlobal = can('rooms', 'add', 'global')
    const hasAnyBuilding = Object.entries(permissions || {}).some(([k, v]) => (
      k !== 'global' && v && v.rooms && v.rooms.add === true
    ))
    return hasGlobal || hasAnyBuilding
  }, [isAdmin, floorId, buildingId, can, permissions])

  return (
    <div className="space-y-6">
      {/* Back button (only in full page, not embedded) */}
      {!embed && (
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 hover:border-gray-300">
            <FiArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-medium">{tr('buildings.back', 'Back')}</span>
          </button>
        </div>
      )}
      {/* Header */}
      <Card padding="sm" hoverEffect={false} className="rounded-lg ring-1 ring-gray-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-md flex items-center justify-center ${scheme.accents?.indigo?.bg || 'bg-indigo-50'} ${scheme.accents?.indigo?.text || 'text-indigo-600'}`}>
              <FiHome className="h-4 w-4" />
            </div>
            <h1 className="text-base sm:text-xl lg:text-2xl font-semibold text-gray-900 leading-snug truncate">{tr('rooms.titles.title', 'Rooms')}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <PermissionButton
              module="rooms"
              action="add"
              scopeId={(floorId && buildingId) ? buildingId : 'global'}
              reason={tr('rooms.permissions.reason_add', "You don't have permission to add rooms.")}
              denyMessage={tr('rooms.permissions.deny_add', 'Permission denied: cannot add rooms.')}
              blocked={!!buildingInactive}
              blockedReason={tr('buildings.inactive_actions_blocked', 'This building is inactive. Activate it to make changes.')}
              blockedDenyMessage={tr('buildings.inactive_actions_blocked', 'This building is inactive. Activate it to make changes.')}
              denyToastType="error"
              onClick={() => setShowForm(true)}
            >
              {tr('rooms.titles.add_room', 'Add Room')}
            </PermissionButton>
          </div>
        </div>
      </Card>

      {/* List of rooms with optional floor filter */}
      <RoomsList
        floorId={floorId || null}
        reloadKey={reloadKey}
        buildingInactive={buildingInactive}
        onEdit={(room) => {
          setSelected(room)
          setShowEdit(true)
        }}
      />

      {/* Add Room Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={tr('rooms.titles.add_room', 'Add Room')}
        maxWidth="lg"
      >
        <RoomForm
          mode="create"
          floorId={floorId}
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            setReloadKey((k) => k + 1)
            addToast({ message: tr('rooms.toasts.created_success', 'Room created successfully'), type: 'success' })
          }}
        />
      </Modal>

      {/* Edit Room Modal */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title={tr('rooms.titles.edit_room', 'Edit Room')}
        maxWidth="lg"
      >
        <RoomForm
          mode="edit"
          initialValues={selected || {}}
          floorId={floorId}
          onCancel={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            setSelected(null)
            setReloadKey((k) => k + 1)
            addToast({ message: tr('rooms.toasts.updated_success', 'Room updated successfully'), type: 'success' })
          }}
        />
      </Modal>
    </div>
  )
}

export default RoomPage