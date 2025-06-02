-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "DocumentProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "rag_source_documents" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalPath" TEXT,
    "mimetype" TEXT,
    "size" INTEGER,
    "status" "DocumentProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_source_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rag_document_chunks" (
    "id" TEXT NOT NULL,
    "ragSourceDocumentId" TEXT NOT NULL,
    "chunkText" TEXT NOT NULL,
    "embedding" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rag_document_chunks_ragSourceDocumentId_idx" ON "rag_document_chunks"("ragSourceDocumentId");

-- AddForeignKey
ALTER TABLE "rag_source_documents" ADD CONSTRAINT "rag_source_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_document_chunks" ADD CONSTRAINT "rag_document_chunks_ragSourceDocumentId_fkey" FOREIGN KEY ("ragSourceDocumentId") REFERENCES "rag_source_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
