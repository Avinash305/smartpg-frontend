import React, { useEffect, useMemo, useState } from 'react'
import PaymentHistory from '../payment/PaymentHistory'
import { getInvoices } from '../../services/payments'
import PaymentForm from '../payment/PaymentForm'
import apiClient from '../../services/api'
import Modal from '../ui/Modal'
import { Button } from '../ui/Button'
import { createInvoice } from '../../services/payments'
import { formatCurrency, formatDateOnly, formatDateForInput } from '../../utils/dateUtils'

// Lightweight wrapper to show payments and dues for a tenant (or a specific booking)
// Props:
// - tenantId: filter by tenant (via invoice -> booking -> tenant)
// - bookingId: optionally narrow to a booking
// - limit: number of payment rows to fetch/show
// - className: optional wrapper classes
const TenantPaymentHistory = ({ tenantId, bookingId, limit = 10, className = '' }) => {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // booking status (to allow adding payment dynamically only if confirmed)
  const [booking, setBooking] = useState(null)
  const [bookingLoading, setBookingLoading] = useState(false)

  // When only tenantId is provided, auto-detect a confirmed booking
  const [autoBookingId, setAutoBookingId] = useState(null)

  // trigger to refresh child PaymentHistory by remounting
  const [refreshTick, setRefreshTick] = useState(0)

  // modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // generate invoice progress
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState('')
  const [genSuccess, setGenSuccess] = useState('')

  // Active booking id for operations
  const activeBookingId = bookingId || autoBookingId

  const params = useMemo(() => {
    const p = {}
    if (tenantId) p.tenant = tenantId
    if (activeBookingId) p.booking = activeBookingId
    return p
  }, [tenantId, activeBookingId])

  // Auto-select tenant's confirmed booking when bookingId is not provided
  useEffect(() => {
    let alive = true
    const run = async () => {
      if (bookingId || !tenantId) { setAutoBookingId(null); return }
      try {
        const res = await apiClient.get('/bookings/bookings/', { params: { tenant: tenantId, status: 'confirmed' } })
        const list = Array.isArray(res.data) ? res.data : (res.data?.results || [])
        // Prefer most recent by booked_at; API already orders by -booked_at
        const b = list[0]
        if (alive) setAutoBookingId(b?.id || null)
      } catch (e) {
        if (alive) setAutoBookingId(null)
      }
    }
    run()
    return () => { alive = false }
  }, [tenantId, bookingId])

  // Fetch invoices for summary and PaymentForm options
  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!tenantId && !activeBookingId) {
        setInvoices([])
        return
      }
      try {
        setLoading(true)
        setError('')
        const res = await getInvoices(params)
        const list = Array.isArray(res) ? res : (res?.results || [])
        if (alive) setInvoices(list)
      } catch (e) {
        if (alive) setError(e?.response?.data?.detail || 'Failed to load invoices')
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [params, tenantId, activeBookingId, refreshTick])

  // Fetch booking to check status
  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!activeBookingId) { setBooking(null); return }
      try {
        setBookingLoading(true)
        const res = await apiClient.get(`/bookings/bookings/${activeBookingId}/`)
        if (alive) setBooking(res.data)
      } catch (e) {
        if (alive) setBooking(null)
      } finally {
        if (alive) setBookingLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [activeBookingId])

  // Compute summary metrics
  const summary = useMemo(() => {
    const now = new Date()
    const acc = (invoices || []).reduce((acc, inv) => {
      const total = Number(inv?.total_amount || 0)
      const due = Number(inv?.balance_due || 0)
      const dueDate = inv?.due_date ? new Date(inv.due_date) : null

      acc.totalInvoices += 1
      acc.totalBilled += total
      acc.totalDue += due
      acc.totalPaid += Math.max(0, total - due)

      if (due > 0) {
        acc.dueCount += 1
        if (dueDate) acc.dueDates.push(dueDate)
        if (dueDate && dueDate < now) {
          acc.overdueCount += 1
          acc.overdueAmount += due
        }
      }
      return acc
    }, { totalInvoices: 0, totalBilled: 0, totalPaid: 0, totalDue: 0, dueCount: 0, overdueCount: 0, overdueAmount: 0, dueDates: [] })

    let nextDueDate = null
    if (acc.dueDates.length) {
      nextDueDate = acc.dueDates.filter(d => !isNaN(d)).sort((a, b) => a - b)[0]
    }

    return {
      totalInvoices: acc.totalInvoices,
      totalBilled: acc.totalBilled,
      totalPaid: acc.totalPaid,
      totalDue: acc.totalDue,
      dueCount: acc.dueCount,
      overdueCount: acc.overdueCount,
      overdueAmount: acc.overdueAmount,
      nextDueDate: nextDueDate ? formatDateOnly(nextDueDate) : null,
    }
  }, [invoices])

  const fmtINR = (n) => formatCurrency(n)

  // Helpers for dates
  const toISODate = (d) => formatDateForInput(d)
  const firstOfMonthISO = (d) => {
    const dt = d instanceof Date ? d : new Date(d)
    if (isNaN(dt)) return undefined
    const start = new Date(dt.getFullYear(), dt.getMonth(), 1)
    return formatDateForInput(start)
  }

  // Determine if confirmation month invoice exists
  const hasConfirmationMonthInvoice = useMemo(() => {
    const bookedAt = booking?.booked_at
    if (!bookedAt) return false
    const cycle = firstOfMonthISO(new Date(bookedAt))
    return (invoices || []).some(inv => String(inv.cycle_month) === String(cycle))
  }, [booking?.booked_at, invoices])

  const netMonthly = useMemo(() => {
    const rent = Number(booking?.monthly_rent || 0)
    const maint = Number(booking?.maintenance_amount || 0)
    const disc = Number(booking?.discount_amount || 0)
    return rent + maint - disc
  }, [booking])

  const handleGenerateInvoice = async () => {
    if (!booking || !activeBookingId) return
    setGenError(''); setGenSuccess('')
    try {
      setGenLoading(true)
      const bookedAt = booking.booked_at
      const issue_date = formatDateForInput(new Date(bookedAt))
      // due = issue + 5 days
      const dueDt = new Date(bookedAt)
      dueDt.setDate(dueDt.getDate() + 5)
      const due_date = formatDateForInput(dueDt)
      const cycle_month = firstOfMonthISO(new Date(bookedAt))

      const payload = {
        booking: activeBookingId,
        cycle_month,
        issue_date,
        due_date,
        amount: Math.max(0, Number(booking?.monthly_rent || 0) + Number(booking?.maintenance_amount || 0)),
        tax_amount: 0,
        discount_amount: Number(booking?.discount_amount || 0),
        notes: 'Auto-generated on booking confirmation',
      }
      const inv = await createInvoice(payload)
      setGenSuccess(`Invoice #${inv?.id} generated`)
      setRefreshTick(t => t + 1)
    } catch (e) {
      const msg = e?.response?.data ? (typeof e.response.data === 'string' ? e.response.data : JSON.stringify(e.response.data)) : (e?.message || 'Failed to generate invoice')
      setGenError(msg)
    } finally {
      setGenLoading(false)
    }
  }

  // Default invoice to preselect in PaymentForm (first with balance due, prefer earliest due_date)
  const defaultInvoiceId = useMemo(() => {
    const withDue = (invoices || [])
      .filter(inv => Number(inv?.balance_due || 0) > 0 && (!activeBookingId || Number(inv.booking) === Number(activeBookingId)))
      .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))
    return withDue[0]?.id || ''
  }, [invoices, activeBookingId])

  const bookingConfirmed = String(booking?.status || '').toLowerCase() === 'confirmed'

  return (
    <div className={className}>
      {genError && (
        <div className="py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded mb-3">{genError}</div>
      )}
      {genSuccess && (
        <div className="py-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded mb-3">{genSuccess}</div>
      )}
      {/* Summary Header */}
      {(tenantId || activeBookingId) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
          <div className="p-3 rounded border bg-white shadow-sm">
            <div className="text-xs text-gray-500">Total Billed</div>
            <div className="text-lg font-semibold">{formatCurrency(summary.totalBilled)}</div>
          </div>
          <div className="p-3 rounded border bg-white shadow-sm">
            <div className="text-xs text-gray-500">Total Paid</div>
            <div className="text-lg font-semibold text-emerald-700">{formatCurrency(summary.totalPaid)}</div>
          </div>
          <div className="p-3 rounded border bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total Due</span>
              {summary.nextDueDate && (
                <span className="text-[11px] text-gray-500">Next due: {summary.nextDueDate}</span>
              )}
            </div>
            <div className={`text-lg font-semibold ${summary.totalDue > 0 ? 'text-red-700' : ''}`}>{formatCurrency(summary.totalDue)}</div>
          </div>
        </div>
      )}

      {(tenantId || activeBookingId) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700">
            Total Invoices: <strong className="ml-1">{summary.totalInvoices}</strong>
          </span>
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
            Due Invoices: <strong className="ml-1">{summary.dueCount}</strong>
          </span>
          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700">
            Overdue: <strong className="ml-1">{summary.overdueCount}</strong> • Amount {formatCurrency(summary.overdueAmount)}
          </span>
        </div>
      )}

      {/* Booking financial details */}
      {activeBookingId && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Booking Financials</h3>
            <span className="text-xs text-gray-500">
              {bookingLoading ? 'Loading…' : (booking ? `Booking #${booking.id}` : 'Not available')}
            </span>
          </div>
          {bookingLoading ? (
            <div className="text-xs text-gray-500">Fetching booking details…</div>
          ) : booking ? (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded border bg-white shadow-sm">
                <div className="text-xs text-gray-500">Monthly Rent</div>
                <div className="text-sm font-semibold">{formatCurrency(booking.monthly_rent)}</div>
              </div>
              <div className="p-3 rounded border bg-white shadow-sm">
                <div className="text-xs text-gray-500">Maintenance</div>
                <div className="text-sm font-semibold">{formatCurrency(booking.maintenance_amount)}</div>
              </div>
              <div className="p-3 rounded border bg-white shadow-sm">
                <div className="text-xs text-gray-500">Discount</div>
                <div className="text-sm font-semibold">{formatCurrency(booking.discount_amount)}</div>
              </div>
              <div className="p-3 rounded border bg-white shadow-sm">
                <div className="text-xs text-gray-500">Net Monthly</div>
                <div className="text-sm font-semibold text-indigo-700">
                  {formatCurrency(netMonthly)}
                </div>
              </div>
              <div className="p-3 rounded border bg-white shadow-sm">
                <div className="text-xs text-gray-500">Security Deposit</div>
                <div className="text-sm font-semibold">{formatCurrency(booking.security_deposit)}</div>
              </div>
            </div>
          ) : (
            <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">Booking details not found.</div>
          )}
          {booking && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={handleGenerateInvoice}
                loading={genLoading}
                disabled={!bookingConfirmed || hasConfirmationMonthInvoice}
                title={hasConfirmationMonthInvoice ? 'Invoice for confirmation month already exists' : ''}
              >
                {hasConfirmationMonthInvoice ? 'Invoice Exists for Confirm Month' : 'Generate Invoice (Confirm Month)'}
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded mb-3">{error}</div>
      )}

      {/* Conditionally allow adding payment when booking is confirmed */}
      {activeBookingId && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Add Payment</h3>
            <span className="text-xs text-gray-500">
              {bookingLoading ? 'Checking booking status…' : (bookingConfirmed ? 'Booking confirmed' : 'Booking not confirmed')}
            </span>
          </div>
          {bookingConfirmed ? (
            <Button size="sm" onClick={() => setShowPaymentModal(true)}>
              Add Payment
            </Button>
          ) : (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Payments can be recorded after the booking is confirmed.
            </div>
          )}

          <Modal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            title="Record Payment"
            maxWidth="md"
          >
            <PaymentForm
              tenantId={tenantId}
              bookingId={activeBookingId}
              invoices={invoices.filter(inv => Number(inv.booking) === Number(activeBookingId))}
              invoicesLoading={loading}
              defaultInvoiceId={defaultInvoiceId}
              defaultReceivedAtISO={bookingConfirmed ? booking?.booked_at : undefined}
              readOnlyReceivedAt={bookingConfirmed}
              onSuccess={() => {
                setShowPaymentModal(false)
                setRefreshTick(t => t + 1)
              }}
            />
          </Modal>
        </div>
      )}

      {/* Detailed payments table */}
      <PaymentHistory key={refreshTick} tenantId={tenantId} bookingId={activeBookingId} limit={limit} />

      {loading && (
        <div className="mt-2 text-sm text-gray-500">Loading tenant dues…</div>
      )}
    </div>
  )
}

export default TenantPaymentHistory