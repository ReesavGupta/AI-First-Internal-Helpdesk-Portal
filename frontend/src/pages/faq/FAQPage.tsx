'use client'

import type React from 'react'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export function FAQPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingFAQ, setEditingFAQ] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('public')

  const { data: publicFAQs, isLoading: publicLoading } = useQuery({
    queryKey: ['public-faqs', searchQuery],
    queryFn: () =>
      searchQuery
        ? apiClient.searchPublicFAQs(searchQuery)
        : apiClient.getPublicFAQs(),
  })

  const { data: allFAQs, isLoading: allLoading } = useQuery({
    queryKey: ['all-faqs', searchQuery],
    queryFn: () =>
      searchQuery ? apiClient.searchFAQs(searchQuery) : apiClient.getFAQs(),
    enabled: user?.role === 'AGENT' || user?.role === 'ADMIN',
  })

  const createFAQMutation = useMutation({
    mutationFn: apiClient.createFAQ,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-faqs'] })
      queryClient.invalidateQueries({ queryKey: ['all-faqs'] })
      setIsCreateDialogOpen(false)
      toast({ title: 'Success', description: 'FAQ created successfully' })
    },
  })

  const updateFAQMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.updateFAQ(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-faqs'] })
      queryClient.invalidateQueries({ queryKey: ['all-faqs'] })
      setEditingFAQ(null)
      toast({ title: 'Success', description: 'FAQ updated successfully' })
    },
  })

  const deleteFAQMutation = useMutation({
    mutationFn: apiClient.deleteFAQ,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-faqs'] })
      queryClient.invalidateQueries({ queryKey: ['all-faqs'] })
      toast({ title: 'Success', description: 'FAQ deleted successfully' })
    },
  })

  const FAQForm = ({ faq, onSubmit, onCancel }: any) => {
    const [formData, setFormData] = useState({
      question: faq?.question || '',
      answer: faq?.answer || '',
      tags: faq?.tags?.join(', ') || '',
      visibility: faq?.visibility || 'PUBLIC',
    })

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      onSubmit({
        question: formData.question,
        answer: formData.answer,
        tags: formData.tags
          .split(',')
          .map((t: any) => t.trim())
          .filter(Boolean),
        visibility: formData.visibility,
      })
    }

    return (
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="question">Question</Label>
          <Input
            id="question"
            value={formData.question}
            onChange={(e) =>
              setFormData({ ...formData, question: e.target.value })
            }
            placeholder="Enter the question"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="answer">Answer</Label>
          <Textarea
            id="answer"
            value={formData.answer}
            onChange={(e) =>
              setFormData({ ...formData, answer: e.target.value })
            }
            placeholder="Enter the answer"
            rows={6}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="tag1, tag2, tag3"
          />
        </div>

        {(user?.role === 'AGENT' || user?.role === 'ADMIN') && (
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              value={formData.visibility}
              onValueChange={(value) =>
                setFormData({ ...formData, visibility: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="INTERNAL">Internal Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit">{faq ? 'Update' : 'Create'} FAQ</Button>
        </div>
      </form>
    )
  }

  const FAQList = ({ faqs, isLoading, showVisibility = false }: any) => (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner size="lg" />
        </div>
      ) : faqs?.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No FAQs found</p>
        </div>
      ) : (
        faqs?.map((faq: any) => (
          <Card key={faq.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    {showVisibility && (
                      <Badge
                        variant={
                          faq.visibility === 'PUBLIC' ? 'default' : 'secondary'
                        }
                      >
                        {faq.visibility === 'PUBLIC' ? (
                          <Eye className="mr-1 h-3 w-3" />
                        ) : (
                          <EyeOff className="mr-1 h-3 w-3" />
                        )}
                        {faq.visibility}
                      </Badge>
                    )}
                    {faq.tags?.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="outline"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                {(user?.role === 'AGENT' || user?.role === 'ADMIN') && (
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingFAQ(faq)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFAQMutation.mutate(faq.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{faq.answer}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">FAQ</h1>
          <p className="text-muted-foreground">
            Frequently asked questions and answers
          </p>
        </div>
        {(user?.role === 'AGENT' || user?.role === 'ADMIN') && (
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add FAQ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New FAQ</DialogTitle>
              </DialogHeader>
              <FAQForm
                onSubmit={(data: any) => createFAQMutation.mutate(data)}
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
          placeholder="Search FAQs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="public">Public FAQs</TabsTrigger>
          {(user?.role === 'AGENT' || user?.role === 'ADMIN') && (
            <TabsTrigger value="all">All FAQs</TabsTrigger>
          )}
        </TabsList>

        <TabsContent
          value="public"
          className="mt-6"
        >
          <FAQList
            faqs={publicFAQs}
            isLoading={publicLoading}
          />
        </TabsContent>

        {(user?.role === 'AGENT' || user?.role === 'ADMIN') && (
          <TabsContent
            value="all"
            className="mt-6"
          >
            <FAQList
              faqs={allFAQs}
              isLoading={allLoading}
              showVisibility
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Edit FAQ Dialog */}
      <Dialog
        open={!!editingFAQ}
        onOpenChange={() => setEditingFAQ(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
          </DialogHeader>
          {editingFAQ && (
            <FAQForm
              faq={editingFAQ}
              onSubmit={(data: any) =>
                updateFAQMutation.mutate({ id: editingFAQ.id, data })
              }
              onCancel={() => setEditingFAQ(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
