'use client'

import { useState } from 'react'
import { Bell, Trash2, Check, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNotifications } from '@/contexts/NotificationContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'

export function NotificationsPage() {
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()
  const [filter, setFilter] = useState('all')

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread') return !notification.read
    if (filter === 'read') return notification.read
    return true
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TICKET_CREATED':
      case 'TICKET_ASSIGNED':
      case 'TICKET_STATUS_UPDATED':
      case 'TICKET_RESPONSE':
        return '🎫'
      case 'SLA_WARNING':
        return '⚠️'
      case 'ASSIGNMENT':
        return '👤'
      case 'PATTERN_DETECTED':
        return '🔍'
      case 'SYSTEM_NOTIFICATION':
        return '🔔'
      default:
        return '📢'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'SLA_WARNING':
        return 'destructive'
      case 'TICKET_CREATED':
      case 'TICKET_ASSIGNED':
        return 'default'
      case 'TICKET_STATUS_UPDATED':
      case 'TICKET_RESPONSE':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your latest activities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {notifications.some((n) => !n.read) && (
            <Button
              onClick={markAllAsRead}
              variant="outline"
            >
              <Check className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filter Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Select
              value={filter}
              onValueChange={setFilter}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notifications</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
                <SelectItem value="read">Read Only</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {filteredNotifications.length} notification
              {filteredNotifications.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {filter === 'unread'
                ? 'No unread notifications'
                : 'No notifications found'}
            </p>
            <p className="text-sm text-muted-foreground">
              You'll see notifications here when there are updates to your
              tickets or system announcements.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-md ${
                !notification.read ? 'border-l-4 border-l-primary' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="text-2xl">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            !notification.read ? 'font-medium' : ''
                          }`}
                        >
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge
                            variant={getNotificationColor(notification.type)}
                          >
                            {notification.type.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(notification.createdAt),
                              { addSuffix: true }
                            )}
                          </span>
                          {!notification.read && (
                            <Badge
                              variant="destructive"
                              className="text-xs"
                            >
                              New
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {notification.ticketId && (
                      <div className="mt-2">
                        <Link
                          to={`/tickets/${notification.ticketId}`}
                          className="text-sm text-primary hover:underline"
                        >
                          View Ticket →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
