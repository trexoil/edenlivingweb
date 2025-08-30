'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, Calendar, Clock, MapPin, Loader2, Mail, Home } from 'lucide-react'
import { Event } from '@/types/database'

interface EventWithRegistrations extends Event {
  registration_count: number
  organizer?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  registrations?: Array<{
    id: string
    resident_id: string
    status: string
    created_at: string
    resident: {
      id: string
      first_name: string
      last_name: string
      email: string
      unit_number?: string
    }
  }>
}

export default function EventRegistrationsPage({ params }: { params: { id: string } }) {
  const { user, currentSite } = useSimpleAuth()
  const router = useRouter()
  const [event, setEvent] = useState<EventWithRegistrations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && params.id) {
      fetchEventWithRegistrations()
    }
  }, [user, params.id])

  const fetchEventWithRegistrations = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/events/${params.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch event')
      }

      setEvent(data.event)
    } catch (err) {
      console.error('Error fetching event:', err)
      setError(err instanceof Error ? err.message : 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatRegistrationDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/siteadmin/events')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Event Registrations</h1>
            <p className="text-muted-foreground">Loading event details...</p>
          </div>
        </div>

        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading registrations...</span>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/siteadmin/events')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Event Registrations</h1>
            <p className="text-muted-foreground">Error loading event</p>
          </div>
        </div>

        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive">{error || 'Event not found'}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchEventWithRegistrations}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const activeRegistrations = event.registrations?.filter(reg => reg.status === 'registered') || []
  const cancelledRegistrations = event.registrations?.filter(reg => reg.status === 'cancelled') || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.push('/siteadmin/events')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Event Registrations</h1>
          <p className="text-muted-foreground">
            Manage registrations for this event
          </p>
        </div>
      </div>

      {/* Event Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{event.title}</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(event.event_date)}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {formatTime(event.event_time)}
            </div>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {event.location}
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {activeRegistrations.length}
              {event.max_attendees && `/${event.max_attendees}`} registered
            </div>
          </div>
        </CardHeader>
        {event.description && (
          <CardContent>
            <p className="text-muted-foreground">{event.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Registration Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeRegistrations.length}</div>
            <p className="text-sm text-muted-foreground">Active Registrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{cancelledRegistrations.length}</div>
            <p className="text-sm text-muted-foreground">Cancelled Registrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {event.max_attendees ? `${event.max_attendees - activeRegistrations.length}` : '∞'}
            </div>
            <p className="text-sm text-muted-foreground">Available Spots</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Registrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Active Registrations ({activeRegistrations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeRegistrations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No active registrations</h3>
              <p className="text-muted-foreground">
                No residents have registered for this event yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeRegistrations.map((registration) => (
                <div key={registration.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <h4 className="font-semibold">
                        {registration.resident.first_name} {registration.resident.last_name}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {registration.resident.email}
                        </div>
                        {registration.resident.unit_number && (
                          <div className="flex items-center">
                            <Home className="w-4 h-4 mr-1" />
                            Unit {registration.resident.unit_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Registered</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatRegistrationDate(registration.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancelled Registrations */}
      {cancelledRegistrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Cancelled Registrations ({cancelledRegistrations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cancelledRegistrations.map((registration) => (
                <div key={registration.id} className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                  <div className="flex items-center gap-4">
                    <div>
                      <h4 className="font-semibold">
                        {registration.resident.first_name} {registration.resident.last_name}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {registration.resident.email}
                        </div>
                        {registration.resident.unit_number && (
                          <div className="flex items-center">
                            <Home className="w-4 h-4 mr-1" />
                            Unit {registration.resident.unit_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Cancelled</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatRegistrationDate(registration.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
