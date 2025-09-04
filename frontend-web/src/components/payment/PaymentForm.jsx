import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { createPayment, updatePayment, deletePayment, PaymentMethods, getInvoices, getInvoice } from '../../services/payments';
import Label from '../ui/Label';
import { Input } from '../ui/Input';
import Select from '../ui/Select';
import { Button, PermissionButton } from '../ui/Button';
import Modal from '../ui/Modal';
import SearchableSelect from '../ui/SearchableSelect';
import { DatePicker } from '../ui/DatePicker';
import { getBuildings } from '../../services/properties';
import { listTenants } from '../../services/tenants';
import { useToast } from '../../context/ToastContext';
import AsyncGuard from '../common/AsyncGuard';
import { useCan } from '../../context/AuthContext';
import { formatCurrency, formatDateOnly } from '../../utils/dateUtils';

const methodOptions = [
  { value: PaymentMethods.CASH, label: 'Cash' },
  { value: PaymentMethods.UPI, label: 'UPI' },
  { value: PaymentMethods.CARD, label: 'Card' },
  { value: PaymentMethods.BANK, label: 'Bank Transfer' },
  { value: PaymentMethods.OTHER, label: 'Other' },
];

// Optional tenantId/bookingId enable self-fetch of invoices to compute tenant due
// New: editPayment (object) enables edit mode
const PaymentForm = ({
  tenantId,
  bookingId,
  invoices = [],
  invoicesLoading = false,
  defaultInvoiceId = '',
  onSuccess,
  onCancel,
  defaultReceivedAtISO,
  readOnlyReceivedAt = false,
  editPayment = null,
  // New: optionally preselect building when creating from an invoice context
  initialBuildingId = '',
  // New: lock selectors (building, tenant, invoice) for read-only context
  lockSelectors = false,
}) => {
  const { addToast } = useToast();
  const { can } = useCan();
  const [fetchedInvoices, setFetchedInvoices] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [form, setForm] = useState({
    invoice: String(defaultInvoiceId || ''),
    amount: '',
    // Method is optional now; default to blank
    method: '',
    reference: '',
    received_at: defaultReceivedAtISO || new Date().toISOString(),
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [amountError, setAmountError] = useState('');
  const [receivedAtDate, setReceivedAtDate] = useState(() => (form.received_at ? new Date(form.received_at) : new Date()));
  const [fieldErrors, setFieldErrors] = useState({ amount: '', received_at: '', reference: '', notes: '', method: '', building: '', tenant: '', invoice: '' });
  const isEdit = !!(editPayment && editPayment.id);
  // Keep original values to compute effective cap when editing
  const [originalAmount, setOriginalAmount] = useState(null);
  const [originalInvoiceId, setOriginalInvoiceId] = useState(null);
  // Hold a fetched default invoice (create mode) to ensure it's selectable
  const [defaultInvoiceObj, setDefaultInvoiceObj] = useState(null);

  // Building and Tenant state
  const [buildingOptions, setBuildingOptions] = useState([]);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [tenantOptions, setTenantOptions] = useState([]);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState('');

  // Add invoicesRefreshTick before useEffects that reference it
  const [invoicesRefreshTick, setInvoicesRefreshTick] = useState(0);

  // Preselect building immediately from prop (do not wait for buildings list)
  useEffect(() => {
    if (initialBuildingId && !selectedBuilding) {
      setSelectedBuilding(String(initialBuildingId));
    }
  }, [initialBuildingId, selectedBuilding]);

  // Permission flags (scoped by selected building when applicable)
  const buildingScope = selectedBuilding || 'global';
  const canViewBuildings = can('buildings', 'view');
  const canViewTenants = can('tenants', 'view', buildingScope);
  const canViewInvoices = can('invoices', 'view', buildingScope);
  const canAddPayment = can('payments', 'add', buildingScope);
  const canEditPayment = can('payments', 'edit', buildingScope);
  const canDeletePayment = can('payments', 'delete', buildingScope);

  // Enablers for step-wise selection
  const tenantDisabled = lockSelectors || (isEdit ? true : !selectedBuilding) || !canViewTenants;
  // In add mode, require tenant selection before enabling invoice selector
  const invoiceDisabled = lockSelectors || (isEdit ? false : !selectedTenant) || !canViewInvoices;

  // Keep Date object in sync when form.received_at changes externally
  useEffect(() => {
    if (!form.received_at) return;
    const d = new Date(form.received_at);
    if (!isNaN(d)) setReceivedAtDate(d);
  }, [form.received_at]);

  // Initialize form when switching to edit mode
  useEffect(() => {
    if (!isEdit) return;
    const p = editPayment || {};
    const inv = typeof p.invoice === 'object' ? p.invoice?.id : p.invoice;
    setForm({
      invoice: inv ? String(inv) : '',
      amount: p.amount != null ? String(p.amount) : '',
      method: p.method || '',
      reference: p.reference || '',
      received_at: p.received_at || new Date().toISOString(),
      notes: p.notes || '',
    });
    setOriginalAmount(Number(p.amount || 0));
    setOriginalInvoiceId(inv ? String(inv) : '');
  }, [isEdit, editPayment]);

  // In edit mode, try to preselect tenant/building from the invoice object if present
  useEffect(() => {
    if (!isEdit) return;
    const invObj = editPayment?.invoice;
    if (invObj && typeof invObj === 'object') {
      try {
        const b = invObj?.booking || invObj?.reservation || invObj?.booking_detail || invObj?.bookingInfo || {};
        const t = b?.tenant || invObj?.tenant || {};
        const tId = t?.id || b?.tenant_id;
        const bObj = b?.building || invObj?.building || {};
        const bId = bObj?.id || b?.building_id || invObj?.building_id;
        if (bId) setSelectedBuilding(String(bId));
        if (tId) setSelectedTenant(String(tId));
      } catch (_) { /* ignore */ }
    }
  }, [isEdit, editPayment]);

  // If defaultReceivedAtISO changes (create mode only), update received_at
  useEffect(() => {
    if (isEdit) return;
    if (!defaultReceivedAtISO) return;
    setForm(prev => ({ ...prev, received_at: defaultReceivedAtISO }));
  }, [defaultReceivedAtISO, isEdit]);

  // In create mode, if defaultInvoiceId is provided, fetch it to derive building/tenant
  // and make sure the invoice exists in the select options.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (isEdit) return;
      if (!defaultInvoiceId) { if (alive) setDefaultInvoiceObj(null); return; }
      try {
        const inv = await getInvoice(defaultInvoiceId);
        if (!alive || !inv) return;
        setDefaultInvoiceObj(inv);
        // Preselect building/tenant if not already selected
        try {
          const b = inv?.booking || inv?.reservation || inv?.booking_detail || inv?.bookingInfo || {};
          const buildingId = (
            (typeof b?.building === 'object' ? b?.building?.id : b?.building) ||
            b?.building_id ||
            (typeof inv?.building === 'object' ? inv?.building?.id : inv?.building) ||
            inv?.building_id
          );
          const tenantIdDerived = (
            (typeof b?.tenant === 'object' ? b?.tenant?.id : b?.tenant) ||
            b?.tenant_id ||
            (typeof inv?.tenant === 'object' ? inv?.tenant?.id : inv?.tenant) ||
            inv?.tenant_id
          );
          if (buildingId && !selectedBuilding) setSelectedBuilding(String(buildingId));
          if (tenantIdDerived && !selectedTenant) setSelectedTenant(String(tenantIdDerived));
        } catch (_) { /* ignore */ }
      } catch (_) {
        if (alive) setDefaultInvoiceObj(null);
      }
    })();
    return () => { alive = false };
  }, [defaultInvoiceId, isEdit]);

  // Load buildings on mount (permission-gated)
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        if (!canViewBuildings) { if (alive) setBuildingOptions([]); return; }
        setBuildingLoading(true);
        const res = await getBuildings({ page_size: 1000 });
        const list = Array.isArray(res) ? res : (res?.results || []);
        if (!alive) return;
        // Only include buildings the user can view (per-building)
        const permitted = list.filter((b) => b && b.id != null && can('buildings', 'view', b.id));
        const opts = permitted.map(b => ({ value: String(b.id), label: b.name || b.title || `#${b.id}` }));
        setBuildingOptions(opts);
        // If current selection is not permitted, clear it
        if (selectedBuilding && !opts.some(o => String(o.value) === String(selectedBuilding))) {
          setSelectedBuilding('');
        }
        // If no selection and an initial building is provided and permitted, preselect it
        if (!selectedBuilding && initialBuildingId) {
          const idStr = String(initialBuildingId);
          if (opts.some(o => String(o.value) === idStr)) {
            setSelectedBuilding(idStr);
          }
        }
      } catch (_) { /* ignore */ }
      finally { if (alive) setBuildingLoading(false); }
    };
    run();
    return () => { alive = false };
  }, [canViewBuildings, initialBuildingId]);

  // Load tenants when building changes (permission-gated)
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        if (!canViewTenants) { if (alive) setTenantOptions([]); return; }
        setTenantLoading(true);
        const params = {};
        const b = selectedBuilding || '';
        if (b) params.building = b;
        params.page_size = 1000;
        const res = await listTenants(params);
        const list = Array.isArray(res) ? res : (res?.results || []);
        if (!alive) return;
        const opts = list.map(t => ({
          value: String(t.id),
          label: t.full_name || t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email || `Tenant #${t.id}`,
          phone: t.phone || t.phone_number || t.mobile || t.mobile_number || '',
        }));
        setTenantOptions(opts);
      } catch (_) { /* ignore */ }
      finally { if (alive) setTenantLoading(false); }
    };
    run();
    return () => { alive = false };
  }, [selectedBuilding, canViewTenants]);

  // If tenantId prop is provided, preselect it to enable invoice select
  useEffect(() => {
    if (tenantId && !selectedTenant) {
      setSelectedTenant(String(tenantId));
    }
  }, [tenantId, selectedTenant]);

  // Stable flag to indicate invoices were passed via props
  const hasInvoicesProp = Array.isArray(invoices) && invoices.length > 0;

  // Self-fetch invoices when not provided (permission-gated)
  useEffect(() => {
    let alive = true;
    const run = async () => {
      const tenantParam = selectedTenant || tenantId;
      const buildingParam = selectedBuilding || undefined;
      // Skip fetching if invoices prop is provided
      if (hasInvoicesProp) return;
      // Skip when not enough identifiers; do not mutate state here to avoid loops
      if (!tenantParam && !bookingId && !buildingParam) return;
      try {
        if (!canViewInvoices) { if (alive) { setFetchedInvoices([]); setFetchError(null); } return; }
        setFetching(true);
        setFetchError(null);
        const params = {};
        if (tenantParam) params.tenant = tenantParam;
        if (bookingId) params.booking = bookingId;
        if (buildingParam) params.building = buildingParam;
        const res = await getInvoices(params);
        const list = Array.isArray(res) ? res : (res?.results || []);
        if (!alive) return;
        setFetchedInvoices(list);
        // If no default invoice is set, default to earliest due with balance
        if (!defaultInvoiceId && !isEdit) {
          const withDue = list
            .filter(inv => Number(inv?.balance_due || 0) > 0)
            .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0));
          if (withDue[0]) {
            setForm(prev => ({ ...prev, invoice: String(withDue[0].id) }));
          }
        }
      } catch (e) {
        if (!alive) return;
        setFetchError(e?.response?.data?.detail || 'Failed to fetch invoices');
      } finally {
        if (alive) setFetching(false);
      }
    };
    run();
    return () => { alive = false };
  }, [tenantId, selectedTenant, selectedBuilding, bookingId, hasInvoicesProp, defaultInvoiceId, isEdit, invoicesRefreshTick, canViewInvoices]);

  // If editing and invoice is only an ID (no nested objects), fetch invoice to derive building/tenant
  useEffect(() => {
    if (!isEdit) return;
    const rawInv = editPayment?.invoice;
    const invId = typeof rawInv === 'object' ? rawInv?.id : rawInv;
    if (!invId) return;
    // If already selected, skip
    if (selectedBuilding && selectedTenant) return;
    let alive = true;
    const run = async () => {
      try {
        const inv = await getInvoice(invId);
        if (!alive || !inv) return;
        const b = inv?.booking || inv?.reservation || inv?.booking_detail || inv?.bookingInfo || {};
        const buildingId = (
          (typeof b?.building === 'object' ? b?.building?.id : b?.building) ||
          b?.building_id ||
          (typeof inv?.building === 'object' ? inv?.building?.id : inv?.building) ||
          inv?.building_id
        );
        const tenantIdDerived = (
          (typeof b?.tenant === 'object' ? b?.tenant?.id : b?.tenant) ||
          b?.tenant_id ||
          (typeof inv?.tenant === 'object' ? inv?.tenant?.id : inv?.tenant) ||
          inv?.tenant_id
        );
        if (buildingId && !selectedBuilding) setSelectedBuilding(String(buildingId));
        if (tenantIdDerived && !selectedTenant) setSelectedTenant(String(tenantIdDerived));
      } catch (_) { /* ignore */ }
    };
    run();
    return () => { alive = false };
  }, [isEdit, editPayment]);

  const invoiceList = (invoices && invoices.length) ? invoices : fetchedInvoices;
  const isInvoicesLoading = invoicesLoading || fetching;

  const selectedInvoice = useMemo(
    () => invoiceList.find(inv => String(inv.id) === String(form.invoice)),
    [form.invoice, invoiceList]
  );

  const balDue = Number(selectedInvoice?.balance_due || 0);
  const invTotal = Number(selectedInvoice?.total_amount || 0);
  const invPaid = Math.max(0, invTotal - balDue);
  const enteredAmount = Number(form.amount || 0);
  const sameInvoiceAsOriginal = isEdit && String(form.invoice || '') === String(originalInvoiceId || '');
  const editHeadroom = isEdit && sameInvoiceAsOriginal ? Number(originalAmount || 0) : 0;
  const effectiveCapDue = Math.max(0, balDue + editHeadroom);
  const remainingAfter = Math.max(0, effectiveCapDue - enteredAmount);

  // Tenant aggregate due
  const tenantDue = useMemo(() => {
    const list = invoiceList || [];
    const totals = list.reduce((a, inv) => {
      const due = Number(inv?.balance_due || 0);
      if (due > 0) {
        a.count += 1;
        a.amount += due;
      }
      return a;
    }, { count: 0, amount: 0 });
    return totals;
  }, [invoiceList]);

  // If selected invoice's balance due changes and current amount exceeds it, soft-cap
  useEffect(() => {
    if (!form.amount) { setAmountError(''); return; }
    const amt = Number(form.amount);
    if (Number.isNaN(amt) || amt <= 0) { setAmountError(''); return; }
    if (effectiveCapDue > 0 && amt > effectiveCapDue) {
      setForm(prev => ({ ...prev, amount: String(effectiveCapDue) }));
      setAmountError('Amount capped to current balance due.');
      setFieldErrors(prev => ({ ...prev, amount: '' }));
    } else {
      setAmountError('');
    }
  }, [effectiveCapDue]);

  // Validators
  const validateAmount = useCallback(() => {
    const amt = Number(form.amount);
    let msg = '';
    if (!form.amount || Number.isNaN(amt) || amt <= 0) msg = 'Enter a valid amount > 0.';
    else if (selectedInvoice && effectiveCapDue > 0 && amt > effectiveCapDue) msg = `Amount cannot exceed balance due (${formatCurrency(effectiveCapDue)}).`;
    setFieldErrors(prev => ({ ...prev, amount: msg }));
    return !msg;
  }, [form.amount, selectedInvoice, effectiveCapDue]);

  const validateReceivedAt = useCallback(() => {
    let msg = '';
    const d = new Date(form.received_at);
    if (!form.received_at || Number.isNaN(d.getTime())) msg = 'Select a valid date/time.';
    setFieldErrors(prev => ({ ...prev, received_at: msg }));
    return !msg;
  }, [form.received_at]);

  const validateReference = useCallback(() => {
    let msg = '';
    if (form.reference && form.reference.length > 120) msg = 'Reference is too long (max 120 characters).';
    setFieldErrors(prev => ({ ...prev, reference: msg }));
    return !msg;
  }, [form.reference]);

  const validateNotes = useCallback(() => {
    let msg = '';
    if (form.notes && form.notes.length > 500) msg = 'Notes are too long (max 500 characters).';
    setFieldErrors(prev => ({ ...prev, notes: msg }));
    return !msg;
  }, [form.notes]);

  const validateMethod = useCallback(() => {
    let msg = '';
    if (!form.method) msg = 'Please select a payment method.';
    setFieldErrors(prev => ({ ...prev, method: msg }));
    return !msg;
  }, [form.method]);

  const validateBuilding = useCallback(() => {
    let msg = '';
    if (!selectedBuilding) msg = 'Building is required.';
    setFieldErrors(prev => ({ ...prev, building: msg }));
    return !msg;
  }, [selectedBuilding]);

  const validateTenant = useCallback(() => {
    let msg = '';
    if (!selectedTenant) msg = 'Tenant is required.';
    setFieldErrors(prev => ({ ...prev, tenant: msg }));
    return !msg;
  }, [selectedTenant]);

  // Invoice is required in Add mode (not required in Edit unless you want it; change condition if needed)
  const validateInvoice = useCallback(() => {
    let msg = '';
    if (!isEdit && !form.invoice) msg = 'Invoice is required.';
    setFieldErrors(prev => ({ ...prev, invoice: msg }));
    return !msg;
  }, [form.invoice, isEdit]);

  const handleAmountBlur = () => {
    const amt = Number(form.amount || 0);
    if (!form.amount || Number.isNaN(amt)) return;
    if (amt <= 0) return;
    if (effectiveCapDue > 0 && amt > effectiveCapDue) {
      setForm(prev => ({ ...prev, amount: String(effectiveCapDue) }));
      setAmountError('Amount capped to current balance due.');
    } else {
      setAmountError('');
    }
    validateAmount();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      // Allow clearing/partial decimals while typing
      if (value === '' || value === '.') {
        setForm(prev => ({ ...prev, amount: value }));
        setAmountError('');
        setFieldErrors(prev => ({ ...prev, amount: '' }));
        return;
      }
      const nextNum = Number(value);
      if (Number.isNaN(nextNum)) {
        setForm(prev => ({ ...prev, amount: value }));
        return;
      }
      if (selectedInvoice && effectiveCapDue > 0 && nextNum > effectiveCapDue) {
        // Hard cap while typing
        setForm(prev => ({ ...prev, amount: String(effectiveCapDue) }));
        setAmountError('Amount cannot exceed current balance due.');
        setFieldErrors(prev => ({ ...prev, amount: '' }));
        return;
      }
      setForm(prev => ({ ...prev, amount: value }));
      setAmountError('');
      setFieldErrors(prev => ({ ...prev, amount: '' }));
      return;
    }
    // Default path for other fields
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'reference') setFieldErrors(prev => ({ ...prev, reference: '' }));
    if (name === 'notes') setFieldErrors(prev => ({ ...prev, notes: '' }));
    if (name === 'method') setFieldErrors(prev => ({ ...prev, method: '' }));
    if (name === 'invoice') setFieldErrors(prev => ({ ...prev, invoice: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const okBuilding = validateBuilding();
    const okTenant = validateTenant();
    const okInvoice = validateInvoice();
    const okAmount = validateAmount();
    const okRef = validateReference();
    const okNotes = validateNotes();
    const okDate = validateReceivedAt();
    const okMethod = validateMethod();
    if (!okBuilding || !okTenant || !okInvoice || !okAmount || !okRef || !okNotes || !okDate || !okMethod) {
      setError('Please fix the highlighted fields.');
      addToast({ message: 'Please fix the highlighted fields.', type: 'error' });
      // Focus the first invalid field in a defined order
      const order = [
        { ok: okBuilding, id: 'building' },
        { ok: okTenant, id: 'tenant' },
        { ok: okInvoice, id: 'invoice' },
        { ok: okAmount, id: 'amount' },
        { ok: okMethod, id: 'method' },
        { ok: okDate, id: 'received_at' },
        { ok: okRef, id: 'reference' },
        { ok: okNotes, id: 'notes' },
      ];
      const firstInvalid = order.find(x => !x.ok);
      if (firstInvalid) {
        const el = document.getElementById(firstInvalid.id);
        if (el && typeof el.focus === 'function') {
          // Scroll into view smoothly, then focus
          try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
          // Delay focus slightly to allow scroll animation/layout
          setTimeout(() => {
            el.focus();
            if (el.select) { try { el.select(); } catch (_) {} }
          }, 120);
        }
      }
      return;
    }

    const amountNum = Number(form.amount);
    const cap = Number(effectiveCapDue || 0);
    if (selectedInvoice && cap && amountNum > cap) {
      // Hard stop: do not allow exceeding due
      setError('Amount cannot exceed current balance due.');
      addToast({ message: 'Amount cannot exceed current balance due.', type: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        await updatePayment(editPayment.id, {
          invoice: form.invoice ? Number(form.invoice) : null,
          amount: amountNum,
          method: form.method,
          reference: form.reference || '',
          received_at: form.received_at,
          notes: form.notes || '',
        });
        setSuccess('Payment updated successfully');
        addToast({ message: 'Payment updated successfully', type: 'success' });
      } else {
        await createPayment({
          invoice: form.invoice ? Number(form.invoice) : null,
          amount: amountNum,
          method: form.method,
          reference: form.reference || '',
          received_at: form.received_at,
          notes: form.notes || '',
        });
        setSuccess('Payment recorded successfully');
        addToast({ message: 'Payment recorded successfully', type: 'success' });
        setForm(prev => ({ ...prev, amount: '', reference: '', notes: '' }));
      }
      onSuccess && onSuccess();
    } catch (e) {
      const detail = e?.response?.data || e.message;
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      addToast({ message: typeof detail === 'string' ? detail : 'Failed to save payment', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Open cancel confirmation dialog
  const openCancelDialog = () => {
    if (!isEdit || !editPayment?.id) return;
    setShowCancelDialog(true);
  };

  // While the dialog is open, detect Shift key being held
  useEffect(() => {
    if (!showCancelDialog) return;
    const down = (e) => { if (e.key === 'Shift') setShiftHeld(true); };
    const up = (e) => { if (e.key === 'Shift') setShiftHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      setShiftHeld(false);
    };
  }, [showCancelDialog]);

  const handleConfirmCancel = async () => {
    if (!isEdit || !editPayment?.id) return;
    if (!shiftHeld) return; // safety
    if (!canDeletePayment) { addToast({ message: "You don't have permission to cancel payments in this building.", type: 'error' }); return; }
    try {
      setDeleting(true);
      setError(null);
      setSuccess(null);
      await deletePayment(editPayment.id);
      setSuccess('Payment cancelled successfully');
      setShowCancelDialog(false);
      addToast({ message: 'Payment cancelled successfully', type: 'success' });
      onSuccess && onSuccess();
    } catch (e) {
      const detail = e?.response?.data || e.message;
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      addToast({ message: typeof detail === 'string' ? detail : 'Failed to cancel payment', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  // Helpers to render invoice option labels safely
  const getBookingRef = (b) => {
    if (!b) return '';
    if (typeof b === 'string' || typeof b === 'number') return String(b);
    return (
      b.code || b.reference || b.booking_code || b.booking_ref ||
      (typeof b.id !== 'undefined' ? `#${b.id}` : '')
    ) || '';
  };

  const renderInvoiceOption = useCallback((opt) => {
    const dueClass = typeof opt.due === 'number' && opt.due > 0 ? 'text-red-600' : 'text-green-600';
    return (
      <div className="flex items-center justify-between w-full text-sm">
        <span>{opt.label}</span>
        {typeof opt.due === 'number' && (
          <span className={`text-xs font-medium ${dueClass}`}>Due {formatCurrency(opt.due)}</span>
        )}
      </div>
    );
  }, []);

  const invoiceOptions = useMemo(() => {
    const hasDefaultInList = invoiceList.some(inv => String(inv.id) === String(form.invoice))
    const listWithDefault = (!hasDefaultInList && defaultInvoiceObj)
      ? [...invoiceList, defaultInvoiceObj]
      : invoiceList
    const opts = listWithDefault.map((inv) => {
      const bookingRef = getBookingRef(inv?.booking);
      const cycleSrc = inv?.cycle_month || inv?.billing_month || inv?.cycle || inv?.month;
      const cycle = formatDateOnly(
        (typeof cycleSrc === 'string' && cycleSrc.length === 7) ? `${cycleSrc}-01` : cycleSrc
      );
      const dueNum = Number(inv?.balance_due || inv?.due || 0);
      return {
        value: String(inv.id),
        label: `#${inv.id} • Booking ${bookingRef || '-'} • Cycle ${cycle} • Due ${formatCurrency(dueNum)}`,
        due: dueNum,
      };
    });
    return [
      { value: '', label: '— No invoice (standalone payment) —', due: 0 },
      ...opts,
    ];
  }, [invoiceList, form.invoice, defaultInvoiceObj]);

  const methodOptionsWithNone = methodOptions;

  const buildingOptionsWithSelected = useMemo(() => {
    const hasSelected = selectedBuilding && (buildingOptions || []).some(o => String(o.value) === String(selectedBuilding));
    if (hasSelected) return buildingOptions;
    if (selectedBuilding) {
      return [{ value: String(selectedBuilding), label: `#${selectedBuilding}` }, ...(buildingOptions || [])];
    }
    return buildingOptions;
  }, [buildingOptions, selectedBuilding]);

  const tenantOptionsWithSelected = useMemo(() => {
    const hasSelected = selectedTenant && (tenantOptions || []).some(o => String(o.value) === String(selectedTenant));
    if (hasSelected) return tenantOptions;
    if (selectedTenant) {
      return [{ value: String(selectedTenant), label: `Tenant #${selectedTenant}` }, ...(tenantOptions || [])];
    }
    return tenantOptions;
  }, [tenantOptions, selectedTenant]);

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
      )}

      {(tenantId || selectedTenant || bookingId) && (
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Tenant Due: <strong>{formatCurrency(tenantDue.amount)}</strong></span>
          <span>Due Invoices: <strong>{tenantDue.count}</strong></span>
        </div>
      )}

      {/* Building selector */}
      <div className="grid gap-1">
        <Label htmlFor="building" required>Building</Label>
        <Select
          id="building"
          name="building"
          value={selectedBuilding}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedBuilding(val);
            // reset dependent fields
            setSelectedTenant('');
            setFetchedInvoices([]);
            setForm(prev => ({ ...prev, invoice: '' }));
            setFieldErrors(prev => ({ ...prev, building: '', tenant: '' }));
          }}
          options={[{ value: '', label: 'Select building' }, ...(buildingOptionsWithSelected || [])]}
          disabled={buildingLoading || isEdit || !canViewBuildings || lockSelectors}
          required
          error={fieldErrors.building}
        />
        {!canViewBuildings && (
          <small className="text-[11px] text-amber-600">You don't have permission to view buildings.</small>
        )}
        {lockSelectors && (
          <small className="text-[11px] text-gray-500">Locked (from invoice)</small>
        )}
        {fieldErrors.building && (
          <small className="text-[11px] text-red-600">{fieldErrors.building}</small>
        )}
      </div>

      {/* Tenant selector */}
      <div className="grid gap-1">
        <Label htmlFor="tenant" required>Tenant</Label>
        <SearchableSelect
          id="tenant"
          name="tenant"
          options={tenantOptionsWithSelected}
          value={selectedTenant}
          onChange={(opt) => {
            const v = opt?.value || '';
            setSelectedTenant(v);
            setFetchedInvoices([]);
            setForm(prev => ({ ...prev, invoice: '' }));
            setFieldErrors(prev => ({ ...prev, tenant: '' }));
          }}
          placeholder={tenantLoading ? 'Loading tenants...' : (lockSelectors ? 'Locked (from invoice)' : (isEdit ? 'Locked (editing payment)' : (tenantDisabled ? (!selectedBuilding ? 'Select building first' : "You don't have permission to view tenants in this building") : 'Search tenant in building...')))}
          loading={tenantLoading}
          className={`w-full ${(tenantDisabled || lockSelectors) ? 'opacity-60 pointer-events-none' : ''}`}
          aria-required="true"
          searchFields={[ 'label', 'phone' ]}
          optionRenderer={(opt) => (
            <div className="flex items-center justify-between w-full text-sm">
              <span>{opt.label}</span>
              {opt.phone ? <span className="text-xs text-gray-500">{opt.phone}</span> : null}
            </div>
          )}
        />
        {tenantDisabled && (
          <small className="text-[11px] text-gray-500">{!selectedBuilding ? 'Select a building to choose tenant' : "You don't have permission to view tenants in this building."}</small>
        )}
        {fieldErrors.tenant && (
          <small className="text-[11px] text-red-600">{fieldErrors.tenant}</small>
        )}
      </div>

      <AsyncGuard
        loading={isInvoicesLoading}
        error={fetchError}
        data={invoiceList}
        isEmpty={!isInvoicesLoading && Array.isArray(invoiceList) && invoiceList.length === 0}
        onRetry={() => setInvoicesRefreshTick(t => t + 1)}
        emptyFallback={<small className="text-[11px] text-gray-500">No invoices found for the selected filters.</small>}
      >
        <div className="grid gap-1">
          <Label htmlFor="invoice" required={!isEdit}>Invoice</Label>
          <SearchableSelect
            id="invoice"
            name="invoice"
            options={invoiceOptions}
            value={form.invoice}
            onChange={(opt) => {
              setForm(prev => ({ ...prev, invoice: opt?.value || '' }));
              setFieldErrors(prev => ({ ...prev, invoice: '' }));
            }}
            placeholder={isInvoicesLoading ? 'Loading invoices...' : (lockSelectors ? 'Locked (from invoice)' : (invoiceDisabled ? (!selectedTenant && !isEdit ? 'Select tenant first' : "You don't have permission to view invoices in this building") : 'Search/select invoice'))}
            loading={isInvoicesLoading}
            className={`w-full ${(invoiceDisabled || lockSelectors) ? 'opacity-60 pointer-events-none' : ''}`}
            optionRenderer={renderInvoiceOption}
            aria-required={!isEdit}
            error={fieldErrors.invoice}
          />
          {invoiceDisabled && (
            <small className="text-[11px] text-gray-500">{!selectedTenant && !isEdit ? 'Select a tenant to choose invoice' : "You don't have permission to view invoices in this building."}</small>
          )}
          {fieldErrors.invoice && (
            <small className="text-[11px] text-red-600">{fieldErrors.invoice}</small>
          )}
          {selectedInvoice && (
            <div className="flex flex-wrap gap-3 text-[11px] text-gray-600">
              <span>Total: {formatCurrency(invTotal)}</span>
              <span>Paid: {formatCurrency(invPaid)}</span>
              <span className={`font-medium ${Number(balDue) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                Balance: {formatCurrency(balDue)}{editHeadroom ? ` (+${formatCurrency(editHeadroom)} edit headroom)` : ''}
              </span>
              {selectedInvoice?.due_date && (
                <span>Due: {formatDateOnly(selectedInvoice.due_date)}</span>
              )}
            </div>
          )}
        </div>
      </AsyncGuard>

      <div className="grid gap-1">
        <Label htmlFor="amount" required>Amount</Label>
        <Input
          id="amount"
          type="number"
          name="amount"
          value={form.amount}
          onChange={handleChange}
          step="0.01"
          min="0"
          placeholder={effectiveCapDue > 0 ? `Max ${formatCurrency(effectiveCapDue)}` : '0.00'}
          onBlur={handleAmountBlur}
          error={fieldErrors.amount}
          aria-invalid={Boolean(fieldErrors.amount) || undefined}
          required
        />
        <div className="flex items-center justify-between">
          <small className={`text-[11px] ${amountError ? 'text-red-600' : 'text-gray-500'}`}>
            {amountError || (selectedInvoice ? `Remaining after pay: ${formatCurrency(remainingAfter)}` : 'Enter amount')}
          </small>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm(prev => ({ ...prev, amount: String(effectiveCapDue || '') }))}
              disabled={!selectedInvoice || effectiveCapDue <= 0 || submitting}
            >
              {isEdit ? 'Set to Max Allowed' : 'Pay Full Due'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-1">
        <Label htmlFor="method" required>Payment Method</Label>
        <Select
          id="method"
          name="method"
          value={form.method}
          onChange={handleChange}
          options={methodOptions}
          placeholder="Select payment method"
          required
          error={fieldErrors.method}
          aria-invalid={Boolean(fieldErrors.method) || undefined}
        />
        {fieldErrors.method && <small className="text-[11px] text-red-600">{fieldErrors.method}</small>}
      </div>

      <div className="grid gap-1">
        <Label htmlFor="received_at">Received At</Label>
        <DatePicker
          id="received_at"
          name="received_at"
          selected={receivedAtDate}
          onChange={(date) => {
            if (!date) return;
            setReceivedAtDate(date);
            setForm(prev => ({ ...prev, received_at: new Date(date).toISOString() }));
            setFieldErrors(prev => ({ ...prev, received_at: '' }));
          }}
          showTimeSelect
          timeIntervals={5}
          dateFormat="dd/MM/yyyy h:mm aa"
          error={fieldErrors.received_at}
          aria-invalid={Boolean(fieldErrors.received_at) || undefined}
          disabled={readOnlyReceivedAt}
        />
      </div>

      <div className="grid gap-1">
        <Label htmlFor="reference">Reference</Label>
        <Input
          id="reference"
          type="text"
          name="reference"
          value={form.reference}
          onChange={handleChange}
          onBlur={validateReference}
          error={fieldErrors.reference}
          aria-invalid={Boolean(fieldErrors.reference) || undefined}
          placeholder="Txn ID / Notes"
          maxLength={120}
        />
      </div>

      <div className="grid gap-1">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          onBlur={validateNotes}
          rows={3}
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          maxLength={500}
          aria-invalid={Boolean(fieldErrors.notes) || undefined}
        />
        {fieldErrors.notes && <p className="mt-1 text-xs text-red-600">{fieldErrors.notes}</p>}
      </div>

      <div className="flex gap-2">
        {isEdit && (
          <PermissionButton
            module="payments"
            action="delete"
            scopeId={buildingScope}
            type="button"
            variant="destructive"
            onClick={openCancelDialog}
            loading={deleting}
            reason="You don't have permission to cancel (delete) payments in this building"
            denyMessage="Permission denied: cannot cancel (delete) payments for this building"
            title="Cancel (delete) this payment"
          >
            Cancel Payment
          </PermissionButton>
        )}
        {onCancel && (
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel} disabled={submitting || deleting}>
            Close
          </Button>
        )}
        <PermissionButton
          module="payments"
          action={isEdit ? 'edit' : 'add'}
          scopeId={buildingScope}
          type="submit"
          loading={submitting}
          className="flex-1"
          reason={isEdit ? "You don't have permission to update payments in this building" : "You don't have permission to record payments in this building"}
          denyMessage={isEdit ? "Permission denied: cannot update payments for this building" : "Permission denied: cannot record payments for this building"}
        >
          {isEdit ? 'Update Payment' : 'Record Payment'}
        </PermissionButton>
      </div>
      {(!isEdit && !canAddPayment) && (
        <small className="text-[11px] text-amber-600">You don't have permission to record payments in this building.</small>
      )}
      {(isEdit && !canEditPayment) && (
        <small className="text-[11px] text-amber-600">You don't have permission to update payments in this building.</small>
      )}

      {/* Cancel confirmation dialog */}
      <Modal
        isOpen={showCancelDialog}
        onClose={() => { setShowCancelDialog(false); setShiftHeld(false); }}
        title="Confirm Cancel Payment"
        maxWidth="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            You are about to cancel (delete) this payment.
          </p>
          <ul className="list-disc pl-5 text-xs text-gray-600 space-y-1">
            <li>This action cannot be undone.</li>
            <li>Hold the <strong>Shift</strong> key to enable the Cancel Payment button.</li>
          </ul>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Shift key status:</span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${shiftHeld ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
              {shiftHeld ? 'Held' : 'Not held'}
            </span>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowCancelDialog(false); setShiftHeld(false); }}
              disabled={deleting}
            >
              Back
            </Button>
            <PermissionButton
              module="payments"
              action="delete"
              scopeId={buildingScope}
              type="button"
              variant="destructive"
              onClick={handleConfirmCancel}
              loading={deleting}
              disabled={!shiftHeld || deleting}
              reason="You don't have permission to cancel (delete) payments in this building"
              denyMessage="Permission denied: cannot cancel (delete) payments for this building"
            >
              Cancel Payment
            </PermissionButton>
          </div>
        </div>
      </Modal>
    </form>
  );
};

export default PaymentForm;