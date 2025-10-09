'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Room, RoomEvent, Track, Participant } from 'livekit-client'
import { AlertCircle, Mic, MicOff, Video, VideoOff, PhoneOff, Users } from 'lucide-react'

function SOSJoinContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomNameParam = searchParams.get('room')

  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([])
  const [callDuration, setCallDuration] = useState(0)
  const [callId, setCallId] = useState<string | null>(null)

  const roomRef = useRef<Room | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  async function joinRoom(roomName: string) {
    setError(null)
    setConnecting(true)

    try {
      // Call join API to get token
      const res = await fetch('/api/sos/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to join room')
      }

      const { token, url, callId: id } = data
      setCallId(id)

      // Connect to LiveKit room
      const room = new Room({
        publishDefaults: { videoSimulcast: false },
        adaptiveStream: true,
      })
      roomRef.current = room

      // Set up event listeners
      room.on(RoomEvent.TrackSubscribed, (_track, pub, participant) => {
        console.log('Track subscribed:', pub.kind, participant.identity)
        if (pub.kind === Track.Kind.Video && remoteVideoRef.current) {
          pub.track?.attach(remoteVideoRef.current)
        }
      })

      room.on(RoomEvent.TrackUnsubscribed, (_track, pub) => {
        if (pub.kind === Track.Kind.Video && remoteVideoRef.current) {
          pub.track?.detach(remoteVideoRef.current)
        }
      })

      room.on(RoomEvent.ParticipantConnected, (participant: Participant) => {
        console.log('Participant connected:', participant.identity)
        setRemoteParticipants(prev => [...prev, participant])
      })

      room.on(RoomEvent.ParticipantDisconnected, (participant: Participant) => {
        console.log('Participant disconnected:', participant.identity)
        setRemoteParticipants(prev => prev.filter(p => p.identity !== participant.identity))
      })

      room.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room')
        handleLeave()
      })

      // Connect to room
      await room.connect(url, token)
      await room.localParticipant.enableCameraAndMicrophone()

      // Attach local video
      const camPub = room.localParticipant.getTrack(Track.Source.Camera)
      if (camPub && localVideoRef.current) {
        camPub.videoTrack?.attach(localVideoRef.current)
      }

      setConnected(true)
      setConnecting(false)

      // Start call duration timer
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)

    } catch (e: any) {
      console.error('Join error:', e)
      setError(e?.message || 'Failed to join room')
      setConnecting(false)
    }
  }

  async function handleLeave() {
    try {
      // Stop duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }

      // Disconnect from room
      if (roomRef.current) {
        roomRef.current.disconnect()
        roomRef.current = null
      }

      // Call end API if we have a callId
      if (callId) {
        await fetch('/api/sos/end', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId }),
        }).catch(err => console.error('Failed to end call:', err))
      }

      setConnected(false)
      router.push('/department')
    } catch (error) {
      console.error('Error leaving room:', error)
      setConnected(false)
      router.push('/department')
    }
  }

  async function toggleMute() {
    if (!roomRef.current) return

    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(isMuted)
      setIsMuted(!isMuted)
    } catch (error) {
      console.error('Error toggling mute:', error)
    }
  }

  async function toggleCamera() {
    if (!roomRef.current) return

    try {
      await roomRef.current.localParticipant.setCameraEnabled(isCameraOff)
      setIsCameraOff(!isCameraOff)
    } catch (error) {
      console.error('Error toggling camera:', error)
    }
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    // Auto-join if room parameter is present
    if (roomNameParam && !connected && !connecting) {
      joinRoom(roomNameParam)
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      if (roomRef.current) {
        roomRef.current.disconnect()
      }
    }
  }, [roomNameParam])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Emergency Header */}
        <Card className="border-red-500 border-2 bg-red-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <CardTitle className="text-red-600">🚨 EMERGENCY SOS CALL</CardTitle>
              </div>
              {connected && (
                <div className="text-lg font-semibold text-red-600">
                  {formatDuration(callDuration)}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Video Area */}
        <Card>
          <CardContent className="p-6">
            {connecting && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                <p className="text-gray-600">Connecting to emergency call...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-600 font-medium">⚠️ {error}</p>
                <Button
                  onClick={() => roomNameParam && joinRoom(roomNameParam)}
                  className="mt-2"
                  variant="outline"
                >
                  Retry Connection
                </Button>
              </div>
            )}

            {connected && (
              <div className="space-y-4">
                {/* Video Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <video
                      ref={localVideoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      You (Staff)
                    </div>
                  </div>
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <video
                      ref={remoteVideoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                    />
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      Resident
                    </div>
                  </div>
                </div>

                {/* Participant Info */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>
                    {remoteParticipants.length > 0
                      ? `${remoteParticipants.length + 1} participant(s) in call`
                      : 'Waiting for resident to connect...'}
                  </span>
                </div>

                {/* Call Controls */}
                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button
                    onClick={toggleMute}
                    variant={isMuted ? 'destructive' : 'outline'}
                    size="lg"
                    className="w-16 h-16 rounded-full"
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </Button>

                  <Button
                    onClick={toggleCamera}
                    variant={isCameraOff ? 'destructive' : 'outline'}
                    size="lg"
                    className="w-16 h-16 rounded-full"
                  >
                    {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </Button>

                  <Button
                    onClick={handleLeave}
                    variant="destructive"
                    size="lg"
                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            )}

            {!connected && !connecting && !error && (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Ready to join emergency call</p>
                {roomNameParam && (
                  <Button onClick={() => joinRoom(roomNameParam)} size="lg">
                    Join Call
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Info */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800">
              <strong>Emergency Protocol:</strong> Stay on the call until the situation is resolved.
              Additional staff members can join this call if needed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SOSJoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SOSJoinContent />
    </Suspense>
  )
}

