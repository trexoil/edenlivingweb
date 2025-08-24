'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function ServicesPage() {
  const router = useRouter()
  const [serviceType, setServiceType] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    scheduledDate: '',
    specialInstructions: ''
  })

  const serviceTypes = [
    { value: 'meal', label: 'Meal Ordering' },
    { value: 'laundry', label: 'Laundry Service' },
    { value: 'housekeeping', label: 'Housekeeping' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'home_care', label: 'Home Care' },
    { value: 'medical', label: 'Medical Appointment' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would submit to Supabase
    console.log('Submitting service request:', { type: serviceType, ...formData })
    
    // Show success message and redirect
    alert('Service request submitted successfully!')
    router.push('/dashboard')
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Service Requests</h1>
            <p className="text-muted-foreground">Request services for your needs</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>New Service Request</CardTitle>
            <CardDescription>
              Fill out the form below to submit a service request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Service Type */}
              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Brief description of your request"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide detailed information about your request..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  required
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => handleInputChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scheduled Date */}
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Preferred Date (Optional)</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                />
              </div>

              {/* Special Instructions */}
              {serviceType && (
                <div className="space-y-2">
                  <Label htmlFor="specialInstructions">
                    {serviceType === 'meal' && 'Dietary Preferences'}
                    {serviceType === 'laundry' && 'Laundry Instructions'}
                    {serviceType === 'medical' && 'Medical Notes'}
                    {serviceType === 'home_care' && 'Care Requirements'}
                    {serviceType === 'maintenance' && 'Location Details'}
                    {serviceType === 'transportation' && 'Transportation Details'}
                    {!['meal', 'laundry', 'medical', 'home_care', 'maintenance', 'transportation'].includes(serviceType) && 'Special Instructions'}
                  </Label>
                  <Textarea
                    id="specialInstructions"
                    placeholder={
                      serviceType === 'meal' ? 'Any dietary restrictions or preferences...' :
                      serviceType === 'laundry' ? 'Special washing instructions...' :
                      serviceType === 'medical' ? 'Medical history or notes for the appointment...' :
                      serviceType === 'home_care' ? 'Specific care requirements...' :
                      serviceType === 'maintenance' ? 'Exact location of the issue...' :
                      serviceType === 'transportation' ? 'Pickup/dropoff details...' :
                      'Any special instructions...'
                    }
                    rows={3}
                    value={formData.specialInstructions}
                    onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')}
                >
                  Cancel
                </Button>
                <Button type="submit">Submit Request</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Service Information */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">Available Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceTypes.map((service) => (
              <Card key={service.value} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{service.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {service.value === 'meal' && 'Order meals with dietary preferences'}
                    {service.value === 'laundry' && 'Schedule laundry and dry-cleaning'}
                    {service.value === 'housekeeping' && 'Book cleaning services'}
                    {service.value === 'transportation' && 'Request shuttle or private transport'}
                    {service.value === 'maintenance' && 'Report repairs and maintenance issues'}
                    {service.value === 'home_care' && 'Schedule nursing or caregiver visits'}
                    {service.value === 'medical' && 'Book medical appointments and consultations'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
