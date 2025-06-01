// src/controllers/faq.controller.ts
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../prisma/client'
import { ApiError } from '../utils/ErrorHandler'
import { FAQVisibility } from '../../prisma/generated/prisma'

// Create FAQ
export const createFAQ = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { question, answer, tags, visibility } = req.body

    const faq = await prisma.fAQ.create({
      data: {
        question,
        answer,
        tags: tags || [],
        visibility: visibility || FAQVisibility.PUBLIC,
      },
    })

    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: faq,
    })
  } catch (error) {
    next(error)
  }
}

// Get all FAQs (filtered by user role)
export const getFAQs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 20, visibility, tags, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    // Build where clause based on user role and filters
    let whereClause: any = {}

    // Role-based filtering
    if (req.user?.role === 'EMPLOYEE') {
      whereClause.visibility = FAQVisibility.PUBLIC
    } else if (req.user?.role === 'AGENT') {
      // Agents can see both public and internal
      whereClause.visibility = {
        in: [FAQVisibility.PUBLIC, FAQVisibility.INTERNAL],
      }
    }
    // Admins can see all (no visibility filter)

    // Additional filters
    if (visibility) {
      whereClause.visibility = visibility
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags]
      whereClause.tags = { hasSome: tagArray }
    }

    if (search) {
      whereClause.OR = [
        { question: { contains: search as string, mode: 'insensitive' } },
        { answer: { contains: search as string, mode: 'insensitive' } },
        { tags: { hasSome: (search as string).toLowerCase().split(' ') } },
      ]
    }

    const [faqs, total] = await Promise.all([
      prisma.fAQ.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.fAQ.count({ where: whereClause }),
    ])

    res.json({
      success: true,
      data: faqs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get public FAQs (no auth required)
export const getPublicFAQs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 20, tags, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    let whereClause: any = {
      visibility: FAQVisibility.PUBLIC,
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags]
      whereClause.tags = { hasSome: tagArray }
    }

    if (search) {
      whereClause.OR = [
        { question: { contains: search as string, mode: 'insensitive' } },
        { answer: { contains: search as string, mode: 'insensitive' } },
        { tags: { hasSome: (search as string).toLowerCase().split(' ') } },
      ]
    }

    const [faqs, total] = await Promise.all([
      prisma.fAQ.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true,
          question: true,
          answer: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.fAQ.count({ where: whereClause }),
    ])

    res.json({
      success: true,
      data: faqs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get FAQ by ID
export const getFAQById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const faq = await prisma.fAQ.findUnique({
      where: { id },
    })

    if (!faq) {
      throw new ApiError('FAQ not found', 404)
    }

    // Check visibility permissions
    if (
      faq.visibility === FAQVisibility.INTERNAL &&
      req.user?.role === 'EMPLOYEE'
    ) {
      throw new ApiError('You do not have permission to view this FAQ', 403)
    }

    res.json({
      success: true,
      data: faq,
    })
  } catch (error) {
    next(error)
  }
}

// Update FAQ
export const updateFAQ = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const { question, answer, tags, visibility } = req.body

    const existingFAQ = await prisma.fAQ.findUnique({
      where: { id },
    })

    if (!existingFAQ) {
      throw new ApiError('FAQ not found', 404)
    }

    const updatedFAQ = await prisma.fAQ.update({
      where: { id },
      data: {
        question: question || existingFAQ.question,
        answer: answer || existingFAQ.answer,
        tags: tags !== undefined ? tags : existingFAQ.tags,
        visibility: visibility || existingFAQ.visibility,
      },
    })

    res.json({
      success: true,
      message: 'FAQ updated successfully',
      data: updatedFAQ,
    })
  } catch (error) {
    next(error)
  }
}

// Delete FAQ
export const deleteFAQ = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const faq = await prisma.fAQ.findUnique({
      where: { id },
    })

    if (!faq) {
      throw new ApiError('FAQ not found', 404)
    }

    await prisma.fAQ.delete({
      where: { id },
    })

    res.json({
      success: true,
      message: 'FAQ deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

// Search FAQs (enhanced with AI similarity)
export const searchFAQs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { q, limit = 10 } = req.query

    if (!q || typeof q !== 'string') {
      throw new ApiError('Search query is required', 400)
    }

    // Build visibility filter based on user role
    let visibilityFilter: any = {}
    if (!req.user) {
      // Public search - only public FAQs
      visibilityFilter.visibility = FAQVisibility.PUBLIC
    } else if (req.user.role === 'EMPLOYEE') {
      visibilityFilter.visibility = FAQVisibility.PUBLIC
    } else {
      // Agents and admins can see all
      visibilityFilter.visibility = {
        in: [FAQVisibility.PUBLIC, FAQVisibility.INTERNAL],
      }
    }

    // Simple keyword-based search for now
    const keywords = q
      .toLowerCase()
      .split(' ')
      .filter((word) => word.length > 2)

    const faqs = await prisma.fAQ.findMany({
      where: {
        ...visibilityFilter,
        OR: [
          { question: { contains: q, mode: 'insensitive' } },
          { answer: { contains: q, mode: 'insensitive' } },
          { tags: { hasSome: keywords } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    })

    res.json({
      success: true,
      data: faqs,
      query: q,
      resultsCount: faqs.length,
    })
  } catch (error) {
    next(error)
  }
}

// Bulk import FAQs
export const bulkImportFAQs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { faqs } = req.body

    if (!Array.isArray(faqs) || faqs.length === 0) {
      throw new ApiError('FAQs array is required', 400)
    }

    // Validate each FAQ
    const validatedFAQs = faqs.map((faq, index) => {
      if (!faq.question || !faq.answer) {
        throw new ApiError(
          `FAQ at index ${index} is missing question or answer`,
          400
        )
      }
      return {
        question: faq.question,
        answer: faq.answer,
        tags: faq.tags || [],
        visibility: faq.visibility || FAQVisibility.PUBLIC,
      }
    })

    // Create FAQs in bulk
    const createdFAQs = await prisma.fAQ.createMany({
      data: validatedFAQs,
      skipDuplicates: true,
    })

    res.status(201).json({
      success: true,
      message: `${createdFAQs.count} FAQs imported successfully`,
      data: { importedCount: createdFAQs.count },
    })
  } catch (error) {
    next(error)
  }
}
