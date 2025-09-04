import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import Card from '../ui/Card';
import DateRangeMenu from '../filters/DateRangeMenu';
import apiClient from '../../services/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useColorScheme } from '../../theme/colorSchemes';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatNumberCompact, formatNumber } from '../../utils/dateUtils';

/*
Props:
- endpoint: string (default '/dashboard/cashflow/') — GET with params { preset?, start?, end?, building_id? }
- buildingId: optional scope id
- fetcher: optional async function ({ presetKey, start, end, buildingId }) => ({ monthly, categories, daily })
- defaultPreset: 'last30' | 'this_month' | ... (DateRangeMenu presets)
- className: string
*/

// Fallback palette for pie slices when theme colors are unavailable
const DEFAULT_PIE_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#6366f1', '#9ca3af', '#84cc16', '#06b6d4', '#a855f7', '#f97316'];

const CashflowCard = ({
  endpoint = '/dashboard/cashflow/',
  buildingId,
  fetcher,
  defaultPreset = 'last30',
  className,
  scheme = 'default',
}) => {
  // Theme colors
  const colors = useColorScheme(scheme);
  const { t } = useTranslation();

  // Tabs
  const [activeTab, setActiveTab] = useState('overview');

  // Range controls (integrates with DateRangeMenu)
  const [rangeMode, setRangeMode] = useState('preset'); // 'preset' | 'custom'
  const [presetKey, setPresetKey] = useState(defaultPreset);
  const [customStart, setCustomStart] = useState(''); // YYYY-MM-DD
  const [customEnd, setCustomEnd] = useState('');   // YYYY-MM-DD

  // Data state
  const [monthly, setMonthly] = useState([]);      // [{ month, income, expenses, net }]
  const [categories, setCategories] = useState([]); // [{ name, value }]
  const [daily, setDaily] = useState([]);           // [{ day|date, amount }]
  const [dailyByWeekday, setDailyByWeekday] = useState([]); // [{ weekday, income, expenses }]

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Trigger refetches (used by Retry button)
  const [refreshTick, setRefreshTick] = useState(0);

  // Derived metrics
  const kpis = useMemo(() => {
    const totalIncome = monthly.reduce((s, x) => s + (Number(x.income) || 0), 0);
    const totalExpenses = monthly.reduce((s, x) => s + (Number(x.expenses) || 0), 0);
    const avgNet = monthly.length ? (monthly.reduce((s, x) => s + (Number(x.net) || 0), 0) / monthly.length) : 0;
    return { totalIncome, totalExpenses, avgNet };
  }, [monthly]);

  const rangeLabel = useMemo(() => {
    if (rangeMode === 'preset') {
      const key = presetKey || 'range';
      return t(`common.date_ranges.${key}`, key.replace(/_/g, ' '));
    }
    if (customStart && customEnd) return `${customStart} → ${customEnd}`;
    return t('common.date_ranges.range');
  }, [rangeMode, presetKey, customStart, customEnd, t]);

  // Fetch handler
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // 1) Hydrate instantly from cache if available
      try {
        if (typeof window !== 'undefined') {
          const cacheKey = `cashflow:${endpoint}:${buildingId || 'all'}:${rangeMode}:${presetKey || ''}:${customStart || ''}:${customEnd || ''}`;
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const cached = JSON.parse(raw);
            if (!cancelled && cached && Array.isArray(cached.monthly) && Array.isArray(cached.categories) && Array.isArray(cached.daily)) {
              setMonthly(cached.monthly);
              setCategories(cached.categories);
              setDaily(cached.daily);
              if (Array.isArray(cached.daily_by_weekday)) setDailyByWeekday(normalizeWeekdayData(cached.daily_by_weekday));
            }
          }
        }
      } catch (_) { /* ignore cache errors */ }

      try {
        setLoading(true);
        const data = fetcher ? await fetcher({ presetKey, start: customStart, end: customEnd, buildingId }) : await apiClient.get(endpoint, {
          params: rangeMode === 'preset'
            ? { preset: presetKey, building_id: buildingId }
            : { start: customStart, end: customEnd, building_id: buildingId },
        }).then((res) => res.data);

        if (!cancelled) {
          setMonthly(Array.isArray(data?.monthly) ? data.monthly : []);
          setCategories(Array.isArray(data?.categories) ? data.categories : []);
          setDaily(Array.isArray(data?.daily) ? data.daily : []);
          setDailyByWeekday(normalizeWeekdayData(data?.daily_by_weekday));
          // 2) Persist to cache for instant next render
          try {
            if (typeof window !== 'undefined') {
              const cacheKey = `cashflow:${endpoint}:${buildingId || 'all'}:${rangeMode}:${presetKey || ''}:${customStart || ''}:${customEnd || ''}`;
              localStorage.setItem(cacheKey, JSON.stringify({
                monthly: Array.isArray(data?.monthly) ? data.monthly : [],
                categories: Array.isArray(data?.categories) ? data.categories : [],
                daily: Array.isArray(data?.daily) ? data.daily : [],
                daily_by_weekday: normalizeWeekdayData(data?.daily_by_weekday),
                ts: Date.now(),
              }));
            }
          } catch (_) { /* ignore cache errors */ }
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || err.message || 'Failed to load cashflow');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [endpoint, buildingId, fetcher, rangeMode, presetKey, customStart, customEnd, refreshTick]);

  // Helpers
  const expenseTotal = useMemo(() => categories.reduce((s, x) => s + (Number(x.value) || 0), 0), [categories]);

  // Robust numeric parser: handles strings with commas/currency symbols
  const parseAmount = (val) => {
    if (val == null) return 0;
    if (typeof val === 'number') return isFinite(val) ? val : 0;
    const cleaned = String(val).replace(/[^0-9+\-\.]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  // Flexible weekday parser from various date string formats or labels
  const parseWeekday = (input) => {
    if (!input) return null;
    const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // If it's a full/short weekday name
    const name = String(input).trim();
    const shortFromName = name.slice(0, 3).toLowerCase();
    const nameIdx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(shortFromName);
    if (nameIdx >= 0) return map[nameIdx];

    // Try ISO or common formats
    const s = String(input).trim();
    let d = null;
    // yyyy-mm-dd or yyyy/mm/dd
    if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(s)) {
      d = new Date(s.replace(/\//g, '-'));
    }
    // dd-mm-yyyy or dd/mm/yyyy
    else if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.replace(/\//g, '-').split('-').map((x) => parseInt(x, 10));
      d = new Date(yyyy, (mm || 1) - 1, dd || 1);
    }
    // dd:mm:yyyy
    else if (/^\d{1,2}:\d{1,2}:\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split(':').map((x) => parseInt(x, 10));
      d = new Date(yyyy, (mm || 1) - 1, dd || 1);
    }
    // Fallback to native Date
    else {
      const t = new Date(s);
      if (!isNaN(t.getTime())) d = t;
    }
    if (d && !isNaN(d.getTime())) return map[d.getDay()];
    return null;
  };

  // Ensure Weekday chart always has Mon..Sun entries
  const normalizeWeekdayData = (arr) => {
    const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const out = new Map();
    if (Array.isArray(arr)) {
      for (const row of arr) {
        const keyRaw = row?.weekday ?? null;
        const parsed = keyRaw ? String(keyRaw).slice(0, 3).toLowerCase() : null;
        const key = ['mon','tue','wed','thu','fri','sat','sun'].includes(parsed) ? parsed : null;
        if (key) {
          out.set(key, {
            income: parseAmount(row?.income),
            expenses: parseAmount(row?.expenses),
          });
        }
      }
    }
    return WEEKDAYS.map((w) => {
      const k = w.toLowerCase();
      const v = out.get(k) || { income: 0, expenses: 0 };
      return { weekday: w, income: v.income, expenses: v.expenses };
    });
  };

  // Render compact labels above bars with responsive font size (always visible)
  const renderBarLabel = ({ x, y, width, value }) => {
    if (value == null) return null;
    const cx = x + width / 2;
    // Clamp to avoid clipping at top edge
    const cyRaw = (y ?? 0) - 6; // place slightly above the bar
    const cy = Math.max(12, cyRaw);
    return (
      <text x={cx} y={cy} textAnchor="middle" fill={colors?.chartHex?.label || '#374151'} style={{ fontSize: isMdUp ? 13 : 11, fontWeight: 600 }}>
        {formatCompactCurrencyNoT(value, isMdUp ? 1 : 0)}
      </text>
    );
  };

  // Match DateRangeMenu current label formatting for header display
  const rangeDisplay = useMemo(() => {
    if (rangeMode === 'preset') {
      const key = presetKey || 'range';
      return t(`common.date_ranges.${key}`, key.replace(/_/g, ' '));
    }
    if (rangeMode === 'custom' && customStart && customEnd) return `${customStart} → ${customEnd}`;
    return t('common.date_ranges.range');
  }, [rangeMode, presetKey, customStart, customEnd, t]);

  // Responsive chart typography (increase sizes on md and up)
  const [isMdUp, setIsMdUp] = useState(typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsMdUp(e.matches);
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else mql.addListener(handler);
    setIsMdUp(mql.matches);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else mql.removeListener(handler);
    };
  }, []);

  const tickFont = isMdUp ? 14 : 11;
  const xHeight = isMdUp ? 28 : 20;
  const yWidth = isMdUp ? 52 : 35;
  const legendFont = isMdUp ? 12 : 10;
  const legendHeight = isMdUp ? 18 : 16;
  const legendIcon = isMdUp ? 14 : 12;
  const xAngle = isMdUp ? -15 : -25;
  const xMinTickGap = isMdUp ? 6 : 2;
  const bottomMargin = isMdUp ? 18 : 14;
  const showBarLabels = true;

  // Color scheme for Key Metrics amounts
  const netColorClass = useMemo(() => (kpis.avgNet >= 0 ? (colors?.kpi?.netPositive?.text || 'text-emerald-700') : (colors?.kpi?.netNegative?.text || 'text-amber-700')), [kpis.avgNet, colors]);

  // Larger, readable percentage labels for the Expenses pie (always visible)
  const renderPercentLabel = ({ percent, x, y }) => (
    <text x={x} y={y} fill={colors?.chartHex?.label || '#374151'} textAnchor="middle" dominantBaseline="central" style={{ fontSize: tickFont, fontWeight: 500 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );

  // UI: Tabs styling
  const tabBtn = (key, label, activeBgCls) => (
    <button
      key={key}
      onClick={() => setActiveTab(key)}
      className={`px-2.5 py-1.5 rounded text-xs font-medium outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none active:outline-none active:ring-0 ${activeTab === key ? `${activeBgCls} text-white` : `${colors?.neutral?.inactiveChipBg || 'bg-gray-100'} ${colors?.neutral?.inactiveChipText || 'text-gray-700'}`}`}
    >
      {label}
    </button>
  );

  // Localized currency symbol for labels
  const currencySymbol = useMemo(() => {
    try {
      const sample = formatCurrency(0, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      const sym = String(sample).replace(/[0-9\s.,-]/g, '');
      return sym || '₹';
    } catch {
      return '₹';
    }
  }, []);

  // Compact formatters without 'T' (use K, L, M, B)
  const formatCompactNoT = (val, digits = 0) => {
    const n = Number(val);
    if (!isFinite(n)) return '0';
    const abs = Math.abs(n);
    let scaled = n;
    let suffix = '';
    if (abs >= 1e9) { scaled = n / 1e9; suffix = 'B'; }
    else if (abs >= 1e6) { scaled = n / 1e6; suffix = 'M'; }
    else if (abs >= 1e5) { scaled = n / 1e5; suffix = 'L'; }
    else if (abs >= 1e3) { scaled = n / 1e3; suffix = 'K'; }
    const num = formatNumber(scaled, { maximumFractionDigits: digits });
    return `${num}${suffix}`;
  };

  const formatCompactCurrencyNoT = (val, digits = 0) => {
    if (val == null) return '-';
    return `${currencySymbol}${formatCompactNoT(val, digits)}`;
  };

  return (
    <Card
      className={className}
      title={t('dashboard.cashflow.title')}
      description={(
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {tabBtn('overview', t('dashboard.cashflow.tabs.overview'), colors?.occupied?.seg || 'bg-purple-500')}
            {tabBtn('expenses', t('dashboard.cashflow.tabs.expenses'), colors?.available?.seg || 'bg-emerald-500')}
            {tabBtn('weekdays', t('dashboard.cashflow.tabs.weekdays'), colors?.reserved?.seg || 'bg-amber-500')}
          </div>
        </div>
      )}
      actions={(
        <div className="flex items-center gap-2">
          <span className={`text-sm md:text-base pr-4 ${colors?.neutral?.subtle || 'text-gray-600'}`} title={rangeDisplay}>
            {rangeDisplay}
          </span>
          <DateRangeMenu
            value={{ mode: rangeMode, presetKey, start: customStart, end: customEnd }}
            onChange={(next) => {
              if (!next) return;
              if (next.mode === 'preset') {
                setRangeMode('preset');
                setPresetKey(next.presetKey);
              } else if (next.mode === 'custom') {
                setRangeMode('custom');
                setCustomStart(next.start || '');
                setCustomEnd(next.end || '');
              }
            }}
            iconSize={16}
            triggerSize={28}
            align="right"
          />
        </div>
      )}
      padding="xs"
    >
      {/* Status */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <LoadingSpinner size="md" />
        </div>
      )}
      {!loading && error && (
        <div className={`p-3 rounded-md border ${colors?.accents?.rose?.ring || 'ring-rose-200'} ${colors?.kpi?.overdue?.bg || 'bg-rose-50'} ${colors?.kpi?.overdue?.text || 'text-rose-700'} text-sm`}
             style={{ borderColor: undefined }}>
          <div className="font-medium mb-1">{t('dashboard.cashflow.error.title')}</div>
          <div>{String(error)}</div>
          <div className="mt-2">
            <button
              onClick={() => {
                setError(null);
                setRefreshTick((n) => n + 1);
              }}
              className={`px-3 py-1.5 text-sm rounded ${colors?.occupied?.seg || 'bg-purple-500'} text-white hover:opacity-90`}
            >
              {t('dashboard.cashflow.error.retry')}
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-3 h-64 md:h-80 py-4 overflow-visible">
                  <h3 className="text-sm md:text-base font-medium mb-2">{t('dashboard.cashflow.charts.income_vs_expenses')}</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    {/* Match BookingsTrendCard Daily Booking Pattern sizing */}
                    <BarChart data={monthly} margin={{ top: 6, right: 6, left: 0, bottom: (isMdUp ? 24 : 12) }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors?.chartHex?.grid || '#e5e7eb'} />
                      <XAxis dataKey="month" tick={{ fontSize: tickFont, fill: colors?.chartHex?.axis || '#cbd5e1' }} interval="preserveStartEnd" angle={xAngle} textAnchor="end" height={isMdUp ? 36 : 24} minTickGap={xMinTickGap} />
                      <YAxis tick={{ fontSize: tickFont, fill: colors?.chartHex?.axis || '#cbd5e1' }} width={isMdUp ? 50 : 36} tickFormatter={(v) => formatCompactNoT(v, isMdUp ? 1 : 0)} domain={[0, (max) => (Number.isFinite(max) ? max * 1.15 : 'auto')]} allowDecimals={false} />
                      <Tooltip formatter={(v, name) => [formatCurrency(v), name]} />
                      <Legend verticalAlign="bottom" align="center" height={legendHeight} wrapperStyle={{ fontSize: legendFont, lineHeight: `${legendHeight}px` }} iconSize={legendIcon} />
                      <Bar dataKey="income" fill={colors?.chartHex?.payments || '#10b981'} name={t('dashboard.cashflow.series.income')} barSize={isMdUp ? 20 : 16}>
                        <LabelList dataKey="income" content={renderBarLabel} />
                      </Bar>
                      <Bar dataKey="expenses" fill={colors?.chartHex?.expenses || '#ef4444'} name={t('dashboard.cashflow.series.expenses')} barSize={isMdUp ? 20 : 16}>
                        <LabelList dataKey="expenses" content={renderBarLabel} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className={`text-sm font-semibold ${colors?.neutral?.heading || 'text-gray-900'} mb-2`}>{t('dashboard.cashflow.kpis.title')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <div className={`rounded-lg ${colors?.neutral?.inactiveChipBg || 'bg-gray-50'} border ${colors?.neutral?.divider || 'border-gray-100'} px-3 py-2 shadow-sm min-w-0`}>
                    <h4 className={`m-0 ${colors?.kpi?.collected?.text || 'text-emerald-700'} font-medium text-[10px] sm:text-[11px] md:text-xs leading-tight`}>{t('dashboard.cashflow.kpis.total_income')}</h4>
                    <p className={`text-xs sm:text-sm md:text-base font-bold mt-1 ${colors?.kpi?.collected?.text || 'text-emerald-700'} leading-tight`}>{formatCurrency(kpis.totalIncome)}</p>
                  </div>
                  <div className={`rounded-lg ${colors?.neutral?.inactiveChipBg || 'bg-gray-50'} border ${colors?.neutral?.divider || 'border-gray-100'} px-3 py-2 shadow-sm min-w-0`}>
                    <h4 className={`m-0 ${colors?.kpi?.overdue?.text || 'text-rose-700'} font-medium text-[10px] sm:text-[11px] md:text-xs leading-tight`}>{t('dashboard.cashflow.kpis.total_expenses')}</h4>
                    <p className={`text-xs sm:text-sm md:text-base font-bold mt-1 ${colors?.kpi?.overdue?.text || 'text-rose-700'} leading-tight`}>{formatCurrency(kpis.totalExpenses)}</p>
                  </div>
                  <div className={`rounded-lg ${colors?.neutral?.inactiveChipBg || 'bg-gray-50'} border ${colors?.neutral?.divider || 'border-gray-100'} px-3 py-2 shadow-sm min-w-0`}>
                    <h4 className={`m-0 ${(kpis.avgNet >= 0 ? (colors?.kpi?.netPositive?.text || 'text-emerald-700') : (colors?.kpi?.netNegative?.text || 'text-amber-700'))} font-medium text-[10px] sm:text-[11px] md:text-xs leading-tight`}>{t('dashboard.cashflow.kpis.average_net')}</h4>
                    <p className={`text-xs sm:text-sm md:text-base font-bold mt-1 ${netColorClass} leading-tight`}>{formatCurrency(kpis.avgNet, undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expenses Breakdown Tab */}
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              <div>
                <div className="h-64 md:h-80 py-4 overflow-visible">
                  <h3 className="text-sm md:text-base font-medium mb-2">{t('dashboard.cashflow.expenses.category_share')}</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categories}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMdUp ? '85%' : '82%'}
                        fill={colors?.chartHex?.payments || '#10b981'}
                        stroke="none"
                        strokeWidth={0}
                        label={renderPercentLabel}
                        labelLine={false}
                        minAngle={2}
                        paddingAngle={1}
                      >
                        {categories.map((entry, index) => {
                          const pieColors = Object.values(colors?.bookingStatusHex || {})
                          const fallback = DEFAULT_PIE_COLORS
                          const arr = pieColors && pieColors.length ? pieColors : fallback
                          return (
                            <Cell key={`cell-cat-${index}`} fill={arr[index % arr.length]} />
                          )
                        })}
                      </Pie>
                      <Tooltip formatter={(v, name, { percent }) => [`${formatCurrency(v)} (${(percent * 100).toFixed(1)}%)`, name]} />
                      <Legend verticalAlign="bottom" align="center" height={legendHeight} wrapperStyle={{ fontSize: legendFont, lineHeight: `${legendHeight}px` }} iconSize={legendIcon} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`${colors?.neutral?.inactiveChipBg || 'bg-gray-50'}`}>
                      <th className={`px-3 py-2 text-left border-b ${colors?.neutral?.border?.replace?.('ring-', 'border-') || 'border-gray-200'}`}>{t('dashboard.cashflow.table.category')}</th>
                      <th className={`px-3 py-2 text-right border-b ${colors?.neutral?.border?.replace?.('ring-', 'border-') || 'border-gray-200'}`}>{t('dashboard.cashflow.table.amount')}</th>
                      <th className={`px-3 py-2 text-right border-b ${colors?.neutral?.border?.replace?.('ring-', 'border-') || 'border-gray-200'}`}>{t('dashboard.cashflow.table.percentage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, idx) => {
                      const pct = expenseTotal > 0 ? ((Number(cat.value) || 0) / expenseTotal) * 100 : 0;
                      return (
                        <tr key={idx} className={`border-b ${colors?.neutral?.divider || 'border-gray-100'}`}>
                          <td className="px-3 py-2">{cat.name}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(cat.value)}</td>
                          <td className="px-3 py-2 text-right">{pct.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={`${colors?.neutral?.inactiveChipBg || 'bg-gray-50'} font-semibold`}>
                      <td className="px-3 py-2">{t('dashboard.cashflow.table.total')}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(expenseTotal)}</td>
                      <td className="px-3 py-2 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Income vs Expenses by Weekday */}
          {activeTab === 'weekdays' && (
            <div className="space-y-6">
              <div className="h-64 md:h-80 py-4 overflow-visible">
                <h3 className="text-sm md:text-base font-medium mb-2">{t('dashboard.cashflow.weekdays.title')}</h3>
                <ResponsiveContainer width="100%" height="100%">
                  {/* Match BookingsTrendCard Daily Booking Pattern sizing */}
                  <BarChart data={dailyByWeekday} margin={{ top: 6, right: 6, left: 0, bottom: (isMdUp ? 24 : 12) }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors?.chartHex?.grid || '#e5e7eb'} />
                    <XAxis dataKey="weekday" tick={{ fontSize: tickFont, fill: colors?.chartHex?.axis || '#cbd5e1' }} height={isMdUp ? 36 : 24} />
                    <YAxis tick={{ fontSize: tickFont, fill: colors?.chartHex?.axis || '#cbd5e1' }} width={isMdUp ? 50 : 36} tickFormatter={(v) => formatCompactNoT(v, isMdUp ? 1 : 0)} domain={[0, (max) => (Number.isFinite(max) ? (max <= 0 ? 1 : max * 1.15) : 'auto')]} allowDecimals={false} />
                    <Tooltip formatter={(v, name) => [formatCurrency(v), name]} />
                    <Legend verticalAlign="bottom" align="center" height={legendHeight} wrapperStyle={{ fontSize: legendFont, lineHeight: `${legendHeight}px` }} iconSize={legendIcon} />
                    <Bar dataKey="income" fill={colors?.chartHex?.payments || '#10b981'} name={t('dashboard.cashflow.series.income')} barSize={isMdUp ? 20 : 16}>
                      <LabelList dataKey="income" content={renderBarLabel} />
                    </Bar>
                    <Bar dataKey="expenses" fill={colors?.chartHex?.expenses || '#ef4444'} name={t('dashboard.cashflow.series.expenses')} barSize={isMdUp ? 20 : 16}>
                      <LabelList dataKey="expenses" content={renderBarLabel} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default CashflowCard;