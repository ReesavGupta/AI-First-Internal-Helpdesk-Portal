'use client'

import type React from 'react'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import type { WebSocketMessage } from '@/types'

interface WebSocketContextType {
  isConnected: boolean
  sendMessage: (message: WebSocketMessage) => void
  joinTicket: (ticketId: string) => void
  leaveTicket: (ticketId: string) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
)

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws'

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>()

  const connect = () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !user) return

    try {
      const ws = new WebSocket(`${WS_URL}?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'ping',
                data: {},
                timestamp: new Date(),
              })
            )
          }
        }, 30000)
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        cleanup()

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (user) {
            connect()
          }
        }, 3000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
    }
  }

  const cleanup = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
  }

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
        console.log('WebSocket connection confirmed:', message.data)
        break
      case 'notification':
        // Dispatch custom event for notifications
        window.dispatchEvent(
          new CustomEvent('ws-notification', { detail: message.data })
        )
        break
      case 'ticket_update':
        // Dispatch custom event for ticket updates
        window.dispatchEvent(
          new CustomEvent('ws-ticket-update', { detail: message.data })
        )
        break
      case 'pong':
        // Heartbeat response
        break
      default:
        console.log('Unhandled WebSocket message:', message)
    }
  }

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }

  const joinTicket = (ticketId: string) => {
    sendMessage({
      type: 'join_ticket',
      data: { ticketId },
      timestamp: new Date(),
    })
  }

  const leaveTicket = (ticketId: string) => {
    sendMessage({
      type: 'leave_ticket',
      data: { ticketId },
      timestamp: new Date(),
    })
  }

  useEffect(() => {
    if (user) {
      connect()
    } else {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }

    return () => {
      cleanup()
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [user])

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        sendMessage,
        joinTicket,
        leaveTicket,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
