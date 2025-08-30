'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface Site {
  id: string
  name: string
  address: string
  city: string
  state: string
  postal_code: string
  total_units: number
  available_services: string[]
  created_at: string
}

const AVAILABLE_SERVICES = [
  'meal',
  'laundry',
  'housekeeping',
  'transportation',
  'maintenance',
  'home_care',
  'medical'
]

export default function SitesPage() {
  const { user } = useSimpleAuth()
  const [sites, setSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [newSite, setNewSite] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    total_units: 0,
    available_services: [] as string[]
  })

  useEffect(() => {
    fetchSites()
  }, [])

  const fetchSites = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/sites', {
        headers: {
          'x-superadmin': 'true',
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()

      if (response.ok && data.sites) {
        // Map total_bedrooms from database to total_units for frontend
        const mappedSites = data.sites.map((site: any) => ({
          ...site,
          total_units: site.total_bedrooms || site.total_units || 0
        }))
        setSites(mappedSites)
      } else {
        console.error('Error fetching sites:', data.error)
      }
    } catch (error) {
      console.error('Error fetching sites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSite = async () => {
    try {
      if (!newSite.name || !newSite.address || !newSite.city || !newSite.state) {
        toast.error('Please fill in all required fields')
        return
      }

      const response = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin': 'true'
        },
        body: JSON.stringify(newSite)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Site created successfully!', {
          description: `${newSite.name} has been added to the system.`
        })
        await fetchSites()
        setNewSite({
          name: '',
          address: '',
          city: '',
          state: '',
          postal_code: '',
          total_units: 0,
          available_services: []
        })
      } else {
        toast.error('Failed to create site', {
          description: data.error || 'An unexpected error occurred'
        })
      }
    } catch (error) {
      console.error('Error creating site:', error)
      toast.error('Failed to create site', {
        description: 'Network error or server unavailable'
      })
    }
  }

  const handleServiceChange = (service: string, checked: boolean) => {
    if (editingSite) {
      // Handle editing mode
      setEditingSite({
        ...editingSite,
        available_services: checked
          ? [...editingSite.available_services, service]
          : editingSite.available_services.filter(s => s !== service)
      })
    } else {
      // Handle new site mode
      if (checked) {
        setNewSite({
          ...newSite,
          available_services: [...newSite.available_services, service]
        })
      } else {
        setNewSite({
          ...newSite,
          available_services: newSite.available_services.filter(s => s !== service)
        })
      }
    }
  }

  const handleEditSite = (site: Site) => {
    // Ensure total_units is properly set for editing
    setEditingSite({
      ...site,
      total_units: site.total_units || 0
    })
  }

  const handleCancelEdit = () => {
    setEditingSite(null)
  }

  const handleUpdateSite = async () => {
    if (!editingSite) return

    try {
      const response = await fetch(`/api/admin/sites/${editingSite.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin': 'true'
        },
        body: JSON.stringify({
          name: editingSite.name,
          address: editingSite.address,
          city: editingSite.city,
          state: editingSite.state,
          postal_code: editingSite.postal_code,
          total_units: editingSite.total_units,
          available_services: editingSite.available_services
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Site updated successfully!', {
          description: `${editingSite.name} has been updated.`
        })
        await fetchSites()
        setEditingSite(null)
      } else {
        toast.error('Failed to update site', {
          description: data.error || 'An unexpected error occurred'
        })
      }
    } catch (error) {
      console.error('Error updating site:', error)
      toast.error('Failed to update site', {
        description: 'Network error or server unavailable'
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Management</h1>
          <p className="text-gray-600">Create and manage Eden Living sites</p>
        </div>
        <Button asChild>
          <a href="/superadmin">← Back to Dashboard</a>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sites List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Eden Living Sites ({sites.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {sites.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No sites found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sites.map((site) => (
                  <Card key={site.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-lg">{site.name}</h4>
                          <p className="text-sm text-gray-600">{site.address}</p>
                          <p className="text-sm text-gray-600">
                            {site.city}, {site.state} {site.postal_code}
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            <span className="font-medium">Units:</span> {site.total_units}
                          </p>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Services:</span> {site.available_services.join(', ') || 'None'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-gray-500">
                              Created: {new Date(site.created_at).toLocaleDateString()}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSite(site)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Site Form */}
        <Card>
          <CardHeader>
            <CardTitle>{editingSite ? 'Edit Site' : 'Create New Site'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="site-name">Site Name *</Label>
              <Input
                id="site-name"
                value={editingSite ? editingSite.name || '' : newSite.name || ''}
                onChange={(e) => {
                  if (editingSite) {
                    setEditingSite({...editingSite, name: e.target.value})
                  } else {
                    setNewSite({...newSite, name: e.target.value})
                  }
                }}
                placeholder="Eden Living Branch"
              />
            </div>
            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={editingSite ? editingSite.address || '' : newSite.address || ''}
                onChange={(e) => {
                  if (editingSite) {
                    setEditingSite({...editingSite, address: e.target.value})
                  } else {
                    setNewSite({...newSite, address: e.target.value})
                  }
                }}
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={editingSite ? editingSite.city || '' : newSite.city || ''}
                onChange={(e) => {
                  if (editingSite) {
                    setEditingSite({...editingSite, city: e.target.value})
                  } else {
                    setNewSite({...newSite, city: e.target.value})
                  }
                }}
                placeholder="Kuala Lumpur"
              />
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={editingSite ? editingSite.state || '' : newSite.state || ''}
                onChange={(e) => {
                  if (editingSite) {
                    setEditingSite({...editingSite, state: e.target.value})
                  } else {
                    setNewSite({...newSite, state: e.target.value})
                  }
                }}
                placeholder="Wilayah Persekutuan"
              />
            </div>
            <div>
              <Label htmlFor="postal">Postal Code</Label>
              <Input
                id="postal"
                value={editingSite ? editingSite.postal_code || '' : newSite.postal_code || ''}
                onChange={(e) => {
                  if (editingSite) {
                    setEditingSite({...editingSite, postal_code: e.target.value})
                  } else {
                    setNewSite({...newSite, postal_code: e.target.value})
                  }
                }}
                placeholder="50000"
              />
            </div>
            <div>
              <Label htmlFor="units">Total Units</Label>
              <Input
                id="units"
                type="number"
                value={editingSite ? (editingSite.total_units || 0).toString() : (newSite.total_units || 0).toString()}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0
                  if (editingSite) {
                    setEditingSite({...editingSite, total_units: value})
                  } else {
                    setNewSite({...newSite, total_units: value})
                  }
                }}
                placeholder="100"
              />
            </div>
            <div>
              <Label>Available Services</Label>
              <div className="space-y-2 mt-2">
                {AVAILABLE_SERVICES.map((service) => (
                  <div key={service} className="flex items-center space-x-2">
                    <Checkbox
                      id={service}
                      checked={editingSite
                        ? editingSite.available_services.includes(service)
                        : newSite.available_services.includes(service)
                      }
                      onCheckedChange={(checked) => handleServiceChange(service, checked as boolean)}
                    />
                    <Label htmlFor={service} className="text-sm capitalize">
                      {service.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            {editingSite ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleUpdateSite} className="flex-1">
                  Update Site
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={handleCreateSite}>
                Create Site
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
