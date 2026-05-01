import { User } from '../models/User.js'
import { EmployeeFund } from '../models/EmployeeFund.js'
import { EmployeeFundContribution } from '../models/EmployeeFundContribution.js'
import { MonthlyBudget } from '../models/MonthlyBudget.js'
import { ExpenseRequest } from '../models/ExpenseRequest.js'
import { fromDecimal, toDecimal } from '../utils/validators.js'

const processBirthdayContributions = async () => {
  try {
    const today = new Date()
    const currentYear = today.getFullYear()
    const users = await User.find({ isActive: true, dateOfBirth: { $ne: null } }).select('_id name dateOfBirth')
    
    for (const user of users) {
      const dob = new Date(user.dateOfBirth)
      const birthdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate())

      if (birthdayThisYear <= today) {
        const existing = await EmployeeFundContribution.findOne({ employeeId: user._id, contributionYear: currentYear })
        if (!existing) {
          await EmployeeFundContribution.create({ employeeId: user._id, amount: toDecimal(1200), contributionYear: currentYear, note: `Birthday contribution for ${user.name}` })
          await EmployeeFund.findOneAndUpdate({}, { $inc: { balance: 1200 }, lastUpdatedAt: new Date() }, { upsert: true, new: true })
          console.log(`Birthday contribution added for ${user.name}`)
        }
      }
    }
  } catch (err) {
    console.error('Birthday contribution error:', err.message)
  }
}

const getCurrentBudgetData = async () => {
  try {
    const activeBudget = await MonthlyBudget.findOne().sort({ effectiveFrom: -1 })
    if (!activeBudget) return null
    
    const monthlyAmount = fromDecimal(activeBudget.monthlyAmount)
    const quarterlyAmount = monthlyAmount * 3
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const currentQuarter = Math.ceil(currentMonth / 3)

    const startOfMonth = new Date(currentYear, currentMonth - 1, 1)
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999)
    const startMonth = (currentQuarter - 1) * 3
    const startOfQuarter = new Date(currentYear, startMonth, 1)
    const endOfQuarter = new Date(currentYear, startMonth + 3, 0, 23, 59, 59, 999)

    const [monthlyResult, quarterlyResult] = await Promise.all([
      ExpenseRequest.aggregate([
        { $match: { isArchived: false, expenseType: { $in: ['FOOD', 'OTHER'] }, submittedAt: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }
      ]),
      ExpenseRequest.aggregate([
        { $match: { isArchived: false, expenseType: { $in: ['FOOD', 'OTHER'] }, submittedAt: { $gte: startOfQuarter, $lte: endOfQuarter } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }
      ])
    ])

    const usedMonth = monthlyResult[0]?.total || 0
    const usedQuarter = quarterlyResult[0]?.total || 0

    return {
      monthlyAmount,
      quarterlyAmount,
      currentMonth: { month: currentMonth, year: currentYear, used: usedMonth, remaining: monthlyAmount - usedMonth, percent: monthlyAmount > 0 ? Math.round((usedMonth / monthlyAmount) * 1000) / 10 : 0, overBudget: usedMonth > monthlyAmount },
      currentQuarter: { quarter: currentQuarter, year: currentYear, used: usedQuarter, remaining: quarterlyAmount - usedQuarter, percent: quarterlyAmount > 0 ? Math.round((usedQuarter / quarterlyAmount) * 1000) / 10 : 0 }
    }
  } catch (err) {
    console.error('Budget data error:', err.message)
    return null
  }
}

export const budgetService = { processBirthdayContributions, getCurrentBudgetData }
