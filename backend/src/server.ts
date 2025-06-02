import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createServer } from 'http'
import rateLimit from 'express-rate-limit'
import { prisma } from '../prisma/client'
// Import routes
import authRoutes from './routes/auth.routes'
import ticketRoutes from './routes/tickets.routes'
import departmentRoutes from './routes/department.routes'
import faqRoutes from './routes/faq.routes'
import notificationRoutes from './routes/notification.routes'
import aiRoutes from './routes/ai.routes'
import userRoutes from './routes/user.routes'
import ragRoutes from './routes/rag.routes'
// import searchRoutes from './routes/search.routes'
// import analyticsRoutes from './routes/analytics' i do not want analytics

// Import middleware
import { errorHandler } from './utils/ErrorHandler'
import { notFound } from './middlewares/notFound'

// Import WebSocket server
import { initializeWebSocket } from './websocket/server'

// Load environment variables
dotenv.config()

// Initialize Prisma Client

const app = express()
const server = createServer(app)

// Trust proxy for rate limiting
app.set('trust proxy', 1)

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
)

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
)

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.',
// })

// app.use('/api/', limiter)

// Special rate limiting for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute for AI endpoints
  message: 'AI request limit exceeded, please try again later.',
})

app.use('/api/ai/', aiLimiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/departments', departmentRoutes)
app.use('/api/faq', faqRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/users', userRoutes)
app.use('/api/rag', ragRoutes)
// app.use('/api/search', searchRoutes)
// app.use('/api/analytics', analyticsRoutes)

// Error handling middleware
app.use(notFound)
app.use(errorHandler)

// Initialize WebSocket server
initializeWebSocket(server)

const PORT = process.env.PORT || 5000

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

// Start server
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server running on host 0.0.0.0 port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(
    `🔌 WebSocket server running on port ${process.env.WS_PORT || 5001}`
  )
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
