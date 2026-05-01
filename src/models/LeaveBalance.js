import mongoose from 'mongoose'
const schema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true }, year: { type: Number, required: true }, usedDays: { type: Number, default: 0 }, remainingDays: { type: Number, required: true }, extraLeaves: { type: Number, default: 0 }, extraLeaveReason: String, extraLeaveAddedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, extraLeaveAddedAt: Date }, { timestamps: true })
schema.index({ userId: 1, leaveTypeId: 1, year: 1 }, { unique: true })
export const LeaveBalance = mongoose.model('LeaveBalance', schema)
