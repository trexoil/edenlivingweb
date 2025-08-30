'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  site_id?: string
  unit_number?: string
  created_at: string
}

export default function UsersPage() {
  const { user, availableSites } = useSimpleAuth()
  const { showConfirmation, ConfirmationDialogComponent } = useConfirmationDialog()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'admin',
    site_id: 'none',
    unit_number: ''
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'x-superadmin': 'true',
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      if (response.ok && data.users) {
        setUsers(data.users)
      } else {
        console.error('Error fetching users:', data.error)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      if (!newUser.email || !newUser.password || !newUser.first_name || !newUser.last_name) {
        toast.error('Please fill in all required fields')
        return
      }

      // Convert "none" back to empty string for the API
      const userDataForAPI = {
        ...newUser,
        site_id: newUser.site_id === 'none' ? '' : newUser.site_id
      }

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin': 'true'
        },
        body: JSON.stringify(userDataForAPI)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('User created successfully!', {
          description: `${newUser.first_name} ${newUser.last_name} has been added to the system.`
        })
        await fetchUsers()
        setNewUser({
          email: '',
          password: '',
          first_name: '',
          last_name: '',
          role: 'admin',
          site_id: 'none',
          unit_number: ''
        })
      } else {
        toast.error('Failed to create user', {
          description: data.error || 'An unexpected error occurred'
        })
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('Failed to create user', {
        description: 'Network error or server unavailable'
      })
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser({
      ...user,
      site_id: user.site_id || 'none'
    })
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin': 'true'
        },
        body: JSON.stringify({
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          role: editingUser.role,
          site_id: editingUser.site_id,
          unit_number: editingUser.unit_number
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('User updated successfully!', {
          description: `${editingUser.first_name} ${editingUser.last_name} has been updated.`
        })
        await fetchUsers()
        setEditingUser(null)
      } else {
        toast.error('Failed to update user', {
          description: data.error || 'An unexpected error occurred'
        })
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user', {
        description: 'Network error or server unavailable'
      })
    }
  }

  const handleDeleteUser = (userId: string, userName: string) => {
    showConfirmation({
      title: 'Delete User',
      description: `Are you sure you want to delete "${userName}"? This action cannot be undone and will permanently remove the user from the system.`,
      confirmText: 'Delete User',
      cancelText: 'Cancel',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'x-superadmin': 'true'
            }
          })

          const data = await response.json()

          if (response.ok) {
            toast.success('User deleted successfully!', {
              description: `${userName} has been removed from the system.`
            })
            await fetchUsers()
          } else {
            toast.error('Failed to delete user', {
              description: data.error || 'An unexpected error occurred'
            })
          }
        } catch (error) {
          console.error('Error deleting user:', error)
          toast.error('Failed to delete user', {
            description: 'Network error or server unavailable'
          })
        }
      }
    })
  }

  const handleSyncUsers = async () => {
    try {
      const response = await fetch('/api/admin/sync-users', {
        method: 'POST',
        headers: {
          'x-superadmin': 'true',
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Users synced successfully!', {
          description: `Successfully synced ${data.synced_count} users from the database.`
        })
        await fetchUsers()
      } else {
        toast.error('Failed to sync users', {
          description: data.error || 'An unexpected error occurred'
        })
      }
    } catch (error) {
      console.error('Error syncing users:', error)
      toast.error('Failed to sync users', {
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
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage system users and administrators</p>
        </div>
        <Button asChild>
          <a href="/superadmin">← Back to Dashboard</a>
        </Button>
      </div>

      {/* Confirmation Dialog */}
      {ConfirmationDialogComponent}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>System Users ({users.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncUsers}
              className="ml-auto"
            >
              Sync Users
            </Button>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {users.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{user.first_name} {user.last_name}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-xs text-gray-500 capitalize">Role: {user.role}</p>
                          {user.site_id && (
                            <p className="text-xs text-gray-500">
                              Site: {availableSites.find(s => s.id === user.site_id)?.name || user.site_id}
                            </p>
                          )}
                          {user.unit_number && (
                            <p className="text-xs text-gray-500">Unit: {user.unit_number}</p>
                          )}
                        </div>
                        <div className="text-right space-y-2">
                          <div>
                            <span className="text-xs text-gray-500">
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                            >
                              Delete
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

        {/* Create/Edit User Form */}
        <Card>
          <CardHeader>
            <CardTitle>{editingUser ? 'Edit User' : 'Create New User'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!editingUser && (
              <>
                <div>
                  <Label htmlFor="user-email">Email Address</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="user-password">Password</Label>
                  <Input
                    id="user-password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    placeholder="••••••••"
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="user-firstname">First Name</Label>
              <Input
                id="user-firstname"
                value={editingUser ? editingUser.first_name : newUser.first_name}
                onChange={(e) => {
                  if (editingUser) {
                    setEditingUser({...editingUser, first_name: e.target.value})
                  } else {
                    setNewUser({...newUser, first_name: e.target.value})
                  }
                }}
                placeholder="John"
              />
            </div>
            <div>
              <Label htmlFor="user-lastname">Last Name</Label>
              <Input
                id="user-lastname"
                value={editingUser ? editingUser.last_name : newUser.last_name}
                onChange={(e) => {
                  if (editingUser) {
                    setEditingUser({...editingUser, last_name: e.target.value})
                  } else {
                    setNewUser({...newUser, last_name: e.target.value})
                  }
                }}
                placeholder="Doe"
              />
            </div>
            <div>
              <Label htmlFor="user-role">Role</Label>
              <Select
                value={editingUser ? editingUser.role : newUser.role}
                onValueChange={(value) => {
                  console.log('Role changed to:', value)
                  if (editingUser) {
                    setEditingUser({...editingUser, role: value})
                  } else {
                    setNewUser({...newUser, role: value})
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="staff">Staff Member</SelectItem>
                  {editingUser && editingUser.role === 'resident' && (
                    <SelectItem value="resident">Resident</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {editingUser ? 'Update user role' : 'Superadmin can only create Administrator and Staff accounts'}
              </p>
            </div>
            <div>
              <Label htmlFor="user-site">Assign to Site</Label>
              <Select
                value={editingUser ? (editingUser.site_id || 'none') : newUser.site_id}
                onValueChange={(value) => {
                  if (editingUser) {
                    setEditingUser({...editingUser, site_id: value})
                  } else {
                    setNewUser({...newUser, site_id: value})
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No site assigned</SelectItem>
                  {availableSites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name} - {site.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {((editingUser && editingUser.role === 'resident') || (!editingUser && newUser.role === 'resident')) && (
              <div>
                <Label htmlFor="user-unit">Unit Number</Label>
                <Input
                  id="user-unit"
                  value={editingUser ? (editingUser.unit_number || '') : newUser.unit_number}
                  onChange={(e) => {
                    if (editingUser) {
                      setEditingUser({...editingUser, unit_number: e.target.value})
                    } else {
                      setNewUser({...newUser, unit_number: e.target.value})
                    }
                  }}
                  placeholder="A-101"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required for residents only
                </p>
              </div>
            )}
            {editingUser ? (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleUpdateUser}>
                  Update User
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={handleCreateUser}>
                Create User
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
