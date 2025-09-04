import React, { useState } from 'react'
import { Button, PermissionButton } from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import BookingForm from '../components/bookings/BookingForm'
import BookingsList from '../components/bookings/BookingsList'

const BookingsPage = () => {
  const [showForm, setShowForm] = useState(false)
  const [refreshSignal, setRefreshSignal] = useState(0)

  return (
    <div className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h1 className="text-lg sm:text-xl font-semibold">Bookings</h1>
        <PermissionButton
          module="bookings"
          action="add"
          scopeId="global"
          onClick={() => setShowForm(true)}
          reason={"You don't have permission to add bookings"}
          denyMessage={"Permission denied: cannot add bookings"}
          title="Permissions will be checked per building on submit"
        >
          Add Booking
        </PermissionButton>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Add Booking"
        maxWidth="xl"
      >
        <BookingForm
          mode="create"
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            setRefreshSignal((v) => v + 1)
          }}
        />
      </Modal>

      <BookingsList refreshSignal={refreshSignal} />
    </div>
  )
}

export default BookingsPage