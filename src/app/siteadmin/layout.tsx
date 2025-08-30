'use client'

import { useEffect } from 'react'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { useRouter } from 'next/navigation'
import SiteAdminNavigation from '@/components/siteadmin/Navigation'

export default function SiteAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useSimpleAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      // Check if user has site admin or superadmin privileges
      if (user.role !== 'site_admin' && user.role !== 'superadmin') {
        router.push('/dashboard')
        return
      }

      // For site admin, ensure they have a site assigned
      if (user.role === 'site_admin' && !user.site_id) {
        console.error('Site admin user has no assigned site')
        router.push('/dashboard')
        return
      }
    }
  }, [user?.role, user?.site_id, isLoading, router]) // More specific dependencies

  // Only show loading on initial load, not on navigation
  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Only allow site_admin and superadmin roles
  if (!user || (user.role !== 'site_admin' && user.role !== 'superadmin')) {
    return null
  }

  // For site admin, ensure they have a site assigned
  if (user.role === 'site_admin' && !user.site_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Configuration Error</h1>
          <p className="text-gray-600 mb-4">
            Your site admin account is not assigned to a site. Please contact your system administrator.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteAdminNavigation />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
