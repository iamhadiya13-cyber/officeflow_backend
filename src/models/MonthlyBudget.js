import mongoose from 'mongoose'
const schema = new mongoose.Schema({ monthlyAmount: { type: mongoose.Types.Decimal128, required: true }, effectiveFrom: { type: Date, required: true, default: Date.now }, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null } }, { timestamps: true })
schema.index({ effectiveFrom: -1 })
export const MonthlyBudget = mongoose.model('MonthlyBudget', schema)
