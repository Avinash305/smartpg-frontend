import React from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { ShieldCheck, Building2, Users, CalendarClock, FileSpreadsheet, PiggyBank, Globe2, LockKeyhole, Quote, ChevronDown, Play, ArrowUp, MessageCircleMore } from 'lucide-react'

// Animations
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

// Helpers
const Counter = ({ from = 0, to = 100, duration = 1.2, suffix = '' }) => {
  const value = useMotionValue(from)
  const rounded = useTransform(value, latest => Math.round(latest))
  React.useEffect(() => {
    const controls = animate(value, to, { duration, ease: 'easeOut' })
    return controls.stop
  }, [to])
  return <span>{React.useMemo(() => null, [to]) /* force re-render on to change */}{/* eslint-disable-next-line */}{/* display */}</span> || <span>{to}{suffix}</span>
}

// Feature card
const Feature = ({ icon: Icon, title, desc, delay = 0 }) => (
  <motion.div
    variants={fadeUp}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ delay }}
    className="group rounded-xl border border-gray-200/60 bg-white/80 p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
  >
    <div className="flex items-start gap-4">
      <div className="rounded-lg bg-blue-600/10 p-2.5 text-blue-700 ring-1 ring-blue-600/15">
        <Icon className="size-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  </motion.div>
)

// Animated Stat
const AnimatedStat = ({ label, value, suffix = '' }) => {
  const mv = useMotionValue(0)
  const [display, setDisplay] = React.useState(0)
  React.useEffect(() => {
    const num = typeof value === 'number' ? value : parseInt(String(value).replace(/\D/g, ''), 10) || 0
    const controls = animate(mv, num, { duration: 1.4 })
    const unsub = mv.on('change', v => setDisplay(Math.round(v)))
    return () => {
      controls.stop()
      unsub()
    }
  }, [value])
  return (
    <div className="rounded-xl bg-white/80 p-4 ring-1 ring-inset ring-gray-200 shadow-sm">
      <p className="text-2xl font-extrabold tracking-tight text-gray-900">{display}{suffix}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
    </div>
  )
}

const Testimonial = ({ quote, author, role }) => (
  <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
    <Quote className="size-6 text-blue-600/70" />
    <p className="mt-3 text-sm leading-relaxed text-gray-700">“{quote}”</p>
    <div className="mt-4 text-sm">
      <p className="font-semibold text-gray-900">{author}</p>
      <p className="text-gray-500">{role}</p>
    </div>
  </div>
)

const Step = ({ index, icon: Icon, title, desc }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-start gap-4">
      <div className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">{index}</div>
      <div>
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-blue-700" />
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="mt-1 text-sm text-gray-600">{desc}</p>
      </div>
    </div>
  </div>
)

const ContactCard = () => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
    <h3 className="text-lg font-bold text-gray-900">Need a guided demo?</h3>
    <p className="mt-1 text-sm text-gray-600">We’ll walk you through property setup, staff permissions and billing workflows.</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <Link to="/register" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">Book a demo</Link>
      <Link to="/login" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Sign in</Link>
    </div>
  </div>
)

const ContactForm = () => {
  const [form, setForm] = React.useState({ name: '', email: '', message: '' })
  const onSubmit = (e) => {
    e.preventDefault()
    console.log('Contact form:', form)
    setForm({ name: '', email: '', message: '' })
  }
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900">Contact us</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input value={form.name} onChange={(e)=>setForm(s=>({...s,name:e.target.value}))} placeholder="Full name" required className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600" />
        <input type="email" value={form.email} onChange={(e)=>setForm(s=>({...s,email:e.target.value}))} placeholder="Email address" required className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600" />
        <textarea value={form.message} onChange={(e)=>setForm(s=>({...s,message:e.target.value}))} placeholder="Message" rows={4} className="sm:col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600" />
      </div>
      <button type="submit" className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">Send</button>
    </form>
  )
}

const Newsletter = () => {
  const [email, setEmail] = React.useState('')
  const onSubmit = (e) => {
    e.preventDefault()
    console.log('Newsletter signup:', email)
    setEmail('')
  }
  return (
    <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 p-6 ring-1 ring-inset ring-blue-100">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Get product updates</h3>
          <p className="mt-1 text-sm text-gray-600">New features, tips and best practices—straight to your inbox.</p>
        </div>
        <form onSubmit={onSubmit} className="flex w-full max-w-md items-center gap-2">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Subscribe</button>
        </form>
      </div>
    </div>
  )
}

const BackToTop = () => {
  const [show, setShow] = React.useState(false)
  React.useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!show) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-5 right-5 z-30 rounded-full bg-gray-900/90 p-3 text-white shadow-lg hover:bg-gray-800"
      aria-label="Back to top"
    >
      <ArrowUp className="size-5" />
    </button>
  )
}

const WhatsAppButton = () => (
  <a
    href="https://wa.me/917026943730?text=Hi%20PG%20Management%20System%2C%20I%20would%20like%20a%20demo."
    target="_blank"
    rel="noreferrer"
    className="fixed bottom-5 left-5 z-30 flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-emerald-600"
  >
    <MessageCircleMore className="size-4" /> WhatsApp
  </a>
)

const CookieConsent = () => {
  const [show, setShow] = React.useState(false)
  React.useEffect(() => {
    const ok = localStorage.getItem('cookieConsent')
    setShow(!ok)
  }, [])
  if (!show) return null
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700">We use cookies to improve your experience. By using our site, you agree to our privacy policy.</p>
        <div className="flex gap-2">
          <Link to="#" className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Learn more</Link>
          <button onClick={() => { localStorage.setItem('cookieConsent', '1'); setShow(false) }} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">Accept</button>
        </div>
      </div>
    </div>
  )
}

const LogosCarousel = () => {
  const items = ['NestAway', 'Colive', 'Stanza', 'OYO Life', 'Zolo', 'YourSpace', 'HelloWorld']
  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex min-w-max gap-8 py-2 text-sm text-gray-600"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
      >
        {[...items, ...items].map((item, i) => (
          <span key={i} className="opacity-70">{item}</span>
        ))}
      </motion.div>
    </div>
  )
}

const VideoModal = ({ open, onClose }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 bg-black/60 p-4" onClick={onClose}>
      <div className="mx-auto mt-10 max-w-4xl" onClick={(e)=>e.stopPropagation()}>
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
          <iframe
            className="h-full w-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
            title="Demo video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  )
}

const Home = () => {
  // SEO basics
  React.useEffect(() => {
    document.title = 'PG Management System — Manage properties, tenants, and billing'
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); return m
    })()
    meta.setAttribute('content', 'Modern PG/Hostel management: multi-property, RBAC, OTP onboarding, smart bookings, invoice settings, and more.')
  }, [])

  const [videoOpen, setVideoOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      {/* Decorative blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-40 -top-24 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      {/* Top nav */}
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="inline-block h-8 w-8 rounded-md bg-blue-600/10 ring-1 ring-blue-600/20" />
              <span className="text-lg font-bold tracking-tight text-gray-900">PG Management System</span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Login</Link>
              <Link to="/register" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">Get Started</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_60rem_at_50%_-5rem,rgba(37,99,235,0.08),transparent_60%)]" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
            <motion.div variants={fadeUp} initial="hidden" animate="show">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-600/20 bg-blue-600/5 px-3 py-1 text-xs font-medium text-blue-700">
                <span className="size-1.5 rounded-full bg-blue-600" />
                Built for PG/Hostel Operators
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
                Streamline your PG operations end‑to‑end
              </h1>
              <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
                Manage buildings, rooms, beds, tenants, bookings, invoices and payments with powerful role‑based access, OTP‑secured onboarding and flexible billing settings.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/register" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                  Create free account
                </Link>
                <button onClick={() => setVideoOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                  <Play className="size-4" /> Watch demo
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-500">JWT‑secured • i18n enabled • Works on mobile and desktop</p>
            </motion.div>

            {/* Screenshot card */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-lg sm:max-w-lg">
                <div className="aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-white ring-1 ring-inset ring-gray-200">
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">Dashboard screenshot placeholder</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
                  <div className="rounded-lg border border-gray-200 p-2">Properties & Tenants</div>
                  <div className="rounded-lg border border-gray-200 p-2">Bookings & Billing</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Logos carousel */}
      <section className="py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <LogosCarousel />
        </div>
      </section>

      {/* Stats strip (animated) */}
      <section className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AnimatedStat label="Avg. Occupancy" value={92} suffix="%" />
            <AnimatedStat label="Properties Managed" value={120} suffix="+" />
            <AnimatedStat label="Tenants" value={5000} suffix="+" />
            <AnimatedStat label="Invoices Generated" value={50000} suffix="+" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Everything you need to run your PG</h2>
            <p className="mt-2 text-sm text-gray-600">Powered by a robust Django + DRF backend, JWT auth and modern React frontend.</p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature delay={0.0} icon={Building2} title="Multi‑property management" desc="Create buildings, floors, rooms & beds. Keep occupancy and availability in sync." />
            <Feature delay={0.05} icon={ShieldCheck} title="RBAC for staff" desc="Fine‑grained, per‑module, per‑building permissions ensure staff only act within scope." />
            <Feature delay={0.1} icon={LockKeyhole} title="OTP‑first onboarding" desc="Add staff with email verification before user creation for better security." />
            <Feature delay={0.15} icon={FileSpreadsheet} title="Invoice Settings" desc="Flexible frequency, cycle start and auto‑generation per admin or per building." />
            <Feature delay={0.2} icon={CalendarClock} title="Smart bookings" desc="Track bookings, check‑ins/outs and due dates aligned with your invoice rules." />
            <Feature delay={0.25} icon={PiggyBank} title="Payments & expenses" desc="Record payments and expenses with clear cashflow snapshots and trends." />
            <Feature delay={0.3} icon={Users} title="Tenant management" desc="Centralize tenant profiles, history and bed assignment changes." />
            <Feature delay={0.35} icon={Globe2} title="i18n ready" desc="Multi‑language UI via i18next with dynamic document titles." />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="pb-6 sm:pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6 ring-1 ring-inset ring-blue-100">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Testimonial quote="Setup was quick and our team loves the simple booking flow." author="Aarav S." role="PG Owner, Bengaluru" />
              <Testimonial quote="OTP onboarding for staff is a game changer for security." author="Neha P." role="Operations Lead" />
              <Testimonial quote="Invoice settings match our monthly cycle perfectly." author="Rohit K." role="Accounts" />
            </div>
          </div>
        </div>
      </section>

      {/* Integrations strip */}
      <section className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-gray-600">
            <span className="font-semibold text-gray-800">Integrations</span>
            <span className="opacity-70">Django</span>
            <span className="opacity-70">DRF</span>
            <span className="opacity-70">Celery</span>
            <span className="opacity-70">Redis</span>
            <span className="opacity-70">S3/Cloudinary</span>
            <span className="opacity-70">React</span>
            <span className="opacity-70">Vite</span>
            <span className="opacity-70">Tailwind</span>
            <span className="opacity-70">React Query</span>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Simple pricing</h2>
            <p className="mt-2 text-sm text-gray-600">Start free. Upgrade anytime as your properties grow.</p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex h-full flex-col rounded-2xl border p-6 shadow-sm border-gray-200 bg-white">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">Starter</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-gray-900">Free</span>
                  <span className="text-xs text-gray-500">/forever</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2"><span className="mt-1 inline-block size-1.5 rounded-full bg-blue-600" /><span>1 property</span></li>
                <li className="flex items-start gap-2"><span className="mt-1 inline-block size-1.5 rounded-full bg-blue-600" /><span>Unlimited rooms & beds</span></li>
                <li className="flex items-start gap-2"><span className="mt-1 inline-block size-1.5 rounded-full bg-blue-600" /><span>Email support</span></li>
              </ul>
              <div className="mt-5">
                <Link to="/register" className="inline-flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm ring-1 ring-inset ring-gray-300 text-gray-900 hover:bg-gray-50">Get started</Link>
              </div>
            </div>
            <div className="flex h-full flex-col rounded-2xl border p-6 shadow-sm border-blue-600/30 ring-2 ring-blue-600/20 bg-blue-50/30">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">Pro</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-gray-900">₹9</span>
                  <span className="text-xs text-gray-500">/month</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2"><span className="mt-1 inline-block size-1.5 rounded-full bg-blue-600" /><span>Up to 10 properties</span></li>
                <li className="flex items-start gap-2"><span className="mt-1 inline-block size-1.5 rounded-full bg-blue-600" /><span>Advanced permissions (RBAC)</span></li>
                <li className="flex items-start gap-2"><span className="mt-1 inline-block size-1.5 rounded-full bg-blue-600" /><span>Invoice settings & exports</span></li>
              </ul>
              <div className="mt-5">
                <Link to="/register" className="inline-flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm bg-blue-600 text-white hover:bg-blue-500">Get started</Link>
              </div>
            </div>
            <div className="flex h-full flex-col rounded-2xl border p-6 shadow-sm border-gray-200 bg-white">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">Enterprise</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-gray-900">Custom</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2"><span className="mt-1 inline-block size-1.5 rounded-full bg-blue-600" /><span>Unlimited properties</span></li>
                <li className="flex items-start gap-2"><span className="mt-1 inline-block size-1.5 rounded-full bg-blue-600" /><span>Priority support</span></li>
                <li className="flex items-start gap-2"><span className="mt-1 inline-block size-1.5 rounded-full bg-blue-600" /><span>Custom integrations</span></li>
              </ul>
              <div className="mt-5">
                <Link to="/register" className="inline-flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm ring-1 ring-inset ring-gray-300 text-gray-900 hover:bg-gray-50">Contact sales</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-6 sm:py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Frequently asked questions</h2>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white">
              <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="text-sm font-semibold text-gray-900">How do staff permissions work?</span>
                <ChevronDown className="size-4 text-gray-500" />
              </button>
              <div className="px-4 pb-4 text-sm leading-relaxed text-gray-600">Admins grant staff access per module (buildings, rooms, bookings, etc.) and per building, ensuring actions stay within scope.</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white">
              <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="text-sm font-semibold text-gray-900">What is OTP‑first onboarding?</span>
                <ChevronDown className="size-4 text-gray-500" />
              </button>
              <div className="px-4 pb-4 text-sm leading-relaxed text-gray-600">When adding a staff user, we send an email verification code and only create the account after successful verification.</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white">
              <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="text-sm font-semibold text-gray-900">Can I customize invoice cycles?</span>
                <ChevronDown className="size-4 text-gray-500" />
              </button>
              <div className="px-4 pb-4 text-sm leading-relaxed text-gray-600">Yes. Use Invoice Settings to set frequency (monthly), cycle start (check‑in date) and auto‑generation behavior per admin or building.</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white">
              <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="text-sm font-semibold text-gray-900">Is my data secure?</span>
                <ChevronDown className="size-4 text-gray-500" />
              </button>
              <div className="px-4 pb-4 text-sm leading-relaxed text-gray-600">We use JWT authentication, secure APIs, and follow best practices. You control access via RBAC and can revoke tokens anytime.</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">How it works</h2>
            <p className="mt-2 text-sm text-gray-600">Get started in minutes with a simple, secure workflow.</p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Step index={1} icon={Building2} title="Add properties" desc="Create buildings, floors, rooms and beds to mirror your real inventory." />
            <Step index={2} icon={LockKeyhole} title="Onboard staff (OTP)" desc="Invite staff and verify via email OTP before creating their accounts." />
            <Step index={3} icon={Users} title="Manage tenants" desc="Add tenants, assign beds and track bookings and check‑ins/outs." />
            <Step index={4} icon={FileSpreadsheet} title="Automate billing" desc="Configure invoice settings and generate invoices on schedule." />
          </div>
        </div>
      </section>

      {/* Trust logos */}
      <section className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-white p-4 ring-1 ring-inset ring-gray-200">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-gray-600">
              <span className="font-semibold text-gray-800">Trusted by PGs across</span>
              <span className="opacity-70">Bengaluru</span>
              <span className="opacity-70">Hyderabad</span>
              <span className="opacity-70">Pune</span>
              <span className="opacity-70">Chennai</span>
              <span className="opacity-70">Mumbai</span>
              <span className="opacity-70">Delhi NCR</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-6 sm:py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <ContactCard />
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-6 sm:py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Newsletter />
        </div>
      </section>

      {/* CTA */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 sm:p-8">
            <div className="absolute inset-0 opacity-10 [background:radial-gradient(60rem_60rem_at_80%_-10%,white,transparent_60%)]" />
            <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Start managing your PG smarter</h3>
                <p className="mt-1 text-sm text-blue-50">Free to try. Secure by design. Optimized for India (Asia/Kolkata).</p>
              </div>
              <div className="flex gap-3">
                <Link to="/register" className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50">Create account</Link>
                <Link to="/login" className="rounded-lg bg-blue-500/60 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 hover:bg-blue-500">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating CTA (top-right position adjusted due to BackToTop) */}
      <div className="fixed bottom-5 right-20 z-20 hidden sm:block">
        <Link to="/register" className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-500">
          Create free account
        </Link>
      </div>

      {/* Floating helpers */}
      <BackToTop />
      <WhatsAppButton />
      <CookieConsent />
      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />

      {/* Footer */}
      <footer className="border-t border-gray-200/80 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-gray-500"> 2023 PG Management System</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <Link to="#" className="hover:text-gray-900">Privacy</Link>
              <Link to="/terms-and-conditions" className="hover:text-gray-900">Terms</Link>
              <Link to="/shipping-delivery-policy" className="hover:text-gray-900">Shipping & Delivery</Link>
              <Link to="/cancellation-refund-policy" className="hover:text-gray-900">Cancellation & Refund</Link>
              <Link to="#" className="hover:text-gray-900">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home