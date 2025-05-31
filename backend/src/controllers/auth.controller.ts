// src/controllers/authController.ts
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../../prisma/client'
import { ApiResponse, ApiError, asyncHandler } from '../utils/ErrorHandler'
import { generateToken } from '../utils/jwt.utils'
import { UserRegistrationInput, UserLoginInput } from '../schemas'

export const register = asyncHandler(
  async (req: Request<{}, {}, UserRegistrationInput>, res: Response) => {
    const { email, password, name, role, departmentId } = req.body

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new ApiError('User with this email already exists', 409)
    }

    // Validate department assignment for agents
    if (role === 'AGENT' && !departmentId) {
      throw new ApiError('Department assignment is required for agents', 400)
    }

    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      })

      if (!department) {
        throw new ApiError('Invalid department selected', 400)
      }
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        departmentId: departmentId || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        departmentId: true,
        createdAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    res.status(201).json(
      ApiResponse.success('User registered successfully', {
        user,
        token,
      })
    )
  }
)

export const login = asyncHandler(
  async (req: Request<{}, {}, UserLoginInput>, res: Response) => {
    const { email, password } = req.body

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        departmentId: true,
        avatarUrl: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!user) {
      throw new ApiError('Invalid email or password', 401)
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      throw new ApiError('Invalid email or password', 401)
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    res.json(
      ApiResponse.success('Login successful', {
        user: userWithoutPassword,
        token,
      })
    )
  }
)

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError('Authentication required', 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      departmentId: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
      department: {
        select: {
          id: true,
          name: true,
          keywords: true,
        },
      },
      _count: {
        select: {
          createdTickets: true,
          assignedTickets: true,
          notifications: {
            where: {
              read: false,
            },
          },
        },
      },
    },
  })

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  res.json(ApiResponse.success('User profile retrieved successfully', user))
})

export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError('Authentication required', 401)
    }

    const { name, avatarUrl, departmentId } = req.body

    // Validate department if provided
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      })

      if (!department) {
        throw new ApiError('Invalid department selected', 400)
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(name && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(departmentId !== undefined && { departmentId }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        departmentId: true,
        avatarUrl: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    res.json(ApiResponse.success('Profile updated successfully', updatedUser))
  }
)

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // Since we're using stateless JWT tokens, logout is handled client-side
  // by removing the token from storage
  res.json(
    ApiResponse.success('Logout successful', {
      message: 'Please remove the token from client storage',
    })
  )
})
