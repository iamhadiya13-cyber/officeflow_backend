import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'INTERN'],
      default: 'EMPLOYEE'
    },
    department: { type: String, trim: true, default: null },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    dateOfBirth: { type: Date, default: null },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
)

userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString()
    delete ret._id
    delete ret.__v
    delete ret.passwordHash
    return ret
  }
})

const User = mongoose.model('User', userSchema)
export { User }
