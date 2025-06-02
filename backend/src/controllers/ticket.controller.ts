import { Request, Response } from 'express'
import { prisma } from '../../prisma/client'
import { ApiResponse, ApiError, asyncHandler } from '../utils/ErrorHandler'
import {
  CreateTicketInput,
  UpdateTicketInput,
  UpdateTicketStatusInput,
  CreateTicketResponseInput,
  TicketFiltersInput,
} from '../schemas'
import { Prisma } from '@prisma/client'
import { assignTicketByAI } from '../services/ai.service'
import { getNotificationService } from '../services/notification.service'

interface AssignTicketParams {
  id: string
  agentId: string
}

export const createTicket = asyncHandler(
  async (req: Request<{}, {}, CreateTicketInput>, res: Response) => {
    const { title, description, priority, tags, fileUrls, departmentId } =
      req.body
    const userId = req.user!.userId

    let finalDepartmentId = departmentId
    let wasAssignedByAI = false // Initialize flag

    // If no department specified, use AI to assign based on title and description
    if (!departmentId) {
      try {
        const aiAssignment = await assignTicketByAI(title, description)
        finalDepartmentId = aiAssignment.departmentId
        wasAssignedByAI = aiAssignment.assignedByAI // Set the flag
      } catch (error) {
        console.error('AI department assignment failed:', error)
        // If AI fails, assign to a default department or require manual assignment
        throw new ApiError(
          'Unable to automatically assign department. Please select a department manually.',
          400
        )
      }
    }

    // Validate department exists
    if (!finalDepartmentId) {
      throw new ApiError('Department is required', 400)
    }

    const department = await prisma.department.findUnique({
      where: { id: finalDepartmentId },
    })

    if (!department) {
      throw new ApiError('Invalid department selected', 400)
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority,
        tags,
        fileUrls,
        departmentId: finalDepartmentId,
        createdById: userId,
        assignedByAI: wasAssignedByAI, // Save the flag
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
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
    })

    // Send notifications using the notification service
    const notificationService = getNotificationService()

    try {
      // Notify department agents about new ticket
      await notificationService.sendTicketNotification(
        ticket.id,
        'TICKET_CREATED',
        `New ${priority.toLowerCase()} priority ticket created: ${title}`,
        userId, // Exclude the creator from getting the notification
        {
          priority,
          departmentName: department.name,
          createdBy: ticket.createdBy.name,
        }
      )
    } catch (notificationError) {
      console.error(
        'Failed to send ticket creation notifications:',
        notificationError
      )
      // Don't fail the ticket creation if notifications fail
    }

    res
      .status(201)
      .json(ApiResponse.success('Ticket created successfully', ticket))
  }
)

export const getTickets = asyncHandler(
  async (req: Request<{}, {}, {}, TicketFiltersInput>, res: Response) => {
    const {
      status,
      priority,
      departmentId,
      assignedToId,
      createdById,
      tags,
      startDate,
      endDate,
    } = req.query

    // Explicitly parse, sanitize, and default pagination parameters
    let pageNumber = Number(req.query.page)
    let limitNumber = Number(req.query.limit)

    if (isNaN(pageNumber) || pageNumber < 1) {
      pageNumber = 1 // Default page
    }

    if (isNaN(limitNumber) || limitNumber < 1) {
      limitNumber = 10 // Default limit
    } else if (limitNumber > 100) {
      limitNumber = 100 // Max limit as per paginationSchema
    }

    const { userId, role, departmentId: userDepartmentId } = req.user!

    let whereClause: Prisma.TicketWhereInput = {}

    // Role-based filtering
    if (role === 'AGENT') {
      if (userDepartmentId) {
        whereClause.departmentId = userDepartmentId
      } else {
        // Agent has no department, so they can't see any department-specific tickets here.
        // Assign a value that won't match any valid CUID to ensure no tickets are returned.
        // This prevents a PrismaClientValidationError if userDepartmentId is null/undefined.
        whereClause.departmentId = '0000000000000000000000000' // Example non-matching CUID like string
      }
    }
    // Admins can see all tickets (no additional departmentId filtering based on their own department)

    // Apply filters
    if (status) whereClause.status = status
    if (priority) whereClause.priority = priority
    if (departmentId) whereClause.departmentId = departmentId
    if (assignedToId) whereClause.assignedToId = assignedToId
    if (createdById) whereClause.createdById = createdById
    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim())
      whereClause.tags = {
        hasSome: tagArray,
      }
    }
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) whereClause.createdAt.gte = new Date(startDate)
      if (endDate) whereClause.createdAt.lte = new Date(endDate)
    }

    const skip = (pageNumber - 1) * limitNumber

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where: whereClause,
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
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
        take: Number(limitNumber),
      }),
      prisma.ticket.count({ where: whereClause }),
    ])

    const totalPages = Math.ceil(totalCount / limitNumber)

    res.json(
      ApiResponse.success('Tickets retrieved successfully', {
        tickets,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalCount,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      })
    )
  }
)

export const getMyTickets = asyncHandler(
  async (req: Request<{}, {}, {}, TicketFiltersInput>, res: Response) => {
    const { status, priority, tags, startDate, endDate } = req.query
    const userId = req.user!.userId

    // Explicitly parse, sanitize, and default pagination parameters
    let pageNumber = Number(req.query.page)
    let limitNumber = Number(req.query.limit)

    if (isNaN(pageNumber) || pageNumber < 1) {
      pageNumber = 1 // Default page
    }

    if (isNaN(limitNumber) || limitNumber < 1) {
      limitNumber = 10 // Default limit
    } else if (limitNumber > 100) {
      limitNumber = 100 // Max limit as per paginationSchema
    }

    let whereClause: Prisma.TicketWhereInput = {
      createdById: userId,
    }

    // Apply filters
    if (status) whereClause.status = status
    if (priority) whereClause.priority = priority
    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim())
      whereClause.tags = {
        hasSome: tagArray,
      }
    }
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) whereClause.createdAt.gte = new Date(startDate)
      if (endDate) whereClause.createdAt.lte = new Date(endDate)
    }

    const skip = (pageNumber - 1) * limitNumber

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where: whereClause,
        include: {
          department: {
            select: {
              id: true,
              name: true,
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
        take: limitNumber,
      }),
      prisma.ticket.count({ where: whereClause }),
    ])

    const totalPages = Math.ceil(totalCount / limitNumber)

    res.json(
      ApiResponse.success('My tickets retrieved successfully', {
        tickets,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalCount,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      })
    )
  }
)

export const getAssignedTickets = asyncHandler(
  async (req: Request<{}, {}, {}, TicketFiltersInput>, res: Response) => {
    // Destructure non-pagination query params first
    const { status, priority, tags, startDate, endDate } = req.query
    const userId = req.user!.userId

    // Explicitly parse, sanitize, and default pagination parameters
    let pageNumber = Number(req.query.page)
    let limitNumber = Number(req.query.limit)

    if (isNaN(pageNumber) || pageNumber < 1) {
      pageNumber = 1 // Default page
    }

    if (isNaN(limitNumber) || limitNumber < 1) {
      limitNumber = 10 // Default limit
    } else if (limitNumber > 100) {
      limitNumber = 100 // Max limit as per paginationSchema
    }

    let whereClause: Prisma.TicketWhereInput = {
      assignedToId: userId,
    }

    // Apply filters
    if (status) whereClause.status = status
    if (priority) whereClause.priority = priority
    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim())
      whereClause.tags = {
        hasSome: tagArray,
      }
    }
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) whereClause.createdAt.gte = new Date(startDate)
      if (endDate) whereClause.createdAt.lte = new Date(endDate)
    }

    const skip = (pageNumber - 1) * limitNumber

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where: whereClause,
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
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
        skip: skip,
        take: limitNumber, // Use the sanitized numeric limitNumber
      }),
      prisma.ticket.count({ where: whereClause }),
    ])

    const totalPages = Math.ceil(totalCount / limitNumber)

    res.json(
      ApiResponse.success('Assigned tickets retrieved successfully', {
        tickets,
        pagination: {
          currentPage: pageNumber, // Use sanitized numeric pageNumber
          totalPages,
          totalCount,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      })
    )
  }
)

export const getTicketById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
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
        responses: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!ticket) {
      throw new ApiError('Ticket not found', 404)
    }

    res.json(ApiResponse.success('Ticket retrieved successfully', ticket))
  }
)

export const updateTicket = asyncHandler(
  async (
    req: Request<{ id: string }, {}, UpdateTicketInput>,
    res: Response
  ) => {
    const { id } = req.params
    const { title, description, priority, tags, fileUrls, assignedToId } =
      req.body
    const { userId, role } = req.user!

    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    })

    if (!existingTicket) {
      throw new ApiError('Ticket not found', 404)
    }

    // Check permissions
    const canUpdate =
      role === 'ADMIN' ||
      existingTicket.createdById === userId ||
      existingTicket.assignedToId === userId

    if (!canUpdate) {
      throw new ApiError(
        'You can only update your own tickets or assigned tickets',
        403
      )
    }

    // Validate assigned user if provided
    if (assignedToId !== undefined) {
      if (role !== 'ADMIN' && role !== 'AGENT') {
        throw new ApiError('Only agents and admins can assign tickets', 403)
      }

      if (assignedToId) {
        const assignedUser = await prisma.user.findUnique({
          where: { id: assignedToId },
          select: { role: true, departmentId: true, name: true },
        })

        if (
          !assignedUser ||
          (assignedUser.role !== 'AGENT' && assignedUser.role !== 'ADMIN')
        ) {
          throw new ApiError('Can only assign tickets to agents or admins', 400)
        }
      }
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(priority && { priority }),
        ...(tags && { tags }),
        ...(fileUrls && { fileUrls }),
        ...(assignedToId !== undefined && { assignedToId }),
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
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
    })

    // Send notifications for ticket assignment changes
    const notificationService = getNotificationService()

    try {
      if (assignedToId && assignedToId !== existingTicket.assignedToId) {
        // Notify the newly assigned user
        await notificationService.createNotification({
          message: `Ticket assigned to you: ${updatedTicket.title}`,
          type: 'TICKET_ASSIGNED',
          targetUserId: assignedToId,
          ticketId: id,
          metadata: {
            priority: updatedTicket.priority,
            assignedBy: req.user!.email,
          },
        })

        // Notify the ticket creator about assignment
        if (existingTicket.createdById !== userId) {
          await notificationService.createNotification({
            message: `Your ticket "${updatedTicket.title}" has been assigned to ${updatedTicket.assignedTo?.name}`,
            type: 'ASSIGNMENT',
            targetUserId: existingTicket.createdById,
            ticketId: id,
            metadata: {
              assignedTo: updatedTicket.assignedTo?.name,
              assignedBy: req.user!.email,
            },
          })
        }
      }

      // Notify about priority changes
      if (priority && priority !== existingTicket.priority) {
        const priorityMessage = `Ticket priority updated to ${priority}: ${updatedTicket.title}`

        // Notify ticket creator
        if (existingTicket.createdById !== userId) {
          await notificationService.createNotification({
            message: priorityMessage,
            type: 'TICKET_STATUS_UPDATED',
            targetUserId: existingTicket.createdById,
            ticketId: id,
            metadata: {
              oldPriority: existingTicket.priority,
              newPriority: priority,
              updatedBy: req.user!.email,
            },
          })
        }

        // Notify assigned agent if different from updater
        if (
          updatedTicket.assignedToId &&
          updatedTicket.assignedToId !== userId
        ) {
          await notificationService.createNotification({
            message: priorityMessage,
            type: 'TICKET_STATUS_UPDATED',
            targetUserId: updatedTicket.assignedToId,
            ticketId: id,
            metadata: {
              oldPriority: existingTicket.priority,
              newPriority: priority,
              updatedBy: req.user!.email,
            },
          })
        }
      }
    } catch (notificationError) {
      console.error(
        'Failed to send ticket update notifications:',
        notificationError
      )
      // Don't fail the update if notifications fail
    }

    res.json(ApiResponse.success('Ticket updated successfully', updatedTicket))
  }
)

export const updateTicketStatus = asyncHandler(
  async (
    req: Request<{ id: string }, {}, UpdateTicketStatusInput>,
    res: Response
  ) => {
    const { id } = req.params
    const { status } = req.body
    const userId = req.user!.userId

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        createdById: true,
        assignedToId: true,
        status: true,
      },
    })

    if (!ticket) {
      throw new ApiError('Ticket not found', 404)
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: { status },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
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
    })

    // Send notifications for status changes
    const notificationService = getNotificationService()

    try {
      if (ticket.status !== status) {
        await notificationService.sendTicketNotification(
          id,
          'TICKET_STATUS_UPDATED',
          `Ticket status updated to ${status}: ${ticket.title}`,
          userId, // Exclude the user who made the change
          {
            oldStatus: ticket.status,
            newStatus: status,
            updatedBy: req.user!.email,
          }
        )
      }
    } catch (notificationError) {
      console.error(
        'Failed to send status update notifications:',
        notificationError
      )
      // Don't fail the update if notifications fail
    }

    res.json(
      ApiResponse.success('Ticket status updated successfully', updatedTicket)
    )
  }
)

export const assignTicket = asyncHandler(
  async (req: Request<AssignTicketParams>, res: Response) => {
    const { id, agentId } = req.params
    const currentPerformingUserId = req.user!.userId

    if (!id || !agentId) {
      throw new ApiError('Both ticket ID and agent ID are required', 400)
    }

    // Validate agent exists and has proper role
    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: { role: true, departmentId: true, name: true },
    })

    if (!agent) {
      throw new ApiError('Agent not found', 404)
    }

    if (agent.role !== 'AGENT' && agent.role !== 'ADMIN') {
      throw new ApiError('Selected user is not an agent or admin', 400)
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { departmentId: true, title: true, createdById: true },
    })

    if (!ticket) {
      throw new ApiError('Ticket not found', 404)
    }

    // If the user performing the action is an Admin, they can assign to any agent in any department.
    // If the user performing the action is an Agent, they can only assign to another agent in the same department as the ticket.
    if (
      req.user?.role !== 'ADMIN' &&
      agent.role === 'AGENT' &&
      agent.departmentId !== ticket.departmentId
    ) {
      throw new ApiError(
        'Agents can only be assigned to tickets within their own department.',
        400
      )
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        assignedToId: agentId,
        status: 'IN_PROGRESS',
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
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
    })

    // Send notifications
    const notificationService = getNotificationService()

    try {
      // Notify assigned agent
      await notificationService.createNotification({
        message: `Ticket assigned to you: ${ticket.title}`,
        type: 'TICKET_ASSIGNED',
        targetUserId: agentId,
        ticketId: id,
        metadata: {
          assignedBy: req.user!.email,
          priority: updatedTicket.priority,
        },
      })

      // Notify ticket creator about assignment
      if (
        ticket.createdById !== currentPerformingUserId &&
        ticket.createdById !== agentId
      ) {
        await notificationService.createNotification({
          message: `Your ticket "${ticket.title}" has been assigned to ${agent.name}`,
          type: 'ASSIGNMENT',
          targetUserId: ticket.createdById,
          ticketId: id,
          metadata: {
            assignedTo: agent.name,
            assignedBy: req.user!.email,
          },
        })
      }
    } catch (notificationError) {
      console.error(
        'Failed to send assignment notifications:',
        notificationError
      )
      // Don't fail the assignment if notifications fail
    }

    res.json(ApiResponse.success('Ticket assigned successfully', updatedTicket))
  }
)

export const unassignTicket = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = req.user!.userId

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        assignedToId: true,
        title: true,
        createdById: true,
        assignedTo: { select: { name: true } },
      },
    })

    if (!ticket) {
      throw new ApiError('Ticket not found', 404)
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        assignedToId: null,
        status: 'OPEN',
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
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
    })

    // Send notifications
    const notificationService = getNotificationService()

    try {
      // Notify the previously assigned agent
      if (ticket.assignedToId && ticket.assignedToId !== userId) {
        await notificationService.createNotification({
          message: `You have been unassigned from ticket: ${ticket.title}`,
          type: 'ASSIGNMENT',
          targetUserId: ticket.assignedToId,
          ticketId: id,
          metadata: {
            unassignedBy: req.user!.email,
            previouslyAssigned: ticket.assignedTo?.name,
          },
        })
      }

      // Notify ticket creator
      if (ticket.createdById !== userId) {
        await notificationService.createNotification({
          message: `Your ticket "${ticket.title}" has been unassigned and is now available for assignment`,
          type: 'ASSIGNMENT',
          targetUserId: ticket.createdById,
          ticketId: id,
          metadata: {
            unassignedBy: req.user!.email,
            previouslyAssigned: ticket.assignedTo?.name,
          },
        })
      }
    } catch (notificationError) {
      console.error(
        'Failed to send unassignment notifications:',
        notificationError
      )
      // Don't fail the unassignment if notifications fail
    }

    res.json(
      ApiResponse.success('Ticket unassigned successfully', updatedTicket)
    )
  }
)

export const deleteTicket = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!ticket) {
      throw new ApiError('Ticket not found', 404)
    }

    await prisma.ticket.delete({
      where: { id },
    })

    res.json(ApiResponse.success('Ticket deleted successfully'))
  }
)

export const getTicketResponses = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params

    const responses = await prisma.ticketResponse.findMany({
      where: { ticketId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    res.json(
      ApiResponse.success('Ticket responses retrieved successfully', responses)
    )
  }
)

export const createTicketResponse = asyncHandler(
  async (
    req: Request<{ id: string }, {}, CreateTicketResponseInput>,
    res: Response
  ) => {
    const { id } = req.params
    const { content, fileUrls } = req.body
    const userId = req.user!.userId

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        createdById: true,
        assignedToId: true,
        status: true,
      },
    })

    if (!ticket) {
      throw new ApiError('Ticket not found', 404)
    }

    const response = await prisma.ticketResponse.create({
      data: {
        content,
        fileUrls,
        ticketId: id,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    })

    // Update ticket status if it was closed/resolved and now has a new response
    if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
      await prisma.ticket.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      })
    }

    // Send notifications
    const notificationService = getNotificationService()

    try {
      await notificationService.sendTicketNotification(
        id,
        'TICKET_RESPONSE',
        `New response on ticket: ${ticket.title}`,
        userId, // Exclude the response author
        {
          responseBy: response.user.name,
          responseRole: response.user.role,
          hasAttachments: fileUrls && fileUrls.length > 0,
        }
      )
    } catch (notificationError) {
      console.error('Failed to send response notifications:', notificationError)
      // Don't fail the response creation if notifications fail
    }

    res
      .status(201)
      .json(ApiResponse.success('Response created successfully', response))
  }
)

export const deleteTicketResponse = asyncHandler(
  async (req: Request, res: Response) => {
    const { responseId } = req.params

    const response = await prisma.ticketResponse.findUnique({
      where: { id: responseId },
      select: { id: true },
    })

    if (!response) {
      throw new ApiError('Response not found', 404)
    }

    await prisma.ticketResponse.delete({
      where: { id: responseId },
    })

    res.json(ApiResponse.success('Response deleted successfully'))
  }
)
