import React, { useMemo } from 'react'
import { FiActivity, FiHome, FiBookmark, FiTool } from 'react-icons/fi'
import { useColorScheme } from '../../theme/colorSchemes'
import { Card } from '../ui/Card'
import { useTranslation } from 'react-i18next'

const Badge = ({ dotCls, label = '', value = 0, badgeCls }) => (
  <div className={`flex items-center justify-between gap-2 py-1 rounded-md border text-xs ${badgeCls}`}>
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotCls}`} />
    <span className="flex-1 truncate">{label}</span>
    <span className="font-semibold tabular-nums">{value}</span>
  </div>
)

const Segment = ({ pct = 0, className = '', title = '' }) => (
  <div
    title={`${title}: ${pct.toFixed(1)}%`}
    style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
    className={`h-3.5 sm:h-4 transition-all first:rounded-l-lg last:rounded-r-lg ring-1 ring-black/5 ${className}`}
    aria-hidden
  />
)

const StatChip = ({ label, value, icon: Icon, accent = '', iconBg = '', containerCls = '', mutedTextCls = '' }) => (
  <div className={`flex items-center gap-1 sm:gap-2 px-2 py-2 rounded-md border shadow-sm hover:shadow-md transition-all duration-200 ${containerCls}`}>
    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${iconBg} text-white shadow-inner bg-gradient-to-br from-white/10 to-black/10 backdrop-blur-sm`}>
      {Icon ? <Icon className="w-3.5 h-3.5 opacity-95" /> : null}
    </div>
    <div className="flex flex-col leading-tight">
      <span className={`text-[10px] uppercase tracking-wide ${mutedTextCls}`}>{label}</span>
      <span className={`text-sm font-bold tabular-nums ${accent}`}>{value}</span>
    </div>
  </div>
)

const OccupancyCard = ({
  occupancy = { available: 0, occupied: 0, reserved: 0, maintenance: 0 },
  scheme = 'default',
  selectedBuildings = [],
  totalBedsShown,
  title = '',
  className = '',
}) => {
  const { t } = useTranslation()
  const { available = 0, occupied = 0, reserved = 0, maintenance = 0 } = occupancy || {}
  const colors = useColorScheme(scheme)

  const { total, occPct, freePct, segments } = useMemo(() => {
    const totalBeds = [available, occupied, reserved, maintenance]
      .map((n) => Number.isFinite(+n) ? +n : 0)
      .reduce((a, b) => a + b, 0)
    const occ = totalBeds > 0 ? ((occupied + reserved) / totalBeds) * 100 : 0
    const free = totalBeds > 0 ? (available / totalBeds) * 100 : 0
    const segs = [
      { key: 'occupied', pct: totalBeds ? (occupied / totalBeds) * 100 : 0, title: t('dashboard.occupancy.legend.occupied'), cls: colors.occupied.seg },
      { key: 'reserved', pct: totalBeds ? (reserved / totalBeds) * 100 : 0, title: t('dashboard.occupancy.legend.reserved'), cls: colors.reserved.seg },
      { key: 'maintenance', pct: totalBeds ? (maintenance / totalBeds) * 100 : 0, title: t('dashboard.occupancy.legend.maintenance'), cls: colors.maintenance.seg },
      { key: 'available', pct: totalBeds ? (available / totalBeds) * 100 : 0, title: t('dashboard.occupancy.legend.available'), cls: colors.available.seg },
    ]
    return { total: totalBeds, occPct: occ, freePct: free, segments: segs }
  }, [available, occupied, reserved, maintenance, colors, t])

  return (
    <Card
      title={(
        <div className={`inline-flex items-center gap-3 px-3.5 py-2 rounded-full border ${(colors?.neutral?.border || 'ring-gray-200').replace('ring-', 'border-')} bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm`}>
          <FiActivity className={`w-6 h-6 ${colors?.accents?.emerald?.text || 'text-emerald-700'}`} />
          <span className={`text-sm md:text-lg font-semibold ${colors?.accents?.emerald?.text || 'text-emerald-700'}`}>{t('dashboard.occupancy.title')}</span>
          <span className="relative inline-flex w-2.5 h-2.5">
            <span className={`absolute inline-flex w-full h-full rounded-full ${colors?.available?.dot || 'bg-emerald-500'} opacity-75 animate-ping`} />
            <span className={`relative inline-flex rounded-full w-2.5 h-2.5 ${colors?.available?.dot || 'bg-emerald-500'} shadow`} />
          </span>
        </div>
      )}
      actions={(
        <div className={`inline-flex items-baseline gap-2 px-3 py-1.5 rounded-lg ${colors.occupied.seg} text-white shadow-sm ring-1 ring-black/5`}>
          <span className="text-2xl sm:text-3xl font-extrabold tabular-nums drop-shadow-sm">{occPct.toFixed(0)}%</span>
          <span className="text-[11px] uppercase tracking-wider/loose opacity-90">{t('dashboard.occupancy.occupied_chip')}</span>
        </div>
      )}
      className={`relative overflow-hidden bg-gradient-to-br p-2 py-4 from-white ${(colors?.neutral?.track || 'bg-gray-200').replace('bg-', 'to-')} ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_10%_10%,rgba(255,255,255,0.6),transparent_60%),radial-gradient(50%_30%_at_90%_0%,rgba(255,255,255,0.4),transparent_60%)]" aria-hidden />
      {/* Selection context */}
      <div className={`mt-1 mb-2 text-[11px] ${colors?.neutral?.muted || 'text-gray-500'} flex items-center justify-between`}>
        <span>
          {t('dashboard.occupancy.buildings_label')}: {Array.isArray(selectedBuildings) && selectedBuildings.length ? selectedBuildings.join(', ') : t('dashboard.occupancy.all')}
        </span>
        {typeof totalBedsShown === 'number' ? (
          <span className="ml-3">{t('dashboard.occupancy.beds_considered')}: {totalBedsShown}</span>
        ) : null}
      </div>

      {total === 0 ? (
        <div className={`mb-3 p-3 rounded-md ${(colors?.neutral?.inactiveChipBg || 'bg-gray-50')} border ${(colors?.neutral?.divider || 'border-gray-100')} text-xs ${colors?.neutral?.subtle || 'text-gray-600'}`}>
          {t('dashboard.occupancy.empty')}
        </div>
      ) : null}

      {/* Segmented Progress Bar */}
      <div
        className={`relative w-full rounded-lg overflow-hidden ${(colors?.neutral?.track || 'bg-gray-200').replace('bg-', 'bg-')} h-3.5 sm:h-4 flex ring-1 ${(colors?.neutral?.cardRing || 'ring-gray-100')} shadow-inner`}
        role="progressbar"
        aria-valuenow={Math.round(occPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('dashboard.occupancy.aria_overall')}
      >
        {/* separators via small gaps */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_0.5px,transparent_0.5px)] bg-[size:16px_100%] opacity-30" aria-hidden />
        {segments.map((s) => (
          <Segment key={s.key} pct={s.pct} className={`${s.cls} transition-[width] duration-500 ease-out`} title={s.title} />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Badge dotCls={`${colors.occupied.dot} shadow`} label={t('dashboard.occupancy.legend.occupied')} value={occupied} badgeCls={`${colors.occupied.badge} hover:shadow-sm transition`} />
        <Badge dotCls={`${colors.reserved.dot} shadow`} label={t('dashboard.occupancy.legend.reserved')} value={reserved} badgeCls={`${colors.reserved.badge} hover:shadow-sm transition`} />
        <Badge dotCls={`${colors.maintenance.dot} shadow`} label={t('dashboard.occupancy.legend.maintenance')} value={maintenance} badgeCls={`${colors.maintenance.badge} hover:shadow-sm transition`} />
        <Badge dotCls={`${colors.available.dot} shadow`} label={t('dashboard.occupancy.legend.available')} value={available} badgeCls={`${colors.available.badge} hover:shadow-sm transition`} />
      </div>

      {/* Stats Row (compact, auto-fit to container) */}
      <div className="mt-5 grid auto-fit grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2">
        <StatChip
          label={t('dashboard.occupancy.stats.total')}
          value={total}
          icon={FiHome}
          iconBg={(colors?.neutral?.track || 'bg-gray-200')}
          containerCls={`bg-white/70 backdrop-blur-sm ${(colors?.neutral?.border || 'ring-gray-200').replace('ring-', 'border-')}`}
          mutedTextCls={`${colors?.neutral?.muted || 'text-gray-500'}`}
        />
        <StatChip label={t('dashboard.occupancy.stats.occupied')} value={occupied} icon={FiBookmark} iconBg={`${colors?.occupied?.seg || 'bg-purple-500'}`} accent={`${colors?.accents?.purple?.text || 'text-purple-700'}`} containerCls={`${colors?.neutral?.inactiveChipBg || 'bg-gray-50'} ${(colors?.neutral?.border || 'ring-gray-200').replace('ring-', 'border-')} hover:translate-y-[-1px]`} mutedTextCls={`${colors?.neutral?.muted || 'text-gray-500'}`} />
        <StatChip label={t('dashboard.occupancy.stats.reserved')} value={reserved} icon={FiBookmark} iconBg={`${colors?.reserved?.seg || 'bg-amber-500'}`} accent={`${colors?.accents?.amber?.text || 'text-amber-700'}`} containerCls={`${colors?.neutral?.inactiveChipBg || 'bg-gray-50'} ${(colors?.neutral?.border || 'ring-gray-200').replace('ring-', 'border-')} hover:translate-y-[-1px]`} mutedTextCls={`${colors?.neutral?.muted || 'text-gray-500'}`} />
        <StatChip label={t('dashboard.occupancy.stats.maintenance')} value={maintenance} icon={FiTool} iconBg={`${colors?.maintenance?.seg || 'bg-rose-300'}`} accent={`${colors?.accents?.rose?.text || 'text-rose-700'}`} containerCls={`${colors?.neutral?.inactiveChipBg || 'bg-gray-50'} ${(colors?.neutral?.border || 'ring-gray-200').replace('ring-', 'border-')} hover:translate-y-[-1px]`} mutedTextCls={`${colors?.neutral?.muted || 'text-gray-500'}`} />
        <StatChip label={t('dashboard.occupancy.stats.occupied_pct')}
          value={`${occPct.toFixed(1)}% (${t('dashboard.occupancy.beds_with_count', { count: occupied })})`}
          icon={FiBookmark} iconBg={`${colors?.occupied?.seg || 'bg-purple-500'}`} accent={`${colors?.accents?.purple?.text || 'text-purple-700'}`} containerCls={`${colors?.neutral?.inactiveChipBg || 'bg-gray-50'} ${(colors?.neutral?.border || 'ring-gray-200').replace('ring-', 'border-')} hover:translate-y-[-1px]`} mutedTextCls={`${colors?.neutral?.muted || 'text-gray-500'}`} />
        <StatChip label={t('dashboard.occupancy.stats.available_pct')}
          value={`${freePct.toFixed(1)}% (${t('dashboard.occupancy.beds_with_count', { count: available })})`}
          icon={FiBookmark} iconBg={`${colors?.available?.seg || 'bg-emerald-500'}`} accent={`${colors?.accents?.emerald?.text || 'text-emerald-700'}`} containerCls={`${colors?.neutral?.inactiveChipBg || 'bg-gray-50'} ${(colors?.neutral?.border || 'ring-gray-200').replace('ring-', 'border-')} hover:translate-y-[-1px]`} mutedTextCls={`${colors?.neutral?.muted || 'text-gray-500'}`} />
      </div>
    </Card>
  )
}

export default OccupancyCard