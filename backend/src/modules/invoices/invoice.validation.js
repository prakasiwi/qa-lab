import Joi from "joi";
import {
  DECIMAL_5_2_MAX,
  MONEY_SCALE,
  POSTGRES_INT_MAX,
} from "../../utils/dbConstraints.js";

const item = Joi.object({
  productId: Joi.string()
    .trim()
    .pattern(
      /^(?:c[a-z0-9]{24,}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
    )
    .required(),
  quantity: Joi.number()
    .strict()
    .integer()
    .min(1)
    .max(POSTGRES_INT_MAX)
    .required(),
  discountPercent: Joi.number()
    .strict()
    .min(0)
    .max(100)
    .max(DECIMAL_5_2_MAX)
    .precision(MONEY_SCALE)
    .default(0),
});

export const invoiceSchema = Joi.object({
  ownerUserId: Joi.forbidden(),
  createdBy: Joi.forbidden(),
  customerId: Joi.string()
    .trim()
    .pattern(
      /^(?:c[a-z0-9]{24,}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
    )
    .required(),
  issueDate: Joi.string().isoDate().required(),
  invoiceDate: Joi.string().isoDate().optional(),
  dueDate: Joi.string().isoDate().required(),
  additionalInfo: Joi.string().max(500).allow("", null),
  notes: Joi.string().max(500).allow("", null),
  items: Joi.array().items(item).min(1).required(),
});

export const invoiceParamsSchema = Joi.object({
  id: Joi.string()
    .trim()
    .pattern(
      /^(?:c[a-z0-9]{24,}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
    )
    .required(),
});

export const invoiceListQuerySchema = Joi.object({
  search: Joi.string().trim().max(150).allow("").default(""),
  status: Joi.string().valid("DRAFT", "SUBMITTED", "PAID", "CANCELLED"),
  customerId: Joi.string().trim().max(100),
  page: Joi.number().integer().min(1).max(POSTGRES_INT_MAX).default(1),
  limit: Joi.number().integer().valid(10, 25, 50, 100).default(10),
});
