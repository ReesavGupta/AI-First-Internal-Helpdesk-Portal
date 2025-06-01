# Backend API Documentation

This document provides an overview of the backend API endpoints, data models, authentication mechanisms, and WebSocket communication protocols for the internal helpdesk system.

## Global Considerations

- **Base URL:** All REST API endpoints are prefixed with `/api`. For example, the login route is accessible at `/api/auth/login`.
- **Authentication:** Most protected routes require a JSON Web Token (JWT) to be included in the `Authorization` header as a Bearer token: `Authorization: Bearer <YOUR_JWT_TOKEN>`.
- **Content Type:** For API requests with a body and for API responses, the content type is generally `application/json` unless specified otherwise.
- **Date Format:** Dates in API responses (e.g., `createdAt`, `updatedAt` fields in models) are typically returned in ISO 8601 format (e.g., `"2023-10-27T10:30:00.000Z"`).
- **Error Responses:** While specific error messages vary, standard error responses usually follow the format `{ "message": "Error description" }`. Validation errors triggered by schema checks (e.g., for request bodies) may provide more detailed field-specific error messages.
- **ID Formats:** Unless otherwise specified, IDs for database records (e.g., User ID, Ticket ID) are CUIDs.

## Data Models (from `prisma/schema.prisma`)

### Enums

- `UserRole`: EMPLOYEE, AGENT, ADMIN
- `TicketStatus`: OPEN, IN_PROGRESS, RESOLVED, CLOSED
- `TicketPriority`: LOW, MEDIUM, HIGH
- `FAQVisibility`: PUBLIC, INTERNAL
- `NotificationType`: TICKET_CREATED, TICKET_ASSIGNED, TICKET_STATUS_UPDATED, TICKET_RESPONSE, SLA_WARNING, ASSIGNMENT, PATTERN_DETECTED, SYSTEM_NOTIFICATION

### Models

- **User**:
  - Fields: `id`, `email`, `password`, `name`, `avatarUrl`, `role`, `departmentId`, `createdAt`, `updatedAt`
  - Relations: `department`, `createdTickets`, `assignedTickets`, `notifications`, `ticketResponses`
- **Department**:
  - Fields: `id`, `name`, `keywords`, `createdAt`, `updatedAt`
  - Relations: `users`, `tickets`
- **Ticket**:
  - Fields: `id`, `title`, `description`, `status`, `priority`, `tags`, `fileUrls`, `departmentId`, `createdById`, `assignedToId`, `createdAt`, `updatedAt`
  - Relations: `department`, `createdBy` (User), `assignedTo` (User), `responses`, `notifications`
- **TicketResponse**:
  - Fields: `id`, `content`, `fileUrls`, `ticketId`, `userId`, `createdAt`
  - Relations: `ticket`, `user`
- **FAQ**:
  - Fields: `id`, `question`, `answer`, `tags`, `visibility`, `createdAt`, `updatedAt`
- **Notification**:
  - Fields: `id`, `message`, `type`, `read`, `readAt`, `targetUserId`, `ticketId`, `metadata`, `createdAt`
  - Relations: `targetUser` (User), `ticket`
- **Document**:
  - Fields: `id`, `title`, `content`, `category`, `tags`, `isActive`, `createdAt`, `updatedAt`

## Authentication

- Authentication is handled via JWT.
- The `authenticate` middleware protects routes.
- Role-based access control is implemented using `requireEmployee`, `requireAgent`, and `requireAdmin` middlewares.

## Feature to API Mapping

This backend is designed to support a ticket-based internal helpdesk with AI-powered enhancements. Here's how the core features map to the API:

- **Ticket-Based Helpdesk (IT, HR, Admin):**

  - **Data Models:** `Ticket`, `Department`, `User`, `TicketResponse`.
  - **Core APIs:** `/api/tickets/*`, `/api/departments/*`.
  - Departments can be configured (e.g., "IT", "HR", "Admin"). Tickets are created and assigned to these departments.

- **AI-Powered Add-ons:**
  - **Auto Routing Engine (to Department):**
    - AI reads incoming ticket details and suggests/assigns it to the correct department.
    - **API:** `POST /api/ai/assign-ticket` (Input: ticket title, description)
  - **Response Suggestion:**
    - AI suggests replies based on ticket content, category, and history.
    - **API:** `GET /api/ai/suggestions/:ticketId`
  - **Self-Serve Answer Bot:**
    - Users can ask questions, and AI answers from internal `Document` and `FAQ` knowledge bases.
    - **API:** `POST /api/ai/ask` (Input: user's question)
    - **Supporting Data:** `FAQ` model (`/api/faq/*`), `Document` model.
  - **Pattern Detector:**
    - AI identifies repetitive requests or potential misuse patterns from ticket data.
    - **API:** `GET /api/ai/insights`

## API Endpoints

### Auth (`/api/auth`)

- `POST /register`: Register a new user.

  - **Request Body:** `UserRegistrationInput`
    ```json
    {
      "email": "string (email format)",
      "password": "string (min 8 chars, 1 uppercase, 1 number)",
      "confirmPassword": "string (must match password)",
      "name": "string (min 2 chars, max 100)",
      "role": "EMPLOYEE | AGENT | ADMIN (optional, default: EMPLOYEE)",
      "departmentId": "string (cuid, optional)"
    }
    ```
  - **Response (Success 201):**
    ```json
    {
      "message": "User registered successfully",
      "user": {
        "id": "string",
        "email": "string",
        "name": "string",
        "role": "UserRole",
        "departmentId": "string | null",
        "avatarUrl": "string | null",
        "createdAt": "DateTime",
        "updatedAt": "DateTime"
      },
      "token": "string (JWT)"
    }
    ```
  - **Response (Error 400/409/500):**
    ```json
    {
      "message": "Error description"
    }
    ```

- `POST /login`: Login an existing user.

  - **Request Body:** `UserLoginInput`
    ```json
    {
      "email": "string (email format)",
      "password": "string"
    }
    ```
  - **Response (Success 200):**
    ```json
    {
      "message": "Login successful",
      "user": {
        "id": "string",
        "email": "string",
        "name": "string",
        "role": "UserRole",
        "departmentId": "string | null",
        "avatarUrl": "string | null"
      },
      "token": "string (JWT)"
    }
    ```
  - **Response (Error 400/401/500):**
    ```json
    {
      "message": "Error description"
    }
    ```

- `GET /me`: Get the current authenticated user's profile. (Protected)

  - **Response (Success 200):** `User` (Prisma model)
    ```json
    {
      "id": "string",
      "email": "string",
      "name": "string",
      "avatarUrl": "string | null",
      "role": "UserRole",
      "departmentId": "string | null",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    }
    ```
  - **Response (Error 401/404/500):**
    ```json
    {
      "message": "Error description"
    }
    ```

- `PUT /profile`: Update the current authenticated user's profile. (Protected)

  - **Request Body:** `UpdateUserInput`
    ```json
    {
      "name": "string (min 2, max 100, optional)",
      "avatarUrl": "string (url, optional, nullable)",
      "departmentId": "string (cuid, optional, nullable)"
    }
    ```
  - **Response (Success 200):** `User` (Prisma model)
    ```json
    {
      "id": "string",
      "email": "string",
      "name": "string",
      "avatarUrl": "string | null",
      "role": "UserRole",
      "departmentId": "string | null",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    }
    ```
  - **Response (Error 400/401/500):**
    ```json
    {
      "message": "Error description"
    }
    ```

- `POST /logout`: Logout the current user. (Protected)
  - **Response (Success 200):**
    ```json
    {
      "message": "Logout successful"
    }
    ```
  - **Response (Error 401/500):**
    ```json
    {
      "message": "Error description"
    }
    ```

### Tickets (`/api/tickets`)

- `POST /`: Create a new ticket. (Protected, Employee+)

  - **Request Body:** `CreateTicketInput`
    ```json
    {
      "title": "string (min 10, max 200)",
      "description": "string (min 20, max 5000)",
      "priority": "LOW | MEDIUM | HIGH (default: MEDIUM)",
      "tags": "string[] (max 10 items, each max 50 chars, default: [])",
      "fileUrls": "string[] (urls, max 5 items, default: [])",
      "departmentId": "string (cuid, optional - for AI auto-assignment)"
    }
    ```
  - **Response (Success 201):** `Ticket` (Prisma model, includes relations like `createdBy`, `department`)
    ```json
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "status": "TicketStatus (e.g., OPEN)",
      "priority": "TicketPriority",
      "tags": "string[]",
      "fileUrls": "string[]",
      "departmentId": "string",
      "createdById": "string",
      "assignedToId": "string | null",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
      // ... other populated relations like createdBy, department
    }
    ```
  - **Response (Error 400/401/500):** `{ "message": "Error description" }`

- `GET /`: Get all tickets with filters. (Protected, Agent+)

  - **Query Parameters:** `TicketFiltersInput`
    ```
    status?: "OPEN | IN_PROGRESS | RESOLVED | CLOSED"
    priority?: "LOW | MEDIUM | HIGH"
    departmentId?: "string (cuid)"
    assignedToId?: "string (cuid)"
    createdById?: "string (cuid)"
    tags?: "string (comma-separated)"
    startDate?: "string (datetime)"
    endDate?: "string (datetime)"
    page?: number (default: 1)
    limit?: number (default: 10, max: 100)
    ```
  - **Response (Success 200):**
    ```json
    {
      "tickets": [
        // Array of Ticket objects (Prisma model, with populated relations)
      ],
      "currentPage": "number",
      "totalPages": "number",
      "totalTickets": "number"
    }
    ```
  - **Response (Error 400/401/500):** `{ "message": "Error description" }`

- `GET /my-tickets`: Get tickets created by the current user. (Protected, Employee+)

  - **Query Parameters:** `TicketFiltersInput` (same as `GET /`)
  - **Response (Success 200):** (Same structure as `GET /`)
  - **Response (Error 400/401/500):** `{ "message": "Error description" }`

- `GET /assigned`: Get tickets assigned to the current user. (Protected, Agent+)

  - **Query Parameters:** `TicketFiltersInput` (same as `GET /`)
  - **Response (Success 200):** (Same structure as `GET /`)
  - **Response (Error 400/401/500):** `{ "message": "Error description" }`

- `GET /:id`: Get a specific ticket by ID. (Protected, Employee+, with `checkTicketAccess`)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Response (Success 200):** `Ticket` (Prisma model, with populated relations like `createdBy`, `assignedTo`, `department`, `responses`)
  - **Response (Error 401/403/404/500):** `{ "message": "Error description" }`

- `PUT /:id`: Update a ticket. (Protected, Employee+, with `checkTicketAccess`)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Request Body:** `UpdateTicketInput`
    ```json
    {
      "title": "string (min 10, max 200, optional)",
      "description": "string (min 20, max 5000, optional)",
      "priority": "LOW | MEDIUM | HIGH (optional)",
      "tags": "string[] (max 10 items, each max 50 chars, optional)",
      "fileUrls": "string[] (urls, max 5 items, optional)",
      "assignedToId": "string (cuid, nullable, optional)"
    }
    ```
  - **Response (Success 200):** `Ticket` (Prisma model, updated)
  - **Response (Error 400/401/403/404/500):** `{ "message": "Error description" }`

- `PATCH /:id/status`: Update ticket status. (Protected, Agent+, with `checkTicketAccess`)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Request Body:** `UpdateTicketStatusInput`
    ```json
    {
      "status": "OPEN | IN_PROGRESS | RESOLVED | CLOSED"
    }
    ```
  - **Response (Success 200):** `Ticket` (Prisma model, updated status)
  - **Response (Error 400/401/403/404/500):** `{ "message": "Error description" }`

- `PATCH /:id/assign/:agentId`: Assign a ticket to an agent. (Protected, Agent+)

  - **Path Parameters:**
    - `id`: "string (cuid, ticketId)"
    - `agentId`: "string (cuid, userId of the agent)"
  - **Response (Success 200):** `Ticket` (Prisma model, with updated `assignedToId`)
  - **Response (Error 400/401/403/404/500):** `{ "message": "Error description" }`

- `PATCH /:id/unassign`: Unassign a ticket. (Protected, Agent+)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Response (Success 200):** `Ticket` (Prisma model, with `assignedToId` set to null)
  - **Response (Error 400/401/403/404/500):** `{ "message": "Error description" }`

- `DELETE /:id`: Delete a ticket. (Protected, Admin only)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Response (Success 200):** `{ "message": "Ticket deleted successfully" }`
  - **Response (Error 401/403/404/500):** `{ "message": "Error description" }`

- `GET /:id/responses`: Get ticket responses. (Protected, Employee+, with `checkTicketAccess`)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Response (Success 200):** `TicketResponse[]` (Array of TicketResponse Prisma models, each with populated `user` relation)
  - **Response (Error 401/403/404/500):** `{ "message": "Error description" }`

- `POST /:id/responses`: Create a ticket response. (Protected, Employee+, with `checkTicketAccess`)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Request Body:** `CreateTicketResponseInput`
    ```json
    {
      "content": "string (min 1, max 5000)",
      "fileUrls": "string[] (urls, max 5 items, default: [])"
    }
    ```
  - **Response (Success 201):** `TicketResponse` (Prisma model, with populated `user` relation)
  - **Response (Error 400/401/403/404/500):** `{ "message": "Error description" }`

- `DELETE /:id/responses/:responseId`: Delete a ticket response. (Protected, Admin only)
  - **Path Parameters:**
    - `id`: "string (cuid, ticketId)"
    - `responseId`: "string (cuid, ticketResponseId)"
  - **Response (Success 200):** `{ "message": "Ticket response deleted successfully" }`
  - **Response (Error 401/403/404/500):** `{ "message": "Error description" }`

### Departments (`/api/departments`)

- `POST /`: Create a new department. (Protected, Admin only)

  - **Request Body:** `CreateDepartmentInput`
    ```json
    {
      "name": "string (min 2, max 100)",
      "keywords": "string[] (min 1 item, each non-empty)"
    }
    ```
  - **Response (Success 201):** `Department` (Prisma model)
    ```json
    {
      "id": "string",
      "name": "string",
      "keywords": "string[]",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    }
    ```
  - **Response (Error 400/401/403/500):** `{ "message": "Error description" }`

- `GET /`: Get all departments. (Protected)

  - **Response (Success 200):** `Department[]` (Array of Department Prisma models)
  - **Response (Error 401/500):** `{ "message": "Error description" }`

- `GET /:id`: Get a specific department by ID. (Protected)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Response (Success 200):** `Department` (Prisma model, potentially with populated `users` and `tickets` relations depending on controller logic)
  - **Response (Error 401/404/500):** `{ "message": "Error description" }`

- `PUT /:id`: Update a department. (Protected, Admin only)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Request Body:** `UpdateDepartmentInput`
    ```json
    {
      "name": "string (min 2, max 100, optional)",
      "keywords": "string[] (min 1 item, each non-empty, optional)"
    }
    ```
  - **Response (Success 200):** `Department` (Prisma model, updated)
  - **Response (Error 400/401/403/404/500):** `{ "message": "Error description" }`

- `DELETE /:id`: Delete a department. (Protected, Admin only)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Response (Success 200):** `{ "message": "Department deleted successfully" }`
  - **Response (Error 401/403/404/500):** `{ "message": "Error description" }`

- `GET /:id/agents`: Get agents in a department. (Protected, Agent+)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Query Parameters:** `PaginationInput` (`page`, `limit`)
  - **Response (Success 200):**
    ```json
    {
      "agents": [
        // Array of User objects (Prisma model, role: AGENT, filtered by departmentId)
      ],
      "currentPage": "number",
      "totalPages": "number",
      "totalAgents": "number"
    }
    ```
  - **Response (Error 400/401/403/404/500):** `{ "message": "Error description" }`

- `GET /:id/tickets`: Get tickets in a department. (Protected, Agent+)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Query Parameters:** `PaginationInput` (`page`, `limit`) (Potentially other ticket filters could be added here)
  - **Response (Success 200):**
    ```json
    {
      "tickets": [
        // Array of Ticket objects (Prisma model, filtered by departmentId, with populated relations)
      ],
      "currentPage": "number",
      "totalPages": "number",
      "totalTickets": "number"
    }
    ```
  - **Response (Error 400/401/403/404/500):** `{ "message": "Error description" }`

- `GET /:id/stats`: Get department statistics. (Protected, Agent+)
  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Response (Success 200):** (Structure depends on controller logic, e.g.)
    ```json
    {
      "departmentId": "string",
      "departmentName": "string",
      "totalTickets": "number",
      "openTickets": "number",
      "resolvedTickets": "number",
      "averageResolutionTime": "string | number"
      // ... other relevant stats
    }
    ```
  - **Response (Error 401/403/404/500):** `{ "message": "Error description" }`

### Notifications (`/api/notifications`)

- `GET /`: Get user's notifications. (Protected, Employee+)

  - **Query Parameters:** `NotificationFiltersSchema` (which includes `PaginationInput`)
    ```
    type?: "TICKET_CREATED | TICKET_ASSIGNED | TICKET_STATUS_UPDATED | TICKET_RESPONSE | SLA_WARNING | ASSIGNMENT | PATTERN_DETECTED | SYSTEM_NOTIFICATION"
    read?: boolean
    page?: number (default: 1)
    limit?: number (default: 10, max: 100)
    ```
  - **Response (Success 200):**
    ```json
    {
      "notifications": [
        // Array of Notification objects (Prisma model, with populated `ticket` relation if applicable)
      ],
      "currentPage": "number",
      "totalPages": "number",
      "totalNotifications": "number"
    }
    ```
  - **Response (Error 400/401/500):** `{ "message": "Error description" }`

- `GET /stats`: Get notification statistics for the current user. (Protected, Employee+)

  - **Response (Success 200):**
    ```json
    {
      "total": "number",
      "unread": "number"
    }
    ```
  - **Response (Error 401/500):** `{ "message": "Error description" }`

- `PATCH /:id/read`: Mark a notification as read. (Protected, Employee+)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Request Body:** (Note: `markNotificationReadSchema` has `read: z.boolean()`, but this route implies setting it to true. No body might be needed if the action is implicit, or it might expect `{"read": true}`)
    _(Assuming the controller sets `read: true` and `readAt: new Date()` without a body)_
  - **Response (Success 200):** `Notification` (Prisma model, updated)
  - **Response (Error 400/401/404/500):** `{ "message": "Error description" }`

- `PATCH /read-all`: Mark all notifications as read for current user. (Protected, Employee+)

  - **Response (Success 200):**
    ```json
    {
      "message": "All notifications marked as read",
      "count": "number (number of notifications updated)"
    }
    ```
  - **Response (Error 401/500):** `{ "message": "Error description" }`

- `DELETE /:id`: Delete a notification. (Protected, Employee+)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Response (Success 200):** `{ "message": "Notification deleted successfully" }`
  - **Response (Error 401/404/500):** `{ "message": "Error description" }`

- `POST /test`: Test notification endpoint. (Protected, Admin only)
  - **Request Body:** `TestNotificationSchema`
    ```json
    {
      "targetUserId": "string (cuid)",
      "message": "string",
      "type": "NotificationType (e.g., SYSTEM_NOTIFICATION)",
      "ticketId": "string (cuid, optional)",
      "metadata": "object (optional)"
    }
    ```
  - **Response (Success 200):** `{ "message": "Test notification sent successfully", "notification": NotificationObject }`
  - **Response (Error 400/401/403/500):** `{ "message": "Error description" }`

### FAQ (`/api/faq`)

- `GET /public`: Get public FAQs. (Public)

  - **Query Parameters:** `FAQFiltersInput` (subset, e.g., `tags`, `page`, `limit`; `visibility` is implicitly PUBLIC)
  - **Response (Success 200):**
    ```json
    {
      "faqs": [
        // Array of FAQ objects (Prisma model, visibility: PUBLIC)
      ],
      "currentPage": "number",
      "totalPages": "number",
      "totalFAQs": "number"
    }
    ```
  - **Response (Error 400/500):** `{ "message": "Error description" }`

- `GET /search/public`: Search public FAQs. (Public)

  - **Query Parameters:** (Likely `query: string`, and `FAQFiltersInput` for pagination/tags)
  - **Response (Success 200):** (Similar to `GET /public`)

- `GET /`: Get all FAQs (filtered by role). (Protected)

  - **Query Parameters:** `FAQFiltersInput` (`visibility`, `tags`, `page`, `limit`)
  - **Response (Success 200):** (Similar structure to `GET /public`, but FAQs can be INTERNAL or PUBLIC based on user role and query)
  - **Response (Error 400/401/500):** `{ "message": "Error description" }`

- `GET /search`: Internal search for FAQs. (Protected)

  - **Query Parameters:** (Likely `query: string`, and `FAQFiltersInput` for pagination/tags/visibility)
  - **Response (Success 200):** (Similar to `GET /`)

- `GET /:id`: Get a specific FAQ by ID. (Protected)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Response (Success 200):** `FAQ` (Prisma model)
    _(Access control might apply based on FAQ visibility and user role)_
  - **Response (Error 401/403/404/500):** `{ "message": "Error description" }`

- `POST /`: Create an FAQ. (Protected, Agent+, `validateFAQ` middleware which likely uses `createFAQSchema`)

  - **Request Body:** `CreateFAQInput`
    ```json
    {
      "question": "string (min 10, max 500)",
      "answer": "string (min 20, max 5000)",
      "tags": "string[] (max 10 items, each max 50 chars, default: [])",
      "visibility": "PUBLIC | INTERNAL (default: PUBLIC)"
    }
    ```
  - **Response (Success 201):** `FAQ` (Prisma model)
  - **Response (Error 400/401/403/500):** `{ "message": "Error description" }`

- `PUT /:id`: Update an FAQ. (Protected, Agent+, `validateFAQUpdate` middleware which likely uses `updateFAQSchema`)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Request Body:** `UpdateFAQInput`
    ```json
    {
      "question": "string (min 10, max 500, optional)",
      "answer": "string (min 20, max 5000, optional)",
      "tags": "string[] (max 10 items, each max 50 chars, optional)",
      "visibility": "PUBLIC | INTERNAL (optional)"
    }
    ```
  - **Response (Success 200):** `FAQ` (Prisma model, updated)
  - **Response (Error 400/401/403/404/500):** `{ "message": "Error description" }`

- `DELETE /:id`: Delete an FAQ. (Protected, Admin only)

  - **Path Parameters:** `idParamSchema` -> `{ "id": "string (cuid)" }`
  - **Response (Success 200):** `{ "message": "FAQ deleted successfully" }`
  - **Response (Error 401/403/404/500):** `{ "message": "Error description" }`

- `POST /bulk-import`: Bulk import FAQs. (Protected, Admin only)
  - **Request Body:** (Likely an array of `CreateFAQInput` or a specific bulk import schema)
    ```json
    {
      "faqs": [
        // Array of CreateFAQInput objects
      ]
    }
    ```
  - **Response (Success 200/201):**
    ```json
    {
      "message": "FAQs imported successfully",
      "importedCount": "number",
      "failedCount": "number",
      "errors": [
        // Optional: array of errors for failed imports
      ]
    }
    ```
  - **Response (Error 400/401/403/500):** `{ "message": "Error description" }`

### AI (`/api/ai`)

- `POST /ask`: Ask AI a question (chatbot). (Protected, Employee+, `checkAIRateLimit`)

  - **Request Body:** `AiAskQuestionInput`
    ```json
    {
      "question": "string (min 5, max 1000)",
      "context": "string (max 2000, optional)" // Optional context like current page, previous interaction
    }
    ```
  - **Response (Success 200):**
    ```json
    {
      "answer": "string (AI generated answer)",
      "sources": [
        // Optional: array of source documents/FAQs used for the answer
        {
          "type": "FAQ | Document",
          "id": "string",
          "title": "string",
          "url": "string (link to the source if applicable)"
        }
      ]
    }
    ```
  - **Response (Error 400/401/429/500):** `{ "message": "Error description" }`

- `GET /status`: Get AI service status. (Protected, Employee+)

  - **Response (Success 200):**
    ```json
    {
      "status": "OK | DEGRADED | DOWN",
      "models_available": "string[] (e.g., ['text-davinci-003', 'gpt-3.5-turbo'])",
      "usage_today": {
        "requests": "number",
        "tokens_processed": "number"
      }
      // ... other relevant AI service stats
    }
    ```
  - **Response (Error 401/500):** `{ "message": "Error description" }`

- `POST /assign-ticket`: Auto-assign ticket to department using AI. (Protected, Agent+, `checkAIRateLimit`)

  - **Request Body:** (The route file specifies `{ title: string, description: string }`. This should ideally be a defined schema like `AiAssignTicketInput`)
    ```json
    {
      "title": "string",
      "description": "string"
      // Potentially could also include ticketId if an existing ticket needs reassignment suggestion
    }
    ```
  - **Response (Success 200):**
    ```json
    {
      "suggestedDepartmentId": "string (cuid)",
      "confidenceScore": "number (0-1)",
      "reasoning": "string (explanation from AI)"
    }
    ```
  - **Response (Error 400/401/403/429/500):** `{ "message": "Error description" }`

- `GET /suggestions/:ticketId`: Get AI response suggestions for a ticket. (Protected, Employee+, `checkAIRateLimit`)

  - **Path Parameters:** `idParamSchema` (for `ticketId`) -> `{ "id": "string (cuid)" }`
  - **Response (Success 200):**
    ```json
    {
      "suggestions": [
        {
          "id": "string (suggestion_id)",
          "text": "string (suggested response text)",
          "confidenceScore": "number (0-1)",
          "sources": [
            // Optional: array of source documents/FAQs/past tickets used
          ]
        }
      ]
    }
    ```
  - **Response (Error 400/401/403/404/429/500):** `{ "message": "Error description" }`

- `GET /insights`: Get AI pattern insights. (Protected, Admin only, `checkAIRateLimit`)

  - **Query Parameters:** `AnalyticsDateRangeSchema` (Optional: `startDate`, `endDate`, `departmentId`, `agentId`)
  - **Response (Success 200):** (Structure will vary based on the insights generated)
    ```json
    {
      "commonIssues": [
        { "pattern": "string", "count": "number", "suggestedAction": "string" }
      ],
      "performanceMetrics": {
        "averageResponseTime": "string",
        "resolutionRate": "number"
      },
      "misusePatterns": [] // if any detected
      // ... other insights
    }
    ```
  - **Response (Error 400/401/403/429/500):** `{ "message": "Error description" }`

- `POST /batch-process`: Batch process tickets for AI actions. (Protected, Admin only, `checkAIRateLimit`)

  - **Request Body:** `AiBatchProcessInput` (Assuming this schema exists or should be created)
    ```json
    {
      "ticketIds": "string[] (cuid)",
      "action": "reassign | suggest_responses | analyze_sentiment"
    }
    ```
  - **Response (Success 200):**
    ```json
    {
      "message": "Batch processing started",
      "batchId": "string",
      "statusUrl": "string (URL to check batch status, optional)"
    }
    ```
    (Actual results might be delivered via notifications or another endpoint)
  - **Response (Error 400/401/403/429/500):** `{ "message": "Error description" }`

- `POST /test`: Test AI functionality. (Protected, Admin only)
  - **Request Body:**
    ```json
    {
      "testType": "string (e.g., 'sentiment', 'classification', 'summarization')",
      "testData": "any (structure depends on testType)"
    }
    ```
  - **Response (Success 200):**
    ```json
    {
      "message": "AI test successful",
      "result": "any (structure depends on testType and testData)"
    }
    ```
  - **Response (Error 400/401/403/500):** `{ "message": "Error description" }`

## WebSocket Communication (`/ws`)

WebSocket communication is handled by `WebsocketManager.ts`.

### Connection

- Clients connect to `/ws` endpoint.
- Authentication is performed via a JWT token passed as a query parameter (`token`) or in the `Authorization` header (`Bearer <token>`).
- Maximum 5 connections per user.
- Heartbeat mechanism is in place to keep connections alive (ping/pong every 30 seconds).

### Message Format

Messages are JSON objects with the following structure:

```json
{
  "type": "string", // Message type
  "data": "any", // Message payload
  "timestamp": "Date" // Timestamp of the message
}
```

### Client-to-Server Messages

- **`join`**: (No specific data, user automatically joins their notification room)
  - Server Response: `joined_room` with `{ room: 'notifications', userId: string }`
- **`join_ticket`**: Client requests to join a specific ticket room.
  - Data: `{ ticketId: string }`
  - Server Response: `joined_ticket` with `{ ticketId: string, message: string }` if successful, or `error`.
  - Requires user to have access to the ticket (Admin, Agent in department, Employee created ticket, or assigned user).
- **`leave_ticket`**: Client requests to leave a specific ticket room.
  - Data: `{ ticketId: string }`
  - Server Response: `left_ticket` with `{ ticketId: string }`.
- **`ping`**: Client sends a ping to keep the connection alive.
  - Server Response: `pong` with `{ timestamp: Date }`.

### Server-to-Client Messages

- **`connected`**: Sent upon successful WebSocket connection.
  - Data: `{ message: string, userId: string, timestamp: Date }`
- \*\*`error`
