const successResponse = (message, data = null, meta = null) => ({
  success: true,
  message,
  data,
  ...(meta && { meta })
})
const errorResponse = (message, error = null) => ({
  success: false,
  message,
  ...(error && { error })
})
export { successResponse, errorResponse }
