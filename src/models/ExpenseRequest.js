import mongoose from 'mongoose'
const schema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expenseType: { type: String, enum: ['FOOD', 'OTHER', 'TRIP', 'TEAM_FUND'], required: true },
  tripRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'TripRequest', default: null },
  title: { type: String, required: true, trim: true },
  description: String,
  amount: { type: mongoose.Types.Decimal128, required: true },
  expenseDate: { type: Date, default: Date.now },
  isSettled: { type: Boolean, default: false },
  settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  settledAt: { type: Date, default: null },
  settlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseSettlement', default: null },
  isArchived: { type: Boolean, default: false },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  archivedAt: { type: Date, default: null },
  archiveReason: String,
  settlementHistory: [{
    action: { type: String, enum: ['SETTLED', 'UNSETTLED'] },
    previousStatus: Boolean,
    newStatus: Boolean,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedAt: { type: Date, default: Date.now },
    note: String
  }],
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true })
schema.index({ employeeId: 1, isSettled: 1, isArchived: 1 })
schema.index({ title: 'text', description: 'text' })
schema.index({ expenseDate: -1 })
schema.index({ isArchived: 1, expenseDate: -1 })
schema.index({ employeeId: 1, isArchived: 1, expenseDate: -1 })
schema.index({ isArchived: 1, isSettled: 1, expenseDate: -1 })
schema.index({ expenseType: 1, isArchived: 1, expenseDate: -1 })
schema.index({ settledAt: -1 })
export const ExpenseRequest = mongoose.model('ExpenseRequest', schema)
