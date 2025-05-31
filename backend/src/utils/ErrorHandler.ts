import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '../../prisma/generated/prisma'
import { AuthenticatedRequest } from '../types/auth.types'

export class ApiError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  errors?: any

  constructor(success: boolean, message: string, data?: T, errors?: any) {
    this.success = success
    this.message = message
    if (data !== undefined) this.data = data
    if (errors !== undefined) this.errors = errors
  }

  static success<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse(true, message, data)
  }

  static error(message: string, errors?: any): ApiResponse {
    return new ApiResponse(false, message, undefined, errors)
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
export const authenticatedAsyncHandler = (
  fn: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Cast to AuthenticatedRequest since authenticate middleware ensures user exists
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next)
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500
  let message = 'Internal server error'
  let errors: any = undefined

  // Log error for debugging
  console.error('Error occurred:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  })

  // Handle different error types
  if (error instanceof ApiError) {
    statusCode = error.statusCode
    message = error.message
  } else if (error instanceof ZodError) {
    statusCode = 400
    message = 'Validation error'
    errors = (error as ZodError).errors.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
    }))
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = error as Prisma.PrismaClientKnownRequestError
    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409
        message = 'Resource already exists'
        errors = {
          field: prismaError.meta?.target,
          message: 'Unique constraint violation',
        }
        break
      case 'P2025':
        statusCode = 404
        message = 'Resource not found'
        break
      case 'P2003':
        statusCode = 400
        message = 'Invalid reference'
        break
      default:
        statusCode = 400
        message = 'Database operation failed'
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400
    message = 'Invalid data provided'
  }

  const response = new ApiResponse(false, message, undefined, errors)

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    ;(response as any).stack = error.stack
  }

  res.status(statusCode).json(response)
}
