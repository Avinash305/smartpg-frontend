import React from 'react'
import { Link } from 'react-router-dom'

const ShippingDeliveryPolicy = () => {
  React.useEffect(() => {
    document.title = 'Shipping & Delivery Policy — PG Management System'
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
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

      <main className="py-10 sm:py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Shipping & Delivery Policy</h1>
            <div className="prose prose-sm sm:prose base mt-4 max-w-none text-gray-700">
              <p>
                For International buyers, orders are shipped and delivered through registered international courier companies and/or International speed post only. For domestic buyers, orders are shipped through registered domestic courier companies and /or speed post only. Orders are shipped within Not Applicable or as per the delivery date agreed at the time of order confirmation and delivering of the shipment subject to Courier Company / post office norms. AVINASH is not liable for any delay in delivery by the courier company / postal authorities and only guarantees to hand over the consignment to the courier company or postal authorities within Not Applicable rom the date of the order and payment or as per the delivery date agreed at the time of order confirmation. Delivery of all orders will be to the address provided by the buyer. Delivery of our services will be confirmed on your mail ID as specified during registration. For any issues in utilizing our services you may contact our helpdesk on 7026943730 or avinashpujari2244@gmail.com
              </p>
            </div>

            <div className="mt-6 grid gap-2 text-sm text-gray-700">
              <div>
                Helpdesk: <a href="tel:+917026943730" className="text-blue-700 hover:underline">+91 7026943730</a>
              </div>
              <div>
                Email: <a href="mailto:avinashpujari2244@gmail.com" className="text-blue-700 hover:underline">avinashpujari2244@gmail.com</a>
              </div>
            </div>

            <div className="mt-8">
              <Link to="/" className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200/80 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-gray-500"> 2023 PG Management System</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <Link to="/" className="hover:text-gray-900">Home</Link>
              <Link to="#" className="hover:text-gray-900">Privacy</Link>
              <Link to="#" className="hover:text-gray-900">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default ShippingDeliveryPolicy
