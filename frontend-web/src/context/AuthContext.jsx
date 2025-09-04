import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import apiClient from '../services/api';
import { emitToast } from './ToastContext';
import i18next from 'i18next';

const API_URL = 'http://localhost:8000/api'; // Update with your backend URL

// Set a default baseURL so we can use relative endpoints below
axios.defaults.baseURL = API_URL;

// Keep in sync with components/staffs/StaffPermissions.jsx
const MODEL_DEFS = [
  { key: 'buildings', label: 'Buildings' },
  { key: 'floors', label: 'Floors' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'beds', label: 'Beds' },
  { key: 'tenants', label: 'Tenants' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'payments', label: 'Payments' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'expenses', label: 'Expenses' },
];
const PERM_KEYS = ['view', 'add', 'edit', 'delete'];

const ensureBuildingPermStruct = (perms, buildingId) => {
  const next = { ...(perms || {}) };
  if (!next[buildingId]) next[buildingId] = {};
  for (const m of MODEL_DEFS) {
    if (!next[buildingId][m.key]) {
      next[buildingId][m.key] = { view: false, add: false, edit: false, delete: false };
    } else {
      for (const k of PERM_KEYS) {
        if (typeof next[buildingId][m.key][k] !== 'boolean') next[buildingId][m.key][k] = false;
      }
    }
  }
  return next;
};

// Build a default module-permission map with all keys present
const buildDefaultScopePerms = () => {
  const scope = {};
  for (const m of MODEL_DEFS) {
    scope[m.key] = { view: false, add: false, edit: false, delete: false };
  }
  return scope;
};

const AuthContext = createContext(null);

// API functions
const loginAPI = async (credentials) => {
  try {
    const response = await axios.post('/auth/token/', 
      {
        email: credentials.email,
        password: credentials.password
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Login API error:', error.response?.data || error.message);
    throw error;
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [locTick, setLocTick] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionError, setSubscriptionError] = useState('');

  // Persist backend localization settings to localStorage
  const persistLocalizationToLocalStorage = (data) => {
    try {
      if (!data) return;
      if (data.timezone) localStorage.setItem('app_timezone', data.timezone);
      if (data.date_format) localStorage.setItem('app_date_format', data.date_format);
      if (data.time_format) localStorage.setItem('app_time_format', data.time_format);
    } catch {}
  };

  // Check if localization is already persisted; if so, we can skip the fetch
  const hasPersistedLocalization = () => {
    try {
      const tz = localStorage.getItem('app_timezone');
      const df = localStorage.getItem('app_date_format');
      const tf = localStorage.getItem('app_time_format');
      return !!(tz && df && tf);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const access = localStorage.getItem('access');
    if (access) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

      const fetchUser = async () => {
        try {
          const response = await axios.get('/users/me/');
          setCurrentUser(response.data);
          // Ensure a current subscription exists (auto-create Free fallback if absent)
          try {
            const subResp = await apiClient.get('/subscription/current/', {
              validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
            });
            if (subResp.status === 200) {
              setSubscription(subResp.data || null);
              setSubscriptionError('');
            } else if (subResp.status === 404) {
              setSubscription(null);
              const detail = (subResp?.data && (subResp.data.detail || subResp.data.message)) || 'No active subscription';
              setSubscriptionError(String(detail));
            }
          } catch (_) { /* ignore */ }
          // Fetch localization settings and persist
          try {
            // Only fetch if not already persisted to avoid expected 404 on boot
            if (!hasPersistedLocalization()) {
               const locResp = await apiClient.get('/localization-settings/current/', {
                 validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
               });
               if (locResp.status === 200) {
                 persistLocalizationToLocalStorage(locResp.data);
               }
             }
           } catch (_) { /* ignore */ }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Notify once on initial load error
          const status = error?.response?.status;
          if (status === 401) {
            emitToast({ type: 'warning', message: 'Session expired. Refreshing session…' });
          }
          // If access is expired on first load, try a one-time refresh before interceptor is ready
          const refresh = localStorage.getItem('refresh');
          if (status === 401 && refresh) {
            try {
              const { data } = await axios.post('/auth/token/refresh/', { refresh });
              if (data?.access) {
                localStorage.setItem('access', data.access);
                axios.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
                const retry = await axios.get('/users/me/');
                setCurrentUser(retry.data);
                return;
              }
            } catch (e) {
              // fall through to cleanup
            }
          }
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
          delete axios.defaults.headers.common['Authorization'];
          if (status === 401) {
            emitToast({ type: 'error', message: 'Session expired. Please log in again.' });
          }
        } finally {
          setLoading(false);
        }
      };

      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Keep HTML lang and localStorage in sync with current user's language
  useEffect(() => {
    const lang = currentUser?.language || localStorage.getItem('app_language') || 'en';
    try {
      localStorage.setItem('app_language', lang);
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    // Also update i18n runtime language
    try { i18next.changeLanguage(lang); } catch {}
  }, [currentUser?.language]);

  const login = async (credentials) => {
    try {
      const data = await loginAPI(credentials);
      // Persist tokens
      localStorage.setItem('access', data.access);
      if (data.refresh) localStorage.setItem('refresh', data.refresh);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;

      // Fetch user data after successful login
      const userResponse = await axios.get('/users/me/');
      setCurrentUser(userResponse.data);

      // Fire-and-forget: ensure subscription is initialized
      try {
        const subResp = await apiClient.get('/subscription/current/', {
          validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
        });
        if (subResp.status === 200) {
          setSubscription(subResp.data || null);
          setSubscriptionError('');
        } else if (subResp.status === 404) {
          setSubscription(null);
          const detail = (subResp?.data && (subResp.data.detail || subResp.data.message)) || 'No active subscription';
          setSubscriptionError(String(detail));
        }
      } catch (_) { /* ignore */ }
      // Fetch localization settings and persist
      try {
        // Only fetch if not already persisted to avoid expected 404 on boot
        if (!hasPersistedLocalization()) {
           const locResp = await apiClient.get('/localization-settings/current/', {
             validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
           });
           if (locResp.status === 200) {
             persistLocalizationToLocalStorage(locResp.data);
           }
         }
       } catch (_) { /* ignore */ }

      // Return user data to the component
      return userResponse.data;
    } catch (error) {
      console.error('Login failed:', error);
      const msg = error.response?.data?.detail || 'Login failed. Please check your credentials.';
      emitToast({ type: 'error', message: msg });
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    navigate('/login');
  };

  // Setup an axios response interceptor to refresh access token on 401 and retry once
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const refresh = localStorage.getItem('refresh');
          if (refresh) {
            try {
              const { data } = await axios.post('/auth/token/refresh/', { refresh });
              const newAccess = data?.access;
              if (newAccess) {
                localStorage.setItem('access', newAccess);
                axios.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
                originalRequest.headers = {
                  ...(originalRequest.headers || {}),
                  Authorization: `Bearer ${newAccess}`,
                };
                return axios(originalRequest);
              }
            } catch (e) {
              // Refresh failed; perform logout
              emitToast({ type: 'error', message: 'Session expired. Please log in again.' });
              logout();
            }
          } else {
            emitToast({ type: 'error', message: 'Session expired. Please log in again.' });
            logout();
          }
        }
        // Permission denied feedback
        if (error.response?.status === 403) {
          const apiMsg = error.response?.data?.detail || 'You do not have permission to perform this action.';
          emitToast({ type: 'warning', message: apiMsg });
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [logout]);

  // New: refresh current user data from API
  const refreshCurrentUser = async () => {
    const response = await axios.get('/users/me/');
    setCurrentUser(response.data);
    return response.data;
  };

  // Trigger a global re-render when localization settings change
  const notifyLocalizationChanged = () => {
    setLocTick((t) => t + 1);
  };

  const value = {
    currentUser,
    subscription,
    subscriptionError,
    hasSubscription: (() => {
      const s = subscription;
      if (!s) return false;
      const status = String(s.status || '').toLowerCase();
      if (!(status === 'active' || status === 'trialing')) return false;
      try {
        return !s.current_period_end || new Date(s.current_period_end) > new Date();
      } catch {
        return false;
      }
    })(),
    // Plan limits and helpers
    planLimits: subscription?.plan?.limits || {},
    hasPlanFeature: (featureKey) => {
      try {
        const features = subscription?.plan?.features || {};
        return !!features[featureKey];
      } catch { return false; }
    },
    getPlanLimit: (limitKey, fallback = null) => {
      try {
        const limits = subscription?.plan?.limits || {};
        return (limits[limitKey] ?? fallback);
      } catch { return fallback; }
    },
    // Role helpers
    isPGAdmin: currentUser?.role === 'pg_admin',
    isPGStaff: currentUser?.role === 'pg_staff',
    // Raw permissions from backend (JSONField on User)
    permissions: currentUser?.permissions || {},
    // Returns a fully-shaped permissions object for a building
    // Useful to power UIs that expect all modules/perm keys to exist
    getBuildingPermissions: (buildingId) => {
      if (!buildingId) return {};
      return ensureBuildingPermStruct(currentUser?.permissions || {}, String(buildingId))[String(buildingId)] || {};
    },
    // Returns a fully-shaped permissions object for the given scope
    // scopeId: 'global' | buildingId
    getScopePermissions: (scopeId = 'global') => {
      const perms = currentUser?.permissions || {};
      // Admins effectively have all permissions; return all true
      if (currentUser?.role === 'pg_admin') {
        const all = buildDefaultScopePerms();
        for (const k of Object.keys(all)) {
          all[k] = { view: true, add: true, edit: true, delete: true };
        }
        return all;
      }
      if (!scopeId || scopeId === 'global') {
        const def = buildDefaultScopePerms();
        const g = perms['global'] || {};
        const shaped = {};
        for (const m of MODEL_DEFS) {
          shaped[m.key] = { ...def[m.key], ...(g[m.key] || {}) };
        }
        return shaped;
      }
      const structured = ensureBuildingPermStruct(perms, String(scopeId));
      return structured[String(scopeId)] || buildDefaultScopePerms();
    },
    // Permission checker
    // Usage: can('tenants', 'view') or can('bookings', 'add', buildingId)
    can: (module, action, scopeId = 'global') => {
      const perms = currentUser?.permissions || {};
      // PG Admins pass-through
      if (currentUser?.role === 'pg_admin') return true;
      // If scopeId is provided and not 'global', ensure shape like StaffPermissions
      if (scopeId && scopeId !== 'global') {
        const structured = ensureBuildingPermStruct(perms, String(scopeId));
        const mod = structured[String(scopeId)]?.[module] || {};
        return !!mod[action];
      }
      const scope = perms[scopeId] || {};
      const mod = scope[module] || {};
      return !!mod[action];
    },
    // Check if user has ANY of the actions for a module
    canAny: (module, actions = [], scopeId = 'global') => {
      const list = Array.isArray(actions) ? actions : [actions];
      return list.some((a) => (
        // PG Admins pass-through
        (currentUser?.role === 'pg_admin') || value.can(module, a, scopeId)
      ));
    },
    // Check if user has ALL of the actions for a module
    canAll: (module, actions = [], scopeId = 'global') => {
      const list = Array.isArray(actions) ? actions : [actions];
      if (currentUser?.role === 'pg_admin') return true;
      return list.every((a) => value.can(module, a, scopeId));
    },
    login,
    logout,
    isAuthenticated: !!currentUser,
    loading,
    refreshCurrentUser,
    locTick,
    notifyLocalizationChanged,
    // Localization exposure for consumers
    localeTag: (typeof localStorage !== 'undefined' && (localStorage.getItem('app_language') || 'en')),
    timeZone: (typeof localStorage !== 'undefined' && (localStorage.getItem('app_timezone') || 'Asia/Kolkata')),
    locDateFormat: (typeof localStorage !== 'undefined' && (localStorage.getItem('app_date_format') || 'dd-MM-yyyy')),
    locTimeFormat: (typeof localStorage !== 'undefined' && (localStorage.getItem('app_time_format') || 'hh:mm a')),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Convenience hook to access only permission utilities
export const useCan = () => {
  const { can, canAny, canAll, isPGAdmin, isPGStaff, permissions, getBuildingPermissions, getScopePermissions } = useContext(AuthContext);
  return { can, canAny, canAll, isPGAdmin, isPGStaff, permissions, getBuildingPermissions, getScopePermissions };
};

// Lightweight conditional components for permission-gated UI
export const RequirePermission = ({ module, action, scopeId = 'global', fallback = null, children }) => {
  const { can, isPGAdmin } = useCan();
  if (isPGAdmin) return children;
  return can(module, action, scopeId) ? children : fallback;
};

export const RequireAnyPermission = ({ module, actions = [], scopeId = 'global', fallback = null, children }) => {
  const { canAny } = useCan();
  return canAny(module, actions, scopeId) ? children : fallback;
};
