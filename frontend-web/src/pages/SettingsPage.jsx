import React, { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import NotificationSettings from '../components/settings/NotificationSettings'
import LocalizationSettings from '../components/settings/LocalizationSettings'
import InvoiceSettings from '../components/settings/InvoiceSettings'
import LanguageSettings from '../components/settings/LanguageSettings'
import Subscription from '../components/settings/Subscription'

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
      active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
    }`}
  >
    {children}
  </button>
) 

const SettingsPage = () => {
  const tabs = useMemo(
    () => [
      { key: 'notifications', label: 'Notifications', component: <NotificationSettings /> },
      { key: 'localization', label: 'Localization', component: <LocalizationSettings /> },
      { key: 'invoices', label: 'Invoices', component: <InvoiceSettings /> },
      { key: 'language', label: 'Language', component: <LanguageSettings /> },
      { key: 'subscription', label: 'Subscription', component: <Subscription /> },
    ],
    []
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const [active, setActive] = useState(tabs[0].key)
  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && tabs.some((x) => x.key === t)) {
      setActive(t)
    }
  }, [searchParams, tabs])
  const ActiveComponent = useMemo(() => tabs.find((t) => t.key === active)?.component, [active, tabs])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and app preferences</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <TabButton
            key={t.key}
            active={active === t.key}
            onClick={() => {
              setActive(t.key)
              setSearchParams({ tab: t.key })
            }}
          >
            {t.label}
          </TabButton>
        ))}
      </div>

      <div>{ActiveComponent}</div>
    </div>
  )
}

export default SettingsPage