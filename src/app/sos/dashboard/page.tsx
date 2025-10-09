'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Phone, Clock, User, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SOSCall {
  id: string
  resident_id: string
  site_id: string
  room_name: string
  started_at: string
  ended_at: string | null
  status: 'active' | 'ended' | 'cancelled'
  resident?: {
    first_name: string
    last_name: string
    unit_number?: string
  }
}

export default function SOSDashboardPage() {
  const router = useRouter()
  const [activeCalls, setActiveCalls] = useState<SOSCall[]>([])
  const [recentCalls, setRecentCalls] = useState<SOSCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadCalls() {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()

      // Get active calls
      const { data: activeData, error: activeError } = await supabase
        .from('sos_calls')
        .select(`
          *,
          resident:profiles!sos_calls_resident_id_fkey(first_name, last_name, unit_number)
        `)
        .eq('status', 'active')
        .order('started_at', { ascending: false })

      if (activeError) throw activeError

      // Get recent ended calls (last 24 hours)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const { data: recentData, error: recentError } = await supabase
        .from('sos_calls')
        .select(`
          *,
          resident:profiles!sos_calls_resident_id_fkey(first_name, last_name, unit_number)
        `)
        .in('status', ['ended', 'cancelled'])
        .gte('started_at', yesterday.toISOString())
        .order('started_at', { ascending: false })
        .limit(10)

      if (recentError) throw recentError

      setActiveCalls(activeData || [])
      setRecentCalls(recentData || [])
    } catch (err: any) {
      console.error('Error loading calls:', err)
      setError(err.message || 'Failed to load calls')
    } finally {
      setLoading(false)
    }
  }

  function formatDuration(startedAt: string, endedAt: string | null): string {
    const start = new Date(startedAt)
    const end = endedAt ? new Date(endedAt) : new Date()
    const durationMs = end.getTime() - start.getTime()
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  function formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString()
  }

  function handleJoinCall(roomName: string) {
    router.push(`/sos/join?room=${roomName}`)
  }

  useEffect(() => {
    loadCalls()

    // Refresh every 10 seconds
    const interval = setInterval(loadCalls, 10000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading emergency calls...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Emergency SOS Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor and respond to emergency calls</p>
          </div>
          <Button onClick={loadCalls} variant="outline">
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-600">⚠️ {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Active Calls */}
        <Card className="border-red-500 border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-600">
                Active Emergency Calls ({activeCalls.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {activeCalls.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active emergency calls</p>
            ) : (
              <div className="space-y-3">
                {activeCalls.map((call) => (
                  <Card key={call.id} className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="animate-pulse">
                              ACTIVE
                            </Badge>
                            <span className="font-semibold text-lg">
                              {call.resident?.first_name} {call.resident?.last_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {call.resident?.unit_number && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>Unit {call.resident.unit_number}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>Started {formatTime(call.started_at)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              <span>Duration: {formatDuration(call.started_at, null)}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleJoinCall(call.room_name)}
                          size="lg"
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Join Call
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Calls */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls (Last 24 Hours)</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCalls.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent calls</p>
            ) : (
              <div className="space-y-2">
                {recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={call.status === 'ended' ? 'secondary' : 'outline'}>
                          {call.status.toUpperCase()}
                        </Badge>
                        <span className="font-medium">
                          {call.resident?.first_name} {call.resident?.last_name}
                        </span>
                        {call.resident?.unit_number && (
                          <span className="text-sm text-gray-500">
                            (Unit {call.resident.unit_number})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{formatTime(call.started_at)}</span>
                        <span>Duration: {formatDuration(call.started_at, call.ended_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Emergency Response Guidelines</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Respond to active calls immediately</li>
              <li>Multiple staff members can join the same call</li>
              <li>Stay on the call until the situation is resolved</li>
              <li>Document the incident after the call ends</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

