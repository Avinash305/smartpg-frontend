import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getBuilding } from '../../services/properties'
import LoadingSpinner from '../ui/LoadingSpinner'
import Card from '../ui/Card'
// Button removed (unused)
import { FiHome, FiMapPin, FiHash, FiCheckCircle, FiXCircle, FiUser, FiCalendar, FiExternalLink, FiGrid, FiLayers, FiBox, FiArrowLeft } from 'react-icons/fi'
import { useToast } from '../../context/ToastContext'
import Modal from '../ui/Modal'
import BuildingForm from './BuildingForm'
import BuildingStats from './BuildingStats'
import FloorPage from '../../pages/FloorPage'
import BuildingActions from './BuildingActions'
import { useCan } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '../../utils/dateUtils'

const BuildingDetails = ({ onEdit }) => {
  const { id } = useParams()
  const [building, setBuilding] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const { can } = useCan()
  const { t } = useTranslation()

  // Using shared dateUtils.formatDateTime for timezone- and locale-aware display

  useEffect(() => {
    setLoading(true)
    // Permission: buildings:view scoped to this building id
    if (!can('buildings', 'view', id)) {
      setBuilding(null)
      const msg = t('buildings.permission_denied')
      setError(msg)
      addToast({ type: 'warning', message: msg })
      setLoading(false)
      return
    }
    getBuilding(id)
      .then(data => setBuilding(data))
      .catch(err => setError(err?.response?.data?.detail || err.message || t('buildings.load_failed')))
      .finally(() => setLoading(false))
  }, [id, can, addToast])

  if (loading) return (
    <div className="p-3 flex items-center justify-center">
      <LoadingSpinner label={t('buildings.loading')} />
    </div>
  )
  if (error) return <div className="p-2 text-red-600">{error}</div>
  if (!building) return <div className="p-2">{t('buildings.not_found')}</div>

  const InfoRow = ({ label, value, icon: Icon, iconClass }) => (
    <div className="flex items-start gap-3">
      {Icon && (
        <Icon
          className={`mt-0.5 h-4 w-4 sm:h-5 sm:w-5 md:h-4 md:w-4 lg:h-4 lg:w-4 ${iconClass ?? 'text-gray-400'}`}
        />
      )}
      <div>
        <div className="text-xs sm:text-sm md:text-xs lg:text-xs uppercase tracking-wide text-gray-500">{label}</div>
        <div className="text-sm sm:text-base md:text-sm lg:text-sm text-gray-900 capitalize">{value ?? '-'}</div>
      </div>
    </div>
  )

  const managerLabel = building.manager_name || building.manager?.name || building.manager?.username || building.manager || '-'
  const createdAt = building.created_at || building.created || null
  const updatedAt = building.updated_at || building.modified || null
  const fullAddress = [building.address_line, building.city, building.state, building.pincode].filter(Boolean).join(', ')
  const mapsUrl = fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : null

  return (
    <div className="p-2 sm:p-3 space-y-4">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 hover:border-gray-300">
          <FiArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">{t('buildings.back')}</span>
        </button>
      </div>

      {/* Header */}
      <Card padding="sm" hoverEffect={false} className="rounded-lg ring-1 ring-gray-100">
        <div className="flex flex-col gap-2">
          {/* Top row: icon + title on left, actions on right */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FiHome className="h-4 w-4" />
              </div>
              <h1 className="text-base sm:text-xl lg:text-2xl font-semibold text-gray-900 leading-snug capitalize truncate">{building.name}</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex items-center gap-1 text-xs sm:text-sm text-indigo-600 hover:underline capitalize">
                  <FiExternalLink className="h-3.5 w-3.5" /> {t('buildings.view_on_maps')}
                </a>
              )}
              <BuildingActions
                building={building}
                onEdit={(b) => (onEdit ? onEdit(b) : setShowForm(true))}
                onChanged={(type) => {
                  if (type === 'soft_delete') {
                    setBuilding(prev => ({ ...prev, is_active: false }))
                  }
                  if (type === 'activate') {
                    setBuilding(prev => ({ ...prev, is_active: true }))
                  }
                  if (type === 'delete') {
                    navigate('/buildings')
                  }
                }}
              />
            </div>
          </div>
          {/* Second row: chips/badges under title */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {building.property_type && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 px-1 sm:px-2 py-px sm:py-0.5 text-[9px] sm:text-[11px] capitalize">
                <FiGrid className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {building.property_type}
              </span>
            )}
            {building.code && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-2 py-0.5 text-[11px] capitalize">
                <FiHash className="h-3 w-3" /> {building.code}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 rounded-full ${building.is_active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'} px-1 sm:px-2 py-px sm:py-0.5 text-[9px] sm:text-[11px] capitalize`}>
              {building.is_active ? <FiCheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <FiXCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
              {building.is_active ? t('buildings.active') : t('buildings.inactive')}
            </span>
            {typeof building.floors_count === 'number' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 px-2 py-0.5 text-[11px] capitalize">
                <FiLayers className="h-3 w-3" /> {building.floors_count} {t('buildings.floors_label')}
              </span>
            )}
            {typeof building.rooms_count === 'number' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200 px-2 py-0.5 text-[11px] capitalize">
                <FiGrid className="h-3 w-3" /> {building.rooms_count} {t('buildings.rooms_label')}
              </span>
            )}
            {typeof building.beds_count === 'number' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 py-0.5 text-[11px] capitalize">
                <FiBox className="h-3 w-3" /> {building.beds_count} {t('buildings.beds_label')}
              </span>
            )}
          </div>
        </div>
      </Card>
      {/* Details */}

        <Card title={<span className="inline-flex items-center gap-2 text-sm sm:text-base md:text-sm lg:text-sm text-gray-900"><span className="h-5 w-5 rounded bg-indigo-50 text-indigo-600 inline-flex items-center justify-center"><FiGrid className="h-3 w-3"/></span> {t('buildings.overview')}</span>} padding="sm" className="rounded-lg ring-1 ring-gray-100 bg-white">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-3 lg:gap-3">
            <div className="p-2 sm:p-3 md:p-2 lg:p-2 rounded-md border border-gray-200 border-t-2 border-t-indigo-300 bg-gradient-to-br from-gray-50 to-white transition-all hover:shadow-sm hover:border-indigo-200">
              <InfoRow label={t('buildings.type')} value={building.property_type} icon={FiHome} iconClass="text-indigo-500" />
            </div>
            <div className="p-2 sm:p-3 md:p-2 lg:p-2 rounded-md border border-gray-200 border-t-2 border-t-violet-300 bg-gradient-to-br from-gray-50 to-white transition-all hover:shadow-sm hover:border-violet-200">
              <InfoRow label={t('buildings.code')} value={building.code || '-'} icon={FiHash} iconClass="text-violet-500" />
            </div>
            <div className="p-2 sm:p-3 md:p-2 lg:p-2 rounded-md border border-gray-200 border-t-2 border-t-sky-300 bg-gradient-to-br from-gray-50 to-white transition-all hover:shadow-sm hover:border-sky-200">
              <InfoRow label={t('buildings.city')} value={building.city} icon={FiMapPin} iconClass="text-sky-500" />
            </div>
            <div className="p-2 sm:p-3 md:p-2 lg:p-2 rounded-md border border-gray-200 border-t-2 border-t-blue-300 bg-gradient-to-br from-gray-50 to-white transition-all hover:shadow-sm hover:border-blue-200">
              <InfoRow label={t('buildings.state')} value={building.state} icon={FiMapPin} iconClass="text-blue-500" />
            </div>
            <div className="p-2 sm:p-3 md:p-2 lg:p-2 rounded-md border border-gray-200 border-t-2 border-t-amber-300 bg-gradient-to-br from-gray-50 to-white transition-all hover:shadow-sm hover:border-amber-200">
              <InfoRow label={t('buildings.pincode')} value={building.pincode} />
            </div>
            <div className={`p-2 sm:p-3 md:p-2 lg:p-2 rounded-md border border-gray-200 border-t-2 ${building.is_active ? 'border-t-emerald-300 hover:border-emerald-200' : 'border-t-rose-300 hover:border-rose-200'} bg-gradient-to-br from-gray-50 to-white transition-all hover:shadow-sm`}>
              <InfoRow
                label={t('buildings.status')}
                value={
                  <span className={`${building.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'} inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] sm:text-xs font-medium`}>
                    {building.is_active ? t('buildings.active') : t('buildings.inactive')}
                  </span>
                }
                icon={building.is_active ? FiCheckCircle : FiXCircle}
                iconClass={building.is_active ? 'text-emerald-500' : 'text-rose-500'}
              />
            </div>
            {managerLabel && managerLabel !== '-' && (
              <div className="p-2 sm:p-3 md:p-2 lg:p-2 rounded-md border border-gray-200 border-t-2 border-t-cyan-300 bg-gradient-to-br from-gray-50 to-white transition-all hover:shadow-sm hover:border-cyan-200">
                <InfoRow label={t('buildings.manager')} value={managerLabel} icon={FiUser} iconClass="text-cyan-500" />
              </div>
            )}
            {createdAt && (
              <div className="p-2 sm:p-3 md:p-2 lg:p-2 rounded-md border border-gray-200 border-t-2 border-t-slate-300 bg-gradient-to-br from-gray-50 to-white transition-all hover:shadow-sm hover:border-slate-200">
                <InfoRow label={t('buildings.created')} value={formatDateTime(createdAt)} icon={FiCalendar} iconClass="text-slate-500" />
              </div>
            )}
            {updatedAt && (
              <div className="p-2 sm:p-3 md:p-2 lg:p-2 rounded-md border border-gray-200 border-t-2 border-t-slate-300 bg-gradient-to-br from-gray-50 to-white transition-all hover:shadow-sm hover:border-slate-200">
                <InfoRow label={t('buildings.updated')} value={formatDateTime(updatedAt)} icon={FiCalendar} iconClass="text-slate-500" />
              </div>
            )}
            <div className="col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-4 p-3 sm:p-4 md:p-3 lg:p-3 rounded-md border border-gray-200 bg-white">
              <div className="text-xs sm:text-sm md:text-xs lg:text-xs uppercase tracking-wide text-gray-500 mb-1 inline-flex items-center gap-1">
                <FiMapPin className="h-3.5 w-3.5 text-gray-400"/> {t('buildings.address_label')}
              </div>
              <div className="text-sm sm:text-base md:text-sm lg:text-sm text-gray-900 capitalize">{building.address_line || '-'}</div>
              {mapsUrl && (
                <div className="mt-1">
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline capitalize">
                    <FiExternalLink className="h-3.5 w-3.5" /> {t('buildings.open_in_maps')}
                  </a>
                </div>
              )}
            </div>
            {building.notes && (
              <div className="col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-4 p-3 sm:p-4 md:p-3 lg:p-3 rounded-md border border-gray-200 bg-white">
                <div className="text-xs sm:text-sm md:text-xs lg:text-xs uppercase tracking-wide text-gray-500 mb-1 inline-flex items-center gap-1">
                  <FiCalendar className="h-3.5 w-3.5 text-gray-400"/> {t('buildings.notes_label')}
                </div>
                <div className="text-sm sm:text-base md:text-sm lg:text-sm text-gray-900 whitespace-pre-line capitalize">{building.notes}</div>
              </div>
            )}
          </div>
        </Card>

      {/* Stats */}
      <BuildingStats
        floors={building.floors_count}
        rooms={building.rooms_count}
        beds={building.beds_count}
        buildingId={building?.id}
      />

      {/* Floors management */}
      {can('floors', 'view', building.id) && (
        <FloorPage buildingId={building.id} embed buildingInactive={!building.is_active} />
      )}

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={t('buildings.edit_building_title', { name: building?.name })}
        maxWidth="md"
      >
        <BuildingForm
          mode="edit"
          initialValues={building}
          onCancel={() => setShowForm(false)}
          onSaved={(updated) => {
            setShowForm(false)
            // Refresh data from server or update local state with returned payload
            if (updated) {
              setBuilding(prev => ({ ...prev, ...updated }))
            } else if (building?.id) {
              getBuilding(building.id).then(setBuilding).catch(() => {})
            }
            addToast({ message: t('buildings.updated_success'), type: 'success' })
          }}
        />
      </Modal>
    </div>
  )
}

export default BuildingDetails