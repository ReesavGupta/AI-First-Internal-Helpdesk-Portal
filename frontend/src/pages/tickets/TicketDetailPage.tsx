'use client'

import React from 'react'

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  Edit,
  MessageSquare,
  Paperclip,
  Send,
  User,
  Tag,
  Building,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebsocketContext'
import { apiClient } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatDistanceToNow } from 'date-fns'

const responseSchema = z.object({
  content: z.string().min(1, 'Response cannot be empty'),
})

type ResponseForm = z.infer<typeof responseSchema>

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { joinTicket, leaveTicket } = useWebSocket()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)

  if (!id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
        <p className="ml-2 text-muted-foreground">Loading ticket details...</p>
      </div>
    )
  }

  const { data: ticketResponse, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiClient.getTicket(id),
    enabled: !!id,
  })

  const { data: aiSuggestions } = useQuery({
    queryKey: ['ai-suggestions', id],
    queryFn: () => apiClient.getAISuggestions(id!),
    enabled: !!id && (user?.role === 'AGENT' || user?.role === 'ADMIN'),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResponseForm>({
    resolver: zodResolver(responseSchema),
  })

  // Join ticket room for real-time updates
  React.useEffect(() => {
    if (id) {
      joinTicket(id)
      return () => leaveTicket(id)
    }
  }, [id, joinTicket, leaveTicket])

  // Listen for real-time updates
  React.useEffect(() => {
    const handleTicketUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
    }

    window.addEventListener('ws-ticket-update', handleTicketUpdate)
    return () =>
      window.removeEventListener('ws-ticket-update', handleTicketUpdate)
  }, [id, queryClient])

  const createResponseMutation = useMutation({
    mutationFn: (data: ResponseForm) =>
      apiClient.createTicketResponse(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      reset()
      toast({
        title: 'Success',
        description: 'Response added successfully',
      })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => apiClient.updateTicketStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      toast({
        title: 'Success',
        description: 'Ticket status updated',
      })
    },
  })

  const assignTicketMutation = useMutation({
    mutationFn: (agentId: string) => apiClient.assignTicket(id!, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      toast({
        title: 'Success',
        description: 'Ticket assigned successfully',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Ensure ticketResponse and its data property are valid
  if (!ticketResponse?.data) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Ticket Not Found</h1>
        <Button onClick={() => navigate('/tickets')}>Back to Tickets</Button>
      </div>
    )
  }

  // Use the actual ticket data
  const ticket = ticketResponse.data
  const actualResponses = ticket.responses

  const canEdit =
    user?.role === 'ADMIN' ||
    ticket.assignedToId === user?.id ||
    ticket.createdById === user?.id
  const canAssign = user?.role === 'AGENT' || user?.role === 'ADMIN'

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-500'
      case 'IN_PROGRESS':
        return 'bg-yellow-500'
      case 'RESOLVED':
        return 'bg-green-500'
      case 'CLOSED':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'destructive'
      case 'MEDIUM':
        return 'default'
      case 'LOW':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const onSubmitResponse = async (data: ResponseForm) => {
    await createResponseMutation.mutateAsync(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{ticket.title}</h1>
            <p className="text-muted-foreground">
              {ticket?.id ? `Ticket #${ticket.id.slice(-8)}` : 'Loading ID...'}
            </p>
          </div>
        </div>

        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Ticket
              </DropdownMenuItem>
              {canAssign && (
                <DropdownMenuItem
                  onClick={() => assignTicketMutation.mutate(user?.id!)}
                >
                  <User className="mr-2 h-4 w-4" />
                  Assign to Me
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ticket Details</CardTitle>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(
                      ticket.status
                    )}`}
                  />
                  <Badge variant="outline">
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </div>

              {ticket.fileUrls && ticket.fileUrls.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Attachments</h3>
                  <div className="space-y-2">
                    {ticket.fileUrls.map((url: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2"
                      >
                        <Paperclip className="h-4 w-4" />
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Attachment {index + 1}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ticket.tags && ticket.tags.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1">
                    {ticket.tags.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                      >
                        <Tag className="mr-1 h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-4 w-4" />
                Responses ({actualResponses?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {actualResponses?.map((response: any) => (
                <div
                  key={response.id}
                  className="flex space-x-3"
                >
                  <Avatar>
                    <AvatarImage
                      src={response.user?.avatarUrl || '/placeholder.svg'}
                    />
                    <AvatarFallback>
                      {response.user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{response.user?.name}</span>
                      <Badge variant="outline">{response.user?.role}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(response.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="whitespace-pre-wrap">{response.content}</p>
                      {response.fileUrls && response.fileUrls.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {response.fileUrls.map(
                            (url: string, index: number) => (
                              <div
                                key={index}
                                className="flex items-center space-x-2"
                              >
                                <Paperclip className="h-3 w-3" />
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline"
                                >
                                  Attachment {index + 1}
                                </a>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {actualResponses?.length === 0 && (
                <p className="text-center text-muted-foreground py-6">
                  No responses yet
                </p>
              )}

              <Separator />

              {/* Add Response */}
              <form
                onSubmit={handleSubmit(onSubmitResponse)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Add Response</label>
                  <Textarea
                    placeholder="Type your response..."
                    rows={4}
                    {...register('content')}
                  />
                  {errors.content && (
                    <p className="text-sm text-destructive">
                      {errors.content.message}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={createResponseMutation.isPending}
                  >
                    {createResponseMutation.isPending && (
                      <LoadingSpinner
                        size="sm"
                        className="mr-2"
                      />
                    )}
                    <Send className="mr-2 h-4 w-4" />
                    Send Response
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                {canEdit ? (
                  <Select
                    value={ticket.status}
                    onValueChange={(value) =>
                      updateStatusMutation.mutate(value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Priority</span>
                <Badge variant={getPriorityVariant(ticket.priority)}>
                  {ticket.priority}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Department</span>
                <Badge variant="secondary">
                  <Building className="mr-1 h-3 w-3" />
                  {ticket.department?.name}
                </Badge>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Created by</span>
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={ticket.createdBy?.avatarUrl || '/placeholder.svg'}
                    />
                    <AvatarFallback>
                      {ticket.createdBy?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{ticket.createdBy?.name}</span>
                </div>
              </div>

              {ticket.assignedTo && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Assigned to</span>
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={ticket.assignedTo?.avatarUrl || '/placeholder.svg'}
                      />
                      <AvatarFallback>
                        {ticket.assignedTo?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{ticket.assignedTo?.name}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Created</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Updated</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          {aiSuggestions && aiSuggestions.data.suggestions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>AI Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {aiSuggestions.data.suggestions.map(
                  (suggestion: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 bg-muted rounded-lg"
                    >
                      <p className="text-sm">{suggestion.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Confidence: {Math.round(suggestion.confidence * 100)}%
                      </p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
