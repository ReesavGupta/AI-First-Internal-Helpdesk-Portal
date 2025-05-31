// src/services/notification.service.ts (Fixed version)
import { prisma } from '../../prisma/client'
import { WebSocketManager } from '../websocket/WebsocketManager'
import { ApiError } from '../utils/ErrorHandler'

export interface CreateNotificationInput {
  message: string
  type: NotificationType
  targetUserId?: string
  targetUserRole?: 'EMPLOYEE' | 'AGENT' | 'ADMIN'
  departmentId?: string
  ticketId?: string
  metadata?: Record<string, any>
}

export type NotificationType =
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_STATUS_UPDATED'
  | 'TICKET_RESPONSE'
  | 'SLA_WARNING'
  | 'ASSIGNMENT'
  | 'PATTERN_DETECTED'
  | 'SYSTEM_NOTIFICATION'

export class NotificationService {
  private wsManager: WebSocketManager | null = null

  constructor(wsManager?: WebSocketManager) {
    this.wsManager = wsManager || null
  }

  // Method to set WebSocket manager after initialization
  public setWebSocketManager(wsManager: WebSocketManager) {
    this.wsManager = wsManager
    console.log('✅ WebSocket manager connected to NotificationService')
  }

  private sendRealTimeNotification(
    userId: string,
    notificationData: any
  ): boolean {
    if (this.wsManager) {
      return this.wsManager.sendToUser(userId, 'notification', notificationData)
    } else {
      console.warn(
        '⚠️ WebSocket manager not available for real-time notification'
      )
      return false
    }
  }

  /**
   * Create and send notification to specific user
   */
  async createNotification(input: CreateNotificationInput) {
    try {
      if (!input.targetUserId) {
        throw new ApiError('Target user ID is required', 400)
      }

      // Create notification in database
      const notification = await prisma.notification.create({
        data: {
          message: input.message,
          type: input.type,
          targetUserId: input.targetUserId,
          ticketId: input.ticketId,
          metadata: input.metadata || {},
        },
        include: {
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          // Add ticket relation if it exists in your schema
          ...(input.ticketId && {
            ticket: {
              select: {
                id: true,
                title: true,
                priority: true,
                status: true,
              },
            },
          }),
        },
      })

      // Send real-time notification via WebSocket
      const sent = this.sendRealTimeNotification(input.targetUserId, {
        id: notification.id,
        message: notification.message,
        type: notification.type,
        ticketId: notification.ticketId,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        read: false,
        // Include ticket data if available
        ...(input.ticketId &&
          notification.ticket && { ticket: notification.ticket }),
      })

      console.log(
        `📨 Notification created for user ${input.targetUserId}, real-time: ${sent}`
      )

      return notification
    } catch (error) {
      console.error('❌ Error creating notification:', error)
      throw new ApiError('Failed to create notification', 500)
    }
  }

  /**
   * Create notifications for multiple users by role and department
   */
  async createBulkNotifications(input: CreateNotificationInput) {
    try {
      if (!input.targetUserRole && !input.targetUserId) {
        throw new ApiError('Target user or role must be specified', 400)
      }

      // If specific user, use regular createNotification
      if (input.targetUserId) {
        return this.createNotification(input)
      }

      // Find target users based on role and department
      const whereClause: any = {
        role: input.targetUserRole,
      }

      if (input.departmentId) {
        whereClause.departmentId = input.departmentId
      }

      const targetUsers = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      })

      if (targetUsers.length === 0) {
        console.log('⚠️ No target users found for bulk notification')
        return []
      }

      // Create notifications for all target users
      const notifications = await Promise.all(
        targetUsers.map(async (user) => {
          const notification = await prisma.notification.create({
            data: {
              message: input.message,
              type: input.type,
              targetUserId: user.id,
              ticketId: input.ticketId,
              metadata: input.metadata || {},
            },
            include: {
              ...(input.ticketId && {
                ticket: {
                  select: {
                    id: true,
                    title: true,
                    priority: true,
                    status: true,
                  },
                },
              }),
            },
          })

          // Send real-time notification
          this.sendRealTimeNotification(user.id, {
            id: notification.id,
            message: notification.message,
            type: notification.type,
            ticketId: notification.ticketId,
            metadata: notification.metadata,
            createdAt: notification.createdAt,
            read: false,
            ...(input.ticketId &&
              notification.ticket && { ticket: notification.ticket }),
          })

          return notification
        })
      )

      console.log(
        `📨 Bulk notifications created for ${notifications.length} users`
      )
      return notifications
    } catch (error) {
      console.error('❌ Error creating bulk notifications:', error)
      throw new ApiError('Failed to create bulk notifications', 500)
    }
  }

  /**
   * Get notifications for a user with pagination
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      type?: NotificationType
      read?: boolean
      ticketId?: string
    }
  ) {
    try {
      const skip = (page - 1) * limit

      const whereClause: any = { targetUserId: userId }

      if (filters?.type) {
        whereClause.type = filters.type
      }

      if (filters?.read !== undefined) {
        whereClause.read = filters.read
      }

      if (filters?.ticketId) {
        whereClause.ticketId = filters.ticketId
      }

      const [notifications, totalCount] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            // Only include ticket if it exists in relation
            ...(filters?.ticketId && {
              ticket: {
                select: {
                  id: true,
                  title: true,
                  priority: true,
                  status: true,
                },
              },
            }),
          },
        }),
        prisma.notification.count({
          where: whereClause,
        }),
      ])

      const unreadCount = await prisma.notification.count({
        where: {
          targetUserId: userId,
          read: false,
        },
      })

      return {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        unreadCount,
      }
    } catch (error) {
      console.error('❌ Error fetching user notifications:', error)
      throw new ApiError('Failed to fetch notifications', 500)
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          targetUserId: userId,
        },
      })

      if (!notification) {
        throw new ApiError('Notification not found', 404)
      }

      if (notification.read) {
        return notification // Already read
      }

      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true, readAt: new Date() },
        include: {
          // Include ticket if relation exists
          ...(notification.ticketId && {
            ticket: {
              select: {
                id: true,
                title: true,
                priority: true,
                status: true,
              },
            },
          }),
        },
      })

      // Send real-time update
      this.sendRealTimeNotification(userId, {
        type: 'notification_read',
        notificationId,
        readAt: updatedNotification.readAt,
      })

      return updatedNotification
    } catch (error) {
      console.error('❌ Error marking notification as read:', error)
      throw new ApiError('Failed to mark notification as read', 500)
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          targetUserId: userId,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      })

      // Send real-time update
      this.sendRealTimeNotification(userId, {
        type: 'all_notifications_read',
        count: result.count,
        readAt: new Date(),
      })

      return { success: true, count: result.count }
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error)
      throw new ApiError('Failed to mark all notifications as read', 500)
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          targetUserId: userId,
        },
      })

      if (!notification) {
        throw new ApiError('Notification not found', 404)
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      })

      // Send real-time update
      this.sendRealTimeNotification(userId, {
        type: 'notification_deleted',
        notificationId,
      })

      return { success: true }
    } catch (error) {
      console.error('❌ Error deleting notification:', error)
      throw new ApiError('Failed to delete notification', 500)
    }
  }

  /**
   * Send ticket-related notifications
   */
  async sendTicketNotification(
    ticketId: string,
    type: NotificationType,
    message: string,
    excludeUserId?: string,
    metadata?: Record<string, any>
  ) {
    try {
      // Get ticket details
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          createdBy: true,
          assignedTo: true,
          department: true,
        },
      })

      if (!ticket) {
        throw new ApiError('Ticket not found', 404)
      }

      const notifications: Promise<any>[] = []

      // Notify ticket creator (if not excluded)
      if (ticket.createdBy.id !== excludeUserId) {
        notifications.push(
          this.createNotification({
            message,
            type,
            targetUserId: ticket.createdBy.id,
            ticketId,
            metadata,
          })
        )
      }

      // Notify assigned agent (if exists and not excluded)
      if (ticket.assignedTo && ticket.assignedTo.id !== excludeUserId) {
        notifications.push(
          this.createNotification({
            message,
            type,
            targetUserId: ticket.assignedTo.id,
            ticketId,
            metadata,
          })
        )
      }

      // For certain notification types, notify all department agents
      if (type === 'TICKET_CREATED' || type === 'SLA_WARNING') {
        notifications.push(
          this.createBulkNotifications({
            message,
            type,
            targetUserRole: 'AGENT',
            departmentId: ticket.departmentId,
            ticketId,
            metadata,
          })
        )
      }

      const results = await Promise.all(notifications)

      // Also send real-time update to ticket room
      if (this.wsManager) {
        this.wsManager.sendToTicket(
          ticketId,
          'ticket_notification',
          {
            type,
            message,
            metadata,
          },
          excludeUserId
        )
      }

      return results.flat()
    } catch (error) {
      console.error('❌ Error sending ticket notification:', error)
      throw new ApiError('Failed to send ticket notification', 500)
    }
  }

  /**
   * Send SLA warning notifications
   */
  async sendSLAWarning(
    ticketId: string,
    warningType: 'response' | 'resolution'
  ) {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          assignedTo: true,
          department: true,
        },
      })

      if (!ticket) return

      const message = `SLA Warning: Ticket "${ticket.title}" ${warningType} deadline approaching`
      const metadata = {
        warningType,
        priority: ticket.priority,
        // Note: slaDeadline field doesn't exist in your schema, you might need to add it
        // dueDate: ticket.slaDeadline,
      }

      // Notify assigned agent
      if (ticket.assignedTo) {
        await this.createNotification({
          message,
          type: 'SLA_WARNING',
          targetUserId: ticket.assignedTo.id,
          ticketId,
          metadata,
        })
      }

      // Notify department agents and admins
      await Promise.all([
        this.createBulkNotifications({
          message,
          type: 'SLA_WARNING',
          targetUserRole: 'AGENT',
          departmentId: ticket.departmentId,
          ticketId,
          metadata,
        }),
        this.createBulkNotifications({
          message,
          type: 'SLA_WARNING',
          targetUserRole: 'ADMIN',
          ticketId,
          metadata,
        }),
      ])
    } catch (error) {
      console.error('❌ Error sending SLA warning:', error)
      // Don't throw here as this is often called from background jobs
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: string) {
    try {
      const [totalCount, unreadCount, typeBreakdown] = await Promise.all([
        prisma.notification.count({
          where: { targetUserId: userId },
        }),
        prisma.notification.count({
          where: { targetUserId: userId, read: false },
        }),
        prisma.notification.groupBy({
          by: ['type'],
          where: { targetUserId: userId },
          _count: true,
        }),
      ])

      return {
        totalCount,
        unreadCount,
        readCount: totalCount - unreadCount,
        typeBreakdown: typeBreakdown.reduce((acc, item) => {
          acc[item.type] = item._count
          return acc
        }, {} as Record<string, number>),
      }
    } catch (error) {
      console.error('❌ Error fetching notification stats:', error)
      throw new ApiError('Failed to fetch notification statistics', 500)
    }
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null

export const getNotificationService = (): NotificationService => {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService()
  }
  return notificationServiceInstance
}

export const initializeNotificationService = (wsManager: WebSocketManager) => {
  const service = getNotificationService()
  service.setWebSocketManager(wsManager)
  console.log('🔔 Notification service initialized with WebSocket manager')
  return service
}
