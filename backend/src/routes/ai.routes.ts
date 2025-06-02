// src/routes/ai.routes.ts
import { Router } from 'express'
import {
  autoAssignTicket,
  getResponseSuggestions,
  getPatternInsights,
  askAI,
  getAIStatus,
  batchProcessTickets,
  testAI,
  getAIInsights,
} from '../controllers/ai.controller'
import {
  authenticate,
  requireAdmin,
  requireAgent,
  requireEmployee,
  checkAIRateLimit,
} from '../middlewares/auth'

const router = Router()

// All AI routes require authentication
router.use(authenticate)

// Public AI endpoints (for all authenticated users)

/**
 * @route   POST /api/ai/ask
 * @desc    Ask AI a question (chatbot functionality)
 * @access  Private (All authenticated users)
 * @body    { question: string }
 */
router.post('/ask', checkAIRateLimit, requireEmployee, askAI)

/**
 * @route   GET /api/ai/status
 * @desc    Get AI service status and statistics
 * @access  Private (All authenticated users)
 */
router.get('/status', requireEmployee, getAIStatus)

// Agent and Admin endpoints

/**
 * @route   POST /api/ai/assign-ticket
 * @desc    Auto-assign ticket to department using AI
 * @access  Private (Agent, Admin)
 * @body    { title: string, description: string }
 */
router.post('/assign-ticket', checkAIRateLimit, requireAgent, autoAssignTicket)

/**
 * @route   GET /api/ai/suggestions/:ticketId
 * @desc    Get AI-powered response suggestions for a ticket
 * @access  Private (Agent, Admin, or ticket owner)
 * @params  ticketId: string
 */
router.get(
  '/suggestions/:ticketId',
  checkAIRateLimit,
  requireEmployee,
  getResponseSuggestions
)

// Admin-only endpoints

/**
 * @route   GET /api/ai/insights
 * @desc    Get AI pattern insights and analytics
 * @access  Private (Admin only)
 */
router.get('/insights', checkAIRateLimit, requireAdmin, getAIInsights)

/**
 * @route   POST /api/ai/batch-process
 * @desc    Batch process tickets for AI assignment or suggestions
 * @access  Private (Admin only)
 * @body    { ticketIds: string[], action: 'reassign' | 'suggest_responses' }
 */
router.post(
  '/batch-process',
  checkAIRateLimit,
  requireAdmin,
  batchProcessTickets
)

/**
 * @route   POST /api/ai/test
 * @desc    Test AI functionality (Development only)
 * @access  Private (Admin only, Development only)
 * @body    { testType: string, testData: any }
 */
router.post('/test', requireAdmin, testAI)

export default router
