import Joi from 'joi';

const item = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  discountPercent: Joi.number().min(0).max(100).default(0),
});

export const invoiceSchema = Joi.object({
  customerId: Joi.string().required(),
  issueDate: Joi.date().required(),
  invoiceDate: Joi.date().optional(),
  dueDate: Joi.date().required(),
  additionalInfo: Joi.string().max(500).allow('', null),
  notes: Joi.string().max(500).allow('', null),
  items: Joi.array().items(item).min(1).required(),
});
