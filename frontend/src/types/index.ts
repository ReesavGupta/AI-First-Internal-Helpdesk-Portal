export type UserRole = 'EMPLOYEE' | 'AGENT' | 'ADMIN'
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type FAQVisibility = 'PUBLIC' | 'INTERNAL'
export type NotificationType =
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_STATUS_UPDATED'
  | 'TICKET_RESPONSE'
  | 'SLA_WARNING'
  | 'ASSIGNMENT'
  | 'PATTERN_DETECTED'
  | 'SYSTEM_NOTIFICATION'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  role: UserRole
  departmentId?: string
  createdAt: string
  updatedAt: string
  department?: Department
}

export interface Department {
  id: string
  name: string
  keywords: string[]
  createdAt: string
  updatedAt: string
  users?: User[]
  tickets?: Ticket[]
}

export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  tags: string[]
  fileUrls: string[]
  departmentId: string
  createdById: string
  assignedToId?: string
  createdAt: string
  updatedAt: string
  department?: Department
  createdBy?: User
  assignedTo?: User
  responses?: TicketResponse[]
}

export interface TicketResponse {
  id: string
  content: string
  fileUrls: string[]
  ticketId: string
  userId: string
  createdAt: string
  user?: User
}

export interface FAQ {
  id: string
  question: string
  answer: string
  tags: string[]
  visibility: FAQVisibility
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  message: string
  type: NotificationType
  read: boolean
  readAt?: string
  targetUserId: string
  ticketId?: string
  metadata?: Record<string, any>
  createdAt: string
  ticket?: Ticket
}

export interface Document {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// API Request/Response types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  confirmPassword: string
  name: string
  role?: UserRole
  departmentId?: string
}

export interface AuthResponse {
  message: string
  user: User
  token: string
}

export interface CreateTicketRequest {
  title: string
  description: string
  priority?: TicketPriority
  tags?: string[]
  fileUrls?: string[]
  departmentId?: string
}

export interface UpdateTicketRequest {
  title?: string
  description?: string
  priority?: TicketPriority
  tags?: string[]
  fileUrls?: string[]
  assignedToId?: string
}

export interface CreateTicketResponseRequest {
  content: string
  fileUrls?: string[]
}

export interface TicketFilters {
  status?: TicketStatus
  priority?: TicketPriority
  departmentId?: string
  assignedToId?: string
  createdById?: string
  tags?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  currentPage: number
  totalPages: number
  total: number
}

export interface AIAskRequest {
  question: string
  context?: string
}

export interface AIAskResponse {
  answer: string
  sources?: Array<{
    type: 'FAQ' | 'Document'
    id: string
    title: string
    url?: string
  }>
}

export interface AIAssignTicketRequest {
  title: string
  description: string
}

export interface AIAssignTicketResponse {
  suggestedDepartmentId: string
  confidenceScore: number
  reasoning: string
}

export interface AISuggestion {
  id: string
  text: string
  confidenceScore: number
  sources?: any[]
}

export interface WebSocketMessage {
  type: string
  data: any
  timestamp: Date
}
