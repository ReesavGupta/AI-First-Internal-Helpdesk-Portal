// src/controllers/ai.controller.ts
import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ErrorHandler'
import {
  assignTicketByAI,
  generateResponseSuggestions,
  detectPatterns,
  getAIAnswer,
  type AIResponseSuggestion,
  type PatternInsight,
} from '../services/ai.service'
import { prisma } from '../../prisma/client'

// Auto-assign ticket to department using AI
export const autoAssignTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, description } = req.body

    if (!title || !description) {
      throw new ApiError('Title and description are required', 400)
    }

    const departmentId = await assignTicketByAI(title, description)

    // Get department details for response
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, name: true },
    })

    res.json({
      success: true,
      message: 'Ticket department assigned successfully',
      data: {
        departmentId,
        departmentName: department?.name,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get AI-powered response suggestions for a ticket
export const getResponseSuggestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ticketId } = req.params

    if (!ticketId) {
      throw new ApiError('Ticket ID is required', 400)
    }

    // Check if ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        departmentId: true,
        createdById: true,
        assignedToId: true,
      },
    })

    if (!ticket) {
      throw new ApiError('Ticket not found', 404)
    }

    // Check access permissions
    const { userId, role, departmentId: userDepartmentId } = req.user!

    if (role === 'EMPLOYEE' && ticket.createdById !== userId) {
      throw new ApiError(
        'You can only get suggestions for your own tickets',
        403
      )
    }

    if (role === 'AGENT' && ticket.departmentId !== userDepartmentId) {
      throw new ApiError(
        'You can only get suggestions for tickets in your department',
        403
      )
    }

    const suggestions = await generateResponseSuggestions(ticketId)

    res.json({
      success: true,
      message: 'Response suggestions generated successfully',
      data: {
        ticketId,
        suggestions,
        count: suggestions.length,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get AI pattern insights (Admin only)
export const getPatternInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const insights = await detectPatterns()

    res.json({
      success: true,
      message: 'Pattern insights generated successfully',
      data: {
        insights,
        count: insights.length,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

// AI-powered question answering (chatbot functionality)
export const askAI = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { question } = req.body

    if (
      !question ||
      typeof question !== 'string' ||
      question.trim().length === 0
    ) {
      throw new ApiError(
        'Question is required and must be a non-empty string',
        400
      )
    }

    if (question.length > 500) {
      throw new ApiError('Question is too long (max 500 characters)', 400)
    }

    const result = await getAIAnswer(question.trim())

    res.json({
      success: true,
      message: 'AI answer generated successfully',
      data: {
        question: question.trim(),
        answer: result.answer,
        confidence: result.confidence,
        sources: result.sources,
        suggestTicket: result.suggestTicket,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get AI service status and statistics
export const getAIStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get some basic statistics
    const [totalTickets, totalFAQs, totalDocuments, recentTickets] =
      await Promise.all([
        prisma.ticket.count(),
        prisma.fAQ.count(),
        prisma.document.count(),
        prisma.ticket.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ])

    res.json({
      success: true,
      message: 'AI service status retrieved successfully',
      data: {
        status: 'operational',
        statistics: {
          totalTickets,
          totalFAQs,
          totalDocuments,
          recentTickets,
        },
        capabilities: [
          'auto_ticket_assignment',
          'response_suggestions',
          'pattern_detection',
          'question_answering',
        ],
        lastUpdated: new Date().toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Batch process tickets for AI assignment (Admin only)
export const batchProcessTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ticketIds, action } = req.body

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      throw new ApiError('Ticket IDs array is required', 400)
    }

    if (ticketIds.length > 50) {
      throw new ApiError('Cannot process more than 50 tickets at once', 400)
    }

    if (!action || !['reassign', 'suggest_responses'].includes(action)) {
      throw new ApiError(
        'Valid action is required (reassign or suggest_responses)',
        400
      )
    }

    const results = []

    for (const ticketId of ticketIds) {
      try {
        const ticket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          select: {
            id: true,
            title: true,
            description: true,
            departmentId: true,
          },
        })

        if (!ticket) {
          results.push({
            ticketId,
            success: false,
            error: 'Ticket not found',
          })
          continue
        }

        if (action === 'reassign') {
          const newDepartmentId = await assignTicketByAI(
            ticket.title,
            ticket.description
          )

          if (newDepartmentId !== ticket.departmentId) {
            await prisma.ticket.update({
              where: { id: ticketId },
              data: {
                departmentId: newDepartmentId,
                assignedToId: null, // Reset assignment when changing department
              },
            })

            results.push({
              ticketId,
              success: true,
              action: 'reassigned',
              newDepartmentId,
            })
          } else {
            results.push({
              ticketId,
              success: true,
              action: 'no_change_needed',
              departmentId: ticket.departmentId,
            })
          }
        } else if (action === 'suggest_responses') {
          const suggestions = await generateResponseSuggestions(ticketId)
          results.push({
            ticketId,
            success: true,
            action: 'suggestions_generated',
            suggestionCount: suggestions.length,
          })
        }
      } catch (error) {
        results.push({
          ticketId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    res.json({
      success: true,
      message: `Batch processing completed. ${successCount} successful, ${failureCount} failed`,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// Test AI functionality (Development only)
export const testAI = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError('Test endpoint not available in production', 403)
    }

    const { testType, testData } = req.body

    let result

    switch (testType) {
      case 'assignment':
        if (!testData?.title || !testData?.description) {
          throw new ApiError(
            'Title and description required for assignment test',
            400
          )
        }
        result = await assignTicketByAI(testData.title, testData.description)
        break

      case 'answer':
        if (!testData?.question) {
          throw new ApiError('Question required for answer test', 400)
        }
        result = await getAIAnswer(testData.question)
        break

      case 'patterns':
        result = await detectPatterns()
        break

      default:
        throw new ApiError(
          'Invalid test type. Use: assignment, answer, or patterns',
          400
        )
    }

    res.json({
      success: true,
      message: `AI test (${testType}) completed successfully`,
      data: {
        testType,
        testData,
        result,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}
