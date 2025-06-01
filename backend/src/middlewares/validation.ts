// src/middleware/validation.ts (add these to your existing validation file)
import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ErrorHandler'

// FAQ validation
export const validateFAQ = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { question, answer, tags, visibility } = req.body

  // Required fields
  if (
    !question ||
    typeof question !== 'string' ||
    question.trim().length === 0
  ) {
    return next(
      new ApiError('Question is required and must be a non-empty string', 400)
    )
  }

  if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
    return next(
      new ApiError('Answer is required and must be a non-empty string', 400)
    )
  }

  // Validate question length
  if (question.length > 500) {
    return next(new ApiError('Question must be less than 500 characters', 400))
  }

  // Validate answer length
  if (answer.length > 5000) {
    return next(new ApiError('Answer must be less than 5000 characters', 400))
  }

  // Validate tags if provided
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      return next(new ApiError('Tags must be an array', 400))
    }

    if (tags.length > 20) {
      return next(new ApiError('Maximum 20 tags allowed', 400))
    }

    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        return next(new ApiError('All tags must be non-empty strings', 400))
      }
      if (tag.length > 50) {
        return next(
          new ApiError('Each tag must be less than 50 characters', 400)
        )
      }
    }

    // Clean and normalize tags
    req.body.tags = tags.map((tag: string) => tag.trim().toLowerCase())
  }

  // Validate visibility if provided
  if (visibility !== undefined) {
    if (!['PUBLIC', 'INTERNAL'].includes(visibility)) {
      return next(
        new ApiError('Visibility must be either PUBLIC or INTERNAL', 400)
      )
    }
  }

  // Clean the data
  req.body.question = question.trim()
  req.body.answer = answer.trim()

  next()
}

// FAQ update validation (allows partial updates)
export const validateFAQUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { question, answer, tags, visibility } = req.body

  // Check if at least one field is provided
  if (!question && !answer && tags === undefined && !visibility) {
    return next(
      new ApiError('At least one field must be provided for update', 400)
    )
  }

  // Validate question if provided
  if (question !== undefined) {
    if (typeof question !== 'string' || question.trim().length === 0) {
      return next(new ApiError('Question must be a non-empty string', 400))
    }
    if (question.length > 500) {
      return next(
        new ApiError('Question must be less than 500 characters', 400)
      )
    }
    req.body.question = question.trim()
  }

  // Validate answer if provided
  if (answer !== undefined) {
    if (typeof answer !== 'string' || answer.trim().length === 0) {
      return next(new ApiError('Answer must be a non-empty string', 400))
    }
    if (answer.length > 5000) {
      return next(new ApiError('Answer must be less than 5000 characters', 400))
    }
    req.body.answer = answer.trim()
  }

  // Validate tags if provided
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      return next(new ApiError('Tags must be an array', 400))
    }

    if (tags.length > 20) {
      return next(new ApiError('Maximum 20 tags allowed', 400))
    }

    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        return next(new ApiError('All tags must be non-empty strings', 400))
      }
      if (tag.length > 50) {
        return next(
          new ApiError('Each tag must be less than 50 characters', 400)
        )
      }
    }

    req.body.tags = tags.map((tag: string) => tag.trim().toLowerCase())
  }

  // Validate visibility if provided
  if (visibility !== undefined) {
    if (!['PUBLIC', 'INTERNAL'].includes(visibility)) {
      return next(
        new ApiError('Visibility must be either PUBLIC or INTERNAL', 400)
      )
    }
  }

  next()
}
