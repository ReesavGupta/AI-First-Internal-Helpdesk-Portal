const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.token = localStorage.getItem('accessToken')
  }

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('accessToken', token)
    } else {
      localStorage.removeItem('accessToken')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    console.log(this.token)

    if (this.token) {
      headers['authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: 'An error occurred' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Auth endpoints
  login = async (data: { email: string; password: string }) => {
    return this.request<{ user: any; token: string; message: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  }

  register = async (data: any) => {
    const regssterData: any = await this.request<{
      user: any
      token: string
      message: string
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return regssterData.data
  }

  getProfile = async () => {
    const userData = await this.request<any>('/auth/me')
    return userData.data
  }

  updateProfile = async (data: any) => {
    return this.request<any>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  logout = async () => {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    })
  }

  // User endpoints
  getAllAgents = async () => {
    const response = await this.request<any>('/users/agents')
    return response.data // Assuming the backend returns { success: boolean, message: string, data: Agent[] }
  }

  // Tickets endpoints
  getTickets = async (filters?: any) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    const allTickets = await this.request<any>(`/tickets${query}`)

    return allTickets.data
  }

  getMyTickets = async (filters?: any) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    const myTickets = await this.request<any>(`/tickets/my-tickets${query}`)
    console.log(`this is myTickets:`, myTickets)
    return myTickets.data
  }

  getAssignedTickets = async (filters?: any) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    const assignedTicket = await this.request<any>(`/tickets/assigned${query}`)
    return assignedTicket.data
  }

  getTicket = async (id: string) => {
    console.log(`this is id:`, id)
    return this.request<any>(`/tickets/${id}`)
  }

  createTicket = async (data: any) => {
    return this.request<any>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  updateTicket = async (id: string, data: any) => {
    return this.request<any>(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  updateTicketStatus = async (id: string, status: string) => {
    return this.request<any>(`/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  }

  assignTicket = async (id: string, agentId: string) => {
    return this.request<any>(`/tickets/${id}/assign/${agentId}`, {
      method: 'PATCH',
    })
  }

  unassignTicket = async (id: string) => {
    return this.request<any>(`/tickets/${id}/unassign`, {
      method: 'PATCH',
    })
  }

  deleteTicket = async (id: string) => {
    return this.request<{ message: string }>(`/tickets/${id}`, {
      method: 'DELETE',
    })
  }

  getTicketResponses = async (id: string) => {
    return this.request<any[]>(`/tickets/${id}/responses`)
  }

  createTicketResponse = async (id: string, data: any) => {
    return this.request<any>(`/tickets/${id}/responses`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Departments endpoints
  getDepartments = async () => {
    const departments: any = await this.request<any[]>('/departments')
    console.log(`this is departments:`, departments)
    return departments.data.departments
  }

  getDepartment = async (id: string) => {
    return this.request<any>(`/departments/${id}`)
  }

  createDepartment = async (data: any) => {
    return this.request<any>('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  updateDepartment = async (id: string, data: any) => {
    return this.request<any>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  deleteDepartment = async (id: string) => {
    return this.request<{ message: string }>(`/departments/${id}`, {
      method: 'DELETE',
    })
  }

  getDepartmentAgents = async (id: string, page = 1, limit = 10) => {
    const response = await this.request<any>(
      `/departments/${id}/agents?page=${page}&limit=${limit}`
    )
    return response.data
  }

  getDepartmentTickets = async (id: string, page = 1, limit = 10) => {
    const response = await this.request<any>(
      `/departments/${id}/tickets?page=${page}&limit=${limit}`
    )
    return response.data
  }

  getDepartmentStats = async (id: string) => {
    const response = await this.request<any>(`/departments/${id}/stats`)
    return response.data
  }

  // Notifications endpoints
  getNotifications = async (filters?: any) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await this.request<any>(`/notifications${query}`)
    return response.data
  }

  getNotificationStats = async () => {
    const response = await this.request<any>('/notifications/stats')
    return response.data
  }

  markNotificationRead = async (id: string) => {
    return this.request<any>(`/notifications/${id}/read`, {
      method: 'PATCH',
    })
  }

  markAllNotificationsRead = async () => {
    return this.request<{ message: string; count: number }>(
      '/notifications/read-all',
      {
        method: 'PATCH',
      }
    )
  }

  deleteNotification = async (id: string) => {
    return this.request<{ message: string }>(`/notifications/${id}`, {
      method: 'DELETE',
    })
  }

  // FAQ endpoints
  getPublicFAQs = async (filters?: any) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    const faqs = await this.request<any>(`/faq/public${query}`)
    console.log(`this is faqs:`, faqs)
    return faqs.data
  }

  searchPublicFAQs = async (query: string, filters?: any) => {
    const params = new URLSearchParams({ query })
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }
    const finalQuery = params.toString() ? `?${params.toString()}` : ''
    const publcFaqs = await this.request<any>(`/faq/search/public${finalQuery}`)
    return publcFaqs.data
  }

  getFAQs = async (filters?: any) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await this.request<any>(`/faq${query}`)
    return response.data
  }

  searchFAQs = async (query: string, filters?: any) => {
    const params = new URLSearchParams({ query })
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }
    const finalQuery = params.toString() ? `?${params.toString()}` : ''
    const allfaqs = await this.request<any>(`/faq/search${finalQuery}`)
    console.log(`this is allfaqs:`, allfaqs)
    return allfaqs.data
  }

  getFAQ = async (id: string) => {
    return this.request<any>(`/faq/${id}`)
  }

  createFAQ = async (data: any) => {
    return this.request<any>('/faq', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  updateFAQ = async (id: string, data: any) => {
    return this.request<any>(`/faq/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  deleteFAQ = async (id: string) => {
    return this.request<{ message: string }>(`/faq/${id}`, {
      method: 'DELETE',
    })
  }

  // AI endpoints
  askAI = async (data: { question: string; context?: string }) => {
    const ai = await this.request<any>('/ai/ask', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return ai.data
  }

  getAIStatus = async () => {
    const aistatus = await this.request<any>('/ai/status')
    return aistatus.data
  }

  getAITicketAssignment = async (data: {
    title: string
    description: string
  }) => {
    return this.request<any>('/ai/assign-ticket', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  getAISuggestions = async (ticketId: string) => {
    return this.request<any>(`/ai/suggestions/${ticketId}`)
  }

  getAIInsights = async (params: { timeRange: string }) => {
    const queryParams = new URLSearchParams(params).toString()
    return this.request<any>(`/ai/insights?${queryParams}`)
  }

  batchProcessAI = async (data: any) => {
    return this.request<any>('/ai/batch-process', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  testAI = async (data: any) => {
    return this.request<any>('/ai/test', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
