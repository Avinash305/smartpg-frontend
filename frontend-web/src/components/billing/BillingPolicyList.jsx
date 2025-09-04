import React from 'react'
import { listBillingPolicies } from '../../services/tenants'
import { PermissionButton, Button } from '../ui/Button'
import { SortableTable } from '../ui/SortableTable'
import Pagination from '../ui/Paginations'
import Modal from '../ui/Modal'
import BillingPolicyForm from './BillingPolicyForm'
import SearchInput from '../ui/SearchInput'

const humanLabel = (v) => String(v || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const dueTypeLabel = (t) => (t === 'anniversary' ? 'Check-in Date' : (t === 'fixed_dom' ? 'Fixed day of month' : humanLabel(t)))

const BillingPolicyList = ({ buildings, className = '' }) => {
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [sortBy, setSortBy] = React.useState('created_at')
  const [order, setOrder] = React.useState('desc')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

  const [showForm, setShowForm] = React.useState(false)
  const [editing, setEditing] = React.useState(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const buildingsKey = React.useMemo(() => (
    Array.isArray(buildings) && buildings.length > 0 ? buildings.join(',') : ''
  ), [buildings])

  const params = React.useMemo(() => {
    const p = { page_size: 200 }
    if (Array.isArray(buildings) && buildings.length > 0) p['building__in'] = buildings.join(',')
    return p
  }, [buildingsKey])

  React.useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        setLoading(true)
        setError('')
        const list = await listBillingPolicies(params)
        if (!alive) return
        setItems(Array.isArray(list) ? list : [])
      } catch (e) {
        if (!alive) return
        setError(e?.response?.data?.detail || 'Failed to load billing policies')
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [params, refreshKey])

  const columns = React.useMemo(() => ([
    { key: 'id', Header: 'ID', accessor: (row) => row.id, sortable: true },
    { key: 'scope', Header: 'Scope', accessor: (row) => humanLabel(row.scope), sortable: true },
    { key: 'target', Header: 'Target', accessor: (row) => {
      if (row.scope === 'building') return row.building_name || row.building?.name || `#${row.building}`
      if (row.scope === 'tenant') return row.tenant_name || row.tenant?.full_name || `#${row.tenant}`
      return 'Org'
    } },
    { key: 'billing_cycle', Header: 'Cycle', accessor: (row) => humanLabel(row.billing_cycle), sortable: true },
    { key: 'due', Header: 'Due', accessor: (row) => {
      const typ = dueTypeLabel(row.due_day_type)
      if (row.due_day_type === 'fixed_dom') return `${typ}${row.fixed_day != null ? ` ${row.fixed_day}` : ''}`
      if (row.billing_cycle === 'weekly') return `${typ}${row.weekly_weekday != null ? ` (WD ${row.weekly_weekday})` : ''}`
      return typ
    } },
    { key: 'amount', Header: 'Amount', accessor: (row) => {
      if (row.amount_source === 'fixed') return `₹ ${Number(row.fixed_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
      return humanLabel(row.amount_source)
    } },
    { key: 'auto', Header: 'Auto-Invoice', accessor: (row) => (row.auto_generate_invoice ? 'Yes' : 'No'), sortable: true },
    { key: 'actions', Header: '', accessor: (row) => row, Cell: ({ value: row }) => (
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setEditing(row); setShowForm(true) }}
        >Edit</Button>
      </div>
    ) }
  ]), [])

  const filtered = React.useMemo(() => {
    const q = (query || '').toLowerCase().trim()
    if (!q) return items
    return (items || []).filter((it) => {
      const id = String(it.id || '')
      const scope = String(it.scope || '')
      const cycle = String(it.billing_cycle || '')
      const target = it.scope === 'building' ? (it.building_name || it.building?.name || it.building) : (it.scope === 'tenant' ? (it.tenant_name || it.tenant?.full_name || it.tenant) : 'org')
      const hay = [id, scope, cycle, target].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [items, query])

  const sorted = React.useMemo(() => {
    const arr = [...(filtered || [])]
    const dir = order === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      const va = a[sortBy]
      const vb = b[sortBy]
      if (va == null && vb == null) return 0
      if (va == null) return -dir
      if (vb == null) return dir
      const sa = String(va)
      const sb = String(vb)
      return sa.localeCompare(sb) * dir
    })
    return arr
  }, [filtered, sortBy, order])

  const totalItems = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalItems / (pageSize || 1)))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  const paged = sorted.slice(start, end)

  return (
    <div className={className}>
      {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div> : null}

      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm text-gray-600">Billing Policies</div>
        <div className="flex items-center gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search policies..." className="w-full max-w-xs" />
          <PermissionButton
            module="invoices"
            action="add"
            scopeId={Array.isArray(buildings) && buildings.length === 1 ? buildings[0] : 'global'}
            onClick={() => { setEditing(null); setShowForm(true) }}
          >New Policy</PermissionButton>
        </div>
      </div>

      <SortableTable
        columns={columns}
        data={paged}
        sortBy={sortBy}
        order={order}
        onSort={(field, direction) => { setSortBy(field); setOrder(direction) }}
        loading={loading}
        rowKey="id"
        noDataText={loading ? 'Loading policies...' : 'No billing policies found.'}
      />

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={pageSize}
        onPageChange={setPage}
        onItemsPerPageChange={(n) => { setPageSize(n); setPage(1) }}
        itemsPerPageOptions={[5, 10, 25, 50]}
        showGoto={false}
      />

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null) }}
        title={editing?.id ? `Edit Policy #${editing.id}` : 'New Billing Policy'}
        maxWidth="lg"
      >
        <div className="p-2">
          <BillingPolicyForm
            initialValue={editing || undefined}
            onCancel={() => { setShowForm(false); setEditing(null) }}
            onSuccess={() => { setShowForm(false); setEditing(null); setRefreshKey(k => k + 1) }}
          />
        </div>
      </Modal>
    </div>
  )
}

export default BillingPolicyList
