'use client'

import { useSimpleAuth } from '@/contexts/SimpleAuthContext'

export default function AuthDebug() {
  const { user, isLoading, currentSite } = useSimpleAuth()

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs z-50">
      <div>Loading: {isLoading ? 'true' : 'false'}</div>
      <div>User: {user ? user.email : 'null'}</div>
      <div>Role: {user?.role || 'none'}</div>
      <div>Site: {currentSite?.name || 'none'}</div>
    </div>
  )
}
