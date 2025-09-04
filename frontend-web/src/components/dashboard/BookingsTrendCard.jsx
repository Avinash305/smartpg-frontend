import React, { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import Card from '../ui/Card';
import DateRangeMenu from '../filters/DateRangeMenu';
import {
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatNumberCompact, formatNumber, formatCurrency } from '../../utils/dateUtils';

// Color palette for the charts (curated, modern)
const COLORS = [
  '#2563EB', // blue-600
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#14B8A6', // teal-500
  '#F97316', // orange-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#0EA5E9', // sky-500
];

// Specific status color mapping for realism/consistency
const STATUS_COLORS = {
  confirmed: '#10B981',     // green (emerald)
  cancelled: '#EF4444',     // red
  pending: '#F59E0B',       // amber
  converted: '#2563EB',     // blue
  reserved: '#8B5CF6',      // violet
  checked_out: '#64748B',   // slate-500
  other: '#94A3B8',         // slate-400
};
const colorForStatus = (name) => {
  const key = String(name || '').toLowerCase();
  return STATUS_COLORS[key] || STATUS_COLORS.other;
};

const BookingsTrendCard = ({
  className,
  selectedBuildings,
  buildingLabel,
  bookingStatusCounts,
  bookingMonthlyTrends,
  bookingSources,
  bookingDaily,
  rangeLabel,
  rangeMode,
  presetKey,
  customStart,
  customEnd,
  setRangeMode,
  setPresetKey,
  setCustomStart,
  setCustomEnd,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [isPending, startTransition] = useTransition();

  // Responsive chart typography like CashflowCard
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

  const bookingTrendsData = useMemo(() => (Array.isArray(bookingMonthlyTrends) ? bookingMonthlyTrends : []), [bookingMonthlyTrends]);
  const statusData = useMemo(() => (
    Array.isArray(bookingStatusCounts) && bookingStatusCounts.length
      ? bookingStatusCounts.map((x) => ({ name: x.status, value: Number(x.count || 0) }))
      : []
  ), [bookingStatusCounts]);
  const bookingSourcesData = useMemo(() => (Array.isArray(bookingSources) ? bookingSources : []), [bookingSources]);
  const dailyBookingsData = useMemo(() => (Array.isArray(bookingDaily) ? bookingDaily : []), [bookingDaily]);
  const totalStatusCount = useMemo(() => (
    Array.isArray(bookingStatusCounts)
      ? bookingStatusCounts.reduce((acc, x) => acc + Number(x?.count || 0), 0)
      : 0
  ), [bookingStatusCounts]);
  const totalSourcesBookings = useMemo(() => (
    Array.isArray(bookingSourcesData)
      ? bookingSourcesData.reduce((acc, curr) => acc + Number(curr.bookings || 0), 0)
      : 0
  ), [bookingSourcesData]);

  const tickFont = isMdUp ? 14 : 10;
  const xHeight = isMdUp ? 36 : 24; // match CashflowCard small height
  const yWidth = isMdUp ? 50 : 36;  // match CashflowCard y-axis width
  const legendFont = isMdUp ? 12 : 10;
  const legendHeight = isMdUp ? 15 : 2;
  const legendIcon = isMdUp ? 14 : 10;
  const xAngle = isMdUp ? -20 : -35;
  const xMinTickGap = isMdUp ? 6 : 2;
  const bottomMargin = isMdUp ? 24 : 12;

  // Stabilize inline object props for Recharts
  const xTick = useMemo(() => ({ fontSize: tickFont }), [tickFont]);
  const yTick = xTick;
  const legendWrapperStyle = useMemo(() => ({ fontSize: legendFont }), [legendFont]);
  const barMarginOverview = useMemo(() => ({ top: 10, right: 6, left: 0, bottom: bottomMargin }), [bottomMargin]);
  const pieMargin = useMemo(() => ({ top: 0, right: 0, left: 0, bottom: bottomMargin }), [bottomMargin]);
  const barMarginTrends = useMemo(() => ({ top: 6, right: 6, left: 0, bottom: bottomMargin }), [bottomMargin]);

  // Compact number formatter and bar label renderer (mirrors CashflowCard style)
  const renderBarLabel = useCallback(({ x, y, width, value }) => {
    if (value == null) return null;
    const cx = x + (width || 0) / 2;
    const cy = (y ?? 0) - 6;
    return (
      <text x={cx} y={cy} textAnchor="middle" fill="#111827" style={{ fontSize: isMdUp ? 12 : 10, fontWeight: 500 }}>
        {formatNumberCompact(value)}
      </text>
    );
  }, [isMdUp]);

  // Percent label renderer mirroring CashflowCard style
  const renderPercentLabel = useCallback(({ percent, x, y }) => (
    <text x={x} y={y} fill="#111827" textAnchor="middle" dominantBaseline="central" style={{ fontSize: tickFont, fontWeight: 500 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ), [tickFont]);

  const tooltipStatusFormatter = useCallback((v) => {
    const total = totalStatusCount || 1;
    const pct = (Number(v) / total) * 100;
    return [`${formatNumber(v)} (${pct.toFixed(1)}%)`, t('dashboard.bookings_trend.count')];
  }, [totalStatusCount, t]);

  const tooltipStatusLabelFormatter = useCallback((label) => String(label || '').replace(/_/g, ' '), []);

  const tooltipSourcesFormatter = useCallback((value, name, props) => {
    const src = props?.payload?.source;
    const conv = props?.payload?.conversion;
    return [`${formatNumber(value)} ${t('dashboard.bookings_trend.bookings_short')} • ${Number(conv || 0).toFixed(1)}% ${t('dashboard.bookings_trend.conv_short')}`, src || name];
  }, [t]);

  const tooltipDailyFormatter = useCallback((value, name) => [formatNumber(value), name], []);

  // Calculate metrics: use monthly series when available so Avg Monthly differs from Total
  const monthlySeries = useMemo(() => (
    Array.isArray(bookingMonthlyTrends) && bookingMonthlyTrends.length > 0
      ? bookingMonthlyTrends
      : bookingTrendsData
  ), [bookingMonthlyTrends, bookingTrendsData]);
  const totalBookings = useMemo(() => monthlySeries.reduce((acc, curr) => acc + Number(curr.bookings || 0), 0), [monthlySeries]);
  const totalRevenue = useMemo(() => monthlySeries.reduce((acc, curr) => acc + Number(curr.revenue || 0), 0), [monthlySeries]);
  const cancellationRate = useMemo(() => {
    const total = statusData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) || 1;
    const cancelled = statusData.find((s) => String(s.name).toLowerCase().includes('cancel'))?.value || 0;
    return (Number(cancelled) / total) * 100;
  }, [statusData]);
  // Booking Rate: percentage of successful statuses out of total
  const bookingRatePct = useMemo(() => {
    const total = statusData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    if (!total) return 0;
    const successTotal = statusData.reduce((acc, s) => {
      const n = String(s.name || '').toLowerCase();
      const isSuccess = ['confirm', 'book', 'check', 'complete', 'occupied'].some((k) => n.includes(k));
      return acc + (isSuccess ? Number(s.value || 0) : 0);
    }, 0);
    return (successTotal / total) * 100;
  }, [statusData]);

  // Tab button helper to mirror CashflowCard style
  const tabBtn = (key, label, color) => (
    <button
      key={key}
      onClick={() => startTransition(() => setActiveTab(key))}
      className={`px-2.5 py-1.5 rounded text-xs font-medium outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none active:outline-none active:ring-0 ${activeTab === key ? `${color} text-white` : 'bg-white text-gray-700 hover:bg-gray-50'}`}
    >
      {label}
    </button>
  );

  return (
    <Card
      title={t('dashboard.bookings_trend.title')}
      className={className}
      description={(
        <div className="flex flex-wrap items-center gap-1.5">
          {tabBtn('overview', t('dashboard.bookings_trend.tabs.overview'), 'bg-blue-600')}
          {tabBtn('sources', t('dashboard.bookings_trend.tabs.sources'), 'bg-emerald-600')}
          {tabBtn('trends', t('dashboard.bookings_trend.tabs.trends'), 'bg-orange-600')}
        </div>
      )}
      actions={(
        <div className="flex items-center gap-2">
          <span className="text-sm md:text-base pr-4 text-gray-600" title={rangeLabel}>{rangeLabel}</span>
          <DateRangeMenu
            value={{ mode: rangeMode, presetKey, start: customStart, end: customEnd }}
            onChange={(next) => {
              if (!next) return;
              startTransition(() => {
                if (next.mode === 'preset') {
                  setRangeMode && setRangeMode('preset');
                  setPresetKey && setPresetKey(next.presetKey);
                } else if (next.mode === 'custom') {
                  setRangeMode && setRangeMode('custom');
                  setCustomStart && setCustomStart(next.start || '');
                  setCustomEnd && setCustomEnd(next.end || '');
                }
              });
            }}
            iconSize={16}
            triggerSize={28}
            align="right"
          />
        </div>
      )}
      padding="xs"
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div className="h-64 md:h-80 py-4">
            <h3 className="text-sm md:text-base font-medium mb-2">{t('dashboard.bookings_trend.status_distribution')}</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={barMarginOverview}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={xTick} interval="preserveStartEnd" angle={xAngle} textAnchor="end" height={xHeight} minTickGap={xMinTickGap} />
                <YAxis tick={yTick} width={yWidth} />
                <Tooltip labelFormatter={tooltipStatusLabelFormatter} formatter={tooltipStatusFormatter} />
                <Legend verticalAlign="bottom" height={legendHeight} wrapperStyle={legendWrapperStyle} iconSize={legendIcon} />
                <Bar dataKey="value" name={t('dashboard.bookings_trend.count')} isAnimationActive={false}>
                  {statusData.map((entry, index) => (
                    <Cell key={`status-cell-${index}`} fill={colorForStatus(entry?.name)} />
                  ))}
                  <LabelList dataKey="value" content={renderBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Key Metrics (moved here like CashflowCard) */}
          <div className="mt-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('dashboard.bookings_trend.key_metrics')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 shadow-sm min-w-0">
                <h4 className="m-0 text-blue-600 font-medium text-[10px] sm:text-[11px] md:text-xs leading-tight">{t('dashboard.bookings_trend.total_bookings')}</h4>
                <p className="text-xs sm:text-sm md:text-base font-bold text-blue-800 leading-tight">{formatNumber(totalBookings)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 shadow-sm min-w-0">
                <h4 className="m-0 text-emerald-600 font-medium text-[10px] sm:text-[11px] md:text-xs leading-tight">{t('dashboard.bookings_trend.total_revenue')}</h4>
                <p className="text-xs sm:text-sm md:text-base font-bold text-emerald-700 leading-tight">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 shadow-sm min-w-0">
                <h4 className="m-0 text-indigo-600 font-medium text-[10px] sm:text-[11px] md:text-xs leading-tight">{t('dashboard.bookings_trend.booking_rate')}</h4>
                <p className="text-xs sm:text-sm md:text-base font-bold text-indigo-700 leading-tight">{bookingRatePct.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 shadow-sm min-w-0">
                <h4 className="m-0 text-rose-600 font-medium text-[10px] sm:text-[11px] md:text-xs leading-tight">{t('dashboard.bookings_trend.cancellation_rate')}</h4>
                <p className="text-xs sm:text-sm md:text-base font-bold text-rose-700 leading-tight">{cancellationRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sources Tab */}
      {activeTab === 'sources' && (
        <div>
          <div className="h-64 md:h-80 py-4">
            <h3 className="text-sm md:text-base font-medium mb-2">{t('dashboard.bookings_trend.booking_sources_rate')}</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={pieMargin}>
                <Pie
                  data={bookingSourcesData}
                  dataKey="bookings"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={'90%'}
                  stroke="none"
                  labelLine={false}
                  isAnimationActive={false}
                  label={renderPercentLabel}
                >
                  {bookingSourcesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipSourcesFormatter} />
                <Legend verticalAlign="bottom" height={legendHeight} wrapperStyle={legendWrapperStyle} iconSize={legendIcon} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6">
            <h3 className="text-sm md:text-base font-medium mb-2">{t('dashboard.bookings_trend.source_details')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-2 text-left border-b-2 border-slate-200">{t('dashboard.bookings_trend.source')}</th>
                    <th className="p-2 text-right border-b-2 border-slate-200">{t('dashboard.bookings_trend.bookings')}</th>
                    <th className="p-2 text-right border-b-2 border-slate-200">{t('dashboard.bookings_trend.conversion_rate')}</th>
                    <th className="p-2 text-right border-b-2 border-slate-200">{t('dashboard.bookings_trend.market_share')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingSourcesData.map((source, index) => {
                    const marketShare = totalSourcesBookings > 0 ? ((Number(source.bookings || 0) / totalSourcesBookings) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={index} className="border-b border-slate-200">
                        <td className="p-2">{source.source}</td>
                        <td className="p-2 text-right">{formatNumber(source.bookings)}</td>
                        <td className="p-2 text-right">{source.conversion}%</td>
                        <td className="p-2 text-right">{marketShare}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div>
          <div className="h-64 md:h-80 py-4">
            <h3 className="text-sm md:text-base font-medium mb-2">{t('dashboard.bookings_trend.daily_booking_pattern')}</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyBookingsData} margin={barMarginTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={xTick} height={xHeight} />
                <YAxis tick={yTick} width={yWidth} />
                <Tooltip formatter={tooltipDailyFormatter} />
                <Legend verticalAlign="bottom" height={legendHeight} wrapperStyle={legendWrapperStyle} iconSize={legendIcon} />
                <Bar dataKey="bookings" name={t('dashboard.bookings_trend.daily_bookings')} fill="#8884D8" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  );
};

export default React.memo(BookingsTrendCard);