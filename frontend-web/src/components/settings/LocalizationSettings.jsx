import React, { useEffect, useState } from 'react'
import { emitToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { getLocalizationSettingsCurrent, createLocalizationSettings, updateLocalizationSettings } from '../../services/localization'
import { useTranslation } from 'react-i18next'

export default function LocalizationSettings() {
  const { t } = useTranslation()
  const { isPGAdmin, notifyLocalizationChanged } = useAuth()
  const [loc, setLoc] = useState({
    id: null,
    timezone: 'Asia/Kolkata',
    dateFormat: 'dd-MM-yyyy',
    timeFormat: 'hh:mm a',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const data = await getLocalizationSettingsCurrent()
        if (!mounted) return
        setLoc({
          id: data.id,
          timezone: data.timezone || 'Asia/Kolkata',
          dateFormat: data.date_format || 'dd-MM-yyyy',
          timeFormat: data.time_format || 'hh:mm a',
        })
        // Persist to localStorage for global usage
        try {
          if (data.timezone) localStorage.setItem('app_timezone', data.timezone)
          if (data.date_format) localStorage.setItem('app_date_format', data.date_format)
          if (data.time_format) localStorage.setItem('app_time_format', data.time_format)
        } catch {}
      } catch (err) {
        const status = err?.response?.status
        if (status === 404) {
          // No record yet: keep defaults
          if (mounted) setLoc((l) => ({ ...l, id: null }))
        } else {
          emitToast({ type: 'error', message: t('settings.localization.load_failed') })
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const onChange = (e) => setLoc((l) => ({ ...l, [e.target.name]: e.target.value }))

  const onConfirmSave = async () => {
    setSaving(true)
    try {
      const payload = {
        timezone: loc.timezone,
        date_format: loc.dateFormat,
        time_format: loc.timeFormat,
      }
      let saved
      if (loc.id) {
        saved = await updateLocalizationSettings(loc.id, payload)
      } else {
        saved = await createLocalizationSettings(payload)
      }
      setLoc((l) => ({
        ...l,
        id: saved.id,
        timezone: saved.timezone,
        dateFormat: saved.date_format,
        timeFormat: saved.time_format,
      }))
      // Persist to localStorage so UI reflects immediately
      try {
        if (saved.timezone) localStorage.setItem('app_timezone', saved.timezone)
        if (saved.date_format) localStorage.setItem('app_date_format', saved.date_format)
        if (saved.time_format) localStorage.setItem('app_time_format', saved.time_format)
      } catch {}
      emitToast({ type: 'success', message: t('settings.localization.saved_success') })
      // Notify app to re-render with new localization
      try { notifyLocalizationChanged() } catch {}
    } catch (e) {
      const detail = e?.response?.data?.detail
      emitToast({ type: 'error', message: detail || t('settings.localization.save_failed') })
    } finally {
      setSaving(false)
      setShowConfirm(false)
    }
  }

  const handleSaveClick = () => {
    if (!isPGAdmin || loading || saving) return
    setShowConfirm(true)
  }

  // Set timezone to browser-detected IANA zone
  const useBrowserTimezone = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz) setLoc((l) => ({ ...l, timezone: tz }))
    } catch {}
  }

  // Reset to default values (does not save to backend)
  const handleResetDefaults = () => {
    if (!isPGAdmin || loading || saving) return
    setLoc((l) => ({
      ...l,
      timezone: 'Asia/Kolkata',
      dateFormat: 'dd-MM-yyyy',
      timeFormat: 'hh:mm a',
    }))
    try {
      localStorage.setItem('app_timezone', 'Asia/Kolkata')
      localStorage.setItem('app_date_format', 'dd-MM-yyyy')
      localStorage.setItem('app_time_format', 'hh:mm a')
      // Notify app to re-render with new localization
      try { notifyLocalizationChanged() } catch {}
    } catch {}
  }

  // Live preview of selected formats (does not require save)
  const formatPreview = (iso, dateFormat, timeFormat, timeZone) => {
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return '—'
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).formatToParts(d)
      const map = Object.fromEntries(parts.map(p => [p.type, p.value]))
      const yyyy = map.year
      const MM = map.month
      const dd = map.day
      const HH = map.hour
      const mm = map.minute
      const ss = map.second
      const h24 = Number(HH)
      const h12 = h24 % 12 === 0 ? 12 : (h24 % 12)
      const ampm = h24 < 12 ? 'am' : 'pm'
      const pad2 = (v) => String(v).padStart(2, '0')
      // Month names for MMM/MMMM
      const monthShort = new Intl.DateTimeFormat('en', { timeZone, month: 'short' }).format(d)
      const monthLong = new Intl.DateTimeFormat('en', { timeZone, month: 'long' }).format(d)
      const pattern = timeFormat ? `${dateFormat} ${timeFormat}` : dateFormat
      return pattern
        .replace(/yyyy/g, yyyy)
        .replace(/MMMM/g, monthLong)
        .replace(/MMM/g, monthShort)
        .replace(/MM/g, MM)
        .replace(/dd/g, dd)
        .replace(/HH/g, pad2(HH))
        .replace(/hh/g, pad2(h12))
        .replace(/mm/g, mm)
        .replace(/ss/g, ss)
        .replace(/\ba\b/g, ampm)
    } catch {
      return '—'
    }
  }

  const commonTimezones = [
    'Asia/Kolkata',
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{t('settings.localization.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('settings.localization.subtitle')}</p>
        {!isPGAdmin && (
          <p className="text-xs text-amber-600 mt-1">{t('settings.localization.admin_only')}</p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-100">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('settings.localization.timezone')}</label>
          <select
            name="timezone"
            value={loc.timezone}
            onChange={onChange}
            disabled={loading || saving || !isPGAdmin}
            className="mt-1 w-full border rounded-md px-3 py-2"
          >
            {commonTimezones.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={useBrowserTimezone}
            disabled={loading || saving || !isPGAdmin}
            className="mt-2 text-xs text-blue-700 hover:underline"
          >
            {t('settings.localization.use_browser_timezone')}
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('settings.localization.date_format')}</label>
          <select
            name="dateFormat"
            value={loc.dateFormat}
            onChange={onChange}
            disabled={loading || saving || !isPGAdmin}
            className="mt-1 w-full border rounded-md px-3 py-2"
          >
            <option value="dd-MM-yyyy">DD-MM-YYYY</option>
            <option value="MM/dd/yyyy">MM/DD/YYYY</option>
            <option value="yyyy-MM-dd">YYYY-MM-DD</option>
            <option value="dd MMM yyyy">DD MMM YYYY</option>
            <option value="MMMM dd, yyyy">MMMM DD, YYYY</option>
            <option value="dd/MM/yyyy">DD/MM/YYYY</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('settings.localization.time_format')}</label>
          <select
            name="timeFormat"
            value={loc.timeFormat}
            onChange={onChange}
            disabled={loading || saving || !isPGAdmin}
            className="mt-1 w-full border rounded-md px-3 py-2"
          >
            <option value="hh:mm:ss a">hh:mm:ss am/pm</option>
            <option value="HH:mm">HH:mm (24h)</option>
            <option value="hh:mm a">hh:mm am/pm</option>
            <option value="HH:mm:ss">HH:mm:ss (24h)</option>
          </select>
        </div>
      </div>
      {/* Live preview */}
      <div className="mt-3 p-3 rounded-md bg-gray-50 border border-gray-200 text-sm">
        <span className="text-gray-600 mr-2">{t('settings.localization.preview')}:</span>
        <span className="font-medium">{formatPreview(new Date().toISOString(), loc.dateFormat, loc.timeFormat, loc.timezone)}</span>
      </div>
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-500">{loading ? t('settings.localization.loading') : ''}</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleResetDefaults} disabled={loading || saving || !isPGAdmin} className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md bg-white hover:bg-gray-50 disabled:opacity-60">
            {t('settings.localization.reset_defaults')}
          </button>
          <button onClick={handleSaveClick} disabled={loading || saving || !isPGAdmin} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-60">
            {saving ? t('settings.localization.saving') : t('settings.localization.save')}
          </button>
        </div>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4">
            <div className="p-4 border-b">
              <h3 className="text-base font-semibold text-gray-900">{t('settings.localization.confirm_title')}</h3>
            </div>
            <div className="p-4 text-sm text-gray-700">
              {t('settings.localization.confirm_message')}
            </div>
            <div className="px-4 py-3 flex justify-end gap-2 border-t">
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => setShowConfirm(false)}
                disabled={saving}
              >
                {t('settings.localization.cancel')}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
                onClick={onConfirmSave}
                disabled={saving}
              >
                {saving ? t('settings.localization.saving') : t('settings.localization.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}