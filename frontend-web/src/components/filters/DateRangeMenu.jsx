import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Reusable date range selector shown as a three-dots menu
// Props:
// - value: { mode: 'preset'|'custom', presetKey?: string, start?: string (YYYY-MM-DD), end?: string }
// - onChange: function(next)
// - presets?: custom list override
// - align?: 'right'|'left' (dropdown alignment)
// - extraFilters?: [{ key: string, label: string, checked?: boolean }]
// - onToggleFilter?: function(key: string, nextChecked: boolean)
// - extraSectionTitle?: string (defaults to 'Filters')
// - iconSize?: number (px, default 16)
// - triggerSize?: number (px, default 32) — button width/height square
// - compactTrigger?: boolean (default false). If true, remove border/hover and use minimal footprint.
const DateRangeMenu = ({
  value,
  onChange,
  presets,
  align = 'right',
  maxHeight = '40vh',
  maxWidth = '10rem',
  belowOnly = true,
  extraFilters,
  onToggleFilter,
  extraSectionTitle = 'Filters',
  iconSize = 16,
  triggerSize = 32,
  compactTrigger = false,
}) => {
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [cStart, setCStart] = useState(value?.start || '')
  const [cEnd, setCEnd] = useState(value?.end || '')
  const btnRef = useRef(null)
  const [pos, setPos] = useState({ top: null, bottom: null, left: 0, right: null, width: 224 })

  const presetItems = useMemo(() => presets || [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7', label: 'Last 7 days' },
    { key: 'last15', label: 'Last 15 days' },
    { key: 'last30', label: 'Last 30 days' },
    { key: 'this_month', label: 'This month' },
    { key: 'last_month', label: 'Last month' },
    { key: 'this_year', label: 'This year' },
    { key: 'last_year', label: 'Last year' },
  ], [presets])

  const applyPreset = (key) => {
    onChange && onChange({ mode: 'preset', presetKey: key })
    setOpen(false)
    setShowCustom(false)
  }

  const applyCustom = () => {
    if (!cStart || !cEnd) return
    onChange && onChange({ mode: 'custom', start: cStart, end: cEnd })
    setOpen(false)
    setShowCustom(false)
  }

  const toPxLength = (val, axis = 'y') => {
    if (typeof val === 'number') return Math.round(val)
    if (typeof val !== 'string') return null
    const s = val.trim()
    if (s.endsWith('px')) {
      const n = parseFloat(s)
      return Number.isNaN(n) ? null : Math.round(n)
    }
    if (s.endsWith('vh')) {
      const n = parseFloat(s)
      return Number.isNaN(n) ? null : Math.round((n / 100) * window.innerHeight)
    }
    if (s.endsWith('vw')) {
      const n = parseFloat(s)
      return Number.isNaN(n) ? null : Math.round((n / 100) * window.innerWidth)
    }
    if (s.endsWith('rem')) {
      const n = parseFloat(s)
      const base = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      return Number.isNaN(n) ? null : Math.round(n * base)
    }
    // Unsupported unit
    return null
  }

  const toPxMaxHeight = () => {
    if (typeof maxHeight === 'string') {
      if (maxHeight.endsWith('vh')) {
        const vh = parseFloat(maxHeight)
        if (!Number.isNaN(vh)) return Math.round((vh / 100) * window.innerHeight)
      }
      if (maxHeight.endsWith('px')) {
        const px = parseFloat(maxHeight)
        if (!Number.isNaN(px)) return Math.round(px)
      }
    } else if (typeof maxHeight === 'number') {
      return Math.round(maxHeight)
    }
    return Math.round(0.6 * window.innerHeight)
  }

  const updatePosition = () => {
    const el = btnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const gutter = 8
    const available = Math.max(120, window.innerWidth - 2 * gutter)
    let panelWidth = Math.min(224, available)
    // If even 160px can't fit (very small screens), allow shrinking further
    if (window.innerWidth - 2 * gutter < 160) {
      panelWidth = Math.max(120, window.innerWidth - 2 * gutter)
    }
    // Respect maxWidth if it's smaller than computed
    const maxWidthPx = toPxLength(maxWidth, 'x')
    if (maxWidthPx != null) {
      panelWidth = Math.min(panelWidth, Math.max(120, maxWidthPx))
    }
    const estHeight = toPxMaxHeight()

    // Horizontal anchoring with minimal shift
    const minLeft = 8
    const viewportMax = window.innerWidth - 8
    const leftEdge = Math.round(rect.left)
    const rightEdge = Math.round(rect.right)
    let computedWidth = panelWidth
    let clampedLeft

    // Try left-edge: shrink width to fit to the right of icon
    const spaceRight = viewportMax - leftEdge
    if (spaceRight >= 120) {
      computedWidth = Math.min(panelWidth, spaceRight)
      clampedLeft = Math.max(minLeft, leftEdge)
    } else {
      // Try right-edge: shrink width to fit to the left of icon
      const spaceLeft = rightEdge - minLeft
      if (spaceLeft >= 120) {
        computedWidth = Math.min(panelWidth, spaceLeft)
        clampedLeft = Math.max(minLeft, rightEdge - computedWidth)
      } else {
        // Fallback: clamp within viewport with smallest movement
        const maxLeft = window.innerWidth - panelWidth - 8
        const leftOption = Math.max(minLeft, Math.min(maxLeft, leftEdge))
        const rightOption = Math.max(minLeft, Math.min(maxLeft, rightEdge - panelWidth))
        clampedLeft = (Math.abs(leftOption - leftEdge) <= Math.abs(rightOption - leftEdge)) ? leftOption : rightOption
        computedWidth = panelWidth
      }
    }

    // Vertical: prefer below; flip above if not enough space
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const minNeeded = Math.min(200, estHeight)
    if (spaceBelow >= minNeeded) {
      const top = Math.round(rect.bottom + 6)
      setPos({ top, bottom: null, left: clampedLeft, right: null, width: computedWidth })
    } else if (spaceAbove >= minNeeded) {
      const bottom = Math.round(window.innerHeight - rect.top + 6)
      setPos({ top: null, bottom, left: clampedLeft, right: null, width: computedWidth })
    } else {
      // Choose side with more space
      if (spaceBelow >= spaceAbove) {
        const top = Math.round(rect.bottom + 6)
        setPos({ top, bottom: null, left: clampedLeft, right: null, width: computedWidth })
      } else {
        const bottom = Math.round(window.innerHeight - rect.top + 6)
        setPos({ top: null, bottom, left: clampedLeft, right: null, width: computedWidth })
      }
    }
  }

  useEffect(() => {
    if (!open) return
    updatePosition()
    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, align, belowOnly])

  const currentLabel = useMemo(() => {
    if (value?.mode === 'preset') {
      const found = presetItems.find(p => p.key === value?.presetKey)
      return found?.label || 'Range'
    }
    if (value?.mode === 'custom' && value?.start && value?.end) return `${value.start} → ${value.end}`
    return 'Range'
  }, [value, presetItems])

  // Trigger styles
  const triggerClass = compactTrigger
    ? 'inline-flex items-center justify-center rounded-md text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors'
    : 'inline-flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-600 border border-gray-200'
  const triggerDim = compactTrigger ? iconSize : triggerSize

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        className={triggerClass}
        title={`Change range (${currentLabel})`}
        onClick={() => setOpen((v) => !v)}
        ref={btnRef}
        style={{ width: `${triggerDim}px`, height: `${triggerDim}px` }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: iconSize, height: iconSize }}>
          <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 16.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
        </svg>
      </button>

      {open && createPortal(
        (
          <div
            className="z-50 fixed"
            style={{ top: pos.top ?? 'auto', bottom: pos.bottom ?? 'auto', left: pos.left ?? 'auto', right: pos.right ?? 'auto', width: pos.width }}
          >
            <div className="overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg" style={{ maxHeight, maxWidth, width: pos.width }}>
              {!showCustom ? (
                <div className="py-1">
                  {presetItems.map((p) => (
                    <button
                      key={p.key}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${value?.mode === 'preset' && value?.presetKey === p.key ? 'text-indigo-600' : 'text-gray-700'}`}
                      onClick={() => applyPreset(p.key)}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700" onClick={() => setShowCustom(true)}>
                    Custom range…
                  </button>
                  {Array.isArray(extraFilters) && extraFilters.length > 0 && (
                    <>
                      <div className="my-1 border-t border-gray-100" />
                      <div className="mt-1 pt-2">
                        <div className="px-3 pb-1 text-[11px] uppercase tracking-wide text-gray-400">{extraSectionTitle}</div>
                        <div className="px-3 pb-2 space-y-1">
                          {extraFilters.map((f) => (
                            <label key={f.key} className="flex items-center gap-2 text-sm text-gray-700 select-none">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={!!f.checked}
                                onChange={(e)=> onToggleFilter && onToggleFilter(f.key, e.target.checked)}
                              />
                              <span>{f.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-3">
                  <div className="text-xs text-gray-500 mb-2">Custom range</div>
                  <div className="space-y-2">
                    <input type="date" className="w-full border border-gray-200 rounded px-2 py-1 text-sm" value={cStart} onChange={(e) => setCStart(e.target.value)} />
                    <input type="date" className="w-full border border-gray-200 rounded px-2 py-1 text-sm" value={cEnd} onChange={(e) => setCEnd(e.target.value)} />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900" onClick={() => { setShowCustom(false); }}>
                        Back
                      </button>
                      <button className="text-xs px-2 py-1 rounded bg-gray-900 text-white" onClick={applyCustom}>
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ),
        document.body
      )}

      {open && (
        <button className="fixed inset-0 cursor-default opacity-0" aria-hidden onClick={() => { setOpen(false); setShowCustom(false) }} />
      )}
    </div>
  )
}

export default DateRangeMenu
