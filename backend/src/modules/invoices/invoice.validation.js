import Joi from 'joi';
import { DECIMAL_5_2_MAX, MONEY_SCALE, POSTGRES_INT_MAX } from '../../utils/dbConstraints.js';

const item = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().strict().integer().min(1).max(POSTGRES_INT_MAX).required(),
  discountPercent: Joi.number().strict().min(0).max(100).max(DECIMAL_5_2_MAX).precision(MONEY_SCALE).default(0),
});

export const invoiceSchema = Joi.object({
  customerId: Joi.string().required(),
  issueDate: Joi.string().isoDate().required(),
  invoiceDate: Joi.string().isoDate().optional(),
  dueDate: Joi.string().isoDate().required(),
  additionalInfo: Joi.string().max(500).allow('', null),
  notes: Joi.string().max(500).allow('', null),
  items: Joi.array().items(item).min(1).required(),
});

export const invoiceListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).max(POSTGRES_INT_MAX).default(1),
  limit: Joi.number().integer().valid(10, 25, 50, 100).default(10),
});
