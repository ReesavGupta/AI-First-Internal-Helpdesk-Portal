import jwt from 'jsonwebtoken'
import { UserRole } from '../../prisma/generated/prisma'

interface TokenPayload {
  userId: string
  email: string
  role: UserRole
}

export const generateToken = (payload: TokenPayload): string => {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }

  return jwt.sign(payload, jwtSecret, {
    expiresIn: '24h',
    issuer: 'ai-helpdesk-portal',
    audience: 'ai-helpdesk-users',
  })
}

export const verifyToken = (token: string): TokenPayload => {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }

  return jwt.verify(token, jwtSecret, {
    issuer: 'ai-helpdesk-portal',
    audience: 'ai-helpdesk-users',
  }) as TokenPayload
}
