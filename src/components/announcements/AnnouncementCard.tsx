'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar,
  User,
  AlertTriangle,
  Info,
  Zap,
  Clock,
  Eye,
  EyeOff,
  Edit,
  Trash2
} from 'lucide-react'
import { Announcement } from '@/types/database'

const priorityConfig = {
  normal: { label: 'Normal', color: 'bg-gray-100 text-gray-800', icon: Info },
  important: { label: 'Important', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800', icon: Zap },
}

const audienceConfig = {
  all: { label: 'All', color: 'bg-blue-100 text-blue-800' },
  residents: { label: 'Residents', color: 'bg-green-100 text-green-800' },
  staff: { label: 'Staff', color: 'bg-purple-100 text-purple-800' },
}

interface AnnouncementCardProps {
  announcement: Announcement
  variant?: 'resident' | 'admin'
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onTogglePublish?: () => void
  className?: string
}

export default function AnnouncementCard({
  announcement,
  variant = 'resident',
  onClick,
  onEdit,
  onDelete,
  onTogglePublish,
  className = ''
}: AnnouncementCardProps) {
  const PriorityIcon = priorityConfig[announcement.priority].icon
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
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
    return diffInHours < 48 // Less than 48 hours
  }

  const recent = isRecent(announcement.published_at || announcement.created_at)

  return (
    <Card 
      className={`hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer' : ''
      } ${
        recent && variant === 'resident' ? 'ring-2 ring-blue-200 bg-blue-50/30' : ''
      } ${className}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {recent && variant === 'resident' && (
                <Badge className="bg-blue-100 text-blue-800">
                  <Clock className="w-3 h-3 mr-1" />
                  New
                </Badge>
              )}
              <Badge className={priorityConfig[announcement.priority].color}>
                <PriorityIcon className="w-3 h-3 mr-1" />
                {priorityConfig[announcement.priority].label}
              </Badge>
              <Badge className={audienceConfig[announcement.target_audience].color}>
                {audienceConfig[announcement.target_audience].label}
              </Badge>
              {variant === 'admin' && (
                <Badge variant={announcement.is_published ? "default" : "secondary"}>
                  {announcement.is_published ? (
                    <>
                      <Eye className="w-3 h-3 mr-1" />
                      Published
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3 mr-1" />
                      Draft
                    </>
                  )}
                </Badge>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {announcement.title}
            </h3>
            
            <p className="text-gray-600 line-clamp-2 mb-3">
              {announcement.content}
            </p>
            
            <div className="flex items-center text-sm text-gray-500 gap-4">
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
          
          {variant === 'admin' && (onEdit || onDelete || onTogglePublish) && (
            <div className="flex items-center gap-2 ml-4">
              {onTogglePublish && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTogglePublish()
                  }}
                >
                  {announcement.is_published ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-1" />
                      Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-1" />
                      Publish
                    </>
                  )}
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
