'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp, Users, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Link } from 'react-router-dom'

export function AIInsightsPage() {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState('7d')

  const { data: insights, isLoading } = useQuery({
    queryKey: ['ai-insights', timeRange],
    queryFn: () => apiClient.getAIInsights({ timeRange }),
    enabled: user?.role === 'ADMIN',
  })

  // Only allow admins
  if (user?.role !== 'ADMIN') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-4">
          You don't have permission to view AI insights.
        </p>
        <Link to="/">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
            Back to Dashboard
          </button>
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

  const mockInsights = {
    summary: {
      totalTickets: 156,
      autoAssigned: 89,
      accurateAssignments: 82,
      avgResolutionTime: '2.3 hours',
      satisfactionScore: 4.2,
    },
    patterns: [
      {
        id: '1',
        pattern: 'Login issues spike on Monday mornings',
        frequency: 23,
        impact: 'High',
        suggestion: 'Prepare additional IT support on Monday mornings',
      },
      {
        id: '2',
        pattern: 'Password reset requests increase after holidays',
        frequency: 18,
        impact: 'Medium',
        suggestion: 'Send proactive password reset reminders before holidays',
      },
      {
        id: '3',
        pattern: 'Software installation requests cluster in Q4',
        frequency: 15,
        impact: 'Medium',
        suggestion: 'Plan software deployment schedule for Q4',
      },
    ],
    departments: [
      { name: 'IT Support', accuracy: 94, volume: 45 },
      { name: 'HR', accuracy: 87, volume: 23 },
      { name: 'Finance', accuracy: 91, volume: 18 },
      { name: 'Operations', accuracy: 89, volume: 31 },
    ],
    recommendations: [
      {
        id: '1',
        title: 'Improve FAQ Coverage',
        description:
          'Add FAQs for the top 5 recurring ticket types to reduce ticket volume by ~20%',
        priority: 'High',
        estimatedImpact: '20% reduction in tickets',
      },
      {
        id: '2',
        title: 'Department Keyword Optimization',
        description:
          'Update IT Support keywords to improve auto-assignment accuracy',
        priority: 'Medium',
        estimatedImpact: '5% improvement in accuracy',
      },
      {
        id: '3',
        title: 'Agent Training',
        description:
          'Provide additional training for HR department ticket handling',
        priority: 'Low',
        estimatedImpact: 'Improved satisfaction scores',
      },
    ],
  }

  const data = insights || mockInsights

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Insights</h1>
          <p className="text-muted-foreground">
            Analytics and patterns detected by AI
          </p>
        </div>
        <Select
          value={timeRange}
          onValueChange={setTimeRange}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.totalTickets}
            </div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Assigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.autoAssigned}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(
                (data.summary.autoAssigned / data.summary.totalTickets) * 100
              )}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assignment Accuracy
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.accurateAssignments}%
            </div>
            <p className="text-xs text-muted-foreground">Correctly assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Resolution
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.avgResolutionTime}
            </div>
            <p className="text-xs text-muted-foreground">Average time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.satisfactionScore}/5
            </div>
            <p className="text-xs text-muted-foreground">Average rating</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Detected Patterns */}
        <Card>
          <CardHeader>
            <CardTitle>Detected Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.patterns.map((pattern: any) => (
                <div
                  key={pattern.id}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{pattern.pattern}</h4>
                    <Badge
                      variant={
                        pattern.impact === 'High'
                          ? 'destructive'
                          : pattern.impact === 'Medium'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {pattern.impact}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Frequency: {pattern.frequency} occurrences
                  </p>
                  <p className="text-sm">{pattern.suggestion}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Department Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Department Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.departments.map((dept: any) => (
                <div
                  key={dept.name}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{dept.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {dept.volume} tickets
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{dept.accuracy}%</p>
                    <p className="text-sm text-muted-foreground">accuracy</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>AI Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recommendations.map((rec: any) => (
              <div
                key={rec.id}
                className="border rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{rec.title}</h4>
                  <Badge
                    variant={
                      rec.priority === 'High'
                        ? 'destructive'
                        : rec.priority === 'Medium'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {rec.priority} Priority
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {rec.description}
                </p>
                <p className="text-sm font-medium text-green-600">
                  Estimated Impact: {rec.estimatedImpact}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
