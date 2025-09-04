import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiUser, FiMail, FiPhone, FiDownload } from 'react-icons/fi'
import { getTenant } from '../../services/tenants'
import { useToast } from '../../context/ToastContext'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import TenantActions from './TenantActions'
import Modal from '../ui/Modal'
import TenantForm from './TenantForm'
import TenantPaymentHistory from './TenantPaymentHistory'
import TenantBedHistory from './TenantBedHistory'
import InvoiceList from '../invoice/InvoiceList'
import { formatDateOnly } from '../../utils/dateUtils'

const resolveMediaUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  // Strip trailing /api and any trailing slash to get clean origin
  const origin = apiBase.replace(/\/?api\/?$/i, '').replace(/\/+$/, '')
  const path = `/${String(url).replace(/^\/+/, '')}`
  return `${origin}${path}`
}

const formatDate = (dateStr) => formatDateOnly(dateStr)

const TenantDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [photoError, setPhotoError] = useState(false)
  const [idPreview, setIdPreview] = useState({ open: false, url: '', title: 'ID Proof' })

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        setLoading(true)
        const data = await getTenant(id)
        if (!alive) return
        setTenant(data)
      } catch (e) {
        setError('Failed to load tenant details')
        addToast({ type: 'error', message: 'Failed to load tenant details' })
      } finally {
        if (alive) setLoading(false)
      }
    }
    if (id) load()
    return () => { alive = false }
  }, [id, addToast])

  useEffect(() => {
    setPhotoError(false)
    if (tenant) {
      const raw = tenant.avatar_url || tenant.avatar || tenant.photo
      const resolved = resolveMediaUrl(raw)
      // eslint-disable-next-line no-console
      console.log('Tenant avatar debug:', { rawPhoto: raw, resolvedPhoto: resolved })
    }
  }, [tenant])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-xs sm:text-sm text-red-700">{error}</div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 hover:border-gray-300"
          >
            <FiArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-medium">Go Back</span>
          </button>
        </div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="p-6 text-center">
        <p className="text-xs sm:text-sm text-gray-600 mb-4">No tenant found with this ID.</p>
        <button
          type="button"
          onClick={() => navigate('/tenants')}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 hover:border-gray-300"
        >
          <FiArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">Back to Tenants</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 hover:border-gray-300"
        >
          <FiArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">Back</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tenant Details</h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">View and manage tenant information</p>
        </div>
      </div>

      {/* Basic Info Card */}
      <SectionCard title="Basic Information" tenant={tenant} id={id} setTenant={setTenant} navigate={navigate} addToast={addToast} showActions>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left */}
            <div className="md:w-1/3">
              <div className="flex flex-col items-center">
                <div className="h-32 w-32 rounded-full bg-blue-50 flex items-center justify-center mb-4 ring-2 ring-blue-100 overflow-hidden shadow-sm">
                  {(tenant.avatar_url || tenant.avatar || tenant.photo) && !photoError ? (
                    (() => { const avatarUrl = resolveMediaUrl(tenant.avatar_url || tenant.avatar || tenant.photo); return (
                      <img
                        src={avatarUrl}
                        alt={tenant.full_name}
                        className="h-full w-full object-cover"
                        onError={() => setPhotoError(true)}
                      />
                    )})()
                  ) : (
                    <FiUser className="h-16 w-16 text-gray-600" />
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{tenant.full_name}</h3>
                <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${tenant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {tenant.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="md:w-2/3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information - span 2 cols */}
                <div className="lg:col-span-2">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Personal Information</h4>
                  <div className="mt-2 grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Full Name</p>
                      <p className="text-gray-900">{tenant.full_name}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Date of Birth</p>
                      <p className="text-gray-900">{tenant.date_of_birth ? formatDate(tenant.date_of_birth) : 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Gender</p>
                      <p className="text-gray-900 capitalize">{tenant.gender || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Building</p>
                      <p className="text-gray-900">{tenant.building_name || tenant.building || 'Not assigned'}</p>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Contact</h4>
                  <div className="mt-2 space-y-2">
                  <div className="flex items-center">
                      <FiPhone className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500">Phone</p>
                        <p className="text-gray-900">{tenant.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <FiMail className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500">Email</p>
                        <p className="text-gray-900">{tenant.email || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Address</h4>
                  <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Address Line</p>
                      <p className="text-gray-900">{tenant.address_line || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">City</p>
                      <p className="text-gray-900">{tenant.city || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">State</p>
                      <p className="text-gray-900">{tenant.state || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">PIN Code</p>
                      <p className="text-gray-900">{tenant.pincode || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Stays */}
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Stays</h4>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Check-in</p>
                      <p className="text-gray-900">{tenant.check_in || tenant.checkin || tenant.check_in_date || tenant.checkin_date ? formatDate(tenant.check_in || tenant.checkin || tenant.check_in_date || tenant.checkin_date) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Check-out</p>
                      <p className="text-gray-900">{tenant.check_out || tenant.checkout || tenant.check_out_date || tenant.checkout_date ? formatDate(tenant.check_out || tenant.checkout || tenant.check_out_date || tenant.checkout_date) : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Files */}
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Files</h4>
                  <div className="mt-2 grid grid-cols-2 gap-6 items-start">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 mb-2">Photo</p>
                      {(tenant.avatar_url || tenant.avatar || tenant.photo) ? (
                        <img
                          src={resolveMediaUrl(tenant.avatar_url || tenant.avatar || tenant.photo)}
                          alt="Tenant"
                          className="h-28 w-28 rounded-lg object-cover border border-gray-200 shadow-sm"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <p className="text-gray-900">No photo uploaded</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 mb-2">ID Proof</p>
                      <div className="space-y-1">
                        <p className="text-gray-900">
                          <span className="text-gray-500">Type: </span>
                          {tenant.id_proof_type || 'N/A'}
                        </p>
                        <p className="text-gray-900">
                          <span className="text-gray-500">Number: </span>
                          {tenant.id_proof_number || 'N/A'}
                        </p>
                        {tenant.id_proof_document ? (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setIdPreview({ open: true, url: resolveMediaUrl(tenant.id_proof_document), title: `ID Proof - ${tenant.full_name || ''}` })}
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                            >
                              View ID Proof
                            </button>
                          </div>
                        ) : (
                          <p className="text-gray-900">No document uploaded</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Meta</h4>
                  <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Created At</p>
                      <p className="text-gray-900">{tenant.created_at ? formatDate(tenant.created_at) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Created By</p>
                      <p className="text-gray-900">{tenant.created_by || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Updated At</p>
                      <p className="text-gray-900">{tenant.updated_at ? formatDate(tenant.updated_at) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Updated By</p>
                      <p className="text-gray-900">{tenant.updated_by || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Bed History */}
      <SectionCard title="Bed History">
        <TenantBedHistory items={tenant.bed_history || []} tenantId={id} />
      </SectionCard>

      {/* Payment History */}
      <SectionCard title="Payment History">
        <div className="p-6">
          <TenantPaymentHistory tenantId={id} limit={10} />
        </div>
      </SectionCard>

      {/* Invoices */}
      <SectionCard title="Invoices">
        <div className="p-6">
          <InvoiceList tenantId={id} limit={10} />
        </div>
      </SectionCard>

      {/* ID Proof Preview Modal */}
      <Modal
        isOpen={idPreview.open}
        onClose={() => setIdPreview((p) => ({ ...p, open: false }))}
        title={idPreview.title}
        maxWidth="xl"
      >
        {idPreview.url ? (
          /\.pdf($|\?)/i.test(idPreview.url) ? (
            <div className="h-[70vh]">
              <iframe
                src={idPreview.url}
                title="ID Proof PDF"
                className="w-full h-full border rounded"
              />
              <div className="mt-3 flex items-center gap-4 self-end">
                <a href={idPreview.url} download className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"><FiDownload /> Download</a>
                <a href={idPreview.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Open in new tab</a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <img src={idPreview.url} alt="ID Proof" className="max-h-[70vh] w-auto object-contain rounded border" />
              <div className="mt-3 flex items-center gap-4 self-end">
                <a href={idPreview.url} download className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"><FiDownload /> Download</a>
                <a href={idPreview.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Open in new tab</a>
              </div>
            </div>
          )
        ) : (
          <p className="text-sm text-gray-600">No document to preview.</p>
        )}
      </Modal>

      {/* Edit Modal lives at root to avoid re-mounting */}
      <EditModalHost id={id} tenant={tenant} setTenant={setTenant} addToast={addToast} navigate={navigate} />
    </div>
  )
}

export default TenantDetails

function HeaderActions({ tenant, onChangedTypeRefetch, navigate, setTenant, id, addToast }) {
  const { openEdit } = useEditModal()

  const onChanged = async (type) => {
    if (type === 'delete') {
      navigate('/tenants')
      return
    }
    // refetch tenant
    try {
      const data = await getTenant(id)
      setTenant(data)
      addToast({ type: 'success', message: 'Updated' })
    } catch (_) {}
  }

  return (
    <TenantActions tenant={tenant} onEdit={openEdit} onChanged={onChanged} />
  )
}

function SectionCard({ title, children, tenant, id, setTenant, navigate, addToast, showActions }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-medium text-gray-900">{title}</h3>
        {showActions ? (
          <HeaderActions tenant={tenant} navigate={navigate} setTenant={setTenant} id={id} addToast={addToast} />
        ) : <span />}
      </div>
      {children}
    </Card>
  )
}

// Simple global edit modal controller scoped to this file
const editModalState = { open: false, editing: null, listeners: new Set() }
function useEditModal() {
  const [, setTick] = React.useState(0)
  const openEdit = (tenant) => {
    editModalState.open = true
    editModalState.editing = tenant
    editModalState.listeners.forEach((fn) => fn())
  }
  const close = () => {
    editModalState.open = false
    editModalState.listeners.forEach((fn) => fn())
  }
  useEffect(() => {
    const cb = () => setTick((v) => v + 1)
    editModalState.listeners.add(cb)
    return () => editModalState.listeners.delete(cb)
  }, [])
  return { open: editModalState.open, editing: editModalState.editing, openEdit, close }
}

function EditModalHost({ id, tenant, setTenant, addToast, navigate }) {
  const modal = useEditModal()
  const onSuccess = async () => {
    modal.close()
    try {
      const data = await getTenant(id)
      setTenant(data)
      addToast({ type: 'success', message: 'Tenant updated' })
    } catch (e) {
      // ignore
    }
  }
  return (
    <Modal isOpen={modal.open} onClose={modal.close} title={modal.editing ? 'Edit Tenant' : 'Edit Tenant'} maxWidth="lg">
      <TenantForm tenant={modal.editing || tenant} onSuccess={onSuccess} />
    </Modal>
  )
}