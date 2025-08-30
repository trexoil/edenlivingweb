'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Megaphone,
  AlertTriangle,
  Info,
  Zap,
  Loader2
} from 'lucide-react'
import { Announcement } from '@/types/database'
import { toast } from 'sonner'

export default function EditAnnouncementPage({ params }: { params: { id: string } }) {
  const { user, currentSite } = useSimpleAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    target_audience: 'all',
    is_published: false
  })

  useEffect(() => {
    fetchAnnouncement()
  }, [params.id])

  const fetchAnnouncement = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/announcements/${params.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch announcement')
      }

      const announcementData = data.announcement
      setAnnouncement(announcementData)
      setFormData({
        title: announcementData.title,
        content: announcementData.content,
        priority: announcementData.priority,
        target_audience: announcementData.target_audience,
        is_published: announcementData.is_published
      })
    } catch (err) {
      console.error('Error fetching announcement:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to fetch announcement')
      router.push('/siteadmin/announcements')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    try {
      setSaving(true)

      const response = await fetch(`/api/announcements/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update announcement')
      }

      toast.success('Announcement updated successfully')
      router.push('/siteadmin/announcements')
    } catch (err) {
      console.error('Error updating announcement:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update announcement')
    } finally {
      setSaving(false)
    }
  }

  const togglePublishStatus = async () => {
    try {
      setSaving(true)

      const newPublishStatus = !formData.is_published
      const response = await fetch(`/api/announcements/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_published: newPublishStatus
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update announcement')
      }

      setFormData({ ...formData, is_published: newPublishStatus })
      toast.success(`Announcement ${newPublishStatus ? 'published' : 'unpublished'} successfully`)
    } catch (err) {
      console.error('Error updating announcement:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update announcement')
    } finally {
      setSaving(false)
    }
  }

  const priorityOptions = [
    { value: 'normal', label: 'Normal', icon: Info, color: 'text-gray-600' },
    { value: 'important', label: 'Important', icon: AlertTriangle, color: 'text-yellow-600' },
    { value: 'urgent', label: 'Urgent', icon: Zap, color: 'text-red-600' },
  ]

  const audienceOptions = [
    { value: 'all', label: 'All Users', description: 'Visible to all residents and staff' },
    { value: 'residents', label: 'Residents Only', description: 'Visible to residents only' },
    { value: 'staff', label: 'Staff Only', description: 'Visible to staff members only' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!announcement) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Announcement not found</h2>
        <p className="text-gray-600 mb-4">The announcement you're looking for doesn't exist.</p>
        <Button onClick={() => router.push('/siteadmin/announcements')}>
          Back to Announcements
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/siteadmin/announcements')}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Announcement</h1>
            <p className="text-gray-600 mt-1">
              Last updated: {new Date(announcement.updated_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={togglePublishStatus}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : formData.is_published ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Publish
              </>
            )}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Megaphone className="w-5 h-5 mr-2" />
              Announcement Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter announcement title..."
                maxLength={255}
                required
              />
              <p className="text-sm text-gray-500">
                {formData.title.length}/255 characters
              </p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter announcement content..."
                rows={8}
                required
              />
              <p className="text-sm text-gray-500">
                {formData.content.length} characters
              </p>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center">
                          <Icon className={`w-4 h-4 mr-2 ${option.color}`} />
                          {option.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="target_audience">Target Audience</Label>
              <Select 
                value={formData.target_audience} 
                onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target audience" />
                </SelectTrigger>
                <SelectContent>
                  {audienceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Publication Status</h4>
                  <p className="text-sm text-gray-600">
                    This announcement is currently {formData.is_published ? 'published' : 'a draft'}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  formData.is_published 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {formData.is_published ? 'Published' : 'Draft'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">
                  {formData.title}
                </h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  formData.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                  formData.priority === 'important' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
                </span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {audienceOptions.find(opt => opt.value === formData.target_audience)?.label}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">
                {formData.content}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/siteadmin/announcements')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
