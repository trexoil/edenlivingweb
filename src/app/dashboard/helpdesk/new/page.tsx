'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Send } from 'lucide-react'
import { toast } from 'sonner'
import { HelpDeskTicketCategory, HelpDeskTicketPriority } from '@/types/database'

const categoryOptions = [
  { value: 'maintenance', label: 'Maintenance', description: 'Issues with facilities, repairs, or maintenance requests' },
  { value: 'technical', label: 'Technical Support', description: 'IT issues, internet, or technology-related problems' },
  { value: 'general', label: 'General Inquiry', description: 'General questions or information requests' },
  { value: 'complaint', label: 'Complaint', description: 'Service complaints or concerns' },
  { value: 'suggestion', label: 'Suggestion', description: 'Ideas for improvements or new services' },
]

const priorityOptions = [
  { value: 'low', label: 'Low', description: 'Non-urgent, can wait a few days' },
  { value: 'medium', label: 'Medium', description: 'Normal priority, should be addressed soon' },
  { value: 'high', label: 'High', description: 'Important, needs attention within 24 hours' },
  { value: 'urgent', label: 'Urgent', description: 'Critical issue requiring immediate attention' },
]

export default function NewTicketPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as HelpDeskTicketCategory | '',
    priority: 'medium' as HelpDeskTicketPriority,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/helpdesk/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create ticket')
      }

      const data = await response.json()
      
      toast.success('Support ticket created successfully!', {
        description: 'Our team will review your request and respond soon.',
      })
      
      router.push(`/dashboard/helpdesk/${data.ticket.id}`)
    } catch (error) {
      console.error('Error creating ticket:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
              onClick={() => router.push('/dashboard/helpdesk')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Support
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create Support Ticket</h1>
              <p className="text-muted-foreground">Get help from our support team</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>New Support Request</CardTitle>
            <p className="text-sm text-muted-foreground">
              Please provide as much detail as possible to help us assist you quickly.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Brief description of your issue"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value as HelpDeskTicketPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Please provide detailed information about your issue, including any steps you've already tried..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The more details you provide, the faster we can help you.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/helpdesk')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Create Ticket
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
