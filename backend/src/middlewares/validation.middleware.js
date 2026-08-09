import { AppError } from '../utils/AppError.js';

function validateSource(schema, source, options = {}) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
      ...options,
    });

    if (error) {
      const errors = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
      return next(new AppError('Data tidak valid', 400, errors));
    }

    if (source === 'query') {
      req.validatedQuery = value;
    } else {
      req[source] = value;
    }
    return next();
  };
}

export const validate = (schema) => validateSource(schema, 'body');

export const validateQuery = (schema) => validateSource(schema, 'query', { convert: true });

export const validateParams = (schema) => validateSource(schema, 'params');

export const validateBody = validate;
