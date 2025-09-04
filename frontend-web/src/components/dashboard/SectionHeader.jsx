import React, { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'

// Simple initials avatar from name/email
const Avatar = ({ name = '', photoUrl = '' }) => {
  const initials = useMemo(() => {
    const str = String(name || '').trim() || ''
    if (!str) return 'U'
    const parts = str.split(/\s+/)
    const a = (parts[0] || '')[0] || ''
    const b = (parts[1] || '')[0] || ''
    return (a + b).toUpperCase() || 'U'
  }, [name])

  if (photoUrl) {
    return (
      <img  
        src={photoUrl}
        alt={name}
        className="h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover ring-2 ring-white/40 shadow"
      />
    )
  }
  return (
    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white/20 text-white flex items-center justify-center text-lg sm:text-xl font-semibold ring-2 ring-white/40 shadow select-none">
      {initials}
    </div>
  )
}

export default function SectionHeader({ className = '' }) {
  const { currentUser } = useAuth()
  const { t } = useTranslation()

  const displayName = currentUser?.full_name || currentUser?.name || currentUser?.username || currentUser?.email || 'there'
  const firstName = useMemo(() => String(displayName || '').split(' ')[0] || displayName, [displayName])
  const avatarUrl = currentUser?.avatar_url || currentUser?.photo || ''

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return t('dashboard.header.greeting.morning')
    if (h < 17) return t('dashboard.header.greeting.afternoon')
    return t('dashboard.header.greeting.evening')
  }, [t])

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-600 to-blue-700 text-white px-4 sm:px-6 md:px-8 py-5 sm:py-6 shadow-lg ring-1 ring-white/20 transition-shadow duration-300 hover:shadow-2xl ${className}`}> 
      {/* Animated shimmer sweep */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background: 'linear-gradient(120deg, rgba(255,255,255,0.08) 15%, rgba(255,255,255,0) 30%, rgba(255,255,255,0.08) 45%)',
          backgroundSize: '200% 100%'
        }}
      >
        <div className="shimmer h-full w-full" />
      </div>
      {/* Content */}
      <div className="relative z-10 flex items-start gap-3 sm:gap-4">
        <div className="fade-in-up delay-1">
          <Avatar name={displayName} photoUrl={avatarUrl} />
        </div>
        <div className="min-w-0 flex-1 fade-in-up delay-2">
          <h2 className="text-2xl sm:text-3xl font-semibold leading-tight">
            {greeting}, {firstName}
          </h2>
          <p className="mt-1 text-white/90 text-sm sm:text-base">{t('dashboard.header.subtitle')}</p>
        </div>
      </div>
      {/* Local animation keyframes */}
      <style>{`
        @keyframes shimmerMove { from { background-position: -200% 0; } to { background-position: 200% 0; } }
        .shimmer { animation: shimmerMove 3.5s linear infinite; }

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in-up { animation: fadeInUp .6s ease both; }
        .fade-in-up.delay-1 { animation-delay: .08s; }
        .fade-in-up.delay-2 { animation-delay: .16s; }
      `}</style>
    </div>
  )
}