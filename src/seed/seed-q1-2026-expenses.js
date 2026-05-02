import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { ExpenseRequest } from '../models/ExpenseRequest.js'
import { QuarterlyExpenseSnapshot } from '../models/QuarterlyExpenseSnapshot.js'
import { User } from '../models/User.js'
import { fromDecimal, toDecimal } from '../utils/validators.js'

const SEED_MARKER = 'Seed: Q1-2026 previous quarter import'
const YEAR = 2026
const QUARTER = 1
const START_DATE = new Date('2026-01-01T00:00:00.000Z')
const END_DATE_EXCLUSIVE = new Date('2026-04-01T00:00:00.000Z')
const SNAPSHOT_END_DATE = new Date('2026-03-31T23:59:59.999Z')
const GRACE_CUTOFF = new Date('2026-04-15T23:59:59.999Z')

const rows = [
  { date: '2026-01-02', name: 'Yash', details: 'tea', amount: 30, expenseType: 'FOOD' },
  { date: '2026-01-05', name: 'Kathan', details: 'tea', amount: 30, expenseType: 'FOOD' },
  { date: '2026-01-06', name: 'Yash', details: 'tea', amount: 30, expenseType: 'FOOD' },
  { date: '2026-01-07', name: 'Kathan', details: 'tea + sev mamra', amount: 50, expenseType: 'FOOD' },
  { date: '2026-01-08', name: 'Yash', details: 'tea', amount: 40, expenseType: 'FOOD' },
  { date: '2026-01-09', name: 'Sahil', details: 'tea', amount: 60, expenseType: 'FOOD' },
  { date: '2026-01-09', name: 'Parth', details: 'Dinner', amount: 360, expenseType: 'FOOD' },
  { date: '2026-01-09', name: 'Yash', details: 'Puff', amount: 90, expenseType: 'FOOD' },
  { date: '2026-01-13', name: 'Yash', details: 'tea', amount: 40, expenseType: 'FOOD' },
  { date: '2026-01-15', name: 'Yash', details: 'Ganthiya', amount: 490, expenseType: 'FOOD' },
  { date: '2026-01-16', name: 'Kathan', details: 'Dabali', amount: 230, expenseType: 'FOOD' },
  { date: '2026-01-17', name: 'Parth', details: 'Lunch', amount: 210, expenseType: 'FOOD' },
  { date: '2026-01-17', name: 'Yash', details: 'tea', amount: 50, expenseType: 'FOOD' },
  { date: '2026-01-19', name: 'Yash', details: 'tea+snacks', amount: 50, expenseType: 'FOOD' },
  { date: '2026-01-21', name: 'Yash', details: 'tea', amount: 50, expenseType: 'FOOD' },
  { date: '2026-01-27', name: 'Kathan', details: 'tea', amount: 40, expenseType: 'FOOD' },
  { date: '2026-01-28', name: 'Yash', details: 'tea+snacks', amount: 70, expenseType: 'FOOD' },
  { date: '2026-01-29', name: 'Kathan', details: 'tea', amount: 60, expenseType: 'FOOD' },
  { date: '2026-01-30', name: 'Kathan', details: 'tea', amount: 50, expenseType: 'FOOD' },
  { date: '2026-01-30', name: 'Harsh', details: 'Late Dinner', amount: 200, expenseType: 'FOOD' },
  { date: '2026-02-02', name: 'Kathan', details: 'Tea', amount: 40, expenseType: 'FOOD' },
  { date: '2026-02-03', name: 'Kathan', details: 'Tea', amount: 90, expenseType: 'FOOD' },
  { date: '2026-02-03', name: 'Harsh', details: 'Snacks', amount: 80, expenseType: 'FOOD' },
  { date: '2026-02-07', name: 'Kamal', details: 'Water', amount: 200, expenseType: 'FOOD' },
  { date: '2026-02-07', name: 'Kamal', details: 'Tea', amount: 40, expenseType: 'FOOD' },
  { date: '2026-02-08', name: 'Kamal', details: 'Ahm to Porbandar', amount: 2040, expenseType: 'OTHER' },
  { date: '2026-02-11', name: 'Sahil', details: 'Tea', amount: 50, expenseType: 'FOOD' },
  { date: '2026-02-12', name: 'Kathan', details: 'Tea', amount: 30, expenseType: 'FOOD' },
  { date: '2026-02-17', name: 'Yash', details: 'Tea', amount: 50, expenseType: 'FOOD' },
  { date: '2026-02-17', name: 'Parth', details: 'Courier received', amount: 130, expenseType: 'OTHER' },
  { date: '2026-02-18', name: 'Kathan', details: 'puff', amount: 245, expenseType: 'FOOD' },
  { date: '2026-02-20', name: 'Yash', details: 'Cholafali', amount: 200, expenseType: 'FOOD' },
  { date: '2026-02-24', name: 'Yash', details: 'Ghughra', amount: 260, expenseType: 'FOOD' },
  { date: '2026-02-26', name: 'Harsh', details: 'Burger', amount: 536, expenseType: 'FOOD' },
  { date: '2026-02-26', name: 'Harsh', details: 'Tea', amount: 80, expenseType: 'FOOD' },
  { date: '2026-03-04', name: 'Kathan', details: 'Shreekhand', amount: 360, expenseType: 'FOOD' },
  { date: '2026-03-04', name: 'Naitik', details: 'Tea', amount: 40, expenseType: 'FOOD' },
  { date: '2026-03-06', name: 'Naitik', details: 'Tea', amount: 80, expenseType: 'FOOD' },
  { date: '2026-03-06', name: 'Kamal', details: 'Other Expense', amount: 650, expenseType: 'OTHER' },
  { date: '2026-03-08', name: 'Harsh', details: 'Interview Sunday Lunch', amount: 200, expenseType: 'FOOD' },
  { date: '2026-03-09', name: 'Yash', details: 'Tea', amount: 70, expenseType: 'FOOD' },
  { date: '2026-03-11', name: 'Yash', details: 'Samosa,Kachori', amount: 275, expenseType: 'FOOD' },
  { date: '2026-03-12', name: 'Kathan', details: 'Tea', amount: 80, expenseType: 'FOOD' },
  { date: '2026-03-13', name: 'Kathan', details: 'Sandwich', amount: 600, expenseType: 'FOOD' },
  { date: '2026-03-13', name: 'Kamal', details: 'AC', amount: 590, expenseType: 'OTHER' },
]

const normalizeName = (name) => name.trim().toLowerCase()

const roundMoney = (value) => Number(value.toFixed(2))

const buildSnapshotTotals = async () => {
  const expenses = await ExpenseRequest.find({
    isArchived: { $ne: true },
    expenseDate: { $gte: START_DATE, $lt: END_DATE_EXCLUSIVE },
  }).select('amount expenseType isSettled').lean()

  const categoryMap = new Map()
  const statusMap = new Map([
    ['settled', { status: 'settled', total: 0, count: 0 }],
    ['unsettled', { status: 'unsettled', total: 0, count: 0 }],
  ])

  let totalExpense = 0
  let settledTotal = 0
  let unsettledTotal = 0

  for (const expense of expenses) {
    const amount = fromDecimal(expense.amount)
    const category = expense.expenseType || 'OTHER'
    const status = expense.isSettled ? 'settled' : 'unsettled'

    totalExpense += amount
    if (expense.isSettled) settledTotal += amount
    else unsettledTotal += amount

    const categoryTotal = categoryMap.get(category) || { category, total: 0, count: 0 }
    categoryTotal.total += amount
    categoryTotal.count += 1
    categoryMap.set(category, categoryTotal)

    const statusTotal = statusMap.get(status)
    statusTotal.total += amount
    statusTotal.count += 1
  }

  const categoryTotals = [...categoryMap.values()]
    .map((item) => ({ ...item, total: roundMoney(item.total) }))
    .sort((a, b) => b.total - a.total)

  const statusTotals = [...statusMap.values()].map((item) => ({
    ...item,
    total: roundMoney(item.total),
  }))

  return {
    year: YEAR,
    quarter: QUARTER,
    startDate: START_DATE,
    endDate: SNAPSHOT_END_DATE,
    graceCutoff: GRACE_CUTOFF,
    totalExpense: roundMoney(totalExpense),
    expenseCount: expenses.length,
    settledTotal: roundMoney(settledTotal),
    unsettledTotal: roundMoney(unsettledTotal),
    categoryTotals,
    statusTotals,
    topCategory: categoryTotals[0]?.category || 'N/A',
  }
}

const seed = async () => {
  await connectDB()

  const users = await User.find({}).select('_id name').lean()

  const usersByName = new Map(users.map((user) => [normalizeName(user.name), user]))
  const missingUsers = new Set()
  let inserted = 0
  let skipped = 0
  let updatedSettled = 0

  for (const row of rows) {
    const user = usersByName.get(normalizeName(row.name))
    if (!user) {
      missingUsers.add(row.name)
      continue
    }

    const expenseDate = new Date(`${row.date}T00:00:00.000Z`)
    const amount = toDecimal(row.amount)
    const existing = await ExpenseRequest.findOne({
      employeeId: user._id,
      expenseDate,
      title: row.details,
      amount,
      description: SEED_MARKER,
    }).select('_id').lean()

    if (existing) {
      const updateResult = await ExpenseRequest.updateOne(
        { _id: existing._id, isSettled: { $ne: true } },
        { $set: { isSettled: true, settledAt: expenseDate } }
      )
      updatedSettled += updateResult.modifiedCount || 0
      skipped += 1
      continue
    }

    await ExpenseRequest.create({
      employeeId: user._id,
      expenseType: row.expenseType,
      title: row.details,
      description: SEED_MARKER,
      amount,
      expenseDate,
      submittedAt: expenseDate,
      isSettled: true,
      settledAt: expenseDate,
    })
    inserted += 1
  }

  const snapshot = await buildSnapshotTotals()
  await QuarterlyExpenseSnapshot.findOneAndUpdate(
    { year: YEAR, quarter: QUARTER },
    { $set: snapshot },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )

  console.log('\nQ1 2026 previous quarter seed completed.')
  console.log(`Inserted expenses : ${inserted}`)
  console.log(`Skipped duplicates: ${skipped}`)
  console.log(`Marked settled    : ${updatedSettled}`)
  console.log(`Missing users     : ${missingUsers.size ? [...missingUsers].join(', ') : 'None'}`)
  console.log('\nQ1 2026 snapshot rebuilt from current database:')
  console.log(`Total expense : ${snapshot.totalExpense}`)
  console.log(`Expense count : ${snapshot.expenseCount}`)
  console.log(`Settled total : ${snapshot.settledTotal}`)
  console.log(`Unsettled total: ${snapshot.unsettledTotal}`)
  console.log(`Top category  : ${snapshot.topCategory}`)
  console.log('Category totals:', snapshot.categoryTotals)

  await mongoose.connection.close()
  process.exit(0)
}

seed().catch(async (err) => {
  console.error('Q1 2026 previous quarter seed failed:', err)
  await mongoose.connection.close()
  process.exit(1)
})
