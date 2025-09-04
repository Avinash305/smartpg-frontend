import React, { useEffect, useState, useRef } from 'react'
import { emitToast } from '../../context/ToastContext'
import { getInvoiceSettingsCurrent, createInvoiceSettings, updateInvoiceSettings } from '../../services/payments'
import { getBuildings } from '../../services/properties'

export default function InvoiceSettings() {
  const DEFAULT_INVOICE_SETTINGS = {
    generateType: 'automatic',
    period: 'monthly',
    cycle: 'checkin',
    cycleDay: 1,
    weeklyCycle: 'calendar',
    weeklyDay: 'mon',
    generateAnchor: 'start',
  }
  const [settings, setSettings] = useState(DEFAULT_INVOICE_SETTINGS)
  const [settingsId, setSettingsId] = useState(null)
  const [buildingId, setBuildingId] = useState('')
  const [buildingOptions, setBuildingOptions] = useState([])
  const [usingGlobalFallback, setUsingGlobalFallback] = useState(false) // kept for internal logic, but no UI notice
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmType, setConfirmType] = useState(null) // 'save' | 'reset'
  const didMountRef = useRef(false)

  useEffect(() => {
    const fetchSettings = async (bId) => {
      try {
        const params = bId ? { building: Number(bId) } : {}
        const data = await getInvoiceSettingsCurrent(params)
        const apiToUi = (s) => {
          const dayIdxToKey = ['mon','tue','wed','thu','fri','sat','sun']
          const weeklyDay = typeof s.weekly_custom_weekday === 'number' ? dayIdxToKey[s.weekly_custom_weekday] : 'mon'
          return {
            generateType: s.generate_type,
            period: s.period,
            cycle: s.monthly_cycle === 'calendar_month' ? 'calendar' : (s.monthly_cycle === 'custom_day' ? 'custom' : 'checkin'),
            cycleDay: s.monthly_custom_day || 1,
            weeklyCycle: s.weekly_cycle === 'calendar_week' ? 'calendar' : (s.weekly_cycle === 'custom' ? 'custom' : 'checkin'),
            weeklyDay,
            generateAnchor: s.generate_on,
          }
        }
        setSettings(apiToUi(data))
        setSettingsId(data.id)
        // Keep user's selected building; do not override with API response
        const requestedScoped = !!bId
        const responseScoped = data.building != null
        const fallback = requestedScoped && !responseScoped
        setUsingGlobalFallback(fallback)
        if (fallback) {
          // We got global settings back for a building request; clear id so save will create a new building-scoped record
          setSettingsId(null)
        }
      } catch (e) {
        try {
          const raw = localStorage.getItem('invoice_settings')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed && parsed.cycle === 'anniversary') parsed.cycle = 'checkin'
            setSettings(parsed)
          }
        } catch (_) {}
        setUsingGlobalFallback(false)
      }
    }
    fetchSettings(buildingId)
  }, [])

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const data = await getBuildings({ page_size: 1000 })
        const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
        setBuildingOptions(list.map(b => ({ id: b.id, name: b.name })))
        // Auto-select first building if none selected
        if (!buildingId && list.length > 0) {
          setBuildingId(String(list[0].id))
        }
      } catch (e) {
        // ignore
      }
    }
    loadBuildings()
  }, [])

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    // When user changes the building dropdown, fetch settings for that scope
    reloadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId])

  const reloadSettings = async () => {
    await (async () => {
      try {
        const params = buildingId ? { building: Number(buildingId) } : {}
        const data = await getInvoiceSettingsCurrent(params)
        const dayIdxToKey = ['mon','tue','wed','thu','fri','sat','sun']
        const weeklyDay = typeof data.weekly_custom_weekday === 'number' ? dayIdxToKey[data.weekly_custom_weekday] : 'mon'
        setSettings({
          generateType: data.generate_type,
          period: data.period,
          cycle: data.monthly_cycle === 'calendar_month' ? 'calendar' : (data.monthly_cycle === 'custom_day' ? 'custom' : 'checkin'),
          cycleDay: data.monthly_custom_day || 1,
          weeklyCycle: data.weekly_cycle === 'calendar_week' ? 'calendar' : (data.weekly_cycle === 'custom' ? 'custom' : 'checkin'),
          weeklyDay,
          generateAnchor: data.generate_on,
        })
        setSettingsId(data.id)
        // Keep current building scope selection; API may return global when none saved
        const requestedScoped = !!buildingId
        const responseScoped = data.building != null
        const fallback = requestedScoped && !responseScoped
        setUsingGlobalFallback(fallback)
        if (fallback) {
          setSettingsId(null)
        }
      } catch (e) {
        // If no settings exist for this building or request fails, keep scope and fallback to defaults
        setSettings(DEFAULT_INVOICE_SETTINGS)
        setSettingsId(null)
        setUsingGlobalFallback(false)
        emitToast({ type: 'info', message: 'No saved settings for this building. Using defaults until you save.' })
      }
    })()
  }

  const onChange = (e) => setSettings((s) => ({ ...s, [e.target.name]: e.target.value }))
  const onNumberChange = (e) => {
    const v = parseInt(e.target.value || '1', 10)
    setSettings((s) => ({ ...s, [e.target.name]: Math.max(1, Math.min(31, isNaN(v) ? 1 : v)) }))
  }

  const onSave = async () => {
    const uiToApi = (s) => {
      const dayKeyToIdx = { mon:0, tue:1, wed:2, thu:3, fri:4, sat:5, sun:6 }
      const base = {
        generate_type: s.generateType,
        period: s.period,
        monthly_cycle: s.cycle === 'calendar' ? 'calendar_month' : (s.cycle === 'custom' ? 'custom_day' : 'checkin_date'),
        monthly_custom_day: s.cycle === 'custom' ? s.cycleDay : null,
        weekly_cycle: s.weeklyCycle === 'calendar' ? 'calendar_week' : (s.weeklyCycle === 'custom' ? 'custom' : 'checkin_date'),
        weekly_custom_weekday: s.weeklyCycle === 'custom' ? (dayKeyToIdx[s.weeklyDay] ?? 0) : null,
        generate_on: s.generateAnchor,
      }
      return { ...base, building: Number(buildingId) }
    }
    const persist = async () => {
      try {
        setSaving(true)
        if (!buildingId) {
          emitToast({ type: 'error', message: 'Please select a building to save settings.' })
          return
        }
        // Basic validation depending on selections
        if (settings.period === 'monthly' && settings.cycle === 'custom') {
          const d = Number(settings.cycleDay)
          if (!Number.isInteger(d) || d < 1 || d > 31) {
            emitToast({ type: 'error', message: 'Please choose a valid custom day (1–31).' })
            return
          }
        }
        if (settings.period === 'weekly' && settings.weeklyCycle === 'custom' && !settings.weeklyDay) {
          emitToast({ type: 'error', message: 'Please choose a weekday for the custom weekly cycle.' })
          return
        }
        const payload = uiToApi(settings)
        let saved
        // Building-only: create if no id/fallback, else update
        if (!settingsId || usingGlobalFallback) {
          saved = await createInvoiceSettings(payload)
        } else {
          saved = await updateInvoiceSettings(settingsId, payload)
        }
        try { localStorage.setItem('invoice_settings', JSON.stringify(settings)) } catch (_) {}
        setSettingsId(saved?.id || settingsId)
        emitToast({ type: 'success', message: `Invoice settings saved for building #${buildingId}.` })
        // Re-fetch from server to ensure UI immediately reflects canonical, scoped settings
        await reloadSettings()
      } catch (e) {
        // Surface backend error details if available
        const serverMsg = e?.response?.data
        let msg = 'Failed to save invoice settings.'
        if (serverMsg && typeof serverMsg === 'object') {
          try {
            msg = Object.entries(serverMsg).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(' | ')
          } catch (_) { /* noop */ }
        } else if (typeof serverMsg === 'string') {
          msg = serverMsg
        } else if (e?.message) {
          msg = e.message
        }
        console.error('InvoiceSettings save error:', e)
        emitToast({ type: 'error', message: msg })
      } finally {
        setSaving(false)
      }
    }
    await persist()
  }

  const onReset = async () => {
    const uiToApi = (s) => {
      const dayKeyToIdx = { mon:0, tue:1, wed:2, thu:3, fri:4, sat:5, sun:6 }
      const base = {
        generate_type: s.generateType,
        period: s.period,
        monthly_cycle: s.cycle === 'calendar' ? 'calendar_month' : (s.cycle === 'custom' ? 'custom_day' : 'checkin_date'),
        monthly_custom_day: s.cycle === 'custom' ? s.cycleDay : null,
        weekly_cycle: s.weeklyCycle === 'calendar' ? 'calendar_week' : (s.weeklyCycle === 'custom' ? 'custom' : 'checkin_date'),
        weekly_custom_weekday: s.weeklyCycle === 'custom' ? (dayKeyToIdx[s.weeklyDay] ?? 0) : null,
        generate_on: s.generateAnchor,
      }
      return { ...base, building: Number(buildingId) }
    }
    const persistReset = async () => {
      try {
        setSaving(true)
        if (!buildingId) {
          emitToast({ type: 'error', message: 'Please select a building to reset settings.' })
          return
        }
        // Apply defaults locally immediately for responsiveness
        setSettings(DEFAULT_INVOICE_SETTINGS)
        const payload = uiToApi(DEFAULT_INVOICE_SETTINGS)
        let saved
        // When falling back to global for a building or no id, create a new building-scoped record
        if (!settingsId || usingGlobalFallback) {
          saved = await createInvoiceSettings(payload)
        } else {
          saved = await updateInvoiceSettings(settingsId, payload)
        }
        try { localStorage.setItem('invoice_settings', JSON.stringify(DEFAULT_INVOICE_SETTINGS)) } catch (_) {}
        setSettingsId(saved?.id || settingsId)
        emitToast({ type: 'success', message: `Invoice settings reset to defaults for building #${buildingId}.` })
        await reloadSettings()
      } catch (e) {
        const serverMsg = e?.response?.data
        let msg = 'Failed to reset invoice settings.'
        if (serverMsg && typeof serverMsg === 'object') {
          try { msg = Object.entries(serverMsg).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(' | ') } catch (_) {}
        } else if (typeof serverMsg === 'string') {
          msg = serverMsg
        } else if (e?.message) {
          msg = e.message
        }
        console.error('InvoiceSettings reset error:', e)
        emitToast({ type: 'error', message: msg })
      } finally {
        setSaving(false)
      }
    }
    await persistReset()
  }

  // Confirmation modal controls
  const requestSave = () => {
    setConfirmType('save')
    setShowConfirm(true)
  }
  const requestReset = () => {
    setConfirmType('reset')
    setShowConfirm(true)
  }
  const handleConfirm = async () => {
    setShowConfirm(false)
    if (confirmType === 'save') await onSave()
    if (confirmType === 'reset') await onReset()
    setConfirmType(null)
  }
  const handleCancel = () => {
    setShowConfirm(false)
    setConfirmType(null)
  }

  const days = [
    { v: 'sun', l: 'Sunday' },
    { v: 'mon', l: 'Monday' },
    { v: 'tue', l: 'Tuesday' },
    { v: 'wed', l: 'Wednesday' },
    { v: 'thu', l: 'Thursday' },
    { v: 'fri', l: 'Friday' },
    { v: 'sat', l: 'Saturday' },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm">
      <div className="mb-4 flex items-end gap-2">
        <div className="w-full md:w-64">
          <label className="block text-sm font-medium text-gray-700">Building scope (optional)</label>
          <select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2"
          >
            <option value="" disabled>Select a building…</option>
            {buildingOptions.map(b => (
              <option key={b.id} value={String(b.id)}>{b.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Select a building. Settings are saved per building.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Generate Type</label>
          <select
            name="generateType"
            value={settings.generateType}
            onChange={onChange}
            className="mt-1 w-full border rounded-md px-3 py-2"
          >
            <option value="manual">Manual</option>
            <option value="automatic">Automatic</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Period</label>
          <select
            name="period"
            value={settings.period}
            onChange={onChange}
            className="mt-1 w-full border rounded-md px-3 py-2"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {settings.period === 'monthly' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Invoice Cycle</label>
              <select
                name="cycle"
                value={settings.cycle}
                onChange={onChange}
                className="mt-1 w-full border rounded-md px-3 py-2"
              >
                <option value="calendar">Calendar Month (1st–end)</option>
                <option value="checkin">Check-in Date</option>
                <option value="custom">Custom Day of Month</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Controls which day invoices are generated for monthly billing.</p>
            </div>
            {settings.cycle === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Cycle Day (1–31)</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  name="cycleDay"
                  value={settings.cycleDay}
                  onChange={onNumberChange}
                  className="mt-1 w-full border rounded-md px-3 py-2"
                />
              </div>
            )}
          </>
        )}

        {settings.period === 'weekly' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Weekly Cycle</label>
              <select
                name="weeklyCycle"
                value={settings.weeklyCycle}
                onChange={onChange}
                className="mt-1 w-full border rounded-md px-3 py-2"
              >
                <option value="calendar">Calendar Week (Mon–Sun)</option>
                <option value="checkin">Check-in Date (weekday)</option>
                <option value="custom">Custom Day of Week</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Controls which weekday invoices are generated for weekly billing.</p>
            </div>
            {settings.weeklyCycle === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Day of Week</label>
                <select
                  name="weeklyDay"
                  value={settings.weeklyDay}
                  onChange={onChange}
                  className="mt-1 w-full border rounded-md px-3 py-2"
                >
                  {days.map((d) => (
                    <option key={d.v} value={d.v}>{d.l}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Generate On</label>
          <select
            name="generateAnchor"
            value={settings.generateAnchor}
            onChange={onChange}
            className="mt-1 w-full border rounded-md px-3 py-2"
          >
            <option value="start">Start of Period</option>
            <option value="end">End of Period</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Choose whether invoices are generated at the beginning or end of the selected billing period.</p>
        </div>
      </div>

      <div className="flex justify-between md:justify-end gap-2 mt-4">
        <button onClick={requestReset} disabled={saving} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-60">Reset to default</button>
        <button onClick={requestSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={handleCancel} />
          <div className="relative bg-white rounded-lg shadow-lg w-[90%] max-w-md p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm {confirmType === 'save' ? 'Save' : 'Reset'}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {confirmType === 'save' ? (
                <>This will overwrite invoice settings for <strong>{buildingId ? `building #${buildingId}` : 'the selected building'}</strong>.</>
              ) : (
                <>This will reset invoice settings to defaults for <strong>{buildingId ? `building #${buildingId}` : 'the selected building'}</strong>.</>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleConfirm} className="px-4 py-2 bg-blue-600 text-white rounded-md">Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div className="md:col-span-2 mt-2">
        <div className="rounded-md border border-blue-200 bg-blue-50 text-blue-800 p-3">
          <p className="text-sm font-semibold">Key notes</p>
          <ul className="mt-2 pl-1 text-xs space-y-2">
            <li>
              <p className="font-semibold">Generate Type</p>
              <ul className="list-disc pl-5 text-gray-700 space-y-0.5">
                <li>Automatic: system creates invoices on schedule</li>
                <li>Manual: you create them from Billing → Invoices</li>
                <li className="text-[11px] text-gray-600">Tip: Use Automatic unless you need strict manual control</li>
              </ul>
            </li>
            <li>
              <p className="font-semibold">Period</p>
              <ul className="list-disc pl-5 text-gray-700 space-y-0.5">
                <li>Daily</li>
                <li>Weekly</li>
                <li>Monthly</li>
                <li className="text-[11px] text-gray-600">Choose how often tenants are billed</li>
              </ul>
            </li>
            <li>
              <p className="font-semibold">Monthly cycle</p>
              <ul className="list-disc pl-5 text-gray-700 space-y-0.5">
                <li>Calendar: 1st to last day</li>
                <li>Check‑in: based on tenant’s check‑in date</li>
                <li>Custom: specific day (1–31)</li>
                <li className="text-[11px] text-gray-600">Short months auto‑adjust to the last valid day (e.g., Feb 30 → Feb 29/28)</li>
                <li className="text-[11px] text-gray-600">Check‑in on month‑end anchors to the month‑end</li>
              </ul>
            </li>
            <li>
              <p className="font-semibold">Weekly cycle</p>
              <ul className="list-disc pl-5 text-gray-700 space-y-0.5">
                <li>Calendar: Mon–Sun</li>
                <li>Check‑in: weekday of tenant’s check‑in</li>
                <li>Custom: pick a weekday</li>
                <li className="text-[11px] text-gray-600">Calendar week always starts Monday</li>
              </ul>
            </li>
            <li>
              <p className="font-semibold">Generate on</p>
              <ul className="list-disc pl-5 text-gray-700 space-y-0.5">
                <li>Start: create at period start</li>
                <li>End: create at period end</li>
                <li className="text-[11px] text-gray-600">Invoices are generated based on your app timezone (Asia/Kolkata)</li>
              </ul>
            </li>
            <li>
              <p className="font-semibold">Scope</p>
              <ul className="list-disc pl-5 text-gray-700 space-y-0.5">
                <li>Settings are saved per building</li>
                <li>This screen updates only the selected building</li>
                <li className="text-[11px] text-gray-600">Saving creates/updates a building override if none exists</li>
              </ul>
            </li>
            <li>
              <p className="font-semibold">Defaults</p>
              <ul className="list-disc pl-5 text-gray-700 space-y-0.5">
                <li>Automatic • Monthly • Check‑in date • Generate at Start</li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}