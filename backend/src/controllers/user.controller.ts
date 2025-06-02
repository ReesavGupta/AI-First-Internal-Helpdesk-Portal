import { Request, Response } from 'express'
import { prisma } from '../../prisma/client'
import { ApiResponse, asyncHandler } from '../utils/ErrorHandler'
import { UserRole } from '../../prisma/generated/prisma'

export const getAllAgents = asyncHandler(
  async (req: Request, res: Response) => {
    const agents = await prisma.user.findMany({
      where: {
        role: UserRole.AGENT,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    res.json(ApiResponse.success('Agents retrieved successfully', agents))
  }
)
