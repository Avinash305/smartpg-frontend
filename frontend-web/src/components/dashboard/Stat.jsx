import React from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { motion } from 'framer-motion'
import { useColorScheme } from '../../theme/colorSchemes'

// Simple yet rich Stat card
// Backward compatible with existing usage in Dashboard
// New optional props: subtitle, hint, delta, deltaType ('increase'|'decrease'), loading, formatter
// Theming: optional `scheme` and `accent` to pull from theme.accents
const Stat = ({
  icon: Icon,
  label,
  value,
  to,
  color = 'text-indigo-600',
  bg = 'bg-indigo-50',
  subtitle,
  hint,
  delta,
  deltaType = 'increase',
  loading = false,
  formatter,
  scheme,
  accent = 'indigo',
  valueColor,
}) => {
  const colors = useColorScheme(scheme)
  const themedAccent = colors?.accents?.[accent]
  const boxBg = themedAccent?.bg || bg
  const boxText = themedAccent?.text || color
  const valueText = valueColor || themedAccent?.text || 'text-gray-900'
  const deltaColor = deltaType === 'decrease'
    ? `${colors?.kpi?.overdue?.text || 'text-rose-700'} ${colors?.kpi?.overdue?.bg || 'bg-rose-50'}`
    : `${colors?.kpi?.collected?.text || 'text-emerald-700'} ${colors?.kpi?.collected?.bg || 'bg-emerald-50'}`
  const Wrapper = to ? Link : 'div'
  const wrapperProps = to ? { to, className: 'block' } : { className: 'block' }
  const formatted = formatter ? formatter(value) : (value ?? '-')
  const showDelta = delta != null && delta !== ''

  return (
    <Wrapper {...wrapperProps} title={hint || undefined}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="will-change-transform"
      >
      <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 bg-gradient-to-br from-white to-gray-50" padding="sm">
        <div className="flex items-center gap-3">
          {Icon ? (
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${boxBg} ${boxText} ring-1 ring-black/5 shadow-sm`}>
              <Icon className="h-4 w-4" />
            </div>
          ) : null}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={`text-lg sm:text-2xl font-semibold ${valueText}`}>
                {loading ? (
                  <span className="inline-block h-5 w-16 rounded bg-gray-200 animate-pulse" />
                ) : (
                  formatted
                )}
              </div>
              {showDelta ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${deltaColor}`}>
                  {deltaType === 'decrease' ? '▼' : '▲'} {delta}
                </span>
              ) : null}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500 truncate">{label}</div>
            {subtitle ? (
              <div className="text-[11px] text-gray-500/80 truncate">{subtitle}</div>
            ) : null}
          </div>

          <div className="ml-auto text-gray-300">
            {to ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M9.75 4.5l7.5 7.5-7.5 7.5"/>
              </svg>
            ) : null}
          </div>
        </div>
      </Card>
      </motion.div>
    </Wrapper>
  )
}

export default Stat
