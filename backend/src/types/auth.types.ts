// src/types/auth.types.ts
import { Request } from 'express'
import { UserRole } from '@prisma/client'

export interface AuthenticatedUser {
  userId: string
  email: string
  role: UserRole
  departmentId?: string
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser
}
