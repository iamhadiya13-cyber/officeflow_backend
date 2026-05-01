import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { connectDB } from './config/db.js'
import { budgetService } from './services/budgetService.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import leaveRoutes from './routes/leave.js'
import expenseRoutes from './routes/expense.js'
import tripRoutes from './routes/trip.js'
import dashboardRoutes from './routes/dashboard.js'
import budgetRoutes from './routes/budget.js'
import exportRoutes from './routes/export.js'
import fundRoutes from './routes/fund.js'

const app = express()
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']
app.use(cors({ origin: allowedOrigins, credentials: true, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }))
app.options('*', cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(morgan('dev'))

app.use('/uploads', express.static('uploads'))

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/leave', leaveRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/budget', budgetRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/fund', fundRoutes)

// Profile alias — GET/PUT /api/profile/me → current user's own profile
import { authenticate as _authMw } from './middleware/auth.js'
app.get('/api/profile/me', _authMw, async (req, res) => {
  const { User } = await import('./models/User.js')
  const { successResponse, errorResponse } = await import('./utils/response.js')
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json(errorResponse('User not found'))
    return res.json(successResponse('Profile loaded', user.toJSON()))
  } catch (err) {
    return res.status(500).json(errorResponse(err.message))
  }
})
app.put('/api/profile/me', _authMw, async (req, res) => {
  const { User } = await import('./models/User.js')
  const { successResponse, errorResponse } = await import('./utils/response.js')
  try {
    const { name, department } = req.body
    const user = await User.findByIdAndUpdate(req.user._id, { name, department }, { new: true, runValidators: true })
    return res.json(successResponse('Profile updated', user.toJSON()))
  } catch (err) {
    return res.status(500).json(errorResponse(err.message))
  }
})

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` })
})

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  })
})

const start = async () => {
  await connectDB()
  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}

start()
