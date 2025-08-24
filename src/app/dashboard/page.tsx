'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications] = useState([
    {
      id: 1,
      title: 'Service Request Update',
      message: 'Your laundry service request has been completed',
      type: 'success',
      time: '2 hours ago',
      read: false
    },
    {
      id: 2,
      title: 'New Message',
      message: 'You have a new message from community staff',
      type: 'info',
      time: '5 hours ago',
      read: false
    },
    {
      id: 3,
      title: 'Event Reminder',
      message: 'Community dinner starts in 1 hour',
      type: 'reminder',
      time: 'Yesterday',
      read: true
    }
  ])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        await signOut()
        router.push('/login')
      } catch (error) {
        console.error('Error signing out:', error)
      }
    }
  }

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Eden Living</h1>
              <p className="text-gray-600 text-sm">Premium Senior Living</p>
            </div>
          </div>
          
          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Notifications"
              >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <p className="text-sm text-gray-600">{unreadCount} unread</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-gray-900">{notification.title}</h4>
                            <span className="text-xs text-gray-500">{notification.time}</span>
                          </div>
                          <p className="text-sm text-gray-600">{notification.message}</p>
                          {!notification.read && (
                            <div className="mt-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <Button variant="ghost" size="sm" className="w-full text-blue-600 hover:text-blue-700">
                      Mark all as read
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-full px-4 py-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {getUserInitials(user?.first_name || '', user?.last_name || '')}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </div>
            
            {/* Sign Out */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
              className="w-9 h-9 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Sign Out"
            >
              <span className="text-xl">→</span>
              <span className="sr-only">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-10">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-8 mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">Welcome back, {user?.first_name}! 👋</h2>
            <p className="text-xl text-gray-600 max-w-2xl">
              HereHere'sapos;s everything you need to manage your Eden Living experience in one place.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">5</div>
              <p className="text-sm font-semibold text-blue-800">Pending Requests</p>
              <p className="text-xs text-blue-600 mt-1">Awaiting response</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">12</div>
              <p className="text-sm font-semibold text-green-800">Completed Tasks</p>
              <p className="text-xs text-green-600 mt-1">This month</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-orange-50 to-amber-50">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">3</div>
              <p className="text-sm font-semibold text-orange-800">Upcoming Events</p>
              <p className="text-xs text-orange-600 mt-1">This week</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">2</div>
              <p className="text-sm font-semibold text-purple-800">New Messages</p>
              <p className="text-xs text-purple-600 mt-1">Unread</p>
            </CardContent>
          </Card>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-xl">📋</span>
                </div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Services
                </CardTitle>
              </div>
              <p className="text-sm text-gray-600">Manage your service requests</p>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all"
                onClick={() => router.push('/dashboard/services')}
              >
                Manage Services
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-xl">📢</span>
                </div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Announcements
                </CardTitle>
              </div>
              <p className="text-sm text-gray-600">Latest community updates</p>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-800 transition-colors">
                View Updates
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-xl">📅</span>
                </div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Calendar
                </CardTitle>
              </div>
              <p className="text-sm text-gray-600">Upcoming events & activities</p>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 hover:text-green-800 transition-colors">
                View Events
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-xl">💰</span>
                </div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Billing
                </CardTitle>
              </div>
              <p className="text-sm text-gray-600">Payment history & statements</p>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 hover:text-purple-800 transition-colors">
                View Statements
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-xl">👥</span>
                </div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Community
                </CardTitle>
              </div>
              <p className="text-sm text-gray-600">Connect with neighbors</p>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full border-pink-300 text-pink-700 hover:bg-pink-50 hover:border-pink-400 hover:text-pink-800 transition-colors">
                Connect
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-xl">👤</span>
                </div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Profile
                </CardTitle>
              </div>
              <p className="text-sm text-gray-600">Manage your account details</p>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-800 transition-colors">
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200 mt-16">
        <div className="container mx-auto px-6 py-6 text-center">
          <p className="text-gray-600 text-sm">
            © 2025 Eden Living. Premium Senior Living Community. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
