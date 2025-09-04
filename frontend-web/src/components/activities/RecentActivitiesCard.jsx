import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import activityService from '../../services/activity'
import ActivityItem from './ActivityItem'
import Card from '../ui/Card'
import { useTranslation } from 'react-i18next'

// Mirror Navbar helpers (keep in sync) but broaden detection across more shapes
const activityModule = (a) => {
  if (!a) return ''
  const m = a.meta || {}
  const fields = [
    a.module, m.module, m.type, a.type, a.category, m.category, a.model, m.model, a.resource, m.resource,
  ]
    .map((v) => (v == null ? '' : String(v).toLowerCase()))
    .filter(Boolean)

  // If any field already contains a known token, prefer that
  const tokens = ['payment','invoice','tenant','expense','building','property','room','floor','bed','booking','user','staff','account']
  for (const f of fields) {
    for (const tok of tokens) {
      if (f.includes(tok)) return tok === 'property' ? 'building' : tok
    }
  }

  // Heuristics from action/event/description text
  const text = [a.action, a.event, a.description, m.action, m.event, m.description]
    .map((v) => (v == null ? '' : String(v).toLowerCase()))
    .filter(Boolean)
    .join(' ')
  if (/payment/.test(text)) return 'payment'
  if (/invoice/.test(text)) return 'invoice'
  if (/booking|reserve/.test(text)) return 'booking'
  if (/\bfloor\b/.test(text)) return 'floor'
  if (/\broom\b/.test(text)) return 'room'
  if (/\bbed\b/.test(text)) return 'bed'
  if (/building|property/.test(text)) return 'building'
  if (/tenant|guest/.test(text)) return 'tenant'
  if (/expense|cost/.test(text)) return 'expense'

  // Fallback: inspect presence of nested objects
  const has = (k) => m[k] != null || a[k] != null
  if (has('payment')) return 'payment'
  if (has('invoice')) return 'invoice'
  if (has('booking')) return 'booking'
  if (has('floor')) return 'floor'
  if (has('room')) return 'room'
  if (has('bed')) return 'bed'
  if (has('building') || has('property')) return 'building'
  if (has('tenant')) return 'tenant'
  if (has('expense')) return 'expense'
  return ''
}
const isAllowedActivity = (a, allowedList) => {
  const mod = activityModule(a)
  const checks = Array.isArray(allowedList) && allowedList.length > 0 ? allowedList : [
    'payment','invoice','tenant','expense','building','property','room','floor','bed','booking','user','staff','account'
  ]
  if (!mod) {
    // If we can't classify, do a permissive check: allow if any token appears anywhere in the record
    const blob = JSON.stringify(a || {}).toLowerCase()
    return checks.some((k) => blob.includes(String(k)))
  }
  return checks.some((k) => mod === String(k) || mod.includes(String(k)))
}

// Extract a comparable timestamp (ms) from activity
const getTs = (a) => {
  const v = a?.timestamp || a?.created_at || a?.time || a?.updated_at
  const t = v ? new Date(v).getTime() : NaN
  return Number.isFinite(t) ? t : 0
}

// Attempt to resolve building id(s) from various shapes in activity/meta
const getActivityBuildingIds = (a) => {
  const m = a?.meta || {}
  const top = a || {}
  const pickId = (obj) => {
    if (!obj || typeof obj !== 'object') return undefined
    if (obj.id != null) return obj.id
    if (obj.building_id != null) return obj.building_id
    if (obj.property_id != null) return obj.property_id
    if (obj.buildingId != null) return obj.buildingId
    if (obj.propertyId != null) return obj.propertyId
    return undefined
  }
  const candidates = [
    // top-level
    top.building_id,
    top.property_id,
    top.buildingId,
    top.propertyId,
    top?.building?.id,
    top?.property?.id,
    // meta direct
    m.building_id,
    m.property_id,
    m.buildingId,
    m.propertyId,
    pickId(m.building),
    pickId(m.property),
    // nested shapes that may carry building id
    m.room?.building_id,
    m.room?.buildingId,
    m.floor?.building_id,
    m.floor?.buildingId,
    m.bed?.building_id,
    m.bed?.buildingId,
    // generic entity/target objects sometimes used in audit payloads
    pickId(m.entity),
    pickId(m.target),
  ].filter((v) => v != null)
  // Return unique string ids
  return Array.from(new Set(candidates.map((v) => String(v))))
}

const DEFAULT_ALLOWED = ['payment','invoice','tenant','expense','building','property','room','floor','bed','booking','user','staff','account']

const RecentActivitiesCard = ({
  userId,
  title,
  maxItems = 10,
  modules = DEFAULT_ALLOWED,
  selectedBuildings,
  debug = false,
  className,
  compact = false,
  detailed = false,
}) => {
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])

  // Stable keys to avoid infinite effect loops from changing object identities
  const selectedBuildingsKey = useMemo(() => {
    try { return JSON.stringify((selectedBuildings || []).map(String).sort()) } catch { return '' }
  }, [selectedBuildings])
  const modulesKey = useMemo(() => {
    const arr = (Array.isArray(modules) && modules.length > 0 ? modules : DEFAULT_ALLOWED)
    try { return JSON.stringify(arr.map(String).sort()) } catch { return '' }
  }, [modules])

  // Normalize selected building ids to Set of strings (memoized off stable key)
  const selSet = useMemo(() => new Set((selectedBuildings || []).map(String)), [selectedBuildingsKey])
  // Normalize allowed modules list (memoized off stable key)
  const allowedList = useMemo(() => (Array.isArray(modules) && modules.length > 0 ? modules.map(String) : DEFAULT_ALLOWED), [modulesKey])

  useEffect(() => {
    let alive = true
    const load = async () => {
      const uid = userId || currentUser?.id
      if (!uid) {
        setItems([])
        return
      }
      setLoading(true)
      try {
        const res = await activityService.getStaffActivities(uid)
        const all = Array.isArray(res?.data) ? res.data : []
        // Allowed modules only (includes property/building etc. for this card)
        const allowed = all.filter((a) => isAllowedActivity(a, allowedList))
        // Building filter
        const filtered = allowed.filter((a) => {
          if (!selSet.size) return true // no filter -> include all
          const bids = getActivityBuildingIds(a)
          if (!bids.length) return false
          return bids.some((id) => selSet.has(String(id)))
        })
        // Sort by timestamp desc and take latest N
        const sorted = filtered
          .slice()
          .sort((a, b) => getTs(b) - getTs(a))
          .slice(0, Math.max(1, Number(maxItems) || 10))
        if (debug) {
          try {
            // eslint-disable-next-line no-console
            console.debug('[RecentActivitiesCard]', { uid, total: all.length, allowed: allowed.length, filtered: filtered.length, shown: sorted.length })
          } catch {}
        }
        if (alive) setItems(sorted)
      } catch (e) {
        if (alive) setItems([])
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [userId, currentUser?.id, selectedBuildingsKey, modulesKey, maxItems, debug])

  return (
    <Card
      className={className}
      title={title || t('dashboard.recent_activity', 'Recent activity')}
      padding="sm"
    >
      {loading ? (
        <div className="py-6 text-sm text-gray-500">{t('common.loading', 'Loading...')}</div>
      ) : items && items.length > 0 ? (
        <div role="list" aria-label={t('dashboard.recent_activity_list', 'Recent activity list')}>
          {items.map((a, idx) => (
            <div key={a.id || idx} className={idx ? 'border-t border-gray-100' : ''}>
              <ActivityItem activity={a} compact={!!compact} detailed={!!detailed} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-6 text-sm text-gray-500">{t('dashboard.no_activity', 'No recent activity')}</div>
      )}
    </Card>
  )
}

export default RecentActivitiesCard