'use client'

import React, { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { type ApiError, type ApiResponse } from '../../lib/apiMessages' // Use relative path for apiMessages
import { toast } from 'sonner' // Assuming you use sonner for toasts, based on App.tsx
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle as AlertTriangleIcon,
} from 'lucide-react'

// Placeholder for API call, replace with your actual API client if you have one
async function uploadDocumentApi(
  file: File
): Promise<ApiResponse<any> | ApiError> {
  const formData = new FormData()
  formData.append('document', file)

  const token = localStorage.getItem('accessToken')
  if (!token) {
    return {
      success: false,
      message: 'Authentication token not found. Please log in again.',
      errors: [{ message: 'Auth token missing' }],
    } as ApiError
  }

  try {
    const response = await fetch('/api/rag/documents/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // 'Content-Type': 'multipart/form-data' is automatically set by browser with FormData
      },
      body: formData,
    })

    const responseData = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: responseData.message || 'Upload failed',
        errors: responseData.errors || [{ message: 'Server error' }],
      } as ApiError
    }
    return {
      success: true,
      message: responseData.message || 'Upload successful',
      data: responseData.data,
    } as ApiResponse<any>
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Network error during upload.',
      errors: [
        { message: error instanceof Error ? error.message : 'Network error' },
      ],
    } as ApiError
  }
}

export function DocumentManagementPage() {
  const { user } = useAuth()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'success' | 'error' | null>(
    null
  )
  const [statusMessage, setStatusMessage] = useState<string>('')

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0])
      setUploadStatus(null)
      setStatusMessage('')
    }
  }

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast.error('No file selected.')
      return
    }

    setUploading(true)
    setUploadStatus(null)
    setStatusMessage('Uploading...')

    const result = await uploadDocumentApi(selectedFile)

    if (result.success) {
      setUploadStatus('success')
      setStatusMessage(
        result.message ||
          'Document uploaded successfully and is being processed.'
      )
      toast.success(
        result.message || 'Document uploaded and processing started!'
      )
      setSelectedFile(null) // Clear selection after successful upload
    } else {
      setUploadStatus('error')
      const errorMessage =
        result.errors && result.errors.length > 0
          ? result.errors.map((e) => e.message).join(', ')
          : result.message || 'An unknown error occurred.'
      setStatusMessage(`Upload failed: ${errorMessage}`)
      toast.error(`Upload failed: ${errorMessage}`)
    }
    setUploading(false)
  }, [selectedFile])

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertTriangleIcon className="w-16 h-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to view this page.
        </p>
        <Button
          onClick={() => window.history.back()}
          className="mt-4"
        >
          Go Back
        </Button>
      </div>
    )
  }

  // Check if @/react is a valid import path or if it should be 'react'
  // This basic implementation uses fetch. If you have an API client (e.g., axios based) in lib/api.ts or similar,
  // it would be better to use that.

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <UploadCloud className="mr-2 h-6 w-6" /> Document Upload for RAG
          </CardTitle>
          <CardDescription>
            Upload internal documents (PDF, DOCX, TXT) to be processed and made
            available for the AI assistant. Maximum file size: 20MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label
              htmlFor="file-upload"
              className="sr-only"
            >
              Choose file
            </label>
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.md"
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading}
            />
            {selectedFile && (
              <div className="mt-3 text-sm text-muted-foreground flex items-center">
                <FileText className="h-4 w-4 mr-2 shrink-0" />
                Selected: {selectedFile.name} (
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {uploadStatus === 'success' && statusMessage && (
            <Alert
              variant="default"
              className="bg-green-50 border-green-200 text-green-700"
            >
              <CheckCircle className="h-5 w-5 text-green-500" />
              <AlertTitle>Upload Successful</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}
          {uploadStatus === 'error' && statusMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Upload Failed</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" /> Upload Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
