'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MessageSquare
} from 'lucide-react'
import { HelpDeskTicket } from '@/types/database'

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

export default function HelpdeskPage() {
  const { user } = useSimpleAuth()
  const router = useRouter()
  const [tickets, setTickets] = useState<HelpDeskTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/helpdesk/tickets')
      
      if (!response.ok) {
        throw new Error('Failed to fetch tickets')
      }

      const data = await response.json()
      setTickets(data.tickets || [])
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError('Failed to load tickets')
    } finally {
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-2xl font-bold">Help & Support</h1>
                <p className="text-muted-foreground">Manage your support tickets</p>
              </div>
            </div>
            <Button onClick={() => router.push('/dashboard/helpdesk/new')}>
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {tickets.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No support tickets yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first support ticket to get help from our team.
              </p>
              <Button onClick={() => router.push('/dashboard/helpdesk/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Ticket
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Support Tickets</h2>
              <p className="text-sm text-muted-foreground">
                {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
              </p>
            </div>

            {tickets.map((ticket) => {
              const StatusIcon = statusConfig[ticket.status].icon
              const category = categoryConfig[ticket.category]
              
              return (
                <Card 
                  key={ticket.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/helpdesk/${ticket.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{category.emoji}</div>
                        <div>
                          <CardTitle className="text-lg">{ticket.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {category.label} • Created {formatDate(ticket.created_at)}
                          </p>
                        </div>
                      </div>
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
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ticket.description}
                    </p>
                    {ticket.resolved_at && (
                      <p className="text-xs text-green-600 mt-2">
                        Resolved on {formatDate(ticket.resolved_at)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
