import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button'
import { getInvoice } from '../../services/payments'
import InvoiceDetails from '../invoice/InvoiceDetails'
import Modal from '../ui/Modal'
import Card from '../ui/Card'
import { formatDateTime, formatCurrency } from '../../utils/dateUtils'

const PaymentDetails = ({ payment }) => {
  const fmtINR = (n) => formatCurrency(n, 'INR')
  const fmtDateTime = (s) => formatDateTime(s)
  const renderInvoice = (inv) => {
    if (!inv) return '—'
    if (typeof inv === 'object') {
      if (inv.number) return inv.number
      if (inv.id) return `#${inv.id}`
      return JSON.stringify(inv)
    }
    return String(inv)
  } 
  const formatUser = (u) => {
    if (!u) return 'N/A'
    if (typeof u === 'object') {
      const name = (u.name || '').trim()
      const email = (u.email || '').trim()
      const username = (u.username || '').trim()
      if (name) return name
      if (email) return (email.split('@')[0] || email).trim()
      if (username) return username
      return 'N/A'
    }
    const s = String(u).trim()
    return s.includes('@') ? (s.split('@')[0] || s).trim() : s
  }
  const fullEmail = (u) => {
    if (!u) return ''
    const e = typeof u === 'object' ? (u.email || '').trim() : String(u).trim()
    return e.includes('@') ? e : ''
  }
  const statusBadge = (status) => {
    const s = String(status || '').toUpperCase()
    const map = {
      SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      FAILED: 'bg-red-50 text-red-700 border-red-200',
      PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
      PROCESSING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      REFUNDED: 'bg-slate-50 text-slate-700 border-slate-200',
    }
    const dotMap = {
      SUCCESS: 'bg-emerald-500',
      PAID: 'bg-emerald-500',
      FAILED: 'bg-red-500',
      PENDING: 'bg-amber-500',
      PROCESSING: 'bg-indigo-500',
      REFUNDED: 'bg-slate-500',
    }
    const cls = map[s] || 'bg-gray-50 text-gray-700 border-gray-200'
    const dot = dotMap[s] || 'bg-gray-400'
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${cls}`}>
        <span className={`mr-1 h-1.5 w-1.5 rounded-full ${dot}`}></span>
        {s || '—'}
      </span>
    )
  }
  const pickStatus = (p) => {
    if (!p) return ''
    const raw = p.status ?? p.payment_status ?? p.state ?? p?.invoice?.status ?? ''
    if (typeof raw === 'boolean') return raw ? 'SUCCESS' : 'FAILED'
    return raw
  }
  const handleCopy = async (text) => {
    if (!text) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(text))
      } else {
        const ta = document.createElement('textarea')
        ta.value = String(text)
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch (_) { /* swallow */ }
  }

  const [invoice, setInvoice] = useState(null)
  const [invLoading, setInvLoading] = useState(false)
  const [invError, setInvError] = useState('')
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  const getInvoiceId = (inv) => {
    if (!inv) return null
    if (typeof inv === 'object') return inv.id ?? null
    // numeric or string id
    return inv
  }

  useEffect(() => {
    setInvoice(null)
    setInvError('')
    const inv = payment?.invoice
    if (!inv) return
    // If we already have object with totals, use it directly
    if (typeof inv === 'object' && (inv.total_amount != null || inv.balance_due != null)) {
      setInvoice(inv)
      return
    }
    const invId = getInvoiceId(inv)
    if (!invId) return
    let alive = true
      ; (async () => {
        try {
          setInvLoading(true)
          const data = await getInvoice(invId)
          if (alive) setInvoice(data)
        } catch (e) {
          if (alive) setInvError(e?.response?.data?.detail || 'Failed to load invoice details')
        } finally {
          if (alive) setInvLoading(false)
        }
      })()
    return () => { alive = false }
  }, [payment?.invoice])

  const computePaid = (inv) => {
    if (!inv) return null
    const total = Number(inv.total_amount ?? NaN)
    const due = Number(inv.balance_due ?? NaN)
    if (Number.isNaN(total) || Number.isNaN(due)) return null
    return Math.max(0, total - due)
  }

  useEffect(() => {
    // Debug logging removed
  }, [payment])

  return (
    <div>
      {payment ? (
        <div className="space-y-3">
          <Card title={`Payment #${payment.id}`} actions={<div title={String(pickStatus(payment) || '')}>{statusBadge(pickStatus(payment))}</div>} padding="sm">
            <div className="flex flex-row justify-between">
              <div className="sm:col-span-2">
                <div className="text-xs text-gray-500">Amount</div>
                <div className="text-2xl font-semibold text-gray-900">{fmtINR(payment.amount)}</div>
                <div className="text-xs text-gray-500">Received</div>
                <div className="text-sm text-gray-900">{fmtDateTime(payment.received_at)}</div>
                {/* Invoice ID (click to open details modal) */}
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <div className="text-xs text-gray-500">Invoice</div>
                  {(() => {
                    const invId = getInvoiceId(payment?.invoice)
                    if (!invId) return <span className="text-gray-700">—</span>
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowInvoiceModal(true)}
                          className="text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                          title="View invoice details"
                        >
                          #{invId}
                        </button>
                        {/* Copy removed as requested */}
                      </>
                    )
                  })()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Method</div>
                <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">
                  {String(payment.method || '—').toUpperCase()}
                </div>
              </div>
            </div>
          </Card>

          {(payment.reference || payment.notes) && (
            <Card title="Notes / Reference" padding="sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                {payment.reference ? (
                  <div className="flex items-center gap-2">
                    <strong>Reference:</strong> <span>{payment.reference}</span>
                  </div>
                ) : null}
                {payment.notes ? (
                  <div className="sm:col-span-2 whitespace-pre-wrap">
                    <strong>Notes:</strong> {payment.notes}
                  </div>
                ) : null}
              </div>
            </Card>
          )}

          {payment?.invoice ? (
            <Card title="Invoice Summary" padding="sm">
              {invError ? (
                <div className="text-xs text-red-700">{invError}</div>
              ) : null}
              {invLoading ? (
                <div className="text-xs text-gray-600">Loading invoice...</div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 sm:gap-2">
                    <div>
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="text-lg font-semibold text-gray-900">{invoice && invoice.total_amount != null ? fmtINR(invoice.total_amount) : 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Paid</div>
                      <div className="text-lg font-semibold text-emerald-700">{(() => { const paid = computePaid(invoice); return paid != null ? fmtINR(paid) : 'N/A' })()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Due</div>
                      <div className="text-lg font-semibold text-amber-700">{invoice && invoice.balance_due != null ? fmtINR(invoice.balance_due) : 'N/A'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-500">Status</div>
                      <div>{invoice?.status ? statusBadge(invoice.status) : 'N/A'}</div>
                    </div>
                  </div>
                  {(() => {
                    const total = Number(invoice?.total_amount ?? NaN)
                    const due = Number(invoice?.balance_due ?? NaN)
                    if (Number.isNaN(total) || total <= 0 || Number.isNaN(due)) return null
                    const paid = Math.max(0, total - due)
                    const pct = Math.min(100, Math.max(0, Math.round((paid / total) * 100)))
                    return (
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                          <span>Payment Progress</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </Card>
          ) : null}

          {(payment.created_at || payment.updated_at || payment.created_by || payment.updated_by) && (
            <Card title="Audit" padding="sm" className="text-xs">
              <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs">
                {payment.created_at && (
                  <div><strong>Created At:</strong> {fmtDateTime(payment.created_at)}</div>
                )}
                {payment.created_by && (
                  <div title={fullEmail(payment.created_by)}><strong>Created By:</strong> {formatUser(payment.created_by)}</div>
                )}
                {payment.updated_at && (
                  <div><strong>Updated At:</strong> {fmtDateTime(payment.updated_at)}</div>
                )}
                {payment.updated_by && (
                  <div title={fullEmail(payment.updated_by)}><strong>Updated By:</strong> {formatUser(payment.updated_by)}</div>
                )}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className="mb-4 text-gray-600">Select a payment from the list to see details.</div>
      )}
      {/* Invoice details modal */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title="Invoice Details"
        maxWidth="md"
      >
        <InvoiceDetails invoiceId={getInvoiceId(payment?.invoice)} />
      </Modal>
    </div>
  );
};

export default PaymentDetails;