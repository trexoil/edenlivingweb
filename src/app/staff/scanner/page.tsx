'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import StaffQRScanner from '@/components/mobile/StaffQRScanner'

export default function StaffScannerPage() {
  const { user, isLoading } = useSimpleAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    
    // Only staff, admin, site_admin can access
    const allowed = ['staff', 'admin', 'site_admin', 'superadmin'].includes(user.role as any)
    if (!allowed) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Staff QR Scanner</h1>
          <p className="text-gray-600 mt-2">
            Scan resident QR codes to complete service requests and orders
          </p>
        </div>
        
        <StaffQRScanner />
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Click "Scan with Camera" to use your device camera</li>
            <li>Or click "Enter Manually" to paste QR code data</li>
            <li>Point camera at resident's QR code</li>
            <li>System will automatically process the scan</li>
            <li>Works for both service requests and restaurant orders</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

