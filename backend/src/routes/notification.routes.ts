// src/routes/notifications.ts
import express from 'express'
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats,
  testNotification,
} from '../controllers/notification.controller'
import {
  authenticate,
  requireEmployee,
  requireAdmin,
} from '../middlewares/auth'
import {
  validateQuery,
  validateParams,
  validateBody,
  notificationFiltersSchema,
  idParamSchema,
  testNotificationSchema,
} from '../schemas'

const router = express.Router()

// Get user's notifications with pagination and filters
router.get(
  '/',
  authenticate,
  requireEmployee,
  validateQuery(notificationFiltersSchema),
  getUserNotifications
)

// Get notification statistics for current user
router.get('/stats', authenticate, requireEmployee, getNotificationStats)

// Mark specific notification as read
router.patch(
  '/:id/read',
  authenticate,
  requireEmployee,
  validateParams(idParamSchema),
  markNotificationAsRead
)

// Mark all notifications as read for current user
router.patch(
  '/read-all',
  authenticate,
  requireEmployee,
  markAllNotificationsAsRead
)

// Delete specific notification
router.delete(
  '/:id',
  authenticate,
  requireEmployee,
  validateParams(idParamSchema),
  deleteNotification
)

// Test notification endpoint (admin only)
router.post(
  '/test',
  authenticate,
  requireAdmin,
  validateBody(testNotificationSchema),
  testNotification
)

export default router
