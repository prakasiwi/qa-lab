import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorize.middleware.js";
import {
  validate,
  validateParams,
  validateQuery,
} from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as c from "./invoice.controller.js";
import {
  invoiceListQuerySchema,
  invoiceParamsSchema,
  invoiceSchema,
} from "./invoice.validation.js";
const router = Router();
router.use(authMiddleware);
router.get(
  "/",
  requirePermission("invoices", "view"),
  validateQuery(invoiceListQuerySchema),
  asyncHandler(c.listInvoices),
);
router.get(
  "/:id",
  requirePermission("invoices", "view"),
  validateParams(invoiceParamsSchema),
  asyncHandler(c.getInvoice),
);
router.post(
  "/",
  requirePermission("invoices", "create"),
  validate(invoiceSchema),
  asyncHandler(c.createInvoice),
);
router.put(
  "/:id",
  requirePermission("invoices", "update"),
  validateParams(invoiceParamsSchema),
  validate(invoiceSchema),
  asyncHandler(c.updateInvoice),
);
router.delete(
  "/:id",
  requirePermission("invoices", "delete"),
  validateParams(invoiceParamsSchema),
  asyncHandler(c.deleteInvoice),
);
router.post(
  "/:id/submit",
  requirePermission("invoices", "submit"),
  validateParams(invoiceParamsSchema),
  asyncHandler(c.submitInvoice),
);
router.post(
  "/:id/pay",
  requirePermission("invoices", "pay"),
  validateParams(invoiceParamsSchema),
  asyncHandler(c.payInvoice),
);
router.post(
  "/:id/cancel",
  requirePermission("invoices", "cancel"),
  validateParams(invoiceParamsSchema),
  asyncHandler(c.cancelInvoice),
);
router.get(
  "/:id/histories",
  requirePermission("invoices", "view"),
  validateParams(invoiceParamsSchema),
  asyncHandler(c.histories),
);
export default router;
