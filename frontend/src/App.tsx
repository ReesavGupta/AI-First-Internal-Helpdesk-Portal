'use client'

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TicketsPage } from '@/pages/tickets/TicketsPage'
import { TicketDetailPage } from '@/pages/tickets/TicketDetailPage'
import { CreateTicketPage } from '@/pages/tickets/CreateTicketPage'
import { MyTicketsPage } from '@/pages/tickets/MyTicketsPage'
import { AssignedTicketsPage } from '@/pages/tickets/AssignedTicketsPage'
import { DepartmentsPage } from '@/pages/departments/DepartmentsPage'
import { DepartmentDetailPage } from '@/pages/departments/DepartmentDetailPage'
import { FAQPage } from '@/pages/faq/FAQPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { AIAssistantPage } from '@/pages/ai/AIAssistantPage'
import { AIInsightsPage } from '@/pages/ai/AIInsightsPage'
import { DocumentManagementPage } from '@/pages/admin/DocumentManagementPage'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Toaster } from '@/components/ui/sonner'

function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <Routes>
          <Route
            path="/login"
            element={<LoginPage />}
          />
          <Route
            path="/register"
            element={<RegisterPage />}
          />
          <Route
            path="*"
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />
        </Routes>
        <Toaster />
      </>
    )
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route
            path="/"
            element={<DashboardPage />}
          />
          <Route
            path="/tickets"
            element={<TicketsPage />}
          />
          <Route
            path="/tickets/new"
            element={<CreateTicketPage />}
          />
          <Route
            path="/tickets/my"
            element={<MyTicketsPage />}
          />
          <Route
            path="/tickets/assigned"
            element={<AssignedTicketsPage />}
          />
          <Route
            path="/tickets/:id"
            element={<TicketDetailPage />}
          />
          <Route
            path="/departments"
            element={<DepartmentsPage />}
          />
          <Route
            path="/departments/:id"
            element={<DepartmentDetailPage />}
          />
          <Route
            path="/faq"
            element={<FAQPage />}
          />
          <Route
            path="/notifications"
            element={<NotificationsPage />}
          />
          <Route
            path="/profile"
            element={<ProfilePage />}
          />
          <Route
            path="/ai/assistant"
            element={<AIAssistantPage />}
          />
          <Route
            path="/ai/insights"
            element={<AIInsightsPage />}
          />
          <Route
            path="/admin/documents"
            element={<DocumentManagementPage />}
          />
          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </Layout>
      <Toaster />
    </>
  )
}

export default App
