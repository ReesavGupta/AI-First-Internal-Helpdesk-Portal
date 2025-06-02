'use client'

import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Get notifications
  const {
    data: notificationsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.getNotifications({ limit: 50 }),
  })

  // Get notification stats
  const { data: statsData } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: apiClient.getNotificationStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  useEffect(() => {
    if (notificationsData?.notifications) {
      // Log if any fetched notification is missing an ID
      notificationsData.notifications.forEach((n: Notification) => {
        if (!n.id) {
          console.error(
            '[NotificationContext] Fetched notification missing ID:',
            n
          )
        }
      })
      setNotifications(notificationsData.notifications)
    }
  }, [notificationsData])

  // Listen for WebSocket notifications
  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      const wsMessagePayload = event.detail

      // Check the type of the WebSocket message payload
      if (
        wsMessagePayload &&
        wsMessagePayload.type === 'notification_deleted'
      ) {
        const { notificationId } = wsMessagePayload
        if (notificationId) {
          console.log(
            '[NotificationContext] WebSocket received notification_deleted for ID:',
            notificationId
          )
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId)
          )
          queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
        } else {
          console.error(
            '[NotificationContext] WebSocket notification_deleted message missing notificationId:',
            wsMessagePayload
          )
        }
      } else if (wsMessagePayload && wsMessagePayload.id) {
        // Assume it's a new/updated full Notification object if it has an 'id'
        const newNotification = wsMessagePayload as Notification
        console.log(
          '[NotificationContext] WebSocket received new/updated notification:',
          newNotification
        )

        setNotifications((prev) => {
          const existingIndex = prev.findIndex(
            (n) => n.id === newNotification.id
          )
          if (existingIndex !== -1) {
            const updatedNotifications = [...prev]
            updatedNotifications[existingIndex] = newNotification
            return updatedNotifications
          } else {
            return [newNotification, ...prev]
          }
        })
        queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
        toast({
          title: 'New Notification',
          description: newNotification.message,
        })
      } else {
        // Handle other types of messages or log an error for unexpected structure
        console.error(
          '[NotificationContext] Received WebSocket message with unexpected structure:',
          wsMessagePayload
        )
      }
    }

    window.addEventListener(
      'ws-notification',
      handleNotification as EventListener
    )
    return () => {
      window.removeEventListener(
        'ws-notification',
        handleNotification as EventListener
      )
    }
  }, [queryClient, toast])

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: apiClient.markNotificationRead,
    onSuccess: (_, id) => {
      console.log('[NotificationContext] Mark as read - ID:', id)
      setNotifications((prev) => {
        console.log('[NotificationContext] Before markAsRead update:', prev)
        const updated = prev.map((notification) =>
          notification.id === id
            ? { ...notification, read: true, readAt: new Date().toISOString() }
            : notification
        )
        console.log('[NotificationContext] After markAsRead update:', updated)
        return updated
      })
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
    },
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: apiClient.markAllNotificationsRead,
    onSuccess: () => {
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: true,
          readAt: new Date().toISOString(),
        }))
      )
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
    },
  })

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: apiClient.deleteNotification,
    onSuccess: (_, id) => {
      console.log('[NotificationContext] Delete notification - ID:', id)
      setNotifications((prev) => {
        console.log('[NotificationContext] Before delete update:', prev)
        const updated = prev.filter((notification) => notification.id !== id)
        console.log('[NotificationContext] After delete update:', updated)
        return updated
      })
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
    },
  })

  const markAsRead = async (id: string) => {
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
        notifications,
        unreadCount: statsData?.unreadCount || 0,
        isLoading,
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
