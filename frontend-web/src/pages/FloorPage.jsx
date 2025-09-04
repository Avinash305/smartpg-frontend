import React from 'react'
// import { Link } from 'react-router-dom'
import Card from '../components/ui/Card'
import { FiLayers } from 'react-icons/fi'
import FloorsList from '../components/floors/FloorsList'
import { Button } from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import FloorForm from '../components/floors/FloorForm'
import { useToast } from '../context/ToastContext'
import { useAuth, useCan } from '../context/AuthContext'
import Tooltip from '../components/ui/Tooltip'
import { useTranslation } from 'react-i18next'

const FloorPage = ({ buildingId = null, embed = false, buildingInactive = false }) => {
  const { currentUser } = useAuth()
  const [showForm, setShowForm] = React.useState(false)
  const [showEdit, setShowEdit] = React.useState(false)
  const [selected, setSelected] = React.useState(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const { addToast } = useToast()
  const isAdmin = !!currentUser && (currentUser.role === 'pg_admin' || currentUser.is_superuser)
  const { can, permissions } = useCan()
  const { t } = useTranslation()
  const canAdd = React.useMemo(() => {
    if (isAdmin) return true
    const hasGlobal = typeof can === 'function' && can('floors', 'add', 'global')
    const hasAnyBuilding = Object.entries(permissions || {}).some(([k, v]) => (
      k !== 'global' && v && v.floors && v.floors.add === true
    ))
    return hasGlobal || hasAnyBuilding
  }, [isAdmin, can, permissions])

  // If a specific building is in context, require permission for that scope
  const canAddForThis = React.useMemo(() => {
    if (isAdmin) return true
    if (buildingId && typeof can === 'function') {
      return !!can('floors', 'add', buildingId)
    }
    return canAdd
  }, [isAdmin, buildingId, can, canAdd])

  const noAddMsg = t('floors.permissions.reason_add')
  const inactiveMsg = t('buildings.inactive_actions_blocked') || 'This building is inactive. Activate it to make changes.'
  const blockedMsg = buildingInactive ? inactiveMsg : noAddMsg

  return ( 
    <div className="space-y-4">
      {/* Header */}
      <Card padding="sm" hoverEffect={false} className="rounded-lg ring-1 ring-gray-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FiLayers className="h-4 w-4" />
            </div>
            <h1 className="text-base sm:text-xl lg:text-2xl font-semibold text-gray-900 leading-snug truncate">{t('floors.floors')}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Tooltip content={(!canAddForThis || buildingInactive) ? blockedMsg : ''}>
              <span className="inline-flex">
                <Button
                  onClick={(e) => {
                    if (!canAddForThis || buildingInactive) {
                      e.preventDefault()
                      addToast({ type: 'error', message: blockedMsg })
                      return
                    }
                    setShowForm(true)
                  }}
                  className={(!canAddForThis || buildingInactive) ? 'opacity-60 cursor-not-allowed' : ''}
                >
                  {t('floors.buttons.create_floor')}
                </Button>
              </span>
            </Tooltip>
          </div>
        </div>
      </Card>

      {/* Floors List */}
      <FloorsList
        buildingId={buildingId}
        reloadKey={reloadKey}
        onEdit={(floor) => {
          if (buildingInactive) {
            addToast({ type: 'error', message: inactiveMsg })
            return
          }
          setSelected(floor)
          setShowEdit(true)
        }}
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={t('floors.titles.add_floor')}
        maxWidth="lg"
      >
        <FloorForm
          mode="create"
          buildingId={buildingId}
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            setReloadKey((k) => k + 1)
            addToast({ message: t('floors.toasts.created_success'), type: 'success' })
          }}
        />
      </Modal>

      {/* Edit Floor Modal */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title={t('floors.titles.edit_floor')}
        maxWidth="lg"
      >
        <FloorForm
          mode="edit"
          initialValues={selected || {}}
          buildingId={buildingId}
          onCancel={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            setSelected(null)
            setReloadKey((k) => k + 1)
            addToast({ message: t('floors.toasts.updated_success'), type: 'success' })
          }}
        />
      </Modal>
    </div>
  )
}

export default FloorPage