import Joi from 'joi';
import { POSTGRES_INT_MAX } from '../../utils/dbConstraints.js';

export const customerSchema = Joi.object({
  customerCode: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Customer Code wajib diisi',
  }),
  customerName: Joi.string().trim().min(3).max(150).required().messages({
    'string.empty': 'Customer Name wajib diisi',
    'string.min': 'Customer Name minimal 3 karakter',
  }),
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.empty': 'Email wajib diisi',
    'string.email': 'Email tidak valid',
  }),
  phone: Joi.string().trim().pattern(/^[0-9+\-()\s]*$/).allow('', null).optional().messages({
    'string.pattern.base': 'Phone hanya boleh berisi angka, +, spasi, -, dan tanda kurung',
  }),
  address: Joi.string().trim().max(500).required().messages({
    'string.empty': 'Address wajib diisi',
    'string.max': 'Address maksimal 500 karakter',
  }),
  isActive: Joi.boolean().strict().required(),
});

export const statusSchema = Joi.object({ isActive: Joi.boolean().strict().required() });

export const customerListQuerySchema = Joi.object({
  search: Joi.string().trim().max(150).allow('').default(''),
  page: Joi.number().integer().min(1).max(POSTGRES_INT_MAX).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('active', 'inactive').optional(),
});
