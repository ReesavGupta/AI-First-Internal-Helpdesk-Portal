import { Request, Response } from 'express'
import { prisma } from '../../prisma/client'
import { ApiResponse, ApiError, asyncHandler } from '../utils/ErrorHandler'
import {
  CreateDepartmentInput,
  UpdateDepartmentInput,
  PaginationInput,
} from '../schemas'
import { Prisma } from '../../prisma/generated/prisma'

export const createDepartment = asyncHandler(
  async (req: Request<{}, {}, CreateDepartmentInput>, res: Response) => {
    const { name, keywords } = req.body

    // Check if department with same name already exists
    const existingDepartment = await prisma.department.findUnique({
      where: { name },
    })

    if (existingDepartment) {
      throw new ApiError('Department with this name already exists', 400)
    }

    // Validate keywords array
    if (!keywords || keywords.length === 0) {
      throw new ApiError('At least one keyword is required for AI routing', 400)
    }

    // Clean and normalize keywords
    const cleanedKeywords = keywords
      .map((keyword) => keyword.trim().toLowerCase())
      .filter((keyword) => keyword.length > 0)

    if (cleanedKeywords.length === 0) {
      throw new ApiError('Valid keywords are required for AI routing', 400)
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        keywords: cleanedKeywords,
      },
      include: {
        _count: {
          select: {
            users: true,
            tickets: true,
          },
        },
      },
    })

    res
      .status(201)
      .json(ApiResponse.success('Department created successfully', department))
  }
)

export const getDepartments = asyncHandler(
  async (req: Request<{}, {}, {}, PaginationInput>, res: Response) => {
    const { page = 1, limit = 10 } = req.query
    // const { role, departmentId } = req.user!

    const skip = (page - 1) * limit

    const whereClause: Prisma.DepartmentWhereInput = {}

    // If user is an agent, they can only see their own department
    // if (role === 'AGENT' && departmentId) {
    //   whereClause.id = departmentId
    // }

    const [departments, totalCount] = await Promise.all([
      prisma.department.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              users: true,
              tickets: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        skip,
        take: limit,
      }),
      prisma.department.count({ where: whereClause }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    res.json(
      ApiResponse.success('Departments retrieved successfully', {
        departments,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      })
    )
  }
)

export const getDepartmentById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params
    const { role, departmentId: userDepartmentId } = req.user!

    // Check if agent is trying to access a department they don't belong to
    if (role === 'AGENT' && userDepartmentId !== id) {
      throw new ApiError('You can only access your own department', 403)
    }

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            createdAt: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    })

    if (!department) {
      throw new ApiError('Department not found', 404)
    }

    res.json(
      ApiResponse.success('Department retrieved successfully', department)
    )
  }
)

export const updateDepartment = asyncHandler(
  async (
    req: Request<{ id: string }, {}, UpdateDepartmentInput>,
    res: Response
  ) => {
    const { id } = req.params
    const { name, keywords } = req.body

    const existingDepartment = await prisma.department.findUnique({
      where: { id },
    })

    if (!existingDepartment) {
      throw new ApiError('Department not found', 404)
    }

    // Check if another department with the same name exists (if name is being updated)
    if (name && name !== existingDepartment.name) {
      const duplicateDepartment = await prisma.department.findUnique({
        where: { name },
      })

      if (duplicateDepartment) {
        throw new ApiError('Department with this name already exists', 400)
      }
    }

    // Validate and clean keywords if provided
    let cleanedKeywords: string[] | undefined
    if (keywords) {
      if (keywords.length === 0) {
        throw new ApiError(
          'At least one keyword is required for AI routing',
          400
        )
      }

      cleanedKeywords = keywords
        .map((keyword) => keyword.trim().toLowerCase())
        .filter((keyword) => keyword.length > 0)

      if (cleanedKeywords.length === 0) {
        throw new ApiError('Valid keywords are required for AI routing', 400)
      }
    }

    const updatedDepartment = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(cleanedKeywords && { keywords: cleanedKeywords }),
      },
      include: {
        _count: {
          select: {
            users: true,
            tickets: true,
          },
        },
      },
    })

    res.json(
      ApiResponse.success('Department updated successfully', updatedDepartment)
    )
  }
)

export const deleteDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            tickets: true,
          },
        },
      },
    })

    if (!department) {
      throw new ApiError('Department not found', 404)
    }

    // Check if department has users or tickets
    if (department._count.users > 0) {
      throw new ApiError(
        'Cannot delete department with assigned users. Please reassign users first.',
        400
      )
    }

    if (department._count.tickets > 0) {
      throw new ApiError(
        'Cannot delete department with existing tickets. Please resolve or reassign tickets first.',
        400
      )
    }

    await prisma.department.delete({
      where: { id },
    })

    res.json(ApiResponse.success('Department deleted successfully'))
  }
)

export const getDepartmentAgents = asyncHandler(
  async (
    req: Request<{ id: string }, {}, {}, PaginationInput>,
    res: Response
  ) => {
    const { id } = req.params
    const { page = 1, limit = 10 } = req.query
    const { role, departmentId: userDepartmentId } = req.user!

    // Check if agent is trying to access a department they don't belong to
    if (role === 'AGENT' && userDepartmentId !== id) {
      throw new ApiError(
        'You can only access agents from your own department',
        403
      )
    }

    const department = await prisma.department.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!department) {
      throw new ApiError('Department not found', 404)
    }

    const skip = (page - 1) * limit

    const [agents, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: {
          departmentId: id,
          role: {
            in: ['AGENT', 'ADMIN'],
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          _count: {
            select: {
              assignedTickets: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        skip,
        take: Number(limit),
      }),
      prisma.user.count({
        where: {
          departmentId: id,
          role: {
            in: ['AGENT', 'ADMIN'],
          },
        },
      }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    res.json(
      ApiResponse.success('Department agents retrieved successfully', {
        department: {
          id: department.id,
          name: department.name,
        },
        agents,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      })
    )
  }
)

export const getDepartmentTickets = asyncHandler(
  async (
    req: Request<{ id: string }, {}, {}, PaginationInput>,
    res: Response
  ) => {
    const { id } = req.params
    const { page = 1, limit = 10 } = req.query
    const { role, departmentId: userDepartmentId } = req.user!

    // Check if agent is trying to access tickets from a department they don't belong to
    if (role === 'AGENT' && userDepartmentId !== id) {
      throw new ApiError(
        'You can only access tickets from your own department',
        403
      )
    }

    const department = await prisma.department.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!department) {
      throw new ApiError('Department not found', 404)
    }

    const skip = (page - 1) * limit

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where: {
          departmentId: id,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              responses: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      prisma.ticket.count({
        where: {
          departmentId: id,
        },
      }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    res.json(
      ApiResponse.success('Department tickets retrieved successfully', {
        department: {
          id: department.id,
          name: department.name,
        },
        tickets,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      })
    )
  }
)

export const getDepartmentStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params
    const { role, departmentId: userDepartmentId } = req.user!

    // Check if agent is trying to access stats from a department they don't belong to
    if (role === 'AGENT' && userDepartmentId !== id) {
      throw new ApiError(
        'You can only access stats from your own department',
        403
      )
    }

    const department = await prisma.department.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!department) {
      throw new ApiError('Department not found', 404)
    }

    // Get current date for filtering
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))

    // Parallel queries for different statistics
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      highPriorityTickets,
      totalAgents,
      ticketsThisMonth,
      ticketsThisWeek,

      ticketsByPriority,
      ticketsByStatus,
      recentTickets,
    ] = await Promise.all([
      // Total tickets count
      prisma.ticket.count({
        where: { departmentId: id },
      }),

      // Tickets by status
      prisma.ticket.count({
        where: { departmentId: id, status: 'OPEN' },
      }),
      prisma.ticket.count({
        where: { departmentId: id, status: 'IN_PROGRESS' },
      }),
      prisma.ticket.count({
        where: { departmentId: id, status: 'RESOLVED' },
      }),
      prisma.ticket.count({
        where: { departmentId: id, status: 'CLOSED' },
      }),

      // High priority tickets
      prisma.ticket.count({
        where: { departmentId: id, priority: 'HIGH' },
      }),

      // Total agents in department
      prisma.user.count({
        where: {
          departmentId: id,
          role: {
            in: ['AGENT', 'ADMIN'],
          },
        },
      }),

      // Tickets this month
      prisma.ticket.count({
        where: {
          departmentId: id,
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),

      // Tickets this week
      prisma.ticket.count({
        where: {
          departmentId: id,
          createdAt: {
            gte: startOfWeek,
          },
        },
      }),

      // Tickets by priority distribution
      prisma.ticket.groupBy({
        by: ['priority'],
        where: { departmentId: id },
        _count: {
          priority: true,
        },
      }),

      // Tickets by status distribution
      prisma.ticket.groupBy({
        by: ['status'],
        where: { departmentId: id },
        _count: {
          status: true,
        },
      }),

      // Recent tickets (last 5)
      prisma.ticket.findMany({
        where: { departmentId: id },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      }),
    ])

    // Calculate resolution rate
    const resolvedCount = resolvedTickets + closedTickets
    const resolutionRate =
      totalTickets > 0 ? (resolvedCount / totalTickets) * 100 : 0

    // Format priority and status distributions
    const priorityDistribution = ticketsByPriority.reduce((acc, curr) => {
      acc[curr.priority.toLowerCase()] = curr._count.priority
      return acc
    }, {} as Record<string, number>)

    const statusDistribution = ticketsByStatus.reduce((acc, curr) => {
      acc[curr.status.toLowerCase()] = curr._count.status
      return acc
    }, {} as Record<string, number>)

    const stats = {
      department: {
        id: department.id,
        name: department.name,
      },
      overview: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        highPriorityTickets,
        totalAgents,
        resolutionRate: Math.round(resolutionRate * 100) / 100,
      },
      timeBasedStats: {
        ticketsThisMonth,
        ticketsThisWeek,
      },
      distributions: {
        byPriority: {
          low: priorityDistribution.low || 0,
          medium: priorityDistribution.medium || 0,
          high: priorityDistribution.high || 0,
        },
        byStatus: {
          open: statusDistribution.open || 0,
          inProgress: statusDistribution.in_progress || 0,
          resolved: statusDistribution.resolved || 0,
          closed: statusDistribution.closed || 0,
        },
      },
      recentActivity: {
        recentTickets,
      },
    }

    res.json(
      ApiResponse.success('Department statistics retrieved successfully', stats)
    )
  }
)
