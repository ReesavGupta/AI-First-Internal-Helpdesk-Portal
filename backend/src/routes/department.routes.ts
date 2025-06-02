import express from 'express'
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentAgents,
  getDepartmentTickets,
  getDepartmentStats,
} from '../controllers/department.controller'
import { authenticate, requireAdmin, requireAgent } from '../middlewares/auth'
import {
  validateBody,
  validateParams,
  validateQuery,
  createDepartmentSchema,
  updateDepartmentSchema,
  idParamSchema,
  paginationSchema,
} from '../schemas'

const router = express.Router()

// Create a new department (admins only)
router.post(
  '/',
  authenticate,
  requireAdmin,
  validateBody(createDepartmentSchema),
  createDepartment
)

// Get all departments
router.get('/', getDepartments)

// Get specific department by ID
router.get(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  getDepartmentById
)

// Update department (admins only)
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validateParams(idParamSchema),
  validateBody(updateDepartmentSchema),
  updateDepartment
)

// Delete department (admins only)
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validateParams(idParamSchema),
  deleteDepartment
)

// Get department agents
router.get(
  '/:id/agents',
  authenticate,
  requireAgent,
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  getDepartmentAgents
)

// Get department tickets
router.get(
  '/:id/tickets',
  authenticate,
  requireAgent,
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  getDepartmentTickets
)

// Get department statistics
router.get(
  '/:id/stats',
  authenticate,
  requireAgent,
  validateParams(idParamSchema),
  getDepartmentStats
)

export default router
