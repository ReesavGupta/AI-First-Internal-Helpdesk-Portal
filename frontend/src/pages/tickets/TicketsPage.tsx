'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { TicketFilters } from '@/types'
import { formatDistanceToNow } from 'date-fns'

export function TicketsPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<TicketFilters>({
    page: 1,
    limit: 10,
  })
  const [searchQuery, setSearchQuery] = useState('')

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => apiClient.getTickets(filters),
    enabled: user?.role !== 'EMPLOYEE',
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: apiClient.getDepartments,
    enabled: user?.role !== 'EMPLOYEE',
  })

  // Only allow agents and admins to view all tickets
  if (user?.role === 'EMPLOYEE') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-4">
          You don't have permission to view all tickets.
        </p>
        <Link to="/tickets/my">
          <Button>View My Tickets</Button>
        </Link>
      </div>
    )
  }

  const handleFilterChange = (key: keyof TicketFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }))
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Tickets</h1>
          <p className="text-muted-foreground">
            Manage and track all support tickets
          </p>
        </div>
        <Link to="/tickets/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange(
                    'status',
                    value === 'all' ? undefined : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange(
                    'priority',
                    value === 'all' ? undefined : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange(
                    'departmentId',
                    value === 'all' ? undefined : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
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
        </CardContent>
      </Card>

      {/* Tickets List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {ticketsData?.tickets?.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-4">No tickets found</p>
                <Link to="/tickets/new">
                  <Button>Create First Ticket</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            ticketsData?.tickets?.map((ticket: any) => (
              <Card
                key={ticket.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <div
                          className={`w-3 h-3 rounded-full ${getStatusColor(
                            ticket.status
                          )}`}
                        />
                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="text-lg font-semibold hover:underline truncate"
                        >
                          {ticket.title}
                        </Link>
                      </div>

                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {ticket.description}
                      </p>

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>#{ticket.id.slice(-8)}</span>
                        <span>Created by {ticket.createdBy?.name}</span>
                        {ticket.assignedTo && (
                          <span>Assigned to {ticket.assignedTo.name}</span>
                        )}
                        <span>
                          {formatDistanceToNow(new Date(ticket.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <Badge variant={getPriorityVariant(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant="outline">
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      {ticket.department && (
                        <Badge variant="secondary">
                          {ticket.department.name}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {ticket.tags && ticket.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {ticket.tags.map((tag: string) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {/* Pagination */}
          {ticketsData && ticketsData.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(ticketsData.currentPage - 1)}
                disabled={ticketsData.currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {ticketsData.currentPage} of {ticketsData.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange(ticketsData.currentPage + 1)}
                disabled={ticketsData.currentPage === ticketsData.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
