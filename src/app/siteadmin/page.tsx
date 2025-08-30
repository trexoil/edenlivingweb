'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import {
  Users,
  Building2,
  ClipboardList,
  Calendar,
  Megaphone,
  BarChart3,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  totalUsers: number
  activeServiceRequests: number
  upcomingEvents: number
  recentAnnouncements: number
  openTickets: number
  urgentTickets: number
}

export default function SiteAdminDashboard() {
  const { user, currentSite } = useSimpleAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeServiceRequests: 0,
    upcomingEvents: 0,
    recentAnnouncements: 0,
    openTickets: 0,
    urgentTickets: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const supabase = createClient()

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.error('Dashboard: Loading timeout reached, forcing loading to false')
        setError('Dashboard loading timed out. Please refresh the page.')
        setIsLoading(false)
      }
    }, 30000) // 30 second timeout

    return () => clearTimeout(timeout)
  }, [isLoading])

  // Access control - redirect non-admin users
  useEffect(() => {
    if (user && !isLoading) {
      if (user.role !== 'superadmin' && user.role !== 'site_admin') {
        console.log('Unauthorized access attempt by:', user.role)
        router.push('/dashboard')
        return
      }
    }
  }, [user, isLoading, router])

  useEffect(() => {
    console.log('Dashboard useEffect triggered:', {
      userEmail: user?.email,
      userRole: user?.role,
      userSiteId: user?.site_id,
      currentSiteName: currentSite?.name,
      currentSiteId: currentSite?.id,
      isLoading,
      timestamp: new Date().toISOString()
    })

    // Only run this logic once when we have a user and are currently loading
    if (user && isLoading) {
      console.log('Dashboard: User loaded and currently loading, checking access...')

      // Check if user has proper access
      if (user.role !== 'superadmin' && user.role !== 'site_admin') {
        console.log('Dashboard: User does not have admin access, will be redirected')
        return // Will be redirected by the access control useEffect above
      }

      console.log('Dashboard: User has admin access, checking site requirements...')

      if (user.role === 'superadmin') {
        console.log('Dashboard: Superadmin user, loading stats...')
        setStats({
          totalUsers: 0,
          activeServiceRequests: 0,
          upcomingEvents: 0,
          recentAnnouncements: 0,
          openTickets: 0,
          urgentTickets: 0
        })
        setLastUpdated(new Date())
        setIsLoading(false)
      } else if (currentSite) {
        console.log('Dashboard: Site admin with currentSite, loading stats...')
        setStats({
          totalUsers: 0,
          activeServiceRequests: 0,
          upcomingEvents: 0,
          recentAnnouncements: 0,
          openTickets: 0,
          urgentTickets: 0
        })
        setLastUpdated(new Date())
        setIsLoading(false)
      } else {
        console.log('Dashboard: Site admin user but no currentSite available')
        console.log('Dashboard: User site_id:', user.site_id)
        setError('No site assigned to this user')
        setIsLoading(false)
      }
    } else {
      console.log('Dashboard: Waiting for user or already loaded...', {
        hasUser: !!user,
        isLoading
      })
    }
  }, [user, currentSite, isLoading])

  const retryFetchDashboardStats = async () => {
    const maxRetries = 3

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Dashboard: Fetch attempt ${attempt}/${maxRetries}`)
        setRetryCount(attempt - 1)
        await fetchDashboardStats()
        return // Success, exit retry loop
      } catch (error) {
        console.error(`Dashboard: Fetch attempt ${attempt} failed:`, error)

        if (attempt === maxRetries) {
          console.error('Dashboard: All retry attempts failed')
          setError('Failed to load dashboard after multiple attempts. Please refresh the page.')
          setIsLoading(false)
        } else {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s
          console.log(`Dashboard: Waiting ${delay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
  }

  const fetchDashboardStats = async () => {
    console.log('fetchDashboardStats called:', {
      userRole: user?.role,
      currentSiteId: currentSite?.id,
      currentSiteName: currentSite?.name,
      timestamp: new Date().toISOString()
    })

    // For superadmin, we might not have a currentSite, so use the first available site or show aggregate data
    const siteId = currentSite?.id
    if (!siteId && user?.role !== 'superadmin') {
      console.error('fetchDashboardStats: No site available for data fetching')
      setError('No site available for data fetching')
      setIsLoading(false)
      return
    }

    // Ensure loading is set to false after a maximum time regardless of what happens
    const forceStopLoading = setTimeout(() => {
      console.warn('fetchDashboardStats: Force stopping loading after 10 seconds')
      setIsLoading(false)
    }, 10000)

    try {
      console.log('fetchDashboardStats: Starting data fetch...')
      setIsLoading(true)
      setError(null)

      // Fetch users for this site (or all sites for superadmin)
      let usersQuery = supabase
        .from('profiles')
        .select('id, role')

      if (siteId) {
        usersQuery = usersQuery.eq('site_id', siteId)
      }

      const { data: users, error: usersError } = await usersQuery

      if (usersError) {
        console.error('Error fetching users:', usersError)
      }

      // Fetch service requests for this site (or all sites for superadmin)
      let serviceRequestsQuery = supabase
        .from('service_requests')
        .select('id, status')
        .in('status', ['pending', 'in_progress'])

      if (siteId) {
        serviceRequestsQuery = serviceRequestsQuery.eq('site_id', siteId)
      }

      const { data: serviceRequests, error: serviceError } = await serviceRequestsQuery

      if (serviceError) {
        console.error('Error fetching service requests:', serviceError)
      }

      // Fetch helpdesk tickets for this site (or all sites for superadmin)
      let ticketsQuery = supabase
        .from('helpdesk_tickets')
        .select('id, status, priority')
        .in('status', ['open', 'in_progress'])

      if (siteId) {
        ticketsQuery = ticketsQuery.eq('site_id', siteId)
      }

      const { data: tickets, error: ticketsError } = await ticketsQuery

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError)
      }

      // Try to fetch announcements for this site (last 30 days)
      let announcements = []
      try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        let announcementsQuery = supabase
          .from('announcements')
          .select('id')
          .gte('created_at', thirtyDaysAgo.toISOString())

        if (siteId) {
          announcementsQuery = announcementsQuery.eq('site_id', siteId)
        }

        const { data: announcementsData, error: announcementsError } = await announcementsQuery

        if (announcementsError) {
          console.warn('Announcements table may not exist:', announcementsError.message)
        } else {
          announcements = announcementsData || []
        }
      } catch (error) {
        console.warn('Error fetching announcements:', error)
      }

      // Try to fetch events for this site (next 7 days)
      let events = []
      try {
        const today = new Date()
        const nextWeek = new Date()
        nextWeek.setDate(today.getDate() + 7)

        let eventsQuery = supabase
          .from('events')
          .select('id')
          .gte('event_date', today.toISOString())
          .lte('event_date', nextWeek.toISOString())

        if (siteId) {
          eventsQuery = eventsQuery.eq('site_id', siteId)
        }

        const { data: eventsData, error: eventsError } = await eventsQuery

        if (eventsError) {
          console.warn('Events table may not exist:', eventsError.message)
        } else {
          events = eventsData || []
        }
      } catch (error) {
        console.warn('Error fetching events:', error)
      }

      // Update stats
      setStats({
        totalUsers: users?.length || 0,
        activeServiceRequests: serviceRequests?.length || 0,
        openTickets: tickets?.length || 0,
        urgentTickets: tickets?.filter(t => t.priority === 'urgent').length || 0,
        recentAnnouncements: announcements.length || 0,
        upcomingEvents: events.length || 0
      })

      setLastUpdated(new Date())
      console.log('fetchDashboardStats: Successfully updated stats')

    } catch (error) {
      console.error('fetchDashboardStats: Error fetching dashboard stats:', error)
      console.error('fetchDashboardStats: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      })
      setError('Failed to load dashboard statistics')
    } finally {
      clearTimeout(forceStopLoading)
      console.log('fetchDashboardStats: Setting isLoading to false')
      setIsLoading(false)
    }
  }

  // Show loading while checking access or fetching data
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Debug: isLoading={isLoading.toString()}, hasUser={!!user}, userRole={user?.role}, currentSite={currentSite?.name}
        </div>
        <button
          onClick={() => {
            console.log('Force stop loading clicked')
            setIsLoading(false)
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Force Stop Loading (Debug)
        </button>
      </div>
    )
  }

  // Access control check - this should not show due to redirect, but just in case
  if (user.role !== 'superadmin' && user.role !== 'site_admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardStats}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Dashboard</h1>
          <p className="text-gray-600">
            {user?.role === 'superadmin'
              ? 'System-wide site administration'
              : `Managing site: ${currentSite?.name || 'Unknown'}`
            }
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={fetchDashboardStats}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {user?.role === 'superadmin' ? 'Super Admin' : 'Site Administrator'}
            </p>
            <p className="font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Site Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Residents and staff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
            <ClipboardList className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.activeServiceRequests}</div>
            <p className="text-xs text-muted-foreground">
              Pending service requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            <Megaphone className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.recentAnnouncements}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <BarChart3 className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{stats.openTickets}</div>
            <p className="text-xs text-muted-foreground">
              Helpdesk tickets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Tickets</CardTitle>
            <BarChart3 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.urgentTickets}</div>
            <p className="text-xs text-muted-foreground">
              Need immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Manage residents and staff for this site</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Total Users:</span>
                <span className="font-semibold">{stats.totalUsers}</span>
              </div>
            </div>
            <Button asChild className="w-full">
              <a href="/siteadmin/users">Manage Users</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ClipboardList className="w-5 h-5 mr-2" />
              Service Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Monitor and manage service requests</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Active Requests:</span>
                <span className="font-semibold">{stats.activeServiceRequests}</span>
              </div>
            </div>
            <Button asChild className="w-full">
              <a href="/siteadmin/services">View Requests</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Site Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Update site details and settings</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Site Name:</span>
                <span className="font-semibold">{currentSite?.name || 'N/A'}</span>
              </div>
              {currentSite?.address && (
                <div className="flex justify-between text-sm">
                  <span>Address:</span>
                  <span className="font-semibold">{currentSite.address}, {currentSite.city}</span>
                </div>
              )}
            </div>
            <Button asChild className="w-full">
              <a href="/siteadmin/site">Manage Site</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Megaphone className="w-5 h-5 mr-2" />
              Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Create and manage site announcements</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>This Month:</span>
                <span className="font-semibold">{stats.recentAnnouncements}</span>
              </div>
            </div>
            <Button asChild className="w-full">
              <a href="/siteadmin/announcements">Manage Announcements</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Organize and manage site events</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Upcoming:</span>
                <span className="font-semibold">{stats.upcomingEvents}</span>
              </div>
            </div>
            <Button asChild className="w-full">
              <a href="/siteadmin/events">Manage Events</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">View site analytics and reports</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Available Reports:</span>
                <span className="font-semibold">5</span>
              </div>
            </div>
            <Button asChild className="w-full">
              <a href="/siteadmin/reports">View Reports</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Site Admin Notice */}
      {user?.role === 'site_admin' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Site Administrator Access</h3>
                <p className="text-sm text-blue-700 mt-1">
                  You have administrative access to <strong>{currentSite?.name || 'this site'}</strong>.
                  You can manage users, services, and content for this site only.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
