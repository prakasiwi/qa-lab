import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorize.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/response.js";

const router = Router();
const statuses = ["DRAFT", "SUBMITTED", "PAID", "CANCELLED"];
const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

router.use(authMiddleware);

router.get(
  "/",
  requirePermission("dashboard", "view"),
  asyncHandler(async (req, res) => {
    return ok(
      res,
      "Dashboard berhasil diambil",
      await buildOwnedDashboard(req.user.id),
    );
  }),
);

router.get(
  "/summary",
  requirePermission("dashboard", "view"),
  asyncHandler(async (req, res) => {
    return ok(
      res,
      "Summary dashboard berhasil diambil",
      await buildOwnedLegacySummary(req.user.id),
    );
  }),
);

function lowStockWhereSql(ownerUserId) {
  return Prisma.sql`
    "isActive" = true
    AND "ownerUserId" = ${ownerUserId}
    AND (
      ("initialStock" = 0 AND "availableStock" = 0)
      OR ("initialStock" > 0 AND ("availableStock" * 100) <= ("initialStock" * 20))
    )
  `;
}

function getLowStockCount(ownerUserId) {
  return prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "Product"
    WHERE ${lowStockWhereSql(ownerUserId)}
  `;
}

function getLowStockProducts(ownerUserId) {
  return prisma.$queryRaw`
    SELECT
      "id",
      "productCode",
      "productName",
      "initialStock",
      "availableStock",
      CASE
        WHEN "availableStock" = 0 THEN 0
        WHEN "initialStock" = 0 THEN 0
        ELSE ROUND(("availableStock"::numeric / "initialStock"::numeric) * 100, 2)
      END AS "stockPercentage"
    FROM "Product"
    WHERE ${lowStockWhereSql(ownerUserId)}
    ORDER BY "availableStock" ASC, "productName" ASC
    LIMIT 20
  `;
}

function getMonthlyRevenueRows(ownerUserId) {
  return prisma.$queryRaw`
    SELECT
      EXTRACT(MONTH FROM COALESCE("paidAt", "updatedAt"))::int AS month,
      COALESCE(SUM("grandTotal"), 0)::numeric AS revenue
    FROM "Invoice"
    WHERE "status" = 'PAID'
      AND "ownerUserId" = ${ownerUserId}
      AND EXTRACT(YEAR FROM COALESCE("paidAt", "updatedAt")) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY month
    ORDER BY month ASC
  `;
}

function mapLowStockProduct(row) {
  const initialStock = Number(row.initialStock || 0);
  const availableStock = Number(row.availableStock || 0);
  return {
    id: row.id,
    productCode: row.productCode,
    productName: row.productName,
    initialStock,
    availableStock,
    stockPercentage: Number(row.stockPercentage || 0),
    status: availableStock === 0 ? "OUT OF STOCK" : "LOW STOCK",
  };
}

async function buildOwnedDashboard(ownerUserId) {
  const [
    activeCustomers,
    activeProducts,
    lowStockCountRows,
    paidRevenue,
    monthlyRows,
    statusRows,
    recentInvoices,
    lowStockRows,
  ] = await Promise.all([
    prisma.customer.count({ where: { ownerUserId, isActive: true } }),
    prisma.product.count({ where: { ownerUserId, isActive: true } }),
    getLowStockCount(ownerUserId),
    prisma.invoice.aggregate({
      where: { ownerUserId, status: "PAID" },
      _sum: { grandTotal: true },
    }),
    getMonthlyRevenueRows(ownerUserId),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { ownerUserId },
      _count: { status: true },
    }),
    prisma.invoice.findMany({
      where: { ownerUserId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        customerNameSnapshot: true,
        customerCodeSnapshot: true,
        issueDate: true,
        status: true,
        grandTotal: true,
      },
    }),
    getLowStockProducts(ownerUserId),
  ]);
  const invoiceStatus = statuses.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {},
  );
  statusRows.forEach((row) => {
    invoiceStatus[row.status] = row._count.status;
  });
  const monthlyRevenue = monthLabels.map((month, index) => {
    const row = monthlyRows.find((item) => Number(item.month) === index + 1);
    return { month, revenue: Number(row?.revenue || 0) };
  });
  return {
    summary: {
      activeCustomers,
      activeProducts,
      lowStockProducts: Number(lowStockCountRows[0]?.count || 0),
      paidRevenue: Number(paidRevenue._sum.grandTotal || 0),
    },
    monthlyRevenue,
    invoiceStatus,
    recentInvoices: recentInvoices.map((invoice) => ({
      ...invoice,
      grandTotal: Number(invoice.grandTotal || 0),
    })),
    lowStockProductItems: lowStockRows.map(mapLowStockProduct),
  };
}

async function buildOwnedLegacySummary(ownerUserId) {
  const [activeCustomers, activeProducts, draft, submitted, paid, total] =
    await Promise.all([
      prisma.customer.count({ where: { ownerUserId, isActive: true } }),
      prisma.product.count({ where: { ownerUserId, isActive: true } }),
      prisma.invoice.count({ where: { ownerUserId, status: "DRAFT" } }),
      prisma.invoice.count({ where: { ownerUserId, status: "SUBMITTED" } }),
      prisma.invoice.count({ where: { ownerUserId, status: "PAID" } }),
      prisma.invoice.aggregate({
        where: { ownerUserId, status: "PAID" },
        _sum: { grandTotal: true },
      }),
    ]);
  return {
    activeCustomers,
    activeProducts,
    draftInvoices: draft,
    submittedInvoices: submitted,
    paidInvoices: paid,
    totalInvoiceValue: Number(total._sum.grandTotal || 0),
  };
}

export default router;
