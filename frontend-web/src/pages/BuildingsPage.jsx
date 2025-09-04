import React, { useEffect, useMemo, useState } from 'react'
import { getBuildings } from '../services/properties'
import BuildingForm from '../components/buildings/BuildingForm'
import { Button } from '../components/ui/Button'
import BuildingsList from '../components/buildings/BuildingsList'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { useCan } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { useToast } from '../context/ToastContext'
import Tooltip from '../components/ui/Tooltip'

const BuildingsPage = () => {
  const { currentUser, getPlanLimit } = useAuth()
  const { can } = useCan()
  const { t } = useTranslation()
  const { addToast } = useToast()
  const isAdmin = !!currentUser && (currentUser.role === 'pg_admin' || currentUser.is_superuser)

  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState('create') // 'create' | 'edit'
  const [selectedBuilding, setSelectedBuilding] = useState(null)

  const fetchBuildings = () => {
    setLoading(true)
    getBuildings({ page_size: 1000 })
      .then(data => setBuildings(data))
      .catch(err => setError(err?.response?.data?.detail || err.message || t('buildings.load_failed')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchBuildings()
  }, [])

  // Plan limit gating for Add button
  const activeCount = useMemo(() => buildings.filter(b => b?.is_active).length, [buildings])
  const maxBuildings = useMemo(() => {
    try { return getPlanLimit?.('max_buildings', Infinity) ?? Infinity } catch { return Infinity }
  }, [getPlanLimit])
  const planLimitReached = Number.isFinite(maxBuildings) && activeCount >= maxBuildings
  const canAdd = can('buildings', 'add', 'global')
  const addDisabled = canAdd && planLimitReached
  const addReason = planLimitReached
    ? (t('buildings.plan_limit_reached_cannot_add', { max: maxBuildings }) || `Your plan allows up to ${maxBuildings} active buildings. Deactivate one or upgrade to add more.`)
    : ''

  if (loading) return <div className="p-4">{t('buildings.loading')}</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h1 className="text-lg sm:text-xl font-semibold">{t('buildings.title')}</h1>
        {canAdd ? (
          addDisabled ? (
            <Tooltip content={addReason} position="top" zIndex={Number.MAX_SAFE_INTEGER}>
              <Button
                type="button"
                variant="primary"
                className="opacity-50 cursor-not-allowed"
                onClick={(e) => {
                  e.preventDefault();
                  addToast({ type: 'warning', message: addReason })
                }}
              >
                {t('buildings.add_building')}
              </Button>
            </Tooltip>
          ) : (
            <Button onClick={() => { setFormMode('create'); setSelectedBuilding(null); setShowForm(true) }}>
              {t('buildings.add_building')}
            </Button>
          )
        ) : null}
      </div>


      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={formMode === 'edit' ? t('buildings.edit_building_title', { name: selectedBuilding?.name }) : t('buildings.add_building')}
        maxWidth="lg"
      >
        <BuildingForm
          mode={formMode}
          initialValues={formMode === 'edit' ? selectedBuilding : null}
          onCancel={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchBuildings() }}
        />
      </Modal>

      {buildings.length === 0 ? (
        <div className="text-gray-600">{t('buildings.no_buildings')}</div>
      ) : (
        <BuildingsList
          onEdit={(row) => {
            setFormMode('edit')
            setSelectedBuilding(row)
            setShowForm(true)
          }}
        />
      )}
    </div>
  )
}

export default BuildingsPage