'use client'

import { useState } from 'react'
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
  Megaphone,
  AlertTriangle,
  Info,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'

export default function NewAnnouncementPage() {
  const { user, currentSite } = useSimpleAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    target_audience: 'all',
    is_published: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create announcement')
      }

      toast.success('Announcement created successfully')
      router.push('/siteadmin/announcements')
    } catch (err) {
      console.error('Error creating announcement:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to create announcement')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    const draftData = { ...formData, is_published: false }
    
    if (!draftData.title.trim() || !draftData.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save draft')
      }

      toast.success('Draft saved successfully')
      router.push('/siteadmin/announcements')
    } catch (err) {
      console.error('Error saving draft:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setLoading(false)
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/siteadmin/announcements')}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Announcement</h1>
          <p className="text-gray-600 mt-1">
            Create an announcement for {currentSite?.name || 'your site'}
          </p>
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

            {/* Publish Option */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_published: checked as boolean })
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="is_published" className="text-sm font-semibold text-blue-900">
                    Publish immediately
                  </Label>
                  <p className="text-sm text-blue-700 mt-1">
                    {formData.is_published
                      ? "✅ This announcement will be visible to residents immediately after creation"
                      : "⚠️ This announcement will be saved as a draft and won't be visible until published"
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        {(formData.title || formData.content) && (
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
                    {formData.title || 'Announcement Title'}
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
                  {formData.content || 'Announcement content will appear here...'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/siteadmin/announcements')}
            disabled={loading}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                'Creating...'
              ) : formData.is_published ? (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Create & Publish
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Draft
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
