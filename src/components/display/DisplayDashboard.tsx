'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Settings } from 'lucide-react'

interface Department {
  id: string
  name: string
  icon: string
}

interface OrderItem {
  id: string
  order_number: string
  status: string
  total: number
  items: Array<{ name: string; qty: number; price: number }>
  created_at: string
  notes?: string
}

interface ServiceRequestItem {
  id: string
  request_number: string
  type: string
  title: string
  description?: string
  status: string
  priority: string
  created_at: string
}

interface DisplayDashboardProps {
  department: Department
  onChangeDepartment: () => void
}

export default function DisplayDashboard({ department, onChangeDepartment }: DisplayDashboardProps) {
  const [items, setItems] = useState<(OrderItem | ServiceRequestItem)[]>([])
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Initial fetch and auto-refresh every 30 seconds
  useEffect(() => {
    // Fetch data function
    const fetchData = async () => {
      setLoading(true)
      try {
        let url = ''
        if (department.id === 'kitchen') {
          url = '/api/display/orders'
        } else {
          url = `/api/display/requests?department=${encodeURIComponent(department.name)}`
        }

        const response = await fetch(url)
        const data = await response.json()
        setItems(data.items || [])
        setLastRefresh(new Date())
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchData()

    // Set up auto-refresh every 10 seconds for real-time updates
    const interval = setInterval(fetchData, 10000)

    // Cleanup on unmount or department change
    return () => clearInterval(interval)
  }, [department.id, department.name])

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-500'
      case 'auto_approved':
        return 'bg-teal-500'
      case 'manual_review':
        return 'bg-amber-500'
      case 'pending':
        return 'bg-blue-400'
      case 'submitted':
        return 'bg-blue-500'
      case 'processing':
        return 'bg-yellow-500'
      case 'delivering':
        return 'bg-purple-500'
      case 'assigned':
        return 'bg-blue-500'
      case 'in_progress':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const isOrderItem = (item: any): item is OrderItem => {
    return 'order_number' in item
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="text-6xl">{department.icon}</span>
            <div>
              <h1 className="text-5xl font-bold">{department.name} Department</h1>
              <p className="text-2xl text-gray-300 mt-2">Live Order Monitor</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold mb-2">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
            <div className="text-xl text-gray-300">
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2 bg-white/10">
              {items.length} Active {items.length === 1 ? 'Item' : 'Items'}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-green-400' : ''}`} />
              <span>
                {loading ? 'Refreshing...' : `Updated: ${lastRefresh.toLocaleTimeString()}`}
              </span>
              <span className="text-gray-500">• Auto-refresh: 10s</span>
            </div>
          </div>
          <Button
            variant="default"
            size="lg"
            onClick={onChangeDepartment}
            className="text-lg bg-white text-gray-900 hover:bg-gray-100 font-semibold"
          >
            <Settings className="w-5 h-5 mr-2" />
            Change Department
          </Button>
        </div>
      </div>

      {/* Items Grid */}
      {loading && items.length === 0 ? (
        <div className="text-center py-20">
          <RefreshCw className="w-16 h-16 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-2xl text-gray-400">Loading...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl text-gray-400 mb-4">No active orders</p>
          <p className="text-xl text-gray-500">New orders will appear here automatically</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="bg-white/10 border-white/20 hover:bg-white/15 transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl text-white mb-2">
                      {isOrderItem(item) ? item.order_number : item.request_number}
                    </CardTitle>
                    <div className="text-sm text-gray-200">
                      {formatTime(item.created_at)}
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(item.status)} text-white text-sm px-3 py-1`}>
                    {item.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isOrderItem(item) ? (
                  // Kitchen Order Display
                  <>
                    <div className="space-y-2 mb-4">
                      {item.items.map((orderItem, idx) => (
                        <div key={idx} className="flex justify-between text-lg">
                          <span className="text-gray-100">
                            {orderItem.qty}x {orderItem.name}
                          </span>
                          <span className="text-white font-semibold">
                            RM{orderItem.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-white/30 pt-3 mt-3">
                      <div className="flex justify-between text-2xl font-bold text-white">
                        <span>Total:</span>
                        <span>RM{item.total.toFixed(2)}</span>
                      </div>
                    </div>
                    {item.notes && (
                      <div className="mt-3 text-sm text-gray-200 italic">
                        Note: {item.notes}
                      </div>
                    )}
                  </>
                ) : (
                  // Service Request Display
                  <>
                    <div className="mb-3">
                      <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-gray-100">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getPriorityColor(item.priority)} text-white`}>
                        {item.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-gray-100 border-gray-400">
                        {item.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

