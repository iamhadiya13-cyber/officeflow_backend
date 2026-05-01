import express from 'express'
import { authController } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.get('/seed-credentials', authController.seedCredentials)
router.get('/validate-invite', authController.validateInvite)
router.post('/accept-invite', authController.acceptInvite)
router.post('/login', authController.login)
router.post('/logout', authenticate, authController.logout)
router.post('/refresh', authController.refresh)
router.put('/change-password', authenticate, authController.changePassword)

export default router
