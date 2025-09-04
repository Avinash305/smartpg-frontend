import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { emitToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'

export default function LanguageSettings() {
  const { t, i18n } = useTranslation()
  const supported = [
    { code: 'en', name: 'English' },
    { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
    { code: 'hi', name: 'Hindi (हिन्दी)' },
    { code: 'mr', name: 'Marathi (मराठी)' },
    { code: 'ta', name: 'Tamil (தமிழ்)' },
    { code: 'te', name: 'Telugu (తెలుగు)' },
  ]

  // Normalize incoming code: treat 'ka' as 'kn'
  const normalizeLang = (code) => {
    const c = String(code || 'en').toLowerCase()
    return c === 'ka' ? 'kn' : c
  }

  const { currentUser, refreshCurrentUser } = useAuth()
  const [lang, setLang] = useState('en')
  const [saving, setSaving] = useState(false)

  // Initialize from user profile; fallback to previous localStorage or 'en'
  useEffect(() => {
    const fromProfile = normalizeLang(currentUser?.language)
    const fromLocal = normalizeLang(localStorage.getItem('app_language'))
    const initial = normalizeLang(fromProfile || fromLocal || 'en')
    setLang(initial)
    try { localStorage.setItem('app_language', initial) } catch {}
    try { if (typeof document !== 'undefined') document.documentElement.lang = initial } catch {}
    try { i18n?.changeLanguage?.(initial) } catch {}
  }, [currentUser])

  const onSave = async () => {
    if (!currentUser?.id) {
      emitToast({ type: 'error', message: t('toasts.must_login') })
      return
    }
    setSaving(true)
    try {
      const toSave = normalizeLang(lang)
      await axios.patch(`/users/${currentUser.id}/`, { language: toSave })
      // Optional: keep localStorage in sync for any legacy reads
      try { localStorage.setItem('app_language', toSave) } catch {}
      await refreshCurrentUser()
      emitToast({ type: 'success', message: t('toasts.language_saved') })
    } catch (e) {
      const msg = e?.response?.data?.detail || t('toasts.save_failed')
      emitToast({ type: 'error', message: msg })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{t('settings.language.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('settings.language.subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('settings.language.label')}</label>
          <select
            name="language"
            value={lang}
            onChange={(e) => {
              const nextRaw = e.target.value
              const next = normalizeLang(nextRaw)
              setLang(next)
              try { localStorage.setItem('app_language', next) } catch {}
              try { if (typeof document !== 'undefined') document.documentElement.lang = next } catch {}
              try { i18n?.changeLanguage?.(next) } catch {}
            }}
            className="mt-1 w-full border rounded-md px-3 py-2"
            disabled={saving}
          >
            {supported.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
          {currentUser?.language && (
            <p className="text-xs text-gray-500 mt-1">{t('settings.language.current')}: {normalizeLang(currentUser.language)}</p>
          )}
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-60">
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  )
}