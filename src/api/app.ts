import express from 'express'
import cors from 'cors'
import videoRoutes from './routes/video-routes'
import authRoutes from './routes/auth-routes'
import companyRoutes from './routes/company-routes'
import profileRoutes from './routes/profile-routes'
import { requireAuth } from './middleware/auth'

const app = express()

// Get allowed origins from environment variable
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || []

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}

// Apply CORS middleware
app.use(cors(corsOptions))

// Middleware for parsing JSON bodies
app.use(express.json())

// Handle preflight requests
app.options('*', cors(corsOptions))

// Public routes (no auth required)
app.use('/api/auth', authRoutes)

// Protected routes (require authentication)
app.use('/api', requireAuth) // Apply requireAuth to all routes under /api except /api/auth
app.use('/api/videos', videoRoutes)
app.use('/api/companies', companyRoutes)
app.use('/api/profiles', profileRoutes)

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something broke!' })
})

export default app 