'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MessageSquare,
  Send,
  User
} from 'lucide-react'
import { HelpDeskTicket } from '@/types/database'
import { toast } from 'sonner'

interface HelpDeskResponse {
  id: string
  ticket_id: string
  responder_id: string
  message: string
  created_at: string
  responder?: {
    id: string
    first_name: string
    last_name: string
    email: string
    role: string
  }
}

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800', icon: XCircle },
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' },
}

const categoryConfig = {
  maintenance: { label: 'Maintenance', emoji: '🔧' },
  technical: { label: 'Technical', emoji: '💻' },
  general: { label: 'General', emoji: '❓' },
  complaint: { label: 'Complaint', emoji: '😞' },
  suggestion: { label: 'Suggestion', emoji: '💡' },
}

export default function TicketDetailPage() {
  const { user } = useSimpleAuth()
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id as string

  const [ticket, setTicket] = useState<HelpDeskTicket | null>(null)
  const [responses, setResponses] = useState<HelpDeskResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newResponse, setNewResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails()
    }
  }, [ticketId])

  const fetchTicketDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/helpdesk/tickets/${ticketId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch ticket details')
      }

      const data = await response.json()
      setTicket(data.ticket)
      setResponses(data.responses || [])
    } catch (err) {
      console.error('Error fetching ticket:', err)
      setError('Failed to load ticket details')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newResponse.trim()) {
      toast.error('Please enter a response')
      return
    }

    try {
      setSubmitting(true)
      
      const response = await fetch(`/api/helpdesk/tickets/${ticketId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newResponse.trim()
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit response')
      }

      toast.success('Response submitted successfully!')
      setNewResponse('')
      fetchTicketDetails() // Refresh to show new response
    } catch (error) {
      console.error('Error submitting response:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit response')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/helpdesk')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Support
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Ticket Not Found</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ticket Not Found</h3>
                <p className="text-muted-foreground mb-4">
                  {error || 'The support ticket you are looking for could not be found.'}
                </p>
                <Button onClick={() => router.push('/dashboard/helpdesk')}>
                  Back to Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const category = categoryConfig[ticket.category]
  const StatusIcon = statusConfig[ticket.status].icon

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard/helpdesk')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Support
            </Button>
            <div className="flex items-center gap-3">
              <div className="text-2xl">{category.emoji}</div>
              <div>
                <h1 className="text-2xl font-bold">{ticket.title}</h1>
                <p className="text-muted-foreground">
                  {category.label} • Created {formatDate(ticket.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ticket Details</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={priorityConfig[ticket.priority].color}>
                    {priorityConfig[ticket.priority].label}
                  </Badge>
                  <Badge className={statusConfig[ticket.status].color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig[ticket.status].label}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Category</p>
                    <p className="text-sm">{category.label}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Priority</p>
                    <p className="text-sm">{priorityConfig[ticket.priority].label}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className="text-sm">{statusConfig[ticket.status].label}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="text-sm">{formatDate(ticket.created_at)}</p>
                  </div>
                  {ticket.resolved_at && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                      <p className="text-sm text-green-600">{formatDate(ticket.resolved_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Responses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conversation ({responses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {responses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No responses yet. Be the first to add a comment!</p>
                  </div>
                ) : (
                  responses.map((response) => (
                    <div key={response.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">
                              {response.responder?.first_name} {response.responder?.last_name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {response.responder?.role}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(response.created_at)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{response.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Add Response Form */}
                {ticket.status !== 'closed' && (
                  <form onSubmit={handleSubmitResponse} className="border-t pt-4">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="response" className="block text-sm font-medium mb-2">
                          Add a response
                        </label>
                        <Textarea
                          id="response"
                          placeholder="Type your message here..."
                          value={newResponse}
                          onChange={(e) => setNewResponse(e.target.value)}
                          rows={4}
                          disabled={submitting}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={submitting || !newResponse.trim()}>
                          {submitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Response
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
