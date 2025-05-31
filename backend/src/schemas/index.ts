// src/schemas/index.ts
import { z } from 'zod'

// User validation schemas
export const userRegistrationSchema = z
  .object({
    email: z.string().email('Invalid email format').toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    role: z.enum(['EMPLOYEE', 'AGENT', 'ADMIN']).default('EMPLOYEE'),
    departmentId: z.string().cuid().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
})

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
  departmentId: z.string().cuid().optional().nullable(),
})

// Department validation schemas
export const createDepartmentSchema = z.object({
  name: z
    .string()
    .min(2, 'Department name must be at least 2 characters')
    .max(100),
  keywords: z
    .array(z.string().min(1, 'Keyword cannot be empty'))
    .min(1, 'At least one keyword is required'),
})

export const updateDepartmentSchema = z.object({
  name: z
    .string()
    .min(2, 'Department name must be at least 2 characters')
    .max(100)
    .optional(),
  keywords: z
    .array(z.string().min(1, 'Keyword cannot be empty'))
    .min(1, 'At least one keyword is required')
    .optional(),
})

// Ticket validation schemas
export const createTicketSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(200),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  tags: z.array(z.string().min(1).max(50)).max(10).default([]),
  fileUrls: z.array(z.string().url()).max(5).default([]),
  departmentId: z.string().cuid().optional(), // Optional as it can be auto-assigned by AI
})

export const updateTicketSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(200)
    .optional(),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(5000)
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  fileUrls: z.array(z.string().url()).max(5).optional(),
  assignedToId: z.string().cuid().nullable().optional(),
})

export const updateTicketStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
})

// Ticket Response validation schemas
export const createTicketResponseSchema = z.object({
  content: z.string().min(1, 'Response content is required').max(5000),
  fileUrls: z.array(z.string().url()).max(5).default([]),
})

// FAQ validation schemas
export const createFAQSchema = z.object({
  question: z
    .string()
    .min(10, 'Question must be at least 10 characters')
    .max(500),
  answer: z.string().min(20, 'Answer must be at least 20 characters').max(5000),
  tags: z.array(z.string().min(1).max(50)).max(10).default([]),
  visibility: z.enum(['PUBLIC', 'INTERNAL']).default('PUBLIC'),
})

export const updateFAQSchema = z.object({
  question: z
    .string()
    .min(10, 'Question must be at least 10 characters')
    .max(500)
    .optional(),
  answer: z
    .string()
    .min(20, 'Answer must be at least 20 characters')
    .max(5000)
    .optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  visibility: z.enum(['PUBLIC', 'INTERNAL']).optional(),
})

// Notification validation schemas
export const markNotificationReadSchema = z.object({
  read: z.boolean(),
})

// AI service validation schemas
export const aiAskQuestionSchema = z.object({
  question: z
    .string()
    .min(5, 'Question must be at least 5 characters')
    .max(1000),
  context: z.string().max(2000).optional(),
})

// Search validation schemas
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200),
  type: z.enum(['tickets', 'faqs', 'users', 'all']).default('all'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
})

// Analytics validation schemas
export const analyticsDateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  departmentId: z.string().cuid().optional(),
  agentId: z.string().cuid().optional(),
})

// Query parameter validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
})

export const ticketFiltersSchema = z
  .object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    departmentId: z.string().cuid().optional(),
    assignedToId: z.string().cuid().optional(),
    createdById: z.string().cuid().optional(),
    tags: z.string().optional(), // Comma-separated string that will be split
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .merge(paginationSchema)

export const faqFiltersSchema = z
  .object({
    visibility: z.enum(['PUBLIC', 'INTERNAL']).optional(),
    tags: z.string().optional(), // Comma-separated string
  })
  .merge(paginationSchema)

// File upload validation
export const fileUploadSchema = z.object({
  files: z
    .array(
      z.object({
        url: z.string().url(),
        filename: z.string(),
        size: z.number().max(10 * 1024 * 1024), // 10MB max
        mimetype: z.string(),
      })
    )
    .max(5),
})

// ID parameter validation
export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
})

// Utility type extractors
export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>
export type UserLoginInput = z.infer<typeof userLoginSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>
export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>
export type CreateTicketResponseInput = z.infer<
  typeof createTicketResponseSchema
>
export type CreateFAQInput = z.infer<typeof createFAQSchema>
export type UpdateFAQInput = z.infer<typeof updateFAQSchema>
export type AiAskQuestionInput = z.infer<typeof aiAskQuestionSchema>
export type SearchInput = z.infer<typeof searchSchema>
export type TicketFiltersInput = z.infer<typeof ticketFiltersSchema>
export type FAQFiltersInput = z.infer<typeof faqFiltersSchema>
export type AnalyticsDateRangeInput = z.infer<typeof analyticsDateRangeSchema>

// Validation middleware generator
export const validateBody = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      next(error)
    }
  }
}

export const validateQuery = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      req.query = schema.parse(req.query)
      next()
    } catch (error) {
      next(error)
    }
  }
}

export const validateParams = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      req.params = schema.parse(req.params)
      next()
    } catch (error) {
      next(error)
    }
  }
}
