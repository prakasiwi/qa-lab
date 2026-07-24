import { AppError } from '../utils/AppError.js';

export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
    return next(new AppError('Data tidak valid', 400, errors));
  }
  req.body = value;
  return next();
};
