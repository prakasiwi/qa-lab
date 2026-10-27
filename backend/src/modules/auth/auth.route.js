import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  validate,
  validateParams,
  validateQuery,
} from "../../middlewares/validation.middleware.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  activateAccount,
  activationContext,
  forgotPassword,
  login,
  logout,
  profile,
  register,
  resendMfa,
  resendResetPassword,
  resendVerification,
  resetContext,
  resetPassword,
  revokeSessionById,
  roles,
  selectRole,
  sessions,
  switchRole,
  verifyIdentifier,
  verifyMfa,
} from "./auth.controller.js";
import {
  activateAccountSchema,
  activationContextSchema,
  forgotPasswordSchema,
  loginSchema,
  mfaResendSchema,
  mfaVerifySchema,
  registerSchema,
  resendVerificationSchema,
  resetContextSchema,
  resetPasswordSchema,
  selectAccessSchema,
  sessionParamsSchema,
  switchRoleSchema,
  verifySchema,
} from "./auth.validation.js";
import {
  persistentResetAttemptRateLimit,
  publicAuthIpRateLimit,
  publicAuthRateLimit,
  publicChallengeRateLimit,
} from "./public-auth-rate-limit.middleware.js";

const router = Router();
router.post(
  "/login",
  publicAuthIpRateLimit,
  validate(loginSchema),
  publicAuthRateLimit,
  asyncHandler(login),
);
router.post(
  "/register",
  publicAuthIpRateLimit,
  validate(registerSchema),
  publicAuthRateLimit,
  asyncHandler(register),
);
router.post(
  "/verify-identifier",
  publicAuthIpRateLimit,
  validate(verifySchema),
  asyncHandler(verifyIdentifier),
);
router.post(
  "/resend-verification",
  publicAuthIpRateLimit,
  validate(resendVerificationSchema),
  publicAuthRateLimit,
  asyncHandler(resendVerification),
);
router.get(
  "/activation-context",
  publicAuthIpRateLimit,
  validateQuery(activationContextSchema),
  asyncHandler(activationContext),
);
router.post(
  "/activate-account",
  publicAuthIpRateLimit,
  validate(activateAccountSchema),
  asyncHandler(activateAccount),
);
router.post(
  "/forgot-password",
  publicAuthIpRateLimit,
  validate(forgotPasswordSchema),
  publicAuthRateLimit,
  asyncHandler(forgotPassword),
);
router.post(
  "/resend-reset-password",
  publicAuthIpRateLimit,
  validate(forgotPasswordSchema),
  publicAuthRateLimit,
  asyncHandler(resendResetPassword),
);
router.get(
  "/reset-context",
  publicAuthIpRateLimit,
  validateQuery(resetContextSchema),
  asyncHandler(resetContext),
);
router.post(
  "/reset-password",
  publicAuthIpRateLimit,
  validate(resetPasswordSchema),
  publicChallengeRateLimit,
  asyncHandler(persistentResetAttemptRateLimit),
  asyncHandler(resetPassword),
);
router.post(
  "/mfa/verify",
  publicAuthIpRateLimit,
  validate(mfaVerifySchema),
  publicChallengeRateLimit,
  asyncHandler(verifyMfa),
);
router.post(
  "/mfa/resend",
  publicAuthIpRateLimit,
  validate(mfaResendSchema),
  publicChallengeRateLimit,
  asyncHandler(resendMfa),
);
router.post(
  "/select-role",
  validate(selectAccessSchema),
  asyncHandler(selectRole),
);
router.get("/profile", authMiddleware, asyncHandler(profile));
router.get("/roles", authMiddleware, asyncHandler(roles));
router.post("/logout", authMiddleware, asyncHandler(logout));
router.get("/sessions", authMiddleware, asyncHandler(sessions));
router.delete(
  "/sessions/:id",
  authMiddleware,
  validateParams(sessionParamsSchema),
  asyncHandler(revokeSessionById),
);
router.post(
  "/switch-role",
  authMiddleware,
  validate(switchRoleSchema),
  asyncHandler(switchRole),
);
export default router;
