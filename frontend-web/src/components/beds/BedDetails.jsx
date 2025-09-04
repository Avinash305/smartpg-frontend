import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { getBed } from '../../services/properties'
import Card from '../ui/Card'
import LoadingSpinner from '../ui/LoadingSpinner'
import { Button } from '../ui/Button'
import BedActions from './BedActions'
import Modal from '../ui/Modal'
import BedForm from './BedForm'
import { useToast } from '../../context/ToastContext'
import { FiArrowLeft } from 'react-icons/fi'
import BedHistory from './BedHistory'
import { useColorScheme } from '../../theme/colorSchemes'
import { formatCurrency } from '../../utils/dateUtils'

const BedDetails = () => {
  const { t } = useTranslation()
  const tr = (k, f, opt) => t(k, { defaultValue: f, ...(opt || {}) })
  const { id } = useParams()
  const navigate = useNavigate()
  const [bed, setBed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const { addToast } = useToast()
  const scheme = useColorScheme('default')

  const load = () => {
    if (!id) return
    setLoading(true)
    setError('')
    getBed(id)
      .then((data) => setBed(data))
      .catch((err) => setError(err?.response?.data?.detail || err.message || tr('common.error_loading', 'Failed to load bed')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [id])

  if (loading) return (
    <div className="p-6 flex items-center justify-center">
      <LoadingSpinner label={tr('beds.loading_one', 'Loading bed...')} />
    </div>
  )

  if (error) return (
    <div className="p-6">
      <Card title={tr('common.error', 'Error')}>
        <div className={`text-sm ${scheme.accents?.rose?.text}`}>{error}</div>
        <div className="mt-3">
          <Button variant="outline" onClick={load}>{tr('common.retry', 'Retry')}</Button>
        </div>
      </Card>
    </div>
  )

  if (!bed) return null

  const title = bed.number ? tr('beds.bed_with_number', 'Bed {{n}}', { n: bed.number }) : tr('beds.bed', 'Bed')

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm sm:text-base ${scheme.neutral?.text} hover:bg-gray-50 hover:border-gray-300`}>
          <FiArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">{tr('common.back', 'Back')}</span>
        </button>
      </div>

      {/* Bed heading card with actions */}
      <Card
        title={title}
        padding="md"
        actions={<BedActions bed={bed} onEdit={() => setEditOpen(true)} onChanged={load} />}
      >
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm ${scheme.neutral?.text}`}>
          {bed.room_number ? (<div><span className={`${scheme.neutral?.muted}`}>{tr('rooms.room', 'Room')}:</span> {bed.room_number}</div>) : null}
          <div className="flex items-center gap-2">
            <span className={`${scheme.neutral?.muted}`}>{tr('beds.status', 'Status')}:</span>
            {(() => {
              const s = (bed.status || '').toLowerCase()
              if (s === 'available') return (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium border ${scheme.available?.badge}`}>{tr('beds.available', 'Available')}</span>
              )
              if (s === 'occupied') return (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium border ${scheme.occupied?.badge}`}>{tr('beds.occupied', 'Occupied')}</span>
              )
              if (s === 'reserved') return (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium border ${scheme.reserved?.badge}`}>{tr('beds.reserved', 'Reserved')}</span>
              )
              if (s === 'maintenance') return (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium border ${scheme.maintenance?.badge}`}>{tr('beds.maintenance', 'Maintenance')}</span>
              )
              return <span>-</span>
            })()}
          </div>
          <div><span className={`${scheme.neutral?.muted}`}>{tr('beds.monthly_rent', 'Monthly Rent')}:</span> {formatCurrency(bed.monthly_rent)}</div>
          <div className="sm:col-span-2 lg:col-span-3"><span className={`${scheme.neutral?.muted}`}>{tr('beds.notes', 'Notes')}:</span> <span className="whitespace-pre-wrap break-words">{bed.notes || '-'}</span></div>
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title={tr('beds.titles.edit_bed', 'Edit {{title}}', { title })} maxWidth="lg">
        <BedForm
          mode="edit"
          initialValues={bed}
          roomId={bed.room}
          onCancel={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); load(); addToast({ message: tr('beds.toasts.updated_success', 'Bed updated successfully'), type: 'success' }) }}
        />
      </Modal>

      <BedHistory bed={bed} />
    </div>
  )
}

export default BedDetails