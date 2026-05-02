import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  category: { type: String, required: true },
  total: { type: Number, default: 0 },
  count: { type: Number, default: 0 },
}, { _id: false });

const statusSchema = new mongoose.Schema({
  status: { type: String, enum: ['settled', 'unsettled'], required: true },
  total: { type: Number, default: 0 },
  count: { type: Number, default: 0 },
}, { _id: false });

const schema = new mongoose.Schema({
  year: { type: Number, required: true },
  quarter: { type: Number, required: true, min: 1, max: 4 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  graceCutoff: { type: Date, required: true },
  totalExpense: { type: Number, default: 0 },
  expenseCount: { type: Number, default: 0 },
  settledTotal: { type: Number, default: 0 },
  unsettledTotal: { type: Number, default: 0 },
  categoryTotals: [categorySchema],
  statusTotals: [statusSchema],
  topCategory: { type: String, default: 'N/A' },
}, { timestamps: true });

schema.index({ year: 1, quarter: 1 }, { unique: true });

export const QuarterlyExpenseSnapshot = mongoose.model('QuarterlyExpenseSnapshot', schema);
