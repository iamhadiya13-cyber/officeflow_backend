import { User } from '../models/User.js'
import { EmployeeFund } from '../models/EmployeeFund.js'
import { EmployeeFundContribution } from '../models/EmployeeFundContribution.js'
import { MonthlyBudget } from '../models/MonthlyBudget.js'
import { ExpenseRequest } from '../models/ExpenseRequest.js'
import { fromDecimal, toDecimal } from '../utils/validators.js'



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

export const budgetService = { getCurrentBudgetData }
