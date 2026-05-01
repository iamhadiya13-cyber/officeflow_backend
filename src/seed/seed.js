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

  const admin = await User.create({ name: 'Nikunj', email: 'nikunj@flyticsglob.com', passwordHash, role: 'SUPER_ADMIN', isActive: true, mustChangePassword: false, dateOfBirth: new Date('1990-01-15') })
  const admin2 = await User.create({ name: 'harsh', email: 'harsh@flyticsglob.com', passwordHash, role: 'MANAGER', isActive: true, mustChangePassword: false, dateOfBirth: new Date('1988-03-10') })
  const emp1 = await User.create({ name: 'Ghanshyam', email: 'ghanshyam@flyticsglob.com', passwordHash, role: 'EMPLOYEE', isActive: true, mustChangePassword: false, dateOfBirth: new Date('1995-03-05') })
  const emp2 = await User.create({ name: 'Naitik', email: 'naitik@flyticsglob.com', passwordHash, role: 'EMPLOYEE', isActive: true, mustChangePassword: false, dateOfBirth: new Date('1993-11-18') })
  const emp3 = await User.create({ name: 'Kathan', email: 'kathan@flyticsglob.com', passwordHash, role: 'EMPLOYEE', isActive: true, mustChangePassword: false, dateOfBirth: new Date('1991-02-28') })
  const emp4 = await User.create({ name: 'Yash', email: 'yash@flyticsglob.com', passwordHash, role: 'EMPLOYEE', isActive: true, mustChangePassword: false, dateOfBirth: new Date('1994-08-14') })
  const emp5 = await User.create({ name: 'Parth', email: 'parth@flyticsglob.com', passwordHash, role: 'EMPLOYEE', isActive: true, mustChangePassword: false, dateOfBirth: new Date('1994-08-14') })
  const emp6 = await User.create({ name: 'kamal', email: 'kamal@flyticsglob.com', passwordHash, role: 'EMPLOYEE', isActive: true, mustChangePassword: false, dateOfBirth: new Date('1994-08-14') })

  const allUsers = [admin, admin2, emp1, emp2, emp3, emp4, emp5, emp6]

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

  console.log('Creating expenses from seed data...')
  const expenseData = [
    { date: '2026-04-01', name: 'Naitik', details: 'Tea', amount: 50 },
    { date: '2026-04-02', name: 'Naitik', details: 'Tea', amount: 60 },
    { date: '2026-04-03', name: 'Naitik', details: 'Ghoghara', amount: 280 },
    { date: '2026-04-08', name: 'Naitik', details: 'Puff + tea', amount: 210 },
    { date: '2026-04-09', name: 'Naitik', details: 'Dabali + tea', amount: 210 },
    { date: '2026-04-10', name: 'Naitik', details: 'tea', amount: 60 },
    { date: '2026-04-07', name: 'Ghanshyam', details: 'tea', amount: 40 },
    { date: '2026-04-13', name: 'Yash', details: 'tea', amount: 40 },
    { date: '2026-04-10', name: 'Yash', details: 'gathiya', amount: 270 },
    { date: '2026-04-06', name: 'Yash', details: 'tea', amount: 50 },
    { date: '2026-04-14', name: 'Naitik', details: 'Samosa +tea', amount: 290 },
    { date: '2026-04-15', name: 'Naitik', details: 'tea', amount: 40 },
    { date: '2026-04-16', name: 'Ghanshyam', details: 'tea', amount: 40 },
    { date: '2026-04-20', name: 'Ghanshyam', details: 'Vadapaw+tea', amount: 160 },
    { date: '2026-04-21', name: 'Kathan', details: 'tea', amount: 40 },
    { date: '2026-04-22', name: 'Kathan', details: 'Tea', amount: 40 },
    { date: '2026-04-23', name: 'Kathan', details: 'tea', amount: 50 },
    { date: '2026-04-16', name: 'Kathan', details: 'chorafadi', amount: 200 },
    { date: '2026-04-16', name: 'harsh', details: 'Cake', amount: 445 },
    { date: '2026-04-17', name: 'Parth', details: 'Cake', amount: 450 },
    { date: '2026-04-24', name: 'Kathan', details: 'Tea', amount: 70 },
    { date: '2026-04-24', name: 'harsh', details: 'Puff', amount: 200 },
    { date: '2026-04-27', name: 'Kathan', details: 'Tea', amount: 60 },
    { date: '2026-04-29', name: 'Kathan', details: 'Dabali', amount: 320 }
  ]

  const expensesToInsert = []
  for (const item of expenseData) {
    const user = allUsers.find(u => u.name.toLowerCase() === item.name.toLowerCase())
    if (user) {
      expensesToInsert.push({
        employeeId: user._id,
        expenseType: 'FOOD',
        title: item.details,
        amount: toDecimal(item.amount),
        expenseDate: new Date(item.date),
        isSettled: false
      })
    }
  }

  if (expensesToInsert.length > 0) {
    await ExpenseRequest.insertMany(expensesToInsert)
    console.log(`Seeded ${expensesToInsert.length} expenses.`)
  }

  console.log('\n================================================')
  console.log('  SEEDED LOGIN CREDENTIALS')
  console.log('================================================')
  console.log('  SUPER ADMIN')
  console.log('  Email    : nikunj@flyticsglob.com')
  console.log('  Password : Admin@1234')
  console.log('  Role     : SUPER_ADMIN')
  console.log('\n  ADMIN / MANAGER')
  console.log('  Email    : kamal@flyticsglob.com  | Role: MANAGER')
  console.log('\n  EMPLOYEES')
  console.log('  Email    : ghanshyam@flyticsglob.com')
  console.log('  Email    : naitik@flyticsglob.com')
  console.log('  Email    : kathan@flyticsglob.com')
  console.log('  Email    : yash@flyticsglob.com')
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
