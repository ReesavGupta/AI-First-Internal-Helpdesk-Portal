'use client'

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Users, Ticket, Tag, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'

export function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [agentsPage /*setAgentsPage*/] = useState(1)
  const [ticketsPage /*setTicketsPage*/] = useState(1)

  const { data: department, isLoading } = useQuery({
    queryKey: ['department', id],
    queryFn: () => apiClient.getDepartment(id!),
    enabled: !!id,
  })

  const { data: agents } = useQuery({
    queryKey: ['department-agents', id, agentsPage],
    queryFn: () => apiClient.getDepartmentAgents(id!, agentsPage),
    enabled: !!id,
  })

  const { data: tickets } = useQuery({
    queryKey: ['department-tickets', id, ticketsPage],
    queryFn: () => apiClient.getDepartmentTickets(id!, ticketsPage),
    enabled: !!id,
  })

  const { data: stats } = useQuery({
    queryKey: ['department-stats', id],
    queryFn: () => apiClient.getDepartmentStats(id!),
    enabled: !!id,
  })

  // Only allow agents and admins
  if (user?.role === 'EMPLOYEE') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-4">
          You don't have permission to view department details.
        </p>
        <Link to="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!department) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Department Not Found</h1>
        <Button onClick={() => navigate('/departments')}>
          Back to Departments
        </Button>
      </div>
    )
  }

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
          <h1 className="text-3xl font-bold">{department.name}</h1>
          <p className="text-muted-foreground">
            Department details and management
          </p>
        </div>
      </div>

      {/* Department Info */}
      <div className="grid gap-6 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.overview?.totalAgents || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.overview?.openTickets || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolution Rate
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.overview?.resolutionRate !== undefined
                ? `${stats.overview.resolutionRate}%`
                : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.satisfactionScore || 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keywords */}
      {department.keywords && department.keywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Tag className="mr-2 h-4 w-4" />
              Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {department.keywords.map((keyword: string) => (
                <Badge
                  key={keyword}
                  variant="secondary"
                >
                  {keyword}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              These keywords help AI automatically route tickets to this
              department
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        defaultValue="agents"
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="tickets">Recent Tickets</TabsTrigger>
        </TabsList>

        <TabsContent
          value="agents"
          className="space-y-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>Department Agents</CardTitle>
            </CardHeader>
            <CardContent>
              {agents?.agents?.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No agents assigned to this department
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {agents?.agents?.map((agent: any) => (
                    <div
                      key={agent.id}
                      className="flex items-center space-x-4 p-4 border rounded-lg"
                    >
                      <Avatar>
                        <AvatarImage
                          src={agent.avatarUrl || '/placeholder.svg'}
                        />
                        <AvatarFallback>
                          {agent.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium">{agent.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {agent.email}
                        </p>
                      </div>
                      <Badge
                        variant={
                          agent.role === 'ADMIN' ? 'destructive' : 'default'
                        }
                      >
                        {agent.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="tickets"
          className="space-y-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {tickets?.tickets?.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No tickets found for this department
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets?.tickets?.map((ticket: any) => (
                    <div
                      key={ticket.id}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div
                              className={`w-3 h-3 rounded-full ${getStatusColor(
                                ticket.status
                              )}`}
                            />
                            <Link
                              to={`/tickets/${ticket.id}`}
                              className="font-medium hover:underline"
                            >
                              {ticket.title}
                            </Link>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {ticket.description}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>#{ticket.id.slice(-8)}</span>
                            <span>Created by {ticket.createdBy?.name}</span>
                            <span>
                              {formatDistanceToNow(new Date(ticket.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1 ml-4">
                          <Badge variant={getPriorityVariant(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          <Badge variant="outline">
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
