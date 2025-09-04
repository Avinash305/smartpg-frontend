import React from 'react'
import { FiHome, FiUser, FiClipboard, FiSettings, FiAlertCircle, FiCheckCircle, FiInfo, FiCreditCard, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi'
import { formatCurrency, formatDateTime } from '../../utils/dateUtils'

// ---------- helpers ----------
const getLabel = (v) => {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  if (typeof v === 'object') {
    const cand = v.name || v.full_name || v.display_name || v.title || v.label || v.number || v.code
    if (cand) return String(cand)
    if (v.id != null) return `#${v.id}`
  }
  return ''
}
const getModule = (a) => {
  // Prefer explicit fields
  const raw = String(a?.module || a?.meta?.module || a?.meta?.type || a?.type || a?.category || a?.meta?.category || a?.model || a?.meta?.model || a?.resource || a?.meta?.resource || '').toLowerCase()
  if (raw) {
    // Normalize property to building for consistency
    return raw.includes('property') ? 'building' : raw
  }
  // Infer module by scanning various fields
  const m = a?.meta || {}
  const top = a || {}
  const fields = [top.module, m.module, m.type, top.type, top.category, m.category, top.model, m.model, top.resource, m.resource]
    .concat([top.action, top.event, top.description, m.action, m.event, m.description])
    .map((v) => (v == null ? '' : String(v).toLowerCase()))
    .filter(Boolean)

  const tokens = ['payment','invoice','tenant','expense','building','property','room','floor','bed','booking','user','staff','account']
  for (const f of fields) {
    for (const tok of tokens) {
      if (f.includes(tok)) return tok === 'property' ? 'building' : tok
    }
  }

  // Fallback: inspect presence of nested objects
  const has = (k) => m[k] != null || top[k] != null
  if (has('payment')) return 'payment'
  if (has('invoice')) return 'invoice'
  if (has('booking')) return 'booking'
  if (has('floor')) return 'floor'
  if (has('room')) return 'room'
  if (has('bed')) return 'bed'
  if (has('building') || has('property')) return 'building'
  if (has('tenant')) return 'tenant'
  if (has('user') || has('staff') || has('account')) return 'user'
  return ''
}
const getAction = (a) => String(a?.action || a?.event || '').toLowerCase()

const getAmount = (a) => {
  const m = a?.meta || {}
  const candidates = [a?.amount, m.amount, m.total, m.value, m.price, m.rent, m.paid, m.amount_paid, m?.expense?.amount]
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n) && Math.abs(n) > 0) return n
  }
  return null
}
const getCurrency = (a) => {
  const m = a?.meta || {}
  const c = m.currency || m.currency_code || m.curr || 'INR'
  return String(c).toUpperCase()
}

const pickIcon = (moduleKey, actionKey) => {
  if (moduleKey.includes('payment') || moduleKey.includes('invoice')) return { Icon: FiCreditCard, cls: 'text-emerald-600 bg-emerald-50' }
  if (moduleKey.includes('booking')) return { Icon: FiClipboard, cls: 'text-indigo-600 bg-indigo-50' }
  if (moduleKey.includes('building') || moduleKey.includes('property') || moduleKey.includes('room') || moduleKey.includes('floor') || moduleKey.includes('bed')) return { Icon: FiHome, cls: 'text-blue-600 bg-blue-50' }
  if (moduleKey.includes('user') || moduleKey.includes('tenant') || moduleKey.includes('staff') || moduleKey.includes('account')) return { Icon: FiUser, cls: 'text-fuchsia-600 bg-fuchsia-50' }
  if (moduleKey.includes('settings') || moduleKey.includes('config')) return { Icon: FiSettings, cls: 'text-gray-700 bg-gray-100' }
  if (actionKey.includes('error') || actionKey.includes('fail')) return { Icon: FiAlertCircle, cls: 'text-red-600 bg-red-50' }
  if (actionKey.includes('success') || actionKey.includes('paid') || actionKey.includes('active') || actionKey.includes('completed')) return { Icon: FiCheckCircle, cls: 'text-green-600 bg-green-50' }
  if (actionKey.includes('update') || actionKey.includes('changed') || actionKey.includes('edit')) return { Icon: FiEdit2, cls: 'text-amber-600 bg-amber-50' }
  if (actionKey.includes('delete') || actionKey.includes('remove')) return { Icon: FiTrash2, cls: 'text-rose-600 bg-rose-50' }
  if (actionKey.includes('create') || actionKey.includes('add')) return { Icon: FiPlus, cls: 'text-sky-600 bg-sky-50' }
  return { Icon: FiInfo, cls: 'text-gray-600 bg-gray-50' }
}

const timeAgo = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 30) return 'just now'
  if (diff < 60) return `${diff}s ago`
  const m = Math.floor(diff / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(days / 365)
  return `${years}y ago`
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const pastTenseLabel = (s) => {
  const a = String(s || '').toLowerCase()
  if (['create', 'add', 'added', 'created'].some(k => a.includes(k))) return 'Created'
  if (['update', 'edit', 'change', 'updated', 'edited', 'changed'].some(k => a.includes(k))) return 'Updated'
  if (['delete', 'remove', 'deleted', 'removed'].some(k => a.includes(k))) return 'Deleted'
  return cap(a)
}

// Prefer singular noun for headings: e.g., "Payments" -> "Payment"
const singularizeSlug = (s) => {
  const x = String(s || '').toLowerCase()
  const map = {
    payments: 'payment', payment: 'payment',
    invoices: 'invoice', invoice: 'invoice',
    tenants: 'tenant', tenant: 'tenant',
    bookings: 'booking', booking: 'booking',
    buildings: 'building', building: 'building',
    properties: 'property', property: 'property',
    rooms: 'room', room: 'room',
    floors: 'floor', floor: 'floor',
    beds: 'bed', bed: 'bed',
    users: 'user', user: 'user',
    expenses: 'expense', expense: 'expense',
  }
  return map[x] || x
}

// actor helper: broaden detection across common backends
const getActorName = (a) => {
  const m = a?.meta || {}
  const candidates = [
    a?.actor,
    a?.user,
    a?.performed_by,
    a?.created_by,
    a?.author,
    a?.owner,
    m.actor,
    m.user,
    m.performed_by,
    m.created_by,
    m.staff,
    m.staff_user,
    m.pg_staff,
    // name-like fields
    m.actor_name,
    m.user_name,
    m.staff_name,
    m.created_by_name,
    a?.actor_name,
    a?.user_name,
  ]
  for (const c of candidates) {
    const lbl = getLabel(c)
    if (lbl) return lbl
    // Sometimes only email/username is present
    if (typeof c === 'object' && c) {
      const v = c.email || c.username
      if (v) return String(v)
    }
  }
  // As a last resort, try string fields directly
  const strFallback = m.performed_by_name || m.created_by || m.user_email || a?.user_email
  if (strFallback) return String(strFallback)
  return 'Admin'
}

const toPast = (s) => {
  const x = String(s || '').toLowerCase()
  const map = { create: 'created', add: 'created', update: 'updated', edit: 'updated', change: 'updated', delete: 'deleted', remove: 'deleted' }
  const out = map[x] || (x ? (x.endsWith('e') ? x + 'd' : x + 'ed') : 'updated')
  return out
}

// ---------- sentence builders ----------
const buildPaymentSentence = (a) => {
  const tenantName = getLabel(a?.meta?.tenant || a?.tenant)
  const name = tenantName || ''
  const amt = getAmount(a)
  const curr = getCurrency(a)
  let amountStr = ''
  if (amt != null) {
    try { amountStr = ` — ${formatCurrency(amt, curr || 'INR')}` } catch {}
  }
  if (name) return `Payment "${name}"${amountStr}`
  return `Payment${amountStr}`
}

const buildGenericSentence = (a) => {
  // Fallback: Actor + Action + Module + optional entity
  const actor = getActorName(a)
  const actRaw = getAction(a) || 'updated'
  const toPast = (s) => {
    const x = String(s || '').toLowerCase()
    const map = { create: 'created', add: 'created', update: 'updated', edit: 'updated', change: 'updated', delete: 'deleted', remove: 'deleted' }
    const out = map[x] || (x ? (x.endsWith('e') ? x + 'd' : x + 'ed') : 'updated')
    return out
  }
  let mod = getModule(a) || 'item'
  if (mod.endsWith('s')) mod = mod.slice(0, -1)
  let entity = (
    getLabel(a?.meta?.tenant) || getLabel(a?.meta?.invoice) || getLabel(a?.meta?.room) || getLabel(a?.meta?.building) ||
    getLabel(a?.meta?.entity) || a?.meta?.entity_name || a?.meta?.name || a?.meta?.title || a?.name || a?.title || ''
  )
  if (entity) {
    const eNorm = String(entity).toLowerCase()
    const mNorm = String(mod).toLowerCase()
    if (eNorm === mNorm || eNorm === mNorm + 's') entity = ''
  }
  const head = `${actor} ${cap(toPast(actRaw))} ${cap(mod)}`
  return entity ? `${head}: ${entity}` : `${head} details`
}

// ---------- rich description builder (module-aware) ----------
const buildDescriptionNode = (a, moduleKey, opts = {}) => {
  const mod = String(moduleKey || '').toLowerCase()
  const tenant = getLabel(a?.meta?.tenant || a?.tenant)
  const invoice = getLabel(a?.meta?.invoice || a?.invoice)
  const booking = getLabel(a?.meta?.booking || a?.booking)
  const room = getLabel(a?.meta?.room || a?.room)
  const building = getLabel(a?.meta?.building || a?.building)
  const entity = getLabel(a?.meta?.entity || a?.entity || a?.meta?.name || a?.name || a?.title)
  const amt = getAmount(a)
  const curr = getCurrency(a)

  // Helper chunks
  const Amount = () => {
    if (!Number.isFinite(amt)) return null
    try { return (<><span className="font-semibold text-gray-900">{formatCurrency(amt, curr || 'INR')}</span></>) } catch { return null }
  }

  // Payments & Invoices
  if (mod.includes('payment')) {
    const suppressTenant = !!opts?.suppressTenantInPayments
    // Extra details
    const method = a?.meta?.method || a?.meta?.payment_method || a?.method || a?.meta?.mode
    const reference = a?.meta?.reference || a?.meta?.txn_id || a?.meta?.transaction_id || a?.meta?.payment_id || a?.reference
    const statusRaw = a?.meta?.status || a?.status
    const status = typeof statusRaw === 'string' ? statusRaw.toLowerCase() : ''
    const statusLabel = status ? cap(status) : ''
    const statusCls = status.includes('fail') ? 'text-red-700 bg-red-50 border-red-200' : (status.includes('pend') ? 'text-amber-700 bg-amber-50 border-amber-200' : (status ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : ''))
    const invLabel = invoice
    return (
      <span className="text-[12px] text-gray-700">
        {!suppressTenant && tenant && (<><span className="text-gray-800">From</span> <span className="text-gray-900">“{tenant}”</span></>)}
        <Amount />
        {method && (<><span>{' • '}</span><span className="text-gray-800">via</span> <span className="text-gray-900">{String(method)}</span></>)}
        {invLabel && (<><span>{' • '}</span><span className="text-gray-800">Invoice</span> <span className="text-gray-900">“{invLabel}”</span></>)}
        {reference && (<><span>{' • '}</span><span className="text-gray-800">Ref</span> <span className="text-gray-900">{String(reference)}</span></>)}
        {statusLabel && (<><span>{' • '}</span><span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] leading-none border ${statusCls}`}>{statusLabel}</span></>)}
      </span>
    )
  }
  if (mod.includes('invoice')) {
    const invLabel = invoice || entity
    return (
      <span className="text-[12px] text-gray-700">
        <span className="text-gray-800">Invoice</span>
        {invLabel && <> <span className="text-gray-900">“{invLabel}”</span></>}
        <Amount />
      </span>
    )
  }

  // Expenses
  if (mod.includes('expense')) {
    const category = getLabel(a?.meta?.expense?.category || a?.meta?.category || a?.category)
    const dateIso = a?.meta?.expense?.expense_date || a?.meta?.expense_date || a?.expense_date
    return (
      <span className="text-[12px] text-gray-700">
        {category && <> <span className="text-gray-900">“{category}”</span></>}
        <Amount />
        {dateIso && (
          <>
            <span>{' • '}</span>
            <span className="text-gray-800">Date</span> <span className="text-gray-900">{formatDateTime(dateIso)}</span>
          </>
        )}
      </span>
    )
  }

  // Bookings
  if (mod.includes('booking')) {
    const who = tenant || room || booking || entity
    const ci = a?.meta?.check_in || a?.check_in || a?.meta?.from
    const co = a?.meta?.check_out || a?.check_out || a?.meta?.to
    return (
      <span className="text-[12px] text-gray-700">
        <span className="text-gray-800">Booking</span>
        {who && <> <span className="text-gray-900">“{who}”</span></>}
        {(ci || co) && (
          <>
            <span>{' — '}</span>
            <span className="text-gray-900" title={`${ci ? formatDateTime(ci) : ''}${co ? ' → ' + formatDateTime(co) : ''}`}>
              {ci ? formatDateTime(ci) : ''}{co ? ' → ' + formatDateTime(co) : ''}
            </span>
          </>
        )}
      </span>
    )
  }

  // Property/Building/Room/Bed
  if (/(property|building|room|floor|bed)/.test(mod)) {
    // Try to construct a rich, context-aware label
    const buildingLabel = getLabel(a?.meta?.building || a?.building || a?.meta?.property || a?.property)
    const roomLabel = getLabel(a?.meta?.room || a?.room || a?.meta?.room_name || a?.meta?.room_no || a?.meta?.room_number)
    const floorLabel = getLabel(a?.meta?.floor || a?.floor || a?.meta?.floor_name || a?.meta?.floor_no || a?.meta?.level)

    // Prefer specific labels depending on module type
    if (/floor/.test(mod) && (floorLabel || buildingLabel)) {
      return (
        <span className="text-[12px] text-gray-700">
          <span className="text-gray-800">Floor</span>
          {floorLabel && <> <span className="text-gray-900">“{floorLabel}”</span></>}
          {buildingLabel && <><span>{' — '}</span><span className="text-gray-800">Building</span> <span className="text-gray-900">“{buildingLabel}”</span></>}
        </span>
      )
    }

    if (/room/.test(mod) && (roomLabel || buildingLabel || floorLabel)) {
      return (
        <span className="text-[12px] text-gray-700">
          <span className="text-gray-800">Room</span>
          {roomLabel && <> <span className="text-gray-900">“{roomLabel}”</span></>}
          {(floorLabel || buildingLabel) && (
            <>
              <span>{' — '}</span>
              {floorLabel && (<><span className="text-gray-800">Floor</span> <span className="text-gray-900">“{floorLabel}”</span></>)}
              {floorLabel && buildingLabel && <span>{' • '}</span>}
              {buildingLabel && (<><span className="text-gray-800">Building</span> <span className="text-gray-900">“{buildingLabel}”</span></>)}
            </>
          )}
        </span>
      )
    }

    if (/(building|property)/.test(mod) && buildingLabel) {
      return (
        <span className="text-[12px] text-gray-700">
          <span className="text-gray-800">{/(property)/.test(mod) ? 'Property' : 'Building'}</span> <span className="text-gray-900">“{buildingLabel}”</span>
        </span>
      )
    }

    if (/bed/.test(mod)) {
      const bedLabel = getLabel(
        a?.meta?.bed || a?.bed || a?.meta?.bed_no || a?.meta?.bed_number || a?.meta?.bed_name || a?.bed_name || a?.meta?.number || a?.meta?.code || a?.name
      )
      const statusRaw = a?.meta?.status || a?.status
      const status = typeof statusRaw === 'string' ? statusRaw.toLowerCase() : ''
      const statusLabel = status ? cap(status) : ''
      return (
        <span className="text-[12px] text-gray-700">
          <span className="text-gray-800">Bed</span>
          {bedLabel && <> <span className="text-gray-900">“{bedLabel}”</span></>}
          {(roomLabel || floorLabel || buildingLabel) && (
            <>
              <span>{' — '}</span>
              {roomLabel && (<><span className="text-gray-800">Room</span> <span className="text-gray-900">“{roomLabel}”</span></>)}
              {(roomLabel && (floorLabel || buildingLabel)) && <span>{' • '}</span>}
              {floorLabel && (<><span className="text-gray-800">Floor</span> <span className="text-gray-900">“{floorLabel}”</span></>)}
              {(floorLabel && buildingLabel) && <span>{' • '}</span>}
              {buildingLabel && (<><span className="text-gray-800">Building</span> <span className="text-gray-900">“{buildingLabel}”</span></>)}
            </>
          )}
          {statusLabel && (<><span>{' • '}</span><span className="text-gray-800">Status</span> <span className="text-gray-900">{statusLabel}</span></>)}
        </span>
      )
    }

    // Fallback for property modules: avoid echoing generic words like "floor(s)" or "room(s)"
    let label = entity || roomLabel || buildingLabel
    if (label) {
      const eNorm = String(label).toLowerCase()
      const mNorm = String(mod).toLowerCase()
      if (eNorm === mNorm || eNorm === mNorm + 's') label = ''
    }
    if (!label) return null
    const noun = cap(mod)
    return (
      <span className="text-[12px] text-gray-700">
        <span className="text-gray-800">{noun}</span> <span className="text-gray-900">“{label}”</span>
      </span>
    )
  }

  // Users / Staff / Accounts
  if (/(user|staff|account)/.test(mod)) {
    const target = a?.meta?.target || a?.target || a?.meta?.user || a?.user
    const name = getLabel(target) || getLabel(a?.meta?.name) || getLabel(a?.name)
    const email = a?.meta?.email || target?.email || a?.email
    const role = a?.meta?.role || target?.role || a?.role || a?.meta?.group || a?.group
    return (
      <span className="text-[12px] text-gray-700">
        <span className="text-gray-800">User</span>
        {name && <> <span className="text-gray-900">“{name}”</span></>}
        {email && (<><span>{' • '}</span><span className="text-gray-800">Email</span> <span className="text-gray-900">{String(email)}</span></>)}
        {role && (<><span>{' • '}</span><span className="text-gray-800">Role</span> <span className="text-gray-900">{getLabel(role)}</span></>)}
      </span>
    )
  }

  // Fallback: show entity if exists, avoid repeating module name
  if (entity) {
    const eNorm = String(entity).toLowerCase()
    const mNorm = String(mod).toLowerCase()
    if (!(eNorm === mNorm || eNorm === mNorm + 's')) {
      return (
        <span className="text-[12px] text-gray-700">
          <span className="text-gray-900">{entity}</span>
        </span>
      )
    }
  }
  return null
}

// Short entity label to enrich the heading (e.g., Floor “2”)
const getEntityShortLabel = (a, moduleKey) => {
  const mod = String(moduleKey || '').toLowerCase()
  const buildingLabel = getLabel(a?.meta?.building || a?.building || a?.meta?.property || a?.property)
  const roomLabel = getLabel(a?.meta?.room || a?.room || a?.meta?.room_name || a?.meta?.room_no || a?.meta?.room_number)
  const floorLabel = getLabel(a?.meta?.floor || a?.floor || a?.meta?.floor_name || a?.meta?.floor_no || a?.meta?.level)
  const invoiceLabel = getLabel(a?.meta?.invoice || a?.invoice)
  const tenantLabel = getLabel(a?.meta?.tenant || a?.tenant)
  const userLabel = getLabel(a?.meta?.target || a?.target || a?.meta?.user || a?.user)
  const bedShort = getLabel(a?.meta?.bed || a?.bed || a?.meta?.bed_no || a?.meta?.bed_number || a?.meta?.bed_name || a?.bed_name || a?.meta?.number || a?.meta?.code || a?.name)
  const generic = getLabel(a?.meta?.entity || a?.entity || a?.meta?.name || a?.name || a?.title)

  const clean = (val) => {
    const s = String(val || '').trim()
    if (!s) return ''
    const v = s.toLowerCase()
    if (v === mod || v === mod + 's') return ''
    return s
  }

  if (/floor/.test(mod)) return clean(floorLabel) || clean(generic) || ''
  if (/room/.test(mod)) return clean(roomLabel) || clean(generic) || ''
  if (/(building|property)/.test(mod)) return clean(buildingLabel) || clean(generic) || ''
  if (/invoice/.test(mod)) return clean(invoiceLabel) || clean(generic) || ''
  if (/(payment)/.test(mod)) return clean(tenantLabel) || clean(generic) || ''
  if (/(user|staff|account)/.test(mod)) return clean(userLabel) || clean(generic) || ''
  if (/bed/.test(mod)) return clean(bedShort) || clean(generic) || ''
  if (/tenant/.test(mod)) return clean(tenantLabel) || clean(generic) || ''
  if (/expense/.test(mod)) return ''
  return clean(generic) || ''
}

// ---------- component ----------
const ActivityItem = ({ activity, count = 1, compact = false, detailed = false }) => {
  const a = activity || {}
  const ts = a?.timestamp || a?.created_at || a?.time
  const mod = getModule(a)
  const act = getAction(a)
  const { Icon, cls } = pickIcon(mod, act)

  const when = ts ? formatDateTime(ts) : ''
  const rel = ts ? timeAgo(ts) : ''

  const isPayment = /payment/.test(String(mod))
  const sentence = isPayment ? buildPaymentSentence(a) : buildGenericSentence(a)
  const actLabel = pastTenseLabel(act)
  const actor = getActorName(a)
  const moduleKey = getModule(a) || 'item'
  const actionPastCap = cap(toPast(act))
  const moduleSingular = singularizeSlug(moduleKey)
  const moduleLabel = moduleSingular !== 'item' ? cap(moduleSingular) : 'Item'
  // Payment-specific friendly heading
  const paymentHeading = () => {
    const actRaw = String(act || '').toLowerCase()
    let verb = 'Payment'
    if (['create', 'add', 'paid', 'success', 'received'].some(k => actRaw.includes(k))) verb = 'Payment received'
    else if (['fail', 'failed', 'error'].some(k => actRaw.includes(k))) verb = 'Payment failed'
    else if (['delete', 'remove'].some(k => actRaw.includes(k))) verb = 'Payment deleted'
    else if (['update', 'edit', 'change'].some(k => actRaw.includes(k))) verb = 'Payment updated'
    const tenantName = getLabel(a?.meta?.tenant || a?.tenant)
    if (tenantName) return `${verb} from “${tenantName}”`
    const amt = getAmount(a)
    const curr = getCurrency(a)
    if (Number.isFinite(amt)) {
      try { return `${verb} — ${formatCurrency(amt, curr || 'INR')}` } catch { return verb }
    }
    return verb
  }
  // Enrich heading with entity short label for non-payment modules
  const entityShort = getEntityShortLabel(a, moduleKey)
  const heading = moduleSingular === 'payment' ? paymentHeading() : (entityShort ? `${actLabel}: ${moduleLabel} “${entityShort}”` : `${actLabel}: ${moduleLabel}`)
  const descNode = buildDescriptionNode(
    a,
    moduleKey,
    {
      suppressTenantInPayments: moduleSingular === 'payment' && !!getLabel(a?.meta?.tenant || a?.tenant)
    }
  )

  if (compact) {
    return (
      <div className="p-3 flex items-start gap-3" role="listitem">
        <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center ${cls}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          {/* Heading line */}
          <div className="text-sm text-gray-900 whitespace-normal break-all" title={`${heading}${(rel || when) ? ` • ${rel || when}` : ''}`}>
            <span className="font-semibold">{heading}</span>
            {(rel || when) && (
              <span className="ml-1 text-[11px] text-gray-700">{` • ${rel || when}`}</span>
            )}
            <span className="ml-1 text-[11px] text-gray-500">{`by ${actor}`}</span>
            {count > 1 && (
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] leading-none bg-gray-100 text-gray-700 border border-gray-200 align-middle">×{count}</span>
            )}
          </div>
          {/* Description line: module-aware rich details */}
          {descNode && (
            <div className="mt-0.5 whitespace-normal break-all">{descNode}</div>
          )}
          {detailed && (
            <div className="mt-1 text-[11px] text-gray-600 whitespace-normal break-all">
              <span className="text-gray-800">{when}</span>
              <span>{' • '}</span>
              <span className="text-gray-800">{cap(moduleSingular)}</span>
              {act && (<><span>{' • '}</span><span>{actionPastCap}</span></>)}
              {(a?.id || a?.uuid) && (<><span>{' • '}</span><span className="text-gray-500">ID:</span> <span className="text-gray-800">{String(a.id || a.uuid)}</span></>)}
              {(a?.description || a?.meta?.description) && (
                <>
                  <span>{' • '}</span>
                  <span className="text-gray-500">Note:</span> <span className="text-gray-800">{String(a.description || a.meta.description)}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 flex items-start gap-3" role="listitem" aria-label={`${heading}${when ? ' • ' + when : ''}`}>
      <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center ${cls}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        {/* Heading line */}
        <div className="text-sm text-gray-900 whitespace-normal break-all" title={`${heading}${(rel || when) ? ` • ${rel || when}` : ''}`}>
          <span className="font-semibold">{heading}</span>
          {(rel || when) && (
            <span className="ml-1 text-[11px] text-gray-700">{` • ${rel || when}`}</span>
          )}
          <span className="ml-1 text-[11px] text-gray-500">{`by ${actor}`}</span>
        </div>
        {/* Description line: module-aware rich details */}
        {descNode && (
          <div className="mt-0.5 whitespace-normal break-all">{descNode}</div>
        )}
        {detailed && (
          <div className="mt-1 text-[11px] text-gray-600 whitespace-normal break-all">
            <span className="text-gray-800">{when}</span>
            <span>{' • '}</span>
            <span className="text-gray-800">{cap(moduleSingular)}</span>
            {act && (<><span>{' • '}</span><span>{actionPastCap}</span></>)}
            {(a?.id || a?.uuid) && (<><span>{' • '}</span><span className="text-gray-500">ID:</span> <span className="text-gray-800">{String(a.id || a.uuid)}</span></>)}
            {(a?.description || a?.meta?.description) && (
              <>
                <span>{' • '}</span>
                <span className="text-gray-500">Note:</span> <span className="text-gray-800">{String(a.description || a.meta.description)}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityItem