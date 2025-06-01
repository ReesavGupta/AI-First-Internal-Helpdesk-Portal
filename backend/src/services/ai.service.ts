// src/services/aiService.ts
import OpenAI from 'openai'
import { prisma } from '../../prisma/client'
import { ApiError } from '../utils/ErrorHandler'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Types for AI responses
interface AIResponseSuggestion {
  content: string
  confidence: number
  source: 'similar_tickets' | 'faq' | 'general_knowledge'
  sourceId?: string
}

interface TicketClassification {
  departmentId: string
  confidence: number
  reasoning: string
}

interface PatternInsight {
  type: 'repetitive_user' | 'common_tags' | 'volume_spike'
  description: string
  severity: 'low' | 'medium' | 'high'
  data: any
  detectedAt: Date
}

// AI Ticket Routing Service
export const assignTicketByAI = async (
  title: string,
  description: string
): Promise<string> => {
  try {
    // Get all departments with their keywords
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        keywords: true,
      },
    })

    if (departments.length === 0) {
      throw new ApiError('No departments available for assignment', 500)
    }

    // Create department mapping for AI analysis
    const departmentInfo = departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      keywords: dept.keywords.join(', '),
    }))

    const prompt = `
Analyze the following ticket and determine which department should handle it:

Ticket Title: ${title}
Ticket Description: ${description}

Available Departments:
${departmentInfo
  .map((d) => `- ${d.name} (ID: ${d.id}): Keywords: ${d.keywords}`)
  .join('\n')}

Instructions:
1. Analyze the ticket content against department keywords
2. Consider the nature of the issue described
3. Return ONLY the department ID that best matches
4. If uncertain, return the ID of the department with the broadest scope

Return only the department ID, no additional text.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 50,
    })

    const assignedDepartmentId = completion.choices[0]?.message?.content?.trim()

    // Validate the returned department ID
    const validDepartment = departments.find(
      (d) => d.id === assignedDepartmentId
    )

    if (!validDepartment) {
      // Fallback to first department or admin department
      const fallbackDept =
        departments.find(
          (d) =>
            d.name.toLowerCase().includes('admin') ||
            d.name.toLowerCase().includes('general')
        ) || departments[0]

      console.warn(
        `AI returned invalid department ID: ${assignedDepartmentId}. Using fallback: ${fallbackDept.id}`
      )
      return fallbackDept.id
    }

    return assignedDepartmentId!
  } catch (error) {
    console.error('AI ticket assignment failed:', error)

    // Fallback: assign to admin or first available department
    const fallbackDept = await prisma.department.findFirst({
      where: {
        OR: [
          { name: { contains: 'Admin', mode: 'insensitive' } },
          { name: { contains: 'General', mode: 'insensitive' } },
        ],
      },
    })

    if (fallbackDept) {
      return fallbackDept.id
    }

    // Last resort: get any department
    const anyDepartment = await prisma.department.findFirst()
    if (!anyDepartment) {
      throw new ApiError('No departments available for ticket assignment', 500)
    }

    return anyDepartment.id
  }
}

// AI Response Suggestion Service
export const generateResponseSuggestions = async (
  ticketId: string
): Promise<AIResponseSuggestion[]> => {
  try {
    // Get ticket details with responses
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        responses: {
          include: {
            user: {
              select: { name: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        department: {
          select: { name: true, keywords: true },
        },
        createdBy: {
          select: { name: true, role: true },
        },
      },
    })

    if (!ticket) {
      throw new ApiError('Ticket not found', 404)
    }

    // Get similar resolved tickets
    const similarTickets = await findSimilarTickets(
      ticket.title,
      ticket.description
    )

    // Get relevant FAQs
    const relevantFAQs = await findRelevantFAQs(
      ticket.title,
      ticket.description
    )

    const suggestions: AIResponseSuggestion[] = []

    // Generate suggestion from similar tickets
    if (similarTickets.length > 0) {
      const similarTicketSuggestion = await generateFromSimilarTickets(
        ticket,
        similarTickets
      )
      if (similarTicketSuggestion) {
        suggestions.push(similarTicketSuggestion)
      }
    }

    // Generate suggestion from FAQs
    if (relevantFAQs.length > 0) {
      const faqSuggestion = await generateFromFAQs(ticket, relevantFAQs)
      if (faqSuggestion) {
        suggestions.push(faqSuggestion)
      }
    }

    // Generate general AI suggestion
    const generalSuggestion = await generateGeneralSuggestion(ticket)
    if (generalSuggestion) {
      suggestions.push(generalSuggestion)
    }

    // Sort by confidence and return top 3
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
  } catch (error) {
    console.error('AI response suggestion failed:', error)
    throw new ApiError('Failed to generate response suggestions', 500)
  }
}

// Pattern Detection Service
export const detectPatterns = async (): Promise<PatternInsight[]> => {
  const insights: PatternInsight[] = []

  try {
    // Detect repetitive users (users creating many tickets)
    const repetitiveUsersGroup = await prisma.ticket.groupBy({
      by: ['createdById'],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      _count: {
        createdById: true,
      },
      having: {
        createdById: {
          _count: {
            gt: 10,
          },
        },
      },
    })

    const repetitiveUserIds = repetitiveUsersGroup.map((g) => g.createdById)

    let repetitiveUsers: any[] = []
    if (repetitiveUserIds.length > 0) {
      repetitiveUsers = await prisma.user.findMany({
        where: {
          id: { in: repetitiveUserIds },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })

      // Attach ticketCount to each user
      repetitiveUsers = repetitiveUsers.map((user) => {
        const group = repetitiveUsersGroup.find(
          (g) => g.createdById === user.id
        )
        return {
          ...user,
          ticketCount: group ? group._count.createdById : 0,
        }
      })

      insights.push({
        type: 'repetitive_user',
        description: `${repetitiveUsers.length} users have created more than 10 tickets in the last 30 days`,
        severity: repetitiveUsers.length > 5 ? 'high' : 'medium',
        data: repetitiveUsers,
        detectedAt: new Date(),
      })
    }

    // Detect common tags
    const recentTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      select: { tags: true },
    })

    const tagCounts = new Map<string, number>()
    recentTickets.forEach((ticket) => {
      ticket.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })

    const popularTags = Array.from(tagCounts.entries())
      .filter(([, count]) => count >= 5)
      .sort((a, b) => b[1] - a[1])

    if (popularTags.length > 0) {
      insights.push({
        type: 'common_tags',
        description: `Popular tags in the last 7 days: ${popularTags
          .slice(0, 5)
          .map(([tag, count]) => `${tag} (${count})`)
          .join(', ')}`,
        severity: 'low',
        data: popularTags,
        detectedAt: new Date(),
      })
    }

    // Detect volume spikes
    const dailyTicketCounts = (await prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM tickets
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `) as Array<{ date: Date; count: bigint }>

    const avgDailyTickets =
      dailyTicketCounts.reduce((sum, day) => sum + Number(day.count), 0) /
      dailyTicketCounts.length
    const recentSpikes = dailyTicketCounts.filter(
      (day) => Number(day.count) > avgDailyTickets * 1.5
    )

    if (recentSpikes.length > 0) {
      insights.push({
        type: 'volume_spike',
        description: `${recentSpikes.length} days with ticket volume >50% above average in the last 30 days`,
        severity: recentSpikes.length > 3 ? 'high' : 'medium',
        data: {
          averageDailyTickets: Math.round(avgDailyTickets),
          spikeDays: recentSpikes.map((day) => ({
            date: day.date,
            count: Number(day.count),
          })),
        },
        detectedAt: new Date(),
      })
    }

    return insights
  } catch (error) {
    console.error('Pattern detection failed:', error)
    return []
  }
}

// Helper functions
async function findSimilarTickets(title: string, description: string) {
  // Simple keyword-based similarity for now
  const keywords = [
    ...title.toLowerCase().split(' '),
    ...description.toLowerCase().split(' '),
  ]
    .filter((word) => word.length > 3)
    .slice(0, 10)

  return await prisma.ticket.findMany({
    where: {
      status: { in: ['RESOLVED', 'CLOSED'] },
      OR: [
        { title: { contains: keywords[0], mode: 'insensitive' } },
        { description: { contains: keywords[0], mode: 'insensitive' } },
        { tags: { hasSome: keywords } },
      ],
    },
    include: {
      responses: {
        where: {
          user: {
            role: { in: ['AGENT', 'ADMIN'] },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    take: 3,
  })
}

async function findRelevantFAQs(title: string, description: string) {
  const keywords = [
    ...title.toLowerCase().split(' '),
    ...description.toLowerCase().split(' '),
  ].filter((word) => word.length > 3)

  return await prisma.fAQ.findMany({
    where: {
      OR: [
        { question: { contains: keywords[0], mode: 'insensitive' } },
        { answer: { contains: keywords[0], mode: 'insensitive' } },
        { tags: { hasSome: keywords } },
      ],
    },
    take: 3,
  })
}

async function generateFromSimilarTickets(
  ticket: any,
  similarTickets: any[]
): Promise<AIResponseSuggestion | null> {
  try {
    const similarContext = similarTickets
      .map(
        (t) =>
          `Title: ${t.title}\nIssue: ${t.description}\nResolution: ${
            t.responses[0]?.content || 'No resolution recorded'
          }`
      )
      .join('\n\n---\n\n')

    const prompt = `
Based on similar resolved tickets, suggest a response for this new ticket:

New Ticket:
Title: ${ticket.title}
Description: ${ticket.description}

Similar Resolved Tickets:
${similarContext}

Generate a helpful response that addresses the current issue based on the similar cases. Keep it professional and concise.

Response:`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 400,
    })

    const content = completion.choices[0]?.message?.content?.trim()
    if (!content) return null

    return {
      content,
      confidence: 0.85,
      source: 'similar_tickets',
      sourceId: similarTickets[0]?.id,
    }
  } catch (error) {
    console.error('Failed to generate suggestion from similar tickets:', error)
    return null
  }
}

async function generateFromFAQs(
  ticket: any,
  faqs: any[]
): Promise<AIResponseSuggestion | null> {
  try {
    const faqContext = faqs
      .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
      .join('\n\n')

    const prompt = `
Based on relevant FAQ entries, suggest a response for this ticket:

Ticket:
Title: ${ticket.title}
Description: ${ticket.description}

Relevant FAQs:
${faqContext}

Create a response that incorporates relevant FAQ information to help resolve the ticket. Be professional and helpful.

Response:`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 400,
    })

    const content = completion.choices[0]?.message?.content?.trim()
    if (!content) return null

    return {
      content,
      confidence: 0.8,
      source: 'faq',
      sourceId: faqs[0]?.id,
    }
  } catch (error) {
    console.error('Failed to generate suggestion from FAQs:', error)
    return null
  }
}

async function generateGeneralSuggestion(
  ticket: any
): Promise<AIResponseSuggestion | null> {
  try {
    const conversationHistory =
      ticket.responses
        ?.map((r: any) => `${r.user.name} (${r.user.role}): ${r.content}`)
        .join('\n') || 'No previous responses'

    const prompt = `
Suggest a professional response for this support ticket:

Ticket Information:
Title: ${ticket.title}
Description: ${ticket.description}
Department: ${ticket.department.name}
Priority: ${ticket.priority}
Status: ${ticket.status}

Previous Conversation:
${conversationHistory}

Provide a helpful, professional response that:
1. Acknowledges the issue
2. Provides potential solutions or next steps
3. Is appropriate for the ticket's context
4. Maintains a helpful tone

Response:`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 400,
    })

    const content = completion.choices[0]?.message?.content?.trim()
    if (!content) return null

    return {
      content,
      confidence: 0.7,
      source: 'general_knowledge',
    }
  } catch (error) {
    console.error('Failed to generate general AI suggestion:', error)
    return null
  }
}

export const getAIAnswer = async (
  question: string
): Promise<{
  answer: string
  confidence: number
  sources: string[]
  suggestTicket: boolean
}> => {
  try {
    // Search both FAQs and Documents in parallel
    const [faqs, documents] = await Promise.all([
      searchFAQs(question),
      searchDocuments(question),
    ])

    let answer = ''
    let confidence = 0
    let sources: string[] = []
    let suggestTicket = false

    if (faqs.length > 0 || documents.length > 0) {
      // Combine FAQ and document context
      const faqContext = faqs
        .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
        .join('\n\n')

      const docContext = documents
        .map(
          (doc) =>
            `Document: ${doc.title}\nContent: ${doc.content.substring(
              0,
              500
            )}...`
        )
        .join('\n\n---\n\n')

      const combinedContext = [faqContext, docContext]
        .filter(Boolean)
        .join('\n\n===DOCUMENT SEPARATOR===\n\n')

      const prompt = `
Based on the following company FAQs and internal documents, answer the user's question:

User Question: ${question}

Available Information:
${combinedContext}

Instructions:
1. Provide a clear, helpful answer using the available information
2. If the information directly answers the question, provide a complete response
3. If the information is related but incomplete, provide what you can and suggest creating a ticket for more specific help
4. If no relevant information is found, politely say so and suggest creating a support ticket
5. Be professional and concise
6. Reference which source(s) you used (FAQ vs Company Document)

Answer:`

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      })

      answer = completion.choices[0]?.message?.content?.trim() || ''

      // Calculate confidence based on available sources
      if (faqs.length > 0 && documents.length > 0) {
        confidence = 0.9 // High confidence with both sources
      } else if (faqs.length > 0 || documents.length > 0) {
        confidence = 0.8 // Good confidence with one source
      } else {
        confidence = 0.6 // Lower confidence
      }

      // Build sources array
      sources = [
        ...faqs.map((faq) => `FAQ: ${faq.question}`),
        ...documents.map((doc) => `Document: ${doc.title}`),
      ]
    } else {
      // Fallback to general AI knowledge
      const prompt = `
Answer the following question in a helpful and professional manner for an internal company helpdesk context:

Question: ${question}

Instructions:
1. Provide a helpful general answer if possible
2. If the question is company-specific, suggest creating a support ticket
3. Keep the answer professional and concise
4. Be honest about limitations

Answer:`

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 300,
      })

      answer = completion.choices[0]?.message?.content?.trim() || ''
      confidence = 0.5
      sources = ['AI General Knowledge']
      suggestTicket = true
    }

    // Determine if we should suggest creating a ticket
    if (
      confidence < 0.7 ||
      answer.toLowerCase().includes('create a ticket') ||
      answer.toLowerCase().includes('contact support') ||
      answer.toLowerCase().includes('not enough information')
    ) {
      suggestTicket = true
    }

    return {
      answer,
      confidence,
      sources,
      suggestTicket,
    }
  } catch (error) {
    console.error('AI answer bot failed:', error)
    return {
      answer:
        "I apologize, but I'm having trouble processing your question right now. Please try creating a support ticket for assistance.",
      confidence: 0,
      sources: [],
      suggestTicket: true,
    }
  }
}

// Helper function to search FAQs
async function searchFAQs(question: string) {
  const keywords = question
    .toLowerCase()
    .split(' ')
    .filter((word) => word.length > 2)

  return await prisma.fAQ.findMany({
    where: {
      visibility: 'PUBLIC', // or adjust based on user permissions
      OR: [
        { question: { contains: question, mode: 'insensitive' } },
        { answer: { contains: question, mode: 'insensitive' } },
        { tags: { hasSome: keywords } },
      ],
    },
    take: 3,
  })
}

// Helper function to search documents
async function searchDocuments(question: string) {
  const keywords = question
    .toLowerCase()
    .split(' ')
    .filter((word) => word.length > 2)

  return await prisma.document.findMany({
    where: {
      isActive: true,
      OR: [
        { title: { contains: question, mode: 'insensitive' } },
        { content: { contains: question, mode: 'insensitive' } },
        { tags: { hasSome: keywords } },
      ],
    },
    select: {
      id: true,
      title: true,
      content: true,
      category: true,
      tags: true,
    },
    take: 3,
  })
}

// Export types for use in controllers
export type { AIResponseSuggestion, TicketClassification, PatternInsight }
