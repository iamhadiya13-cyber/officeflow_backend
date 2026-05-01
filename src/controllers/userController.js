import { User } from '../models/User.js'
import { successResponse, errorResponse } from '../utils/response.js'

const getAll = async (req, res) => {
  try {
    const { role, _id: userId } = req.user
    const { page = 1, limit = 10, search = '', role: roleFilter } = req.query
    const query = {}

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { department: { $regex: escaped, $options: 'i' } },
      ]
    }

    if (roleFilter) {
      query.role = roleFilter
    }

    // Removed manager scoping: all users see all users

    const skip = (Number(page) - 1) * Number(limit)

    const [users, total] = await Promise.all([
      User.find(query)
        .populate('managerId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query)
    ])

    const data = users.map((user) => {
      const item = user.toJSON()
      return {
        ...item,
        manager_name: user.managerId?.name || '-',
        is_active: item.isActive,
        created_at: item.createdAt,
      }
    })

    return res.json(successResponse('Users loaded', data, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    }))
  } catch (err) {
    return res.status(500).json(errorResponse(err.message))
  }
}

const getOne = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json(errorResponse('User not found'))
    return res.json(successResponse('User loaded', user))
  } catch (err) {
    return res.status(500).json(errorResponse(err.message))
  }
}

const create = async (req, res) => {
  try {
    const bcrypt = (await import('bcryptjs')).default
    const { name, email, password, role, department, managerId, dateOfBirth } = req.body
    if (req.user.role !== 'SUPER_ADMIN' && role === 'SUPER_ADMIN') {
      return res.status(403).json(errorResponse('Only Super Admins can create super admin users'))
    }
    const passwordHash = await bcrypt.hash(password || 'Admin@1234', 12)
    const user = await User.create({ name, email, passwordHash, role, department, managerId, dateOfBirth, mustChangePassword: true })
    
    // Create their initial LeaveBalance
    const { LeaveType } = await import('../models/LeaveType.js')
    const { LeaveBalance } = await import('../models/LeaveBalance.js')
    const annualLeave = await LeaveType.findOne({ name: 'Annual Leave' })
    if (annualLeave) {
      await LeaveBalance.create({
        userId: user._id,
        leaveTypeId: annualLeave._id,
        year: new Date().getFullYear(),
        usedDays: 0,
        remainingDays: annualLeave.daysAllowed || 12,
        extraLeaves: 0,
      })
    }

    return res.status(201).json(successResponse('User created', user))
  } catch (err) {
    return res.status(500).json(errorResponse(err.message))
  }
}

const update = async (req, res) => {
  try {
    const { name, role, department, managerId, isActive, dateOfBirth } = req.body
    if (req.user.role !== 'SUPER_ADMIN' && role === 'SUPER_ADMIN') {
      return res.status(403).json(errorResponse('Only Super Admins can assign super admin role'))
    }
    const user = await User.findByIdAndUpdate(req.params.id, { name, role, department, managerId, isActive, dateOfBirth }, { new: true, runValidators: true })
    return res.json(successResponse('User updated', user))
  } catch (err) {
    return res.status(500).json(errorResponse(err.message))
  }
}

const deactivate = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false })
    return res.json(successResponse('User deactivated'))
  } catch (err) {
    return res.status(500).json(errorResponse(err.message))
  }
}

const invite = async (_req, res) => res.json(successResponse('Invite sent'))
const getInvites = async (_req, res) => res.json(successResponse('Invites', []))
const cancelInvite = async (_req, res) => res.json(successResponse('Invite cancelled'))
const resendInvite = async (_req, res) => res.json(successResponse('Invite resent'))

const resetPassword = async (req, res) => {
  try {
    const bcrypt = (await import('bcryptjs')).default
    const { newPassword } = req.body
    const hash = await bcrypt.hash(newPassword, 12)
    await User.findByIdAndUpdate(req.params.id, { passwordHash: hash, mustChangePassword: true })
    return res.json(successResponse('Password reset'))
  } catch (err) {
    return res.status(500).json(errorResponse(err.message))
  }
}

const addExtraLeaves = async (_req, res) => res.json(successResponse('Extra leaves added'))

const getEmployeeList = async (req, res) => {
  try {
    const { role, _id: userId } = req.user;
    
    // Show all active users to all roles so they can filter expenses by anyone
    let query = { isActive: true };

    const users = await User.find(query).select('name department role').sort({ name: 1 });
    const list = users.map(u => ({ id: u._id.toString(), name: u.name, department: u.department || '', role: u.role }));
    return res.json(successResponse('Employee list', list));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const userController = { getAll, getOne, create, update, deactivate, invite, getInvites, cancelInvite, resendInvite, resetPassword, addExtraLeaves, getEmployeeList }
