import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { useColorScheme } from '../../theme/colorSchemes'
import { useTranslation } from 'react-i18next'

export default function TenantSnapshot({ title = 'Tenant Snapshot', total = 0, upIn = 0, upOut = 0, buildingLabel = 'All', recent = [], viewAllHref = '/tenants', scheme, selectedBuildings = [], className = '' }) {
  const { t } = useTranslation()
  const colors = useColorScheme(scheme)
  const [expanded, setExpanded] = useState(false)
  const listRef = useRef(null)
  const prevScrollTopRef = useRef(0)

  // Build a scoped link to Tenants list honoring selected buildings
  const viewAllScopedHref = (() => {
    try {
      const sel = Array.isArray(selectedBuildings) ? selectedBuildings.filter(Boolean).map(String) : []
      if (!sel.length) return viewAllHref
      if (sel.length === 1) return `${viewAllHref}?building=${encodeURIComponent(sel[0])}`
      return `${viewAllHref}?building__in=${encodeURIComponent(sel.join(','))}`
    } catch {
      return viewAllHref
    }
  })()

  useEffect(() => {
    if (!expanded) return
    const onDocMouseDown = (e) => {
      const el = listRef.current
      if (!el) return
      if (!el.contains(e.target)) {
        setExpanded(false)
        setTimeout(() => {
          try {
            const prev = Math.max(0, Number(prevScrollTopRef.current) || 0)
            el.scrollTo({ top: prev, behavior: 'smooth' })
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          } catch {}
        }, 0)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [expanded])

  const items = expanded ? recent : recent.slice(0, 2)

  return (
    <Card
      title={title || t('dashboard.tenant_snapshot.title')}
      actions={<Link to={viewAllScopedHref} className="text-sm text-indigo-600 hover:underline">{t('dashboard.tenant_snapshot.view_all')}</Link>}
      padding="sm"
      className={className}
    >
      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
        <div className={`flex items-center justify-between px-2 py-1 rounded border ${colors.accents?.sky?.bg || 'bg-sky-50'} border-sky-100 ${colors.accents?.sky?.text || 'text-sky-700'}`}><span>{t('dashboard.tenant_snapshot.total_tenants')}</span><span className="font-semibold">{total}</span></div>
        <div className={`flex items-center justify-between px-2 py-1 rounded border ${colors.accents?.emerald?.bg || 'bg-emerald-50'} border-emerald-100 ${colors.accents?.emerald?.text || 'text-emerald-700'}`}><span>{t('dashboard.tenant_snapshot.upcoming_checkins')}</span><span className="font-semibold">{upIn}</span></div>
        <div className={`flex items-center justify-between px-2 py-1 rounded border ${colors.accents?.amber?.bg || 'bg-amber-50'} border-amber-100 ${colors.accents?.amber?.text || 'text-amber-700'}`}><span>{t('dashboard.tenant_snapshot.upcoming_checkouts')}</span><span className="font-semibold">{upOut}</span></div>
      </div>
      <div>
        <div className="text-xs text-gray-500 mb-1">{t('dashboard.tenant_snapshot.recent_tenants')}</div>
        {recent.length ? (
          <ul ref={listRef} className={`divide-y divide-gray-100 ${expanded ? 'max-h-48 overflow-auto pr-1' : ''}`}>
            {items.map((tnt) => (
              <li key={tnt.id} className="py-1.5 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{tnt?.name || tnt?.full_name || `${tnt?.first_name || ''} ${tnt?.last_name || ''}`.trim() || `Tenant #${tnt.id}`}</div>
                  <div className="text-xs text-gray-500 truncate">{tnt?.email || tnt?.phone || ''}</div>
                </div>
                <Link to={`/tenants/${tnt.id}`} className="text-xs text-indigo-600 hover:underline flex-shrink-0">{t('dashboard.tenant_snapshot.open')}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">{t('dashboard.tenant_snapshot.no_tenants')}</div>
        )}
        {!expanded && recent.length > 2 && (
          <div className="mt-2">
            <button
              type="button"
              className="text-xs text-indigo-600 hover:underline"
              onClick={() => {
                try { prevScrollTopRef.current = listRef.current?.scrollTop || 0 } catch {}
                setExpanded(true)
                setTimeout(() => {
                  try { listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) } catch {}
                }, 0)
              }}
            >
              {t('dashboard.tenant_snapshot.view_more')}
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
