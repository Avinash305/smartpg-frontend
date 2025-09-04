import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Card from '../ui/Card'

export default function RequireSubscription({ children, showCTA = true }) {
  const { hasSubscription, isPGAdmin, subscriptionError } = useAuth()
  const navigate = useNavigate()

  if (!hasSubscription) {
    return (
      <Card title="Active subscription required" padding="sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-700">
              {subscriptionError || "You don't have an active subscription. Please choose a plan to continue."}
            </div>
            <div className="text-xs text-gray-500 mt-1">Only PG Admins can purchase a plan.</div>
          </div>
          {showCTA ? (
            isPGAdmin ? (
              <button
                onClick={() => navigate('/settings?tab=subscription')}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 transition text-white rounded-md shadow-sm"
              >
                Browse plans
              </button>
            ) : (
              <button
                disabled
                title="Only PG Admin can purchase a plan"
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md shadow-sm cursor-not-allowed"
              >
                Browse plans
              </button>
            )
          ) : null}
        </div>
      </Card>
    )
  }

  return children
}
