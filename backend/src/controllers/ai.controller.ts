// src/controllers/ai.controller.ts
import { Request, Response, NextFunction } from 'express'
import { ApiError, asyncHandler, ApiResponse } from '../utils/ErrorHandler'
import {
  assignTicketByAI,
  generateResponseSuggestions,
  detectPatterns,
  getAIAnswer,
  type AIResponseSuggestion,
  type PatternInsight,
  generateComprehensiveInsightsReport,
} from '../services/ai.service'
import { prisma } from '../../prisma/client'
import { TicketStatus } from '../../prisma/generated/prisma'

// Helper to calculate start date based on timeRange (e.g., '7d', '30d')
const calculateStartDate = (timeRange: string): Date => {
  const now = new Date()
  let daysToSubtract = 0
  if (timeRange.endsWith('d')) {
    daysToSubtract = parseInt(timeRange.replace('d', ''), 10)
  } else if (timeRange.endsWith('h')) {
    const hours = parseInt(timeRange.replace('h', ''), 10)
    daysToSubtract = Math.ceil(hours / 24)
  } else {
    daysToSubtract = 7 // Default
  }
  if (isNaN(daysToSubtract) || daysToSubtract <= 0) daysToSubtract = 7
  now.setDate(now.getDate() - daysToSubtract)
  return now
}

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

    const aiAssignmentResult = await assignTicketByAI(title, description)
    const departmentId = aiAssignmentResult.departmentId

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
        assignedByAI: aiAssignmentResult.assignedByAI,
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
            assignedByAI: true,
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
          if (!ticket.title || !ticket.description) {
            results.push({
              ticketId,
              success: false,
              error:
                'Ticket title and description are required for AI reassignment',
            })
            continue
          }
          const aiAssignmentResult = await assignTicketByAI(
            ticket.title,
            ticket.description
          )
          const newDepartmentId = aiAssignmentResult.departmentId

          if (newDepartmentId !== ticket.departmentId) {
            await prisma.ticket.update({
              where: { id: ticketId },
              data: {
                departmentId: newDepartmentId,
                assignedByAI: aiAssignmentResult.assignedByAI, // Also update assignedByAI flag
              },
            })
            results.push({
              ticketId,
              success: true,
              message: `Reassigned to department ID: ${newDepartmentId}`,
              newDepartmentId,
              assignedByAI: aiAssignmentResult.assignedByAI,
            })
          } else {
            results.push({
              ticketId,
              success: true,
              message: 'Ticket already in correct department according to AI',
              originalDepartmentId: ticket.departmentId,
              assignedByAI: ticket.assignedByAI, // Keep original assignedByAI status if not changed
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

export const getAIInsights = asyncHandler(
  async (req: Request, res: Response) => {
    const timeRange = (req.query.timeRange as string) || '7d'
    const startDate = calculateStartDate(timeRange)

    const ticketsInTimeRange = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
        // Add any other relevant filters if needed
      },
      select: {
        id: true,
        title: true,
        description: true, // Consider if full description is needed or if a summary would be better for token limits
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        departmentId: true,
        tags: true,
        assignedByAI: true, // Ensure this new field is selected
        // createdById: true, // If needed for further analysis by AI
        // assignedToId: true, // If needed
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 300, // Reduced from 500 to 300
    })

    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        // keywords: true, // Might be too verbose for the insights prompt
      },
    })

    if (ticketsInTimeRange.length === 0) {
      console.log(`No tickets found in time range: ${timeRange}`)
      // Return a structured response indicating no data, but not an error
      return res.json(
        ApiResponse.success(
          'Successfully retrieved AI insights (no tickets in period)',
          {
            summary: {
              totalTickets: 0,
              autoAssigned: 0,
              accurateAssignments: 0,
              avgResolutionTime: 'N/A',
              satisfactionScore: 'N/A',
            },
            patterns: [],
            departments: departments.map((d) => ({
              name: d.name,
              accuracy: 0,
              volume: 0,
            })),
            recommendations: [
              {
                id: 'no_data_reco',
                title: 'No Ticket Data',
                description:
                  'There were no tickets in the selected time period to analyze.',
                priority: 'Low',
                estimatedImpact: 'N/A',
              },
            ],
          }
        )
      )
    }

    console.log(
      `Generating AI insights for ${ticketsInTimeRange.length} tickets, time range: ${timeRange}`
    )
    const insights = await generateComprehensiveInsightsReport(
      ticketsInTimeRange,
      departments,
      timeRange
    )

    // Check if the insights generation itself returned an error structure
    if (insights.error) {
      console.error(
        'AI service returned an error during insights generation:',
        insights.message
      )
      // Send back the fallback insights provided by the service
      return res
        .status(500) // Or a different status code if appropriate
        .json(
          ApiResponse.error(
            `AI insights generation failed: ${insights.message}`,
            insights.fallbackInsights || {
              summary: {
                totalTickets: ticketsInTimeRange.length,
                autoAssigned: 0,
                accurateAssignments: 0,
                avgResolutionTime: 'N/A',
                satisfactionScore: 'N/A',
              },
              patterns: [],
              departments: [],
              recommendations: [],
            }
          )
        )
    }

    console.log(
      `Successfully generated AI insights for time range: ${timeRange}`
    )
    res.json(
      ApiResponse.success(
        'AI insights generated successfully by AI service',
        insights
      )
    )
  }
)
