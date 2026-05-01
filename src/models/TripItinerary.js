import mongoose from 'mongoose';

const tripItinerarySchema = new mongoose.Schema({
  tripRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'TripRequest', required: true },
  dayNumber: { type: Number, required: true },
  date: { type: Date, required: true },
  activities: { type: String },
  notes: { type: String }
}, {
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export default mongoose.model('TripItinerary', tripItinerarySchema);
