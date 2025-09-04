import api from './api'

const base = '/tenants/tenants/'

export const listTenants = (params = {}) => api.get(base, { params }).then(r => {
  const data = r.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
})
export const getTenant = (id) => api.get(`${base}${id}/`).then(r => r.data)
export const createTenant = (payload) => {
  // If payload is FormData, set multipart headers
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData
  const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
  return api.post(base, payload, config).then(r => r.data)
}
export const updateTenant = (id, payload) => {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData
  const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
  return api.put(`${base}${id}/`, payload, config).then(r => r.data)
}
export const patchTenant = (id, payload) => api.patch(`${base}${id}/`, payload).then(r => r.data)
export const deleteTenant = (id) => api.delete(`${base}${id}/`).then(r => r.data)

// Bed history (tenants app)
export const listBedHistory = (params = {}) => api.get('/tenants/bed-history/', { params }).then(r => {
  const data = r.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
})

// Stays (check-in / check-out)
export const createStay = (payload) => api.post('/tenants/stays/', payload).then(r => r.data)
export const listStays = (params = {}) => api.get('/tenants/stays/', { params }).then(r => {
  const data = r.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
})
export const patchStay = (id, payload) => api.patch(`/tenants/stays/${id}/`, payload).then(r => r.data)

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
 * Factory returning guarded tenants APIs bound to a scope (building id).
 * Usage:
 *   const { can } = useAuth();
 *   const tenantsApi = guardedTenants(can, buildingId);
 */
export const guardedTenants = (can, scopeId) => ({
  // Tenants
  listTenants: (params = {}) => {
    requirePerm(can, 'tenants', 'view', scopeId);
    return listTenants(params);
  },
  getTenant: (id) => {
    requirePerm(can, 'tenants', 'view', scopeId);
    return getTenant(id);
  },
  createTenant: (payload) => {
    requirePerm(can, 'tenants', 'add', scopeId);
    return createTenant(payload);
  },
  updateTenant: (id, payload) => {
    requirePerm(can, 'tenants', 'edit', scopeId);
    return updateTenant(id, payload);
  },
  patchTenant: (id, payload) => {
    requirePerm(can, 'tenants', 'edit', scopeId);
    return patchTenant(id, payload);
  },
  deleteTenant: (id) => {
    requirePerm(can, 'tenants', 'delete', scopeId);
    return deleteTenant(id);
  },

  // Bed History (treated as view permissions)
  listBedHistory: (params = {}) => {
    // You can switch 'tenants' -> 'beds' if you prefer to bind to beds module
    requirePerm(can, 'tenants', 'view', scopeId);
    return listBedHistory(params);
  },

  // Stays (map to tenants permissions)
  listStays: (params = {}) => {
    requirePerm(can, 'tenants', 'view', scopeId);
    return listStays(params);
  },
  createStay: (payload) => {
    requirePerm(can, 'tenants', 'add', scopeId);
    return createStay(payload);
  },
  patchStay: (id, payload) => {
    requirePerm(can, 'tenants', 'edit', scopeId);
    return patchStay(id, payload);
  },
})
