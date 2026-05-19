import mongoose from 'mongoose';

const dailyDeliverySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Format YYYY-MM-DD
  waterUnits: { type: Number, default: 0 },
  teaUnits: { type: Number, default: 0 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('DailyDelivery', dailyDeliverySchema);
