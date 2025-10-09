'use client'

import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import KitchenDashboard from '@/components/restaurant/KitchenDashboard'

export default function StaffDashboard() {
  const { user, signOut } = useSimpleAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  const isKitchenStaff = user.department?.toLowerCase() === 'kitchen'
  const departmentName = user.department || 'Staff'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Branding */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Eden Living</h1>
                <p className="text-xs text-gray-600">Staff Portal</p>
              </div>
            </div>

            {/* Sign Out Button */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSignOut}
              className="text-gray-600 hover:text-red-500 hover:bg-red-50"
            >
              Sign Out →
            </Button>
          </div>

          {/* User Info */}
          <div className="mt-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">
                {user.first_name?.[0]?.toUpperCase() || 'S'}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                Welcome, {user.first_name} {user.last_name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {user.role === 'staff' ? 'Staff' : user.role}
                </Badge>
                <Badge 
                  variant="outline" 
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                >
                  {departmentName}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Department-Specific Dashboard */}
        <div className="max-w-screen-lg mx-auto">
          {isKitchenStaff ? (
            <div>
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Kitchen Orders</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Manage menu orders and track delivery status
                </p>
              </div>
              <KitchenDashboard />
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {departmentName} Dashboard
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Service requests for your department will appear here
                </p>
              </div>
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600 mb-4">
                    Service request management for {departmentName} department
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/department')}
                  >
                    View Service Requests
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Quick Access Card */}
        <div className="max-w-screen-lg mx-auto mt-6">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">Need to scan a QR code?</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Use the scanner to update service status
                  </p>
                </div>
                <Button 
                  variant="default"
                  onClick={() => router.push('/staff/scanner')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Open Scanner
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <div className="max-w-screen-lg mx-auto mt-6">
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Quick Tips</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {isKitchenStaff ? (
                  <>
                    <li>• Use status tabs to filter orders by their current state</li>
                    <li>• Click "Start Processing" to begin preparing an order</li>
                    <li>• Mark as "Delivering" when ready for pickup/delivery</li>
                    <li>• Scan the QR code to complete the order</li>
                  </>
                ) : (
                  <>
                    <li>• View requests assigned to the {departmentName} department</li>
                    <li>• Update status as you progress through the service</li>
                    <li>• Scan QR codes at resident locations to track progress</li>
                    <li>• Mark as completed when service is finished</li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

