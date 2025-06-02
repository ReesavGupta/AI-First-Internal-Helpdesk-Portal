'use client'

import React from 'react'
import { createContext, useContext, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { Notification } from '@/types'
import { useToast } from '@/hooks/use-toast'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  refetch: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
)

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Main query for fetching notifications
  const {
    data: notificationsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.getNotifications({ limit: 50 }), // Fetch more for local cache
  })

  // Derived state for notifications list
  const notifications = React.useMemo(
    () => notificationsData?.notifications || [],
    [notificationsData]
  )

  // Query for notification stats (unread count)
  const { data: statsData } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: apiClient.getNotificationStats,
  })

  // WebSocket listeners
  useEffect(() => {
    const handleWebSocketMessage = (event: CustomEvent) => {
      const payload = event.detail
      console.log('[NotificationContext] WebSocket message received:', payload)

      if (!payload || !payload.type) {
        console.error(
          '[NotificationContext] Invalid WebSocket payload:',
          payload
        )
        return
      }

      switch (payload.type) {
        case 'new_notification': // Generic new notification from WS
        case 'notification_created': // Explicitly created notification
        case 'TICKET_CREATED':
        case 'TICKET_ASSIGNED':
        case 'TICKET_STATUS_UPDATED':
        case 'TICKET_RESPONSE':
        case 'SLA_WARNING':
        case 'ASSIGNMENT': // This might be a custom one from your backend
        case 'PATTERN_DETECTED':
        case 'SYSTEM_NOTIFICATION':
          // This payload IS the notification object
          toast({
            title: payload.title || 'Notification', // Assuming title might exist directly on payload
            description: payload.message, // Use payload.message directly
          })
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
          break
        case 'notification_read':
        case 'all_notifications_read':
        case 'notification_deleted':
          // These actions are already handled optimistically and then re-fetched.
          // We might still want to invalidate if the WS message indicates a change
          // initiated by *another* client instance for the same user, but for now,
          // the optimistic updates + onSettled refetch should cover most cases.
          // If direct server push for these is needed, we can invalidate here too.
          console.log(
            `[NotificationContext] WS event type ${payload.type} received, potentially handled by optimistic update.`
          )
          // Optionally, still invalidate if you want to ensure data sync from WS even after optimistic updates
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
          break
        default:
          console.warn(
            '[NotificationContext] Unhandled WebSocket event type:',
            payload.type
          )
      }
    }

    window.addEventListener(
      'ws-notification',
      handleWebSocketMessage as EventListener
    )
    return () => {
      window.removeEventListener(
        'ws-notification',
        handleWebSocketMessage as EventListener
      )
    }
  }, [queryClient, toast])

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: apiClient.markNotificationRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      await queryClient.cancelQueries({ queryKey: ['notification-stats'] })

      const previousNotifications = queryClient.getQueryData<{
        notifications: Notification[]
        pagination: any
      }>(['notifications'])
      const previousStats = queryClient.getQueryData<any>([
        'notification-stats',
      ])

      queryClient.setQueryData(
        ['notifications'],
        (
          old: { notifications: Notification[]; pagination: any } | undefined
        ) => {
          if (!old) return old
          return {
            ...old,
            notifications: old.notifications.map((n) =>
              n.id === id
                ? { ...n, read: true, readAt: new Date().toISOString() }
                : n
            ),
          }
        }
      )
      queryClient.setQueryData(['notification-stats'], (old: any) => {
        if (!old || typeof old.unreadCount !== 'number') return old
        const notificationToUpdate = previousNotifications?.notifications?.find(
          (n) => n.id === id
        )
        // Only decrement if the notification was actually unread
        return {
          ...old,
          unreadCount:
            notificationToUpdate && !notificationToUpdate.read
              ? Math.max(0, old.unreadCount - 1)
              : old.unreadCount,
        }
      })

      return { previousNotifications, previousStats }
    },
    onError: (err, id, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ['notifications'],
          context.previousNotifications
        )
      }
      if (context?.previousStats) {
        queryClient.setQueryData(['notification-stats'], context.previousStats)
      }
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read.',
        variant: 'destructive',
      })
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Notification marked as read.',
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
    },
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: apiClient.markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      await queryClient.cancelQueries({ queryKey: ['notification-stats'] })

      const previousNotifications = queryClient.getQueryData<{
        notifications: Notification[]
        pagination: any
      }>(['notifications'])
      const previousStats = queryClient.getQueryData<any>([
        'notification-stats',
      ])

      queryClient.setQueryData(
        ['notifications'],
        (
          old: { notifications: Notification[]; pagination: any } | undefined
        ) => {
          if (!old) return old
          return {
            ...old,
            notifications: old.notifications.map((n) => ({
              ...n,
              read: true,
              readAt: new Date().toISOString(),
            })),
          }
        }
      )
      queryClient.setQueryData(['notification-stats'], (old: any) => {
        if (!old) return old
        return { ...old, unreadCount: 0 }
      })

      return { previousNotifications, previousStats }
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ['notifications'],
          context.previousNotifications
        )
      }
      if (context?.previousStats) {
        queryClient.setQueryData(['notification-stats'], context.previousStats)
      }
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read.',
        variant: 'destructive',
      })
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `${data.count} notifications marked as read.`,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
    },
  })

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: apiClient.deleteNotification,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      await queryClient.cancelQueries({ queryKey: ['notification-stats'] })

      const previousNotifications = queryClient.getQueryData<{
        notifications: Notification[]
        pagination: any
      }>(['notifications'])
      const previousStats = queryClient.getQueryData<any>([
        'notification-stats',
      ])

      let wasUnread = false

      queryClient.setQueryData(
        ['notifications'],
        (
          old: { notifications: Notification[]; pagination: any } | undefined
        ) => {
          if (!old) return old
          const notificationToRemove = old.notifications.find(
            (n) => n.id === id
          )
          if (notificationToRemove && !notificationToRemove.read) {
            wasUnread = true
          }
          return {
            ...old,
            notifications: old.notifications.filter((n) => n.id !== id),
          }
        }
      )
      queryClient.setQueryData(['notification-stats'], (old: any) => {
        if (!old || typeof old.unreadCount !== 'number') return old
        return {
          ...old,
          unreadCount: wasUnread
            ? Math.max(0, old.unreadCount - 1)
            : old.unreadCount,
        }
      })

      return { previousNotifications, previousStats }
    },
    onError: (err, id, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ['notifications'],
          context.previousNotifications
        )
      }
      if (context?.previousStats) {
        queryClient.setQueryData(['notification-stats'], context.previousStats)
      }
      toast({
        title: 'Error',
        description: 'Failed to delete notification.',
        variant: 'destructive',
      })
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Notification deleted.',
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
    },
  })

  const markAsRead = async (id: string) => {
    // No local state update needed here as useMutation's onMutate handles it
    await markAsReadMutation.mutateAsync(id)
  }

  const markAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync()
  }

  const deleteNotification = async (id: string) => {
    await deleteNotificationMutation.mutateAsync(id)
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications, // Use memoized notifications
        unreadCount: statsData?.unreadCount || 0,
        isLoading: isLoading && !notificationsData, // Consider loading only if no data yet
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refetch,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    )
  }
  return context
}
