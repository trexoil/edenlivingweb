'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Calendar, Clock, MapPin, Users, Loader2 } from 'lucide-react'
import { Event } from '@/types/database'

interface EventWithRegistration extends Event {
  is_registered: boolean
  registration_count: number
  organizer?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export default function CalendarPage() {
  const { user } = useSimpleAuth()
  const router = useRouter()
  const [events, setEvents] = useState<EventWithRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [view, setView] = useState<'month' | 'upcoming'>('upcoming')

  useEffect(() => {
    if (user) {
      fetchEvents()
    }
  }, [user])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch upcoming events for now
      const response = await fetch('/api/events?upcoming=true')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch events')
      }

      setEvents(data.events || [])
    } catch (err) {
      console.error('Error fetching events:', err)
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/registrations`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register for event')
      }

      // Refresh events to update registration status
      await fetchEvents()
    } catch (err) {
      console.error('Error registering for event:', err)
      setError(err instanceof Error ? err.message : 'Failed to register for event')
    }
  }

  const handleUnregister = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/registrations`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unregister from event')
      }

      // Refresh events to update registration status
      await fetchEvents()
    } catch (err) {
      console.error('Error unregistering from event:', err)
      setError(err instanceof Error ? err.message : 'Failed to unregister from event')
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

  const isEventPast = (eventDate: string, eventTime: string) => {
    const eventDateTime = new Date(`${eventDate}T${eventTime}`)
    return eventDateTime < new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Calendar</h1>
                <p className="text-muted-foreground">Community events and activities</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading events...</span>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Calendar</h1>
              <p className="text-muted-foreground">Community events and activities</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchEvents}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* View Toggle */}
        <div className="mb-6">
          <div className="flex gap-2">
            <Button
              variant={view === 'upcoming' ? 'default' : 'outline'}
              onClick={() => setView('upcoming')}
            >
              Upcoming Events
            </Button>
            <Button
              variant={view === 'month' ? 'default' : 'outline'}
              onClick={() => setView('month')}
              disabled
            >
              Monthly View (Coming Soon)
            </Button>
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No upcoming events</h3>
                <p className="text-muted-foreground">
                  Check back later for new community events and activities.
                </p>
              </CardContent>
            </Card>
          ) : (
            events.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.max_attendees && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="w-4 h-4 mr-1" />
                          {event.registration_count}/{event.max_attendees}
                        </div>
                      )}
                      {event.is_registered && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Registered
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {event.description && (
                    <p className="text-muted-foreground mb-4">{event.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Organized by {event.organizer?.first_name} {event.organizer?.last_name}
                    </div>
                    
                    <div className="flex gap-2">
                      {isEventPast(event.event_date, event.event_time) ? (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                          Event Ended
                        </span>
                      ) : event.is_registered ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnregister(event.id)}
                        >
                          Unregister
                        </Button>
                      ) : event.max_attendees && event.registration_count >= event.max_attendees ? (
                        <span className="px-3 py-1 bg-red-100 text-red-600 text-sm rounded">
                          Full
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleRegister(event.id)}
                        >
                          Register
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
