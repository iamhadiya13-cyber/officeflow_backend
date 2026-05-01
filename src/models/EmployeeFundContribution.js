import mongoose from 'mongoose'
const schema = new mongoose.Schema({ employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, amount: { type: mongoose.Types.Decimal128, default: mongoose.Types.Decimal128.fromString('1200') }, contributionYear: { type: Number, required: true }, contributedAt: { type: Date, default: Date.now }, note: String }, { timestamps: true })
schema.index({ employeeId: 1, contributionYear: 1 }, { unique: true })
export const EmployeeFundContribution = mongoose.model('EmployeeFundContribution', schema)
