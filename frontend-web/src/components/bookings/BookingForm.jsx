import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import api from '../../services/api'
import { listTenants } from '../../services/tenants'
import { getBuildings, getFloors, getRooms, getBeds } from '../../services/properties'
import { Input } from '../ui/Input'
import { DatePicker } from '../ui/DatePicker'
import { Button, PermissionButton } from '../ui/Button'
import SearchableSelect from '../ui/SearchableSelect'
import { PaymentMethods } from '../../services/payments'
import { useToast } from '../../context/ToastContext'
import AsyncGuard from '../common/AsyncGuard'
import { useCan } from '../../context/AuthContext'
import { formatDateForInput, formatCurrency } from '../../utils/dateUtils'

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'reserved', label: 'Reserved' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'canceled', label: 'Canceled' },
    { value: 'checked_out', label: 'Checked Out' },
]

const SOURCE_OPTIONS = [
    { value: 'walkin', label: 'Walk-in' },
    { value: 'phone', label: 'Phone' },
    { value: 'online', label: 'Online' },
    { value: 'other', label: 'Other' },
]

const PAYMENT_METHOD_OPTIONS = [
    { value: PaymentMethods.CASH, label: 'Cash' },
    { value: PaymentMethods.UPI, label: 'UPI' },
    { value: PaymentMethods.CARD, label: 'Card' },
    { value: PaymentMethods.BANK, label: 'Bank Transfer' },
    { value: PaymentMethods.OTHER, label: 'Other' },
]

function toDateStr(d) {
    return formatDateForInput(d) || null
}

// Helpers: format floor labels
function formatFloorLabel(n) {
    const num = Number(n)
    if (Number.isNaN(num)) return String(n)
    if (num === 0) return 'Ground Floor'
    const words = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth']
    const label = words[num - 1] || `${num}th`
    return `${label} Floor`
}

// Helpers: format bed status label e.g., available -> Available, no_show -> No Show
function formatStatusLabel(s) {
    if (!s) return ''
    return String(s)
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
}

const BookingForm = ({ onCancel, onSaved, initialValues = null, mode = 'create', lockLocation = false, hideLocation = false, statusOptions = STATUS_OPTIONS }) => {
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState({})
    const { addToast } = useToast()
    const { can } = useCan()

    const [form, setForm] = useState(() => ({
        tenant: initialValues?.tenant != null && initialValues?.tenant !== '' ? String(initialValues.tenant) : '',
        building: initialValues?.building != null && initialValues?.building !== '' ? String(initialValues.building) : '',
        floor: initialValues?.floor != null && initialValues?.floor !== '' ? String(initialValues.floor) : '',
        room: initialValues?.room != null && initialValues?.room !== '' ? String(initialValues.room) : '',
        bed: initialValues?.bed != null && initialValues?.bed !== '' ? String(initialValues.bed) : '',
        status: initialValues?.status ?? 'pending',
        source: initialValues?.source ?? 'walkin',
        start_date: initialValues?.start_date ? new Date(initialValues.start_date) : null,
        end_date: initialValues?.end_date ? new Date(initialValues.end_date) : null,
        monthly_rent: initialValues?.monthly_rent ?? '',
        security_deposit: initialValues?.security_deposit ?? '',
        discount_amount: initialValues?.discount_amount ?? 0,
        maintenance_amount: initialValues?.maintenance_amount ?? 0,
        notes: initialValues?.notes ?? '',
        // Initial payment (UI only)
        collect_payment_now: false,
        payment_amount: '',
        payment_method: PaymentMethods.CASH,
        payment_reference: '',
    }))

    // Now that form state exists, derive permission flags
    const permScope = form.building ? String(form.building) : 'global'
    const canViewBuildings = can('buildings', 'view', 'global') || can('buildings', 'view', permScope)
    const canViewFloors = can('floors', 'view', permScope)
    const canViewRooms = can('rooms', 'view', permScope)
    const canViewBeds = can('beds', 'view', permScope)
    const canSubmitBooking = can('bookings', mode === 'edit' ? 'edit' : 'add', permScope)

    // Refs for focusing fields on error
    const tenantRef = useRef(null)
    const buildingRef = useRef(null)
    const floorRef = useRef(null)
    const roomRef = useRef(null)
    const bedRef = useRef(null)
    const startDateRef = useRef(null)
    const endDateRef = useRef(null)
    const paymentAmountRef = useRef(null)

    // Options data
    const [tenants, setTenants] = useState([])
    const [buildings, setBuildings] = useState([])
    const [floors, setFloors] = useState([])
    const [rooms, setRooms] = useState([])
    const [beds, setBeds] = useState([])

    // Fetch bookings to mark already booked tenants (non-canceled, active)
    const [tenantBookedMap, setTenantBookedMap] = useState({})
    const fetchTenantActiveBookings = useCallback(async () => {
        try {
            const params = { page_size: 1000, ordering: '-start_date' }
            const res = await api.get('/bookings/bookings/', { params })
            const items = Array.isArray(res.data) ? res.data : (res.data?.results || [])
            const today = new Date()
            const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const ACTIVE = new Set(['pending', 'reserved', 'confirmed'])
            const map = {}
            for (const b of items) {
                const tenantId = b.tenant || b.tenant_id
                if (!tenantId) continue
                const rawStatus = String(b.status || '').toLowerCase()
                // Skip canceled/cancelled
                if (rawStatus === 'canceled' || rawStatus === 'cancelled') continue
                // Consider as active only for specific statuses
                if (!ACTIVE.has(rawStatus)) continue
                // If end_date exists and is before today, consider inactive
                if (b.end_date) {
                    const end = new Date(b.end_date)
                    if (!isNaN(end) && end < midnight) {
                        continue
                    }
                }
                if (!(tenantId in map)) map[tenantId] = rawStatus
            }
            setTenantBookedMap(map)
        } catch (_) {
            // ignore
        }
    }, [])

    // Initial load
    useEffect(() => {
        fetchTenantActiveBookings()
    }, [fetchTenantActiveBookings])

    // Refresh when window gains focus or tab becomes visible (helps after cancel elsewhere)
    useEffect(() => {
        const onFocus = () => fetchTenantActiveBookings()
        const onVisibility = () => { if (!document.hidden) fetchTenantActiveBookings() }
        window.addEventListener('focus', onFocus)
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
            window.removeEventListener('focus', onFocus)
            document.removeEventListener('visibilitychange', onVisibility)
        }
    }, [fetchTenantActiveBookings])

    // Form state
    const [hydrating, setHydrating] = useState(mode === 'edit' && !!initialValues)
    const [hydrationRetryTick, setHydrationRetryTick] = useState(0)
    const prevBuildingRef = useRef(form.building)
    const prevFloorRef = useRef(form.floor)
    const prevRoomRef = useRef(form.room)

    // If initialValues arrive async (edit modal), sync them into form once
    useEffect(() => {
        if (mode !== 'edit' || !initialValues) return
        setForm(f => ({
            ...f,
            tenant: initialValues?.tenant != null && initialValues?.tenant !== '' ? String(initialValues.tenant) : f.tenant,
            building: initialValues?.building != null && initialValues?.building !== '' ? String(initialValues.building) : f.building,
            floor: initialValues?.floor != null && initialValues?.floor !== '' ? String(initialValues.floor) : f.floor,
            room: initialValues?.room != null && initialValues?.room !== '' ? String(initialValues.room) : f.room,
            bed: initialValues?.bed != null && initialValues?.bed !== '' ? String(initialValues.bed) : f.bed,
            status: initialValues?.status ?? f.status,
            source: initialValues?.source ?? f.source,
            start_date: initialValues?.start_date ? new Date(initialValues.start_date) : f.start_date,
            end_date: initialValues?.end_date ? new Date(initialValues.end_date) : f.end_date,
            monthly_rent: initialValues?.monthly_rent ?? f.monthly_rent,
            security_deposit: initialValues?.security_deposit ?? f.security_deposit,
            discount_amount: initialValues?.discount_amount ?? f.discount_amount,
            maintenance_amount: initialValues?.maintenance_amount ?? f.maintenance_amount,
            notes: initialValues?.notes ?? f.notes,
        }))
        // Trigger hydration if not already
        setHydrating(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialValues])

    // Load base options
    useEffect(() => {
        listTenants({ ordering: 'full_name' }).then(setTenants).catch(() => { })
        if (canViewBuildings) {
            getBuildings({ is_active: true }).then((list) => {
                const arr = Array.isArray(list) ? list : (list?.results || [])
                // Filter by per-building permission
                const permitted = arr.filter((b) => b && b.id != null && can('buildings', 'view', b.id))
                setBuildings(permitted)
                // Sanitize selected building if not permitted
                const isPermitted = permitted.some((b) => String(b.id) === String(form.building || ''))
                if (form.building && !isPermitted) {
                    setForm((f) => ({ ...f, building: '', floor: '', room: '', bed: '' }))
                    setFloors([])
                    setRooms([])
                    setBeds([])
                }
            }).catch(() => { setBuildings([]) })
        } else {
            setBuildings([])
        }
    }, [canViewBuildings])

    // Cascade: floors when building changes
    useEffect(() => {
        if (hydrating) return
        if (form.building) {
            if (canViewFloors) {
                getFloors({ building: form.building }).then(setFloors).catch(() => setFloors([]))
            } else {
                setFloors([])
            }
        } else {
            setFloors([])
        }
        if (prevBuildingRef.current !== form.building) {
            // reset deeper fields only when building actually changed
            setForm((f) => ({ ...f, floor: '', room: '', bed: '' }))
            setRooms([])
            setBeds([])
            // If currently selected tenant is from a different building, clear tenant
            if (form.tenant) {
                const t = tenants.find(tt => tt.id === Number(form.tenant))
                const tBuilding = t?.building ?? t?.building_id
                if (t && String(tBuilding || '') !== String(form.building || '')) {
                    setForm((f) => ({ ...f, tenant: '' }))
                }
            }
            prevBuildingRef.current = form.building
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.building, canViewFloors])

    // Cascade: rooms when floor changes
    useEffect(() => {
        if (hydrating) return
        if (form.floor) {
            if (canViewRooms) {
                getRooms({ floor: form.floor }).then(setRooms).catch(() => setRooms([]))
            } else {
                setRooms([])
            }
        } else if (form.building) {
            if (canViewRooms) {
                getRooms({ building: form.building }).then(setRooms).catch(() => setRooms([]))
            } else {
                setRooms([])
            }
        } else {
            setRooms([])
        }
        if (prevFloorRef.current !== form.floor) {
            setForm((f) => ({ ...f, room: '', bed: '' }))
            setBeds([])
            prevFloorRef.current = form.floor
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.floor, canViewRooms])

    // Cascade: beds when room changes
    useEffect(() => {
        if (hydrating) return
        if (form.room) {
            if (canViewBeds) {
                getBeds({ room: form.room }).then(setBeds).catch(() => setBeds([]))
            } else {
                setBeds([])
            }
        } else {
            setBeds([])
        }
        if (prevRoomRef.current !== form.room) {
            setForm((f) => ({ ...f, bed: '' }))
            prevRoomRef.current = form.room
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.room, canViewBeds])

    // Auto fill pricing from selected room if empty
    useEffect(() => {
        if (!form.room) return
        const selectedRoom = rooms.find((r) => r.id === Number(form.room))
        if (selectedRoom) {
            setForm((f) => ({
                ...f,
                monthly_rent: f.monthly_rent === '' || Number(f.monthly_rent) <= 0 ? selectedRoom.monthly_rent ?? 0 : f.monthly_rent,
                security_deposit: f.security_deposit === '' || Number(f.security_deposit) <= 0 ? (selectedRoom.security_deposit ?? 0) : f.security_deposit,
            }))
        }
    }, [form.room, rooms])

    // Auto-manage end_date based on status
    useEffect(() => {
        const raw = String(form.status || '').toLowerCase()
        const isCanceled = raw === 'canceled' || raw === 'cancelled'
        if (isCanceled) {
            const today = new Date()
            const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            let desired = todayMid
            if (form.start_date instanceof Date && !isNaN(form.start_date)) {
                const sd = new Date(form.start_date.getFullYear(), form.start_date.getMonth(), form.start_date.getDate())
                if (sd > todayMid) desired = sd
            }
            const cur = form.end_date instanceof Date && !isNaN(form.end_date)
                ? new Date(form.end_date.getFullYear(), form.end_date.getMonth(), form.end_date.getDate())
                : null
            const needUpdate = !cur || cur.getTime() !== desired.getTime()
            if (needUpdate) {
                setForm(f => ({ ...f, end_date: desired }))
            }
        } else {
            if (form.end_date) {
                setForm(f => ({ ...f, end_date: null }))
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.status])

    // Auto-fill check-out date when status is set to 'canceled' (only if empty)
    useEffect(() => {
        if (form.status === 'canceled' && !form.end_date) {
            const today = new Date()
            const localMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            setForm(f => ({ ...f, end_date: localMidnight }))
        }
    }, [form.status, form.end_date])

    // Whether immediate payment is allowed for current status
    const paymentAllowed = useMemo(() => {
        const st = String(form.status || '').toLowerCase()
        return st === 'reserved' || st === 'confirmed'
    }, [form.status])

    // If status changes to a disallowed one while collect_payment_now is on, turn it off and toast
    useEffect(() => {
        if (form.collect_payment_now && !paymentAllowed) {
            setForm(f => ({ ...f, collect_payment_now: false }))
            addToast({ message: 'Collect payment now is only available when status is Reserved or Confirmed.', type: 'error' })
            setError('Collect payment now requires status Reserved or Confirmed.')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentAllowed])

    // Color scheme for Status select
    const statusColorClass = useMemo(() => {
        switch (form.status) {
            case 'pending':
                return 'text-amber-700 bg-amber-50 border-amber-300 focus:ring-amber-400'
            case 'reserved':
                return 'text-indigo-700 bg-indigo-50 border-indigo-300 focus:ring-indigo-400'
            case 'confirmed':
                return 'text-emerald-700 bg-emerald-50 border-emerald-300 focus:ring-emerald-400'
            case 'canceled':
                return 'text-red-700 bg-red-50 border-red-300 focus:ring-red-400'
            case 'checked_out':
                return 'text-slate-700 bg-slate-50 border-slate-300 focus:ring-slate-400'
            default:
                return ''
        }
    }, [form.status])

    // Color scheme for Bed select based on selected bed status
    const bedColorClass = useMemo(() => {
        const sel = beds.find(b => b.id === Number(form.bed))
        const status = sel?.status || ''
        switch (status) {
            case 'available':
                return 'text-emerald-700 bg-emerald-50 border-emerald-300 focus:ring-emerald-400'
            case 'reserved':
                return 'text-indigo-700 bg-indigo-50 border-indigo-300 focus:ring-indigo-400'
            case 'occupied':
                return 'text-amber-700 bg-amber-50 border-amber-300 focus:ring-amber-400'
            case 'maintenance':
                return 'text-slate-700 bg-slate-50 border-slate-300 focus:ring-slate-400'
            case 'blocked':
                return 'text-red-700 bg-red-50 border-red-300 focus:ring-red-400'
            default:
                return ''
        }
    }, [beds, form.bed])

    // Auto total calculation: rent + deposit + maintenance - discount (never below 0)
    const totalPayable = useMemo(() => {
        const rent = Number(form.monthly_rent || 0)
        const deposit = Number(form.security_deposit || 0)
        const maintenance = Number(form.maintenance_amount || 0)
        const discount = Number(form.discount_amount || 0)
        const val = rent + deposit + maintenance - discount
        return val < 0 ? 0 : val
    }, [form.monthly_rent, form.security_deposit, form.maintenance_amount, form.discount_amount])

    // If a bed already has a booking (pending/reserved/confirmed), we will prefill
    const [prefilledFromBooking, setPrefilledFromBooking] = useState(null)

    // When a bed is selected (including via initialValues), check if there is an existing active booking
    useEffect(() => {
        let cancelled = false
        const loadExisting = async () => {
            setPrefilledFromBooking(null)
            const bedId = Number(form.bed)
            if (!bedId) return
            try {
                // Fetch bookings for this bed and pick an active one (pending/reserved/confirmed and date window not ended)
                const params = { bed: bedId, page_size: 100, ordering: '-start_date' }
                const res = await api.get('/bookings/bookings/', { params })
                const items = Array.isArray(res.data) ? res.data : (res.data?.results || [])
                const today = new Date()
                const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                const candidates = items.filter(b => {
                    const st = b?.status
                    if (!['pending', 'reserved', 'confirmed'].includes(st)) return false
                    // Consider as active if end_date is null or >= today
                    if (b?.end_date) {
                        const end = new Date(b.end_date)
                        if (!isNaN(end.getTime()) && end < midnight) {
                            return false
                        }
                    }
                    return true
                })
                const existing = candidates[0]
                if (!cancelled && existing) {
                    // Prefill tenant, status and dates
                    setForm(f => ({
                        ...f,
                        tenant: existing.tenant != null ? String(existing.tenant) : f.tenant,
                        status: existing.status || f.status,
                        start_date: existing.start_date ? new Date(existing.start_date) : f.start_date,
                        end_date: existing.end_date ? new Date(existing.end_date) : f.end_date,
                    }))
                    setPrefilledFromBooking({ id: existing.id, tenant: existing.tenant, status: existing.status })
                }
            } catch (_) {
                // ignore errors
            }
        }
        loadExisting()
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.bed])

    const handleChange = (e) => {
        const { name, value } = e.target
        // Business rule: disallow selecting "Canceled" from the form; use actions instead
        if (name === 'status' && value === 'canceled') {
            addToast({ message: 'Cancel from this form is disabled. Use the booking actions menu to cancel.', type: 'error' })
            setError('Cancel is disabled in this form; use the actions menu.')
            setFieldErrors((fe) => ({ ...fe, status: 'Use the booking actions menu to cancel.' }))
            return
        }
        // Business rule: allow selecting "Checked Out" only if current status is Confirmed
        if (name === 'status' && value === 'checked_out') {
            const prev = String(form.status || '')
            if (prev !== 'confirmed') {
                // Block change, show toast and inline error
                addToast({ message: 'You can set status to Checked Out only after the booking is Confirmed.', type: 'error' })
                setError('Checked Out is allowed only after Confirmed')
                setFieldErrors((fe) => ({ ...fe, status: 'Checked Out is allowed only after Confirmed.' }))
                return
            }
        }
        setForm((f) => ({ ...f, [name]: value }))
        // Clear field-specific error on change
        setFieldErrors((fe) => ({ ...fe, [name]: undefined }))
    }

    const handleNumber = (e) => {
        const { name, value } = e.target
        const v = value === '' ? '' : Number(value)
        setForm((f) => ({ ...f, [name]: v }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSubmitting(true)
        try {
            const payload = {
                tenant: form.tenant,
                building: form.building,
                floor: form.floor,
                room: form.room,
                bed: form.bed,
                status: form.status,
                source: form.source,
                start_date: toDateStr(form.start_date),
                end_date: toDateStr(form.end_date),
                monthly_rent: form.monthly_rent === '' ? 0 : form.monthly_rent,
                security_deposit: form.security_deposit === '' ? 0 : form.security_deposit,
                discount_amount: form.discount_amount || 0,
                maintenance_amount: form.maintenance_amount || 0,
                notes: form.notes,
            }
            if (mode === 'edit' && initialValues?.id) {
                await api.put(`/bookings/bookings/${initialValues.id}/`, payload)
            } else {
                await api.post('/bookings/bookings/', payload)
            }
            addToast({ message: `Booking ${mode === 'edit' ? 'updated' : 'created'} successfully`, type: 'success' })
            onSaved?.()
        } catch (err) {
            const detail = err?.response?.data
            const msg = typeof detail === 'string' ? detail : (detail?.detail || 'Failed to save booking')
            setError(msg)
            addToast({ message: msg, type: 'error' })
            // If API returned field errors, set and focus first
            if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
                const apiFieldErrs = {}
                for (const k of Object.keys(detail)) {
                    if (k === 'detail') continue
                    const v = detail[k]
                    apiFieldErrs[k] = Array.isArray(v) ? v[0] : (typeof v === 'string' ? v : 'Invalid value')
                }
                if (Object.keys(apiFieldErrs).length) {
                    setFieldErrors(apiFieldErrs)
                    // Focus after state update
                    setTimeout(() => focusFirstError(apiFieldErrs), 0)
                }
            }
        } finally {
            setSubmitting(false)
        }
    }

    // Client-side required validation before submit
    const validateRequired = () => {
        const errs = {}
        // Basic requireds
        if (!form.building) errs.building = 'Building is required'
        if (!form.tenant) errs.tenant = 'Tenant is required'
        if (!form.floor) errs.floor = 'Floor is required'
        if (!form.room) errs.room = 'Room is required'
        if (!form.bed) errs.bed = 'Bed is required'
        if (!form.start_date) errs.start_date = 'Check-in date is required'

        // Date consistency: end_date must be >= start_date
        if (form.start_date && form.end_date) {
            const s = new Date(form.start_date.getFullYear(), form.start_date.getMonth(), form.start_date.getDate())
            const e = new Date(form.end_date.getFullYear(), form.end_date.getMonth(), form.end_date.getDate())
            if (e < s) {
                errs.end_date = 'End date cannot be before start date'
            }
        }

        // Bed availability check
        if (form.bed) {
            const sel = beds.find(b => b.id === Number(form.bed))
            if (sel && sel.status && sel.status !== 'available') {
                // If we prefilled from an existing booking on this bed, allow the selection even if not available
                const allowDueToPrefill = !!prefilledFromBooking && Number(form.bed) > 0
                if (!allowDueToPrefill) {
                    errs.bed = 'Selected bed is not available'
                }
            }
        }

        // Amount validations (non-negative)
        const amtFields = [
            ['monthly_rent', 'Monthly rent'],
            ['security_deposit', 'Security deposit'],
            ['discount_amount', 'Discount'],
            ['maintenance_amount', 'Maintenance'],
        ]
        for (const [key, label] of amtFields) {
            const val = Number(form[key] === '' ? 0 : form[key])
            if (Number.isNaN(val)) {
                errs[key] = `${label} must be a number`
            } else if (val < 0) {
                errs[key] = `${label} cannot be negative`
            }
        }

        // Payment validations
        if (form.collect_payment_now) {
            if (!paymentAllowed) {
                errs.payment_amount = 'Set status to Reserved or Confirmed to collect payment now'
            }
            const amtRaw = form.payment_amount
            const amt = Number(amtRaw)
            if (!amtRaw || Number.isNaN(amt) || amt <= 0) {
                errs.payment_amount = 'Enter a valid payment amount (> 0)'
            } else if (amt > totalPayable) {
                errs.payment_amount = 'Payment amount cannot exceed total payable'
            }
            const method = String(form.payment_method || '')
            const needsRef = [PaymentMethods.UPI, PaymentMethods.CARD, PaymentMethods.BANK].includes(method)
            if (needsRef) {
                const ref = String(form.payment_reference || '').trim()
                if (!ref) {
                    errs.payment_reference = 'Reference is required for UPI/Card/Bank payments'
                }
            }
        }

        // Tenant eligibility: only allow new booking if tenant has no active booking
        if (form.tenant && mode !== 'edit') {
            const status = tenantBookedMap[Number(form.tenant)]
            if (['pending', 'reserved', 'confirmed'].includes(String(status || '').toLowerCase())) {
                errs.tenant = 'Tenant already has an active booking. Cancel it before creating a new booking.'
            }
        }

        setFieldErrors(errs)
        if (Object.keys(errs).length) {
            setError('Please fix the errors highlighted below')
            // Focus first error in a defined order
            setTimeout(() => focusFirstError(errs), 0)
        }
        return Object.keys(errs).length === 0
    }

    // Focus helper: focus first available field with error
    const focusFirstError = (errs) => {
        const order = ['tenant', 'building', 'floor', 'room', 'bed', 'start_date', 'end_date', 'payment_amount', 'monthly_rent', 'security_deposit', 'discount_amount', 'maintenance_amount']
        const first = order.find(k => errs[k])
        if (!first) return
        const focusEl = (el) => { try { el?.focus?.(); } catch (_) {} }
        switch (first) {
            case 'tenant':
                if (tenantRef.current) {
                    const el = tenantRef.current.querySelector?.('input,[role="combobox"],.search-input')
                    focusEl(el || tenantRef.current)
                }
                break
            case 'building':
                focusEl(buildingRef.current)
                break
            case 'floor':
                focusEl(floorRef.current)
                break
            case 'room':
                focusEl(roomRef.current)
                break
            case 'bed':
                focusEl(bedRef.current)
                break
            case 'start_date':
                if (startDateRef.current) {
                    const el = startDateRef.current.querySelector?.('input')
                    focusEl(el || startDateRef.current)
                }
                break
            case 'end_date':
                if (endDateRef.current) {
                    const el = endDateRef.current.querySelector?.('input')
                    focusEl(el || endDateRef.current)
                }
                break
            case 'payment_amount':
                focusEl(paymentAmountRef.current)
                break
            default:
                break
        }
    }

    // Wrap submit to run validation first
    const originalHandleSubmit = handleSubmit
    const handleValidatedSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!validateRequired()) return
        await originalHandleSubmit(e)
    }

    // Initial hydration for edit mode: load option lists to match initial values without clearing selections
    useEffect(() => {
        if (!hydrating) return
        const run = async () => {
            try {
                // Load floors for initial building (if permitted)
                if (initialValues?.building) {
                    const initScope = String(initialValues.building)
                    if (can('floors', 'view', initScope)) {
                        const fl = await getFloors({ building: initialValues.building })
                        setFloors(fl)
                    } else {
                        setFloors([])
                    }
                } else {
                    setFloors([])
                }
                // Load rooms for initial floor (preferred) or building
                if (initialValues?.floor) {
                    const initScope = String(initialValues.building || initialValues.floor)
                    if (can('rooms', 'view', initScope)) {
                        const rms = await getRooms({ floor: initialValues.floor })
                        setRooms(rms)
                    } else {
                        setRooms([])
                    }
                } else if (initialValues?.building) {
                    const initScope = String(initialValues.building)
                    if (can('rooms', 'view', initScope)) {
                        const rms = await getRooms({ building: initialValues.building })
                        setRooms(rms)
                    } else {
                        setRooms([])
                    }
                } else {
                    setRooms([])
                }
                // Load beds for initial room
                if (initialValues?.room) {
                    const initScope = String(initialValues.building || initialValues.room)
                    if (can('beds', 'view', initScope)) {
                        const bds = await getBeds({ room: initialValues.room })
                        setBeds(bds)
                    } else {
                        setBeds([])
                    }
                } else {
                    setBeds([])
                }
            } finally {
                setHydrating(false)
            }
        }
        run()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrating, hydrationRetryTick])

    // Memoized tenant options for SearchableSelect
    const tenantOptions = useMemo(() => {
        const list = Array.isArray(tenants) ? tenants : []
        const withinBuilding = form.building
            ? list.filter(t => String(t?.building ?? t?.building_id ?? '') === String(form.building))
            : list
        return withinBuilding.map(t => {
            const status = tenantBookedMap[t.id]
            const isInactive = t?.is_active === false
            // Disable tenants who already have an active booking (pending/reserved/confirmed)
            const hasActiveBooking = ['pending', 'reserved', 'confirmed'].includes(String(status || '').toLowerCase())
            // Allow selecting the same tenant in edit mode
            const allowSameInEdit = (mode === 'edit') && (String(t.id) === String(form.tenant))
            const disabledBooked = hasActiveBooking && !allowSameInEdit
            const disabled = isInactive || disabledBooked
            const tooltip = isInactive
                ? 'Inactive tenant'
                : (status
                    ? `Booked: ${String(status).replace(/_/g, ' ')}`
                    : '')
            const baseName = t.full_name || t.name || `Tenant ${t.id}`
            const phonePart = t.phone ? ` (${t.phone})` : ''
            const inactiveSuffix = isInactive ? ' - InActive' : ''
            const label = `${baseName}${phonePart}${inactiveSuffix}`
            return ({
                value: String(t.id),
                label,
                phone: t.phone || '',
                disabled,
                tooltip,
                buildingId: String(t?.building ?? t?.building_id ?? ''),
            })
        })
    }, [tenants, tenantBookedMap, form.tenant, form.building, mode])

    return (
        <form onSubmit={handleValidatedSubmit} className="space-y-3">
            {error && <div className="p-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>}
            <AsyncGuard
                loading={hydrating}
                error={null}
                data={!hydrating}
                onRetry={() => { setHydrationRetryTick(t => t + 1); setHydrating(true); }}
            >
                {/* Building at top (hidden when hideLocation) */}
                {!hideLocation && (
                    <div>
                        <label className="block text-xs sm:text-sm text-gray-700 mb-1">
                            Building
                            <span
                                className="ml-1 inline-flex items-center align-middle text-gray-400 hover:text-gray-500 cursor-help"
                                title={'Select building to filter tenants'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-9.5a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0v-5Zm.75-3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" clipRule="evenodd" />
                                </svg>
                            </span>
                        </label>
                        <select
                            name="building"
                            value={form.building}
                            onChange={handleChange}
                            className={`w-full border rounded p-2 text-sm ${(lockLocation || !canViewBuildings) ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' : ''}`}
                            disabled={lockLocation || !canViewBuildings}
                            title={'Select building to filter tenants'}
                            ref={buildingRef}
                        >
                            <option value="">Select building</option>
                            {buildings.map(b => (<option key={b.id} value={String(b.id)}>{b.name}</option>))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Selecting a building filters the tenant list.</p>
                        {!canViewBuildings && (
                            <p className="mt-1 text-xs text-amber-600">You don't have permission to view buildings.</p>
                        )}
                        {fieldErrors.building && <p className="mt-1 text-xs text-red-600">{fieldErrors.building}</p>}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs sm:text-sm text-gray-700 mb-1 flex items-center justify-between">
                            <span>Tenant</span>
                            <button
                                type="button"
                                className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-gray-600 hover:text-gray-800"
                                onClick={fetchTenantActiveBookings}
                                title="Refresh tenant availability"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                    <path fillRule="evenodd" d="M3.5 10a6.5 6.5 0 0 1 11.05-4.743l.196.195V3.5a.75.75 0 0 1 1.5 0v4.25A.75.75 0 0 1 16 8.5H11.75a.75.75 0 0 1 0-1.5h2.232l-.165-.164A5 5 0 0 0 15 10a.75.75 0 0 1 1.5 0 6.5 6.5 0 0 1-13 0Z" clipRule="evenodd" />
                                </svg>
                                Refresh
                            </button>
                        </label>
                        <div ref={tenantRef}>
                        <SearchableSelect
                            options={tenantOptions}
                            value={form.tenant ? String(form.tenant) : ''}
                            onChange={(opt) => {
                                if (!opt?.disabled) {
                                    setForm(f => ({
                                        ...f,
                                        tenant: opt?.value || '',
                                        // If building not chosen yet, auto-set from tenant
                                        building: f.building || (opt?.buildingId || ''),
                                    }))
                                    // If user changes tenant manually, clear prefill hint
                                    setPrefilledFromBooking(null)
                                }
                            }}
                            placeholder={form.building ? 'Search tenant by name or phone' : 'Search tenant (building will auto-set)'}
                            searchFields={['label', 'phone']}
                            optionRenderer={(opt) => (<span>{opt.label}</span>)}
                            loading={!tenants.length}
                            disabled={false}
                            title={undefined}
                        />
                        </div>
                        {prefilledFromBooking && (
                            <p className="mt-1 text-xs text-indigo-600">Prefilled from existing booking (#{prefilledFromBooking.id})</p>
                        )}
                        {fieldErrors.tenant && <p className="mt-1 text-xs text-red-600">{fieldErrors.tenant}</p>}
                    </div>

                    <div>
                        <label className="block text-xs sm:text-sm text-gray-700 mb-1">
                            Status
                            {String(form.status || '') !== 'confirmed' && (
                                <span className="ml-1 inline-flex items-center align-middle text-gray-400 hover:text-gray-500 cursor-help" title="Checked Out can be selected only after the booking is Confirmed">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-9.5a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0v-5Zm.75-3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            )}
                            <span className="ml-1 inline-flex items-center align-middle text-gray-400 hover:text-gray-500 cursor-help" title="Cancel status is disabled in this form. Use booking actions to cancel.">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-9.5a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0v-5Zm.75-3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" clipRule="evenodd" />
                                </svg>
                            </span>
                        </label>
                        <select name="status" value={form.status} onChange={handleChange} className={`w-full border rounded p-2 text-sm transition-colors ${statusColorClass}`}>
                            {statusOptions.map(o => {
                                const disabled = (o.value === 'checked_out' && String(form.status || '') !== 'confirmed') || (o.value === 'canceled')
                                const title = o.value === 'canceled'
                                    ? 'Cancel is disabled here. Use booking actions to cancel.'
                                    : (o.value === 'checked_out' && String(form.status || '') !== 'confirmed'
                                        ? 'Checked Out can be selected only after the booking is Confirmed'
                                        : undefined)
                                return (
                                    <option key={o.value} value={o.value} disabled={disabled} title={title}>
                                        {o.label}
                                    </option>
                                )
                            })}
                        </select>
                        {prefilledFromBooking && (
                            <p className="mt-1 text-xs text-indigo-600">Status pre-selected from existing booking</p>
                        )}
                        {fieldErrors.status && <p className="mt-1 text-xs text-red-600">{fieldErrors.status}</p>}
                    </div>
                </div>

                {/* Floor at top (hidden when hideLocation) */}
                {!hideLocation && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs sm:text-sm text-gray-700 mb-1">
                                Floor
                                {!form.building && (
                                    <span className="ml-1 inline-flex items-center align-middle text-gray-400 hover:text-gray-500 cursor-help" title="Select building to set floors">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-9.5a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0v-5Zm.75-3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                )}
                            </label>
                            <select
                                name="floor"
                                value={form.floor}
                                onChange={handleChange}
                                className={`w-full border rounded p-2 text-sm ${(lockLocation || !form.building || !canViewFloors) ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' : ''}`}
                                disabled={lockLocation || !form.building || !canViewFloors}
                                title={!form.building ? 'Select building to set floors' : (!canViewFloors ? 'No permission to view floors' : (lockLocation ? 'Location is locked' : undefined))}
                                ref={floorRef}
                            >
                                <option value="">Select floor</option>
                                {floors.map(fl => (<option key={fl.id} value={String(fl.id)}>{formatFloorLabel(fl.number)}</option>))}
                            </select>
                            {!canViewFloors && form.building && (
                                <p className="mt-1 text-xs text-amber-600">You don't have permission to view floors in this building.</p>
                            )}
                            {fieldErrors.floor && <p className="mt-1 text-xs text-red-600">{fieldErrors.floor}</p>}
                        </div>
                    </div>
                )}

                {/* Room and Bed (hidden when hideLocation) */}
                {!hideLocation && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs sm:text-sm text-gray-700 mb-1">
                                Room
                                {!form.floor && (
                                    <span className="ml-1 inline-flex items-center align-middle text-gray-400 hover:text-gray-500 cursor-help" title="Choose floor first">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-9.5a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0v-5Zm.75-3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                )}
                            </label>
                            <select
                                name="room"
                                value={form.room}
                                onChange={handleChange}
                                className={`w-full border rounded p-2 text-sm ${(lockLocation || !form.floor || !canViewRooms) ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' : ''}`}
                                disabled={lockLocation || !form.floor || !canViewRooms}
                                title={!form.floor ? 'Choose floor first' : (!canViewRooms ? 'No permission to view rooms' : (lockLocation ? 'Location is locked' : undefined))}
                                ref={roomRef}
                            >
                                <option value="">Select room</option>
                                {rooms.map(r => (<option key={r.id} value={String(r.id)}>{r.number}</option>))}
                            </select>
                            {!canViewRooms && form.floor && (
                                <p className="mt-1 text-xs text-amber-600">You don't have permission to view rooms on this floor.</p>
                            )}
                            {fieldErrors.room && <p className="mt-1 text-xs text-red-600">{fieldErrors.room}</p>}
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm text-gray-700 mb-1">Bed</label>
                            <select
                                name="bed"
                                value={form.bed}
                                onChange={handleChange}
                                className={`w-full border rounded p-2 text-sm transition-colors ${(lockLocation || !form.room || !canViewBeds) ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' : bedColorClass}`}
                                disabled={lockLocation || !form.room || !canViewBeds}
                                title={!form.room ? 'Choose room first' : (!canViewBeds ? 'No permission to view beds' : (lockLocation ? 'Location is locked' : undefined))}
                                ref={bedRef}
                            >
                                <option value="">Select bed</option>
                                {beds.map(b => {
                                    const s = b.status || ''
                                    const dot = s === 'available' ? '🟢' : s === 'reserved' ? '🟣' : s === 'occupied' ? '🟠' : s === 'maintenance' ? '⚙️' : s === 'blocked' ? '🔴' : '•'
                                    const isSelected = String(b.id) === String(form.bed)
                                    const disabled = s !== 'available' && !isSelected
                                    return (
                                        <option key={b.id} value={String(b.id)} disabled={disabled} title={disabled ? 'Only available beds can be selected' : undefined}>
                                            {dot} {b.number} {s ? `(${formatStatusLabel(s)})` : ''}
                                        </option>
                                    )
                                })}
                            </select>
                            {!canViewBeds && form.room && (
                                <p className="mt-1 text-xs text-amber-600">You don't have permission to view beds in this room.</p>
                            )}
                            {fieldErrors.bed && <p className="mt-1 text-xs text-red-600">{fieldErrors.bed}</p>}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <div ref={startDateRef}>
                        <DatePicker
                            selected={form.start_date}
                            onChange={(d) => setForm((f) => ({ ...f, start_date: d }))}
                            label="Check-in date"
                            placeholderText="Select check-in date"
                        />
                        </div>
                        {fieldErrors.start_date && <p className="mt-1 text-xs text-red-600">{fieldErrors.start_date}</p>}
                    </div>
                    <div>
                        <div ref={endDateRef}>
                        <DatePicker
                            selected={form.end_date}
                            onChange={(d) => setForm((f) => ({ ...f, end_date: d }))}
                            label="Check-out (optional)"
                            placeholderText="Select check-out date (optional)"
                            isClearable
                        />
                        </div>
                        {fieldErrors.end_date && <p className="mt-1 text-xs text-red-600">{fieldErrors.end_date}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs sm:text-sm text-gray-700 mb-1">Source</label>
                        <select name="source" value={form.source} onChange={handleChange} className="w-full border rounded p-2 text-sm">
                            {SOURCE_OPTIONS.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input type="number" step="0.01" name="monthly_rent" value={form.monthly_rent} onChange={handleNumber} label="Monthly rent" />
                    <Input type="number" step="0.01" name="security_deposit" value={form.security_deposit} onChange={handleNumber} label="Security deposit" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input type="number" step="0.01" name="discount_amount" value={form.discount_amount} onChange={handleNumber} label="Discount (INR)" />
                    <Input type="number" step="0.01" name="maintenance_amount" value={form.maintenance_amount} onChange={handleNumber} label="Maintenance (INR)" />
                </div>

                {/* Initial Payment Options */}
                <div className="mt-2 rounded border border-gray-200 p-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            Initial Payment
                            {!paymentAllowed && (
                                <span className="inline-flex items-center text-red-600" title="Set status to Reserved or Confirmed to collect payment now">
                                    {/* warning triangle icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                        <path fillRule="evenodd" d="M9.401 1.592a1.75 1.75 0 0 1 3.198 0l6.803 13.607A1.75 1.75 0 0 1 17.803 18H4.197a1.75 1.75 0 0 1-1.599-2.801L9.401 1.592ZM11 6.75a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0v-4.5Zm-.75 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            )}
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                checked={form.collect_payment_now}
                                onChange={(e) => {
                                    const checked = e.target.checked
                                    if (checked && !paymentAllowed) {
                                        setError('Collect payment now requires status Reserved or Confirmed.')
                                        addToast({ message: 'Collect payment now is only available when status is Reserved or Confirmed.', type: 'error' })
                                        return
                                    }
                                    setForm(f => ({ ...f, collect_payment_now: checked }))
                                }}
                                disabled={!paymentAllowed}
                                title={!paymentAllowed ? 'Set status to Reserved or Confirmed to collect payment now' : undefined}
                            />
                            Collect payment now
                        </label>
                    </div>
                    {!paymentAllowed && (
                        <p className="mt-2 text-xs text-red-600">To collect payment now, set booking status to <strong>Reserved</strong> or <strong>Confirmed</strong>.</p>
                    )}
                    {form.collect_payment_now && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-1">
                                <Input
                                    type="number"
                                    step="0.01"
                                    name="payment_amount"
                                    value={form.payment_amount}
                                    onChange={handleNumber}
                                    label="Amount (₹)"
                                    placeholder={totalPayable ? formatCurrency(totalPayable) : '0.00'}
                                    ref={paymentAmountRef}
                                />
                                {fieldErrors.payment_amount && <p className="mt-1 text-xs text-red-600">{fieldErrors.payment_amount}</p>}
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-xs sm:text-sm text-gray-700 mb-1">Method</label>
                                <select
                                    name="payment_method"
                                    value={form.payment_method}
                                    onChange={handleChange}
                                    className="w-full border rounded p-2 text-sm"
                                >
                                    {PAYMENT_METHOD_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="sm:col-span-1">
                                <Input
                                    type="text"
                                    name="payment_reference"
                                    value={form.payment_reference}
                                    onChange={handleChange}
                                    label="Reference"
                                    placeholder="Txn ID / Notes"
                                />
                                {fieldErrors.payment_reference && <p className="mt-1 text-xs text-red-600">{fieldErrors.payment_reference}</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Auto Total */}
                <div className="flex items-center justify-end">
                    <div className="mt-1 inline-flex items-center gap-3 rounded border border-gray-200 bg-gray-50 px-3 py-2" title="Total = Monthly rent + Security deposit + Maintenance - Discount (min 0)">
                        <span className="text-sm text-gray-600 inline-flex items-center">Total
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 ml-1 text-gray-400">
                                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-9.5a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0v-5Zm.75-3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" clipRule="evenodd" />
                            </svg>
                        </span>
                        <span className="text-base sm:text-lg font-semibold text-gray-900">{formatCurrency(totalPayable)}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-xs sm:text-sm text-gray-700 mb-1">Notes</label>
                    <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="w-full border rounded p-2 text-sm" placeholder="Any notes..." />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={submitting}>Cancel</Button>
                    <PermissionButton
                      module="bookings"
                      action={mode === 'edit' ? 'edit' : 'add'}
                      scopeId={form.building || 'global'}
                      type="submit"
                      loading={submitting}
                      denyMessage={`You don't have permission to ${mode === 'edit' ? 'edit' : 'create'} bookings${form.building ? ` for building ${form.building}` : ''}.`}
                    >
                      {mode === 'edit' ? 'Update Booking' : 'Create Booking'}
                    </PermissionButton>
                </div>
            </AsyncGuard>
        </form>
    )
}

export default BookingForm