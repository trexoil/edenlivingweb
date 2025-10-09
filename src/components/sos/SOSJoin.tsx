"use client"

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Room, RoomEvent, Track } from 'livekit-client'

export default function SOSJoin() {
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const roomRef = useRef<Room | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)

  async function handleJoin() {
    setError(null)
    setJoining(true)
    try {
      const res = await fetch('/api/sos/token', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const { token, url } = await res.json()
      if (!token || !url) throw new Error('Missing token/url')

      const room = new Room({ publishDefaults: { videoSimulcast: false } })
      roomRef.current = room

      // Attach tracks
      room.on(RoomEvent.TrackSubscribed, (_track, pub, participant) => {
        if (pub.kind === Track.Kind.Video && remoteVideoRef.current) {
          pub.track?.attach(remoteVideoRef.current)
        }
      })
      room.on(RoomEvent.TrackUnsubscribed, (_track, pub) => {
        if (pub.kind === Track.Kind.Video && remoteVideoRef.current) {
          pub.track?.detach(remoteVideoRef.current)
        }
      })

      await room.connect(url, token)
      await room.localParticipant.enableCameraAndMicrophone()

      // Attach local
      const camPub = room.localParticipant.getTrack(Track.Source.Camera)
      if (camPub && localVideoRef.current) camPub.videoTrack?.attach(localVideoRef.current)

      setJoined(true)
    } catch (e: any) {
      setError(e?.message || 'Join failed')
    } finally {
      setJoining(false)
    }
  }

  async function handleLeave() {
    try {
      roomRef.current?.disconnect()
    } finally {
      setJoined(false)
    }
  }

  useEffect(() => () => { roomRef.current?.disconnect() }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>SOS Live View</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!joined ? (
          <Button onClick={handleJoin} disabled={joining}>{joining ? 'Joining...' : 'Join Room'}</Button>
        ) : (
          <Button variant="outline" onClick={handleLeave}>Leave</Button>
        )}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="grid grid-cols-2 gap-2">
          <video ref={localVideoRef} className="w-full bg-black" autoPlay playsInline muted />
          <video ref={remoteVideoRef} className="w-full bg-black" autoPlay playsInline />
        </div>
      </CardContent>
    </Card>
  )
}

