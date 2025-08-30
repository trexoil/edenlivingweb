'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface SystemSettings {
  site_name: string
  admin_email: string
  support_email: string
  phone_number: string
  address: string
  timezone: string
  currency: string
  language: string
  maintenance_mode: boolean
  user_registration: boolean
  email_notifications: boolean
  sms_notifications: boolean
  backup_frequency: string
  max_file_size: number
  session_timeout: number
}

export default function SettingsPage() {
  const { user } = useSimpleAuth()
  const [settings, setSettings] = useState<SystemSettings>({
    site_name: 'Eden Living Management System',
    admin_email: 'admin@edenliving.com',
    support_email: 'support@edenliving.com',
    phone_number: '+60 3-1234 5678',
    address: 'Kuala Lumpur, Malaysia',
    timezone: 'Asia/Kuala_Lumpur',
    currency: 'MYR',
    language: 'en',
    maintenance_mode: false,
    user_registration: true,
    email_notifications: true,
    sms_notifications: false,
    backup_frequency: 'daily',
    max_file_size: 10,
    session_timeout: 30
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Settings saved successfully!', {
        description: 'All configuration changes have been applied.'
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings', {
        description: 'An error occurred while saving your configuration.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetSettings = () => {
    setShowResetConfirm(true)
  }

  const confirmResetSettings = () => {
    setSettings({
      site_name: 'Eden Living Management System',
      admin_email: 'admin@edenliving.com',
      support_email: 'support@edenliving.com',
      phone_number: '+60 3-1234 5678',
      address: 'Kuala Lumpur, Malaysia',
      timezone: 'Asia/Kuala_Lumpur',
      currency: 'MYR',
      language: 'en',
      maintenance_mode: false,
      user_registration: true,
      email_notifications: true,
      sms_notifications: false,
      backup_frequency: 'daily',
      max_file_size: 10,
      session_timeout: 30
    })
    toast.success('Settings reset successfully!', {
      description: 'All settings have been restored to default values.'
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure system-wide settings and preferences</p>
        </div>
        <Button asChild>
          <a href="/superadmin">← Back to Dashboard</a>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="site-name">Site Name</Label>
              <Input
                id="site-name"
                value={settings.site_name}
                onChange={(e) => setSettings({...settings, site_name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={settings.admin_email}
                onChange={(e) => setSettings({...settings, admin_email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="support-email">Support Email</Label>
              <Input
                id="support-email"
                type="email"
                value={settings.support_email}
                onChange={(e) => setSettings({...settings, support_email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={settings.phone_number}
                onChange={(e) => setSettings({...settings, phone_number: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={settings.address}
                onChange={(e) => setSettings({...settings, address: e.target.value})}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Localization Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Localization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => setSettings({...settings, timezone: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur</SelectItem>
                  <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                  <SelectItem value="Asia/Bangkok">Asia/Bangkok</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) => setSettings({...settings, currency: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MYR">Malaysian Ringgit (MYR)</SelectItem>
                  <SelectItem value="SGD">Singapore Dollar (SGD)</SelectItem>
                  <SelectItem value="USD">US Dollar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => setSettings({...settings, language: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ms">Bahasa Malaysia</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="ta">தமிழ்</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* System Features */}
        <Card>
          <CardHeader>
            <CardTitle>System Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                <p className="text-sm text-gray-500">Temporarily disable site access</p>
              </div>
              <Switch
                id="maintenance-mode"
                checked={settings.maintenance_mode}
                onCheckedChange={(checked) => setSettings({...settings, maintenance_mode: checked})}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="user-registration">User Registration</Label>
                <p className="text-sm text-gray-500">Allow new user registrations</p>
              </div>
              <Switch
                id="user-registration"
                checked={settings.user_registration}
                onCheckedChange={(checked) => setSettings({...settings, user_registration: checked})}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-gray-500">Send system email notifications</p>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.email_notifications}
                onCheckedChange={(checked) => setSettings({...settings, email_notifications: checked})}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sms-notifications">SMS Notifications</Label>
                <p className="text-sm text-gray-500">Send SMS notifications</p>
              </div>
              <Switch
                id="sms-notifications"
                checked={settings.sms_notifications}
                onCheckedChange={(checked) => setSettings({...settings, sms_notifications: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="backup-frequency">Backup Frequency</Label>
              <Select
                value={settings.backup_frequency}
                onValueChange={(value) => setSettings({...settings, backup_frequency: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="max-file-size">Max File Size (MB)</Label>
              <Input
                id="max-file-size"
                type="number"
                value={settings.max_file_size}
                onChange={(e) => setSettings({...settings, max_file_size: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                value={settings.session_timeout}
                onChange={(e) => setSettings({...settings, session_timeout: parseInt(e.target.value) || 0})}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={handleResetSettings}>
          Reset to Defaults
        </Button>
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <AlertDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Reset Settings"
        description="Are you sure you want to reset all settings to default values? This action cannot be undone."
        onConfirm={confirmResetSettings}
        confirmText="Reset Settings"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}
