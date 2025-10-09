"use client"

import { useEffect } from 'react'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { useRouter } from 'next/navigation'
import KitchenDashboard from '@/components/restaurant/KitchenDashboard'

export default function KitchenPage() {
  const { user, isLoading } = useSimpleAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) { router.push('/login'); return }
    const allowed = ['staff','admin','site_admin','superadmin'].includes(user.role as any)
    if (!allowed) router.push('/dashboard')
  }, [user, isLoading, router])

  return (
    <div className="max-w-screen-sm mx-auto p-2">
      {/* Mobile staff nav */}
      {/* @ts-ignore */}
      <div className="mb-4">{require("@/components/mobile/StaffNav").default()}</div>
      <KitchenDashboard />
    </div>
  )
}

