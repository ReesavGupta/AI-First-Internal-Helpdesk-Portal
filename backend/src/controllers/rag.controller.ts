import { Request, Response, NextFunction } from 'express'
import { asyncHandler, ApiResponse, ApiError } from '../utils/ErrorHandler'
import { prisma } from '../../prisma/client'
import { UserRole } from '@prisma/client'
import {
  processDocument,
  getEmbedding,
  findSimilarChunks,
} from '../services/rag.service'
import { authenticate, requireRole } from '../middlewares/auth'

// Extend Express Request interface to include user and file (from multer)
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        email: string
        role: UserRole
        departmentId?: string
      }
      file?: Multer.File
    }
  }
}

export const handleDocumentUpload = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next(new ApiError('No file uploaded.', 400))
    }

    if (!req.user) {
      // This should ideally be caught by authenticate middleware, but as a safeguard:
      return next(new ApiError('User not authenticated', 401))
    }

    const { filename, path: originalPath, mimetype, size } = req.file
    const userId = req.user.userId

    let documentRecord
    try {
      documentRecord = await prisma.ragSourceDocument.create({
        data: {
          filename: filename,
          originalPath: originalPath, // Store path from multer
          mimetype: mimetype,
          size: size,
          status: 'PENDING', // Default status
          uploadedById: userId,
        },
      })

      // Trigger asynchronous processing - DO NOT await this call here
      processDocument(documentRecord.id)
        .then(() => {
          console.log(
            `Asynchronous processing for document ${documentRecord?.id} completed or handled.`
          )
        })
        .catch((error) => {
          console.error(
            `Asynchronous processing for document ${documentRecord?.id} failed:`,
            error
          )
          // Optionally, update the document status to FAILED here if not handled by processDocument
          // This catch is for unhandled promise rejections from processDocument itself
        })

      res
        .status(202) // 202 Accepted: Request accepted, processing will continue
        .json(
          ApiResponse.success(
            'Document upload accepted. Processing will continue in the background.',
            {
              documentId: documentRecord.id,
              filename: documentRecord.filename,
              status: documentRecord.status, // Will be PENDING initially
            }
          )
        )
    } catch (error) {
      console.error('Error in handleDocumentUpload during DB operation:', error)
      // TODO: Consider deleting the uploaded file from disk if DB entry fails
      // This is for errors during the prisma.ragSourceDocument.create call
      return next(
        new ApiError('Failed to record document upload before processing.', 500)
      )
    }
  }
)

/**
 * Handles a RAG query from a user.
 */
export const handleRagQuery = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { query } = req.body

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return next(
        new ApiError('Query string is required and cannot be empty.', 400)
      )
    }

    if (!req.user) {
      // This should ideally be caught by authenticate middleware, but as a safeguard:
      return next(new ApiError('User not authenticated', 401))
    }

    try {
      console.log(`Received RAG query from user ${req.user.userId}: "${query}"`)

      const queryEmbedding = await getEmbedding(query.trim())

      if (queryEmbedding.length === 0) {
        console.warn('Query embedding resulted in an empty vector.')
        // Depending on desired behavior, could return empty results or an error
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              [],
              'Query processed, but no relevant information found (empty query embedding).'
            )
          )
      }

      const similarChunks = await findSimilarChunks(queryEmbedding)

      if (similarChunks.length === 0) {
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              [],
              'No relevant document chunks found for your query.'
            )
          )
      }

      // Optionally, you might want to format the response further
      // e.g., just return chunkText and source document info
      const formattedChunks = similarChunks.map((item) => ({
        chunkText: item.chunk.chunkText,
        similarity: item.similarity,
        sourceDocument: {
          filename: item.chunk.ragSourceDocument.filename,
          // any other source document info you want to expose
        },
        metadata: item.chunk.metadata,
      }))

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            formattedChunks,
            'Successfully retrieved relevant document chunks.'
          )
        )
    } catch (error) {
      console.error('Error during RAG query processing:', error)
      // Pass a generic error to the client, or more specific if appropriate
      next(new ApiError('Failed to process your query.', 500))
    }
  }
)
