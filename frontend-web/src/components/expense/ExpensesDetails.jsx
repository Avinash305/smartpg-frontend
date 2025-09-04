import React from 'react';
import { formatDateOnly, formatDateTime, formatCurrency } from '../../utils/dateUtils';

/**
 * ExpensesDetails
 * Props:
 * - expense: object | null
 * - loading: boolean
 * - error: string
 * - getBuildingName?: (expense) => string
 * - onClose?: () => void
 */
const ExpensesDetails = ({ expense, loading, error, getBuildingName, onClose }) => {
  if (loading) return <div className="py-6 text-sm text-gray-600">Loading...</div>;
  if (error) return <div className="py-6 text-sm text-red-600">{error}</div>;
  if (!expense) return <div className="py-6 text-sm text-gray-600">No data</div>;

  const buildingDisplay = typeof getBuildingName === 'function'
    ? getBuildingName(expense)
    : (typeof expense?.building === 'object' && expense?.building?.name)
      ? expense.building.name
      : (typeof expense?.building === 'number')
        ? `Building #${expense.building}`
        : (expense?.building || '');

  const categoryDisplay = (typeof expense?.category === 'object' && expense?.category?.name)
    ? expense.category.name
    : expense?.category;

  const hasAny = (v) => v !== undefined && v !== null && String(v).trim() !== '';
  const attachments = Array.isArray(expense.attachment)
    ? expense.attachment
    : hasAny(expense.attachment)
      ? [expense.attachment]
      : [];

  const renderUser = (u) => {
    if (!u) return '';
    if (typeof u === 'string' || typeof u === 'number') return String(u).trim();
    const name = (u.name || u.full_name || '').toString().trim();
    const email = (u.email || '').toString().trim();
    if (name) return name;
    if (email) return email.split('@')[0] || email;
    const fallback = (u.username || u.id || '').toString().trim();
    return fallback;
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Primary fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-gray-500">ID</div>
          <div className="font-medium">{expense.id}</div>
        </div>
        <div>
          <div className="text-gray-500">Date</div>
          <div className="font-medium">{formatDateOnly(expense.expense_date)}</div>
        </div>
        <div>
          <div className="text-gray-500">Category</div>
          <div className="font-medium capitalize">{categoryDisplay}</div>
        </div>
        <div>
          <div className="text-gray-500">Amount</div>
          <div className="font-medium">{formatCurrency(expense.amount)}</div>
        </div>
        <div>
          <div className="text-gray-500">Building</div>
          <div className="font-medium">{buildingDisplay}</div>
        </div>
        <div>
          <div className="text-gray-500">Reference</div>
          <div className="font-medium">{expense.reference || '-'}</div>
        </div>
      </div>

      {/* Secondary details (render only if present) */}
      <div className="grid grid-cols-2 gap-3">
        {hasAny(expense.payment_method) && (
          <div>
            <div className="text-gray-500">Payment Method</div>
            <div className="font-medium capitalize">{expense.payment_method}</div>
          </div>
        )}
        {hasAny(expense.paid_to) && (
          <div>
            <div className="text-gray-500">Paid To</div>
            <div className="font-medium">{expense.paid_to}</div>
          </div>
        )}
        {hasAny(expense.vendor) && (
          <div>
            <div className="text-gray-500">Vendor</div>
            <div className="font-medium">{expense.vendor}</div>
          </div>
        )}
        {hasAny(expense.invoice_number) && (
          <div>
            <div className="text-gray-500">Invoice #</div>
            <div className="font-medium">{expense.invoice_number}</div>
          </div>
        )}
        {hasAny(expense.invoice_date) && (
          <div>
            <div className="text-gray-500">Invoice Date</div>
            <div className="font-medium">{formatDateOnly(expense.invoice_date)}</div>
          </div>
        )}
        {hasAny(expense.tax_amount) && (
          <div>
            <div className="text-gray-500">Tax</div>
            <div className="font-medium">{formatCurrency(expense.tax_amount)}</div>
          </div>
        )}
        {hasAny(expense.total_amount) && (
          <div>
            <div className="text-gray-500">Total</div>
            <div className="font-medium">{formatCurrency(expense.total_amount)}</div>
          </div>
        )}
        {hasAny(expense.status) && (
          <div>
            <div className="text-gray-500">Status</div>
            <div className="font-medium capitalize">{expense.status}</div>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <div className="text-gray-500">Description</div>
        <div className="font-medium whitespace-pre-wrap">{expense.description || '-'}</div>
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div>
          <div className="text-gray-500">Attachment{attachments.length > 1 ? 's' : ''}</div>
          <ul className="list-disc ml-5 space-y-1">
            {attachments.map((url, idx) => (
              <li key={idx}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline underline-offset-4"
                >
                  View attachment {attachments.length > 1 ? idx + 1 : ''}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata */}
      {(hasAny(expense.created_at) || hasAny(expense.updated_at) || hasAny(expense.created_by) || hasAny(expense.updated_by)) && (
        <div className="grid grid-cols-2 gap-3">
          {hasAny(expense.created_at) && (
            <div>
              <div className="text-gray-500">Created At</div>
              <div className="font-medium">{formatDateTime(expense.created_at)}</div>
            </div>
          )}
          {hasAny(expense.created_by) && (
            <div>
              <div className="text-gray-500">Created By</div>
              <div className="font-medium">{renderUser(expense.created_by)}</div>
            </div>
          )}
          {hasAny(expense.updated_at) && (
            <div>
              <div className="text-gray-500">Updated At</div>
              <div className="font-medium">{formatDateTime(expense.updated_at)}</div>
            </div>
          )}
          {hasAny(expense.updated_by) && (
            <div>
              <div className="text-gray-500">Updated By</div>
              <div className="font-medium">{renderUser(expense.updated_by)}</div>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {Array.isArray(expense.tags) && expense.tags.length > 0 && (
        <div>
          <div className="text-gray-500">Tags</div>
          <div className="flex flex-wrap gap-1">
            {expense.tags.map((t, i) => (
              <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 border">{t}</span>
            ))}
          </div>
        </div>
      )}

      {onClose && (
        <div className="flex justify-end pt-2">
          <button className="px-3 py-1.5 border rounded-md" onClick={onClose}>Close</button>
        </div>
      )}
    </div>
  );
};

export default ExpensesDetails;