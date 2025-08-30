'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  site_id: string | null
  unit_number?: string
  created_at: string
}

export default function SuperAdminDashboard() {
  const { user, availableSites } = useSimpleAuth()
  const [stats, setStats] = useState({
    totalSites: 0,
    totalUsers: 0,
    totalUnits: 0,
    adminUsers: 0,
    residentUsers: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    setIsLoading(true)
    try {
      // Add superadmin header for API calls
      const headers = {
        'x-superadmin': 'true',
        'Content-Type': 'application/json'
      }

      // Fetch users
      const usersResponse = await fetch('/api/admin/users', { headers })
      const usersData = await usersResponse.json()

      // Fetch sites
      const sitesResponse = await fetch('/api/admin/sites', { headers })
      const sitesData = await sitesResponse.json()

      if (usersResponse.ok && sitesResponse.ok) {
        const users = usersData.users || []
        const sites = sitesData.sites || []

        setStats({
          totalSites: sites.length,
          totalUsers: users.length,
          totalUnits: sites.reduce((sum: number, site: any) => sum + (site.total_units || site.total_bedrooms || 0), 0),
          adminUsers: users.filter((user: any) => user.role === 'admin').length,
          residentUsers: users.filter((user: any) => user.role === 'resident').length
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">System overview and statistics</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Super Admin</p>
          <p className="font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
            <div className="h-4 w-4 text-blue-600">🏢</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalSites}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <div className="h-4 w-4 text-green-600">🏠</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalUnits}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <div className="h-4 w-4 text-purple-600">👥</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <div className="h-4 w-4 text-red-600">👨‍💼</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.adminUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Manage system users and administrators</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Admin Users:</span>
                <span className="font-semibold">{stats.adminUsers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Resident Users:</span>
                <span className="font-semibold">{stats.residentUsers}</span>
              </div>
            </div>
            <Button asChild className="w-full">
              <a href="/superadmin/users">Manage Users</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Site Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Create and manage Eden Living sites</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Active Sites:</span>
                <span className="font-semibold">{stats.totalSites}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Units:</span>
                <span className="font-semibold">{stats.totalUnits}</span>
              </div>
            </div>
            <Button asChild className="w-full">
              <a href="/superadmin/sites">Manage Sites</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Configure system-wide settings and preferences</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>System Status:</span>
                <span className="font-semibold text-green-600">Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Services:</span>
                <span className="font-semibold">7 Available</span>
              </div>
            </div>
            <Button asChild className="w-full">
              <a href="/superadmin/settings">System Settings</a>
            </Button>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}