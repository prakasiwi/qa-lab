import Joi from 'joi';
import { DECIMAL_12_2_MAX, MONEY_SCALE, POSTGRES_INT_MAX } from '../../utils/dbConstraints.js';

export const productSchema = Joi.object({
  productCode: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Product Code wajib diisi',
  }),
  productName: Joi.string().trim().min(3).max(150).required().messages({
    'string.empty': 'Product Name wajib diisi',
    'string.min': 'Product Name minimal 3 karakter',
  }),
  price: Joi.number().strict().greater(0).max(DECIMAL_12_2_MAX).precision(MONEY_SCALE).required().messages({
    'number.greater': 'Price wajib lebih dari 0',
    'number.max': `Price maksimal ${DECIMAL_12_2_MAX}`,
    'number.precision': 'Price maksimal 2 angka desimal',
  }),
  initialStock: Joi.number().strict().integer().min(0).max(POSTGRES_INT_MAX).required().messages({
    'any.required': 'Initial Stock wajib diisi.',
    'number.integer': 'Initial Stock harus berupa bilangan bulat.',
    'number.min': 'Initial Stock tidak boleh negatif.',
    'number.max': `Initial Stock maksimal ${POSTGRES_INT_MAX}.`,
  }),
  isActive: Joi.boolean().strict().required(),
  availableStock: Joi.forbidden(),
  stock: Joi.forbidden(),
});

export const statusSchema = Joi.object({ isActive: Joi.boolean().strict().required() });

export const productListQuerySchema = Joi.object({
  search: Joi.string().trim().max(150).allow('').default(''),
  page: Joi.number().integer().min(1).max(POSTGRES_INT_MAX).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('active', 'inactive').optional(),
});
