import React, { useEffect, useMemo, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import { getInvoice, getPayments } from '../../services/payments'
import { downloadInvoicePdf } from './InvoicePdf'

const formatDate = (s) => {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d)) return String(s)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}:${mm}:${yyyy}`
}

const formatMoney = (v) => `₹ ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

// Helpers to normalize display across varying backend shapes
const buildName = (obj) => {
  if (!obj && obj !== 0) return '—'
  if (typeof obj === 'string' || typeof obj === 'number') return String(obj)
  const full = obj.full_name || obj.name
  const composed = [obj.first_name, obj.middle_name, obj.last_name].filter(Boolean).join(' ').trim()
  return full || composed || obj.username || obj.email || '—'
}

const formatAddress = (addr) => {
  if (!addr) return ''
  if (typeof addr === 'string') return addr
  const parts = [
    addr.address || addr.address_line1 || addr.line1 || addr.street,
    addr.address_line2 || addr.line2 || addr.area || addr.locality || addr.landmark,
    addr.city || addr.district || addr.town,
    addr.state || addr.region || addr.province,
    addr.pincode || addr.postal_code || addr.zip,
    addr.country,
  ].filter(Boolean)
  return parts.join(', ')
}

const StatusBadge = ({ status }) => {
  const s = String(status || '').toLowerCase()
  const map = {
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    open: 'bg-blue-100 text-blue-800 border-blue-200',
    partial: 'bg-amber-100 text-amber-800 border-amber-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
    overdue: 'bg-red-100 text-red-800 border-red-200',
    void: 'bg-gray-200 text-gray-700 border-gray-300',
  }
  const dot = {
    draft: 'bg-gray-400',
    open: 'bg-blue-500',
    partial: 'bg-amber-500',
    paid: 'bg-green-600',
    overdue: 'bg-red-600',
    void: 'bg-gray-500',
  }[s] || 'bg-gray-400'
  const cls = map[s] || 'bg-gray-100 text-gray-800 border-gray-200'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
      {String(status || '').toUpperCase() || '—'}
    </span>
  )
}

StatusBadge.propTypes = { status: PropTypes.any }

const KeyValue = ({ label, value, strong = false }) => (
  <div className="flex justify-between py-1">
    <div className="text-gray-600 text-sm">{label}</div>
    <div className={strong ? 'text-gray-900 font-semibold' : 'text-gray-900'}>{value}</div>
  </div>
)

KeyValue.propTypes = {
  label: PropTypes.node,
  value: PropTypes.node,
  strong: PropTypes.bool,
}

const ItemsTable = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) return null
  const hasHsn = items.some(it => it.hsn || it.hsn_sac || it.sac)
  return (
    <div className="mt-1 border rounded-lg overflow-hidden shadow-sm">
      <div className="px-2.5 py-1.5 text-xs font-semibold text-sky-700 border-b bg-sky-50">Line Items</div>
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-2 py-1.5 font-semibold text-gray-700">Description</th>
            {hasHsn && <th className="text-left px-2 py-1.5 font-semibold text-gray-700">HSN/SAC</th>}
            <th className="text-right px-2 py-1.5 font-semibold text-gray-700">Rate</th>
            <th className="text-right px-2 py-1.5 font-semibold text-gray-700">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => {
            const qty = Number(it.quantity ?? it.qty ?? 1)
            const rate = Number(it.rate ?? it.price ?? it.unit_price ?? (it.amount ?? 0))
            const amt = Number(it.amount ?? (qty * rate))
            const hsn = it.hsn ?? it.hsn_sac ?? it.sac
            const zebra = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            return (
              <tr key={idx} className={`border-b last:border-0 ${zebra}`}>
                <td className="px-2 py-1.5 text-gray-800">{it.description ?? it.name ?? it.label ?? `Item ${idx + 1}`}</td>
                {hasHsn && <td className="px-2 py-1.5 text-gray-700">{hsn || '—'}</td>}
                <td className="px-2 py-1.5 text-right text-gray-800">{formatMoney(rate)}</td>
                <td className="px-2 py-1.5 text-right text-gray-900 font-medium">{formatMoney(amt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

ItemsTable.propTypes = { items: PropTypes.array }

const PaymentsTable = ({ payments }) => {
  if (!Array.isArray(payments) || payments.length === 0) return null
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const methodBadge = (m) => {
    const v = String(m || '').toLowerCase()
    const map = {
      cash: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      upi: 'bg-sky-50 text-sky-700 border-sky-200',
      card: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      bank: 'bg-amber-50 text-amber-700 border-amber-200',
      bank_transfer: 'bg-amber-50 text-amber-700 border-amber-200',
      other: 'bg-gray-50 text-gray-700 border-gray-200',
    }
    const cls = map[v] || map.other
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
        {m || '—'}
      </span>
    )
  }
  return (
    <div className="mt-3 border rounded-lg overflow-hidden shadow-sm border-sky-200">
      <div className="px-2.5 py-1.5 text-xs font-semibold text-sky-700 border-b bg-sky-50">Payment History</div>
      <table className="min-w-full text-xs">
        <thead className="bg-sky-50 border-b">
          <tr>
            <th className="text-left px-2 py-1.5 font-semibold text-sky-700">Date</th>
            <th className="text-left px-2 py-1.5 font-semibold text-sky-700">Method</th>
            <th className="text-left px-2 py-1.5 font-semibold text-sky-700">Reference</th>
            <th className="text-right px-2 py-1.5 font-semibold text-sky-700">Amount</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p, i) => (
            <tr key={i} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-sky-50/40'}`}>
              <td className="px-2 py-1.5 text-gray-700">{formatDate(p.received_at || p.paid_on || p.date)}</td>
              <td className="px-2 py-1.5">{methodBadge(p.method)}</td>
              <td className="px-2 py-1.5 text-gray-600">{p.reference || '—'}</td>
              <td className="px-2 py-1.5 text-right font-semibold text-emerald-700">{formatMoney(p.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="px-2 py-1.5 text-right font-semibold text-emerald-800 bg-emerald-50" colSpan={3}>Total Paid</td>
            <td className="px-2 py-1.5 text-right font-semibold text-emerald-800 bg-emerald-50">{formatMoney(totalPaid)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

PaymentsTable.propTypes = { payments: PropTypes.array }

const InvoiceDetails = ({ invoiceId, className = '' }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!invoiceId) return
    try {
      setLoading(true)
      setError('')
      const res = await getInvoice(invoiceId)
      setData(res)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    if (!invoiceId) return
    let alive = true
    const run = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await getInvoice(invoiceId)
        if (alive) setData(res)
      } catch (e) {
        if (alive) setError(e?.response?.data?.detail || 'Failed to load invoice')
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [invoiceId])

  useEffect(() => {
    // Refetch when the window/tab gains focus or becomes visible
    const onFocus = () => { refresh() }
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh])

  useEffect(() => {
    // Light polling (60s) while invoice is not in a final state
    const finalStates = new Set(['paid', 'void'])
    if (!data || finalStates.has(String(data.status || '').toLowerCase())) return
    const id = setInterval(() => refresh(), 60000)
    return () => clearInterval(id)
  }, [data, refresh])

  useEffect(() => {
    let alive = true
    const loadPayments = async () => {
      if (!invoiceId) return
      if (Array.isArray(data?.payments) && data.payments.length) {
        setPayments(data.payments)
        return
      }
      try {
        setPaymentsLoading(true)
        const resp = await getPayments({ invoice: invoiceId, page_size: 100 })
        const list = Array.isArray(resp) ? resp : (resp?.results || [])
        if (alive) setPayments(list)
      } catch (e) {
        // ignore silently, UI will just not show table
      } finally {
        if (alive) setPaymentsLoading(false)
      }
    }
    loadPayments()
    return () => { alive = false }
  }, [invoiceId, data])

  const items = useMemo(() => {
    const d = data || {}
    let list = []
    if (Array.isArray(d.items) && d.items.length) list = d.items.slice()
    else if (Array.isArray(d.line_items) && d.line_items.length) list = d.line_items.slice()
    else if (Array.isArray(d.expenses) && d.expenses.length) {
      // Map backend InvoiceExpense -> generic items for display
      list = d.expenses.map(e => ({
        description: e.label,
        quantity: 1,
        rate: Number(e.amount || 0),
        amount: Number(e.amount || 0),
        tax_rate: e.tax_rate,
        notes: e.notes,
      }))
    }

    // Add a top-level Rent row if not already present
    const rentAmount = Number(d.amount ?? d.subtotal_amount ?? 0)
    const hasRent = list.some(it => {
      const desc = String(it.description || it.name || it.label || '').toLowerCase()
      return desc.includes('rent') || desc.includes('room rent')
    })
    if (rentAmount > 0 && !hasRent) {
      list.unshift({ description: 'Rent', quantity: 1, rate: rentAmount, amount: rentAmount })
    }

    return list
  }, [data])

  const totals = useMemo(() => {
    const d = data || {}
    // Backend canonical fields
    const subtotal = Number(d.subtotal_amount ?? d.amount ?? 0)
    const tax = Number(d.tax_amount ?? d.tax ?? 0)
    const discount = Number(d.discount_amount ?? d.discount ?? 0)
    const total = Number(d.total_amount ?? d.total ?? (subtotal + tax - discount))
    const paidFromRecords = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
    const paid = Number(d.payments_total ?? d.amount_paid ?? d.paid_amount ?? paidFromRecords ?? (total - Number(d.balance_due ?? 0)))
    const balance = Number(d.balance_due ?? Math.max(0, total - paid))
    return { subtotal, tax, discount, total, paid, balance }
  }, [data, payments])

  const handleDownload = async () => {
    if (!data) return
    const payload = { ...data, payments: payments?.length ? payments : data.payments }
    await downloadInvoicePdf(payload).catch(() => { })
  }

  if (loading) return <div className={className}>Loading invoice...</div>
  if (error) return <div className={className + ' text-red-700 bg-red-50 border border-red-200 rounded p-3'}>{error}</div>
  if (!data) return <div className={className}>No data.</div>

  // Merge sources to be resilient to different backend keys
  const booking = data.booking || data.booking_detail || data.reservation || data.allocation || {}
  const tenant = (
    data.tenant ||
    data.tenant_detail ||
    data.tenant_info ||
    data.tenant_profile ||
    data.customer ||
    booking.tenant ||
    booking.tenant_detail ||
    booking.tenant_info ||
    booking.tenant_profile ||
    booking.customer ||
    {}
  )
  const property = booking.property || booking.building || data.property || data.org || data.organization || {}
  const org = data.org || data.organization || data.property || property || {}
  const logoUrl = data.logo || data.logo_url || org.logo || org.logo_url || org.image || booking?.building_logo || ''

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border rounded-lg p-3 border-sky-200 bg-white shadow-sm">
        {/* Top-centered building/PG name and address */}
        <div className="w-full text-center mb-2 pb-1">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-7 object-contain mx-auto mb-1" />
          ) : null}
          <div className="text-xl md:text-2xl lg:text-3xl font-bold text-sky-800">
            {booking?.building_name || property?.name || property?.title || org?.name || org?.title || '—'}
          </div>
          {(booking?.building_address ||
            property?.address ||
            booking?.property?.address ||
            booking?.building_address_line || booking?.building_city || booking?.building_state || booking?.building_pincode
          ) && (
              <div className="text-[11px] text-gray-700">
                {booking?.building_address
                  || formatAddress(property?.address || booking?.property?.address)
                  || [booking?.building_address_line, booking?.building_city, booking?.building_state, booking?.building_pincode]
                    .filter(Boolean)
                    .join(', ')
                }
              </div>
            )}
        </div>
        {/* Row with invoice info and actions */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-md font-semibold text-sky-900">Invoice ID #{data.id}</h2>
            <div className="mt-0.5 text-xs text-gray-700 whitespace-nowrap">Issue: {formatDate(data.issue_date || data.issued_on || data.issued_at || data.created_at)} </div>
            <div className="mt-0.5 text-xs text-gray-700 whitespace-nowrap">Next Due: {formatDate(
              data.next_due_date || data.next_due_on || data.next_due_at ||
              data.due_date || data.due_on || data.due_at
            )} </div>
            {data.cycle_month && (
              <div className="mt-0.5 text-[11px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 inline-block" />
                Billing Cycle: {new Date(data.cycle_month).toLocaleString('en-IN', { month: 'short', year: 'numeric' })}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-1 sm:gap-2">
            <StatusBadge status={data.status} />
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded border border-sky-300 text-sky-700 text-xs font-medium bg-white hover:bg-sky-50 disabled:opacity-60"
              title="Download PDF"
              aria-label="Download PDF"
              disabled={paymentsLoading}
            >
              {/* Download icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M12 3a.75.75 0 0 1 .75.75v8.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0l-3.75-3.75a.75.75 0 0 1 1.06-1.06l2.47 2.47V3.75A.75.75 0 0 1 12 3Zm-7.5 12a.75.75 0 0 1 .75.75v2.25c0 .414.336.75.75.75h12c.414 0 .75-.336.75-.75v-2.25A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18v-2.25A.75.75 0 0 1 4.5 15Z" clipRule="evenodd" />
              </svg>
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Removed: From / Billed To / Invoice Info sections as requested */}

      <ItemsTable items={items} />

      {/* Tenant + Location (minimal) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border rounded-lg p-2 border-sky-200 bg-sky-50">
          <h3 className="text-xs font-semibold text-sky-700 mb-1.5">Tenant</h3>
          <div className="text-xs">
            <div className="text-gray-900 font-medium">{buildName(tenant)}</div>
            <div className="text-gray-700">{tenant?.phone || tenant?.mobile || '—'}</div>
          </div>
        </div>
        <div className="border rounded-lg p-2 border-sky-200 bg-sky-50">
          <h3 className="text-xs font-semibold text-sky-700 mb-1.5">Location</h3>
          <div className="text-xs">
            <div className="text-gray-900 font-medium">{booking?.building_name || property?.name || property?.title || org?.name || org?.title || '—'}</div>
            <div className="text-gray-700">
              {(() => {
                const rn = booking?.room_number || booking?.room?.number || booking?.room_no || booking?.room || booking?.room_name
                const bn = booking?.bed_number || booking?.bed?.number || booking?.bed_no || booking?.bed
                let floor = booking?.floor_name || booking?.floor?.name || booking?.floor_label || booking?.floor_number || booking?.floor_no || booking?.floor
                let fLabel = ''
                if (floor != null && floor !== '') {
                  const s = String(floor)
                  fLabel = /floor/i.test(s) ? s : `Floor ${s}`
                }
                if (!rn && !bn && !fLabel) return '—'
                const rLabel = rn ? `Room ${rn}` : ''
                const bLabel = bn ? `Bed ${bn}` : ''
                const parts = [fLabel, rLabel, bLabel].filter(Boolean)
                return parts.join(' • ')
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border rounded-lg p-2 border-sky-200 bg-sky-50">
          <h3 className="text-xs font-semibold text-sky-700 mb-1.5">Notes / Terms</h3>
          <div className="text-gray-800 whitespace-pre-line text-xs">{data.notes || data.remarks || data.terms || '—'}</div>
        </div>
        <div className="border rounded-lg p-2 border-sky-200 bg-sky-50">
          <h3 className="text-xs font-semibold text-sky-700 mb-1.5">Summary</h3>
          {totals.subtotal ? <KeyValue label="Subtotal" value={formatMoney(totals.subtotal)} /> : null}
          {totals.tax ? <KeyValue label="Tax" value={formatMoney(totals.tax)} /> : null}
          {totals.discount ? <KeyValue label="Discount" value={<span className="text-rose-700">- {formatMoney(totals.discount)}</span>} /> : null}
          <div className="h-px bg-sky-200 my-1" />
          <KeyValue label={<span className="text-sky-900">Total</span>} value={<span className="text-sky-900 font-semibold">{formatMoney(totals.total)}</span>} />
          <KeyValue label="Paid" value={<span className="text-emerald-700">{formatMoney(totals.paid)}</span>} />
          <KeyValue label={<span className="text-rose-700">Balance Due</span>} value={<span className="text-rose-700 font-semibold">{formatMoney(totals.balance)}</span>} />
        </div>
      </div>

      {(data.payment_instructions || data.bank || data.upi_id || data.qr_image) && (
        <div className="border rounded-lg p-2 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-700 mb-1.5">Payment Instructions</h3>
          {data.payment_instructions && <div className="text-xs text-gray-800 whitespace-pre-line mb-1.5">{data.payment_instructions}</div>}
          {data.bank && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <KeyValue label="Account Name" value={data.bank.account_name || '—'} />
              <KeyValue label="Account Number" value={data.bank.account_no || data.bank.account_number || '—'} />
              <KeyValue label="IFSC" value={data.bank.ifsc || '—'} />
              <KeyValue label="Bank" value={`${data.bank.bank_name || ''} ${data.bank.branch ? `(${data.bank.branch})` : ''}`} />
            </div>
          )}
          {data.upi_id && <div className="text-xs text-gray-800 mt-1.5">UPI: {data.upi_id}</div>}
          {data.qr_image && (
            <div className="mt-2">
              <img src={data.qr_image} alt="Payment QR" className="h-24 w-24 object-contain border rounded" />
            </div>
          )}
        </div>
      )}

      <PaymentsTable payments={payments} />
    </div>
  )
}

InvoiceDetails.propTypes = {
  invoiceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  className: PropTypes.string,
}

export default InvoiceDetails