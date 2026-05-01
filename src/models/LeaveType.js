import mongoose from 'mongoose'
const schema = new mongoose.Schema({ name: { type: String, required: true, unique: true }, daysAllowed: { type: Number, required: true }, carryForward: { type: Boolean, default: false } }, { timestamps: true })
export const LeaveType = mongoose.model('LeaveType', schema)
