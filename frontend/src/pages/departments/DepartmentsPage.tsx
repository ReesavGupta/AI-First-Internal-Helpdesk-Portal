'use client'

import type React from 'react'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Users, Ticket, Edit, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export function DepartmentsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<any>(null)

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: apiClient.getDepartments,
  })

  const createDepartmentMutation = useMutation({
    mutationFn: apiClient.createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setIsCreateDialogOpen(false)
      toast({
        title: 'Success',
        description: 'Department created successfully',
      })
    },
  })

  const updateDepartmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setEditingDepartment(null)
      toast({
        title: 'Success',
        description: 'Department updated successfully',
      })
    },
  })

  const deleteDepartmentMutation = useMutation({
    mutationFn: apiClient.deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast({
        title: 'Success',
        description: 'Department deleted successfully',
      })
    },
  })

  // Only allow agents and admins
  if (user?.role === 'EMPLOYEE') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-4">
          You don't have permission to view departments.
        </p>
        <Link to="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const filteredDepartments = departments?.filter(
    (dept: any) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.keywords?.some((keyword: string) =>
        keyword.toLowerCase().includes(searchQuery.toLowerCase())
      )
  )

  const DepartmentForm = ({ department, onSubmit, onCancel }: any) => {
    const [formData, setFormData] = useState({
      name: department?.name || '',
      keywords: department?.keywords?.join(', ') || '',
    })

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      onSubmit({
        name: formData.name,
        keywords: formData.keywords
          .split(',')
          .map((k: any) => k.trim())
          .filter(Boolean),
      })
    }

    return (
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="name">Department Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter department name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Keywords (comma-separated)</Label>
          <Input
            id="keywords"
            value={formData.keywords}
            onChange={(e) =>
              setFormData({ ...formData, keywords: e.target.value })
            }
            placeholder="keyword1, keyword2, keyword3"
          />
          <p className="text-xs text-muted-foreground">
            Keywords help AI automatically route tickets to this department
          </p>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit">
            {department ? 'Update' : 'Create'} Department
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departments</h1>
          <p className="text-muted-foreground">
            Manage support departments and teams
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Department</DialogTitle>
              </DialogHeader>
              <DepartmentForm
                onSubmit={(data: any) => createDepartmentMutation.mutate(data)}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search departments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Departments Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDepartments?.map((department: any) => (
            <Card
              key={department.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{department.name}</CardTitle>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Users className="mr-1 h-4 w-4" />
                        {department.users?.length || 0} agents
                      </div>
                      <div className="flex items-center">
                        <Ticket className="mr-1 h-4 w-4" />
                        {department.tickets?.length || 0} tickets
                      </div>
                    </div>
                  </div>
                  {user?.role === 'ADMIN' && (
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingDepartment(department)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          deleteDepartmentMutation.mutate(department.id)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {department.keywords && department.keywords.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Keywords:</p>
                    <div className="flex flex-wrap gap-1">
                      {department.keywords.map((keyword: string) => (
                        <Badge
                          key={keyword}
                          variant="secondary"
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <Link to={`/departments/${department.id}`}>
                    <Button
                      variant="outline"
                      className="w-full"
                    >
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Department Dialog */}
      <Dialog
        open={!!editingDepartment}
        onOpenChange={() => setEditingDepartment(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          {editingDepartment && (
            <DepartmentForm
              department={editingDepartment}
              onSubmit={(data: any) =>
                updateDepartmentMutation.mutate({
                  id: editingDepartment.id,
                  data,
                })
              }
              onCancel={() => setEditingDepartment(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
