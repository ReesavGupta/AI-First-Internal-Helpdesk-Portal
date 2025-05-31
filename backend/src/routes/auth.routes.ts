import { Router } from 'express'
import {
  register,
  login,
  getMe,
  updateProfile,
  logout,
} from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth'
import {
  validateBody,
  userRegistrationSchema,
  userLoginSchema,
  updateUserSchema,
} from '../schemas'

const router = Router()

// Public routes
router.post('/register', validateBody(userRegistrationSchema), register)
router.post('/login', validateBody(userLoginSchema), login)

// Protected routes
router.use(authenticate) // All routes below require authentication

router.get('/me', getMe)
router.put('/profile', validateBody(updateUserSchema), updateProfile)
router.post('/logout', logout)

export default router
