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
  Plus,
  Megaphone,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  User,
  AlertTriangle,
  Info,
  Zap
} from 'lucide-react'
import { Announcement } from '@/types/database'
import { toast } from 'sonner'
import { AlertDialog } from '@/components/ui/alert-dialog'

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

export default function SiteAdminAnnouncementsPage() {
  const { user, currentSite } = useSimpleAuth()
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; announcement: Announcement | null }>({
    open: false,
    announcement: null
  })

  useEffect(() => {
    if (user?.role !== 'site_admin' && user?.role !== 'superadmin') {
      router.push('/dashboard')
      return
    }
    fetchAnnouncements()
  }, [user, router])

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

  const handleDelete = async (announcement: Announcement) => {
    try {
      const response = await fetch(`/api/announcements/${announcement.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete announcement')
      }

      toast.success('Announcement deleted successfully')
      fetchAnnouncements()
    } catch (err) {
      console.error('Error deleting announcement:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete announcement')
    }
  }

  const togglePublishStatus = async (announcement: Announcement) => {
    try {
      const response = await fetch(`/api/announcements/${announcement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_published: !announcement.is_published
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update announcement')
      }

      toast.success(`Announcement ${announcement.is_published ? 'unpublished' : 'published'} successfully`)
      fetchAnnouncements()
    } catch (err) {
      console.error('Error updating announcement:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update announcement')
    }
  }

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPriority = !priorityFilter || announcement.priority === priorityFilter
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'published' && announcement.is_published) ||
                         (statusFilter === 'draft' && !announcement.is_published)
    
    return matchesSearch && matchesPriority && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-600 mt-1">
            Manage announcements for {currentSite?.name || 'your site'}
          </p>
        </div>
        <Button onClick={() => router.push('/siteadmin/announcements/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

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
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="important">Important</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter || undefined} onValueChange={(value) => setStatusFilter(value || '')}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || priorityFilter || statusFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setPriorityFilter('')
                  setStatusFilter('')
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
                <p className="text-gray-600 mb-4">
                  {searchTerm || priorityFilter || statusFilter 
                    ? 'Try adjusting your filters or search terms.'
                    : 'Get started by creating your first announcement.'
                  }
                </p>
                {!searchTerm && !priorityFilter && !statusFilter && (
                  <Button onClick={() => router.push('/siteadmin/announcements/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Announcement
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAnnouncements.map((announcement) => {
            const PriorityIcon = priorityConfig[announcement.priority].icon
            return (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {announcement.title}
                        </h3>
                        <Badge className={priorityConfig[announcement.priority].color}>
                          <PriorityIcon className="w-3 h-3 mr-1" />
                          {priorityConfig[announcement.priority].label}
                        </Badge>
                        <Badge className={audienceConfig[announcement.target_audience].color}>
                          {audienceConfig[announcement.target_audience].label}
                        </Badge>
                        <Badge variant={announcement.is_published ? "default" : "secondary"}>
                          {announcement.is_published ? (
                            <>
                              <Eye className="w-3 h-3 mr-1" />
                              Published
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 mr-1" />
                              Draft
                            </>
                          )}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center text-sm text-gray-500 gap-4">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {announcement.author?.first_name} {announcement.author?.last_name}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePublishStatus(announcement)}
                      >
                        {announcement.is_published ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-1" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            Publish
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/siteadmin/announcements/${announcement.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, announcement })}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, announcement: null })}
        title="Delete Announcement"
        description={`Are you sure you want to delete "${deleteDialog.announcement?.title}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteDialog.announcement) {
            handleDelete(deleteDialog.announcement)
            setDeleteDialog({ open: false, announcement: null })
          }
        }}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  )
}
