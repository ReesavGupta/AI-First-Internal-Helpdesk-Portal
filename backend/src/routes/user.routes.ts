import { Router } from 'express'
import { getAllAgents } from '../controllers/user.controller'
import { authenticate, requireAdmin } from '../middlewares/auth'

const router = Router()

router.use(authenticate) // All user routes require authentication

// Get all agents (admins only)
router.get('/agents', requireAdmin, getAllAgents)

export default router
