import React, { useEffect, useMemo, useState } from 'react'
import { getBeds } from '../../services/properties'
import { Button } from '../ui/Button'
import { SortableTable } from '../ui/SortableTable'
import Card from '../ui/Card'
import LoadingSpinner from '../ui/LoadingSpinner'
import BedActions from './BedActions'
import { Link } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from '../../theme/colorSchemes.js'
import { FiGrid, FiList } from 'react-icons/fi'
import { formatCurrency } from '../../utils/dateUtils'

const BedsList = ({ roomId = null, refreshToken = 0, reloadKey = 0, onEdit = () => {}, onChanged = () => {}, buildingInactive = false }) => {
  const [beds, setBeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('number')
  const [order, setOrder] = useState('asc')
  const { t } = useTranslation()
  const tr = (k, f, opt) => t(k, { defaultValue: f, ...(opt || {}) })
  const scheme = useColorScheme('default')
  const getDefaultView = () => 'cards'
  const [view, setView] = useState(getDefaultView)
  const { addToast } = useToast()

  const load = () => {
    setLoading(true)
    setError('')
    const params = { page_size: 1000 }
    if (roomId) params.room = roomId
    getBeds(params)
      .then((data) => {
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
        setBeds(arr)
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || err.message || tr('beds.errors.load_failed', 'Failed to load beds')
        setError(msg)
        addToast({ message: msg, type: 'error' })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [roomId, refreshToken, reloadKey])

  const onSort = (field, direction) => {
    setSortBy(field)
    setOrder(direction)
  }

  const sortedData = useMemo(() => {
    const data = [...beds]
    const dir = order === 'asc' ? 1 : -1
    return data.sort((a, b) => {
      let v1 = a[sortBy]
      let v2 = b[sortBy]
      if (sortBy === 'monthly_rent') {
        v1 = Number(v1)
        v2 = Number(v2)
      }
      if (v1 == null && v2 == null) return 0
      if (v1 == null) return -1 * dir
      if (v2 == null) return 1 * dir
      if (typeof v1 === 'string' && typeof v2 === 'string') return v1.localeCompare(v2) * dir
      if (v1 > v2) return 1 * dir
      if (v1 < v2) return -1 * dir
      return 0
    })
  }, [beds, sortBy, order])

  const columns = [
    { key: 'number', title: tr('beds.columns.number', 'Bed #'), accessor: (row) => (
      row?.id ? (
        <Link to={`/beds/${row.id}`} className={`${scheme.accents?.sky?.text}`} onClick={(e) => e.stopPropagation()}>
          {row.number ?? tr('common.na', '-')}
        </Link>
      ) : (row.number ?? tr('common.na', '-'))
    ), sortable: true },
    { key: 'status', title: tr('beds.columns.status', 'Status'), accessor: (row) => {
      const s = (row.status || '').toLowerCase()
      if (!s) return tr('common.na', '-')
      if (s === 'available') return tr('beds.available','Available')
      if (s === 'occupied') return tr('beds.occupied','Occupied')
      if (s === 'reserved') return tr('beds.reserved','Reserved')
      if (s === 'maintenance') return tr('beds.maintenance','Maintenance')
      return tr(`beds.status.${s}`, s.replace(/_/g, ' '))
    }, sortable: true },
    { key: 'monthly_rent', title: tr('beds.columns.rent', 'Rent'), accessor: (row) => formatCurrency(row.monthly_rent), sortable: true },
    { key: 'actions', title: tr('common.actions', 'Actions'), accessor: (row) => (
      <div className="flex items-center gap-2">
        <BedActions bed={row} onEdit={onEdit} onChanged={() => { load(); onChanged(); }} buildingInactive={buildingInactive} />
      </div>
    ), sortable: false, headerClassName: 'text-right' },
  ]

  if (loading) return (
    <div className="p-6 flex items-center justify-center">
      <LoadingSpinner label={tr('beds.loading', 'Loading beds...')} />
    </div>
  )
  if (error) return <div className={`p-4 ${scheme.accents?.rose?.text}`}>{error}</div>

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant={view === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('list')}
          className="flex items-center gap-2"
        >
          <FiList />
          <span className="capitalize">{tr('common.list', 'List')}</span>
        </Button>
        <Button
          variant={view === 'cards' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('cards')}
          className="flex items-center gap-2"
        >
          <FiGrid />
          <span className="capitalize">{tr('common.cards', 'Cards')}</span>
        </Button>
      </div>

      {view === 'list' ? (
        <SortableTable
          columns={columns}
          data={sortedData}
          sortBy={sortBy}
          order={order}
          onSort={onSort}
          loading={loading}
          rowKey="id"
          noDataText={roomId ? tr('beds.no_beds_for_room', 'No beds found for this room') : tr('beds.no_beds', 'No beds found')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:gap-5">
          {sortedData.length === 0 ? (
            <div className={`col-span-full text-center ${scheme.neutral?.emptyText} py-8`}>
              {roomId ? tr('beds.no_beds_for_room', 'No beds found for this room') : tr('beds.no_beds', 'No beds found')}
            </div>
          ) : (
            sortedData.map((b) => (
              <Card
                key={b.id}
                className={"overflow-visible rounded-xl transition-transform hover:-translate-y-1 hover:shadow-xl ring-1 " + scheme.neutral?.cardRing + " hover:" + scheme.neutral?.cardRingHover}
                title={b?.id ? (
                  <Link to={`/beds/${b.id}`} className={`${scheme.accents?.sky?.text}`} onClick={(e) => e.stopPropagation()}>
                    {b.number ? tr('beds.bed_with_number', 'Bed {{n}}', { n: b.number }) : tr('beds.bed', 'Bed')}
                  </Link>
                ) : (b.number ? tr('beds.bed_with_number', 'Bed {{n}}', { n: b.number }) : tr('beds.bed', 'Bed'))}
                description={''}
                padding="xs"
                actions={<div className="flex items-center gap-2"><BedActions bed={b} onEdit={onEdit} onChanged={() => { load(); onChanged(); }} buildingInactive={buildingInactive} /></div>}
              >
                <div className={`text-xs sm:text-sm ${scheme.neutral?.text} grid grid-cols-2 gap-x-2.5 gap-y-0.5`}>
                  <div><span className={`${scheme.neutral?.muted}`}>{tr('beds.rent', 'Rent')}:</span> {formatCurrency(b.monthly_rent)}</div>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className={`${scheme.neutral?.muted}`}>{tr('beds.status', 'Status')}:</span>
                    {(() => {
                      const s = (b.status || '').toLowerCase()
                      if (s === 'available') return (
                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium border ${scheme.available?.badge}`}>{tr('beds.available','Available')}</span>
                      )
                      if (s === 'occupied') return (
                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium border ${scheme.occupied?.badge}`}>{tr('beds.occupied','Occupied')}</span>
                      )
                      if (s === 'reserved') return (
                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium border ${scheme.reserved?.badge}`}>{tr('beds.reserved','Reserved')}</span>
                      )
                      if (s === 'maintenance') return (
                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium border ${scheme.maintenance?.badge}`}>{tr('beds.maintenance','Maintenance')}</span>
                      )
                      return <span>{tr('common.na', '-')}</span>
                    })()}
                  </div>
                </div>
                <div className={`mt-2 pt-2 border-t ${scheme.neutral?.divider} flex items-center justify-end gap-2`}>
                  {b?.id && (
                    <Link
                      to={`/beds/${b.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-sm ${scheme.accents?.sky?.text} p-2 capitalize font-semibold transition-transform duration-150 hover:scale-[1.10]`}
                    >
                      {tr('beds.view_details', 'View details')}
                    </Link>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default BedsList