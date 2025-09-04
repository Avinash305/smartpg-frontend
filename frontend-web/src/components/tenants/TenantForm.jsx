import React, { useState, useEffect } from 'react'
import { Button, PermissionButton } from '../ui/Button'
import { useToast } from '../../context/ToastContext'
import { createTenant, updateTenant } from '../../services/tenants'
import { getBuildings } from '../../services/properties'
import { Input } from '../ui/Input'
import Select from '../ui/Select'
import { DatePicker as UIDatePicker } from '../ui/DatePicker'
import { Card } from '../ui/Card'
import { FiUser, FiPhone, FiMail } from 'react-icons/fi'
import { Checkbox } from '../ui/Checkbox'
import { useCan } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'

// Ensure media URLs work when backend returns relative paths like "/media/..."
const resolveMediaUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  const origin = apiBase.replace(/\/?api\/?$/i, '').replace(/\+$/, '')
  const path = `/${String(url).replace(/^\/+/, '')}`
  return `${origin}${path}`
}

const initialState = {
  full_name: '',
  email: '',
  phone: '',
  gender: '',
  date_of_birth: null,
  is_active: true,
  building: '',
  address_line: '',
  city: '',
  state: '',
  pincode: '',
  id_proof_type: '',
  id_proof_number: '',
  photo: null,
  id_proof_document: null,
}

const TenantForm = ({ tenant, onSuccess }) => {
  const { addToast } = useToast()
  const [values, setValues] = useState(initialState)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [buildingOptions, setBuildingOptions] = useState([])
  const [buildingsLoading, setBuildingsLoading] = useState(false)
  const { can } = useCan()
  const { t } = useTranslation()
  const tr = (key, fallback, opt) => t(key, { defaultValue: fallback, ...(opt || {}) })

  const setFieldError = (field, message) => setErrors((e) => ({ ...e, [field]: message }))

  const onChange = (e) => {
    const { name, value, type, checked, files } = e.target
    if (type === 'file') {
      setValues((v) => ({ ...v, [name]: files && files.length ? files[0] : null }))
      if (errors[name]) setFieldError(name, '')
      return
    }
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setFieldError(name, '')
  }

  const validate = () => {
    const next = {}
    if (!values.full_name?.trim()) next.full_name = tr('tenants.errors.name_required', 'Full name is required')
    if (!values.phone?.trim()) next.phone = tr('tenants.errors.phone_required', 'Phone is required')
    else if (!/^\d{10}$/.test(values.phone)) next.phone = tr('tenants.errors.phone_invalid', 'Phone must be 10 digits')
    if (!values.gender) next.gender = tr('tenants.errors.gender_required', 'Gender is required')
    if (!values.building) next.building = tr('tenants.errors.building_required', 'Building is required')
    setErrors(next)
    return Object.keys(next).length ? next : null
  }

  const formatDate = (date) => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const extractApiError = (error) => {
    const data = error?.response?.data
    if (!data) return tr('tenants.toasts.create_failed', 'Failed to create tenant')
    if (typeof data === 'string') return data
    const firstField = Object.keys(data)[0]
    const firstMsg = Array.isArray(data[firstField]) ? data[firstField][0] : data[firstField]
    return firstMsg || tr('tenants.toasts.create_failed', 'Failed to create tenant')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (errs) {
      addToast({ message: tr('tenants.toasts.fix_errors', 'Please fix the highlighted fields'), type: 'error' })
      return
    }
    setLoading(true)
    try {
      const form = new FormData()
      Object.entries(values).forEach(([k, v]) => {
        if (k === 'date_of_birth') {
          const formatted = formatDate(v)
          if (formatted) form.append(k, formatted)
          return
        }
        if (k === 'photo' || k === 'id_proof_document') {
          if (v instanceof File) form.append(k, v)
          return
        }
        if (v !== undefined && v !== null && v !== '') form.append(k, v)
      })

      if (tenant?.id) {
        await updateTenant(tenant.id, form)
        addToast({ message: tr('tenants.toasts.updated_success', 'Tenant updated successfully'), type: 'success' })
      } else {
        await createTenant(form)
        addToast({ message: tr('tenants.toasts.created_success', 'Tenant created successfully'), type: 'success' })
      }
      setValues(initialState)
      setErrors({})
      onSuccess && onSuccess()
    } catch (error) {
      const apiMsg = extractApiError(error)
      addToast({ message: apiMsg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        setBuildingsLoading(true)
        const data = await getBuildings({ is_active: true, page_size: 1000 })
        // Support both paginated and list responses
        const results = Array.isArray(data) ? data : (data?.results || [])
        // Filter by permission - only include buildings user can view
        const permitted = results.filter((b) => b && b.id != null && can('buildings', 'view', b.id))
        const opts = permitted.map((b) => ({ value: String(b.id), label: b.name || tr('tenants.building_fallback', 'Building #{{id}}', { id: b.id }) }))
        setBuildingOptions(opts)
        // If current selection is not permitted, clear it
        if (values.building && !opts.some((o) => String(o.value) === String(values.building))) {
          setValues((v) => ({ ...v, building: '' }))
        }
      } catch (e) {
        addToast({ message: tr('tenants.errors.load_buildings_failed', 'Failed to load buildings'), type: 'error' })
      } finally {
        setBuildingsLoading(false)
      }
    }
    loadBuildings()
  }, [addToast])

  // Prefill when editing
  useEffect(() => {
    if (!tenant) {
      setValues(initialState)
      setErrors({})
      return
    }
    const dob = tenant.date_of_birth ? new Date(tenant.date_of_birth) : null
    setValues({
      full_name: tenant.full_name || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      gender: tenant.gender || '',
      date_of_birth: isNaN(dob) ? null : dob,
      is_active: tenant.is_active !== false,
      building: tenant.building ? String(tenant.building) : (tenant.building_id ? String(tenant.building_id) : ''),
      address_line: tenant.address_line || '',
      city: tenant.city || '',
      state: tenant.state || '',
      pincode: tenant.pincode || '',
      id_proof_type: tenant.id_proof_type || '',
      id_proof_number: tenant.id_proof_number || '',
      photo: null,
      id_proof_document: null,
    })
    setErrors({})
  }, [tenant])

  const editing = Boolean(tenant)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card padding="md" className="bg-white">
        <div className="mb-4">
          <h4 className="text-base sm:text-lg font-semibold text-gray-900">{tr('tenants.basic_information', 'Basic Information')}</h4>
          <p className="text-xs sm:text-sm text-gray-500">{tr('tenants.basic_information_subtitle', 'Enter the tenant\'s personal details.')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{tr('tenants.building', 'Building')} *</label>
            <Select
              value={values.building}
              onChange={(e) => setValues((v) => ({ ...v, building: e.target.value }))}
              placeholder={buildingsLoading ? tr('tenants.loading_buildings', 'Loading buildings...') : tr('tenants.select_building', 'Select building')}
              options={buildingOptions}
              disabled={buildingsLoading}
            />
            {errors.building && (
              <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.building}</p>
            )}
          </div>
          <Input id="full_name" name="full_name" label={tr('tenants.full_name', 'Full Name') + " *"} value={values.full_name} onChange={onChange} required error={errors.full_name} leftIcon={FiUser} placeholder={tr('tenants.placeholders.full_name', 'Enter full name')} />
          <Input id="phone" name="phone" label={tr('tenants.phone', 'Phone') + " *"} value={values.phone} onChange={onChange} placeholder={tr('tenants.placeholders.phone', '10 digits')} inputMode="numeric" error={errors.phone} leftIcon={FiPhone} />
          <Input id="email" type="email" name="email" label={tr('tenants.email', 'Email')} value={values.email} onChange={onChange} leftIcon={FiMail} placeholder={tr('tenants.placeholders.email', 'name@example.com')} />
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{tr('tenants.gender', 'Gender')} *</label>
            <Select
              value={values.gender}
              onChange={(e) => setValues((v) => ({ ...v, gender: e.target.value }))}
              placeholder={tr('tenants.select_gender', 'Select gender')}
              options={[
                { value: 'male', label: tr('tenants.gender_options.male', 'Male') },
                { value: 'female', label: tr('tenants.gender_options.female', 'Female') },
                { value: 'other', label: tr('tenants.gender_options.other', 'Other') },
              ]}
            />
            {errors.gender && (
              <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.gender}</p>
            )}
          </div>
          <UIDatePicker
            selected={values.date_of_birth}
            onChange={(date) => {
              setValues((v) => ({ ...v, date_of_birth: date }))
              if (errors.date_of_birth) setFieldError('date_of_birth', '')
            }}
            label={tr('tenants.date_of_birth', 'Date of Birth')}
            placeholderText={tr('tenants.placeholders.date_of_birth', 'dd/mm/yyyy')}
            maxDate={new Date()}
            isClearable
            error={errors.date_of_birth}
          />
        </div>
      </Card>

      {editing && (
        <Card padding="md" className="bg-white">
          <div className="mb-4">
            <h4 className="text-base sm:text-lg font-semibold text-gray-900">{tr('tenants.address', 'Address')}</h4>
            <p className="text-xs sm:text-sm text-gray-500">{tr('tenants.address_subtitle', 'Update the tenant\'s address.')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="address_line" name="address_line" label={tr('tenants.address_line', 'Address Line')} value={values.address_line} onChange={onChange} placeholder={tr('tenants.placeholders.address_line', 'Street, Area')} />
            <Input id="city" name="city" label={tr('tenants.city', 'City')} value={values.city} onChange={onChange} />
            <Input id="state" name="state" label={tr('tenants.state', 'State')} value={values.state} onChange={onChange} />
            <Input id="pincode" name="pincode" label={tr('tenants.pincode', 'PIN Code')} value={values.pincode} onChange={onChange} inputMode="numeric" placeholder={tr('tenants.placeholders.pincode', '6 digits')} />
          </div>
        </Card>
      )}

      {editing && (
        <Card padding="md" className="bg-white">
          <div className="mb-4">
            <h4 className="text-base sm:text-lg font-semibold text-gray-900">{tr('tenants.kyc_files', 'KYC & Files')}</h4>
            <p className="text-xs sm:text-sm text-gray-500">{tr('tenants.kyc_files_subtitle', 'Upload or update ID proof and photo.')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="id_proof_type" name="id_proof_type" label={tr('tenants.id_proof_type', 'ID Proof Type')} value={values.id_proof_type} onChange={onChange} placeholder={tr('tenants.placeholders.id_proof_type', 'Aadhaar / PAN / Passport')} />
            <Input id="id_proof_number" name="id_proof_number" label={tr('tenants.id_proof_number', 'ID Proof Number')} value={values.id_proof_number} onChange={onChange} />
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{tr('tenants.photo', 'Photo')}</label>
              <input type="file" name="photo" accept="image/*" onChange={onChange} className="block w-full text-xs sm:text-sm" />
              {tenant?.photo && (
                <img src={resolveMediaUrl(tenant.avatar_url || tenant.avatar || tenant.photo)} alt={tr('tenants.current_photo', 'Current')} className="mt-2 h-20 w-20 object-cover rounded border" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              )}
              <p className="mt-1 text-[11px] text-gray-500">{tr('tenants.photo_hint', 'Max 4MB. JPG/PNG/WEBP.')}</p>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{tr('tenants.id_proof_document', 'ID Proof Document')}</label>
              <input type="file" name="id_proof_document" accept="image/*,application/pdf" onChange={onChange} className="block w-full text-xs sm:text-sm" />
              {tenant?.id_proof_document && (
                <a href={resolveMediaUrl(tenant.id_proof_document)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-blue-600 hover:underline text-xs">{tr('tenants.view_current_document', 'View current document')}</a>
              )}
              <p className="mt-1 text-[11px] text-gray-500">{tr('tenants.id_proof_hint', 'Images up to 4MB or PDF up to 2MB.')}</p>
            </div>
          </div>
        </Card>
      )}

      {editing && (
        <Card padding="md" className="bg-white">
          <div className="mb-2">
            <h4 className="text-base sm:text-lg font-semibold text-gray-900">{tr('tenants.status', 'Status')}</h4>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={!!values.is_active} onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))} />
            <span className="text-sm text-gray-800">{tr('tenants.active', 'Active')}</span>
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onSuccess && onSuccess()} disabled={loading}>{tr('common.cancel', 'Cancel')}</Button>
        <PermissionButton
          type="submit"
          module="tenants"
          action={tenant ? 'edit' : 'add'}
          scopeId={values.building || 'global'}
          loading={loading}
          reason={tenant ? tr('tenants.permission_edit_deny', "You don't have permission to update tenants for this building.") : tr('tenants.permission_add_deny', "You don't have permission to add tenants.")}
          denyMessage={tenant ? tr('tenants.permission_edit_deny', 'Permission denied: cannot update tenants for this building.') : tr('tenants.permission_add_deny', 'Permission denied: cannot add tenants.')}
        >
          {tenant ? tr('tenants.save_changes', 'Save Changes') : tr('tenants.save_tenant', 'Save Tenant')}
        </PermissionButton>
      </div>
    </form>
  )
}

export default TenantForm