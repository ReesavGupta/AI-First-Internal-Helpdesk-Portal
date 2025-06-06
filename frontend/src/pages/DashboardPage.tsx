'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Ticket,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatDistanceToNow } from 'date-fns'

export function DashboardPage() {
  const { user } = useAuth()

  // Query for recent tickets (for the list display)
  const { data: recentTicketsData, isLoading: recentTicketsLoading } = useQuery(
    {
      queryKey: ['dashboard-recent-tickets', user?.id],
      queryFn: () => {
        const params = { limit: 5 }
        if (user?.role === 'EMPLOYEE') {
          return apiClient.getMyTickets(params)
        } else if (user?.role === 'AGENT' || user?.role === 'ADMIN') {
          return apiClient.getAssignedTickets(params)
        }
        return Promise.resolve({
          tickets: [],
          pagination: {
            totalCount: 0,
            currentPage: 1,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        })
      },
      enabled: !!user,
    }
  )
  const recentTickets = recentTicketsData?.tickets || []

  // Helper function for fetching ticket statistics
  const fetchTicketStats = async (status?: string) => {
    const filters: { status?: string } = {}
    if (status) {
      filters.status = status
    }

    let response
    if (user?.role === 'EMPLOYEE') {
      response = await apiClient.getMyTickets(filters)
    } else if (user?.role === 'AGENT' || user?.role === 'ADMIN') {
      response = await apiClient.getAssignedTickets(filters)
    } else {
      return { count: 0 } // Default for other roles or if user is null
    }
    return { count: response.pagination?.totalCount || 0 }
  }

  // Queries for statistics cards
  const { data: totalTicketsStats, isLoading: totalTicketsLoading } = useQuery({
    queryKey: ['ticketStats', 'total', user?.id],
    queryFn: () => fetchTicketStats(),
    enabled: !!user,
  })

  const { data: openTicketsStats, isLoading: openTicketsLoading } = useQuery({
    queryKey: ['ticketStats', 'OPEN', user?.id],
    queryFn: () => fetchTicketStats('OPEN'),
    enabled: !!user,
  })

  const { data: inProgressTicketsStats, isLoading: inProgressTicketsLoading } =
    useQuery({
      queryKey: ['ticketStats', 'IN_PROGRESS', user?.id],
      queryFn: () => fetchTicketStats('IN_PROGRESS'),
      enabled: !!user,
    })

  const { data: resolvedTicketsStats, isLoading: resolvedTicketsLoading } =
    useQuery({
      queryKey: ['ticketStats', 'RESOLVED', user?.id],
      queryFn: () => fetchTicketStats('RESOLVED'),
      enabled: !!user,
    })

  // Get AI status
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: apiClient.getAIStatus,
  })

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

  const getPriorityColor = (priority: string) => {
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

  const pageIsLoading =
    recentTicketsLoading ||
    totalTicketsLoading ||
    openTicketsLoading ||
    inProgressTicketsLoading ||
    resolvedTicketsLoading

  if (pageIsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}! Here's what's happening.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTicketsStats?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {user?.role === 'EMPLOYEE' ? 'Your tickets' : 'Assigned to you'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {openTicketsStats?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inProgressTicketsStats?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Being worked on</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resolvedTicketsStats?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Recently completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
            <CardDescription>
              {user?.role === 'EMPLOYEE'
                ? 'Your latest tickets'
                : 'Recently assigned tickets'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTickets.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No tickets found</p>
                <Link to="/tickets/new">
                  <Button className="mt-2">Create your first ticket</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTickets.map((ticket: any) => (
                  <div
                    key={ticket.id}
                    className="flex items-center space-x-4"
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(
                        ticket.status
                      )}`}
                    />
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {ticket.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(ticket.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <Badge variant={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>
                ))}
                <Link
                  to={
                    user?.role === 'EMPLOYEE'
                      ? '/tickets/my'
                      : '/tickets/assigned'
                  }
                >
                  <Button
                    variant="outline"
                    className="w-full"
                  >
                    View all tickets
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/tickets/new">
              <Button className="w-full justify-start">
                <Ticket className="mr-2 h-4 w-4" />
                Create New Ticket
              </Button>
            </Link>

            <Link to="/faq">
              <Button
                variant="outline"
                className="w-full justify-start"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Browse FAQ
              </Button>
            </Link>

            <Link to="/ai/assistant">
              <Button
                variant="outline"
                className="w-full justify-start"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                AI Assistant
              </Button>
            </Link>

            {(user?.role === 'AGENT' || user?.role === 'ADMIN') && (
              <Link to="/tickets">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Manage All Tickets
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Status */}
      {aiStatus && (
        <Card>
          <CardHeader>
            <CardTitle>AI Assistant Status</CardTitle>
            <CardDescription>
              Current status of AI-powered features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  aiStatus.status === 'OK'
                    ? 'bg-green-500'
                    : aiStatus.status === 'DEGRADED'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              />
              <div>
                <p className="font-medium">Status: {aiStatus.status}</p>
                {aiStatus.usage_today && (
                  <p className="text-sm text-muted-foreground">
                    Today: {aiStatus.usage_today.requests} requests processed
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
