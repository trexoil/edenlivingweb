'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Clock, User, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react'
import { ServiceRequest } from '@/types/database'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'

interface DepartmentStats {
  assigned: number
  processing: number
  in_progress: number
  completed: number
}

export default function DepartmentDashboard() {
  const { user } = useSimpleAuth()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [stats, setStats] = useState<DepartmentStats>({ assigned: 0, processing: 0, in_progress: 0, completed: 0 })

  useEffect(() => {
    if (user?.department) {
      fetchDepartmentRequests()
    }
  }, [user?.department])

  const fetchDepartmentRequests = async () => {
    if (!user?.department) return

    try {
      setLoading(true)
      
      const params = new URLSearchParams({ department: user.department })
      const response = await fetch(`/api/service-requests?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch requests')
      }
      
      const data = await response.json()
      setRequests(data.requests || [])
      
      // Calculate stats
      const newStats = data.requests.reduce(
        (acc: DepartmentStats, req: ServiceRequest) => {
          if (req.status === 'assigned') acc.assigned++
          else if (req.status === 'processing') acc.processing++
          else if (req.status === 'in_progress') acc.in_progress++
          else if (req.status === 'completed') acc.completed++
          return acc
        },
        { assigned: 0, processing: 0, in_progress: 0, completed: 0 }
      )
      setStats(newStats)
      
    } catch (error) {
      console.error('Error fetching department requests:', error)
      toast.error('Failed to load service requests')
    } finally {
      setLoading(false)
    }
  }

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    setUpdating(requestId)
    
    try {
      const response = await fetch(`/api/service-requests/${requestId}/update-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update request')
      }
      
      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: newStatus as any, updated_at: new Date().toISOString() }
            : req
        )
      )
      
      // Update stats
      await fetchDepartmentRequests()
      
      toast.success(`Request status updated to ${newStatus}`)
      
    } catch (error) {
      console.error('Error updating request status:', error)
      toast.error('Failed to update request status')
    } finally {
      setUpdating(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-500'
      case 'processing':
        return 'bg-yellow-500'
      case 'in_progress':
        return 'bg-green-500'
      case 'completed':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive'
      case 'high':
        return 'secondary'
      case 'medium':
        return 'outline'
      case 'low':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getAvailableActions = (status: string) => {
    switch (status) {
      case 'assigned':
        return [{ value: 'processing', label: 'Start Processing' }]
      case 'processing':
        return [
          { value: 'assigned', label: 'Back to Assigned' },
          { value: 'in_progress', label: 'Mark In Progress' }
        ]
      case 'in_progress':
        return [
          { value: 'processing', label: 'Back to Processing' }
        ]
      default:
        return []
    }
  }

  const filteredRequests = requests.filter(req => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false
    if (priorityFilter !== 'all' && req.priority !== priorityFilter) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading department requests...</span>
      </div>
    )
  }

  if (!user?.department) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-muted-foreground">
            You are not assigned to a department. Please contact your administrator.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Department Dashboard</h1>
          <p className="text-muted-foreground">
            Department: {user.department} | {user.first_name} {user.last_name}
          </p>
        </div>
        <Button onClick={fetchDepartmentRequests} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium">Assigned</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.assigned}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm font-medium">Processing</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.processing}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">In Progress</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.in_progress}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span className="text-sm font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Service Requests */}
      <div className="grid gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{request.title}</h3>
                    <Badge variant={getPriorityColor(request.priority)}>
                      {request.priority}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(request.status)}`}></div>
                      <span className="text-sm capitalize">{request.status.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    {request.description}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{request.resident?.first_name} {request.resident?.last_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>Unit {request.resident?.unit_number || 'N/A'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {request.estimated_cost && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">RM{request.estimated_cost.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {request.scheduled_date && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">Scheduled:</span> {' '}
                        {new Date(request.scheduled_date).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {getAvailableActions(request.status).map((action) => (
                    <Button
                      key={action.value}
                      size="sm"
                      variant={action.value === 'in_progress' ? 'default' : 'outline'}
                      onClick={() => updateRequestStatus(request.id, action.value)}
                      disabled={updating === request.id}
                    >
                      {updating === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : action.value === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : null}
                      {action.label}
                    </Button>
                  ))}
                  
                  {request.status === 'completed' && (
                    <Badge variant="secondary" className="text-xs">
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-muted-foreground">
              No service requests found for the selected filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}