import mongoose from 'mongoose'
const schema = new mongoose.Schema({ balance: { type: mongoose.Types.Decimal128, default: mongoose.Types.Decimal128.fromString('0') }, lastUpdatedAt: { type: Date, default: Date.now }, lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null } }, { timestamps: true })
export const EmployeeFund = mongoose.model('EmployeeFund', schema)
