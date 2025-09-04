import React, { useEffect, useMemo, useState, useRef } from 'react';
import { listExpenses, deleteExpense, getExpense } from '../../services/expenses';
import { Button, PermissionButton } from '../ui/Button';
import { Input } from '../ui/Input';
import Select from '../ui/Select';
import { DatePicker as UIDatePicker } from '../ui/DatePicker';
import { SortableTable } from '../ui/SortableTable';
import { getBuildings } from '../../services/properties';
import ExpensesDetails from './ExpensesDetails';
import Modal from '../ui/Modal';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/DropdownMenu';
import { Checkbox } from '../ui/Checkbox';
import { useCan } from '../../context/AuthContext';

/**
 * ExpensesList
 * Props:
 * - onEdit(id, row)
 * - onCreate()
 * - refreshToken: any => change to refetch
 */
const ExpensesList = ({ onEdit, onCreate, refreshToken }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('expense_date');
  const [order, setOrder] = useState('desc');
  const [buildingsMap, setBuildingsMap] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeleteBuildingId, setPendingDeleteBuildingId] = useState(null);
  const [confirmHint, setConfirmHint] = useState('');
  // Details modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  // Category filter state
  const [selectedCategories, setSelectedCategories] = useState([]);
  // TenantsList-like filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [datePreset, setDatePreset] = useState(''); // '', today, yesterday, 7d, 30d, this_month, last_month, this_year, custom
  const [filterOpen, setFilterOpen] = useState(false);
  const filterPanelRef = useRef(null);
  const filterButtonRef = useRef(null);

  const { can } = useCan();

  // Currency formatter (INR)
  const inrFmt = useMemo(() => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }), []);

  // Active filter count for Filters button (counts only panel filters)
  const filtersActiveCount = useMemo(() => {
    let n = 0;
    if ((datePreset && datePreset !== 'custom') || dateFrom || dateTo) n += 1;
    if (selectedCategories && selectedCategories.length > 0) n += 1;
    return n;
  }, [datePreset, dateFrom, dateTo, selectedCategories]);

  // Initialize building filter from Navbar's global filter and subscribe to changes
  const [buildingFilter, setBuildingFilter] = useState([]); // [string]
  useEffect(() => {
    try {
      const raw = localStorage.getItem('building_filter');
      const arr = raw ? JSON.parse(raw) : [];
      setBuildingFilter(Array.isArray(arr) ? arr.map(String) : []);
    } catch {}
    const handler = (e) => {
      const arr = (e?.detail?.selected || []).map(String);
      setBuildingFilter(arr);
    };
    window.addEventListener('building-filter-change', handler);
    return () => window.removeEventListener('building-filter-change', handler);
  }, []);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (buildingFilter && buildingFilter.length > 0) params.building__in = buildingFilter.join(',');
      const data = await listExpenses(params);
      const list = Array.isArray(data) ? data : (data?.results || []);
      setItems(list);
    } catch (e) {
      console.error('Failed to load expenses', e);
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, buildingFilter]);

  // Load buildings once to map IDs -> names
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getBuildings({ page_size: 1000 });
        const list = Array.isArray(data) ? data : (data?.results || []);
        // Filter buildings client-side by permission (pg_staff sees only permitted buildings)
        const permitted = list.filter((b) => b && b.id != null && can('buildings', 'view', b.id));
        const map = {};
        permitted.forEach((b) => {
          if (b && b.id != null) map[b.id] = b.name || `Building #${b.id}`;
        });
        if (!cancelled) setBuildingsMap(map);
      } catch (e) {
        console.error('Failed to load buildings', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getBuildingName = (row) => {
    const b = row?.building;
    if (b && typeof b === 'object' && b.name) return b.name;
    const id = typeof b === 'number' ? b : null;
    if (id != null && buildingsMap[id]) return buildingsMap[id];
    if (typeof b === 'string') return b; // fallback if API returns string name directly
    return id != null ? `Building #${id}` : '';
  };

  const getRowBuildingId = (row) => {
    const b = row?.building;
    if (typeof b === 'number') return b;
    if (b && typeof b === 'object' && 'id' in b) return Number(b.id);
    return null;
  };

  const getRowCategoryId = (row) => {
    const c = row?.category;
    if (typeof c === 'number') return c;
    if (c && typeof c === 'object' && 'id' in c) return Number(c.id);
    // If backend returns string category names only, fallback to name as id via map later
    return null;
  };

  // Helpers (mirroring TenantsList)
  const inRange = (dateStr, from, to) => {
    if (!from && !to) return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d)) return false;
    const start = from ? new Date(new Date(from).setHours(0, 0, 0, 0)) : null;
    const end = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : null;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  };

  const applyDatePreset = (value) => {
    setDatePreset(value);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const setRange = (from, to) => { setDateFrom(from); setDateTo(to); };
    switch (value) {
      case '':
        setRange(null, null); break;
      case 'today':
        setRange(todayStart, todayEnd); break;
      case 'yesterday': {
        const yStart = new Date(todayStart); yStart.setDate(yStart.getDate() - 1);
        const yEnd = new Date(todayEnd); yEnd.setDate(yEnd.getDate() - 1);
        setRange(yStart, yEnd); break; }
      case '7d': {
        const from = new Date(todayStart); from.setDate(from.getDate() - 6);
        setRange(from, todayEnd); break; }
      case '30d': {
        const from = new Date(todayStart); from.setDate(from.getDate() - 29);
        setRange(from, todayEnd); break; }
      case 'this_month': {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        setRange(from, to); break; }
      case 'last_month': {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        setRange(from, to); break; }
      case 'this_year': {
        const from = new Date(now.getFullYear(), 0, 1);
        const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        setRange(from, to); break; }
      case 'custom':
      default:
        setRange(null, null); break;
    }
  };

  // Options for category select derived from items
  const categoryOptions = useMemo(() => {
    const map = new Map();
    for (const row of items) {
      const c = row?.category;
      if (c && typeof c === 'object') {
        const id = 'id' in c ? Number(c.id) : null;
        const label = String(c.name ?? c.label ?? '').trim();
        if (id != null) map.set(id, label || `#${id}`);
        else if (label) map.set(label, label);
      } else if (typeof c === 'number') {
        map.set(c, `#${c}`);
      } else if (typeof c === 'string') {
        const label = c.trim();
        if (label) map.set(label, label);
      }
    }
    const opts = Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    opts.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    return opts;
  }, [items]);

  // Apply filters (building + category + search + date range)
  const filteredItems = useMemo(() => {
    // Normalize category selections: numbers as-is, strings lowercased
    const selCats = new Set((selectedCategories || []).map((v) => (typeof v === 'number' ? v : String(v).toLowerCase())));
    const q = (searchTerm || '').trim().toLowerCase();
    const selBuildings = (buildingFilter || []).map(String);
    return items.filter((row) => {
      // Building filter from navbar
      if ((selBuildings || []).length > 0) {
        const b = row?.building;
        const bid = typeof b === 'number' ? b : (b && typeof b === 'object' && 'id' in b ? Number(b.id) : null);
        if (!bid || !selBuildings.includes(String(bid))) return false;
      }
      // Category filter (supports numeric id or string name)
      if (selCats.size > 0) {
        const c = row?.category;
        let cid = null; let cname = '';
        if (typeof c === 'number') cid = c;
        else if (c && typeof c === 'object') { cid = 'id' in c ? Number(c.id) : null; cname = String(c.name ?? '').toLowerCase(); }
        else if (typeof c === 'string') { cname = c.toLowerCase(); }
        const has = (cid != null && selCats.has(cid)) || (cname && selCats.has(cname));
        if (!has) return false;
      }
      // Date range filter on expense_date
      if (!inRange(row?.expense_date, dateFrom, dateTo)) return false;
      // Search over reference and category name
      if (q) {
        const ref = String(row?.reference || '').toLowerCase();
        const cat = String(typeof row?.category === 'object' ? (row?.category?.name ?? '') : (row?.category ?? '')).toLowerCase();
        if (!(ref.includes(q) || cat.includes(q))) return false;
      }
      return true;
    });
  }, [items, selectedCategories, searchTerm, dateFrom, dateTo, buildingFilter]);

  const totalAmount = useMemo(() => {
    return filteredItems.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  }, [filteredItems]);

  async function openDetails(id) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setDetailItem(null);
    try {
      const data = await getExpense(id);
      setDetailItem(data);
    } catch (e) {
      console.error('Failed to load expense details', e);
      setDetailError('Failed to load expense details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteExpense(id);
      await fetchData();
    } catch (e) {
      console.error('Failed to delete expense', e);
      alert('Delete failed');
    }
  };

  const requestDelete = (id) => {
    const row = items.find((x) => x.id === id);
    setPendingDeleteId(id);
    setPendingDeleteBuildingId(getRowBuildingId(row));
    setConfirmOpen(true);
    setConfirmHint('Hold Shift and click Delete to confirm.');
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setPendingDeleteId(null);
    setPendingDeleteBuildingId(null);
    setConfirmHint('');
  };

  const confirmDelete = async (e) => {
    if (!e?.shiftKey) {
      setConfirmHint('Please hold Shift and click Delete to confirm.');
      return;
    }
    if (pendingDeleteId == null) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);
    setPendingDeleteBuildingId(null);
    setConfirmHint('');
    await handleDelete(id);
  };

  const handleSort = (field, direction) => {
    setSortBy(field);
    setOrder(direction);
  };

  const sortedData = useMemo(() => {
    const data = [...filteredItems];
    if (!sortBy) return data;
    data.sort((a, b) => {
      const dir = order === 'asc' ? 1 : -1;
      let av, bv;
      switch (sortBy) {
        case 'amount':
          av = Number(a.amount || 0); bv = Number(b.amount || 0);
          break;
        case 'category':
          av = String((typeof a.category === 'object' ? (a.category?.name ?? '') : (a.category ?? '')));
          bv = String((typeof b.category === 'object' ? (b.category?.name ?? '') : (b.category ?? '')));
          break;
        case 'building':
          av = String(getBuildingName(a) || '');
          bv = String(getBuildingName(b) || '');
          break;
        case 'reference':
          av = String(a.reference || ''); bv = String(b.reference || '');
          break;
        case 'expense_date':
          av = new Date(a.expense_date || 0).getTime();
          bv = new Date(b.expense_date || 0).getTime();
          break;
        case 'id':
          av = Number(a.id || 0); bv = Number(b.id || 0);
          break;
        default:
          av = String(a[sortBy] ?? '');
          bv = String(b[sortBy] ?? '');
          break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return data;
  }, [filteredItems, sortBy, order, buildingsMap]);

  const columns = [
    {
      key: 'id',
      title: 'ID',
      accessor: 'id',
      sortable: true,
      Cell: ({ value, row }) => (
        <button
          className="text-blue-600 hover:underline underline-offset-4 cursor-pointer"
          title="View details"
          onClick={(e) => { e.stopPropagation(); openDetails(row.id); }}
        >
          {value}
        </button>
      ),
    },
    {
      key: 'expense_date',
      title: 'Date',
      accessor: 'expense_date',
      sortable: true,
      Cell: ({ value }) => {
        if (!value) return '-';
        // Expecting YYYY-MM-DD or ISO; output dd:mm:yyyy per project format
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}:${mm}:${yyyy}`;
      },
    },
    {
      key: 'category',
      title: 'Category',
      accessor: (row) => (typeof row.category === 'object' ? (row.category?.name ?? '') : (row.category ?? '')),
      sortable: true,
      Cell: ({ value }) => <span className="capitalize">{value}</span>,
    },
    {
      key: 'amount',
      title: 'Amount (₹)',
      accessor: (row) => Number(row.amount || 0),
      sortable: true,
      Cell: ({ value }) => <>{inrFmt.format(Number(value || 0))}</>,
    },
    {
      key: 'building',
      title: 'Building',
      accessor: (row) => getBuildingName(row),
      sortable: true,
    },
    {
      key: 'reference',
      title: 'Reference',
      accessor: 'reference',
      sortable: true,
      Cell: ({ value }) => (
        <span className="truncate inline-block max-w-[220px] align-bottom" title={value}>
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Action',
      accessor: () => null,
      sortable: false,
      Cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1">
          <PermissionButton
            module="expenses"
            action="edit"
            scopeId={getRowBuildingId(row) || 'global'}
            variant="outline"
            size="sm"
            reason="You don't have permission to edit this expense."
            denyMessage="You do not have permission to edit expenses for this building."
            onClick={(e) => { e.stopPropagation(); onEdit?.(row.id, row); }}
          >
            Edit
          </PermissionButton>
          <PermissionButton
            module="expenses"
            action="delete"
            scopeId={getRowBuildingId(row) || 'global'}
            variant="destructive"
            size="sm"
            title="Delete expense (will ask for confirmation)"
            reason="You don't have permission to delete this expense."
            denyMessage="You do not have permission to delete expenses for this building."
            onClick={(e) => {
              e.stopPropagation();
              requestDelete(row.id);
            }}
          >
            Delete
          </PermissionButton>
        </div>
      ),
    },
  ];

  // Close Filters panel on outside click (ignore clicks on triggers, inside panel, dropdown menus, and datepicker popups)
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!filterOpen) return;
      const t = e.target;
      if (filterPanelRef.current && filterPanelRef.current.contains(t)) return; // inside panel
      if (filterButtonRef.current && filterButtonRef.current.contains(t)) return; // on toggle button
      if (t.closest && (t.closest('.react-datepicker') || t.closest('.react-datepicker-popper'))) return; // datepicker
      if (t.closest && (t.closest('[data-radix-popper-content-wrapper]') || t.closest('[role="menu"]'))) return; // Radix menus
      setFilterOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [filterOpen]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold">Expenses</h2>
        <div className="flex items-center justify-between gap-2">
          <div className="hidden sm:block min-w-[220px]">
            <Input
              type="text"
              placeholder="Search expenses (reference/category)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <Button variant="outline" ref={filterButtonRef} onClick={() => setFilterOpen((v) => !v)}>
              {`Filters${filtersActiveCount ? ` (${filtersActiveCount})` : ''}`}
            </Button>
            {filterOpen && (
              <div
                ref={filterPanelRef}
                className="absolute right-0 top-full mt-2 z-50 w-35 sm:min-w-[320px] bg-white border border-gray-200 rounded-md shadow-lg p-2 sm:p-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <Select
                      value={datePreset}
                      onChange={(e) => applyDatePreset(e.target.value)}
                      placeholder="Select date range"
                      options={[
                        { value: 'today', label: 'Today' },
                        { value: 'yesterday', label: 'Yesterday' },
                        { value: '7d', label: 'Last 7 days' },
                        { value: '30d', label: 'Last 30 days' },
                        { value: 'this_month', label: 'This Month' },
                        { value: 'last_month', label: 'Last Month' },
                        { value: 'this_year', label: 'This Year' },
                        { value: 'custom', label: 'Custom Range' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Categories</label>
                    <div className="w-full">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="relative block w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm bg-white text-gray-900 text-left"
                          >
                            {selectedCategories.length === 0 ? 'All Categories' : `${selectedCategories.length} selected`}
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
                            </span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="z-[90] w-[min(100%,240px)]" onPointerDownCapture={(e) => e.stopPropagation()} onCloseAutoFocus={(e) => e.preventDefault()}>
                          <div className="px-1 py-1 flex items-center justify-between">
                            <Button
                              size="sm"
                              variant="outline"
                              onPointerDown={(e) => e.preventDefault()}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedCategories(categoryOptions.map(o => (typeof o.value === 'number' ? o.value : String(o.value).toLowerCase()))); }}
                            >
                              Select All
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onPointerDown={(e) => e.preventDefault()}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedCategories([]); }}
                            >
                              Clear
                            </Button>
                          </div>
                          <div className="max-h-48 overflow-auto pr-1">
                            {categoryOptions.length === 0 && (
                              <div className="text-xs text-gray-500 px-2 py-1">No categories found</div>
                            )}
                            {categoryOptions.map((opt) => {
                              const valueKey = typeof opt.value === 'number' ? opt.value : String(opt.value).toLowerCase();
                              const selected = selectedCategories.some((v) => (typeof v === 'number' ? v === valueKey : String(v).toLowerCase() === String(valueKey)));
                              return (
                                <DropdownMenuItem
                                  key={`cat-${valueKey}`}
                                  onSelect={(e) => e.preventDefault()}
                                  onPointerDown={(e) => e.preventDefault()}
                                  className="cursor-default py-1"
                                >
                                  <label htmlFor={`category-filter-${valueKey}`} className="flex items-center gap-2 cursor-pointer w-full">
                                    <Checkbox
                                      id={`category-filter-${valueKey}`}
                                      name="category-filter"
                                      checked={selected}
                                      onChange={() => {
                                        setSelectedCategories((prev) => {
                                          const key = valueKey;
                                          const norm = (x) => (typeof x === 'number' ? x : String(x).toLowerCase());
                                          const exists = (prev || []).some((v) => norm(v) === norm(key));
                                          if (exists) return (prev || []).filter((v) => norm(v) !== norm(key));
                                          return Array.from(new Set([...(prev || []), key]));
                                        });
                                      }}
                                    />
                                    <span className="text-gray-800 text-xs sm:text-sm">{opt.label}</span>
                                  </label>
                                </DropdownMenuItem>
                              );
                            })}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {datePreset === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-2">
                    <UIDatePicker
                      selected={dateFrom}
                      onChange={(d) => setDateFrom(d)}
                      label="Expense Date From"
                      placeholderText="dd/mm/yyyy"
                      isClearable
                    />
                    <UIDatePicker
                      selected={dateTo}
                      onChange={(d) => setDateTo(d)}
                      label="Expense Date To"
                      placeholderText="dd/mm/yyyy"
                      isClearable
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => { setDatePreset(''); setDateFrom(null); setDateTo(null); }}>Clear</Button>
                  <Button size="sm" onClick={() => setFilterOpen(false)}>Apply</Button>
                </div>
              </div>
            )}
          </div>
          <div>
            <PermissionButton
              module="expenses"
              action="add"
              scopeId="global"
              reason="You don't have permission to add expenses."
              denyMessage="You do not have permission to add expenses."
              onClick={onCreate}
            >
              Add Expense
            </PermissionButton>
          </div>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <SortableTable
        columns={columns}
        data={sortedData}
        sortBy={sortBy}
        order={order}
        onSort={handleSort}
        loading={loading}
        className=""
        rowKey="id"
      />

      <div className="flex justify-start">
        <div className="text-sm text-gray-700">
          <span className="font-bold text-lg">Total:</span> <span className="font-bold text-red-600">{inrFmt.format(totalAmount)}</span>
        </div>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={cancelDelete}
        title="Confirm Delete"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">Are you sure you want to delete this expense?</p>
          {confirmHint && (
            <p className="text-xs text-amber-600">{confirmHint}</p>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={cancelDelete}>Cancel</Button>
            <PermissionButton
              module="expenses"
              action="delete"
              scopeId={pendingDeleteBuildingId || 'global'}
              variant="destructive"
              denyMessage="You do not have permission to delete expenses for this building."
              onClick={confirmDelete}
            >
              Delete
            </PermissionButton>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={detailOpen}
        onClose={() => { if (!detailLoading) { setDetailOpen(false); setDetailItem(null); setDetailError(''); } }}
        title={detailItem ? `Expense #${detailItem.id}` : 'Expense Details'}
        maxWidth="md"
      >
        <ExpensesDetails
          expense={detailItem}
          loading={detailLoading}
          error={detailError}
          getBuildingName={getBuildingName}
          onClose={() => setDetailOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default ExpensesList;