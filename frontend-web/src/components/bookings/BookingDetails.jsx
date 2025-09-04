import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Button } from '../ui/Button'
import BookingActions from './BookingActions'
import { FiArrowLeft } from 'react-icons/fi'
import PaymentHistory from '../payment/PaymentHistory'
import MovedBookingHistory from './MovedBookingHistory'
import { formatDateOnly, formatDateTime, formatCurrency } from '../../utils/dateUtils'

// Status helpers to keep color scheme consistent with list
const formatStatusLabel = (s) => String(s || '-').replace(/_/g, ' ')
const getStatusBadgeClass = (s) => {
  switch (String(s || '')) {
    case 'pending':
      return 'text-amber-700 bg-amber-50 border border-amber-200'
    case 'reserved':
      return 'text-indigo-700 bg-indigo-50 border border-indigo-200'
    case 'confirmed':
      return 'text-emerald-700 bg-emerald-50 border border-emerald-200'
    case 'canceled':
      return 'text-red-700 bg-red-50 border border-red-200'
    case 'no_show':
      return 'text-slate-700 bg-slate-50 border border-slate-200'
    default:
      return 'text-gray-700 bg-gray-50 border border-gray-200'
  }
}

export default function BookingDetails() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const reload = async () => {
    if (!id) return
    try {
      const res = await api.get(`/bookings/bookings/${id}/`)
      setData(res.data)
    } catch (e) {
      const status = e?.response?.status
      if (status === 404) {
        // Booking removed (likely hard deleted) -> go back to list
        navigate('/bookings', { replace: true })
        return
      }
      // ignore others, keep previous data
    }
  }

  useEffect(() => {
    let active = true
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get(`/bookings/bookings/${id}/`)
        if (active) setData(res.data)
      } catch (e) {
        const status = e?.response?.status
        if (status === 404) {
          // If directly landed on a now-deleted booking, send back to list
          navigate('/bookings', { replace: true })
          return
        }
        if (active) setError('Failed to load booking')
      } finally {
        if (active) setLoading(false)
      }
    }
    if (id) run()
    return () => { active = false }
  }, [id])

  if (loading) return <div className="p-4">Loading...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>
  if (!data) return <div className="p-4">Not found</div>

  return (
    <div className="p-4 space-y-4">
      <Link to="/bookings"><Button variant="outline"><FiArrowLeft /> Back</Button></Link>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Booking #{data.id}</h1>
        <div className="flex items-center gap-2">
          <BookingActions booking={data} onChanged={reload} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium mb-2">Details</h2>
          <ul className="text-sm space-y-1">
            <li>
              <span className="text-gray-500">Status:</span>
              <span className={`ml-2 capitalize inline-flex items-center px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(data.status)}`}>
                {formatStatusLabel(data.status)}
              </span>
            </li>
            <li><span className="text-gray-500">Source:</span> <span className="capitalize">{String(data.source || '-').replace(/_/g, ' ')}</span></li>
            <li><span className="text-gray-500">Start:</span> {formatDateOnly(data.start_date)}</li>
            <li><span className="text-gray-500">End:</span> {formatDateOnly(data.end_date)}</li>
            <li><span className="text-gray-500">Booked at:</span> {data.booked_at ? formatDateTime(data.booked_at) : 'N/A'}</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium mb-2">Tenant & Property</h2>
          <ul className="text-sm space-y-1">
            <li>
              <span className="text-gray-500">Tenant:</span> {data.tenant ? (
                <Link className="text-blue-600 hover:underline" to={`/tenants/${data.tenant}`}>{data.tenant_name || data.tenant_full_name || 'Tenant'}</Link>
              ) : (data.tenant_name || 'N/A')}
            </li>
            <li><span className="text-gray-500">Building:</span> {data.building_name || data.building || 'N/A'}</li>
            <li><span className="text-gray-500">Floor:</span> {data.floor_display || data.floor || 'N/A'}</li>
            <li><span className="text-gray-500">Room:</span> {data.room_number || data.room || 'N/A'}</li>
            <li><span className="text-gray-500">Bed:</span> {data.bed_number || data.bed || 'N/A'}</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-4 md:col-span-2">
          <h2 className="font-medium mb-2">Pricing</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-gray-500">Monthly Rent</div><div className="font-medium">{formatCurrency(data.monthly_rent || 0)}</div></div>
            <div><div className="text-gray-500">Security Deposit</div><div className="font-medium">{formatCurrency(data.security_deposit || 0)}</div></div>
            <div><div className="text-gray-500">Discount</div><div className="font-medium">{formatCurrency(data.discount_amount || 0)}</div></div>
            <div><div className="text-gray-500">Maintenance</div><div className="font-medium">{formatCurrency(data.maintenance_amount || 0)}</div></div>
          </div>
        </div>

        {data.notes ? (
          <div className="bg-white rounded-lg shadow p-4 md:col-span-2">
            <h2 className="font-medium mb-2">Notes</h2>
            <p className="text-sm whitespace-pre-wrap">{data.notes}</p>
          </div>
        ) : null}

        <div className="bg-white rounded-lg shadow p-4 md:col-span-2">
          <h2 className="font-medium mb-2">Movement History</h2>
          <MovedBookingHistory
            bookingId={data.id}
            limit={10}
            refreshKey={`${data.floor || data.floor_id || ''}-${data.room || data.room_id || ''}-${data.bed || data.bed_id || ''}-${data.updated_at || data.booked_at || ''}`}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-4 md:col-span-2">
          <h2 className="font-medium mb-2">Payment History</h2>
          <PaymentHistory bookingId={data.id} limit={10} />
        </div>
      </div>
    </div>
  )
}