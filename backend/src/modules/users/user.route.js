import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorize.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  validate,
  validateParams,
  validateQuery,
} from "../../middlewares/validation.middleware.js";
import * as controller from "./user.controller.js";
import * as schemas from "./user.validation.js";
const router = Router();
router.use(authMiddleware);
router.get(
  "/access-options",
  requirePermission("iam_users", "manage"),
  requirePermission("iam_permissions", "manage"),
  asyncHandler(controller.getUserOptions),
);
router.get(
  "/",
  requirePermission("iam_users", "view"),
  validateQuery(schemas.listUsersSchema),
  asyncHandler(controller.listUsers),
);
router.post(
  "/",
  requirePermission("iam_users", "manage"),
  requirePermission("iam_permissions", "manage"),
  validate(schemas.createUserSchema),
  asyncHandler(controller.createUser),
);
router.get(
  "/:id",
  requirePermission("iam_users", "view"),
  validateParams(schemas.userIdParamsSchema),
  asyncHandler(controller.getUser),
);
router.patch(
  "/:id",
  requirePermission("iam_users", "manage"),
  requirePermission("iam_permissions", "manage"),
  validateParams(schemas.userIdParamsSchema),
  validate(schemas.updateUserSchema),
  asyncHandler(controller.updateUser),
);
router.put(
  "/:id",
  requirePermission("iam_users", "manage"),
  requirePermission("iam_permissions", "manage"),
  validateParams(schemas.userIdParamsSchema),
  validate(schemas.updateUserSchema),
  asyncHandler(controller.updateUser),
);
router.patch(
  "/:id/status",
  requirePermission("iam_users", "manage"),
  validateParams(schemas.userIdParamsSchema),
  validate(schemas.updateUserStatusSchema),
  asyncHandler(controller.updateUserStatus),
);
router.post(
  "/:id/resend-invitation",
  requirePermission("iam_users", "manage"),
  validateParams(schemas.userIdParamsSchema),
  asyncHandler(controller.resendInvitation),
);
router.post(
  "/:id/resend-verification",
  requirePermission("iam_users", "manage"),
  validateParams(schemas.userIdParamsSchema),
  asyncHandler(controller.resendVerification),
);
router.get(
  "/:id/sessions",
  requirePermission("iam_users", "manage"),
  validateParams(schemas.userIdParamsSchema),
  asyncHandler(controller.getUserSessions),
);
router.delete(
  "/:id/sessions/:sessionId",
  requirePermission("iam_users", "manage"),
  validateParams(schemas.userSessionParamsSchema),
  asyncHandler(controller.revokeUserSession),
);
export default router;
