import Joi from 'joi';

export const productSchema = Joi.object({
  productCode: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Product Code wajib diisi',
  }),
  productName: Joi.string().trim().min(3).max(150).required().messages({
    'string.empty': 'Product Name wajib diisi',
    'string.min': 'Product Name minimal 3 karakter',
  }),
  price: Joi.number().greater(0).required().messages({
    'number.greater': 'Price wajib lebih dari 0',
  }),
  initialStock: Joi.number().integer().min(0).required().messages({
    'any.required': 'Initial Stock wajib diisi.',
    'number.integer': 'Initial Stock harus berupa bilangan bulat.',
    'number.min': 'Initial Stock tidak boleh negatif.',
  }),
  isActive: Joi.boolean().required(),
  availableStock: Joi.forbidden(),
  stock: Joi.forbidden(),
});

export const statusSchema = Joi.object({ isActive: Joi.boolean().required() });
