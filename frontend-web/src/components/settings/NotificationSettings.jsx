import React, { useEffect, useState } from 'react'
import { emitToast } from '../../context/ToastContext'

// Local storage keys
const LS_KEYS = {
  autoMarkOnClose: 'notif_auto_mark_on_close',
  lastSeen: 'notif_last_seen',
}

const DEFAULTS = {
  autoMarkOnClose: true,
}

export default function NotificationSettings() {
  const [autoMarkOnClose, setAutoMarkOnClose] = useState(DEFAULTS.autoMarkOnClose)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEYS.autoMarkOnClose)
      setAutoMarkOnClose(v == null ? DEFAULTS.autoMarkOnClose : v === 'true')
    } catch {}
    setLoading(false)
  }, [])

  const savePrefs = () => {
    setSaving(true)
    try {
      localStorage.setItem(LS_KEYS.autoMarkOnClose, String(!!autoMarkOnClose))
      emitToast({ type: 'success', message: 'Notification preference saved.' })
    } catch (e) {
      emitToast({ type: 'error', message: 'Failed to save preference.' })
    } finally {
      setSaving(false)
    }
  }

  const markAllReadNow = () => {
    try {
      localStorage.setItem(LS_KEYS.lastSeen, new Date().toISOString())
      emitToast({ type: 'success', message: 'All notifications marked as read for this device.' })
    } catch (e) {
      emitToast({ type: 'error', message: 'Failed to update read state.' })
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        <p className="text-sm text-gray-500 mt-1">Simple in-app notification preference</p>
      </div>

      <div className={`space-y-3 ${loading ? 'opacity-60' : 'opacity-100'}`}>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!autoMarkOnClose}
            onChange={(e) => setAutoMarkOnClose(e.target.checked)}
            disabled={loading || saving}
            className="h-4 w-4"
          />
          <span className="text-sm text-gray-800">Mark notifications as read when closing the bell dropdown</span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 justify-between items-center">
        <button
          type="button"
          onClick={markAllReadNow}
          className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md bg-white hover:bg-gray-50"
        >
          Mark all read now
        </button>
        <button
          type="button"
          onClick={savePrefs}
          disabled={loading || saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}