import mongoose from 'mongoose'
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true)
    mongoose.set('toJSON', {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id?.toString()
        delete ret._id
        delete ret.__v
        return ret
      }
    })
    const conn = await mongoose.connect(process.env.MONGODB_URI)
    console.log(`MongoDB connected: ${conn.connection.host}`)
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`)
    process.exit(1)
  }
}
export { connectDB }
