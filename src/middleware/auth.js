import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
const authenticate = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-passwordHash')

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' })
    }

    const changePwdPaths = ['/api/auth/change-password', '/api/auth/logout']
    if (user.mustChangePassword && !changePwdPaths.some(p => req.originalUrl.includes(p))) {
      return res.status(403).json({
        success: false,
        message: 'You must change your password before continuing',
        code: 'MUST_CHANGE_PASSWORD'
      })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}
export { authenticate }
