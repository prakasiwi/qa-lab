import Joi from "joi";

const id = Joi.string().trim().min(1).max(100);
const code = Joi.string()
  .trim()
  .uppercase()
  .pattern(/^[A-Z][A-Z0-9_]*$/)
  .min(2)
  .max(50);
const name = Joi.string().trim().min(2).max(100);
const description = Joi.string().trim().max(500).allow("", null);
const action = Joi.object({
  resource: Joi.string().trim().lowercase().min(1).max(50).required(),
  action: Joi.string().trim().lowercase().min(1).max(50).required(),
});

export const permissionIdParamsSchema = Joi.object({ id: id.required() });
export const permissionListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().valid(10, 25, 50, 100).default(10),
  search: Joi.string().trim().max(150).allow(""),
  status: Joi.string().valid("active", "inactive"),
});
export const createPermissionSchema = Joi.object({
  code: code.required(),
  name: name.required(),
  description,
  isActive: Joi.boolean().default(true),
  actions: Joi.array().items(action).default([]),
});
export const updatePermissionSchema = Joi.object({
  code,
  name: name.required(),
  description,
  isActive: Joi.boolean().required(),
  actions: Joi.array().items(action).required(),
  updatedAt: Joi.date().iso().required(),
});
