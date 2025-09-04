import React from 'react'
import { Link } from 'react-router-dom'

const CancellationRefundPolicy = () => {
  React.useEffect(() => {
    document.title = 'Cancellation & Refund Policy — PG Management System'
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
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Cancellation & Refund Policy</h1>
            <div className="prose prose-sm sm:prose base mt-4 max-w-none text-gray-700 space-y-4">
              <p>
                AVINASH believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. Under this policy:
              </p>
              <p>
                Cancellations will be considered only if the request is made within Not Applicable of placing the order. However, the cancellation request may not be entertained if the orders have been communicated to the vendors/merchants and they have initiated the process of shipping them.
              </p>
              <p>
                AVINASH does not accept cancellation requests for perishable items like flowers, eatables etc. However, refund/replacement can be made if the customer establishes that the quality of product delivered is not good.
              </p>
              <p>
                In case of receipt of damaged or defective items please report the same to our Customer Service team. The request will, however, be entertained once the merchant has checked and determined the same at his own end. This should be reported within Not Applicable of receipt of the products.
              </p>
              <p>
                In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our customer service within Not Applicable of receiving the product. The Customer Service Team after looking into your complaint will take an appropriate decision.
              </p>
              <p>
                In case of complaints regarding products that come with a warranty from manufacturers, please refer the issue to them.
              </p>
              <p>
                In case of any Refunds approved by the AVINASH, it'll take Not Applicable for the refund to be processed to the end customer.
              </p>
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

export default CancellationRefundPolicy
