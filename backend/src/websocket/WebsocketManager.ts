// src/websocket/WebSocketManager.ts
import { WebSocket, WebSocketServer } from 'ws'
import { IncomingMessage } from 'http'
import jwt from 'jsonwebtoken'
import { prisma } from '../../prisma/client'

export interface AuthenticatedWebSocket extends WebSocket {
  userId: string
  userRole: string
  departmentId: string | null
  isAlive: boolean
  lastSeen: Date
}

export interface WebSocketMessage {
  type: string
  data: any
  timestamp: Date
}

export class WebSocketManager {
  private wss: WebSocketServer
  private connections: Map<string, Set<AuthenticatedWebSocket>> = new Map()
  private userConnections: Map<string, AuthenticatedWebSocket[]> = new Map()
  private ticketRooms: Map<string, Set<AuthenticatedWebSocket>> = new Map()
  private heartbeatInterval!: NodeJS.Timeout

  constructor(wss: WebSocketServer) {
    this.wss = wss
    this.setupWebSocketServer()
    this.startHeartbeat()
  }

  private setupWebSocketServer() {
    this.wss.on(
      'connection',
      async (ws: WebSocket, request: IncomingMessage) => {
        try {
          // Authenticate WebSocket connection
          const authWs = await this.authenticateConnection(ws, request)
          if (!authWs) {
            ws.close(1008, 'Authentication failed')
            return
          }

          // Setup connection
          this.setupConnection(authWs)

          console.log(`User ${authWs.userId} connected via WebSocket`)
        } catch (error) {
          console.error('WebSocket connection error:', error)
          ws.close(1011, 'Internal server error')
        }
      }
    )
  }

  private async authenticateConnection(
    ws: WebSocket,
    request: IncomingMessage
  ): Promise<AuthenticatedWebSocket | null> {
    try {
      // Extract token from query string or headers
      const url = new URL(request.url!, `http://${request.headers.host}`)
      const token =
        url.searchParams.get('token') ||
        request.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        console.log('No token provided for WebSocket connection')
        return null
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

      // Get user details from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          role: true,
          departmentId: true,
          name: true,
        },
      })

      if (!user) {
        console.log('User not found for WebSocket connection')
        return null
      }

      // Check connection limit (max 5 per user)
      const existingConnections = this.userConnections.get(user.id) || []
      if (existingConnections.length >= 5) {
        console.log(`Connection limit exceeded for user ${user.id}`)
        return null
      }

      // Create authenticated WebSocket
      const authWs = ws as AuthenticatedWebSocket
      authWs.userId = user.id
      authWs.userRole = user.role
      authWs.departmentId = user.departmentId
      authWs.isAlive = true
      authWs.lastSeen = new Date()

      return authWs
    } catch (error) {
      console.error('WebSocket authentication error:', error)
      return null
    }
  }

  private setupConnection(ws: AuthenticatedWebSocket) {
    // Add to user connections
    if (!this.userConnections.has(ws.userId)) {
      this.userConnections.set(ws.userId, [])
    }
    this.userConnections.get(ws.userId)!.push(ws)

    // Add to general connections pool
    if (!this.connections.has(ws.userId)) {
      this.connections.set(ws.userId, new Set())
    }
    this.connections.get(ws.userId)!.add(ws)

    // Setup message handlers
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString())
        this.handleMessage(ws, message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
        this.sendError(ws, 'Invalid message format')
      }
    })

    // Setup connection cleanup
    ws.on('close', () => {
      this.cleanupConnection(ws)
    })

    // Setup error handling
    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
      this.cleanupConnection(ws)
    })

    // Setup pong handler for heartbeat
    ws.on('pong', () => {
      ws.isAlive = true
      ws.lastSeen = new Date()
    })

    // Send welcome message
    this.sendToClient(ws, 'connected', {
      message: 'WebSocket connection established',
      userId: ws.userId,
      timestamp: new Date(),
    })
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: any) {
    const { type, data } = message

    switch (type) {
      case 'join':
        this.handleJoinRoom(ws, data)
        break
      case 'join_ticket':
        this.handleJoinTicket(ws, data)
        break
      case 'leave_ticket':
        this.handleLeaveTicket(ws, data)
        break
      case 'ping':
        this.sendToClient(ws, 'pong', { timestamp: new Date() })
        break
      default:
        this.sendError(ws, `Unknown message type: ${type}`)
    }
  }

  private handleJoinRoom(ws: AuthenticatedWebSocket, data: any) {
    // Users automatically join their notification room on connection
    this.sendToClient(ws, 'joined_room', {
      room: 'notifications',
      userId: ws.userId,
    })
  }

  private async handleJoinTicket(ws: AuthenticatedWebSocket, data: any) {
    const { ticketId } = data

    if (!ticketId) {
      this.sendError(ws, 'Ticket ID required')
      return
    }

    try {
      // Verify user has access to this ticket
      const hasAccess = await this.verifyTicketAccess(
        ws.userId,
        ws.userRole,
        ws.departmentId,
        ticketId
      )

      if (!hasAccess) {
        this.sendError(ws, 'Access denied to ticket')
        return
      }

      // Add to ticket room
      if (!this.ticketRooms.has(ticketId)) {
        this.ticketRooms.set(ticketId, new Set())
      }
      this.ticketRooms.get(ticketId)!.add(ws)

      this.sendToClient(ws, 'joined_ticket', {
        ticketId,
        message: 'Joined ticket room for real-time updates',
      })

      console.log(`User ${ws.userId} joined ticket room ${ticketId}`)
    } catch (error) {
      console.error('Error joining ticket room:', error)
      this.sendError(ws, 'Failed to join ticket room')
    }
  }

  private handleLeaveTicket(ws: AuthenticatedWebSocket, data: any) {
    const { ticketId } = data

    if (this.ticketRooms.has(ticketId)) {
      this.ticketRooms.get(ticketId)!.delete(ws)

      // Clean up empty rooms
      if (this.ticketRooms.get(ticketId)!.size === 0) {
        this.ticketRooms.delete(ticketId)
      }

      this.sendToClient(ws, 'left_ticket', { ticketId })
    }
  }

  private async verifyTicketAccess(
    userId: string,
    userRole: string,
    departmentId: string | null,
    ticketId: string
  ): Promise<boolean> {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          createdById: true,
          assignedToId: true,
          departmentId: true,
        },
      })

      if (!ticket) return false

      // Admin can access all tickets
      if (userRole === 'ADMIN') return true

      // Agent can access tickets in their department
      if (userRole === 'AGENT' && departmentId === ticket.departmentId)
        return true

      // Employee can access their own tickets
      if (userRole === 'EMPLOYEE' && userId === ticket.createdById) return true

      // Assigned user can access ticket
      if (userId === ticket.assignedToId) return true

      return false
    } catch (error) {
      console.error('Error verifying ticket access:', error)
      return false
    }
  }

  private cleanupConnection(ws: AuthenticatedWebSocket) {
    // Remove from user connections
    const userConnections = this.userConnections.get(ws.userId)
    if (userConnections) {
      const index = userConnections.indexOf(ws)
      if (index > -1) {
        userConnections.splice(index, 1)
      }
      if (userConnections.length === 0) {
        this.userConnections.delete(ws.userId)
      }
    }

    // Remove from general connections
    const connections = this.connections.get(ws.userId)
    if (connections) {
      connections.delete(ws)
      if (connections.size === 0) {
        this.connections.delete(ws.userId)
      }
    }

    // Remove from all ticket rooms
    this.ticketRooms.forEach((room, ticketId) => {
      room.delete(ws)
      if (room.size === 0) {
        this.ticketRooms.delete(ticketId)
      }
    })

    console.log(`User ${ws.userId} disconnected from WebSocket`)
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const authWs = ws as AuthenticatedWebSocket

        if (!authWs.isAlive) {
          console.log(
            `Terminating inactive connection for user ${authWs.userId}`
          )
          return authWs.terminate()
        }

        authWs.isAlive = false
        authWs.ping()
      })
    }, 30000) // 30 seconds
  }

  // Public methods for sending messages

  public sendToUser(userId: string, type: string, data: any) {
    const connections = this.connections.get(userId)
    if (!connections) {
      console.log(`No active connections for user ${userId}`)
      return false
    }

    const message = {
      type,
      data,
      timestamp: new Date(),
    }

    let sent = false
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
        sent = true
      }
    })

    return sent
  }

  public sendToTicket(
    ticketId: string,
    type: string,
    data: any,
    excludeUserId?: string
  ) {
    const room = this.ticketRooms.get(ticketId)
    if (!room) {
      console.log(`No active connections in ticket room ${ticketId}`)
      return false
    }

    const message = {
      type,
      data: {
        ...data,
        ticketId,
      },
      timestamp: new Date(),
    }

    let sent = false
    room.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN && ws.userId !== excludeUserId) {
        ws.send(JSON.stringify(message))
        sent = true
      }
    })

    return sent
  }

  public sendToDepartment(
    departmentId: string,
    type: string,
    data: any,
    excludeUserId?: string
  ) {
    let sent = false

    this.connections.forEach((connections, userId) => {
      if (userId === excludeUserId) return

      connections.forEach((ws) => {
        if (
          ws.readyState === WebSocket.OPEN &&
          ws.departmentId === departmentId
        ) {
          const message = {
            type,
            data,
            timestamp: new Date(),
          }
          ws.send(JSON.stringify(message))
          sent = true
        }
      })
    })

    return sent
  }

  public broadcast(type: string, data: any, excludeUserId?: string) {
    const message = {
      type,
      data,
      timestamp: new Date(),
    }

    this.wss.clients.forEach((ws) => {
      const authWs = ws as AuthenticatedWebSocket
      if (ws.readyState === WebSocket.OPEN && authWs.userId !== excludeUserId) {
        ws.send(JSON.stringify(message))
      }
    })
  }

  private sendToClient(ws: AuthenticatedWebSocket, type: string, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      const message = {
        type,
        data,
        timestamp: new Date(),
      }
      ws.send(JSON.stringify(message))
    }
  }

  private sendError(ws: AuthenticatedWebSocket, error: string) {
    this.sendToClient(ws, 'error', { message: error })
  }

  // Utility methods

  public getActiveUsers(): string[] {
    return Array.from(this.connections.keys())
  }

  public getUserConnectionCount(userId: string): number {
    return this.connections.get(userId)?.size || 0
  }

  public getTicketRoomUsers(ticketId: string): string[] {
    const room = this.ticketRooms.get(ticketId)
    if (!room) return []

    return Array.from(room).map((ws) => ws.userId)
  }

  public getTotalConnections(): number {
    return this.wss.clients.size
  }

  public cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
  }
}
