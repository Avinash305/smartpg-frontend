import React, { useMemo, useState, useEffect } from 'react'
import Label from '../ui/Label'
import { Button, PermissionButton } from '../ui/Button'
import { createFloor, updateFloor, getFloors, getBuildings } from '../../services/properties'
import { useToast } from '../../context/ToastContext'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '../ui/Checkbox'
import { useCan } from '../../context/AuthContext'

const FloorForm = ({ initialValues = {}, mode = 'create', onCancel = () => {}, onSaved = () => {}, buildingId }) => {
  // Backend requires: building (id), number (0..14), notes (optional)
  const { t } = useTranslation()
  const [form, setForm] = useState({
    number: initialValues.number ?? '',
    notes: initialValues.notes ?? '',
    building: '',
    is_active: initialValues.is_active ?? true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [buildings, setBuildings] = useState([])
  const [loadingBuildings, setLoadingBuildings] = useState(false)
  const normalizeBuildingId = (val) => {
    if (val && typeof val === 'object') return val.id ?? ''
    return val ?? ''
  }
  const selectedBuildingId = useMemo(() => (
    normalizeBuildingId(buildingId ?? initialValues.building ?? form.building)
  ), [buildingId, initialValues.building, form.building])
  const needsBuildingSelect = !normalizeBuildingId(buildingId) && !normalizeBuildingId(initialValues.building)
  const { addToast } = useToast()
  const { can } = useCan()

  const canToggleActive = useMemo(() => {
    const action = mode === 'edit' ? 'edit' : 'add'
    const scope = selectedBuildingId || 'global'
    return can('floors', action, scope)
  }, [can, mode, selectedBuildingId])

  useEffect(() => {
    if (needsBuildingSelect) {
      setLoadingBuildings(true)
      getBuildings({ is_active: true })
        .then((data) => {
          const arr = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
          setBuildings(arr)
        })
        .catch(() => setBuildings([]))
        .finally(() => setLoadingBuildings(false))
    }
  }, [needsBuildingSelect])

  const FLOOR_CHOICES = useMemo(() => (
    [{ value: 0, label: t('floors.floor_label_ground') || 'Ground Floor' },
      ...Array.from({ length: 14 }, (_, i) => {
        const n = i + 1
        const s = ['', 'st', 'nd', 'rd']
        const suffix = (s[n % 10] && ![11, 12, 13].includes(n)) ? s[n % 10] : 'th'
        return { value: n, label: `${n}${suffix} ${t('floors.floor_label_suffix') || 'Floor'}` }
      })
    ]
  ), [t])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!selectedBuildingId) newErrors.building = t('floors.errors.building_required') || 'Building is required'
    if (form.number === '' || form.number === null || form.number === undefined) {
      newErrors.number = t('floors.errors.number_required') || 'Number is required'
    } else if (isNaN(Number(form.number))) {
      newErrors.number = t('floors.errors.number_numeric') || 'Number must be numeric'
    } else if (Number(form.number) < 0 || Number(form.number) > 14) {
      newErrors.number = t('floors.errors.number_range') || 'Number must be between 0 and 14'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      // Client-side duplicate check to improve UX (backend still enforces uniqueness)
      if (mode !== 'edit' && selectedBuildingId) {
        const existing = await getFloors({ building: selectedBuildingId })
        const exists = existing?.results ? existing.results : existing
        if (Array.isArray(exists) && exists.some(f => Number(f.number) === Number(form.number))) {
          setErrors(prev => ({ ...prev, number: t('floors.errors.duplicate_for_building') || 'This floor already exists for the selected building.' }))
          return
        }
      }
      const payload = {
        number: Number(form.number),
        notes: form.notes,
        building: Number(selectedBuildingId),
        is_active: !!form.is_active,
      }
      let saved
      if (mode === 'edit' && initialValues?.id) {
        saved = await updateFloor(initialValues.id, payload)
      } else {
        saved = await createFloor(payload)
      }
      setSubmitError('')
      onSaved(saved)
    } catch (err) {
      const data = err?.response?.data
      if (data) {
        // Map common DRF error shapes
        const fieldErrs = {}
        if (typeof data === 'object') {
          if (data.number) fieldErrs.number = Array.isArray(data.number) ? data.number.join(' ') : String(data.number)
          if (data.building) fieldErrs.building = Array.isArray(data.building) ? data.building.join(' ') : String(data.building)
          if (data.non_field_errors) {
            const msg = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : String(data.non_field_errors)
            // If unique-together error, show on number field
            if (/unique/i.test(msg) || /building.*number/i.test(msg)) {
              fieldErrs.number = msg
            } else {
              setSubmitError(msg)
              addToast({ message: msg, type: 'error' })
            }
          }
          if (data.detail) {
            const msg = Array.isArray(data.detail) ? data.detail.join(' ') : String(data.detail)
            setSubmitError(msg)
            addToast({ message: msg, type: 'error' })
          }
        }
        setErrors(prev => ({ ...prev, ...fieldErrs }))
        if (!Object.keys(fieldErrs).length && typeof data === 'string') {
          setSubmitError(data)
          addToast({ message: data, type: 'error' })
        }
      } else {
        const msg = err?.message || (t('floors.save_failed') || 'Failed to save floor')
        setSubmitError(msg)
        addToast({ message: msg, type: 'error' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitError && (
        <div className="text-xs sm:text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
          {submitError}
        </div>
      )}
      <div className="grid grid-cols gap-4">
        {needsBuildingSelect && (
          <div>
            <Label htmlFor="building">{t('floors.building') || 'Building'}</Label>
            <select
              id="building"
              name="building"
              value={form.building}
              onChange={handleChange}
              required
              disabled={loadingBuildings}
              aria-invalid={!!errors.building}
              aria-describedby={errors.building ? 'building-error' : undefined}
              className={`flex h-9 sm:h-10 w-full rounded-md border ${errors.building ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="" disabled>{loadingBuildings ? (t('nav.loading') || 'Loading…') : (t('floors.placeholders.select_building') || 'Select building')}</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.building && <p id="building-error" className="mt-1 text-xs sm:text-sm text-red-600">{errors.building}</p>}
          </div>
        )}
        <div>
          <Label htmlFor="number">{t('floors.floor') || 'Floor'}</Label>
          <select
            id="number"
            name="number"
            value={form.number}
            onChange={handleChange}
            required
            aria-invalid={!!errors.number}
            aria-describedby={errors.number ? 'number-error' : undefined}
            className={`flex h-9 sm:h-10 w-full rounded-md border ${errors.number ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          >
            <option value="" disabled>{t('floors.placeholders.select_floor') || 'Select floor'}</option>
            {FLOOR_CHOICES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.number && <p id="number-error" className="mt-1 text-xs sm:text-sm text-red-600">{errors.number}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">{t('floors.notes') || 'Notes'}</Label>
          <textarea
            id="notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            placeholder={t('buildings.placeholders.notes') || 'Any additional information...'}
            aria-invalid={!!errors.notes}
            aria-describedby={errors.notes ? 'notes-error' : undefined}
            className={`flex w-full rounded-md border ${errors.notes ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
          {errors.notes && <p id="notes-error" className="mt-1 text-xs sm:text-sm text-red-600">{errors.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            name="is_active"
            checked={!!form.is_active}
            onChange={handleChange}
            disabled={!canToggleActive}
            title={!canToggleActive ? (t('floors.permissions.no_toggle_permission') || "You don't have permission to change floor active status for this building.") : undefined}
          />
          <span>{t('floors.active') || 'Active'}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>{t('settings.localization.cancel') || 'Cancel'}</Button>
        <PermissionButton
          type="submit"
          module="floors"
          action={mode === 'edit' ? 'edit' : 'add'}
          scopeId={selectedBuildingId || 'global'}
          loading={submitting}
          reason={mode === 'edit' ? (t('floors.permissions.reason_edit') || "You don't have permission to edit floors for this building.") : (t('floors.permissions.reason_add') || "You don't have permission to add floors.")}
          denyMessage={mode === 'edit' ? (t('floors.permissions.deny_edit') || 'Permission denied: cannot edit floors for this building.') : (t('floors.permissions.deny_add') || 'Permission denied: cannot add floors.')}
        >
          {mode === 'edit' ? (t('floors.buttons.save_changes') || 'Save Changes') : (t('floors.buttons.create_floor') || 'Create Floor')}
        </PermissionButton>
      </div>
    </form>
  )
}

export default FloorForm