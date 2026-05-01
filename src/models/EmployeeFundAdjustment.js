import mongoose from 'mongoose'
const schema = new mongoose.Schema({ adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, amount: { type: mongoose.Types.Decimal128, required: true }, reason: { type: String, required: true }, balanceBefore: { type: mongoose.Types.Decimal128, required: true }, balanceAfter: { type: mongoose.Types.Decimal128, required: true }, adjustedAt: { type: Date, default: Date.now } }, { timestamps: true })
export const EmployeeFundAdjustment = mongoose.model('EmployeeFundAdjustment', schema)
