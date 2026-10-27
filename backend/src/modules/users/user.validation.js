import Joi from "joi";

const id = Joi.string().trim().min(1).max(100);
const accessAssignment = Joi.object({
  roleId: id.required(),
  permissionId: id.required(),
});
const accessAssignments = Joi.array()
  .items(accessAssignment)
  .min(1)
  .unique("roleId")
  .required();
const personalInformation = {
  name: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().max(30).allow("", null),
  email: Joi.string().trim().lowercase().email().required(),
  mfaEnabled: Joi.boolean().default(false),
};

export const userIdParamsSchema = Joi.object({ id: id.required() });
export const userSessionParamsSchema = Joi.object({
  id: id.required(),
  sessionId: id.required(),
});
export const listUsersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().valid(10, 25, 50, 100).default(10),
  search: Joi.string().trim().max(150).allow(""),
  status: Joi.string().valid(
    "PENDING_VERIFICATION",
    "PENDING_ACTIVATION",
    "ACTIVE",
    "INACTIVE",
    "LOCKED",
  ),
  verified: Joi.boolean(),
  mfaEnabled: Joi.boolean(),
  role: Joi.string().trim().max(100),
});
export const createUserSchema = Joi.object({
  ...personalInformation,
  accessAssignments,
});
export const updateUserSchema = Joi.object({
  ...personalInformation,
  mfaEnabled: Joi.boolean().required(),
  updatedAt: Joi.date().iso().required(),
  accessAssignments,
});
export const updateUserStatusSchema = Joi.object({
  status: Joi.string().valid("ACTIVE", "INACTIVE", "LOCKED").required(),
});
