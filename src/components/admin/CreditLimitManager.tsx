'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Edit, Save, X, DollarSign } from 'lucide-react'
import { Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface ResidentBalance {
  id: string
  first_name: string
  last_name: string
  email: string
  unit_number: string | null
  credit_limit: number
  current_balance: number
  available_credit: number
}

export default function CreditLimitManager() {
  const [residents, setResidents] = useState<ResidentBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchResidents()
  }, [])

  const fetchResidents = async () => {
    try {
      setLoading(true)
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, unit_number, credit_limit, current_balance')
        .eq('role', 'resident')
        .order('last_name', { ascending: true })

      if (error) {
        console.error('Error fetching residents:', error)
        toast.error('Failed to load residents')
        return
      }

      const residentsWithCalculations: ResidentBalance[] = profiles.map(profile => ({
        ...profile,
        credit_limit: profile.credit_limit || 2000,
        current_balance: profile.current_balance || 0,
        available_credit: (profile.credit_limit || 2000) - (profile.current_balance || 0)
      }))

      setResidents(residentsWithCalculations)
    } catch (error) {
      console.error('Error fetching residents:', error)
      toast.error('Failed to load residents')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (residentId: string, currentLimit: number) => {
    setEditingId(residentId)
    setEditValue(currentLimit)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue(0)
  }

  const saveCreditLimit = async (residentId: string) => {
    if (editValue < 0) {
      toast.error('Credit limit cannot be negative')
      return
    }

    if (editValue > 50000) {
      toast.error('Credit limit cannot exceed RM50,000')
      return
    }

    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          credit_limit: editValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', residentId)

      if (error) {
        console.error('Error updating credit limit:', error)
        toast.error('Failed to update credit limit')
        return
      }

      // Update local state
      setResidents(prev => 
        prev.map(resident => 
          resident.id === residentId
            ? { 
                ...resident, 
                credit_limit: editValue,
                available_credit: editValue - resident.current_balance
              }
            : resident
        )
      )

      setEditingId(null)
      toast.success('Credit limit updated successfully')
      
    } catch (error) {
      console.error('Error updating credit limit:', error)
      toast.error('Failed to update credit limit')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `RM${amount.toFixed(2)}`
  }

  const getBalanceColor = (balance: number, limit: number) => {
    const percentage = (balance / limit) * 100
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-orange-600'
    if (percentage >= 50) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getAvailableCreditBadge = (available: number) => {
    if (available < 0) return 'destructive'
    if (available < 500) return 'secondary'
    return 'default'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading residents...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Credit Limit Management</h2>
          <p className="text-muted-foreground">
            Manage resident credit limits and monitor balances
          </p>
        </div>
        <Button onClick={fetchResidents} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {residents.map((resident) => (
          <Card key={resident.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">
                      {resident.first_name} {resident.last_name}
                    </h3>
                    {resident.unit_number && (
                      <Badge variant="outline">Unit {resident.unit_number}</Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {resident.email}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Credit Limit</Label>
                      {editingId === resident.id ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            className="w-24 h-8 text-sm"
                            min="0"
                            max="50000"
                            step="100"
                          />
                          <Button
                            size="sm"
                            onClick={() => saveCreditLimit(resident.id)}
                            disabled={saving}
                            className="h-8 w-8 p-0"
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                            className="h-8 w-8 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <p className="font-medium">{formatCurrency(resident.credit_limit)}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(resident.id, resident.credit_limit)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Current Balance</Label>
                      <p className={`font-medium mt-1 ${getBalanceColor(resident.current_balance, resident.credit_limit)}`}>
                        {formatCurrency(resident.current_balance)}
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Available Credit</Label>
                      <div className="mt-1">
                        <Badge variant={getAvailableCreditBadge(resident.available_credit)}>
                          {formatCurrency(resident.available_credit)}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Usage</Label>
                      <p className="font-medium mt-1">
                        {((resident.current_balance / resident.credit_limit) * 100).toFixed(1)}%
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${
                            resident.current_balance / resident.credit_limit >= 0.9
                              ? 'bg-red-500'
                              : resident.current_balance / resident.credit_limit >= 0.75
                              ? 'bg-orange-500'
                              : resident.current_balance / resident.credit_limit >= 0.5
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              (resident.current_balance / resident.credit_limit) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {resident.available_credit < 0 && (
                    <Badge variant="destructive">Over Limit</Badge>
                  )}
                  {resident.available_credit < 500 && resident.available_credit >= 0 && (
                    <Badge variant="secondary">Low Credit</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {residents.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-muted-foreground">No residents found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}