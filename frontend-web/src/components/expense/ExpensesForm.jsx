import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '../ui/Input';
import Select from '../ui/Select';
import { DatePicker } from '../ui/DatePicker';
import { Button, PermissionButton } from '../ui/Button';
import { listExpenseCategories, createExpense, getExpense, updateExpense } from '../../services/expenses';
import { getBuildings } from '../../services/properties';
import SearchableSelect from '../ui/SearchableSelect';
import Modal from '../ui/Modal';
import ExpensesCategoryForm from './ExpensesCategoryForm';
import { FiPlus } from 'react-icons/fi';
import { useCan } from '../../context/AuthContext';

/**
 * ExpensesForm
 * Props:
 * - expenseId?: number | string  => when provided, loads expense and updates on submit
 * - initialData?: object         => optional initial values for create/edit
 * - onSuccess?: function(data)   => called with API response on success
 * - onCancel?: function()        => called when cancel is clicked
 */
const ExpensesForm = ({ expenseId, initialData, onSuccess, onCancel }) => {
  const isEdit = !!expenseId || !!initialData?.id;

  // Form state
  const [values, setValues] = useState({
    amount: '',
    category: '',
    expense_date: new Date(),
    description: '',
    reference: '',
    building: '',
    attachment: null,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingExpense, setLoadingExpense] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);

  const { can } = useCan();

  // Load buildings for select
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getBuildings({ page_size: 1000 });
        const list = Array.isArray(data) ? data : (data?.results || []);
        // Filter by permission - only include buildings the user can view
        const permitted = list.filter((b) => b && b.id != null && can('buildings', 'view', b.id));
        if (!cancelled) setBuildings(permitted);
        // If current selection is not permitted anymore, clear it
        if (!cancelled) {
          const allowedIds = new Set(permitted.map((b) => Number(b.id)));
          if (values.building && !allowedIds.has(Number(values.building))) {
            setValues((prev) => ({ ...prev, building: '' }));
          }
        }
      } catch (e) {
        console.error('Failed to load buildings', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load categories (dynamic)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCategories(true);
      try {
        const data = await listExpenseCategories({ active: true, page_size: 1000 });
        const list = Array.isArray(data) ? data : (data?.results || []);
        if (!cancelled) setCategories(list);
      } catch (e) {
        console.error('Failed to load expense categories', e);
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load existing expense if expenseId provided
  useEffect(() => {
    if (!expenseId) return;
    let cancelled = false;
    (async () => {
      setLoadingExpense(true);
      try {
        const data = await getExpense(expenseId);
        if (cancelled) return;
        setValues({
          amount: data.amount ?? '',
          category: data.category ?? '',
          expense_date: data.expense_date ? new Date(data.expense_date) : new Date(),
          description: data.description ?? '',
          reference: data.reference ?? '',
          building: data.building ?? '',
          attachment: null, // can't prefill file input
        });
      } catch (e) {
        console.error('Failed to load expense', e);
      } finally {
        if (!cancelled) setLoadingExpense(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expenseId]);

  // Apply initialData on mount for create mode or when provided
  useEffect(() => {
    if (!initialData) return;
    setValues((prev) => ({
      ...prev,
      amount: initialData.amount ?? prev.amount,
      category: initialData.category ?? prev.category,
      expense_date: initialData.expense_date ? new Date(initialData.expense_date) : prev.expense_date,
      description: initialData.description ?? prev.description,
      reference: initialData.reference ?? prev.reference,
      building: initialData.building ?? prev.building,
    }));
  }, [initialData]);

  const categoryOptions = useMemo(() => {
    const opts = (categories || []).map((c) => ({ value: c.name, label: c.name }));
    // Ensure 'Other' appears even if not active
    if (!opts.find((o) => String(o.value).toLowerCase() === 'other')) {
      opts.push({ value: 'Other', label: 'Other' });
    }
    return opts;
  }, [categories]);

  const buildingOptions = useMemo(() => {
    return (buildings || []).map((b) => ({ value: b.id, label: b.name || `Building #${b.id}` }));
  }, [buildings]);

  function setField(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function validate() {
    const e = {};
    if (!values.amount || Number(values.amount) <= 0) e.amount = 'Amount must be greater than 0';
    if (!values.category) e.category = 'Category is required';
    if (!values.building) e.building = 'Building is required';
    if (!values.expense_date) e.expense_date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function toPayload() {
    // Backend expects: amount (decimal), category, expense_date (YYYY-MM-DD), description, reference, building (id), attachment
    const d = values.expense_date instanceof Date ? values.expense_date : null;
    const ymd = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : undefined;
    return {
      amount: values.amount,
      category: values.category,
      expense_date: ymd,
      description: values.description,
      reference: values.reference,
      building: values.building,
      attachment: values.attachment || undefined,
    };
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = toPayload();
      let res;
      if (isEdit) {
        const id = expenseId || initialData.id;
        res = await updateExpense(id, payload, { method: 'patch' });
      } else {
        res = await createExpense(payload);
      }
      onSuccess?.(res);
    } catch (err) {
      // Try to map DRF errors if present
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        const mapped = {};
        for (const [k, v] of Object.entries(data)) {
          mapped[k] = Array.isArray(v) ? v.join(' ') : String(v);
        }
        setErrors(mapped);
      }
      console.error('Failed to submit expense', err);
    } finally {
      setLoading(false);
    }
  }

  async function reloadCategoriesAndSelect(name) {
    try {
      setLoadingCategories(true);
      const data = await listExpenseCategories({ active: true, page_size: 1000 });
      const list = Array.isArray(data) ? data : (data?.results || []);
      setCategories(list);
      if (name) setField('category', name);
    } catch (e) {
      console.error('Failed to refresh categories', e);
    } finally {
      setLoadingCategories(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1" htmlFor="building">
              Building <span className="text-red-500">*</span>
            </label>
            <Select
              value={values.building}
              onChange={(e) => setField('building', e.target.value)}
              options={buildingOptions}
              placeholder="Select building"
              disabled={loading || loadingExpense}
              required
              error={errors.building}
            />
          </div>
          <div className="w-full">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700" htmlFor="category">
                Category <span className="text-red-500">*</span>
              </label>
              <PermissionButton
                type="button"
                module="expenses"
                action="add"
                scopeId="global"
                loading={loadingCategories}
                reason="You don't have permission to add expense categories."
                denyMessage="Permission denied: cannot add expense categories."
              >
                <FiPlus className="h-4 w-4" /> Add
              </PermissionButton>
            </div>
            <SearchableSelect
              id="category"
              name="category"
              options={categoryOptions}
              value={values.category}
              onChange={(opt) => setField('category', opt?.value || '')}
              placeholder="Search or select category"
              loading={loadingCategories}
              className="w-full"
            />
            {errors.category && (
              <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.category}</p>
            )}
          </div>
          <div className="col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1" htmlFor="amount">
                  Amount (₹) <span className="text-red-500">*</span>
              </label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={values.amount}
              placeholder="0.00"
              onChange={(e) => setField('amount', e.target.value)}
              error={errors.amount}
              disabled={loading || loadingExpense}
              required
            />
          </div>
          
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1" htmlFor="expense_date">
              Expense Date <span className="text-red-500">*</span>
          </label>
        <DatePicker
            selected={values.expense_date}
            onChange={(d) => setField('expense_date', d)}
            id="expense_date"
            name="expense_date"
            error={errors.expense_date}
            disabled={loading || loadingExpense}
            required
          />
        </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Reference"
            id="reference"
            value={values.reference}
            placeholder="Receipt/Bill reference (optional)"
            onChange={(e) => setField('reference', e.target.value)}
            disabled={loading || loadingExpense}
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1" htmlFor="description">Description</label>
          <textarea
            id="description"
            className="block w-full rounded-md border border-gray-300 p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={values.description}
            placeholder="Describe the expense (optional)"
            onChange={(e) => setField('description', e.target.value)}
            disabled={loading || loadingExpense}
          />
          {errors.description && (
            <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <PermissionButton
            type="submit"
            module="expenses"
            action={isEdit ? 'edit' : 'add'}
            scopeId={values.building || 'global'}
            loading={loading}
            reason={isEdit ? "You don't have permission to update expenses for this building." : "You don't have permission to create expenses."}
            denyMessage={isEdit ? 'Permission denied: cannot update expenses for this building.' : 'Permission denied: cannot create expenses.'}
          >
            {isEdit ? 'Update Expense' : 'Create Expense'}
          </PermissionButton>
        </div>
      </form>
      {/* Add Category Modal */}
      <Modal
        isOpen={openCategoryModal}
        onClose={() => setOpenCategoryModal(false)}
        title="Add Expense Category"
        maxWidth="sm"
      >
        <ExpensesCategoryForm
          onCancel={() => setOpenCategoryModal(false)}
          onSuccess={async (cat) => {
            setOpenCategoryModal(false);
            await reloadCategoriesAndSelect(cat?.name);
          }}
        />
      </Modal>
    </>
  );
};

export default ExpensesForm;