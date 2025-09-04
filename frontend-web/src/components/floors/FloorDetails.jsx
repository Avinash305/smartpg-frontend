import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFloor } from '../../services/properties'
import Card from '../ui/Card'
import LoadingSpinner from '../ui/LoadingSpinner'
import Modal from '../ui/Modal'
import FloorForm from './FloorForm'
import FloorActions from './FloorActions'
import FloorStats from './FloorStats'
import RoomPage from '../../pages/RoomPage'
import { FiLayers, FiArrowLeft, FiGrid, FiBox, FiCalendar } from 'react-icons/fi'
import { useToast } from '../../context/ToastContext'
import { useCan } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '../../utils/dateUtils'

const toFloorLabel = (n, t) => {
  const num = Number(n)
  if (Number.isNaN(num)) return t('floors.floor_label_unknown') || '-'
  if (num === 0) return t('floors.floor_label_ground') || 'Ground Floor'
  const s = ['th','st','nd','rd']
  const v = num % 100
  return `${num}${s[(v - 20) % 10] || s[v] || s[0]} ${t('floors.floor_label_suffix') || 'Floor'}`
}

const InfoRow = ({ label, value, icon: Icon, iconClass }) => (
  <div className="flex items-start gap-3">
    {Icon && (
      <Icon className={`mt-0.5 h-4 w-4 sm:h-5 sm:w-5 md:h-4 md:w-4 ${iconClass ?? 'text-gray-400'}`} />
    )}
    <div>
      <div className="text-xs sm:text-sm md:text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm sm:text-base md:text-sm lg:text-sm text-gray-900 capitalize">{value ?? '-'}</div>
    </div>
  </div>
)

const FloorDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [floor, setFloor] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [showEdit, setShowEdit] = React.useState(false)
  const { addToast } = useToast()
  const { can } = useCan()
  const { t } = useTranslation()

  const load = React.useCallback(() => {
    setLoading(true)
    setError('')
    // Fetch the floor first to know its building scope, then validate permissions
    getFloor(id)
      .then((data) => {
        const buildingScopeId = data?.building || data?.building_id || data?.buildingId || 'global'
        if (typeof can === 'function' && !can('floors', 'view', buildingScopeId)) {
          const msg = t('floors.permission_denied')
          setError(msg)
          addToast({ type: 'warning', message: msg })
          setFloor(null)
          return
        }
        setFloor(data)
      })
      .catch((err) => setError(err?.response?.data?.detail || err.message || t('floors.load_failed')))
      .finally(() => setLoading(false))
  }, [id, can, addToast, t])

  React.useEffect(() => {
    if (id) load()
  }, [id, load])

  if (loading) return (
    <div className="p-3 flex items-center justify-center">
      <LoadingSpinner label={t('floors.loading')} />
    </div>
  )

  if (error) return (
    <div className="p-2">
      <div className="mb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 hover:border-gray-300">
          <FiArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">{t('buildings.back')}</span>
        </button>
      </div>
      <div className="text-red-700 bg-red-50 border border-red-200 rounded-md p-3 text-sm">{error}</div>
    </div>
  )

  if (!floor) return <div className="p-2">{t('floors.not_found')}</div>

  const createdAt = floor.created_at || floor.created || null
  const updatedAt = floor.updated_at || floor.modified || null

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
                <FiLayers className="h-4 w-4" />
              </div>
              <h1 className="text-base sm:text-xl lg:text-2xl font-semibold text-gray-900 leading-snug capitalize truncate">{toFloorLabel(floor.number, t)}</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <FloorActions
                floor={floor}
                onEdit={() => setShowEdit(true)}
                onChanged={(type) => {
                  if (type === 'delete') {
                    navigate('/floors')
                  } else {
                    load()
                  }
                }}
              />
            </div>
          </div>

          {/* Second row: chips/badges under title */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {typeof floor.rooms_count === 'number' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-2 py-0.5 text-[11px] capitalize">
                <FiGrid className="h-3 w-3" /> {floor.rooms_count} {t('floors.rooms')}
              </span>
            )}
            {typeof floor.beds_count === 'number' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 py-0.5 text-[11px] capitalize">
                <FiBox className="h-3 w-3" /> {floor.beds_count} {t('floors.beds')}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Overview */}
      <Card title={<span className="inline-flex items-center gap-2 text-sm sm:text-base md:text-sm lg:text-sm text-gray-900"><span className="h-5 w-5 rounded bg-indigo-50 text-indigo-600 inline-flex items-center justify-center"><FiLayers className="h-3 w-3"/></span> {t('floors.overview')}</span>} padding="xs" className="rounded-lg ring-1 ring-gray-100 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <div className="p-2 rounded-md border border-gray-200 bg-white">
            <InfoRow label={t('floors.floor')} value={toFloorLabel(floor.number, t)} icon={FiLayers} iconClass="text-indigo-500" />
          </div>
          {createdAt && (
            <div className="p-2 rounded-md border border-gray-200 bg-white">
              <InfoRow label={t('buildings.created')} value={formatDateTime(createdAt)} icon={FiCalendar} iconClass="text-slate-500" />
            </div>
          )}
          {updatedAt && (
            <div className="p-2 rounded-md border border-gray-200 bg-white">
              <InfoRow label={t('buildings.updated')} value={formatDateTime(updatedAt)} icon={FiCalendar} iconClass="text-slate-500" />
            </div>
          )}

          {floor.notes && (
            <div className="col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-3 p-2 rounded-md border border-gray-200 bg-white">
              <div className="text-xs sm:text-sm md:text-xs lg:text-xs uppercase tracking-wide text-gray-500 mb-1 inline-flex items-center gap-1">
                <FiCalendar className="h-3.5 w-3.5 text-gray-400"/> {t('floors.notes')}
              </div>
              <div className="text-sm sm:text-base md:text-sm lg:text-sm text-gray-900 whitespace-pre-line capitalize">{floor.notes}</div>
            </div>
          )}
        </div>
      </Card>

      {/* Stats */}
      <FloorStats
        floorId={floor.id}
        totalFloors={1}
        totalRooms={floor?.rooms_count ?? '-'}
        totalBeds={floor?.beds_count ?? '-'}
      />

      {/* Rooms management */}
      {typeof can === 'function' && can('rooms', 'view', floor.building || floor.building_id || floor.buildingId) && (
        <RoomPage floorId={floor.id} embed />
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title={t('floors.titles.edit_floor_title', { name: floor?.number != null ? toFloorLabel(floor.number, t) : '' })}
        maxWidth="lg"
      >
        <FloorForm
          mode="edit"
          initialValues={{ id: floor.id, number: floor.number, notes: floor.notes || '', building: floor.building || floor.building_id || floor.buildingId }}
          onCancel={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            load()
            addToast({ message: t('floors.toasts.updated_success'), type: 'success' })
          }}
        />
      </Modal>
    </div>
  )
}

export default FloorDetails