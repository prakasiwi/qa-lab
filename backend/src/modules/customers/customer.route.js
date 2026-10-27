import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorize.middleware.js";
import {
  validate,
  validateParams,
  validateQuery,
} from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as c from "./customer.controller.js";
import {
  createCustomerSchema,
  customerListQuerySchema,
  customerParamsSchema,
  statusSchema,
  updateCustomerSchema,
} from "./customer.validation.js";
const router = Router();
router.use(authMiddleware);
router.get(
  "/",
  requirePermission("customers", "view"),
  validateQuery(customerListQuerySchema),
  asyncHandler(c.listCustomers),
);
router.get(
  "/:id",
  requirePermission("customers", "view"),
  validateParams(customerParamsSchema),
  asyncHandler(c.getCustomer),
);
router.post(
  "/",
  requirePermission("customers", "create"),
  validate(createCustomerSchema),
  asyncHandler(c.createCustomer),
);
router.put(
  "/:id",
  requirePermission("customers", "update"),
  validateParams(customerParamsSchema),
  validate(updateCustomerSchema),
  asyncHandler(c.updateCustomer),
);
router.patch(
  "/:id/status",
  requirePermission("customers", "update"),
  validateParams(customerParamsSchema),
  validate(statusSchema),
  asyncHandler(c.updateCustomerStatus),
);
router.delete(
  "/:id",
  requirePermission("customers", "delete"),
  validateParams(customerParamsSchema),
  asyncHandler(c.deleteCustomer),
);
export default router;
