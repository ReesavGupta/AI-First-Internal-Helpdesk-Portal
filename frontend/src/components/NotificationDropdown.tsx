'use client'

import { Bell, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications } from '@/contexts/NotificationContext'
import { formatDistanceToNow } from 'date-fns'

export function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()

  console.log('[NotificationDropdown] unreadCount:', unreadCount)

  const recentNotifications = notifications.slice(0, 10)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs"
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {recentNotifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No notifications
          </div>
        ) : (
          <ScrollArea className="h-96">
            {recentNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex items-start space-x-3 p-3 cursor-pointer"
                onClick={() =>
                  !notification.read && markAsRead(notification.id)
                }
              >
                <div className="flex-1 space-y-1">
                  <p
                    className={`text-sm ${
                      !notification.read ? 'font-medium' : ''
                    }`}
                  >
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notification.createdAt &&
                    !isNaN(new Date(notification.createdAt).getTime())
                      ? formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })
                      : 'Date not available'}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification(notification.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
