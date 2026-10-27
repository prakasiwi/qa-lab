import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorize.middleware.js";
import {
  validate,
  validateParams,
  validateQuery,
} from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./permission.controller.js";
import * as schemas from "./permission.validation.js";

const router = Router();
router.use(authMiddleware);
router.get(
  "/catalog",
  requirePermission("iam_permissions", "view"),
  asyncHandler(controller.getPermissionActionCatalog),
);
router.get(
  "/action-catalog",
  requirePermission("iam_permissions", "view"),
  asyncHandler(controller.getPermissionActionCatalog),
);
router.get(
  "/",
  requirePermission("iam_permissions", "view"),
  validateQuery(schemas.permissionListQuerySchema),
  asyncHandler(controller.listPermissions),
);
router.post(
  "/",
  requirePermission("iam_permissions", "manage"),
  validate(schemas.createPermissionSchema),
  asyncHandler(controller.createPermission),
);
router.get(
  "/:id",
  requirePermission("iam_permissions", "view"),
  validateParams(schemas.permissionIdParamsSchema),
  asyncHandler(controller.getPermission),
);
router.patch(
  "/:id",
  requirePermission("iam_permissions", "manage"),
  validateParams(schemas.permissionIdParamsSchema),
  validate(schemas.updatePermissionSchema),
  asyncHandler(controller.updatePermission),
);
export default router;
