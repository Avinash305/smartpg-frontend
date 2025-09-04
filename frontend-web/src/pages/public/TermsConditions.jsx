import React from 'react'
import { Link } from 'react-router-dom'

const TermsConditions = () => {
  React.useEffect(() => {
    document.title = 'Terms & Conditions — PG Management System'
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
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Terms & Conditions</h1>
            <div className="prose prose-sm sm:prose base mt-4 max-w-none text-gray-700 space-y-4">
              <p>
                For the purpose of these Terms and Conditions, The term "we", "us", "our" used anywhere on this page shall mean AVINASH, whose registered/operational office is 2nd main road Rajajinagar Bengaluru KARNATAKA 560010 . "you", "your", "user", "visitor" shall mean any natural or legal person who is visiting our website and/or agreed to purchase from us.
              </p>
              <p>
                Your use of the website and/or purchase from us are governed by following Terms and Conditions:
              </p>
              <p>
                The content of the pages of this website is subject to change without notice.
              </p>
              <p>
                Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials found or offered on this website for any particular purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.
              </p>
              <p>
                Your use of any information or materials on our website and/or product pages is entirely at your own risk, for which we shall not be liable. It shall be your own responsibility to ensure that any products, services or information available through our website and/or product pages meet your specific requirements.
              </p>
              <p>
                Our website contains material which is owned by or licensed to us. This material includes, but are not limited to, the design, layout, look, appearance and graphics. Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.
              </p>
              <p>
                All trademarks reproduced in our website which are not the property of, or licensed to, the operator are acknowledged on the website.
              </p>
              <p>
                Unauthorized use of information provided by us shall give rise to a claim for damages and/or be a criminal offense.
              </p>
              <p>
                From time to time our website may also include links to other websites. These links are provided for your convenience to provide further information.
              </p>
              <p>
                You may not create a link to our website from another website or document without AVINASH's prior written consent.
              </p>
              <p>
                Any dispute arising out of use of our website and/or purchase with us and/or any engagement with us is subject to the laws of India .
              </p>
              <p>
                We, shall be under no liability whatsoever in respect of any loss or damage arising directly or indirectly out of the decline of authorization for any Transaction, on Account of the Cardholder having exceeded the preset limit mutually agreed by us with our acquiring bank from time to time
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

export default TermsConditions
