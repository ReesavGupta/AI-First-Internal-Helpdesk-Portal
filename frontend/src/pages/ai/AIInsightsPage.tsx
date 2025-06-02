'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Users,
  Clock,
  AlertTriangle,
  ClipboardList,
  Lightbulb,
  CheckSquare,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Define more specific types based on the actual API response
interface InsightSummary {
  totalTickets: number
  autoAssigned: number
  accurateAssignments: number // Percentage
  avgResolutionTime: string // e.g., "2.5 hours" or "N/A"
  satisfactionScore: string | number // e.g., 4.5 or "N/A"
}

interface Pattern {
  id: string
  pattern: string
  frequency: number
  impact: 'High' | 'Medium' | 'Low'
  suggestion: string
}

interface DepartmentInsight {
  name: string
  accuracy: number // Percentage
  volume: number
}

interface Recommendation {
  id: string
  title: string
  description: string
  priority: 'High' | 'Medium' | 'Low'
  estimatedImpact: string
}

interface AIInsightsData {
  summary: InsightSummary
  patterns: Pattern[]
  departments: DepartmentInsight[]
  recommendations: Recommendation[]
}

// Add ApiResponse interface to represent the common envelope
interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export function AIInsightsPage() {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState('7d')

  const {
    data: apiResponse, // Renamed from insightsData for clarity
    isLoading,
    error,
  } = useQuery<ApiResponse<AIInsightsData>, Error>({
    // Updated type to ApiResponse<AIInsightsData>
    queryKey: ['ai-insights', timeRange],
    queryFn: () => apiClient.getAIInsights({ timeRange }),
    enabled: user?.role === 'ADMIN',
  })

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

  if (error) {
    return (
      <Alert
        variant="destructive"
        className="mt-4"
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Fetching AI Insights</AlertTitle>
        <AlertDescription>
          {error.message || 'An unexpected error occurred.'}
        </AlertDescription>
      </Alert>
    )
  }

  // Adjusted check for no data or unsuccessful response
  if (!apiResponse || !apiResponse.success || !apiResponse.data) {
    let alertTitle = 'No Data Available'
    let alertDescription =
      'AI insights data could not be loaded or is not available for the selected period.'
    let alertVariant: 'default' | 'destructive' | 'warning' | undefined =
      'default'

    if (apiResponse) {
      if (!apiResponse.success) {
        alertTitle = 'Operation Unsuccessful'
        alertDescription =
          apiResponse.message || 'Failed to retrieve AI insights.'
        alertVariant = 'warning'
      } else if (!apiResponse.data) {
        alertDescription =
          "Received a response but no insights data was found in the 'data' field."
        alertVariant = 'default'
      }
    } else {
      alertDescription = 'No response received from the server for AI insights.'
      alertVariant = 'default'
    }

    return (
      <Alert
        variant={alertVariant as 'default' | 'destructive'}
        className="mt-4"
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{alertTitle}</AlertTitle>
        <AlertDescription>{alertDescription}</AlertDescription>
      </Alert>
    )
  }

  const data = apiResponse.data // Extract the actual insights data from the envelope

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI-Powered Insights</h1>
          <p className="text-muted-foreground">
            Analytics, patterns, and recommendations detected by our AI engine.
          </p>
        </div>
        <Select
          value={timeRange}
          onValueChange={setTimeRange}
        >
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Select time range" />
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.summary.totalTickets}
            </div>
            <p className="text-xs text-muted-foreground">
              In selected period ({timeRange})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Assigned</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.summary.autoAssigned}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.totalTickets > 0
                ? `${Math.round(
                    (data.summary.autoAssigned / data.summary.totalTickets) *
                      100
                  )}% of total`
                : '0% of total'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assignment Accuracy
            </CardTitle>
            <CheckSquare className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.summary.accurateAssignments}%
            </div>
            <p className="text-xs text-muted-foreground">
              AI assignment correctness
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Resolution Time
            </CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.summary.avgResolutionTime}
            </div>
            <p className="text-xs text-muted-foreground">
              For resolved tickets
            </p>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Satisfaction Score
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {typeof data.summary.satisfactionScore === 'number'
                ? `${data.summary.satisfactionScore}/5`
                : data.summary.satisfactionScore}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall user satisfaction
            </p>
          </CardContent>
        </Card> */}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Detected Patterns */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ClipboardList className="h-6 w-6 mr-2 text-primary" /> Detected
              Patterns
            </CardTitle>
            <CardDescription>
              Key trends and anomalies identified by AI in the ticket data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.patterns && data.patterns.length > 0 ? (
              <div className="space-y-4">
                {data.patterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-base">
                        {pattern.pattern}
                      </h4>
                      <Badge
                        variant={
                          pattern.impact === 'High'
                            ? 'destructive'
                            : pattern.impact === 'Medium'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {pattern.impact} Impact
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Frequency:{' '}
                      <span className="font-medium">{pattern.frequency}</span>{' '}
                      tickets
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Suggestion: {pattern.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No significant patterns detected for this period.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Department Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-6 w-6 mr-2 text-primary" /> Department
              Insights
            </CardTitle>
            <CardDescription>
              Ticket volume and AI assignment accuracy per department.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.departments && data.departments.length > 0 ? (
              <div className="space-y-3">
                {data.departments.map((dept) => (
                  <div
                    key={dept.name}
                    className="border rounded-lg p-3 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <h5 className="font-medium">{dept.name}</h5>
                      <Badge variant="outline">{dept.volume} tickets</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI Assignment Accuracy: {dept.accuracy}%
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No department-specific data available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actionable Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="h-6 w-6 mr-2 text-primary" /> Actionable
            Recommendations
          </CardTitle>
          <CardDescription>
            AI-suggested actions to optimize helpdesk performance and user
            satisfaction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recommendations && data.recommendations.length > 0 ? (
            <div className="space-y-4">
              {data.recommendations.map((reco) => (
                <div
                  key={reco.id}
                  className="border rounded-lg p-4 shadow-sm hover:shadow-lg transition-shadow bg-gradient-to-r from-background to-secondary/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-lg">{reco.title}</h4>
                    <Badge
                      variant={
                        reco.priority === 'High'
                          ? 'destructive'
                          : reco.priority === 'Medium'
                          ? 'default'
                          : reco.priority === 'Low'
                          ? 'secondary'
                          : 'default'
                      }
                    >
                      {reco.priority} Priority
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {reco.description}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Est. Impact: {reco.estimatedImpact}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No specific recommendations available at this time.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
