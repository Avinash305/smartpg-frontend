import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { formatDateTime } from '../../utils/dateUtils'

const fmt = (s) => formatDateTime(s)

// Helper to stringify a location object into a readable label
const locLabel = (loc) => {
  if (!loc) return '-'
  if (typeof loc === 'string') return loc
  const parts = []
  if (loc.building_name || loc.building) parts.push(loc.building_name || loc.building)
  if (loc.floor_display || loc.floor) parts.push(loc.floor_display || `Floor ${loc.floor}`)
  if (loc.room_number || loc.room) parts.push(`Room ${loc.room_number || loc.room}`)
  if (loc.bed_number || loc.bed) parts.push(`Bed ${loc.bed_number || loc.bed}`)
  if (!parts.length) return JSON.stringify(loc)
  return parts.filter(Boolean).join(' • ')
}

// Helper to stringify a tenant object/name
const tenantLabel = (t) => {
  if (!t) return ''
  if (typeof t === 'string' || typeof t === 'number') return String(t)
  return t.full_name || t.tenant_full_name || t.name || t.tenant_name || t.email || `ID ${t.id ?? ''}`
}

// Helper to stringify a user (moved_by)
const userLabel = (u) => {
  if (!u) return ''
  if (typeof u === 'string') return u
  return u.username || u.email || (u.id ? `User #${u.id}` : '')
}

// helpers for tenant diffs
const pick = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return undefined
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]
  }
  return undefined
}
const toStr = (v) => {
  if (v === undefined || v === null) return ''
  if (typeof v === 'object') return v.full_name || v.name || v.email || JSON.stringify(v)
  return String(v)
}
const buildTenantDiffs = (fromT, toT) => {
  if (!fromT || !toT || typeof fromT !== 'object' || typeof toT !== 'object') return []
  // common fields with aliases in backend
  const fields = [
    { key: 'name', labels: ['full_name', 'tenant_full_name', 'name', 'tenant_name'], title: 'Name' },
    { key: 'phone', labels: ['phone', 'mobile', 'phone_number', 'mobile_number'], title: 'Phone' },
    { key: 'email', labels: ['email'], title: 'Email' },
    { key: 'gender', labels: ['gender'], title: 'Gender' },
    { key: 'dob', labels: ['dob', 'date_of_birth'], title: 'DOB' },
    { key: 'id_type', labels: ['id_proof_type', 'id_type'], title: 'ID Type' },
    { key: 'id_no', labels: ['id_proof_number', 'id_number', 'id_no'], title: 'ID Number' },
  ]
  const diffs = []
  for (const f of fields) {
    const a = pick(fromT, f.labels)
    const b = pick(toT, f.labels)
    if (toStr(a) !== toStr(b)) {
      diffs.push({ field: f.title, from: toStr(a) || '-', to: toStr(b) || '-' })
    }
  }
  return diffs
}

const normalize = (arr = []) => {
  // Try to normalize different possible shapes into: { id, moved_at, from, to, notes, tenantFrom, tenantTo, movedBy }
  return arr.map((it, idx) => {
    const from = it.from || it.from_location || it.previous || it.old
    const to = it.to || it.to_location || it.next || it.new

    // Attempt to extract tenant changes
    const tenantFrom = it.old_tenant || it.tenant_from || it.previous_tenant || from?.tenant || from?.tenant_obj || from?.tenant_id || from?.tenant_name
    const tenantTo = it.new_tenant || it.tenant_to || it.next_tenant || to?.tenant || to?.tenant_obj || to?.tenant_id || to?.tenant_name

    const tenantDiffs = buildTenantDiffs(tenantFrom, tenantTo)

    // Extract who moved
    const movedBy = it.moved_by || it.movedBy || it.user || it.updated_by || it.created_by || null

    return {
      id: it.id ?? idx,
      moved_at: it.moved_at || it.timestamp || it.created_at || it.date || it.time || it.at,
      from,
      to,
      notes: it.notes || it.reason || it.comment || '',
      tenantFrom,
      tenantTo,
      tenantDiffs,
      movedBy,
      raw: it,
    }
  })
}

const MovedBookingHistory = ({ bookingId, history, limit = 10, className = '', refreshKey }) => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const apply = (arr) => {
      const norm = normalize(arr)
      setItems(limit ? norm.slice(0, limit) : norm)
    }
    const run = async () => {
      if (Array.isArray(history)) { apply(history); return }
      if (!bookingId) { setItems([]); return }
      try {
        setLoading(true)
        setError('')
        const res = await api.get(`/bookings/bookings/${bookingId}/`)
        const d = res.data || {}
        const arr = d.movement_history || d.moves || d.history || []
        apply(Array.isArray(arr) ? arr : [])
      } catch (e) {
        setError(e?.response?.data?.detail || 'Failed to load movement history')
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [history, bookingId, limit, refreshKey])

  return (
    <div className={className}>
      {loading ? (
        <div className="py-3 text-sm text-gray-600">Loading movement history...</div>
      ) : error ? (
        <div className="py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>
      ) : !items.length ? (
        <div className="py-3 text-sm text-gray-600">No movement recorded.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">From</th>
                <th className="px-3 py-2 font-medium">To</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 align-top">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {fmt(m.moved_at)}
                    {m.movedBy ? (
                      <div className="text-xs text-gray-500">by {userLabel(m.movedBy)}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {m.tenantFrom ? (<div className="text-gray-900">Tenant: <span className="font-medium">{tenantLabel(m.tenantFrom)}</span></div>) : null}
                    <div className="text-gray-600">{locLabel(m.from)}</div>
                    {m.tenantDiffs?.length ? (
                      <ul className="mt-1 text-xs text-gray-600 list-disc list-inside space-y-0.5">
                        {m.tenantDiffs.map((d, i) => (
                          <li key={i}><span className="text-gray-500">{d.field}:</span> {d.from} → {d.to}</li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {m.tenantTo ? (<div className="text-gray-900">Tenant: <span className="font-medium">{tenantLabel(m.tenantTo)}</span></div>) : null}
                    <div className="text-gray-600">{locLabel(m.to)}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{m.notes || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default MovedBookingHistory