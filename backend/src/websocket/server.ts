// src/websocket/server.ts (Fixed version)
import { Server } from 'http'
import { WebSocketServer } from 'ws'
import { WebSocketManager } from './WebsocketManager'
import { initializeNotificationService } from '../services/notification.service'

let wsManager: WebSocketManager
let notificationService: any

export function initializeWebSocket(server: Server) {
  // Create WebSocket server
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    perMessageDeflate: false,
    maxPayload: 1024 * 1024, // 1MB max message size
  })

  // Initialize WebSocket manager
  wsManager = new WebSocketManager(wss)

  // Initialize notification service with WebSocket manager
  notificationService = initializeNotificationService(wsManager)

  console.log('🔌 WebSocket server initialized on /ws')
  console.log('🔔 Notification service connected to WebSocket manager')

  // Handle server shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down WebSocket server...')
    wss.close()
    wsManager.cleanup()
  })

  process.on('SIGINT', () => {
    console.log('Shutting down WebSocket server...')
    wss.close()
    wsManager.cleanup()
  })

  return { wsManager, notificationService }
}

// Export singleton instances
export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    throw new Error(
      'WebSocket manager not initialized. Call initializeWebSocket first.'
    )
  }
  return wsManager
}

export function getNotificationService() {
  if (!notificationService) {
    throw new Error(
      'Notification service not initialized. Call initializeWebSocket first.'
    )
  }
  return notificationService
}
