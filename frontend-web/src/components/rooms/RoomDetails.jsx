import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getRoom } from '../../services/properties'
import LoadingSpinner from '../ui/LoadingSpinner'
import Card from '../ui/Card'
import { Button } from '../ui/Button'
import { FiArrowLeft } from 'react-icons/fi'
import Modal from '../ui/Modal'
import RoomForm from './RoomForm'
import RoomActions from './RoomActions'
import BedPage from '../../pages/BedPage'
import { useToast } from '../../context/ToastContext'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../utils/dateUtils'

const toReadableType = (v, tr) => {
  if (!v) return '-'
  if (v === 'single_sharing') return tr('rooms.types.single_sharing', 'Single Sharing')
  const [n] = String(v).split('_')
  const num = Number(n)
  if (!Number.isNaN(num)) return tr('rooms.types.n_sharing', '{{n}} Sharing', { n: num })
  return v
}

const RoomDetails = () => {
  const { t } = useTranslation()
  const tr = (k, f, opt) => t(k, { defaultValue: f, ...(opt || {}) })
  const { id } = useParams()
  const navigate = useNavigate()

  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showEdit, setShowEdit] = useState(false)
  const { addToast } = useToast()

  const loadRoom = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await getRoom(id)
      setRoom(data)
      setError('')
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load room')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const onChanged = (type) => {
    if (type === 'delete') {
      navigate('/rooms')
      return
    }
    // refresh details after soft delete or other changes
    loadRoom()
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <LoadingSpinner label={tr('rooms.loading', 'Loading rooms...')} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card title={tr('rooms.load_failed', 'Failed to load rooms')}>
          <div className="text-red-600 text-sm">{error}</div>
          <div className="mt-3">
            <Button variant="outline" onClick={loadRoom}>{tr('common.retry', 'Retry')}</Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!room) return null

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 hover:border-gray-300">
          <FiArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">{tr('buildings.back', 'Back')}</span>
        </button>
      </div>

      {/* Room heading card with actions */}
      <Card
        title={`${tr('rooms.room', 'Room')} ${room.number}`}
        padding="md"
        actions={<RoomActions room={room} onEdit={() => setShowEdit(true)} onChanged={onChanged} />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm text-gray-700">
          <div><span className="text-gray-500">{tr('rooms.floor', 'Floor')}:</span> {room.floor_display || room.floor || '-'}</div>
          <div><span className="text-gray-500">{tr('rooms.type', 'Type')}:</span> {toReadableType(room.room_type, tr)}</div>
          <div><span className="text-gray-500">{tr('rooms.capacity', 'Capacity')}:</span> {room.capacity ?? '-'}</div>
          <div><span className="text-gray-500">{tr('rooms.labels.monthly_rent', 'Monthly Rent')}:</span> {formatCurrency(room.monthly_rent)}</div>
          <div><span className="text-gray-500">{tr('rooms.labels.security_deposit', 'Security Deposit')}:</span> {formatCurrency(room.security_deposit)}</div>
          <div><span className="text-gray-500">{tr('rooms.labels.active', 'Active')}:</span> {room.is_active ? tr('rooms.yes', 'Yes') : tr('rooms.no', 'No')}</div>
          {room.notes ? (
            <div className="sm:col-span-2 lg:col-span-3"><span className="text-gray-500">{tr('rooms.labels.notes', 'Notes')}:</span> {room.notes}</div>
          ) : null}
        </div>
      </Card>

      {/* Beds (embedded BedPage) */}
      <BedPage roomId={id} />

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`${tr('rooms.titles.edit_room', 'Edit Room')} ${room.number}`} maxWidth="lg">
        <RoomForm
          mode="edit"
          initialValues={room}
          onCancel={() => setShowEdit(false)}
          onSaved={(saved) => { setShowEdit(false); setRoom(saved); addToast({ message: tr('rooms.toasts.updated_success', 'Room updated successfully'), type: 'success' }) }}
        />
      </Modal>
    </div>
  )
}

export default RoomDetails