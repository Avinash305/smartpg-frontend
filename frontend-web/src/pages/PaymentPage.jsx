import React from 'react'
import PaymentHistory from '../components/payment/PaymentHistory'
import { PermissionButton } from '../components/ui/Button'
import Card from '../components/ui/Card'
import InvoiceList from '../components/invoice/InvoiceList'
import Modal from '../components/ui/Modal'
import PaymentForm from '../components/payment/PaymentForm'

const PaymentPage = () => {
  const [showNew, setShowNew] = React.useState(false)
  const [phKey, setPhKey] = React.useState(0)
  const [selectedBuildingIds, setSelectedBuildingIds] = React.useState([])

  // Initialize from Navbar's global building filter and subscribe to changes
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('building_filter')
      const arr = raw ? JSON.parse(raw) : []
      const ids = Array.isArray(arr) ? arr.map((v) => Number(v)).filter((n) => !Number.isNaN(n)) : []
      setSelectedBuildingIds(ids)
    } catch {}
    const handler = (e) => {
      const arr = (e?.detail?.selected || []).map((v) => Number(v)).filter((n) => !Number.isNaN(n))
      setSelectedBuildingIds(arr)
      setPhKey((k) => k + 1)
    }
    window.addEventListener('building-filter-change', handler)
    return () => window.removeEventListener('building-filter-change', handler)
  }, [])

  return (
    <div className="container mx-auto p-4">
      
      <div className="flex justify-between mb-4">
        <div className="flex justify-end w-full">
          <div>
            <PermissionButton
              module="payments"
              action="add"
              scopeId={selectedBuildingIds.length === 1 ? selectedBuildingIds[0] : 'global'}
              onClick={() => setShowNew(true)}
              reason={selectedBuildingIds.length === 1 ? "You don't have permission to record payments in this building" : "You don't have permission to record payments"}
              denyMessage={selectedBuildingIds.length === 1 ? "Permission denied: cannot record payments for this building" : "Permission denied: cannot record payments"}
            >
              New Payment
            </PermissionButton>
          </div>
        </div>
      </div>
      <PaymentHistory key={phKey} className="mt-4" buildings={selectedBuildingIds} />

      <Card title="Invoices" padding="sm">
        <InvoiceList limit={10} buildings={selectedBuildingIds} />
      </Card>

      <Modal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        title="New Payment"
        maxWidth="md"
      >
        <PaymentForm
          onCancel={() => setShowNew(false)}
          onSuccess={() => { setShowNew(false); setPhKey(k => k + 1) }}
        />
      </Modal>
    </div>
  )
}

export default PaymentPage