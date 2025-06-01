// src/routes/faq.routes.ts
import express from 'express'
import {
  createFAQ,
  getFAQs,
  getFAQById,
  updateFAQ,
  deleteFAQ,
  searchFAQs,
  getPublicFAQs,
  bulkImportFAQs,
} from '../controllers/faq.controller'
import { authenticate, requireAgent, requireAdmin } from '../middlewares/auth'
import { validateFAQ, validateFAQUpdate } from '../middlewares/validation'

const router = express.Router()

// Public routes (no auth required)
router.get('/public', getPublicFAQs)
router.get('/search/public', searchFAQs) // Public search

// Protected routes
router.use(authenticate) // All routes below require authentication

// General user routes
router.get('/', getFAQs) // Get all FAQs (filtered by role)
router.get('/search', searchFAQs) // Internal search
router.get('/:id', getFAQById)

// Agent+ routes
router.use(requireAgent)
router.post('/', validateFAQ, createFAQ)
router.put('/:id', validateFAQUpdate, updateFAQ)

// Admin only routes
router.use(requireAdmin)
router.delete('/:id', deleteFAQ)
router.post('/bulk-import', bulkImportFAQs)

export default router
