import React, { useEffect, useMemo, useState, useRef } from 'react'
import api from '../../services/api'
import { emitToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency as formatCurrencyApp, formatDateTime as formatDateTimeApp } from '../../utils/dateUtils'
import Card from '../ui/Card'
import LoadingSpinner from '../ui/LoadingSpinner'
import { CheckCircle2, Minus, AlertTriangle, Info, Tag, Crown, BadgePercent, Sparkles, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Helper: currency formatter
const fmtCurrency = (value, currency = 'INR') => formatCurrencyApp(value, currency)

// Helper: date formatter
const fmtDate = (iso) => formatDateTimeApp(iso)

// Map internal interval code to human label
const intervalLabel = (code) => {
  const c = String(code || '').toLowerCase()
  if (c === '1m') return 'Monthly (28 days)'
  if (c === '3m') return 'Quarterly (3 months)'
  if (c === '6m') return '6 months'
  if (c === '12m') return 'Yearly (12 months)'
  return c || '-'
}

// Status badge helper
const statusBadge = (statusRaw) => {
  const s = String(statusRaw || '').toLowerCase()
  const map = {
    active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    trialing: { label: 'Trialing', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    past_due: { label: 'Past Due', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    canceled: { label: 'Canceled', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  }
  const v = map[s] || { label: (s || 'Unknown'), cls: 'bg-gray-100 text-gray-700 border-gray-200' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${v.cls}`}>{v.label}</span>
}

// Pretty label for limit keys
const limitKeyLabel = (key) => {
  const map = {
    max_buildings: 'Buildings',
    max_floors_per_building: 'Floors / Building',
    max_rooms_per_floor: 'Rooms / Floor',
    max_beds_per_room: 'Beds / Room',
    max_staff: 'Staff',
    max_tenants: 'Tenants',
    max_tenant_media_per_tenant: 'Media / Tenant',
    storage_mb: 'Storage',
  }
  return map[key] || key
}

// ACTIVE ITEM in editor: expose for clarity/testing if needed
export const formatLimitValue = (key, value) => {
  if (value == null) return '-'
  // Treat 0 or very large as Unlimited for some keys
  if (['storage_mb'].includes(key)) {
    const mb = Number(value)
    if (!isFinite(mb)) return '-'
    if (mb <= 0) return 'Unlimited'
    if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`
    return `${mb} MB`
  }
  const n = Number(value)
  if (isFinite(n)) {
    if (n <= 0) return 'Unlimited'
    return String(n)
  }
  return String(value)
}

// Compute price from plan.prices or legacy monthly/yearly fields
const priceFor = (plan, interval) => {
  if (!plan) return null
  const currency = plan.currency || 'INR'
  const code = String(interval || '').toLowerCase()
  // Prefer explicit prices map
  if (plan.prices && plan.prices[code] != null) {
    return { amount: Number(plan.prices[code]), currency }
  }
  // Fallbacks for common intervals
  if (code === '1m' && plan.price_monthly != null) {
    return { amount: Number(plan.price_monthly), currency }
  }
  if (code === '12m' && plan.price_yearly != null) {
    return { amount: Number(plan.price_yearly), currency }
  }
  // Derive as months * monthly if monthly present
  const months = (code.endsWith('m') ? Number(code.replace('m', '')) : NaN)
  if (isFinite(months) && plan.price_monthly != null) {
    return { amount: Number(plan.price_monthly) * months, currency }
  }
  return null
}

// Dedup helpers for best-value badge/computation
const monthsFromInterval = (interval) => {
  const code = String(interval || '')
  return code.endsWith('m') ? Number(code.replace('m', '')) || 1 : 1
}
const bestValuePercent = (plan, interval) => {
  const total = priceFor(plan, interval)
  const monthly = priceFor(plan, '1m')
  if (!total || !monthly || !isFinite(total.amount) || !isFinite(monthly.amount) || monthly.amount <= 0) return 0
  const months = monthsFromInterval(interval)
  const baseline = monthly.amount * months
  if (baseline <= 0) return 0
  const pct = Math.round((1 - (Number(total.amount) / baseline)) * 100)
  return Math.max(0, pct)
}
const hasBestValue = (plan, interval) => bestValuePercent(plan, interval) > 0

export default function Subscription() {
  const { isPGAdmin, currentUser } = useAuth()
  const { t } = useTranslation()
  const tr = (key, fallback, opt) => t(key, { defaultValue: fallback, ...(opt || {}) })

  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState([])
  const [current, setCurrent] = useState(null)
  const [error, setError] = useState('')
  const [noCurrent, setNoCurrent] = useState(false)
  const [noCurrentDetail, setNoCurrentDetail] = useState('')

  // Slider state
  const sliderRef = useRef(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slidesToShow, setSlidesToShow] = useState(4)

  const [selectedSlug, setSelectedSlug] = useState('')
  const [selectedInterval, setSelectedInterval] = useState('1m')
  const [saving, setSaving] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponPreview, setCouponPreview] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [showCoupon, setShowCoupon] = useState(false)

  // Razorpay states
  const [paying, setPaying] = useState(false)
  const rzpScriptLoadedRef = useRef(false)

  const plansRef = useRef(null)

  // Fetch plans + current subscription
  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError('')
      setNoCurrent(false)
      setNoCurrentDetail('')
      try {
        // Load plans first so UI can render even if current subscription is missing
        const pRes = await api.get('/subscription/plans/')
        const planList = Array.isArray(pRes.data) ? pRes.data : []
        setPlans(planList)

        // Try loading current subscription; handle 404 as empty state
        try {
          const cRes = await api.get('/subscription/current/', {
            validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
          })
          if (cRes.status === 404) {
            setNoCurrent(true)
            setNoCurrentDetail(cRes?.data?.detail || tr('subscription.no_current_detail', 'No active subscription.'))
            setCurrent(null)
            const fallbackSlug = (planList.find(p => p.slug === 'free')?.slug) || (planList[0]?.slug || '')
            setSelectedSlug(fallbackSlug)
            setSelectedInterval('1m')
          } else {
            const cur = cRes.data || null
            setCurrent(cur)
            const curSlug = cur?.plan?.slug || (planList.find(p => p.slug === 'free')?.slug) || (planList[0]?.slug || '')
            setSelectedSlug(curSlug)
            setSelectedInterval(cur?.billing_interval || '1m')
          }
        } catch (eCur) {
          const msg = eCur?.response?.data?.detail || tr('subscription.errors.load_current_failed', 'Failed to load subscription data.')
          setError(msg)
          emitToast({ type: 'error', message: msg })
        }
      } catch (e) {
        console.error('Plans load error:', e)
        const msg = e?.response?.data?.detail || tr('subscription.errors.load_plans_failed', 'Failed to load plans.')
        setError(msg)
        emitToast({ type: 'error', message: msg })
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const selectedPlan = useMemo(() => plans.find(p => p.slug === selectedSlug) || null, [plans, selectedSlug])

  const allowedIntervals = useMemo(() => {
    const list = selectedPlan?.available_intervals
    if (Array.isArray(list) && list.length) return list
    return ['1m', '3m', '6m', '12m']
  }, [selectedPlan])

  // Keep selected interval valid when switching plans
  useEffect(() => {
    if (!allowedIntervals.includes(selectedInterval)) {
      setSelectedInterval(allowedIntervals.includes('1m') ? '1m' : allowedIntervals[0])
    }
    // Reset coupon preview if plan or interval changes
    setCouponPreview(null)
    setCouponError('')
    setShowCoupon(false)
  }, [selectedSlug, selectedInterval, allowedIntervals])

  // Clear coupon preview/error when user edits the code to avoid stale state
  useEffect(() => {
    setCouponPreview(null)
    setCouponError('')
  }, [couponCode])

  // Compute total slides based on responsive slidesToShow
  const totalSlides = Math.max(1, Math.ceil((plans?.length || 0) / Math.max(1, slidesToShow)))

  // Responsive slidesToShow
  useEffect(() => {
    const calc = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1440
      if (w < 640) return 1
      if (w < 768) return 2
      if (w < 1024) return 3
      return 4
    }
    const apply = () => setSlidesToShow(calc())
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])

  // Scroll helper
  const scrollToSlide = (index) => {
    const container = sliderRef.current
    if (!container) return
    const children = container.querySelectorAll('[data-plan-card="1"]')
    const childIndex = Math.min(index * Math.max(1, slidesToShow), Math.max(0, children.length - 1))
    const target = children[childIndex]
    if (target) {
      container.scrollTo({ left: target.offsetLeft - 12, behavior: 'smooth' })
    }
    setCurrentSlide(index)
  }

  // Nav controls
  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) scrollToSlide(currentSlide + 1)
  }
  const prevSlide = () => {
    if (currentSlide > 0) scrollToSlide(currentSlide - 1)
  }
  const goToSlide = (i) => scrollToSlide(Math.max(0, Math.min(i, totalSlides - 1)))

  const previewCoupon = async () => {
    if (!isPGAdmin) {
      emitToast({ type: 'warning', message: tr('subscription.coupons.only_pg_admin', 'Only PG Admin can apply coupons.') })
      return
    }
    if (!selectedPlan) return
    const code = String(couponCode || '').trim()
    if (!code) {
      setCouponError(tr('subscription.coupons.enter_code', 'Enter a coupon code'))
      setCouponPreview(null)
      return
    }
    try {
      setCouponLoading(true)
      setCouponError('')
      const { data } = await api.post('/subscription/coupon/preview/', {
        plan_slug: selectedPlan.slug,
        billing_interval: selectedInterval,
        coupon_code: code,
      })
      setCouponPreview(data)
      emitToast({ type: 'success', message: tr('subscription.coupons.preview_ok', `Coupon {{code}} applied: -{{amount}}.`, { code: data?.coupon?.code, amount: fmtCurrency(Number(data.discount_amount), data.currency) }) })
    } catch (e) {
      const msg = e?.response?.data?.detail || tr('subscription.coupons.invalid', 'Coupon not valid for this plan/interval.')
      setCouponError(msg)
      setCouponPreview(null)
      emitToast({ type: 'error', message: msg })
    } finally {
      setCouponLoading(false)
    }
  }

  // Dynamically load Razorpay SDK
  const loadRazorpayScript = () => new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true)
    if (rzpScriptLoadedRef.current) return resolve(true)
    try {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => { rzpScriptLoadedRef.current = true; resolve(true) }
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'))
      document.body.appendChild(script)
    } catch (e) {
      reject(e)
    }
  })

  // Start Razorpay checkout for the selected plan/interval (with optional coupon)
  const payWithRazorpay = async () => {
    if (!isPGAdmin) {
      emitToast({ type: 'warning', message: tr('subscription.pay.only_pg_admin', 'Only PG Admin can pay for subscription.') })
      return
    }
    if (!selectedPlan) return
    if (noCurrent) {
      emitToast({ type: 'warning', message: tr('subscription.pay.no_current', 'Please create a subscription first using Change plan, then pay.') })
      return
    }
    try {
      setPaying(true)
      const payload = { plan_slug: selectedPlan.slug, billing_interval: selectedInterval }
      const code = String(couponCode || '').trim()
      if (code) payload.coupon_code = code

      // 1) Create Razorpay order
      const { data } = await api.post('/subscription/razorpay/create-order/', payload)

      // 2) Load SDK and open checkout
      await loadRazorpayScript()
      if (!window.Razorpay) {
        throw new Error(tr('subscription.pay.sdk_missing', 'Razorpay SDK did not load. Please try again.'))
      }
      const options = {
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: tr('subscription.pay.title', 'Subscription'),
        description: `${selectedPlan.name} - ${intervalLabel(selectedInterval)}`,
        notes: data.notes || {},
        prefill: {
          name: (currentUser?.full_name || currentUser?.name || '').trim?.() || '',
          email: (currentUser?.email || '').trim?.() || '',
          contact: (currentUser?.phone || currentUser?.mobile || '').trim?.() || '',
        },
        handler: async function (resp) {
          try {
            // 3) Verify payment
            const vRes = await api.post('/subscription/razorpay/verify/', {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            })
            setCurrent(vRes.data)
            emitToast({ type: 'success', message: tr('subscription.pay.success', 'Payment successful. Subscription updated.') })
            // Clear coupon state
            setCouponPreview(null); setCouponCode(''); setCouponError('')
          } catch (e) {
            const msg = e?.response?.data?.detail || tr('subscription.pay.verify_failed', 'Payment verification failed.')
            emitToast({ type: 'error', message: msg })
          } finally {
            setPaying(false)
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false)
            emitToast({ type: 'info', message: tr('subscription.pay.cancelled', 'Payment cancelled.') })
          }
        },
        theme: { color: '#2563eb' },
      }
      const RZP = window.Razorpay
      if (!RZP) throw new Error(tr('subscription.pay.sdk_missing', 'Razorpay SDK did not load. Please try again.'))
      const rzp = new RZP(options)
      rzp.open()
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || tr('subscription.pay.initiate_failed', 'Failed to initiate payment.')
      emitToast({ type: 'error', message: msg })
      setPaying(false)
    }
  }

  const applyChangePlan = async () => {
    if (!isPGAdmin) {
      emitToast({ type: 'warning', message: tr('subscription.change_plan.only_pg_admin', 'Only PG Admin can change subscription.') })
      return
    }
    if (!selectedPlan) return
    try {
      setSaving(true)
      const payload = { plan_slug: selectedPlan.slug, billing_interval: selectedInterval }
      const code = String(couponCode || '').trim()
      if (code) payload.coupon_code = code
      const { data } = await api.post('/subscription/change-plan/', payload)
      setCurrent(data)
      const withCoupon = data?.meta?.applied_coupon?.code || code
      const msg = withCoupon
        ? tr('subscription.change_plan.success_with_coupon', 'Plan changed to {{name}} ({{interval}}). Coupon {{code}} applied.', { name: selectedPlan.name, interval: intervalLabel(selectedInterval), code: withCoupon })
        : tr('subscription.change_plan.success', 'Plan changed to {{name}} ({{interval}}).', { name: selectedPlan.name, interval: intervalLabel(selectedInterval) })
      emitToast({ type: 'success', message: msg })
      // Clear coupon state after successful change
      setCouponPreview(null)
      setCouponCode('')
      setCouponError('')
    } catch (e) {
      const msg = e?.response?.data?.detail || tr('subscription.change_plan.failed', 'Failed to change plan.')
      emitToast({ type: 'error', message: msg })
    } finally {
      setSaving(false)
    }
  }

  const renderPlanPrice = (plan, interval) => {
    const p = priceFor(plan, interval)
    if (!p) return <span className="text-gray-500">-</span>
    const months = (String(interval).endsWith('m') ? Number(String(interval).replace('m', '')) : 1)
    const unit = months > 1 ? `${months} mo` : 'mo'
    return (
      <span className="text-lg font-semibold">{fmtCurrency(p.amount, p.currency)}<span className="text-sm text-gray-500">/{unit} + GST</span></span>
    )
  }

  const scrollToPlans = () => {
    try {
      plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (_) {
      // no-op
    }
  }

  if (loading) {
    return (
      <Card title={tr('subscription.title', 'Subscription')} padding="sm">
        <div className="flex items-center justify-center py-10">
          <LoadingSpinner size="lg" label={tr('subscription.loading', 'Loading subscription...')} />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card title={tr('subscription.title', 'Subscription')} padding="sm">
        <div className="p-3 rounded-md border border-rose-200 bg-rose-50 text-rose-700 flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5" />
          <div>
            <div className="font-medium mb-0.5">{tr('subscription.errors.load_title', 'Failed to load subscription')}</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current subscription summary or empty state */}
      {!noCurrent ? (
        <Card
          title={(
            <div className="flex items-center gap-2">
              <span>{tr('subscription.current.title', 'Current Subscription')}</span>
            </div>
          )}
          description={null}
          actions={null}
          padding="sm"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">{tr('subscription.current.plan', 'Plan')}</p>
              <p className="text-sm font-medium">{current?.plan?.name || '—'}</p>
              <p className="text-[11px] inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                <span className="opacity-70">slug</span> {current?.plan?.slug || ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{tr('subscription.current.status', 'Status')}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {statusBadge(current?.status)}
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {intervalLabel(current?.billing_interval) || '—'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">{tr('subscription.current.period', 'Period')}</p>
              <p className="text-sm">{tr('subscription.current.start', 'Start')}: <span className="font-medium">{fmtDate(current?.current_period_start)}</span></p>
              <p className="text-sm">{tr('subscription.current.end', 'End')}: <span className="font-medium">{fmtDate(current?.current_period_end)}</span></p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <div>
              {current?.is_trial ? (
                <>
                  <p className="text-xs text-gray-500">{tr('subscription.current.trial_ends', 'Trial ends')}</p>
                  <p className="text-sm font-medium">{fmtDate(current?.trial_end)}</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500">{tr('subscription.current.next_renewal', 'Next renewal')}</p>
                  <p className="text-sm font-medium">{fmtDate(current?.current_period_end)}</p>
                </>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">{tr('subscription.current.price', 'Price')}</p>
              <p className="text-sm font-semibold">{current?.plan ? (renderPlanPrice(current.plan, current?.billing_interval)) : '—'}</p>
            </div>
            <div className="flex items-end justify-end">
              {!isPGAdmin && (
                <p className="text-xs text-gray-500">{tr('subscription.current.contact_admin', 'Contact the PG Admin to modify subscription.')}</p>
              )}
            </div>
          </div>
          {/* Applied coupon summary */}
          {current?.meta?.applied_coupon && (
            <div className="mt-3 text-xs border rounded-md p-2 bg-emerald-50 border-emerald-200 text-emerald-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between"><span>{tr('subscription.coupons.applied', 'Applied coupon')}</span><span className="font-mono font-semibold">{current.meta.applied_coupon.code}</span></div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between"><span>{tr('subscription.coupons.base', 'Base')}</span><span className="font-semibold">{fmtCurrency(Number(current.meta.applied_coupon.base_amount), current.meta.applied_coupon.currency)}</span></div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between"><span>{tr('subscription.coupons.discount', 'Discount')}</span><span className="font-semibold">- {fmtCurrency(Number(current.meta.applied_coupon.discount_amount), current.meta.applied_coupon.currency)}</span></div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between"><span>{tr('subscription.coupons.total', 'Total')}</span><span className="font-semibold">{fmtCurrency(Number(current.meta.applied_coupon.final_amount), current.meta.applied_coupon.currency)}</span></div>
              {(current?.meta?.gst_amount != null) && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between"><span>{tr('subscription.coupons.gst', 'GST')}{current?.meta?.gst_percent ? ` (${current.meta.gst_percent}%)` : ''}</span><span className="font-semibold">{fmtCurrency(Number(current.meta.gst_amount || 0), current?.meta?.currency || 'INR')}</span></div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-emerald-200 pt-1 mt-1"><span>{tr('subscription.coupons.grand_total', 'Grand total')}</span><span className="font-semibold">{fmtCurrency(Number(current.meta.gross_amount || 0), current?.meta?.currency || 'INR')}</span></div>
                </>
              )}
            </div>
          )}
          {/* GST breakdown even without coupon */}
          {(!current?.meta?.applied_coupon && (current?.meta?.gst_amount != null)) && (
            <div className="mt-3 text-xs border rounded-md p-2 bg-gray-50 border-gray-200 text-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between"><span>{tr('subscription.coupons.gst', 'GST')}{current?.meta?.gst_percent ? ` (${current.meta.gst_percent}%)` : ''}</span><span className="font-semibold">{fmtCurrency(Number(current.meta.gst_amount || 0), current?.meta?.currency || 'INR')}</span></div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-gray-200 pt-1 mt-1"><span>{tr('subscription.coupons.grand_total', 'Grand total')}</span><span className="font-semibold">{fmtCurrency(Number(current.meta.gross_amount || 0), current?.meta?.currency || 'INR')}</span></div>
            </div>
          )}
        </Card>
      ) : (
        <Card title={tr('subscription.title', 'Subscription')} description={<span className="text-gray-600">{tr('subscription.empty.desc', "You don't have an active subscription yet.")}</span>} padding="sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm text-gray-700">
              {tr('subscription.empty.cta', "You don't have any subscription. Please choose a plan to get started.")}
            </div>
            {noCurrentDetail && (
              <div className="w-full sm:w-auto mt-2 sm:mt-0 p-2 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5" />
                <div>{noCurrentDetail}</div>
              </div>
            )}
            {isPGAdmin ? (
              <button onClick={scrollToPlans} className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 transition text-white rounded-md shadow-sm">
                {tr('subscription.plans.browse', 'Browse plans')}
              </button>
            ) : (
              <p className="text-xs text-gray-500">{tr('subscription.current.contact_admin', 'Contact the PG Admin to subscribe.')}</p>
            )}
          </div>
        </Card>
      )}
      {/* Plans list */}
      <div ref={plansRef} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{tr('subscription.plans.title', 'Plans')}</h3>
        </div>

        <div className="relative rounded-2xl bg-gradient-to-r from-slate-50 to-white border border-slate-200/70 shadow-sm">

          {/* Slider viewport */}
          <div
            ref={sliderRef}
            className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth no-scrollbar"
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="flex gap-6 px-4 py-5 snap-x snap-mandatory scroll-px-6">
              {plans.map((plan) => (
                <div
                  key={plan.slug}
                  data-plan-card="1"
                  className={`snap-center flex-none min-w-[300px] max-w-[420px] w-[88%] sm:w-[360px] lg:w-[400px] h-full flex flex-col relative rounded-2xl border p-5 bg-white/80 backdrop-blur-md transition-all duration-300 ${selectedSlug === plan.slug ? 'border-blue-400 ring-2 ring-blue-200 shadow-xl scale-[1.01]' : 'border-slate-200/70 shadow-md'} hover:-translate-y-1 hover:shadow-xl hover:ring-1 hover:ring-blue-200/60 hover:scale-[1.01]`}
                >

                  {plan?.is_recommended && (
                    <span className="absolute -top-2 right-3 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow">
                      <Crown size={12} /> {tr('subscription.plans.recommended', 'Most popular')}
                    </span>
                  )}
                  <div className="flex-1">
                    <div className={`rounded-xl px-3 py-2 bg-gradient-to-r ${selectedSlug === plan.slug ? 'from-blue-50/80 to-indigo-50/80' : 'from-white/60 to-slate-50/60'} border border-slate-200/60 backdrop-blur`}> 
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-slate-900 tracking-tight">{plan.name}</h4>

                      {plan.slug === 'free' && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">{tr('subscription.plans.free', 'Free')}</span>
                      )}
                      {hasBestValue(plan, selectedInterval) && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          {tr('subscription.plans.best_value', 'Save {{percent}}% vs monthly', { percent: bestValuePercent(plan, selectedInterval) })}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-slate-800 space-y-0.5">
                      <div className="text-2xl font-bold tracking-tight">{renderPlanPrice(plan, selectedInterval)}</div>
                      {selectedSlug === plan.slug && couponPreview && couponPreview?.final_amount != null && (
                        <div className="text-sm">
                          <span className="line-through text-gray-500 mr-2">{priceFor(plan, selectedInterval) ? fmtCurrency(Number(priceFor(plan, selectedInterval).amount), priceFor(plan, selectedInterval).currency || 'INR') : ''}</span>
                          <span className="font-semibold text-emerald-700">{fmtCurrency(Number(couponPreview.final_amount || 0), couponPreview.currency || (priceFor(plan, selectedInterval)?.currency || 'INR'))}</span>
                          <span className="text-xs text-gray-500 ml-1">{tr('subscription.coupons.after_coupon', 'after coupon')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                  {/* Per-card interval selector (dropdown) */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-600">{tr('subscription.plans.billing_interval', 'Billing interval')}</span>
                    <div className="relative inline-block w-full">
                      <select
                        value={(selectedSlug === plan.slug && allowedIntervals.includes(selectedInterval)) ? selectedInterval : (allowedIntervals[0] || '1m')}
                        onChange={(e) => { setSelectedSlug(plan.slug); setSelectedInterval(e.target.value) }}
                        className={`w-full appearance-none pr-8 px-3 py-1.5 text-xs rounded-full border bg-white/80 backdrop-blur text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm ${selectedSlug === plan.slug ? 'border-blue-300' : 'border-slate-300'}`}
                      >
                        {allowedIntervals.map((intv) => (
                          <option key={`${plan.slug}-${intv}`} value={intv}>{intervalLabel(intv)}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
                    </div>
                  </div>

                  {hasBestValue(plan, selectedInterval) && (
                    <div className="mt-1 text-[11px] text-amber-700">{tr('subscription.plans.best_value', 'Best value: save {{percent}}% vs monthly', { percent: bestValuePercent(plan, selectedInterval) })}</div>
                  )}
                </div>
                {/* Limits/Features */}
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500">{tr('subscription.plans.included', 'Included')}</p>
                  <ul className="mt-1 space-y-1">
                    {Object.keys(plan.limits).length ? (
                      Object.entries(plan.limits).map(([k, v]) => (
                        <li key={k} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          <span className="flex-1">{limitKeyLabel(k)}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 font-medium border border-slate-200">{formatLimitValue(k, v)}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-gray-500">{tr('subscription.plans.no_limits', 'No specific limits listed.')}</li>
                    )}
                  </ul>
                </div>

                {/* Coupon + Actions (only on selected card show full controls) */}
                <div className="mt-4 space-y-2">
                  {selectedSlug === plan.slug && (
                    <>
                      {/* Coupon toggle */}
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCoupon((s) => !s)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-300 hover:border-blue-400 text-gray-700 bg-white shadow-sm"
                        >
                          <BadgePercent size={14} /> {showCoupon ? tr('subscription.coupons.hide', 'Hide coupon') : tr('subscription.coupons.have', 'Have a coupon?')}
                        </button>
                        {couponPreview?.coupon?.code && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                            <Tag size={12} /> {couponPreview.coupon.code}
                          </span>
                        )}
                      </div>
                        {showCoupon && (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                              placeholder={tr('subscription.coupons.placeholder', 'Enter coupon code')}
                              className="flex-1 px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-inner"
                            />
                            <button
                              type="button"
                              onClick={previewCoupon}
                              disabled={couponLoading}
                              className="px-3 py-2 rounded bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-60 shadow"
                            >
                              {couponLoading ? tr('common.checking', 'Checking…') : tr('subscription.coupons.preview', 'Preview')}
                            </button>
                          </div>
                        )}

                        {couponError && (
                          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 shadow-sm">{couponError}</div>
                        )}
                        {couponPreview && (
                          <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-2 shadow-sm">
                            <div className="flex items-center gap-1"><Sparkles size={14} /> {tr('subscription.coupons.preview_title', 'Coupon preview')}</div>
                            <div className="mt-1 grid grid-cols-1 gap-2">
                              <div>{tr('subscription.coupons.base', 'Base')}: <span className="font-semibold">{fmtCurrency(Number(couponPreview.base_amount || 0), couponPreview.currency || 'INR')}</span></div>
                              <div>{tr('subscription.coupons.discount', 'Discount')}: <span className="font-semibold">- {fmtCurrency(Number(couponPreview.discount_amount || 0), couponPreview.currency || 'INR')}</span></div>
                              <div>{tr('subscription.coupons.total', 'Total')}: <span className="font-semibold">{fmtCurrency(Number(couponPreview.final_amount || 0), couponPreview.currency || 'INR')}</span></div>
                              {couponPreview?.gst_amount != null && (
                                <>
                                  <div>{tr('subscription.coupons.gst', 'GST')}{couponPreview?.gst_percent ? ` (${couponPreview.gst_percent}%)` : ''}: <span className="font-semibold">{fmtCurrency(Number(couponPreview.gst_amount || 0), couponPreview.currency || 'INR')}</span></div>
                                  <div>{tr('subscription.coupons.grand_total', 'Grand total')}: <span className="font-semibold">{fmtCurrency(Number(couponPreview.gross_amount || 0), couponPreview.currency || 'INR')}</span></div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={applyChangePlan}
                        disabled={!isPGAdmin || saving || selectedSlug !== plan.slug}
                        className={`w-full px-3 py-2 rounded-lg text-white shadow-sm transition ${(!isPGAdmin || saving || selectedSlug !== plan.slug) ? 'bg-blue-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'} focus:outline-none focus:ring-2 focus:ring-blue-200`}
                      >
                        {saving && selectedSlug === plan.slug ? tr('common.applying', 'Applying…') : tr('subscription.plans.change', 'Change plan')}
                      </button>
                      <button
                        onClick={payWithRazorpay}
                        disabled={!isPGAdmin || paying || selectedSlug !== plan.slug || noCurrent || plan.slug === 'free' || couponLoading}
                        className={`w-full px-3 py-2 rounded-lg text-white shadow-sm transition ${(!isPGAdmin || paying || selectedSlug !== plan.slug || noCurrent || plan.slug === 'free' || couponLoading) ? 'bg-emerald-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'} focus:outline-none focus:ring-2 focus:ring-emerald-200`}
                      >
                        {plan.slug === 'free' ? tr('subscription.plans.free', 'Free plan') : (paying && selectedSlug === plan.slug ? tr('subscription.pay.opening', 'Opening…') : tr('subscription.pay.now', 'Pay now'))}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-slate-50 to-transparent rounded-l-xl" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent rounded-r-xl" />

          {/* Navigation arrows */}
          {totalSlides > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className={`hidden sm:flex items-center justify-center absolute left-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur border shadow ${currentSlide === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'} text-gray-700`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={nextSlide}
                disabled={currentSlide >= totalSlides - 1}
                className={`hidden sm:flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur border shadow ${currentSlide >= totalSlides - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'} text-gray-700`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {totalSlides > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goToSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'bg-blue-600 w-6 shadow-sm' : 'bg-gray-300 w-2 hover:bg-gray-400'} `}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Notes */}
      <div className="rounded-md border border-blue-200 bg-blue-50 text-blue-800 p-3 flex items-start gap-2">
        <Info size={18} className="mt-0.5" />
        <div>
          <p className="text-sm font-semibold">{tr('subscription.notes.title', 'Notes')}</p>
          <ul className="mt-2 pl-1 text-xs space-y-1 list-disc list-inside">
            <li>{tr('subscription.notes.billing', 'Billing uses 28-day months (1m = 28 days). Periods end at end of day in your timezone.')}</li>
            <li>{tr('subscription.notes.only_admin', 'Only PG Admin can change the subscription.')}</li>
            <li>{tr('subscription.notes.prices', 'Prices are displayed according to the selected interval where available.')}</li>
            <li>{tr('subscription.notes.coupons', 'Coupons may be limited by plan, interval, time window, or usage count.')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}