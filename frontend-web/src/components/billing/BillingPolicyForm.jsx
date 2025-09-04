import React from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import Select from '../ui/Select'
import SearchableSelect from '../ui/SearchableSelect'
import { getBuildings } from '../../services/properties'
import { listTenants } from '../../services/tenants'
import { createBillingPolicy, updateBillingPolicy } from '../../services/tenants'
import { useCan } from '../../context/AuthContext'

const SCOPE_OPTIONS = [
  { value: 'org', label: 'Organization' },
  { value: 'building', label: 'Building' },
  { value: 'tenant', label: 'Tenant' },
]
const CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
]
const DUE_DAY_TYPE_OPTIONS = [
  { value: 'anniversary', label: 'Check-in Date' },
  { value: 'fixed_dom', label: 'Fixed day of month' },
]
const AMOUNT_SOURCE_OPTIONS = [
  { value: 'stay', label: 'Stay monthly_rent' },
  { value: 'room', label: 'Room monthly_rent' },
  { value: 'fixed', label: 'Fixed amount' },
]

const toInt = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : ''
}

const toDecimal = (v) => {
  if (v === '' || v === null || v === undefined) return ''
  const n = Number(v)
  return Number.isFinite(n) ? n : ''
}

const BillingPolicyForm = ({ initialValue, onCancel, onSuccess }) => {
  const { can } = useCan()
  const [values, setValues] = React.useState(() => ({
    scope: initialValue?.scope || 'org',
    building: initialValue?.building || initialValue?.building_id || null,
    tenant: initialValue?.tenant || initialValue?.tenant_id || null,
    billing_cycle: initialValue?.billing_cycle || 'monthly',
    due_day_type: initialValue?.due_day_type || 'anniversary',
    fixed_day: initialValue?.fixed_day ?? '',
    weekly_weekday: initialValue?.weekly_weekday ?? '',
    grace_days: initialValue?.grace_days ?? 3,
    remind_before_days: Array.isArray(initialValue?.remind_before_days) ? initialValue.remind_before_days : [3, 1],
    overdue_repeat_days: initialValue?.overdue_repeat_days ?? 3,
    proration: initialValue?.proration || 'none',
    amount_source: initialValue?.amount_source || 'stay',
    fixed_amount: initialValue?.fixed_amount ?? '',
    auto_generate_invoice: Boolean(initialValue?.auto_generate_invoice),
  }))
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [formError, setFormError] = React.useState('')
  const [buildings, setBuildings] = React.useState([])
  const [tenants, setTenants] = React.useState([])
  const [loadingBuildings, setLoadingBuildings] = React.useState(false)
  const [loadingTenants, setLoadingTenants] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  const handleChange = (key, val) => setValues(v => ({ ...v, [key]: val }))

  // Load buildings and tenants for searchable selects
  React.useEffect(() => {
    let alive = true
    const loadBuildings = async () => {
      try {
        setLoadingBuildings(true)
        const res = await getBuildings({ page_size: 200 })
        const list = Array.isArray(res) ? res : (res?.results || [])
        // RBAC: include only buildings the user can view
        const permitted = list.filter((b) => b && b.id != null && can('buildings', 'view', b.id))
        if (!alive) return
        const opts = permitted.map((b) => ({ value: Number(b.id), label: b.name || b.title || `Building #${b.id}` }))
        setBuildings(opts)
        // Auto-select if only one option and scope is building and nothing chosen yet
        if (opts.length === 1 && (values.scope === 'building') && (values.building == null)) {
          setValues((v) => ({ ...v, building: opts[0].value }))
        }
      } catch (_) { /* ignore */ }
      finally { if (alive) setLoadingBuildings(false) }
    }
    const loadTenants = async () => {
      try {
        setLoadingTenants(true)
        const list = await listTenants({ page_size: 200 })
        if (!alive) return
        const opts = (Array.isArray(list) ? list : []).map((t) => ({ value: Number(t.id), label: t.full_name || t.name || `Tenant #${t.id}` }))
        setTenants(opts)
      } catch (_) { /* ignore */ }
      finally { if (alive) setLoadingTenants(false) }
    }
    loadBuildings()
    loadTenants()
    return () => { alive = false }
  }, [can])

  const getFieldError = (k) => {
    if (!submitted) return ''
    if (values.scope === 'building' && k === 'building' && !values.building) return 'Building is required.'
    if (values.scope === 'tenant' && k === 'tenant' && !values.tenant) return 'Tenant is required.'
    if (values.due_day_type === 'fixed_dom' && k === 'fixed_day') {
      const d = Number(values.fixed_day)
      if (!Number.isFinite(d) || d < 1 || d > 31) return 'Enter a day between 1 and 31.'
    }
    if (values.billing_cycle === 'weekly' && k === 'weekly_weekday') {
      const w = Number(values.weekly_weekday)
      if (!Number.isFinite(w) || w < 0 || w > 6) return 'Weekday must be 0 (Mon) to 6 (Sun).'
    }
    if (values.amount_source === 'fixed' && k === 'fixed_amount') {
      const a = Number(values.fixed_amount)
      if (!Number.isFinite(a) || a < 0) return 'Enter a valid non-negative amount.'
    }
    return ''
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    setSaving(true)
    setError('')
    setFormError('')
    setSubmitted(true)
    try {
      // Basic validation
      if (values.scope === 'building' && !values.building) {
        setFormError('Please select a Building')
        return
      }
      if (values.scope === 'tenant' && !values.tenant) {
        setFormError('Please select a Tenant')
        return
      }
      if (values.amount_source === 'fixed' && (values.fixed_amount === '' || values.fixed_amount === null)) {
        setFormError('Please enter a Fixed Amount')
        return
      }

      const payload = {
        scope: values.scope,
        building: values.scope === 'building' ? (values.building || null) : null,
        tenant: values.scope === 'tenant' ? (values.tenant || null) : null,
        billing_cycle: values.billing_cycle,
        due_day_type: values.due_day_type,
        fixed_day: values.due_day_type === 'fixed_dom' ? toInt(values.fixed_day) : null,
        weekly_weekday: values.billing_cycle === 'weekly' ? toInt(values.weekly_weekday) : null,
        grace_days: toInt(values.grace_days) || 0,
        remind_before_days: (Array.isArray(values.remind_before_days) ? values.remind_before_days : String(values.remind_before_days).split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n))),
        overdue_repeat_days: toInt(values.overdue_repeat_days) || 0,
        proration: values.proration || 'none',
        amount_source: values.amount_source,
        fixed_amount: values.amount_source === 'fixed' ? toDecimal(values.fixed_amount) : null,
        auto_generate_invoice: Boolean(values.auto_generate_invoice),
      }
      if (initialValue?.id) {
        await updateBillingPolicy(initialValue.id, payload)
      } else {
        await createBillingPolicy(payload)
      }
      onSuccess?.()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to save policy')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div> : null}
      {formError ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{formError}</div> : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select label="Scope" value={values.scope} onChange={(e) => handleChange('scope', e.target.value)} options={SCOPE_OPTIONS} />
        <Select label="Billing Cycle" value={values.billing_cycle} onChange={(e) => handleChange('billing_cycle', e.target.value)} options={CYCLE_OPTIONS} />

        {values.scope === 'building' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
            <SearchableSelect
              options={buildings}
              value={values.building}
              onChange={(opt) => handleChange('building', opt?.value ?? null)}
              placeholder="Search building by name"
              loading={loadingBuildings}
              searchFields={["label"]}
            />
            {getFieldError('building') ? <p className="mt-1 text-xs text-red-600">{getFieldError('building')}</p> : <p className="mt-1 text-xs text-gray-500">Only buildings you can access are shown.</p>}
          </div>
        )}
        {values.scope === 'tenant' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
            <SearchableSelect
              options={tenants}
              value={values.tenant}
              onChange={(opt) => handleChange('tenant', opt?.value ?? null)}
              placeholder="Search tenant by name"
              loading={loadingTenants}
              searchFields={["label", "full_name"]}
            />
            {getFieldError('tenant') ? <p className="mt-1 text-xs text-red-600">{getFieldError('tenant')}</p> : null}
          </div>
        )}

        <Select label="Due Day Type" value={values.due_day_type} onChange={(e) => handleChange('due_day_type', e.target.value)} options={DUE_DAY_TYPE_OPTIONS} />
        {values.due_day_type === 'fixed_dom' && (
          <Input
            label={'Day of Month'}
            type="number"
            min={1}
            max={31}
            value={values.fixed_day ?? ''}
            placeholder={'1-31'}
            onChange={(e) => handleChange('fixed_day', toInt(e.target.value))}
          />
        )}
        {values.billing_cycle === 'weekly' && (
          <Input
            label={'Weekday (Mon=0 … Sun=6)'}
            type="number"
            min={0}
            max={6}
            value={values.weekly_weekday ?? ''}
            placeholder={'0=Mon … 6=Sun'}
            onChange={(e) => handleChange('weekly_weekday', toInt(e.target.value))}
          />
        )}
        {(values.due_day_type === 'fixed_dom' || values.billing_cycle === 'weekly') && (
          <div className="sm:col-span-2 -mt-2">
            {getFieldError(values.due_day_type === 'fixed_dom' ? 'fixed_day' : 'weekly_weekday') ? (
              <p className="text-xs text-red-600">{getFieldError(values.due_day_type === 'fixed_dom' ? 'fixed_day' : 'weekly_weekday')}</p>
            ) : values.due_day_type === 'fixed_dom' ? (
              <p className="text-xs text-gray-500">Fixed day uses 1-31.</p>
            ) : (
              <p className="text-xs text-gray-500">For weekly cycle, set weekday Mon=0 … Sun=6.</p>
            )}
          </div>
        )}

        <Input label="Grace Days" type="number" min={0} max={30} placeholder="e.g., 3" value={values.grace_days ?? ''} onChange={(e) => handleChange('grace_days', toInt(e.target.value))} />
        <Input label="Remind Before Days (CSV)" value={Array.isArray(values.remind_before_days) ? values.remind_before_days.join(',') : values.remind_before_days} onChange={(e) => handleChange('remind_before_days', e.target.value)} placeholder="e.g., 3,1" />
        <Input label="Overdue Reminder Repeat (days)" type="number" min={0} max={30} placeholder="e.g., 3" value={values.overdue_repeat_days ?? ''} onChange={(e) => handleChange('overdue_repeat_days', toInt(e.target.value))} />

        <Select label="Amount Source" value={values.amount_source} onChange={(e) => handleChange('amount_source', e.target.value)} options={AMOUNT_SOURCE_OPTIONS} />
        {values.amount_source === 'fixed' && (
          <Input label="Fixed Amount" type="number" min={0} step="0.01" placeholder="e.g., 15000" value={values.fixed_amount ?? ''} onChange={(e) => handleChange('fixed_amount', toDecimal(e.target.value))} />
        )}
        {values.amount_source === 'fixed' && (
          <div className="sm:col-span-2 -mt-2">
            {getFieldError('fixed_amount') ? <p className="text-xs text-red-600">{getFieldError('fixed_amount')}</p> : <p className="text-xs text-gray-500">Specify a fixed monthly amount (currency as per organization settings).</p>}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={values.auto_generate_invoice} onChange={(e) => handleChange('auto_generate_invoice', e.target.checked)} />
          Auto-generate invoices
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving} loading={saving}>{initialValue?.id ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  )
}

export default BillingPolicyForm
