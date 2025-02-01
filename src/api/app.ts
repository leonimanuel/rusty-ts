import express from 'express'
import videoRoutes from './routes/video-routes'

const app = express()

// Middleware for parsing JSON bodies
app.use(express.json())

// API Routes
app.use('/api/videos', videoRoutes)

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something broke!' })
})

export default app 