import React, { useEffect, useMemo, useState } from 'react'
import { createBuilding, patchBuilding, getBuildings } from '../../services/properties'
import { useAuth } from '../../context/AuthContext'
import { Button, PermissionButton } from '../ui/Button'
import { Input } from '../ui/Input'
import Select from '../ui/Select'
import { Checkbox } from '../ui/Checkbox'
import Label from '../ui/Label'
import { FiHome, FiMapPin, FiMap, FiHash, FiTag } from 'react-icons/fi'
import { useToast } from '../../context/ToastContext'
import { useCan } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'
import Tooltip from '../ui/Tooltip'

/**
 * BuildingForm
 * Props:
 * - mode: 'create' | 'edit'
 * - initialValues: building object for edit
 * - onCancel: () => void
 * - onSaved: (result) => void
 */
const BuildingForm = ({ mode = 'create', initialValues = null, onCancel, onSaved }) => {
  const { currentUser, getPlanLimit } = useAuth()
  const { addToast } = useToast()
  const isEdit = mode === 'edit'
  const { can } = useCan()
  const { t } = useTranslation()

  const defaults = useMemo(() => ({
    owner: currentUser?.id || null,
    manager: null,
    name: '',
    code: '',
    property_type: 'boys',
    address_line: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
    is_active: true,
  }), [currentUser?.id])

  const [form, setForm] = useState(defaults)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [activeCount, setActiveCount] = useState(0)
  const maxBuildings = useMemo(() => {
    try { return getPlanLimit?.('max_buildings', Infinity) ?? Infinity } catch { return Infinity }
  }, [getPlanLimit])

  useEffect(() => {
    if (isEdit && initialValues) {
      setForm({
        owner: initialValues.owner ?? currentUser?.id ?? null,
        manager: initialValues.manager ?? null,
        name: initialValues.name ?? '',
        code: initialValues.code ?? '',
        property_type: initialValues.property_type ?? 'boys',
        address_line: initialValues.address_line ?? '',
        city: initialValues.city ?? '',
        state: initialValues.state ?? '',
        pincode: String(initialValues.pincode ?? ''),
        notes: initialValues.notes ?? '',
        is_active: initialValues.is_active ?? true,
      })
    } else {
      setForm(defaults)
    }
  }, [isEdit, initialValues, defaults, currentUser?.id])

  // Load active buildings count once to guide UI gating
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const list = await getBuildings({ page_size: 1000 })
        if (!mounted) return
        const count = Array.isArray(list) ? list.filter(b => b?.is_active).length : 0
        setActiveCount(count)
        // In create mode, if limit reached, default new building to inactive to avoid immediate validation failure
        if (!isEdit && count >= maxBuildings) {
          setForm(prev => ({ ...prev, is_active: false }))
        }
      } catch (_) { /* ignore */ }
    }
    load()
    return () => { mounted = false }
  }, [isEdit, maxBuildings])

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    let next = value
    if (name === 'pincode') {
      next = String(value || '').replace(/\D/g, '').slice(0, 6)
    }
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : next }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const validate = () => {
    const v = {}
    if (!form.owner) v.owner = t('buildings.errors.owner_required')
    if (!form.name?.trim()) v.name = t('buildings.errors.name_required')
    if (!form.address_line?.trim()) v.address_line = t('buildings.errors.address_required')
    if (!form.city?.trim()) v.city = t('buildings.errors.city_required')
    if (!form.state?.trim()) v.state = t('buildings.errors.state_required')
    if (!/^\d{6}$/.test(form.pincode || '')) v.pincode = t('buildings.errors.pincode_invalid')
    return v
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    // If creating and plan limit reached, block submission and show message
    if (!isEdit && planLimitReached) {
      const msg = t('buildings.plan_limit_reached_cannot_add', { max: maxBuildings }) || `Your plan allows up to ${maxBuildings} active buildings. Deactivate one or upgrade to add more.`
      setError(msg)
      addToast({ message: msg, type: 'error' })
      return
    }
    // Permission gating
    const canSubmit = isEdit ? can('buildings', 'edit', initialValues?.id || 'global') : can('buildings', 'add', 'global')
    if (!canSubmit) {
      const msg = isEdit ? t('buildings.permissions.no_permission_edit_buildings') : t('buildings.permissions.no_permission_add_buildings')
      setError(msg)
      addToast({ message: msg, type: 'error' })
      return
    }
    const v = validate()
    if (Object.keys(v).length) {
      setErrors(v)
      setError(t('buildings.errors.please_fix_fields'))
      addToast({ message: t('buildings.errors.please_fix_fields'), type: 'error' })
      return
    }
    setErrors({})
    setSaving(true)
    setError('')
    try {
      if (isEdit && initialValues?.id) {
        const payload = { ...form }
        const res = await patchBuilding(initialValues.id, payload)
        addToast({ message: t('buildings.toasts.building_updated', { name: res?.name || form.name || t('common.success') }), type: 'success' })
        onSaved && onSaved(res)
      } else {
        const payload = { ...form }
        const res = await createBuilding(payload)
        addToast({ message: t('buildings.toasts.building_created', { name: res?.name || form.name || t('common.success') }), type: 'success' })
        onSaved && onSaved(res)
      }
    } catch (err) {
      const res = err?.response
      const data = res?.data
      const status = res?.status
      let msg = data?.detail
      const fieldErrors = {}
      if (data && typeof data === 'object') {
        if (Array.isArray(data?.non_field_errors)) {
          msg = msg || data.non_field_errors.join(' ')
        }
        Object.entries(data).forEach(([k, v]) => {
          if (k === 'detail' || k === 'non_field_errors') return
          if (Array.isArray(v)) fieldErrors[k] = v.join(' ')
          else if (typeof v === 'string') fieldErrors[k] = v
        })
      }
      if (!msg) msg = err.message || t('toasts.save_failed')
      if (Object.keys(fieldErrors).length) setErrors(prev => ({ ...prev, ...fieldErrors }))
      setError(msg)
      addToast({ message: msg, type: 'error' })
      // Friendly hint when activation may exceed plan limits
      const isActivating = !!form.is_active && (isEdit ? initialValues?.is_active === false : true)
      if (status === 400 && isActivating && (msg?.toLowerCase?.().includes('max') || msg?.toLowerCase?.().includes('limit') || fieldErrors.is_active)) {
        addToast({
          message: 'Activation failed. Your current plan may not allow more active buildings. Deactivate another building or upgrade your plan in Subscription settings.',
          type: 'warning',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const isLastActive = isEdit && !!initialValues?.is_active && form.is_active && activeCount <= 1
  const canActivateNow = (!form.is_active) ? (activeCount < maxBuildings) : true
  const planLimitReached = useMemo(() => Number.isFinite(maxBuildings) && activeCount >= maxBuildings, [activeCount, maxBuildings])

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {error && <div className="sm:col-span-2 text-red-600">{error}</div>}
      {!isEdit && planLimitReached && (
        <div className="sm:col-span-2 text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 text-sm">
          {t('buildings.plan_limit_reached_cannot_add', { max: maxBuildings }) || `Your plan allows up to ${maxBuildings} active buildings. Deactivate one or upgrade to add more.`}
        </div>
      )}

      <input type="hidden" name="owner" value={form.owner || ''} />

      <Input id="name" name="name" value={form.name} onChange={onChange} label={t('buildings.name')} placeholder={t('buildings.placeholders.name')} disabled={saving || !(isEdit ? can('buildings','edit', initialValues?.id || 'global') : can('buildings','add','global'))} error={errors.name} leftIcon={FiHome} />
      <Input id="address" name="address_line" value={form.address_line} onChange={onChange} label={t('buildings.address_label')} placeholder={t('buildings.placeholders.address')} className="sm:col-span-2" disabled={saving || !(isEdit ? can('buildings','edit', initialValues?.id || 'global') : can('buildings','add','global'))} error={errors.address_line} leftIcon={FiMapPin} />
      <Input id="city" name="city" value={form.city} onChange={onChange} label={t('buildings.city')} placeholder={t('buildings.placeholders.city')} disabled={saving || !(isEdit ? can('buildings','edit', initialValues?.id || 'global') : can('buildings','add','global'))} error={errors.city} leftIcon={FiMapPin} />
      <Input id="state" name="state" value={form.state} onChange={onChange} label={t('buildings.state')} placeholder={t('buildings.placeholders.state')} disabled={saving || !(isEdit ? can('buildings','edit', initialValues?.id || 'global') : can('buildings','add','global'))} error={errors.state} leftIcon={FiMap} />
      <Input id="pincode" name="pincode" value={form.pincode} onChange={onChange} label={t('buildings.pincode')} placeholder={t('buildings.placeholders.pincode')} inputMode="numeric" disabled={saving || !(isEdit ? can('buildings','edit', initialValues?.id || 'global') : can('buildings','add','global'))} error={errors.pincode} leftIcon={FiHash} />

      <div>
        <Label htmlFor="property_type">{t('buildings.property_type')}</Label>
        <Select
          id="property_type"
          value={form.property_type}
          onChange={(e) => onChange({ target: { name: 'property_type', value: e.target.value } })}
          options={[
            { value: 'boys', label: t('buildings.type_boys') },
            { value: 'girls', label: t('buildings.type_girls') },
            { value: 'coliving', label: t('buildings.type_coliving') },
          ]}
          disabled={saving || !(isEdit ? can('buildings','edit', initialValues?.id || 'global') : can('buildings','add','global'))}
          leftIcon={FiHome}
        />
      </div>
      <Input id="code" name="code" value={form.code} onChange={onChange} label={t('buildings.code')} placeholder={t('buildings.placeholders.code')} leftIcon={FiTag} disabled={saving || !(isEdit ? can('buildings','edit', initialValues?.id || 'global') : can('buildings','add','global'))} />

      <div className="sm:col-span-2">
        <Label htmlFor="notes">{t('buildings.notes_label')}</Label>
        <textarea
          id="notes"
          name="notes"
          value={form.notes}
          onChange={onChange}
          rows={3}
          placeholder={t('buildings.placeholders.notes')}
          disabled={saving || !(isEdit ? can('buildings','edit', initialValues?.id || 'global') : can('buildings','add','global'))}
          className="mt-1 flex w-full rounded-md border border-gray-300 py-2 px-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          name="is_active"
          checked={form.is_active}
          onChange={onChange}
          disabled={
            saving ||
            !(isEdit ? can('buildings','edit', initialValues?.id || 'global') : can('buildings','add','global')) ||
            (!form.is_active && !canActivateNow) ||
            (form.is_active && isLastActive)
          }
        />
        <span>{t('buildings.active')}</span>
      </div>
      {(!form.is_active && !canActivateNow) && (
        <div className="sm:col-span-2 text-xs text-amber-600 -mt-2">Cannot activate: plan limit reached. Deactivate another building or upgrade your plan.</div>
      )}
      {(form.is_active && isLastActive) && (
        <div className="sm:col-span-2 text-xs text-amber-600 -mt-2">Cannot deactivate the last active building.</div>
      )}
      {errors?.is_active && (
        <div className="sm:col-span-2 text-sm text-red-600 -mt-3">{errors.is_active}</div>
      )}

      <div className="sm:col-span-2 flex gap-2 justify-end">
        {(!isEdit && planLimitReached) ? (
          <Tooltip content={t('buildings.plan_limit_reached_cannot_add', { max: maxBuildings }) || `Your plan allows up to ${maxBuildings} active buildings. Deactivate one or upgrade to add more.`} position="top" zIndex={Number.MAX_SAFE_INTEGER}>
            <Button
              type="button"
              variant="primary"
              className="opacity-50 cursor-not-allowed"
              onClick={(e) => {
                e.preventDefault();
                addToast({ type: 'warning', message: t('buildings.plan_limit_reached_cannot_add', { max: maxBuildings }) || `Your plan allows up to ${maxBuildings} active buildings. Deactivate one or upgrade to add more.` })
              }}
            >
              {t('common.save')}
            </Button>
          </Tooltip>
        ) : (
          <PermissionButton
            loading={saving}
            type="submit"
            variant="primary"
            module="buildings"
            action={isEdit ? 'edit' : 'add'}
            scopeId={isEdit ? (initialValues?.id || 'global') : 'global'}
            reason={isEdit ? t('buildings.permissions.no_permission_edit_buildings') : t('buildings.permissions.no_permission_add_buildings')}
            denyMessage={isEdit ? t('buildings.permissions.permission_denied_cannot_edit_building') : t('buildings.permissions.permission_denied_cannot_add_buildings')}
            title={error || ''}
          >
            {isEdit ? t('buildings.update') : t('common.save')}
          </PermissionButton>
        )}
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>{t('buildings.cancel')}</Button>
        )}
      </div>
    </form>
  )
}

export default BuildingForm