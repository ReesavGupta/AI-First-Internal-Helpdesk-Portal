import { Router } from 'express'
import multer from 'multer'
import { authenticate, requireRole } from '../middlewares/auth'
import { UserRole } from '@prisma/client'
import {
  handleDocumentUpload,
  handleRagQuery,
} from '../controllers/rag.controller'

const router = Router()

// Configure multer for file uploads (temporary storage)
// We might want to store files in memory or a specific disk location
// For now, let's configure it for disk storage in a temporary directory.
// Make sure 'uploads/rag-documents/' directory exists or multer will throw an error.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // TODO: Ensure this directory exists and is gitignored
    cb(null, 'uploads/rag-documents/')
  },
  filename: function (req, file, cb) {
    // Keep original filename + add a timestamp to avoid conflicts
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB file size limit
})

// POST /api/rag/documents/upload
router.post(
  '/documents/upload',
  authenticate,
  requireRole([UserRole.ADMIN]),
  upload.single('document'), // 'document' is the field name in the form-data
  handleDocumentUpload
)

// Route for querying RAG (Authenticated users)
router.post('/query', authenticate, handleRagQuery)

export default router
