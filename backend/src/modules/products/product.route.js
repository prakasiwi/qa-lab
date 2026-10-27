import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorize.middleware.js";
import {
  validate,
  validateParams,
  validateQuery,
} from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as c from "./product.controller.js";
import {
  productListQuerySchema,
  productParamsSchema,
  productSchema,
  statusSchema,
} from "./product.validation.js";
const router = Router();
router.use(authMiddleware);
router.get(
  "/",
  requirePermission("products", "view"),
  validateQuery(productListQuerySchema),
  asyncHandler(c.listProducts),
);
router.get(
  "/:id",
  requirePermission("products", "view"),
  validateParams(productParamsSchema),
  asyncHandler(c.getProduct),
);
router.post(
  "/",
  requirePermission("products", "create"),
  validate(productSchema),
  asyncHandler(c.createProduct),
);
router.put(
  "/:id",
  requirePermission("products", "update"),
  validateParams(productParamsSchema),
  validate(productSchema),
  asyncHandler(c.updateProduct),
);
router.patch(
  "/:id/status",
  requirePermission("products", "update"),
  validateParams(productParamsSchema),
  validate(statusSchema),
  asyncHandler(c.updateProductStatus),
);
router.delete(
  "/:id",
  requirePermission("products", "delete"),
  validateParams(productParamsSchema),
  asyncHandler(c.deleteProduct),
);
export default router;
