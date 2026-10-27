import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorize.middleware.js";
import {
  validate,
  validateParams,
  validateQuery,
} from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./role.controller.js";
import * as schemas from "./role.validation.js";

const router = Router();
router.use(authMiddleware);
router.get(
  "/",
  requirePermission("iam_roles", "view"),
  validateQuery(schemas.roleListQuerySchema),
  asyncHandler(controller.listRoles),
);
router.post(
  "/",
  requirePermission("iam_roles", "manage"),
  validate(schemas.createRoleSchema),
  asyncHandler(controller.createRole),
);
router.get(
  "/:id",
  requirePermission("iam_roles", "view"),
  validateParams(schemas.roleIdParamsSchema),
  asyncHandler(controller.getRole),
);
router.patch(
  "/:id",
  requirePermission("iam_roles", "manage"),
  validateParams(schemas.roleIdParamsSchema),
  validate(schemas.updateRoleSchema),
  asyncHandler(controller.updateRole),
);
export default router;
