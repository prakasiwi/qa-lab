import Joi from "joi";

export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    "string.email": "Email tidak valid",
    "any.required": "Email wajib diisi",
  }),
  password: Joi.string()
    .min(1)
    .required()
    .messages({ "any.required": "Password wajib diisi" }),
});

export const strongPassword = Joi.string()
  .min(12)
  .max(128)
  .pattern(/[a-z]/, "huruf kecil")
  .pattern(/[A-Z]/, "huruf besar")
  .pattern(/[0-9]/, "angka")
  .pattern(/[^A-Za-z0-9]/, "simbol")
  .required();
const password = strongPassword;
const phone = Joi.string()
  .trim()
  .max(30)
  .pattern(/^[0-9+()\s-]+$/)
  .allow("")
  .optional();
export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  phone,
  email: Joi.string().trim().lowercase().email().required(),
  password,
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({ "any.only": "Konfirmasi password harus sama" }),
});
export const verifySchema = Joi.object({
  token: Joi.string().min(20).required(),
});
export const activationContextSchema = Joi.object({
  token: Joi.string().min(20).required(),
});
export const resetContextSchema = Joi.object({
  token: Joi.string().min(20).required(),
});
export const resendVerificationSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
});
export const activateAccountSchema = Joi.object({
  token: Joi.string().min(20).required(),
  password,
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({ "any.only": "Konfirmasi password harus sama" }),
});
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
});
export const resetPasswordSchema = Joi.object({
  token: Joi.string().min(20).required(),
  password,
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({ "any.only": "Konfirmasi password harus sama" }),
});
export const mfaVerifySchema = Joi.object({
  challengeId: Joi.string().required(),
  otp: Joi.string()
    .pattern(/^\d{6}$/)
    .required(),
});
export const selectAccessSchema = Joi.object({
  selectionProof: Joi.string().min(20).required(),
  roleId: Joi.string().required(),
});
export const mfaResendSchema = Joi.object({
  challengeId: Joi.string().required(),
});
export const switchRoleSchema = Joi.object({ roleId: Joi.string().required() });
export const sessionParamsSchema = Joi.object({ id: Joi.string().required() });
