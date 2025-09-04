import api from './api';

// Buildings
export const getBuildings = (params = {}) => api.get('/properties/buildings/', { params }).then(r => r.data);
export const getBuilding = (id) => api.get(`/properties/buildings/${id}/`).then(r => r.data);
export const createBuilding = (payload) => api.post('/properties/buildings/', payload).then(r => r.data);
export const updateBuilding = (id, payload) => api.put(`/properties/buildings/${id}/`, payload).then(r => r.data);
export const patchBuilding = (id, payload) => api.patch(`/properties/buildings/${id}/`, payload).then(r => r.data);
export const deleteBuilding = (id) => api.delete(`/properties/buildings/${id}/`).then(r => r.data);

// Floors
export const getFloors = (params = {}) => api.get('/properties/floors/', { params }).then(r => r.data);
export const getFloor = (id) => api.get(`/properties/floors/${id}/`).then(r => r.data);
export const createFloor = (payload) => api.post('/properties/floors/', payload).then(r => r.data);
export const updateFloor = (id, payload) => api.put(`/properties/floors/${id}/`, payload).then(r => r.data);
export const patchFloor = (id, payload) => api.patch(`/properties/floors/${id}/`, payload).then(r => r.data);
export const deleteFloor = (id) => api.delete(`/properties/floors/${id}/`).then(r => r.data);

// Rooms
export const getRooms = (params = {}) => api.get('/properties/rooms/', { params }).then(r => r.data);
export const getRoom = (id) => api.get(`/properties/rooms/${id}/`).then(r => r.data);
export const createRoom = (payload) => api.post('/properties/rooms/', payload).then(r => r.data);
export const updateRoom = (id, payload) => api.put(`/properties/rooms/${id}/`, payload).then(r => r.data);
export const patchRoom = (id, payload) => api.patch(`/properties/rooms/${id}/`, payload).then(r => r.data);
export const deleteRoom = (id) => api.delete(`/properties/rooms/${id}/`).then(r => r.data);

// Beds
export const getBeds = (params = {}) => api.get('/properties/beds/', { params }).then(r => r.data);
export const getBed = (id) => api.get(`/properties/beds/${id}/`).then(r => r.data);
export const createBed = (payload) => api.post('/properties/beds/', payload).then(r => r.data);
export const updateBed = (id, payload) => api.put(`/properties/beds/${id}/`, payload).then(r => r.data);
export const deleteBed = (id) => api.delete(`/properties/beds/${id}/`).then(r => r.data);
export const getBedHistory = (id, params = {}) => api.get(`/properties/beds/${id}/history/`, { params }).then(r => r.data);

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
 * Factory returning guarded property APIs bound to a scope (building id).
 * Usage in components:
 *   const { can } = useAuth();
 *   const propsApi = guarded(can, buildingId);
 *   await propsApi.createRoom({ ... });
 */
export const guarded = (can, scopeId) => ({
  // Buildings
  getBuildings: (params = {}) => {
    requirePerm(can, 'buildings', 'view', scopeId);
    return getBuildings(params);
  },
  getBuilding: (id) => {
    requirePerm(can, 'buildings', 'view', scopeId);
    return getBuilding(id);
  },
  createBuilding: (payload) => {
    requirePerm(can, 'buildings', 'add', scopeId);
    return createBuilding(payload);
  },
  updateBuilding: (id, payload) => {
    requirePerm(can, 'buildings', 'edit', scopeId);
    return updateBuilding(id, payload);
  },
  patchBuilding: (id, payload) => {
    requirePerm(can, 'buildings', 'edit', scopeId);
    return patchBuilding(id, payload);
  },
  deleteBuilding: (id) => {
    requirePerm(can, 'buildings', 'delete', scopeId);
    return deleteBuilding(id);
  },

  // Floors
  getFloors: (params = {}) => {
    requirePerm(can, 'floors', 'view', scopeId);
    return getFloors(params);
  },
  getFloor: (id) => {
    requirePerm(can, 'floors', 'view', scopeId);
    return getFloor(id);
  },
  createFloor: (payload) => {
    requirePerm(can, 'floors', 'add', scopeId);
    return createFloor(payload);
  },
  updateFloor: (id, payload) => {
    requirePerm(can, 'floors', 'edit', scopeId);
    return updateFloor(id, payload);
  },
  patchFloor: (id, payload) => {
    requirePerm(can, 'floors', 'edit', scopeId);
    return patchFloor(id, payload);
  },
  deleteFloor: (id) => {
    requirePerm(can, 'floors', 'delete', scopeId);
    return deleteFloor(id);
  },

  // Rooms
  getRooms: (params = {}) => {
    requirePerm(can, 'rooms', 'view', scopeId);
    return getRooms(params);
  },
  getRoom: (id) => {
    requirePerm(can, 'rooms', 'view', scopeId);
    return getRoom(id);
  },
  createRoom: (payload) => {
    requirePerm(can, 'rooms', 'add', scopeId);
    return createRoom(payload);
  },
  updateRoom: (id, payload) => {
    requirePerm(can, 'rooms', 'edit', scopeId);
    return updateRoom(id, payload);
  },
  patchRoom: (id, payload) => {
    requirePerm(can, 'rooms', 'edit', scopeId);
    return patchRoom(id, payload);
  },
  deleteRoom: (id) => {
    requirePerm(can, 'rooms', 'delete', scopeId);
    return deleteRoom(id);
  },

  // Beds
  getBeds: (params = {}) => {
    requirePerm(can, 'beds', 'view', scopeId);
    return getBeds(params);
  },
  getBed: (id) => {
    requirePerm(can, 'beds', 'view', scopeId);
    return getBed(id);
  },
  createBed: (payload) => {
    requirePerm(can, 'beds', 'add', scopeId);
    return createBed(payload);
  },
  updateBed: (id, payload) => {
    requirePerm(can, 'beds', 'edit', scopeId);
    return updateBed(id, payload);
  },
  deleteBed: (id) => {
    requirePerm(can, 'beds', 'delete', scopeId);
    return deleteBed(id);
  },
  getBedHistory: (id, params = {}) => {
    requirePerm(can, 'beds', 'view', scopeId);
    return getBedHistory(id, params);
  },
});
