import mongoose from 'mongoose'
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id)
const toDecimal = (num) =>
  mongoose.Types.Decimal128.fromString(String(parseFloat(num).toFixed(2)))
const fromDecimal = (dec) => (dec ? parseFloat(dec.toString()) : 0)
export { isValidObjectId, toDecimal, fromDecimal }
