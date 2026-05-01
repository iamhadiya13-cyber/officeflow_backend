import { validationResult } from 'express-validator';
import { sendError } from '../utils/response.js';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg);
    return sendError(res, { message: messages[0], error: messages.join(', '), statusCode: 400 });
  }
  next();
};

export { validate };
