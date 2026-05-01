import mongoose from 'mongoose'
const schema = new mongoose.Schema({ employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, month: { type: Number, required: true }, year: { type: Number, required: true }, totalAmount: { type: mongoose.Types.Decimal128, required: true }, expenseCount: { type: Number, required: true }, settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, settledAt: { type: Date, default: Date.now }, note: String }, { timestamps: true })
schema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true })
export const ExpenseSettlement = mongoose.model('ExpenseSettlement', schema)
