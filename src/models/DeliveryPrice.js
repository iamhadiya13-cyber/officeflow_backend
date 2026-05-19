import mongoose from 'mongoose';

const deliveryPriceSchema = new mongoose.Schema({
  month: { type: String, required: true, unique: true }, // Format YYYY-MM
  waterPrice: { type: Number, default: 0 },
  teaPrice: { type: Number, default: 0 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('DeliveryPrice', deliveryPriceSchema);
