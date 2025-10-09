'use client'

import { useState, useRef } from 'react'

import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'

import { Input } from '@/components/ui/input'

import { Label } from '@/components/ui/label'

import { toast } from 'sonner'

import { Loader2, Scan, Camera, Type, ImageUp } from 'lucide-react'

import { Scanner } from '@yudiel/react-qr-scanner'

interface ScanResult {
  success: boolean

  new_status: string

  qr_type: 'start' | 'completion'

  resource_type?: 'order' | 'service_request'

  resource_id?: string

  service_request_id?: string

  scanned_by: string

  scanned_at: string
}

type BarcodeDetection = { rawValue?: string }

type BarcodeDetectorHandle = {
  detect: (bitmap: ImageBitmap) => Promise<BarcodeDetection[]>
}

type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: new (options?: {
    formats?: string[]
  }) => BarcodeDetectorHandle
}

export default function StaffQRScanner() {
  const [scanning, setScanning] = useState(false)

  const [manualMode, setManualMode] = useState(false)

  const [qrData, setQrData] = useState('')

  const [loading, setLoading] = useState(false)

  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const decodeQRCodeFromFile = async (file: File): Promise<string | null> => {
    if (typeof window === 'undefined') return null

    const { BarcodeDetector } = window as WindowWithBarcodeDetector

    if (BarcodeDetector) {
      try {
        const detector = new BarcodeDetector({ formats: ['qr_code'] })

        const bitmap = await createImageBitmap(file)

        try {
          const detections = await detector.detect(bitmap)

          const result = detections.find((item) => item?.rawValue)

          if (result?.rawValue) {
            return result.rawValue
          }
        } finally {
          bitmap.close()
        }
      } catch (err) {
        console.warn('BarcodeDetector decode failed', err)
      }
    }

    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser')

      const reader = new BrowserQRCodeReader()

      const imageUrl = URL.createObjectURL(file)

      try {
        const result = await reader.decodeFromImageUrl(imageUrl)

        if (result) {
          return result.getText()
        }
      } catch (err) {
        console.warn('ZXing decode failed', err)
      } finally {
        reader.reset()

        URL.revokeObjectURL(imageUrl)
      }
    } catch (err) {
      console.warn('Failed to load QR decoding library', err)
    }

    return null
  }

  const handleScan = async (qrCodeData: string) => {
    if (!qrCodeData.trim()) {
      toast.error('Please provide QR code data')

      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/staff/scan-qr', {
        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ qr_data: qrCodeData }),
      })

      if (!response.ok) {
        const error = await response.json()

        throw new Error(error.error || 'Failed to scan QR code')
      }

      const result: ScanResult = await response.json()

      setLastScanResult(result)

      toast.success(
        `Service ${result.qr_type === 'start' ? 'started' : 'completed'} successfully!`,
      )

      // Clear the input after successful scan

      setQrData('')

      setScanning(false)
    } catch (error) {
      console.error('Error scanning QR code:', error)

      toast.error(
        error instanceof Error ? error.message : 'Failed to scan QR code',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    handleScan(qrData)
  }

  const startCameraScanning = () => {
    setScanning(true)
  }

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) return

    setManualMode(false)

    setScanning(false)

    setLoading(true)

    try {
      const decoded = await decodeQRCodeFromFile(file)

      if (!decoded) {
        toast.error(
          'Could not read QR code from the image. Please try again or use manual entry.',
        )

        return
      }

      await handleScan(decoded)
    } catch (error) {
      console.error('Error decoding uploaded QR image:', error)

      toast.error('Failed to decode QR code from image')
    } finally {
      setLoading(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'default'

      case 'completed':
        return 'secondary'

      default:
        return 'outline'
    }
  }

  const getActionText = (qrType: 'start' | 'completion') => {
    return qrType === 'start' ? 'Service Started' : 'Service Completed'
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Service QR Scanner
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {!scanning && !manualMode ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Scan a resident&apos;s QR code to start or complete their
                service request.
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={startCameraScanning}
                  className="w-full"
                  disabled={loading}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Scan with Camera
                </Button>

                <Button
                  onClick={() => setManualMode(true)}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  <Type className="w-4 h-4 mr-2" />
                  Enter QR Data Manually
                </Button>

                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ImageUp className="w-4 h-4 mr-2" />
                    )}

                    {loading ? 'Processing...' : 'Upload QR Image'}
                  </Button>
                </div>
              </div>
            </div>
          ) : manualMode ? (
            <div className="space-y-4">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qr-data">QR Code Data</Label>

                  <Input
                    id="qr-data"
                    value={qrData}
                    onChange={(e) => setQrData(e.target.value)}
                    placeholder="Paste QR code data here..."
                    className="font-mono text-xs"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={loading || !qrData.trim()}
                    className="flex-1"
                  >
                    {loading && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Scan QR Code
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setManualMode(false)

                      setQrData('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <Scanner
                onScan={(detectedCodes) => {
                  if (detectedCodes && detectedCodes.length > 0) {
                    const text = detectedCodes[0].rawValue

                    setScanning(false)

                    handleScan(text)
                  }
                }}
                onError={(err) => {
                  console.warn('QR scanner error', err)

                  toast.error('Camera error')
                }}
                constraints={{ facingMode: 'environment' }}
                styles={{
                  container: { width: '100%' },

                  video: { borderRadius: 8, overflow: 'hidden' },
                }}
              />

              <Button variant="outline" onClick={() => setScanning(false)}>
                Cancel Scanning
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {lastScanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Scan Result</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Action:</span>

              <Badge
                variant={
                  lastScanResult.qr_type === 'start' ? 'default' : 'secondary'
                }
              >
                {getActionText(lastScanResult.qr_type)}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">New Status:</span>

              <Badge variant={getStatusBadgeColor(lastScanResult.new_status)}>
                {lastScanResult.new_status}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {lastScanResult.resource_type === 'order' ? 'Order ID:' : 'Service ID:'}
              </span>

              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {(lastScanResult.resource_id || lastScanResult.service_request_id || '').slice(0, 8)}...
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Scanned by:</span>

              <span className="text-sm">{lastScanResult.scanned_by}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Time:</span>

              <span className="text-sm">
                {new Date(lastScanResult.scanned_at).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
