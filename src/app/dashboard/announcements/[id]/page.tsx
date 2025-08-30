'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Calendar,
  User,
  AlertTriangle,
  Info,
  Zap,
  Clock,
  Share2,
  Megaphone
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

export default function AnnouncementDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, currentSite } = useSimpleAuth()
  const router = useRouter()
  const resolvedParams = use(params)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnnouncement()
  }, [resolvedParams.id])

  const fetchAnnouncement = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/announcements/${resolvedParams.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch announcement')
      }

      setAnnouncement(data.announcement)
    } catch (err) {
      console.error('Error fetching announcement:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch announcement')
      toast.error('Failed to load announcement')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isRecent = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    return diffInHours < 48 // Less than 48 hours
  }

  const handleShare = async () => {
    if (navigator.share && announcement) {
      try {
        await navigator.share({
          title: announcement.title,
          text: announcement.content,
          url: window.location.href,
        })
      } catch (err) {
        // Fallback to copying to clipboard
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  const copyToClipboard = () => {
    if (announcement) {
      const text = `${announcement.title}\n\n${announcement.content}\n\nView at: ${window.location.href}`
      navigator.clipboard.writeText(text).then(() => {
        toast.success('Announcement copied to clipboard')
      }).catch(() => {
        toast.error('Failed to copy to clipboard')
      })
    }
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
                onClick={() => router.push('/dashboard/announcements')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Announcements
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Loading...</h1>
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

  if (error || !announcement) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/announcements')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Announcements
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Announcement Not Found</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Megaphone className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-red-900 mb-2">Announcement Not Found</h3>
                <p className="text-red-600 mb-4">
                  {error || 'The announcement you\'re looking for doesn\'t exist or you don\'t have permission to view it.'}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard/announcements')}
                >
                  Back to Announcements
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const PriorityIcon = priorityConfig[announcement.priority].icon
  const recent = isRecent(announcement.published_at || announcement.created_at)

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
                onClick={() => router.push('/dashboard/announcements')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Announcements
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Announcement Details</h1>
                <p className="text-muted-foreground">
                  From {currentSite?.name || 'your community'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className={recent ? 'ring-2 ring-blue-200 bg-blue-50/30' : ''}>
          <CardHeader>
            <div className="space-y-4">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
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

              {/* Title */}
              <CardTitle className="text-3xl font-bold text-gray-900">
                {announcement.title}
              </CardTitle>

              {/* Meta Information */}
              <div className="flex items-center text-sm text-gray-500 gap-6 pt-2 border-t">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  <span className="font-medium">
                    {announcement.author?.first_name} {announcement.author?.last_name}
                  </span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    Published {formatDate(announcement.published_at || announcement.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="prose prose-gray max-w-none">
              <div className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                {announcement.content}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-gray-500">
              <p>
                This announcement was published on{' '}
                {formatDate(announcement.published_at || announcement.created_at)}
                {announcement.updated_at !== announcement.created_at && (
                  <span> and last updated on {formatDate(announcement.updated_at)}</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
