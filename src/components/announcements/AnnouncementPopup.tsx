'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  Info,
  Zap,
  Eye,
  Bell
} from 'lucide-react'
import { Announcement } from '@/types/database'

const priorityConfig = {
  normal: { label: 'Normal', icon: Info, color: 'bg-gray-100 text-gray-800' },
  important: { label: 'Important', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-800' },
  urgent: { label: 'Urgent', icon: Zap, color: 'bg-red-100 text-red-800' },
}

const audienceConfig = {
  all: { label: 'All', color: 'bg-blue-100 text-blue-800' },
  residents: { label: 'Residents', color: 'bg-green-100 text-green-800' },
  staff: { label: 'Staff', color: 'bg-purple-100 text-purple-800' },
}

interface AnnouncementPopupProps {
  announcement: Announcement
  isOpen: boolean
  onClose: () => void
  onMarkAsRead?: () => void
  onDisablePopups?: () => void
}

export default function AnnouncementPopup({
  announcement,
  isOpen,
  onClose,
  onMarkAsRead,
  onDisablePopups
}: AnnouncementPopupProps) {
  const router = useRouter()

  if (!isOpen) return null

  const handleClose = () => {
    onClose()
    if (onMarkAsRead) {
      onMarkAsRead()
    }
  }

  const handleViewFull = () => {
    router.push(`/dashboard/announcements/${announcement.id}`)
    handleClose()
  }

  const handleDisablePopups = () => {
    if (onDisablePopups) {
      onDisablePopups()
    }
    handleClose()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const isRecent = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    return diffInHours < 48
  }

  const PriorityIcon = priorityConfig[announcement.priority].icon
  const recent = isRecent(announcement.published_at || announcement.created_at)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-background shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">
        <CardHeader className="relative pb-4">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Header Content */}
          <div className="pr-12 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">New Announcement</span>
              {recent && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Clock className="w-3 h-3 mr-1" />
                  New
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={priorityConfig[announcement.priority].color}>
                <PriorityIcon className="w-3 h-3 mr-1" />
                {priorityConfig[announcement.priority].label}
              </Badge>
              <Badge className={audienceConfig[announcement.target_audience].color}>
                {audienceConfig[announcement.target_audience].label}
              </Badge>
            </div>

            <CardTitle className="text-xl font-bold">
              {announcement.title}
            </CardTitle>

            <div className="flex items-center text-sm text-muted-foreground gap-4">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {announcement.author?.first_name} {announcement.author?.last_name}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(announcement.published_at || announcement.created_at)}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-foreground leading-relaxed">
            {announcement.content.length > 300 ? (
              <>
                <p className="whitespace-pre-wrap">{announcement.content.substring(0, 300)}...</p>
                <p className="text-sm text-primary mt-2">
                  Click &quot;View Full Announcement&quot; to read more
                </p>
              </>
            ) : (
              <p className="whitespace-pre-wrap">{announcement.content}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-4">
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={handleClose}>
              Dismiss
            </Button>
            <Button onClick={handleViewFull}>
              <Eye className="w-4 h-4 mr-2" />
              View Full Announcement
            </Button>
          </div>

          {onDisablePopups && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisablePopups}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Don&apos;t show announcement popups again
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
