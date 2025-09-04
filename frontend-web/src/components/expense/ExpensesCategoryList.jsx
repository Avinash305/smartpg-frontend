import React, { useEffect, useMemo, useState } from 'react';
import { Button, PermissionButton } from '../ui/Button';
import Modal from '../ui/Modal';
import { listExpenseCategories, deleteExpenseCategory } from '../../services/expenses';
import ExpensesCategoryForm from './ExpensesCategoryForm';
import { SortableTable } from '../ui/SortableTable';
import Pagination from '../ui/Paginations';
import { useToast } from '../../context/ToastContext';

const ExpensesCategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'active' | 'inactive' | 'all'
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [editingCategory, setEditingCategory] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  // Track whether backend returns paginated results
  const [serverPaginated, setServerPaginated] = useState(false);

  const { addToast } = useToast();

  async function fetchCategories() {
    setLoading(true);
    setError('');
    try {
      const params = { page_size: pageSize, page };
      if (filter === 'active') params.is_active = true;
      else if (filter === 'inactive') params.is_active = false;
      const data = await listExpenseCategories(params);
      const isArray = Array.isArray(data);
      const list = isArray ? data : (data?.results || []);
      const count = isArray ? list.length : (Number(data?.count) || list.length);
      setCategories(list);
      setTotal(count);
      setServerPaginated(!isArray);
    } catch (e) {
      console.error('Failed to load categories', e);
      const data = e?.response?.data;
      const msg = (data && (data.detail || (Array.isArray(data?.non_field_errors) && data.non_field_errors.join(' ')))) || 'Failed to load categories';
      setError(String(msg));
      addToast({ type: 'error', message: String(msg) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page, pageSize]);

  const handleSort = (field, direction) => {
    setSortBy(field);
    setOrder(direction);
  };

  const sortedCategories = useMemo(() => {
    const data = [...categories];
    if (!sortBy) return data;
    data.sort((a, b) => {
      const dir = order === 'asc' ? 1 : -1;
      let av, bv;
      switch (sortBy) {
        case 'status':
          av = a.is_active ? 'Active' : 'Inactive';
          bv = b.is_active ? 'Active' : 'Inactive';
          break;
        case 'name':
        default:
          av = String(a.name || '');
          bv = String(b.name || '');
          break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return data;
  }, [categories, sortBy, order]);

  // Helper: upsert updated category locally (by id if present, else by name)
  const upsertCategory = (updated) => {
    if (!updated) return;
    const matchesFilter = (
      filter === 'all' ? true : (filter === 'active' ? Boolean(updated.is_active) : !Boolean(updated.is_active))
    );
    setCategories((prev) => {
      const key = updated.id ?? updated.name;
      let found = false;
      const next = prev
        .map((c) => {
          const cKey = c.id ?? c.name;
          if (cKey === key) {
            found = true;
            return { ...c, ...updated };
          }
          return c;
        })
        .filter((c) => {
          // After update, if it no longer matches current filter, hide it
          if ((c.id ?? c.name) === key) {
            return matchesFilter;
          }
          return true;
        });
      if (!found) {
        // New or just created: include only if it matches current filter
        return matchesFilter ? [updated, ...prev] : prev;
      }
      return next;
    });
  };

  // Provide a stable key for rows and apply client-side pagination when needed
  const tableData = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const visible = serverPaginated ? sortedCategories : sortedCategories.slice(start, end);
    return visible.map((c) => ({ __key: c.id ?? c.name, ...c }));
  }, [sortedCategories, serverPaginated, page, pageSize]);

  const columns = [
    {
      key: 'name',
      title: 'Name',
      accessor: 'name',
      sortable: true,
    },
    {
      key: 'status',
      title: 'Status',
      accessor: (row) => (row.is_active ? 'Active' : 'Inactive'),
      sortable: true,
      Cell: ({ value }) => (
        value === 'Active' ? (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-green-700">Active</span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-red-700">Inactive</span>
        )
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      accessor: () => null,
      sortable: false,
      Cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-center">
          <PermissionButton
            module="expenses"
            action="edit"
            scopeId="global"
            variant="outline"
            size="sm"
            reason="You don't have permission to edit categories."
            denyMessage="You do not have permission to edit expense categories."
            onClick={() => { setEditingCategory(row); setOpenModal(true); }}
          >
            Edit
          </PermissionButton>
          <PermissionButton
            module="expenses"
            action="delete"
            scopeId="global"
            variant="destructive"
            size="sm"
            reason="You don't have permission to delete categories."
            denyMessage="You do not have permission to delete expense categories."
            onClick={() => { setPendingDeleteId(row.id); setConfirmOpen(true); }}
          >
            Delete
          </PermissionButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-lg font-semibold">Expense Categories</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="category-status-filter" className="sr-only">Filter by status</label>
          <select
            id="category-status-filter"
            name="category-status-filter"
            aria-label="Filter by status"
            className="border rounded-md px-2 py-1 text-sm"
            value={filter}
            onChange={(e) => { setPage(1); setFilter(e.target.value); }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
          <Button variant="outline" onClick={fetchCategories} disabled={loading}>
            Refresh
          </Button>
          <PermissionButton
            module="expenses"
            action="add"
            scopeId="global"
            reason="You don't have permission to add categories."
            denyMessage="You do not have permission to add expense categories."
            onClick={() => setOpenModal(true)}
          >
            Add Category
          </PermissionButton>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      <SortableTable
        columns={columns}
        data={tableData}
        sortBy={sortBy}
        order={order}
        onSort={handleSort}
        loading={loading}
        rowKey="__key"
        noDataText="No categories found"
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalItems={total}
        itemsPerPage={pageSize}
        onPageChange={(p) => setPage(p)}
        onItemsPerPageChange={(n) => { setPage(1); setPageSize(n); }}
      />

      <Modal
        isOpen={openModal}
        onClose={() => { setOpenModal(false); setEditingCategory(null); }}
        title={editingCategory?.id ? 'Edit Expense Category' : 'Add Expense Category'}
        maxWidth="sm"
      >
        <ExpensesCategoryForm
          category={editingCategory}
          onCancel={() => { setOpenModal(false); setEditingCategory(null); }}
          onSuccess={async (res) => {
            // Optimistically update immediately, then refresh from server
            upsertCategory(res);
            setOpenModal(false);
            setEditingCategory(null);
            await fetchCategories();
          }}
        />
      </Modal>

      <Modal
        isOpen={confirmOpen}
        onClose={() => { if (!confirmLoading) { setConfirmOpen(false); setPendingDeleteId(null); } }}
        title="Confirm Delete"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">Are you sure you want to delete this category?</p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => { if (!confirmLoading) { setConfirmOpen(false); setPendingDeleteId(null); } }} disabled={confirmLoading}>Cancel</Button>
            <PermissionButton
              module="expenses"
              action="delete"
              scopeId="global"
              variant="destructive"
              denyMessage="You do not have permission to delete expense categories."
              onClick={async () => {
                if (!pendingDeleteId) return;
                setConfirmLoading(true);
                // Optimistic removal
                setCategories((prev) => prev.filter((c) => c.id !== pendingDeleteId));
                try {
                  await deleteExpenseCategory(pendingDeleteId);
                  // Success toast
                  addToast({ type: 'success', message: 'Category deleted' });
                  setConfirmOpen(false);
                  setPendingDeleteId(null);
                  // Adjust page if this deletion empties the current page
                  const newTotal = Math.max(0, total - 1);
                  const maxPage = Math.max(1, Math.ceil(newTotal / pageSize));
                  if (page > maxPage) {
                    setPage(maxPage);
                  } else {
                    await fetchCategories();
                  }
                } catch (e) {
                  console.error('Failed to delete category', e);
                  const data = e?.response?.data;
                  const msg = (data && (data.detail || (Array.isArray(data.non_field_errors) && data.non_field_errors.join(' ')))) || 'Failed to delete category';
                  addToast({ type: 'error', message: String(msg) });
                  // Re-sync list in case optimistic update was wrong
                  await fetchCategories();
                } finally {
                  setConfirmLoading(false);
                }
              }}
            >
              Delete
            </PermissionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpensesCategoryList;