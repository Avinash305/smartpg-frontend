import api from './api';

const base = '/bookings/bookings/';

// -----------------------
// Low-level API (unguarded)
// -----------------------

export const listBookings = (params = {}) => api.get(base, { params }).then((r) => {
  const data = r.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
});

export const getBooking = (id) => api.get(`${base}${id}/`).then((r) => r.data);

export const createBooking = (payload) => api.post(base, payload).then((r) => r.data);

export const updateBooking = (id, payload) => api.put(`${base}${id}/`, payload).then((r) => r.data);

export const patchBooking = (id, payload) => api.patch(`${base}${id}/`, payload).then((r) => r.data);

export const deleteBooking = (id) => api.delete(`${base}${id}/`).then((r) => r.data);

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
 * Factory returning guarded bookings APIs bound to a scope (building id).
 * Usage:
 *   const { can } = useAuth();
 *   const bookingsApi = guardedBookings(can, buildingId);
 */
export const guardedBookings = (can, scopeId) => ({
  listBookings: (params = {}) => {
    requirePerm(can, 'bookings', 'view', scopeId);
    return listBookings(params);
  },
  getBooking: (id) => {
    requirePerm(can, 'bookings', 'view', scopeId);
    return getBooking(id);
  },
  createBooking: (payload) => {
    requirePerm(can, 'bookings', 'add', scopeId);
    return createBooking(payload);
  },
  updateBooking: (id, payload) => {
    requirePerm(can, 'bookings', 'edit', scopeId);
    return updateBooking(id, payload);
  },
  patchBooking: (id, payload) => {
    requirePerm(can, 'bookings', 'edit', scopeId);
    return patchBooking(id, payload);
  },
  deleteBooking: (id) => {
    requirePerm(can, 'bookings', 'delete', scopeId);
    return deleteBooking(id);
  },
});
