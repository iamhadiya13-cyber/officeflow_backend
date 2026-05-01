import mongoose from 'mongoose'
const schema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, action: { type: String, required: true }, entity: { type: String, required: true }, entityId: { type: mongoose.Schema.Types.ObjectId, default: null }, oldValue: mongoose.Schema.Types.Mixed, newValue: mongoose.Schema.Types.Mixed, ipAddress: String }, { timestamps: true })
schema.index({ entity: 1, entityId: 1 })
export const AuditLog = mongoose.model('AuditLog', schema)
