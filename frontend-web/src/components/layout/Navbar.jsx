import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiMenu,
  FiBell,
  FiUser,
  FiSettings,
  FiLogOut,
  FiChevronDown,
  FiInfo,
  FiAlertCircle,
  FiCheckCircle,
  FiHome,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, useCan } from '../../context/AuthContext';
import apiClient from '../../services/api';
import { useTranslation } from 'react-i18next';
import { getBuildings } from '../../services/properties';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/DropdownMenu';
import { Checkbox } from '../ui/Checkbox';
import ActivityItem from '../activities/ActivityItem';

// Navbar renders the top app bar, including:
// - Sidebar toggle
// - Notifications (badge, dropdown with recent items)
// - Profile menu (profile/settings/logout)

const Navbar = ({ toggleSidebar, isMobile, sidebarOpen, isCollapsed }) => {
  const { currentUser, logout } = useAuth();
  const { can, isPGAdmin } = useCan();
  const { t, i18n } = useTranslation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  // Unread badge number in the bell icon
  const [unreadCount, setUnreadCount] = useState(0);
  const [activityUnreadCount, setActivityUnreadCount] = useState(0);
  const [invoicesDueCount, setInvoicesDueCount] = useState(0);
  const isFetching = useRef(false);

  // Notifications dropdown state and recent notifications data
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const [recent, setRecent] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Persist "last seen" timestamp to compute read/unread across app sessions
  const getLastSeen = () => {
    const v = localStorage.getItem('notif_last_seen');
    return v ? Date.parse(v) : 0;
  };
  const setLastSeen = (date = new Date()) => {
    localStorage.setItem('notif_last_seen', date.toISOString());
  };

  // Utility: human-friendly relative timestamp for compact display in the dropdown
  const relativeTime = (iso) => {
    try {
      const now = new Date();
      const d = new Date(iso);
      const seconds = Math.floor((now - d) / 1000);
      const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
      if (seconds < 60) return rtf.format(-0, 'second'); // "just now"
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return rtf.format(-minutes, 'minute');
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return rtf.format(-hours, 'hour');
      const days = Math.floor(hours / 24);
      if (days < 7) return rtf.format(-days, 'day');
      // Fallback to locale date string beyond a week
      return d.toLocaleDateString(i18n.language);
    } catch {
      return '';
    }
  };

  // Utility: choose an icon + color based on the action text
  const getNotifIcon = (action = '') => {
    const a = String(action).toLowerCase();
    if (a.includes('error') || a.includes('fail')) return { Icon: FiAlertCircle, cls: 'text-red-500 bg-red-50' };
    if (a.includes('success') || a.includes('created') || a.includes('added')) return { Icon: FiCheckCircle, cls: 'text-green-600 bg-green-50' };
    if (a.includes('update') || a.includes('info') || a.includes('changed')) return { Icon: FiInfo, cls: 'text-blue-600 bg-blue-50' };
    if (a.includes('building') || a.includes('room') || a.includes('booking')) return { Icon: FiHome, cls: 'text-indigo-600 bg-indigo-50' };
    return { Icon: FiInfo, cls: 'text-gray-600 bg-gray-50' };
  };

  // Safely extract a displayable label from possibly-object values
  const getDisplayLabel = (val) => {
    if (val == null) return '';
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    if (typeof val === 'object') {
      return (
        val.name ||
        val.full_name ||
        val.display_name ||
        val.title ||
        val.label ||
        ''
      );
    }
    return '';
  };

  // Extract a concise list of changed fields from various shapes
  const getChangesSummary = (a) => {
    if (!a) return [];
    const meta = a.meta || {};
    const candidates = [a.changes, a.diff, a.updated_fields, a.fields_changed, meta.changes, meta.diff];
    let c = candidates.find((x) => x && (typeof x === 'string' || Array.isArray(x) || typeof x === 'object'));
    if (!c) return [];
    if (typeof c === 'string') {
      return c.split(/[;,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
    }
    if (Array.isArray(c)) {
      return c.map((x) => String(x)).filter(Boolean).slice(0, 5);
    }
    if (c && typeof c === 'object') {
      const out = [];
      for (const [field, val] of Object.entries(c)) {
        if (val && typeof val === 'object') {
          const from = val.from ?? (Array.isArray(val) ? val[0] : undefined);
          const to = val.to ?? (Array.isArray(val) ? val[1] : undefined);
          if (from !== undefined || to !== undefined) {
            out.push(`${field}: ${from ?? '—'} → ${to ?? '—'}`);
          } else {
            out.push(String(field));
          }
        } else {
          out.push(String(field));
        }
        if (out.length >= 5) break;
      }
      return out;
    }
    return [];
  };

  // --- Activity helpers for filtering allowed modules ---
  const activityModule = (a) => {
    const raw = String(a?.module || a?.meta?.module || a?.meta?.type || a?.type || '').toLowerCase();
    if (raw) return raw;
    const m = a?.meta || {};
    const act = String(a?.action || a?.event || '').toLowerCase();
    if (m.payment || /payment/.test(act)) return 'payment';
    if (m.invoice) return 'invoice';
    if (m.tenant || a?.tenant) return 'tenant';
    if (m.expense || a?.expense || /expense/.test(act)) return 'expense';
    return '';
  };
  const isAllowedActivity = (a) => {
    const mod = activityModule(a);
    return mod.includes('payment') || mod.includes('invoice') || mod.includes('tenant') || mod.includes('expense');
  };

  // Fetch count of due invoices (balance_due > 0 and status in open/partial/overdue), scoped by building filter
  const getInvoicesDueCount = async () => {
    if (!isPGAdmin) return 0;
    try {
      const params = {
        page_size: 1, // rely on DRF count when paginated; fallback to results length if array
        status__in: 'open,partial,overdue',
        balance_due__gt: 0,
      };
      if (Array.isArray(buildingSelected) && buildingSelected.length > 0) {
        params.building__in = buildingSelected.join(',');
      }
      const { data } = await apiClient.get('/payments/invoices/', { params });
      if (typeof data?.count === 'number') return data.count;
      const list = Array.isArray(data) ? data : (data?.results || []);
      return Array.isArray(list) ? list.length : 0;
    } catch {
      return 0;
    }
  };

  // Fetch only the unread count for the badge (lightweight, polled)
  const fetchUnread = async () => {
    if (!isPGAdmin || !currentUser?.id || isFetching.current) return;
    isFetching.current = true;
    try {
      const [actRes, invCount] = await Promise.all([
        apiClient.get(`/users/${currentUser.id}/activities/`),
        getInvoicesDueCount(),
      ]);
      const lastSeen = getLastSeen();
      const items = Array.isArray(actRes?.data) ? actRes.data : [];
      const allowed = items.filter(isAllowedActivity);
      const actCount = allowed.filter((it) => {
        const ts = Date.parse(it.timestamp || it.created_at || it.time || 0);
        return ts && ts > lastSeen;
      }).length;
      setActivityUnreadCount(actCount);
      setInvoicesDueCount(invCount || 0);
      setUnreadCount(actCount + (invCount || 0));
    } catch (e) {
      // silent fail in navbar to avoid noise
    } finally {
      isFetching.current = false;
    }
  };

  // Fetch the latest few notifications for the dropdown panel
  const fetchRecent = async () => {
    if (!isPGAdmin || !currentUser?.id) return;
    setNotifLoading(true);
    try {
      const { data } = await apiClient.get(`/users/${currentUser.id}/activities/`);
      const lastSeen = getLastSeen();
      const items = Array.isArray(data) ? data : (data?.results || []);
      // Only show unread since last seen and allowed modules
      const filtered = items
        .filter(isAllowedActivity)
        .filter((it) => {
          const ts = Date.parse(it.timestamp || it.created_at || it.time || 0);
          return ts && ts > lastSeen;
        });
      // Group similar activities into one to avoid duplicate lines
      const pickEntity = (a) => (
        getDisplayLabel(a?.meta?.tenant) ||
        getDisplayLabel(a?.meta?.invoice) ||
        getDisplayLabel(a?.meta?.expense) ||
        getDisplayLabel(a?.meta?.category) ||
        getDisplayLabel(a?.meta?.room) ||
        getDisplayLabel(a?.meta?.building) ||
        getDisplayLabel(a?.meta?.title) ||
        getDisplayLabel(a?.meta?.name) ||
        ''
      );
      const getAmount = (a) => {
        const m = a?.meta || {};
        const cands = [a?.amount, m.amount, m.total, m.value, m.price, m.rent, m.paid, m.amount_paid];
        for (const c of cands) { const n = Number(c); if (Number.isFinite(n) && Math.abs(n) > 0) return n; }
        return 0;
      };
      const getModule = (a) => activityModule(a);
      const getAction = (a) => String(a?.action || a?.event || '').toLowerCase();
      const getTsMinute = (a) => {
        const ts = a?.timestamp || a?.created_at || a?.time;
        if (!ts) return '';
        try { return new Date(ts).toISOString().slice(0, 16); } catch { return ''; }
      };
      const hasChanges = (a) => {
        const arr = getChangesSummary(a);
        return Array.isArray(arr) && arr.length > 0;
      };
      const groups = new Map();
      for (const a of filtered) {
        // Do NOT include entity in the key so entries that only differ by entity presence (e.g., none vs tenant name)
        // collapse into a single grouped notification.
        const key = [getAction(a), getModule(a), getAmount(a) ? getAmount(a).toFixed(2) : '', getTsMinute(a)].join('|');
        if (!groups.has(key)) {
          groups.set(key, { ...a, _count: 1 });
        } else {
          const curr = groups.get(key);
          curr._count += 1;
          // Prefer the entry with an explicit entity label or with changes
          const currEnt = pickEntity(curr);
          const newEnt = pickEntity(a);
          const currHasChanges = hasChanges(curr);
          const newHasChanges = hasChanges(a);
          if ((!currEnt && newEnt) || (!currHasChanges && newHasChanges)) {
            groups.set(key, { ...a, _count: curr._count });
          }
        }
      }
      const grouped = Array.from(groups.values());
      setRecent(grouped.slice(0, 5));
    } catch (e) {
      setRecent([]);
    } finally {
      setNotifLoading(false);
    }
  };

  // Close dropdowns when clicking outside their container
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keep unread count fresh: initial fetch, refetch on focus, poll every 30s when visible
  useEffect(() => {
    fetchUnread();
  }, [currentUser?.id, isPGAdmin]);

  useEffect(() => {
    const onFocus = () => fetchUnread();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchUnread();
    }, 30000);
    return () => clearInterval(id);
  }, [currentUser?.id, isPGAdmin]);

  // moved: building filter effect is defined after buildingSelected initialization

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Toggle notifications dropdown; on open, load unread; on close, mark seen and clear badge
  const handleOpenNotifications = () => {
    // Toggle dropdown; on open, clear badge and mark seen
    const willOpen = !isNotifOpen;
    setIsNotifOpen(willOpen);
    if (willOpen) {
      fetchRecent();
    } else {
      // closing: mark whatever was visible as seen and clear the badge
      setLastSeen(new Date());
      // Only clear activity unread; keep invoices due count
      setActivityUnreadCount(0);
      setUnreadCount(invoicesDueCount);
    }
  };

  // Navigate to the full notifications page
  const handleGoToNotifications = () => {
    setIsNotifOpen(false);
    navigate('/notifications');
  };

  // Immediately clear notifications while dropdown is open
  const handleClearNotifications = () => {
    setLastSeen(new Date());
    // Only clear activity unread; keep invoices due count
    setActivityUnreadCount(0);
    setUnreadCount(invoicesDueCount);
    setRecent([]);
  };

  const userInitials = currentUser?.displayName
    ? currentUser.displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
    : 'U';

  // ------------------------------
  // Global Building Filter (Navbar)
  // ------------------------------
  const [buildingOptions, setBuildingOptions] = useState([]); // [{value,label}]
  const [buildingSelected, setBuildingSelected] = useState([]); // [id]

  // Recompute counts when building filter changes (affects invoices due count)
  useEffect(() => {
    fetchUnread();
  }, [buildingSelected]);

  const selectAll = () => {
    const arr = (buildingOptions || []).map((o) => String(o.value));
    setBuildingSelected(arr);
    persistAndBroadcast(arr);
  };
  const clearAll = () => {
    setBuildingSelected([]);
    persistAndBroadcast([]);
  };

  // Load buildings with permission filtering
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getBuildings({ page_size: 1000, is_active: true });
        const list = Array.isArray(res) ? res : (res?.results || []);
        if (!alive) return;
        const permitted = list.filter((b) => b && b.id != null && (typeof can === 'function' ? can('buildings', 'view', b.id) : true));
        const opts = permitted.map((b) => ({ value: String(b.id), label: b.name || t('buildings.building_with_id', { id: b.id }) }));
        setBuildingOptions(opts);
        // Sanitize any existing selection to active-only (intersect with options)
        const optionIds = new Set(opts.map(o => String(o.value)));
        const curSel = (buildingSelected || []).map(String).filter(v => optionIds.has(v));
        if (curSel.length !== (buildingSelected || []).length) {
          setBuildingSelected(curSel);
          persistAndBroadcast(curSel);
        }
      } catch {
        setBuildingOptions([]);
      }
    })();
    return () => { alive = false };
  }, [can]);

  // Init from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('building_filter');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const sel = arr.map(String);
          setBuildingSelected(sel);
          // Broadcast initial selection so listeners can pick it up immediately
          try { window.dispatchEvent(new CustomEvent('building-filter-change', { detail: { selected: sel } })); } catch { }
        }
      }
    } catch { }
  }, []);

  const persistAndBroadcast = (arr) => {
    try { localStorage.setItem('building_filter', JSON.stringify(arr)); } catch { }
    window.dispatchEvent(new CustomEvent('building-filter-change', { detail: { selected: arr } }));
  };

  const toggleBuilding = (val) => {
    const v = String(val);
    const set = new Set((buildingSelected || []).map(String));
    if (set.has(v)) set.delete(v); else set.add(v);
    const arr = Array.from(set);
    setBuildingSelected(arr);
    persistAndBroadcast(arr);
  };

  // After the notifications panel is closed, clear the in-memory recent list
  useEffect(() => {
    if (!isNotifOpen) {
      setRecent([]);
    }
  }, [isNotifOpen]);

  return (
    <header
      className={`fixed top-0 right-0 left-0 ${!isMobile ? 'lg:left-64' : ''} bg-white shadow-sm z-20 transition-all duration-300`}
      style={{
        width: isMobile ? '100%' : `calc(100% - ${isCollapsed ? '5rem' : '16rem'})`,
        left: isMobile ? 0 : (isCollapsed ? '5rem' : '16rem'),
      }}
    >
      <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6 lg:px-8">
        {/* Mobile menu button + app title */}
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none transition-colors duration-200"
            aria-label={sidebarOpen ? t('nav.close') : t('nav.more')}
          >
            <FiMenu className="h-6 w-6 lg:hidden" />
          </button>
          {(
            <h1 className={`ml-2 text-lg sm:text-xl font-bold text-indigo-600 hidden ${sidebarOpen ? 'hidden ' : 'sm:block pr-4 '}`} >{t('nav.title')}</h1>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Building Filter */}
          {Array.isArray(buildingOptions) && buildingOptions.length > 0 && (
            <div className="w-40">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="relative block w-full pl-8 pr-5 py-1.5 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm bg-white hover:bg-gray-50 transition-colors text-gray-900 text-left"
                    title={t('nav.filter_by_buildings')}
                  >
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
                      <FiHome className="h-4 w-4" />
                    </span>
                    {(!buildingSelected || buildingSelected.length === 0)
                      ? t('nav.all_buildings')
                      : t('nav.n_selected', { count: buildingSelected.length })}
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[min(100%,260px)] rounded-lg shadow-lg border border-gray-200" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <div className="px-1 py-1.5 flex items-center justify-between">
                    <button
                      className="px-2 py-1 text-xs border rounded-md text-gray-700 hover:bg-gray-50"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); selectAll(); }}
                    >
                      {t('nav.select_all')}
                    </button>
                    <button
                      className="px-2 py-1 text-xs border rounded-md text-gray-700 hover:bg-gray-50"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearAll(); }}
                    >
                      {t('nav.clear')}
                    </button>
                  </div>
                  <div className="max-h-56 overflow-auto pr-1 overscroll-auto touch-pan-y">
                    {buildingOptions.map((opt) => {
                      const val = String(opt.value);
                      const selected = (buildingSelected || []).map(String).includes(val);
                      return (
                        <DropdownMenuItem
                          key={val}
                          onSelect={(e) => e.preventDefault()}
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => toggleBuilding(val)}
                        >
                          <Checkbox checked={selected} onChange={() => { }} />
                          <span className="text-gray-800 text-xs sm:text-sm">{opt.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {/* Notifications bell + dropdown (pg_admin only) */}
          {isPGAdmin && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleOpenNotifications}
                className="relative p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
                aria-haspopup="true"
                aria-expanded={isNotifOpen}
                aria-label={t('nav.notifications', 'Notifications')}
              >
                <FiBell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[14px]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="origin-top-right absolute right-0 mt-2 w-80 max-w-[90vw] rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                    role="menu"
                    aria-label="notifications-panel"
                  >
                    <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600">
                      <span>{t('nav.notifications', 'Notifications')}</span>
                      <span className="text-gray-500">{`due(${invoicesDueCount || 0})`}</span>
                    </div>
                    <div className="py-2 max-h-96 overflow-auto" role="list">
                      {notifLoading ? (
                        <div className="px-4 py-6 text-sm text-gray-500">{t('nav.loading', 'Loading...')}</div>
                      ) : recent && recent.length > 0 ? (
                        recent.map((a, idx) => (
                          <div key={a.id || idx} className="hover:bg-gray-50">
                            <ActivityItem activity={a} compact={true} count={a._count || 1} />
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-sm text-gray-500">{t('nav.no_new_notifications', 'You\u2019re all caught up')}</div>
                      )}
                    </div>
                    <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between">
                      <button
                        onClick={handleClearNotifications}
                        className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        {t('nav.mark_all_read', 'Mark all read')}
                      </button>
                      <button
                        onClick={handleGoToNotifications}
                        className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50"
                      >
                        {t('nav.view_all', 'View all')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center text-sm rounded-full focus:outline-none cursor-pointer"
              id="user-menu"
              aria-haspopup="true"
              aria-expanded={isProfileOpen}
            >
              <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium">
                {userInitials}
              </div>
              <span className="hidden md:inline-block ml-2 text-gray-700 hover:text-gray-900 text-sm">
                {currentUser?.displayName || t('nav.user')}
              </span>
              <FiChevronDown className="hidden md:inline-block ml-1 h-4 w-4 text-gray-500" />
            </button>

            {/* Dropdown menu */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu"
                >
                  <div className="py-1" role="none">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileOpen(false)}
                      role="menuitem"
                    >
                      <FiUser className="mr-3 h-5 w-5 text-gray-400" />
                      {t('nav.profile')}
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileOpen(false)}
                      role="menuitem"
                    >
                      <FiSettings className="mr-3 h-5 w-5 text-gray-400" />
                      {t('nav.settings')}
                    </Link>
                    <button
                      onClick={() => { setIsProfileOpen(false); handleLogout(); }}
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      <FiLogOut className="mr-3 h-5 w-5 text-gray-400" />
                      {t('nav.sign_out')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;