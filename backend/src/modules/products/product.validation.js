import Joi from "joi";
import {
  DECIMAL_12_2_MAX,
  MONEY_SCALE,
  POSTGRES_INT_MAX,
} from "../../utils/dbConstraints.js";

export const productSchema = Joi.object({
  ownerUserId: Joi.forbidden(),
  productCode: Joi.string().trim().min(1).required().messages({
    "string.empty": "Product Code wajib diisi",
  }),
  productName: Joi.string().trim().min(3).max(150).required().messages({
    "string.empty": "Product Name wajib diisi",
    "string.min": "Product Name minimal 3 karakter",
  }),
  price: Joi.number()
    .strict()
    .greater(0)
    .max(DECIMAL_12_2_MAX)
    .precision(MONEY_SCALE)
    .required()
    .messages({
      "number.greater": "Price wajib lebih dari 0",
      "number.max": `Price maksimal ${DECIMAL_12_2_MAX}`,
      "number.precision": "Price maksimal 2 angka desimal",
    }),
  initialStock: Joi.number()
    .strict()
    .integer()
    .min(0)
    .max(POSTGRES_INT_MAX)
    .required()
    .messages({
      "any.required": "Initial Stock wajib diisi.",
      "number.integer": "Initial Stock harus berupa bilangan bulat.",
      "number.min": "Initial Stock tidak boleh negatif.",
      "number.max": `Initial Stock maksimal ${POSTGRES_INT_MAX}.`,
    }),
  isActive: Joi.boolean().strict().required(),
  availableStock: Joi.forbidden(),
  stock: Joi.forbidden(),
});

export const productParamsSchema = Joi.object({
  id: Joi.string()
    .trim()
    .pattern(
      /^(?:c[a-z0-9]{24,}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
    )
    .required(),
});

export const statusSchema = Joi.object({
  ownerUserId: Joi.forbidden(),
  isActive: Joi.boolean().strict().required(),
});

export const productListQuerySchema = Joi.object({
  search: Joi.string().trim().max(150).allow("").default(""),
  page: Joi.number().integer().min(1).max(POSTGRES_INT_MAX).default(1),
  limit: Joi.number().integer().valid(10, 25, 50, 100).default(10),
  status: Joi.string().valid("active", "inactive").optional(),
});
