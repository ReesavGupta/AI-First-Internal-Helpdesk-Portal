import express from 'express'
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  updateTicketStatus,
  deleteTicket,
  assignTicket,
  unassignTicket,
  getTicketResponses,
  createTicketResponse,
  deleteTicketResponse,
  getMyTickets,
  getAssignedTickets,
} from '../controllers/ticket.controller'
import {
  authenticate,
  requireEmployee,
  requireAgent,
  requireAdmin,
  checkTicketAccess,
} from '../middlewares/auth'
import {
  validateBody,
  validateQuery,
  validateParams,
  createTicketSchema,
  updateTicketSchema,
  updateTicketStatusSchema,
  createTicketResponseSchema,
  ticketFiltersSchema,
  idParamSchema,
} from '../schemas'

const router = express.Router()

// Create a new ticket (employees and above)
router.post(
  '/',
  authenticate,
  requireEmployee,
  validateBody(createTicketSchema),
  createTicket
)

// Get all tickets with filters (agents and admins)
router.get(
  '/',
  authenticate,
  requireAgent,
  validateQuery(ticketFiltersSchema),
  getTickets
)

// Get my created tickets (employees and above)
router.get(
  '/my-tickets',
  authenticate,
  requireEmployee,
  validateQuery(ticketFiltersSchema),
  getMyTickets
)

// Get tickets assigned to me (agents and above)
router.get(
  '/assigned',
  authenticate,
  requireAgent,
  validateQuery(ticketFiltersSchema),
  getAssignedTickets
)

// Get specific ticket by ID
router.get(
  '/:id',
  authenticate,
  requireEmployee,
  validateParams(idParamSchema),
  checkTicketAccess,
  getTicketById
)

// Update ticket (creator or assigned agent/admin)
router.put(
  '/:id',
  authenticate,
  requireEmployee,
  validateParams(idParamSchema),
  validateBody(updateTicketSchema),
  checkTicketAccess,
  updateTicket
)

// Update ticket status (agents and above)
router.patch(
  '/:id/status',
  authenticate,
  requireAgent,
  validateParams(idParamSchema),
  validateBody(updateTicketStatusSchema),
  checkTicketAccess,
  updateTicketStatus
)

// Assign ticket to agent (agents and admins)
router.patch(
  '/:id/assign/:agentId',
  authenticate,
  requireAgent,
  validateParams(idParamSchema),
  assignTicket
)

// Unassign ticket (agents and admins)
router.patch(
  '/:id/unassign',
  authenticate,
  requireAgent,
  validateParams(idParamSchema),
  unassignTicket
)

// Delete ticket (admins only)
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validateParams(idParamSchema),
  deleteTicket
)

// Get ticket responses
router.get(
  '/:id/responses',
  authenticate,
  requireEmployee,
  validateParams(idParamSchema),
  checkTicketAccess,
  getTicketResponses
)

// Create ticket response
router.post(
  '/:id/responses',
  authenticate,
  requireEmployee,
  validateParams(idParamSchema),
  validateBody(createTicketResponseSchema),
  checkTicketAccess,
  createTicketResponse
)

// Delete ticket response (admins only)
router.delete(
  '/:id/responses/:responseId',
  authenticate,
  requireAdmin,
  validateParams(idParamSchema),
  deleteTicketResponse
)

export default router
