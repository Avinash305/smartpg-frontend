// Reusable Tailwind-safe color schemes for dashboard components
import { useMemo } from 'react'

// Helper to compose badge classes
const badge = (bg, border, text) => `${bg} ${border} ${text}`

// Predefined, safelisted Tailwind color schemes
// Keep all class names literal strings to satisfy Tailwind JIT safelisting
export const SCHEMES = {
  default: {
    headerBg: 'bg-slate-900',
    // Neutral palette for non-status UI
    neutral: {
      text: 'text-gray-700',
      subtle: 'text-gray-600',
      muted: 'text-gray-500',
      heading: 'text-gray-900',
      track: 'bg-gray-200',
      border: 'ring-gray-200',
      divider: 'border-gray-100',
      cardRing: 'ring-gray-100',
      cardRingHover: 'ring-gray-300',
      tooltipBg: 'bg-white',
      tooltipRing: 'ring-gray-200',
      inactiveChipBg: 'bg-gray-100',
      inactiveChipText: 'text-gray-700',
      emptyText: 'text-gray-500',
      link: 'text-sky-700',
    },
    occupied: { seg: 'bg-sky-600', dot: 'bg-sky-600', badge: badge('bg-sky-50', 'border-sky-100', 'text-sky-700') },
    reserved: { seg: 'bg-violet-500', dot: 'bg-violet-500', badge: badge('bg-violet-50', 'border-violet-100', 'text-violet-700') },
    maintenance: { seg: 'bg-rose-400', dot: 'bg-rose-400', badge: badge('bg-rose-50', 'border-rose-100', 'text-rose-700') },
    available: { seg: 'bg-emerald-500', dot: 'bg-emerald-500', badge: badge('bg-emerald-50', 'border-emerald-100', 'text-emerald-700') },
    // KPI badge/text classes
    kpi: {
      pending: { text: 'text-sky-700', bg: 'bg-sky-50' },
      collected: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
      overdue: { text: 'text-rose-700', bg: 'bg-rose-50' },
      upcoming7: { text: 'text-amber-700', bg: 'bg-amber-50' },
      upcoming3: { text: 'text-sky-700', bg: 'bg-sky-50' },
      netPositive: { text: 'text-sky-700', bg: 'bg-sky-50' },
      netNegative: { text: 'text-amber-700', bg: 'bg-amber-50' },
    },
    // Generic accents for small stat pills
    accents: {
      sky: { text: 'text-sky-700', bg: 'bg-sky-50', ring: 'ring-sky-200' },
      emerald: { text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
      amber: { text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' },
      indigo: { text: 'text-indigo-700', bg: 'bg-indigo-50', ring: 'ring-indigo-200' },
      rose: { text: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-200' },
      teal: { text: 'text-teal-700', bg: 'bg-teal-50', ring: 'ring-teal-200' },
    },
    // Hex colors for charts (SVG/recharts)
    chartHex: {
      payments: '#10b981', // emerald-500
      expenses: '#ef4444', // red-500
      grid: '#e5e7eb', // gray-200
      axis: '#cbd5e1', // slate-300
      label: '#374151', // gray-700
    },
    // Booking status palette (hex)
    bookingStatusHex: {
      pending: '#f59e0b',     // amber-500
      confirmed: '#3b82f6',   // blue-500
      checked_in: '#10b981',  // emerald-500
      checked_out: '#6366f1', // indigo-500
      cancelled: '#ef4444',   // red-500
      other: '#9ca3af',       // gray-400
    },
  },
  ocean: {
    headerBg: 'bg-slate-900',
    // Neutral palette for non-status UI
    neutral: {
      text: 'text-gray-700', subtle: 'text-gray-600', muted: 'text-gray-500', heading: 'text-gray-900',
      track: 'bg-gray-200', border: 'ring-gray-200', divider: 'border-gray-100', cardRing: 'ring-gray-100', cardRingHover: 'ring-gray-300', tooltipBg: 'bg-white', tooltipRing: 'ring-gray-200', inactiveChipBg: 'bg-gray-100', inactiveChipText: 'text-gray-700', emptyText: 'text-gray-500', link: 'text-sky-700',
    },
    occupied: { seg: 'bg-sky-600', dot: 'bg-sky-600', badge: badge('bg-sky-50', 'border-sky-100', 'text-sky-700') },
    reserved: { seg: 'bg-violet-500', dot: 'bg-violet-500', badge: badge('bg-violet-50', 'border-violet-100', 'text-violet-700') },
    maintenance: { seg: 'bg-blue-400', dot: 'bg-blue-400', badge: badge('bg-blue-50', 'border-blue-100', 'text-blue-700') },
    available: { seg: 'bg-emerald-500', dot: 'bg-emerald-500', badge: badge('bg-emerald-50', 'border-emerald-100', 'text-emerald-700') },
    kpi: {
      pending: { text: 'text-blue-700', bg: 'bg-blue-50' },
      collected: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
      overdue: { text: 'text-rose-700', bg: 'bg-rose-50' },
      upcoming7: { text: 'text-cyan-700', bg: 'bg-cyan-50' },
      upcoming3: { text: 'text-sky-700', bg: 'bg-sky-50' },
      netPositive: { text: 'text-sky-700', bg: 'bg-sky-50' },
      netNegative: { text: 'text-amber-700', bg: 'bg-amber-50' },
    },
    accents: {
      sky: { text: 'text-sky-700', bg: 'bg-sky-50', ring: 'ring-sky-200' },
      emerald: { text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
      amber: { text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' },
      indigo: { text: 'text-indigo-700', bg: 'bg-indigo-50', ring: 'ring-indigo-200' },
      rose: { text: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-200' },
      teal: { text: 'text-teal-700', bg: 'bg-teal-50', ring: 'ring-teal-200' },
      blue: { text: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-200' },
      cyan: { text: 'text-cyan-700', bg: 'bg-cyan-50', ring: 'ring-cyan-200' },
    },
    chartHex: {
      payments: '#0ea5e9', // sky-500
      expenses: '#ef4444', // red-500
      grid: '#e5e7eb',
      axis: '#cbd5e1',
      label: '#374151',
    },
    bookingStatusHex: {
      pending: '#f59e0b',
      confirmed: '#0ea5e9',
      checked_in: '#10b981',
      checked_out: '#6366f1',
      cancelled: '#ef4444',
      other: '#9ca3af',
    },
  },
  plum: {
    headerBg: 'bg-slate-900',
    // Neutral palette for non-status UI
    neutral: {
      text: 'text-gray-700', subtle: 'text-gray-600', muted: 'text-gray-500', heading: 'text-gray-900',
      track: 'bg-gray-200', border: 'ring-gray-200', divider: 'border-gray-100', cardRing: 'ring-gray-100', cardRingHover: 'ring-gray-300', tooltipBg: 'bg-white', tooltipRing: 'ring-gray-200', inactiveChipBg: 'bg-gray-100', inactiveChipText: 'text-gray-700', emptyText: 'text-gray-500', link: 'text-violet-700',
    },
    occupied: { seg: 'bg-sky-600', dot: 'bg-sky-600', badge: badge('bg-sky-50', 'border-sky-100', 'text-sky-700') },
    reserved: { seg: 'bg-violet-500', dot: 'bg-violet-500', badge: badge('bg-violet-50', 'border-violet-100', 'text-violet-700') },
    maintenance: { seg: 'bg-pink-400', dot: 'bg-pink-400', badge: badge('bg-pink-50', 'border-pink-100', 'text-pink-700') },
    available: { seg: 'bg-emerald-500', dot: 'bg-emerald-500', badge: badge('bg-emerald-50', 'border-emerald-100', 'text-emerald-700') },
    kpi: {
      pending: { text: 'text-violet-700', bg: 'bg-violet-50' },
      collected: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
      overdue: { text: 'text-rose-700', bg: 'bg-rose-50' },
      upcoming7: { text: 'text-amber-700', bg: 'bg-amber-50' },
      upcoming3: { text: 'text-sky-700', bg: 'bg-sky-50' },
      netPositive: { text: 'text-violet-700', bg: 'bg-violet-50' },
      netNegative: { text: 'text-amber-700', bg: 'bg-amber-50' },
    },
    accents: {
      sky: { text: 'text-sky-700', bg: 'bg-sky-50', ring: 'ring-sky-200' },
      emerald: { text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
      amber: { text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' },
      indigo: { text: 'text-indigo-700', bg: 'bg-indigo-50', ring: 'ring-indigo-200' },
      violet: { text: 'text-violet-700', bg: 'bg-violet-50', ring: 'ring-violet-200' },
      pink: { text: 'text-pink-700', bg: 'bg-pink-50', ring: 'ring-pink-200' },
    },
    chartHex: {
      payments: '#8b5cf6', // violet-500
      expenses: '#ef4444', // red-500
      grid: '#e5e7eb',
      axis: '#cbd5e1',
      label: '#374151',
    },
    bookingStatusHex: {
      pending: '#f59e0b',
      confirmed: '#8b5cf6',
      checked_in: '#10b981',
      checked_out: '#6366f1',
      cancelled: '#ef4444',
      other: '#9ca3af',
    },
  },
  indigo: {
    headerBg: 'bg-indigo-900',
    // Neutral palette for non-status UI
    neutral: {
      text: 'text-gray-700', subtle: 'text-gray-600', muted: 'text-gray-500', heading: 'text-gray-900',
      track: 'bg-gray-200', border: 'ring-gray-200', divider: 'border-gray-100', cardRing: 'ring-gray-100', cardRingHover: 'ring-gray-300', tooltipBg: 'bg-white', tooltipRing: 'ring-gray-200', inactiveChipBg: 'bg-gray-100', inactiveChipText: 'text-gray-700', emptyText: 'text-gray-500', link: 'text-sky-700',
    },
    occupied: { seg: 'bg-sky-600', dot: 'bg-sky-600', badge: badge('bg-sky-50', 'border-sky-100', 'text-sky-700') },
    reserved: { seg: 'bg-violet-500', dot: 'bg-violet-500', badge: badge('bg-violet-50', 'border-violet-100', 'text-violet-700') },
    maintenance: { seg: 'bg-rose-400', dot: 'bg-rose-400', badge: badge('bg-rose-50', 'border-rose-100', 'text-rose-700') },
    available: { seg: 'bg-emerald-500', dot: 'bg-emerald-500', badge: badge('bg-emerald-50', 'border-emerald-100', 'text-emerald-700') },
    kpi: {
      pending: { text: 'text-indigo-700', bg: 'bg-indigo-50' },
      collected: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
      overdue: { text: 'text-rose-700', bg: 'bg-rose-50' },
      upcoming7: { text: 'text-blue-700', bg: 'bg-blue-50' },
      upcoming3: { text: 'text-sky-700', bg: 'bg-sky-50' },
      netPositive: { text: 'text-indigo-700', bg: 'bg-indigo-50' },
      netNegative: { text: 'text-amber-700', bg: 'bg-amber-50' },
    },
    accents: {
      sky: { text: 'text-sky-700', bg: 'bg-sky-50', ring: 'ring-sky-200' },
      emerald: { text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
      amber: { text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' },
      indigo: { text: 'text-indigo-700', bg: 'bg-indigo-50', ring: 'ring-indigo-200' },
      rose: { text: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-200' },
    },
    chartHex: {
      payments: '#6366f1', // indigo-500
      expenses: '#ef4444',
      grid: '#e5e7eb',
      axis: '#cbd5e1',
      label: '#374151',
    },
    bookingStatusHex: {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      checked_in: '#10b981',
      checked_out: '#6366f1',
      cancelled: '#ef4444',
      other: '#9ca3af',
    },
  },
}

export const getScheme = (name) => SCHEMES[name] || SCHEMES.default

// Allow runtime extension (e.g., from admin settings/UI). Not persisted by default.
export const registerScheme = (name, scheme) => {
  if (!name || typeof scheme !== 'object' || scheme == null) return
  SCHEMES[name] = scheme
}

// Unify status colors across all schemes (example: pending always #f59e0b)
// We standardize both chart-agnostic hex colors and KPI text/bg classes.
const UNIFIED_BOOKING_STATUS_HEX = {
  pending: '#f59e0b',     // amber-500
  confirmed: '#3b82f6',   // blue-500
  checked_in: '#10b981',  // emerald-500
  checked_out: '#6366f1', // indigo-500
  cancelled: '#ef4444',   // red-500
  other: '#9ca3af',       // gray-400
}
const UNIFIED_KPI = {
  pending: { text: 'text-amber-700', bg: 'bg-amber-50' },
  collected: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  overdue: { text: 'text-rose-700', bg: 'bg-rose-50' },
  upcoming7: { text: 'text-amber-700', bg: 'bg-amber-50' },
  upcoming3: { text: 'text-sky-700', bg: 'bg-sky-50' },
  netPositive: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  netNegative: { text: 'text-amber-700', bg: 'bg-amber-50' },
}

// Apply unification to every defined scheme (single pass)
Object.keys(SCHEMES).forEach((key) => {
  const s = SCHEMES[key]
  if (!s) return
  // Unified status hex map
  s.bookingStatusHex = { ...UNIFIED_BOOKING_STATUS_HEX }
  // Unified KPI classes
  s.kpi = { ...UNIFIED_KPI }
  // Standardized occupancy palette (rooms/floors/properties)
  s.available = { seg: 'bg-emerald-500', dot: 'bg-emerald-500', badge: badge('bg-emerald-50', 'border-emerald-100', 'text-emerald-700') }
  // Occupied switched to purple across the app
  s.occupied = { seg: 'bg-purple-500', dot: 'bg-purple-500', badge: badge('bg-purple-50', 'border-purple-100', 'text-purple-700') }
  s.reserved = { seg: 'bg-amber-500', dot: 'bg-amber-500', badge: badge('bg-amber-50', 'border-amber-100', 'text-amber-700') }
  // Maintenance: light red tone
  s.maintenance = { seg: 'bg-rose-300', dot: 'bg-rose-300', badge: badge('bg-rose-50', 'border-rose-100', 'text-rose-700') }
  // Ensure a purple accent is available for text/bg usage
  s.accents = {
    ...(s.accents || {}),
    purple: { text: 'text-purple-700', bg: 'bg-purple-50', ring: 'ring-purple-200' },
  }
  // Ensure a neutral palette exists
  s.neutral = s.neutral || {
    text: 'text-gray-700', subtle: 'text-gray-600', muted: 'text-gray-500', heading: 'text-gray-900',
    track: 'bg-gray-200', border: 'ring-gray-200', divider: 'border-gray-100', cardRing: 'ring-gray-100', cardRingHover: 'ring-gray-300', tooltipBg: 'bg-white', tooltipRing: 'ring-gray-200', inactiveChipBg: 'bg-gray-100', inactiveChipText: 'text-gray-700', emptyText: 'text-gray-500', link: 'text-sky-700',
  }
})

export const useColorScheme = (schemeName) => {
  return useMemo(() => getScheme(schemeName), [schemeName])
}
