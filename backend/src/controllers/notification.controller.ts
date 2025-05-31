// src/controllers/notification.controller.ts
import { Response, NextFunction } from 'express'
import { getNotificationService } from '../services/notification.service'
import { ApiError, authenticatedAsyncHandler } from '../utils/ErrorHandler'
import { AuthenticatedRequest } from '../types/auth.types'

export const getUserNotifications = authenticatedAsyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.userId
      const { page = 1, limit = 20, type, read, ticketId } = req.query

      const pageNum = parseInt(page as string, 10)
      const limitNum = parseInt(limit as string, 10)

      // Validate pagination
      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        throw new ApiError('Invalid pagination parameters', 400)
      }

      const filters: any = {}
      if (type) filters.type = type as string
      if (read !== undefined) filters.read = read === 'true'
      if (ticketId) filters.ticketId = ticketId as string

      const notificationService = getNotificationService()
      const result = await notificationService.getUserNotifications(
        userId,
        pageNum,
        limitNum,
        filters
      )

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }
)
export const markNotificationAsRead = authenticatedAsyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id: notificationId } = req.params
      const userId = req.user.userId

      const notificationService = getNotificationService()
      const notification = await notificationService.markAsRead(
        notificationId,
        userId
      )

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: notification,
      })
    } catch (error) {
      next(error)
    }
  }
)

export const markAllNotificationsAsRead = authenticatedAsyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.userId

      const notificationService = getNotificationService()
      const result = await notificationService.markAllAsRead(userId)

      res.status(200).json({
        success: true,
        message: `${result.count} notifications marked as read`,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }
)

export const deleteNotification = authenticatedAsyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id: notificationId } = req.params
      const userId = req.user.userId

      const notificationService = getNotificationService()
      await notificationService.deleteNotification(notificationId, userId)

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      })
    } catch (error) {
      next(error)
    }
  }
)
export const getNotificationStats = authenticatedAsyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.userId

      const notificationService = getNotificationService()
      const stats = await notificationService.getNotificationStats(userId)

      res.status(200).json({
        success: true,
        data: stats,
      })
    } catch (error) {
      next(error)
    }
  }
)
export const testNotification = authenticatedAsyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { targetUserId, message, type } = req.body

      const notificationService = getNotificationService()
      const notification = await notificationService.createNotification({
        message: message || 'Test notification',
        type: type || 'SYSTEM_NOTIFICATION',
        targetUserId,
      })

      res.status(201).json({
        success: true,
        message: 'Test notification sent successfully',
        data: notification,
      })
    } catch (error) {
      next(error)
    }
  }
)
