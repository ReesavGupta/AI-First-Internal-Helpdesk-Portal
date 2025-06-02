// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt.utils'
import { ApiError } from '../utils/ErrorHandler'
import { prisma } from '../../prisma/client'
import { UserRole } from '@prisma/client'

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        email: string
        role: UserRole
        departmentId?: string
      }
    }
  }
}

// Authentication middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError('Access token required', 401)
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    if (!token) {
      throw new ApiError('Access token required', 401)
    }

    // Verify JWT token
    const decoded = verifyToken(token)

    // Fetch user from database to ensure they still exist and get latest info
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        departmentId: true,
        name: true,
      },
    })

    if (!user) {
      throw new ApiError('Invalid token - user not found', 401)
    }

    // Attach user info to request object
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId || undefined,
    }

    next()
  } catch (error) {
    if (error instanceof ApiError) {
      next(error)
    } else {
      next(new ApiError('Invalid token', 401))
    }
  }
}

// Role-based authorization middleware
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError('Authentication required', 401))
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError('Insufficient permissions to access this resource', 403)
      )
    }

    next()
  }
}

// Convenience middleware for specific roles
export const requireAdmin = requireRole(['ADMIN'])
export const requireAgent = requireRole(['AGENT', 'ADMIN'])
export const requireEmployee = requireRole(['EMPLOYEE', 'AGENT', 'ADMIN'])

// Department-based authorization middleware
export const requireSameDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new ApiError('Authentication required', 401))
    }

    // Admins can access all departments
    if (req.user.role === 'ADMIN') {
      return next()
    }

    // Get the resource being accessed (ticket, user, etc.)
    const resourceId = req.params.id
    if (!resourceId) {
      return next(new ApiError('Resource ID required', 400))
    }

    // Check if user is accessing their own resource or department resource
    // This will be customized per route as needed
    next()
  } catch (error) {
    next(error)
  }
}

// Ticket ownership/access middleware
export const checkTicketAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new ApiError('Authentication required', 401))
    }

    const ticketId = req.params.id
    if (!ticketId) {
      return next(new ApiError('Ticket ID required', 400))
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        createdById: true,
        assignedToId: true,
        departmentId: true,
      },
    })

    if (!ticket) {
      return next(new ApiError('Ticket not found', 404))
    }

    const { userId, role, departmentId } = req.user

    // Admins can access all tickets
    if (role === 'ADMIN') {
      return next()
    }

    // Employees can only access their own tickets
    if (role === 'EMPLOYEE') {
      if (ticket.createdById !== userId) {
        return next(new ApiError('You can only access your own tickets', 403))
      }
      return next()
    }

    // Agents can access tickets in their department
    if (role === 'AGENT') {
      if (ticket.departmentId !== departmentId) {
        return next(
          new ApiError('You can only access tickets in your department', 403)
        )
      }
      return next()
    }

    next(new ApiError('Access denied', 403))
  } catch (error) {
    next(error)
  }
}

// Rate limiting for AI endpoints per user
export const aiRateLimit = new Map<
  string,
  { count: number; resetTime: number }
>()

export const checkAIRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new ApiError('Authentication required', 401))
  }

  const userId = req.user.userId
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 10

  const userLimit = aiRateLimit.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    aiRateLimit.set(userId, {
      count: 1,
      resetTime: now + windowMs,
    })
    return next()
  }

  if (userLimit.count >= maxRequests) {
    return next(
      new ApiError(
        'AI request limit exceeded. Please try again in a minute.',
        429
      )
    )
  }

  // Increment count
  userLimit.count++
  aiRateLimit.set(userId, userLimit)

  next()
}

// Cleanup expired rate limit entries (call this periodically)
export const cleanupRateLimit = () => {
  const now = Date.now()
  for (const [userId, limit] of aiRateLimit.entries()) {
    if (now > limit.resetTime) {
      aiRateLimit.delete(userId)
    }
  }
}

// Set up periodic cleanup
setInterval(cleanupRateLimit, 5 * 60 * 1000) // Clean up every 5 minutes
