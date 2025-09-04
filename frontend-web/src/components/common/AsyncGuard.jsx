import React from 'react'
import LoadingSpinner from '../ui/LoadingSpinner'

/**
 * AsyncGuard
 * Simple wrapper to guard UI against loading/error/empty states.
 *
 * Props:
 * - loading: boolean
 * - error: string | Error | null
 * - data: any (used to detect emptiness; optional)
 * - isEmpty: boolean (explicit override for empty state)
 * - spinnerSize: 'xs'|'sm'|'md'|'lg'|'xl'
 * - onRetry: function (optional)
 * - loadingFallback: ReactNode (optional)
 * - errorFallback: (err) => ReactNode | ReactNode (optional)
 * - emptyFallback: ReactNode (optional)
 * - className: string (optional)
 * - children: ReactNode | (ctx: { data: any }) => ReactNode
 */
const AsyncGuard = ({
  loading,
  error,
  data,
  isEmpty,
  spinnerSize = 'md',
  onRetry,
  loadingFallback,
  errorFallback,
  emptyFallback,
  className = '',
  children,
}) => {
  // Normalize error to a string message if provided
  const errMsg = error
    ? (typeof error === 'string' ? error : (error?.message || 'Something went wrong'))
    : ''

  // Determine empty state
  const empty = typeof isEmpty === 'boolean'
    ? isEmpty
    : (Array.isArray(data) ? data.length === 0 : data == null)

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-6 ${className}`}>
        {loadingFallback || <LoadingSpinner size={spinnerSize} label="Loading data..." />}
      </div>
    )
  }

  if (errMsg) {
    if (typeof errorFallback === 'function') return errorFallback(error)
    if (errorFallback) return errorFallback
    return (
      <div className={`p-4 rounded-md border border-red-200 bg-red-50 text-red-700 ${className}`}>
        <div className="flex items-start gap-2">
          <svg className="h-5 w-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.5a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0v-4zM10 13.5a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd"/></svg>
          <div className="flex-1">
            <div className="font-medium">{errMsg}</div>
            {onRetry && (
              <button type="button" onClick={onRetry} className="mt-2 text-sm text-red-800 underline hover:no-underline">
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (empty) {
    if (emptyFallback) return (
      <div className={className}>{emptyFallback}</div>
    )
    return (
      <div className={`p-4 rounded-md border border-gray-200 bg-white text-gray-600 ${className}`}>
        No data found
      </div>
    )
  }

  const content = typeof children === 'function' ? children({ data }) : children
  return <>{content}</>
}

export default AsyncGuard
