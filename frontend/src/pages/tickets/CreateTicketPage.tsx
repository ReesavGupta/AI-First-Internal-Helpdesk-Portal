'use client'

import type React from 'react'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

const createTicketSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  tags: z.string().optional(),
  departmentId: z.string().optional(),
})

type CreateTicketForm = z.infer<typeof createTicketSchema>

export function CreateTicketPage() {
  const navigate = useNavigate()
  // const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState('')
  const [files, setFiles] = useState<File[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      priority: 'MEDIUM',
    },
  })

  const { data: departments } = useQuery<any[]>({
    queryKey: ['departments'],
    queryFn: apiClient.getDepartments,
  })

  /* // Commented out to prevent automatic AI assignment calls while typing
  const { data: aiSuggestion, isLoading: aiLoading } = useQuery({
    queryKey: ['ai-suggestion', watch('title'), watch('description')],
    queryFn: () =>
      apiClient.getAITicketAssignment({
        title: watch('title') || '',
        description: watch('description') || '',
      }),
    enabled: !!(
      watch('title')?.length > 10 && watch('description')?.length > 20
    ),
  })
  */
  // If you need aiSuggestion later, ensure it's handled, e.g. by setting it to null or undefined
  // const aiSuggestion = null // Or undefined, depending on how it's used later

  const createTicketMutation = useMutation({
    mutationFn: apiClient.createTicket,
    onSuccess: (responseData) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast({
        title: 'Success',
        description: 'Ticket created successfully',
      })
      if (responseData?.data?.id) {
        navigate(`/tickets/${responseData.data.id}`)
      } else {
        console.error(
          'Ticket ID not found in response, navigating to tickets list.',
          responseData
        )
        navigate('/tickets')
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const onSubmit = async (data: CreateTicketForm) => {
    const fileUrls: string[] = []
    let departmentIdToSend = data.departmentId // User's manual selection

    // If no department was manually selected, try to get an AI suggestion
    if (!departmentIdToSend) {
      const title = data.title
      const description = data.description

      // Only call AI if title and description seem substantial enough
      if (
        title &&
        title.length >= 10 &&
        description &&
        description.length >= 20
      ) {
        toast({
          title: 'AI Assistant',
          description: 'Attempting to assign department using AI...',
        })
        try {
          const suggestionResult = await apiClient.getAITicketAssignment({
            title,
            description,
          })
          if (suggestionResult?.suggestedDepartmentId) {
            departmentIdToSend = suggestionResult.suggestedDepartmentId
            const suggestedDeptName = departments?.find(
              (d) => d.id === departmentIdToSend
            )?.name
            toast({
              title: 'AI Suggestion Applied',
              description: `AI suggested department: ${
                suggestedDeptName || departmentIdToSend
              }. This will be used unless you selected one manually.`,
            })
          } else {
            toast({
              title: 'AI Assistant',
              description:
                'AI could not suggest a department. Please select one or submit for backend routing.',
              variant: 'default',
            })
          }
        } catch (error) {
          console.error('AI department suggestion failed on submit:', error)
          toast({
            title: 'AI Suggestion Failed',
            description:
              'Could not get AI department suggestion. Ticket will be routed by backend if no department is selected.',
            variant: 'default', // Changed from destructive to info/default
          })
          // departmentIdToSend remains undefined, backend AI will handle it if primary backend assignment is configured
        }
      }
    }

    await createTicketMutation.mutateAsync({
      ...data,
      tags,
      fileUrls,
      departmentId: departmentIdToSend, // Use the determined departmentId
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Ticket</h1>
          <p className="text-muted-foreground">
            Describe your issue and we'll help you resolve it
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief description of your issue"
                    {...register('title')}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide detailed information about your issue..."
                    rows={6}
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      onValueChange={(value) =>
                        setValue('priority', value as any)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      onValueChange={(value) => setValue('departmentId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments?.map((dept: any) => (
                          <SelectItem
                            key={dept.id}
                            value={dept.id}
                          >
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add a tag"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === 'Enter' && (e.preventDefault(), addTag())
                      }
                    />
                    <Button
                      type="button"
                      onClick={addTag}
                      variant="outline"
                    >
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeTag(tag)}
                        >
                          {tag}
                          <X className="ml-1 h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="files">Attachments</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Drag and drop files here, or click to select files
                      </p>
                      <Input
                        id="files"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          document.getElementById('files')?.click()
                        }
                      >
                        Select Files
                      </Button>
                    </div>
                  </div>
                  {files.length > 0 && (
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <span className="text-sm">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setFiles(files.filter((_, i) => i !== index))
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTicketMutation.isPending}
                  >
                    {createTicketMutation.isPending && (
                      <LoadingSpinner
                        size="sm"
                        className="mr-2"
                      />
                    )}
                    Create Ticket
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* AI Suggestion */}
          {/* {aiLoading && (
            <Card>
              <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-muted-foreground">
                    Analyzing your ticket...
                  </span>
                </div>
              </CardContent>
            </Card>
          )} */}

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Tips for Better Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Be specific about the issue you're experiencing</p>
              <p>• Include steps to reproduce the problem</p>
              <p>• Mention any error messages you've seen</p>
              <p>• Attach relevant screenshots or files</p>
              <p>• Specify your operating system and browser</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
