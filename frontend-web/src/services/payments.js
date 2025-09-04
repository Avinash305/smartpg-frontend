import apiClient from './api';

// Base under /api via apiClient baseURL
const PAYMENTS_BASE = '/payments';

// List all payments (payments app)
export async function getPayments(params = {}) {
  const res = await apiClient.get(`${PAYMENTS_BASE}/payments/`, { params });
  return res.data;
}

// Create a payment
export async function createPayment(payload) {
  const res = await apiClient.post(`${PAYMENTS_BASE}/payments/`, payload);
  return res.data;
}

// Update a payment (partial)
export async function updatePayment(paymentId, payload) {
  const res = await apiClient.patch(`${PAYMENTS_BASE}/payments/${paymentId}/`, payload);
  return res.data;
}

// Delete a payment (cancel)
export async function deletePayment(paymentId) {
  const res = await apiClient.delete(`${PAYMENTS_BASE}/payments/${paymentId}/`);
  return res.data;
}

// Create an invoice
export async function createInvoice(payload) {
  const res = await apiClient.post(`${PAYMENTS_BASE}/invoices/`, payload);
  return res.data;
}

// List invoices (useful to pick one with balance_due > 0)
export async function getInvoices(params = {}) {
  const res = await apiClient.get(`${PAYMENTS_BASE}/invoices/`, { params });
  return res.data;
}

// Retrieve a single invoice by id
export async function getInvoice(invoiceId) {
  const res = await apiClient.get(`${PAYMENTS_BASE}/invoices/${invoiceId}/`);
  return res.data;
}

// Optional: open an invoice (if backend action is used elsewhere)
export async function openInvoice(invoiceId) {
  const res = await apiClient.post(`${PAYMENTS_BASE}/invoices/${invoiceId}/open/`);
  return res.data;
}

// Export method enum for consistency with backend
export const PaymentMethods = Object.freeze({
  CASH: 'cash',
  UPI: 'upi',
  CARD: 'card',
  BANK: 'bank',
  OTHER: 'other',
});

// ---- Fallback helpers ----
// Fetch payments from bookings app and normalize fields to match payments app list
async function getBookingPaymentsNormalized(params = {}) {
  const { page, page_size, ...rest } = params || {};
  const res = await apiClient.get(`/bookings/payments/`, { params: rest });
  const data = res.data;
  const list = Array.isArray(data) ? data : (data?.results || []);
  // Map bookings.Payment -> payments-like shape
  return list.map((p) => ({
    id: p.id,
    invoice: p.booking ?? p.booking_id ?? '', // no invoice in bookings, show booking reference
    amount: p.amount,
    method: p.method,
    received_at: p.paid_on, // align with PaymentHistory display
    status: p.status, // expose bookings payment status to UI
    reference: p.reference,
    notes: p.notes,
    // Pass through building/property identifiers when available so building filter works
    building_id: p.building_id ?? p.property_id ?? null,
    property_id: p.property_id ?? p.building_id ?? null,
    building: p.building ?? null,
    property: p.property ?? null,
    // Help client-side matching/dedup and filtering
    booking_id: p.booking_id ?? (typeof p.booking === 'object' ? p.booking?.id : p.booking) ?? null,
    _source: 'bookings',
  }));
}

// Get payments from payments app; if empty, fallback to bookings payments
export async function getPaymentsAny(params = {}) {
  try {
    const primary = await getPayments(params);
    const primaryList = Array.isArray(primary) ? primary : (primary?.results || []);
    if (primaryList.length > 0) return primary;
    // Fallback
    const bkList = await getBookingPaymentsNormalized(params);
    // Return as an array to PaymentHistory which supports array or paginated
    return bkList;
  } catch (e1) {
    // On failure, try fallback too
    try {
      const bkList = await getBookingPaymentsNormalized(params);
      return bkList;
    } catch (e2) {
      throw e2;
    }
  }
}

// Query both endpoints in parallel and merge results (payments first), returning a flat array
export async function getPaymentsMerged(params = {}) {
  const [primary, bookingsNorm] = await Promise.allSettled([
    getPayments(params),
    getBookingPaymentsNormalized(params),
  ]);
  let list = [];
  if (primary.status === 'fulfilled') {
    const a = Array.isArray(primary.value) ? primary.value : (primary.value?.results || []);
    // Tag source for safety
    list = list.concat(a.map((p) => ({ ...p, _source: p._source || 'payments' })));
  }
  if (bookingsNorm.status === 'fulfilled') {
    // Prefer payments-app entries when the same logical payment appears in both sources
    const toKey = (p) => {
      const amt = Number(p?.amount || 0).toFixed(2);
      const dateIso = (() => {
        const v = p?.received_at || p?.paid_on || p?.updated_at || p?.created_at;
        if (!v) return '';
        try { return new Date(v).toISOString().slice(0, 10); } catch { return ''; }
      })();
      const bld = (
        p?.building_id ?? p?.building ?? p?.invoice?.booking?.building_id ?? p?.booking?.building_id ?? p?.property_id ?? ''
      );
      const bk = p?.booking_id ?? p?.invoice?.booking_id ?? '';
      return `${amt}|${dateIso}|${bld}|${bk}`;
    };
    const primaryKeys = new Set(list.map(toKey));
    const filteredBookings = (Array.isArray(bookingsNorm.value) ? bookingsNorm.value : [])
      .filter((p) => !primaryKeys.has(toKey(p)));
    list = list.concat(filteredBookings);
  }
  // De-duplicate by composite key of source+id
  const seen = new Set();
  const dedup = [];
  for (const p of list) {
    const key = `${p._source || 'payments'}:${p.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedup.push(p);
    }
  }
  return dedup;
}

// ---------------------------------------------
// Permission guards for pg_staff (and others)
// ---------------------------------------------

/**
 * Throw a 403-like error if permission is missing
 * @param {(module:string, action:string, scopeId?:string|number)=>boolean} can
 * @param {string} module
 * @param {"view"|"add"|"edit"|"delete"} action
 * @param {string|number} scopeId building id or 'global'
 */
export const requirePerm = (can, module, action, scopeId) => {
  const allowed = typeof can === 'function' ? can(module, action, scopeId) : false;
  if (!allowed) {
    const err = new Error('Permission denied');
    err.status = 403;
    err.code = 'PERMISSION_DENIED';
    err.meta = { module, action, scopeId };
    throw err;
  }
};

/**
 * Factory returning guarded payments/invoices APIs bound to a scope (building id).
 * Usage:
 *   const { can } = useAuth();
 *   const payApi = guardedPayments(can, buildingId);
 */
export const guardedPayments = (can, scopeId) => ({
  // Payments
  getPayments: (params = {}) => {
    requirePerm(can, 'payments', 'view', scopeId);
    return getPayments(params);
  },
  getPaymentsAny: (params = {}) => {
    // Allow if user can view payments OR bookings (since fallback uses bookings)
    const allowed = (typeof can === 'function' && (can('payments', 'view', scopeId) || can('bookings', 'view', scopeId)));
    if (!allowed) requirePerm(can, 'payments', 'view', scopeId);
    return getPaymentsAny(params);
  },
  getPaymentsMerged: (params = {}) => {
    const allowed = (typeof can === 'function' && (can('payments', 'view', scopeId) || can('bookings', 'view', scopeId)));
    if (!allowed) requirePerm(can, 'payments', 'view', scopeId);
    return getPaymentsMerged(params);
  },
  createPayment: (payload) => {
    requirePerm(can, 'payments', 'add', scopeId);
    return createPayment(payload);
  },
  updatePayment: (id, payload) => {
    requirePerm(can, 'payments', 'edit', scopeId);
    return updatePayment(id, payload);
  },
  deletePayment: (id) => {
    requirePerm(can, 'payments', 'delete', scopeId);
    return deletePayment(id);
  },

  // Invoices
  getInvoices: (params = {}) => {
    requirePerm(can, 'invoices', 'view', scopeId);
    return getInvoices(params);
  },
  getInvoice: (invoiceId) => {
    requirePerm(can, 'invoices', 'view', scopeId);
    return getInvoice(invoiceId);
  },
  createInvoice: (payload) => {
    requirePerm(can, 'invoices', 'add', scopeId);
    return createInvoice(payload);
  },
  openInvoice: (invoiceId) => {
    // Treat as an edit-like action
    requirePerm(can, 'invoices', 'edit', scopeId);
    return openInvoice(invoiceId);
  },
});

// ---------------------------
// Invoice Settings Endpoints
// ---------------------------

// GET /payments/invoice-settings/current
export async function getInvoiceSettingsCurrent(params = {}) {
  const res = await apiClient.get(`${PAYMENTS_BASE}/invoice-settings/current`, { params });
  return res.data;
}

// POST /payments/invoice-settings/
export async function createInvoiceSettings(payload) {
  const res = await apiClient.post(`${PAYMENTS_BASE}/invoice-settings/`, payload);
  return res.data;
}

// PUT /payments/invoice-settings/{id}/
export async function updateInvoiceSettings(id, payload) {
  const res = await apiClient.put(`${PAYMENTS_BASE}/invoice-settings/${id}/`, payload);
  return res.data;
}