import mongoose from 'mongoose'
const schema = new mongoose.Schema({ 
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  contributionType: { type: String, enum: ['BIRTHDAY', 'JOINING'], default: 'BIRTHDAY' },
  amount: { type: mongoose.Types.Decimal128, required: true }, 
  contributionYear: { type: Number }, 
  contributedAt: { type: Date, default: Date.now }, 
  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: String 
}, { timestamps: true })
schema.index({ employeeId: 1, contributionYear: 1, contributionType: 1 }, { unique: true })
export const EmployeeFundContribution = mongoose.model('EmployeeFundContribution', schema)
