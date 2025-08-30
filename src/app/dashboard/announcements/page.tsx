'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowLeft,
  Megaphone,
  Search,
  Calendar,
  User,
  AlertTriangle,
  Info,
  Zap,
  Clock
} from 'lucide-react'
import { Announcement } from '@/types/database'
import { toast } from 'sonner'

const priorityConfig = {
  normal: { label: 'Normal', color: 'bg-gray-100 text-gray-800', icon: Info },
  important: { label: 'Important', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800', icon: Zap },
}

const audienceConfig = {
  all: { label: 'All', color: 'bg-blue-100 text-blue-800' },
  residents: { label: 'Residents', color: 'bg-green-100 text-green-800' },
  staff: { label: 'Staff', color: 'bg-purple-100 text-purple-800' },
}

export default function ResidentAnnouncementsPage() {
  const { user, currentSite } = useSimpleAuth()
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/announcements')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch announcements')
      }

      setAnnouncements(data.announcements || [])
    } catch (err) {
      console.error('Error fetching announcements:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch announcements')
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPriority = !priorityFilter || announcement.priority === priorityFilter
    
    return matchesSearch && matchesPriority
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const isRecent = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    return diffInHours < 48 // Less than 48 hours
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
                <h1 className="text-2xl font-bold">Announcements</h1>
                <p className="text-muted-foreground">Community updates and news</p>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
              <h1 className="text-2xl font-bold">Announcements</h1>
              <p className="text-muted-foreground">
                Community updates for {currentSite?.name || 'your community'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search announcements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={priorityFilter || undefined} onValueChange={(value) => setPriorityFilter(value || '')}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || priorityFilter) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('')
                    setPriorityFilter('')
                  }}
                  className="whitespace-nowrap"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
              <Button 
                variant="outline" 
                onClick={fetchAnnouncements}
                className="mt-2"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Announcements List */}
        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements found</h3>
                  <p className="text-gray-600">
                    {searchTerm || priorityFilter 
                      ? 'Try adjusting your filters or search terms.'
                      : 'There are no announcements at this time.'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredAnnouncements.map((announcement) => {
              const PriorityIcon = priorityConfig[announcement.priority].icon
              const recent = isRecent(announcement.published_at || announcement.created_at)
              
              return (
                <Card 
                  key={announcement.id} 
                  className={`hover:shadow-md transition-all cursor-pointer ${
                    recent ? 'ring-2 ring-blue-200 bg-blue-50/30' : ''
                  }`}
                  onClick={() => router.push(`/dashboard/announcements/${announcement.id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {recent && (
                              <Badge className="bg-blue-100 text-blue-800">
                                <Clock className="w-3 h-3 mr-1" />
                                New
                              </Badge>
                            )}
                            <Badge className={priorityConfig[announcement.priority].color}>
                              <PriorityIcon className="w-3 h-3 mr-1" />
                              {priorityConfig[announcement.priority].label}
                            </Badge>
                            <Badge className={audienceConfig[announcement.target_audience].color}>
                              {audienceConfig[announcement.target_audience].label}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {announcement.title}
                          </h3>
                          <p className="text-gray-600 line-clamp-3 mb-3">
                            {announcement.content}
                          </p>
                          <div className="flex items-center text-sm text-gray-500 gap-4">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-1" />
                              {announcement.author?.first_name} {announcement.author?.last_name}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(announcement.published_at || announcement.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Stats */}
        {filteredAnnouncements.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-sm text-gray-500">
                Showing {filteredAnnouncements.length} of {announcements.length} announcements
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
