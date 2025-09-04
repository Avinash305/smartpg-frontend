import apiClient from './api';

// Base under /api via apiClient baseURL
const PAYMENTS_BASE = '/payments';

// ---- Expenses (payments app) ----
export async function listExpenses(params = {}) {
  const res = await apiClient.get(`${PAYMENTS_BASE}/expenses/`, { params });
  return res.data;
}

export async function getExpense(id) {
  const res = await apiClient.get(`${PAYMENTS_BASE}/expenses/${id}/`);
  return res.data;
}

// Helper to ensure FormData for payloads that may include attachment
function toFormData(payload) {
  if (payload instanceof FormData) return payload;
  const fd = new FormData();
  Object.entries(payload || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (v instanceof File || v instanceof Blob) {
      fd.append(k, v);
    } else if (Array.isArray(v)) {
      v.forEach((item) => fd.append(k, item));
    } else {
      fd.append(k, v);
    }
  });
  return fd;
}

export async function createExpense(payload) {
  const formData = toFormData(payload);
  const res = await apiClient.post(`${PAYMENTS_BASE}/expenses/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function updateExpense(id, payload, { method = 'patch' } = {}) {
  const formData = toFormData(payload);
  const fn = method.toLowerCase() === 'put' ? apiClient.put : apiClient.patch;
  const res = await fn(`${PAYMENTS_BASE}/expenses/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deleteExpense(id) {
  const res = await apiClient.delete(`${PAYMENTS_BASE}/expenses/${id}/`);
  return res.data;
}

// ---- Expense Categories (dynamic) ----
export async function listExpenseCategories(params = {}) {
  const res = await apiClient.get(`${PAYMENTS_BASE}/expense-categories/`, { params });
  return res.data;
}

export async function createExpenseCategory(payload) {
  // payload: { name: string, is_active?: boolean }
  const res = await apiClient.post(`${PAYMENTS_BASE}/expense-categories/`, payload);
  return res.data;
}

export async function updateExpenseCategory(id, payload) {
  // payload can include: { name?: string, is_active?: boolean }
  const res = await apiClient.patch(`${PAYMENTS_BASE}/expense-categories/${id}/`, payload);
  return res.data;
}

export async function deleteExpenseCategory(id) {
  const res = await apiClient.delete(`${PAYMENTS_BASE}/expense-categories/${id}/`);
  return res.data;
}
