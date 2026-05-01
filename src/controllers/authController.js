import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { User } from '../models/User.js'
import { RefreshToken } from '../models/RefreshToken.js'
import { successResponse, errorResponse } from '../utils/response.js'

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'none',
  secure: true,
  path: '/'
}

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId: userId.toString(), role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )
  const refreshToken = jwt.sign(
    { userId: userId.toString(), role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )
  return { accessToken, refreshToken }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json(errorResponse('Email and password are required'))
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash')

    if (!user || !user.isActive) {
      return res.status(401).json(errorResponse('Invalid email or password'))
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(401).json(errorResponse('Invalid email or password'))
    }

    const { accessToken, refreshToken } = generateTokens(user._id, user.role)

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })

    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() })

    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 })
    res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 })

    const userObj = user.toJSON()

    return res.json(successResponse('Login successful', {
      user: userObj,
      accessToken,
      refreshToken,
      mustChangePassword: user.mustChangePassword
    }))
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json(errorResponse('Login failed', err.message))
  }
}

const logout = async (req, res) => {
  try {
    const token = req.body?.refreshToken || req.cookies?.refreshToken
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      await RefreshToken.deleteOne({ tokenHash })
    }
    res.clearCookie('accessToken', COOKIE_OPTIONS)
    res.clearCookie('refreshToken', COOKIE_OPTIONS)
    return res.json(successResponse('Logged out successfully'))
  } catch (err) {
    return res.status(500).json(errorResponse('Logout failed'))
  }
}

const refresh = async (req, res) => {
  try {
    const token = req.body?.refreshToken || req.cookies?.refreshToken
    if (!token) return res.status(401).json(errorResponse('No refresh token'))
    
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const stored = await RefreshToken.findOne({ tokenHash, userId: decoded.userId })

    if (!stored) return res.status(401).json(errorResponse('Invalid refresh token'))

    const user = await User.findById(decoded.userId)
    if (!user || !user.isActive) return res.status(401).json(errorResponse('User not found'))

    await RefreshToken.deleteOne({ _id: stored._id })

    const { accessToken, refreshToken: newRefresh } = generateTokens(user._id, user.role)
    const newHash = crypto.createHash('sha256').update(newRefresh).digest('hex')

    await RefreshToken.create({
      userId: user._id,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })

    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 })
    res.cookie('refreshToken', newRefresh, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 })

    return res.json(successResponse('Token refreshed', { accessToken, refreshToken: newRefresh }))
  } catch (err) {
    return res.status(401).json(errorResponse('Token refresh failed'))
  }
}

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user._id).select('+passwordHash')
    
    if (!user.mustChangePassword) {
      if (!currentPassword) return res.status(400).json(errorResponse('Current password required'))
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isMatch) return res.status(400).json(errorResponse('Current password is incorrect'))
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json(errorResponse('New password must be at least 8 characters'))
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await User.findByIdAndUpdate(user._id, {
      passwordHash: hash,
      mustChangePassword: false
    })

    return res.json(successResponse('Password changed successfully'))
  } catch (err) {
    return res.status(500).json(errorResponse('Password change failed'))
  }
}

const seedCredentials = async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json(errorResponse('Not found'))
    }
    const users = await User.find({}).select('name email role department').lean()
    return res.json(successResponse('Seed credentials', {
      note: 'All passwords are Admin@1234',
      users: users.map(u => ({
        name: u.name,
        email: u.email,
        password: 'Admin@1234',
        role: u.role,
        department: u.department || ''
      }))
    }))
  } catch (err) {
    return res.status(500).json(errorResponse('Failed to load credentials', err.message))
  }
}

const acceptInvite = async (req, res) => {
  return res.json(successResponse('Accept invite endpoint'))
}

const validateInvite = async (req, res) => {
  return res.json(successResponse('Validate invite endpoint'))
}

export const authController = {
  login,
  logout,
  refresh,
  changePassword,
  seedCredentials,
  acceptInvite,
  validateInvite
}
