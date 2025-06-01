// // src/routes/search.routes.ts
// import express from 'express'
// import { authenticate, requireEmployee } from '../middlewares/auth'
// import { searchController } from '../controllers/search.controller'

// const router = express.Router()

// // All search routes require authentication
// router.use(authenticate)
// router.use(requireEmployee) // Employees, agents, and admins can search

// // Global search endpoint
// router.get('/', searchController.globalSearch)

// // Specific search endpoints (optional - for more targeted searches)
// router.get('/tickets', searchController.searchTickets)
// router.get('/faqs', searchController.searchFAQs)
// router.get('/users', searchController.searchUsers)
// router.get('/documents', searchController.searchDocuments)

// export default router
