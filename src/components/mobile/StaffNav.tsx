"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'

export default function StaffNav() {
  const path = usePathname()
  const { user } = useSimpleAuth()
  const isKitchenStaff = user?.department?.toLowerCase() === 'kitchen'

  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b mb-4">
      <div className="max-w-screen-sm mx-auto p-2 flex gap-2 justify-between">
        {!isKitchenStaff && (
          <Link href="/department" className="flex-1">
            <Button
              variant={path.startsWith('/department') ? 'default' : 'outline'}
              className="w-full"
            >
              Department
            </Button>
          </Link>
        )}
        <Link href="/kitchen" className="flex-1">
          <Button
            variant={path.startsWith('/kitchen') ? 'default' : 'outline'}
            className="w-full"
          >
            Kitchen
          </Button>
        </Link>
      </div>
    </div>
  )
}

