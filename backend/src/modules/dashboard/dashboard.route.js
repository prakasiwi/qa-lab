import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';

const router = Router();
const statuses = ['DRAFT', 'SUBMITTED', 'PAID', 'CANCELLED'];
const revenueStatuses = ['PAID', 'DRAFT', 'CANCELLED'];
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

router.use(authMiddleware);

router.get('/', asyncHandler(async (req, res) => {
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
    prisma.customer.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true } }),
    getLowStockCount(),
    prisma.invoice.aggregate({ where: { status: { in: revenueStatuses } }, _sum: { grandTotal: true } }),
    getMonthlyRevenueRows(),
    prisma.invoice.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
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
    getLowStockProducts(),
  ]);

  const invoiceStatus = statuses.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
  statusRows.forEach((row) => {
    invoiceStatus[row.status] = row._count.status;
  });

  const monthlyRevenue = monthLabels.map((month, index) => {
    const row = monthlyRows.find((item) => Number(item.month) === index + 1);
    return { month, revenue: Number(row?.revenue || 0) };
  });

  ok(res, 'Dashboard berhasil diambil', {
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
  });
}));

router.get('/summary', asyncHandler(async (req, res) => {
  const response = await buildLegacySummary();
  ok(res, 'Summary dashboard berhasil diambil', response);
}));

function lowStockWhereSql() {
  return Prisma.sql`
    "isActive" = true
    AND (
      ("initialStock" = 0 AND "availableStock" = 0)
      OR ("initialStock" > 0 AND ("availableStock"::numeric * 100) <= ("initialStock"::numeric * 20))
    )
  `;
}

function getLowStockCount() {
  return prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "Product"
    WHERE ${lowStockWhereSql()}
  `;
}

function getLowStockProducts() {
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
    WHERE ${lowStockWhereSql()}
    ORDER BY "availableStock" ASC, "productName" ASC
  `;
}

function getMonthlyRevenueRows() {
  return prisma.$queryRaw`
    SELECT
      EXTRACT(MONTH FROM COALESCE("paidAt", "updatedAt"))::int AS month,
      COALESCE(SUM("grandTotal"), 0)::numeric AS revenue
    FROM "Invoice"
    WHERE "status" IN ('PAID', 'DRAFT', 'CANCELLED')
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
    status: availableStock === 0 ? 'OUT OF STOCK' : 'LOW STOCK',
  };
}

async function buildLegacySummary() {
  const [activeCustomers, activeProducts, draft, submitted, paid, total] = await Promise.all([
    prisma.customer.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.invoice.count({ where: { status: 'DRAFT' } }),
    prisma.invoice.count({ where: { status: 'SUBMITTED' } }),
    prisma.invoice.count({ where: { status: 'PAID' } }),
    prisma.invoice.aggregate({ where: { status: { in: revenueStatuses } }, _sum: { grandTotal: true } }),
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
