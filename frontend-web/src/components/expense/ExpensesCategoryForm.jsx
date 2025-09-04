import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { createExpenseCategory, updateExpenseCategory } from '../../services/expenses';
import { useToast } from '../../context/ToastContext';

const ExpensesCategoryForm = ({ onSuccess, onCancel, category }) => {
  const [name, setName] = useState(category?.name || '');
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    setName(category?.name || '');
    setIsActive(category?.is_active ?? true);
  }, [category?.id]);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    setError('');
    if (!name.trim()) {
      setError('Category name is required');
      addToast({ type: 'error', message: 'Category name is required' });
      return;
    }
    setLoading(true);
    try {
      let res;
      if (category?.id) {
        res = await updateExpenseCategory(category.id, { name: name.trim(), is_active: Boolean(isActive) });
      } else {
        res = await createExpenseCategory({ name: name.trim(), is_active: Boolean(isActive) });
      }
      addToast({ type: 'success', message: category?.id ? 'Category updated' : 'Category created' });
      onSuccess?.(res);
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        // Show name-specific or general error
        const msg = data.name?.join?.(' ') || data.non_field_errors?.join?.(' ') || data.detail || (category?.id ? 'Failed to update category' : 'Failed to create category');
        setError(String(msg));
        addToast({ type: 'error', message: String(msg) });
      } else {
        const fallback = category?.id ? 'Failed to update category' : 'Failed to create category';
        setError(fallback);
        addToast({ type: 'error', message: fallback });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <Input
        id="category_name"
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Maintenance"
        required
        error={error}
      />
      <div className="flex items-center gap-2">
        <input
          id="category_active"
          type="checkbox"
          className="h-4 w-4"
          checked={!!isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <label htmlFor="category_active" className="text-sm select-none">
          Active
        </label>
      </div>
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {category?.id ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
};

export default ExpensesCategoryForm;