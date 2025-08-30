'use client'

import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import SuperAdminNavigation from '@/components/superadmin/Navigation'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useSimpleAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user?.role !== 'superadmin') {
      router.push('/dashboard')
    }
  }, [user?.role, isLoading, router]) // More specific dependencies

  // Only show loading on initial load, not on navigation
  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user?.role !== 'superadmin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminNavigation />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}