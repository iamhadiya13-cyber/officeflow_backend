import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDB } from '../config/db.js'

import { User } from '../models/User.js'
import { RefreshToken } from '../models/RefreshToken.js'
import { LeaveType } from '../models/LeaveType.js'
import { LeaveBalance } from '../models/LeaveBalance.js'
import { LeaveRequest } from '../models/LeaveRequest.js'
import { OtherLeaveRequest } from '../models/OtherLeaveRequest.js'
import { ExpenseRequest } from '../models/ExpenseRequest.js'
import { ExpenseSettlement } from '../models/ExpenseSettlement.js'
import { TripRequest } from '../models/TripRequest.js'
import { MonthlyBudget } from '../models/MonthlyBudget.js'
import { EmployeeFund } from '../models/EmployeeFund.js'
import { EmployeeFundContribution } from '../models/EmployeeFundContribution.js'
import { EmployeeFundAdjustment } from '../models/EmployeeFundAdjustment.js'
import { AuditLog } from '../models/AuditLog.js'
import { budgetService } from '../services/budgetService.js'
import { toDecimal } from '../utils/validators.js'

const seed = async () => {
  await connectDB()
  console.log('Clearing all collections...')
  
  await Promise.all([
    User.deleteMany({}),
    RefreshToken.deleteMany({}),
    LeaveType.deleteMany({}),
    LeaveBalance.deleteMany({}),
    LeaveRequest.deleteMany({}),
    OtherLeaveRequest.deleteMany({}),
    ExpenseRequest.deleteMany({}),
    ExpenseSettlement.deleteMany({}),
    TripRequest.deleteMany({}),
    MonthlyBudget.deleteMany({}),
    EmployeeFund.deleteMany({}),
    EmployeeFundContribution.deleteMany({}),
    EmployeeFundAdjustment.deleteMany({}),
    AuditLog.deleteMany({})
  ])

  console.log('Creating users...')
  const passwordHash = await bcrypt.hash('Admin@1234', 12)
  const currentYear = new Date().getFullYear()

  const admin = await User.create({ name: 'Super Admin', email: 'admin@company.com', passwordHash, role: 'SUPER_ADMIN', department: 'Management', isActive: true, mustChangePassword: false, dateOfBirth: new Date('1990-01-15') })
  const manager1 = await User.create({ name: 'Rahul Sharma', email: 'rahul@company.com', passwordHash, role: 'MANAGER', department: 'Engineering', isActive: true, mustChangePassword: false, dateOfBirth: new Date('1988-03-10') })
  const manager2 = await User.create({ name: 'Priya Verma', email: 'priya@company.com', passwordHash, role: 'MANAGER', department: 'Operations', isActive: true, mustChangePassword: false, dateOfBirth: new Date('1992-07-22') })
  const emp1 = await User.create({ name: 'Sneha Patel', email: 'sneha@company.com', passwordHash, role: 'EMPLOYEE', department: 'Engineering', managerId: manager1._id, isActive: true, mustChangePassword: false, dateOfBirth: new Date('1995-03-05') })
  const emp2 = await User.create({ name: 'Amit Kumar', email: 'amit@company.com', passwordHash, role: 'EMPLOYEE', department: 'Engineering', managerId: manager1._id, isActive: true, mustChangePassword: false, dateOfBirth: new Date('1993-11-18') })
  const emp3 = await User.create({ name: 'Anita Desai', email: 'anita@company.com', passwordHash, role: 'EMPLOYEE', department: 'Operations', managerId: manager2._id, isActive: true, mustChangePassword: false, dateOfBirth: new Date('1991-02-28') })
  const emp4 = await User.create({ name: 'Vikram Mehta', email: 'vikram@company.com', passwordHash, role: 'EMPLOYEE', department: 'Operations', managerId: manager2._id, isActive: true, mustChangePassword: false, dateOfBirth: new Date('1994-08-14') })
  
  const allUsers = [admin, manager1, manager2, emp1, emp2, emp3, emp4]

  console.log('Creating leave types...')
  const annualLeave = await LeaveType.create({ name: 'Annual Leave', daysAllowed: 12, carryForward: false })

  console.log('Creating leave balances...')
  await Promise.all(allUsers.map(u => LeaveBalance.create({ userId: u._id, leaveTypeId: annualLeave._id, year: currentYear, usedDays: 0, remainingDays: 12, extraLeaves: 0 })))

  console.log('Creating monthly budget...')
  await MonthlyBudget.create({ monthlyAmount: toDecimal(5000), effectiveFrom: new Date(currentYear, 0, 1), createdBy: admin._id })

  console.log('Initializing employee fund...')
  await EmployeeFund.create({ balance: toDecimal(0) })

  console.log('Processing birthday contributions...')
  await budgetService.processBirthdayContributions()

  console.log('\n================================================')
  console.log('  SEEDED LOGIN CREDENTIALS')
  console.log('================================================')
  console.log('  SUPER ADMIN')
  console.log('  Email    : admin@company.com')
  console.log('  Password : Admin@1234')
  console.log('  Role     : SUPER_ADMIN')
  console.log('\n  MANAGERS')
  console.log('  Email    : rahul@company.com  | Role: MANAGER | Dept: Engineering')
  console.log('  Email    : priya@company.com  | Role: MANAGER | Dept: Operations')
  console.log('\n  EMPLOYEES')
  console.log('  Email    : sneha@company.com  | Dept: Engineering')
  console.log('  Email    : amit@company.com   | Dept: Engineering')
  console.log('  Email    : anita@company.com  | Dept: Operations')
  console.log('  Email    : vikram@company.com | Dept: Operations')
  console.log('\n  All passwords: Admin@1234')
  console.log('  Login at: http://localhost:5173/login')
  console.log('================================================\n')

  await mongoose.connection.close()
  process.exit(0)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
