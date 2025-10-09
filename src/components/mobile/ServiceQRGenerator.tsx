'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, QrCode, Clock } from 'lucide-react'

interface ServiceQRGeneratorProps {
  serviceRequestId: string
  serviceTitle: string
  currentStatus: string
}

export default function ServiceQRGenerator({ 
  serviceRequestId, 
  serviceTitle, 
  currentStatus 
}: ServiceQRGeneratorProps) {
  const [qrCode, setQrCode] = useState<string>('')
  const [qrType, setQrType] = useState<'start' | 'completion'>('start')
  const [loading, setLoading] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string>('')

  const canGenerateStart = ['assigned', 'processing'].includes(currentStatus)
  const canGenerateCompletion = currentStatus === 'in_progress'

  const generateQR = async (type: 'start' | 'completion') => {
    if (type === 'start' && !canGenerateStart) {
      toast.error('Start QR can only be generated when service is assigned or processing')
      return
    }
    
    if (type === 'completion' && !canGenerateCompletion) {
      toast.error('Completion QR can only be generated when service is in progress')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch(`/api/service-requests/${serviceRequestId}/generate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_type: type })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate QR code')
      }

      const data = await response.json()
      setQrCode(data.qr_code)
      setQrType(type)
      setExpiresAt(data.expires_at)
      
      toast.success(`${type === 'start' ? 'Start' : 'Completion'} QR code generated successfully`)
      
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }

  const clearQR = () => {
    setQrCode('')
    setExpiresAt('')
  }

  const formatExpiryTime = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    const now = new Date()
    const hoursLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60))
    return `${hoursLeft} hours remaining`
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Service QR Code
        </CardTitle>
        <p className="text-sm text-muted-foreground">{serviceTitle}</p>
        <Badge variant="outline">Status: {currentStatus}</Badge>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!qrCode ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground mb-4">
              Generate a QR code for the staff to scan when they arrive for service.
            </div>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => generateQR('start')}
                disabled={loading || !canGenerateStart}
                className="w-full"
                variant={canGenerateStart ? "default" : "secondary"}
              >
                {loading && qrType === 'start' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Start Service QR
              </Button>
              
              {!canGenerateStart && (
                <p className="text-xs text-muted-foreground">
                  Available when service is assigned or processing
                </p>
              )}
              
              <Button 
                onClick={() => generateQR('completion')}
                disabled={loading || !canGenerateCompletion}
                className="w-full"
                variant={canGenerateCompletion ? "default" : "secondary"}
              >
                {loading && qrType === 'completion' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Complete Service QR
              </Button>
              
              {!canGenerateCompletion && (
                <p className="text-xs text-muted-foreground">
                  Available when service is in progress
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <img 
                src={qrCode} 
                alt={`${qrType === 'start' ? 'Start' : 'Complete'} service QR code`}
                className="max-w-full h-auto rounded-lg border"
                style={{ maxWidth: '250px' }}
              />
            </div>
            
            <div className="space-y-2">
              <Badge 
                variant={qrType === 'start' ? 'default' : 'secondary'}
                className="text-sm"
              >
                {qrType === 'start' ? 'Start Service' : 'Complete Service'} QR Code
              </Badge>
              
              {expiresAt && (
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {formatExpiryTime(expiresAt)}
                </div>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              Show this QR code to the service staff when they {qrType === 'start' ? 'arrive' : 'complete the service'}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={clearQR}
                className="flex-1"
              >
                Generate New
              </Button>
              
              {qrType === 'start' && canGenerateCompletion && (
                <Button 
                  onClick={() => generateQR('completion')}
                  disabled={loading}
                  className="flex-1"
                >
                  Generate Completion QR
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}