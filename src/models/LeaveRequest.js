import mongoose from 'mongoose'
const schema = new mongoose.Schema({ employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true }, startDate: { type: Date, required: true }, endDate: { type: Date, required: true }, totalDays: { type: Number, required: true }, reason: String, status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' }, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, reviewNote: String }, { timestamps: true })
schema.index({ employeeId: 1, status: 1 })
export const LeaveRequest = mongoose.model('LeaveRequest', schema)
