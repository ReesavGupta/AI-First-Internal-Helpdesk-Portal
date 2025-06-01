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
      setNotifications(notificationsData.notifications)
    }
  }, [notificationsData])

  // Listen for WebSocket notifications
  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      const newNotification = event.detail
      setNotifications((prev) => [newNotification, ...prev])
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })

      // Show toast for new notification
      toast({
        title: 'New Notification',
        description: newNotification.message,
      })
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
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, read: true, readAt: new Date().toISOString() }
            : notification
        )
      )
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
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      })
    },
  })

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: apiClient.deleteNotification,
    onSuccess: (_, id) => {
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== id)
      )
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
        unreadCount: statsData?.unread || 0,
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
