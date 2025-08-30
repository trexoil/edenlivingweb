'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, CreditCard, Download, DollarSign, Calendar, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { BillingRecord } from '@/types/database'
import StripePaymentForm from '@/components/ui/stripe-payment-form'

interface BillingRecordWithResident extends BillingRecord {
  resident?: {
    id: string
    first_name: string
    last_name: string
    email: string
    unit_number: string
  }
}

export default function BillingPage() {
  const { user } = useSimpleAuth()
  const router = useRouter()
  const [billingRecords, setBillingRecords] = useState<BillingRecordWithResident[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<BillingRecordWithResident | null>(null)

  useEffect(() => {
    if (user) {
      fetchBillingRecords()
    }
  }, [user])

  const fetchBillingRecords = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/billing/records')
      
      if (!response.ok) {
        throw new Error('Failed to fetch billing records')
      }

      const data = await response.json()
      setBillingRecords(data.records || [])
    } catch (error) {
      console.error('Error fetching billing records:', error)
      toast.error('Failed to load billing records')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = (record: BillingRecordWithResident) => {
    setSelectedRecord(record)
    setShowPaymentDialog(true)
  }

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false)
    setSelectedRecord(null)
    fetchBillingRecords()
  }

  const handlePaymentCancel = () => {
    setShowPaymentDialog(false)
    setSelectedRecord(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const totalAmount = billingRecords.reduce((sum, record) => sum + parseFloat(record.amount.toString()), 0)
  const paidAmount = billingRecords
    .filter(record => record.status === 'paid')
    .reduce((sum, record) => sum + parseFloat(record.amount.toString()), 0)
  const pendingAmount = totalAmount - paidAmount

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading billing records...</p>
        </div>
      </div>
    )
  }

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
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Billing & Payments</h1>
                <p className="text-muted-foreground">Manage your billing records and payments</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(pendingAmount)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Billing Records */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Records</CardTitle>
          </CardHeader>
          <CardContent>
            {billingRecords.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No billing records found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {billingRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{record.description}</h3>
                        {getStatusBadge(record.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Due: {formatDate(record.due_date)}
                        </span>
                        {record.payment_date && (
                          <span>Paid: {formatDate(record.payment_date)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold">{formatCurrency(parseFloat(record.amount.toString()))}</div>
                      </div>
                      
                      {record.status !== 'paid' && (
                        <Button
                          onClick={() => handlePayment(record)}
                          size="sm"
                        >
                          Pay with Stripe
                        </Button>
                      )}
                      
                      {record.status === 'paid' && (
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stripe Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <StripePaymentForm
                billingRecordId={selectedRecord.id}
                amount={parseFloat(selectedRecord.amount.toString())}
                description={selectedRecord.description}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
