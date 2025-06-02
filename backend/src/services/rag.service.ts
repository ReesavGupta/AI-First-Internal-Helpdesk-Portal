import fs from 'fs/promises'
import path from 'path'
import pdf from 'pdf-parse'
import mammoth from 'mammoth'
import openai from '../utils/openai'
import { prisma } from '../../prisma/client'
import {
  DocumentProcessingStatus,
  RagDocumentChunk,
  Prisma,
} from '@prisma/client'

const EMBEDDING_MODEL = 'text-embedding-3-small' // Or your preferred model, e.g., text-embedding-ada-002
const EMBEDDING_DIMENSIONS = 1536 // Dimensions for text-embedding-3-small
const MAX_CHUNK_SIZE = 1000 // Max characters per chunk (tune as needed)
const CHUNK_OVERLAP = 200 // Characters overlap between chunks (tune as needed)

/**
 * Parses the text content from a document file based on its mimetype.
 * @param filePath Full path to the document file.
 * @param mimetype The mimetype of the file.
 * @returns Promise<string> The extracted text content.
 */
async function parseDocumentContent(
  filePath: string,
  mimetype: string
): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath)
    if (mimetype === 'application/pdf') {
      const data = await pdf(buffer)
      return data.text
    } else if (
      mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const { value } = await mammoth.extractRawText({ buffer })
      return value
    } else if (mimetype === 'text/plain' || mimetype === 'text/markdown') {
      return buffer.toString('utf8')
    } else {
      console.warn(`Unsupported mimetype for parsing: ${mimetype}`)
      throw new Error(`Unsupported document type: ${mimetype}`)
    }
  } catch (error) {
    console.error(`Error parsing document ${filePath}:`, error)
    throw error // Re-throw to be caught by the caller
  }
}

/**
 * Chunks text into smaller pieces with overlap.
 * @param text The input text.
 * @param chunkSize Maximum size of each chunk (in characters).
 * @param overlap Overlap between chunks (in characters).
 * @returns string[] An array of text chunks.
 */
function chunkText(
  text: string,
  chunkSize: number = MAX_CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): string[] {
  if (!text) return []
  const chunks: string[] = []
  let i = 0
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length)
    chunks.push(text.substring(i, end))
    i += chunkSize - overlap
    if (i + overlap >= text.length) {
      // Ensure last part is captured if overlap causes skip
      if (end < text.length) {
        // If there's remaining text not covered by overlap logic
        chunks.push(text.substring(end))
      }
      break
    }
    if (i < 0) break // Safety break for extreme overlap values relative to chunk size
  }
  // Filter out any potentially empty strings that might result from aggressive chunking on very short texts
  return chunks.filter((chunk) => chunk.trim() !== '')
}

/**
 * Generates an embedding for the given text using OpenAI API.
 * @param text The text to embed.
 * @returns Promise<number[]> The embedding vector.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim() === '') {
    console.log('getEmbedding called with empty text, returning empty array.')
    return []
  }
  try {
    // OpenAI recommends replacing newlines with spaces for better performance.
    const inputText = text.replace(/\n/g, ' ')
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: inputText,
    })
    if (
      response.data &&
      response.data.length > 0 &&
      response.data[0].embedding
    ) {
      return response.data[0].embedding
    } else {
      console.error(
        'OpenAI API did not return expected embedding structure:',
        response
      )
      throw new Error(
        'Failed to get embedding: Invalid API response structure.'
      )
    }
  } catch (error) {
    console.error('Error getting embedding from OpenAI:', error)
    throw error // Re-throw to be caught by the caller
  }
}

export const processDocument = async (documentId: string) => {
  console.log(`Starting processing for document ID: ${documentId}`)
  const sourceDocument = await prisma.ragSourceDocument.findUnique({
    where: { id: documentId },
  })

  if (
    !sourceDocument ||
    !sourceDocument.originalPath ||
    !sourceDocument.mimetype
  ) {
    const errorMessage = !sourceDocument
      ? `RagSourceDocument with ID ${documentId} not found.`
      : 'Missing file path or mimetype.'
    console.error(errorMessage)
    if (sourceDocument) {
      // Only update if the document was found but had missing info
      await prisma.ragSourceDocument.update({
        where: { id: documentId },
        data: {
          status: DocumentProcessingStatus.FAILED,
          errorMessage: errorMessage,
        },
      })
    }
    return
  }

  let totalChunksProcessed = 0
  try {
    await prisma.ragSourceDocument.update({
      where: { id: documentId },
      data: { status: DocumentProcessingStatus.PROCESSING },
    })

    console.log(
      `Parsing document: ${sourceDocument.filename} (mimetype: ${sourceDocument.mimetype})`
    )
    const textContent = await parseDocumentContent(
      sourceDocument.originalPath,
      sourceDocument.mimetype
    )

    if (!textContent || textContent.trim() === '') {
      await prisma.ragSourceDocument.update({
        where: { id: documentId },
        data: {
          status: DocumentProcessingStatus.FAILED,
          errorMessage: 'No text content extracted from document.',
        },
      })
      console.error(`No text content extracted from document ID ${documentId}`)
      return
    }

    console.log(`Successfully parsed ${textContent.length} characters.`)

    const textChunks = chunkText(textContent)
    console.log(`Document split into ${textChunks.length} chunks.`)

    if (textChunks.length === 0) {
      await prisma.ragSourceDocument.update({
        where: { id: documentId },
        data: {
          status: DocumentProcessingStatus.FAILED,
          errorMessage:
            'Text content resulted in zero chunks after processing.',
        },
      })
      console.error(
        `Text content resulted in zero chunks for document ID ${documentId}`
      )
      return
    }

    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i]
      console.log(
        `Processing chunk ${i + 1}/${
          textChunks.length
        } for document ${documentId}`
      )

      const embeddingVector = await getEmbedding(chunk)

      if (embeddingVector.length === 0) {
        console.warn(
          `Skipping chunk ${
            i + 1
          } due to empty embedding for document ${documentId}`
        )
        continue // Skip this chunk if embedding failed or text was empty
      }

      // Store embedding as JSON string - this will work with any Prisma setup
      await prisma.ragDocumentChunk.create({
        data: {
          ragSourceDocumentId: documentId,
          chunkText: chunk,
          embedding: JSON.stringify(embeddingVector),
          metadata: {
            chunkNumber: i + 1,
            originalFilename: sourceDocument.filename,
            parsedAt: new Date().toISOString(),
          },
        },
      })

      totalChunksProcessed++
      console.log(
        `Successfully embedded and stored chunk ${i + 1}/${textChunks.length}`
      )
    }

    if (totalChunksProcessed === 0 && textChunks.length > 0) {
      // All chunks failed to embed
      throw new Error('All text chunks failed to generate embeddings.')
    }

    await prisma.ragSourceDocument.update({
      where: { id: documentId },
      data: {
        status: DocumentProcessingStatus.COMPLETED,
        errorMessage: null, // Clear any previous error message on success
      },
    })
    console.log(
      `Successfully processed document ID: ${documentId}, ${totalChunksProcessed} chunks embedded.`
    )
  } catch (error: any) {
    console.error(`Error processing document ${documentId}:`, error)
    // Sanitize the error message before saving
    const sanitizedErrorMessage = (
      error.message || 'Unknown processing error'
    ).replace(/\x00/g, '') // Remove null characters

    await prisma.ragSourceDocument.update({
      where: { id: documentId },
      data: {
        status: DocumentProcessingStatus.FAILED,
        errorMessage: sanitizedErrorMessage.substring(0, 1000), // Also truncate to a reasonable length
      },
    })
  } finally {
    // Optional: Clean up the temporary file from disk
    if (sourceDocument.originalPath) {
      try {
        await fs.unlink(sourceDocument.originalPath)
        console.log(`Deleted temporary file: ${sourceDocument.originalPath}`)
      } catch (unlinkError) {
        console.error(
          `Error deleting temporary file ${sourceDocument.originalPath}:`,
          unlinkError
        )
      }
    }
  }
}

/**
 * Helper function to calculate cosine similarity between two vectors
 * Useful for finding similar chunks when doing RAG queries
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    console.warn(
      'Vectors have different lengths for cosine similarity. Lengths:',
      vecA.length,
      vecB.length
    )
    // Depending on desired strictness, either return 0 or throw an error.
    // For robustness with potentially truncated/padded embeddings, we might allow this.
    // However, for pure cosine similarity, lengths should match.
    // Returning 0 or throwing an error are options.
    // Let's proceed with calculation using min length for now, but this is a design choice.
    // throw new Error('Vectors must have the same length for cosine similarity');
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0
  const len = Math.min(vecA.length, vecB.length) // Use the shorter length

  for (let i = 0; i < len; i++) {
    dotProduct += (vecA[i] || 0) * (vecB[i] || 0)
    normA += (vecA[i] || 0) * (vecA[i] || 0)
    normB += (vecB[i] || 0) * (vecB[i] || 0)
  }

  if (normA === 0 || normB === 0) {
    return 0
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Type for a chunk that includes its source document details
type RagDocumentChunkWithSource = Prisma.RagDocumentChunkGetPayload<{
  include: {
    ragSourceDocument: {
      select: {
        filename: true
        status: true
      }
    }
  }
}>

// Type for the item returned by findSimilarChunks: a chunk (with source) and its similarity score
interface SimilarChunkItem {
  chunk: RagDocumentChunkWithSource
  similarity: number
}

/**
 * Find similar document chunks for a given query
 */
export async function findSimilarChunks(
  queryEmbedding: number[],
  limit: number = 5,
  threshold: number = 0.6
): Promise<SimilarChunkItem[]> {
  console.log(
    'findSimilarChunks: Query Embedding (first 5 values):',
    queryEmbedding.slice(0, 5)
  )
  console.log(
    `findSimilarChunks: Using threshold: ${threshold}, limit: ${limit}`
  )

  const chunks: RagDocumentChunkWithSource[] =
    await prisma.ragDocumentChunk.findMany({
      where: {
        embedding: { not: null },
        ragSourceDocument: {
          status: DocumentProcessingStatus.COMPLETED,
        },
      },
      include: {
        ragSourceDocument: {
          select: {
            filename: true,
            status: true,
          },
        },
      },
    })

  console.log(
    `findSimilarChunks: Found ${chunks.length} total processed chunks to compare against.`
  )

  const similaritiesWithDetails = chunks.map((chunk) => {
    if (!chunk.embedding) {
      console.log(
        `findSimilarChunks: Skipping chunk ${chunk.id} due to null embedding.`
      )
      return null
    }
    try {
      const chunkEmbedding = JSON.parse(chunk.embedding)
      if (
        !Array.isArray(chunkEmbedding) ||
        chunkEmbedding.some((v) => typeof v !== 'number')
      ) {
        console.error(
          'findSimilarChunks: Parsed embedding is not a valid array of numbers for chunk:',
          chunk.id
        )
        return null
      }
      const similarity = cosineSimilarity(
        queryEmbedding,
        chunkEmbedding as number[]
      )

      // Log details for each chunk comparison
      console.log(
        `findSimilarChunks: Chunk ID: ${chunk.id}, Doc: ${
          chunk.ragSourceDocument.filename
        }, Similarity: ${similarity.toFixed(
          4
        )}, Text (first 50 chars): "${chunk.chunkText.substring(0, 50)}..."`
      )
      // console.log('Chunk Embedding (first 5 values):', chunkEmbedding.slice(0, 5)); // Optional: very verbose

      return { chunk, similarity }
    } catch (error) {
      console.error(
        `findSimilarChunks: Error parsing embedding JSON for chunk ${chunk.id}:`,
        error
      )
      return null
    }
  })

  const filteredSortedSimilarities = similaritiesWithDetails
    .filter((item): item is SimilarChunkItem => {
      if (item === null) return false
      const passesThreshold = item.similarity >= threshold
      if (!passesThreshold) {
        // console.log(`findSimilarChunks: Chunk ID ${item.chunk.id} with similarity ${item.similarity.toFixed(4)} did NOT meet threshold ${threshold}`);
      }
      return passesThreshold
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)

  console.log(
    `findSimilarChunks: Returning ${filteredSortedSimilarities.length} chunks after filtering and limiting.`
  )
  return filteredSortedSimilarities
}
