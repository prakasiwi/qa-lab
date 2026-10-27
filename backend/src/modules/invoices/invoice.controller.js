import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { DECIMAL_12_2_MAX } from "../../utils/dbConstraints.js";
import { ok } from "../../utils/response.js";
import { ownedWhere, ownerData } from "../../utils/ownership.js";

const taxRate = () => Number(process.env.TAX_PERCENTAGE || 11);
const money = (n) => Math.round(Number(n) * 100) / 100;
const toNumber = (v) => Number(v || 0);
const invoiceDecimalFields = ["subtotal", "totalDiscount", "tax", "grandTotal"];
const invoiceItemDecimalFields = [
  "unitPrice",
  "discountAmount",
  "grossTotal",
  "lineTotal",
  "subtotal",
];

function ensureDecimal12Fits(data, fields, label) {
  for (const field of fields) {
    const value = Number(data[field]);
    if (!Number.isFinite(value) || Math.abs(value) > DECIMAL_12_2_MAX) {
      throw new AppError(
        `${label} ${field} melebihi batas maksimal ${DECIMAL_12_2_MAX}`,
        422,
      );
    }
  }
}

const mapInvoice = (i) =>
  i && {
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    customerId: i.customerId,
    issueDate: i.issueDate,
    invoiceDate: i.issueDate,
    dueDate: i.dueDate,
    status: i.status,
    additionalInfo: i.additionalInfo,
    notes: i.additionalInfo,
    customer: {
      id: i.customerId,
      code: i.customerCodeSnapshot,
      name: i.customerNameSnapshot,
      address: i.customerAddressSnapshot,
    },
    subtotal: toNumber(i.subtotal),
    totalDiscount: toNumber(i.totalDiscount),
    taxRate: toNumber(i.taxRate),
    tax: toNumber(i.tax),
    grandTotal: toNumber(i.grandTotal),
    version: i.version,
    submittedAt: i.submittedAt,
    paidAt: i.paidAt,
    cancelledAt: i.cancelledAt,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
    items: i.items?.map((it) => ({
      id: it.id,
      productId: it.productId,
      productCodeSnapshot: it.productCodeSnapshot,
      productNameSnapshot: it.productNameSnapshot,
      quantity: it.quantity,
      unitPrice: toNumber(it.unitPrice),
      discountPercent: toNumber(it.discountPercent),
      discountAmount: toNumber(it.discountAmount),
      grossTotal: toNumber(it.grossTotal),
      lineTotal: toNumber(it.lineTotal),
      subtotal: toNumber(it.subtotal),
      createdAt: it.createdAt,
    })),
  };

export function calculateInvoiceItem(product, item) {
  const quantity = Number(item.quantity);
  const discountPercent = Number(item.discountPercent || 0);
  const unitPrice = toNumber(product.price);
  const grossTotal = money(quantity * unitPrice);
  const discountAmount = money((grossTotal * discountPercent) / 100);
  const lineTotal = money(grossTotal - discountAmount);
  return {
    productId: product.id,
    productCodeSnapshot: product.productCode,
    productNameSnapshot: product.productName,
    quantity,
    unitPrice,
    discountPercent,
    discountAmount,
    grossTotal,
    lineTotal,
    subtotal: lineTotal,
  };
}

export function calculateInvoiceSummary(items) {
  const subtotal = money(items.reduce((sum, item) => sum + item.grossTotal, 0));
  const totalDiscount = money(
    items.reduce((sum, item) => sum + item.discountAmount, 0),
  );
  const taxableAmount = money(subtotal - totalDiscount);
  const rate = taxRate();
  const tax = money((taxableAmount * rate) / 100);
  const grandTotal = money(taxableAmount + tax);
  return { subtotal, totalDiscount, taxRate: rate, tax, grandTotal };
}

async function generateInvoiceNumber(tx) {
  const now = new Date();
  const period = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const counter = await tx.invoiceCounter.upsert({
    where: { period },
    create: { period, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
  });
  const sequence = counter.nextNumber - 1;
  return `INV-${period}-${String(sequence).padStart(6, "0")}`;
}

async function buildInvoiceData(body, user, database) {
  const issueDate = new Date(body.issueDate || body.invoiceDate);
  const dueDate = new Date(body.dueDate);
  if (Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime()))
    throw new AppError("Tanggal invoice tidak valid", 400);
  if (dueDate < issueDate)
    throw new AppError("Due date tidak boleh sebelum issue date", 422);

  const customerRows = await database.$queryRaw(Prisma.sql`
    SELECT * FROM "Customer"
    WHERE "id" = ${body.customerId}
    AND "ownerUserId" = ${user.id}
    FOR UPDATE
  `);
  const customer = customerRows[0];
  if (!customer) throw new AppError("Customer tidak ditemukan", 404);
  if (!customer.isActive)
    throw new AppError(
      "Customer tidak aktif dan tidak dapat digunakan pada invoice.",
      422,
    );

  const ids = body.items.map((x) => x.productId);
  if (new Set(ids).size !== ids.length)
    throw new AppError("Produk yang sama tidak boleh muncul dua kali", 422);

  const products = await lockProducts(database, ids, user);
  if (products.length !== ids.length)
    throw new AppError("Produk tidak ditemukan", 404);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const items = body.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new AppError("Produk tidak ditemukan", 404);
    if (!product.isActive) throw new AppError("Produk harus aktif", 422);
    if (item.quantity > product.availableStock)
      throw new AppError("Quantity tidak boleh melebihi Available Stock", 422);
    const invoiceItem = calculateInvoiceItem(product, item);
    ensureDecimal12Fits(invoiceItem, invoiceItemDecimalFields, "Invoice item");
    return invoiceItem;
  });
  const summary = calculateInvoiceSummary(items);
  ensureDecimal12Fits(summary, invoiceDecimalFields, "Invoice");

  return {
    customerId: customer.id,
    customerCodeSnapshot: customer.customerCode,
    customerNameSnapshot: customer.customerName,
    customerAddressSnapshot: customer.address || null,
    issueDate,
    dueDate,
    additionalInfo: body.additionalInfo || body.notes || null,
    ...summary,
    items,
  };
}

export const listInvoices = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    status,
    customerId,
  } = req.validatedQuery ?? req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = ownedWhere(req.user, {
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
    ...(search
      ? {
          OR: [
            { invoiceNumber: { contains: search, mode: "insensitive" } },
            { customerCodeSnapshot: { contains: search, mode: "insensitive" } },
            { customerNameSnapshot: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  });
  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.count({ where }),
  ]);
  ok(res, "Daftar invoice berhasil diambil", {
    items: rows.map(mapInvoice),
    total,
    page: Number(page),
    limit: Number(limit),
  });
};

export const getInvoice = async (req, res) => {
  const data = await prisma.invoice.findFirst({
    where: ownedWhere(req.user, { id: req.params.id }),
    include: { items: true },
  });
  if (!data) throw new AppError("Invoice tidak ditemukan", 404);
  ok(res, "Detail invoice berhasil diambil", mapInvoice(data));
};

export const createInvoice = async (req, res) => {
  const invoice = await prisma.$transaction(async (tx) => {
    const data = await buildInvoiceData(req.body, req.user, tx);
    const invoiceNumber = await generateInvoiceNumber(tx);
    const created = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        customerCodeSnapshot: data.customerCodeSnapshot,
        customerNameSnapshot: data.customerNameSnapshot,
        customerAddressSnapshot: data.customerAddressSnapshot,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        additionalInfo: data.additionalInfo,
        subtotal: data.subtotal,
        totalDiscount: data.totalDiscount,
        taxRate: data.taxRate,
        tax: data.tax,
        grandTotal: data.grandTotal,
        status: "DRAFT",
        createdBy: req.user.id,
        ...ownerData(req.user),
        items: { create: data.items },
      },
      include: { items: true },
    });
    await tx.invoiceHistory.create({
      data: {
        invoiceId: created.id,
        previousStatus: null,
        currentStatus: "DRAFT",
        action: "CREATED",
        performedBy: req.user.id,
      },
    });
    return created;
  });
  ok(res, "Invoice berhasil dibuat", mapInvoice(invoice), 201);
};

export const updateInvoice = async (req, res) => {
  const invoice = await prisma.$transaction(async (tx) => {
    const existing = await lockInvoice(tx, req.params.id, req.user);
    if (existing.status !== "DRAFT")
      throw new AppError("Invoice SUBMITTED tidak dapat diedit", 409);
    const data = await buildInvoiceData(req.body, req.user, tx);
    await tx.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } });
    const changed = await tx.invoice.updateMany({
      where: ownedWhere(req.user, {
        id: req.params.id,
        status: "DRAFT",
        version: existing.version,
      }),
      data: {
        customerId: data.customerId,
        customerCodeSnapshot: data.customerCodeSnapshot,
        customerNameSnapshot: data.customerNameSnapshot,
        customerAddressSnapshot: data.customerAddressSnapshot,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        additionalInfo: data.additionalInfo,
        subtotal: data.subtotal,
        totalDiscount: data.totalDiscount,
        taxRate: data.taxRate,
        tax: data.tax,
        grandTotal: data.grandTotal,
        version: { increment: 1 },
      },
    });
    if (changed.count !== 1)
      throw new AppError("Invoice tidak lagi berstatus DRAFT", 409);
    await tx.invoiceItem.createMany({
      data: data.items.map((item) => ({ ...item, invoiceId: req.params.id })),
    });
    return getInvoiceWithRelations(tx, req.params.id);
  });
  ok(res, "Invoice draft berhasil diubah", mapInvoice(invoice));
};

export const deleteInvoice = async (req, res) => {
  await prisma.$transaction(async (tx) => {
    const invoice = await lockInvoice(tx, req.params.id, req.user);
    if (invoice.status !== "DRAFT")
      throw new AppError("Hanya invoice DRAFT yang dapat dihapus", 409);
    const deleted = await tx.invoice.deleteMany({
      where: ownedWhere(req.user, {
        id: invoice.id,
        status: "DRAFT",
        version: invoice.version,
      }),
    });
    if (deleted.count !== 1)
      throw new AppError("Invoice tidak lagi berstatus DRAFT", 409);
  });
  res.status(204).send();
};

export const submitInvoice = async (req, res) => {
  const updated = await withTransactionRetry(async (tx) => {
    const lockedInvoice = await lockInvoice(tx, req.params.id, req.user);
    const invoice = await tx.invoice.findUnique({
      where: { id: lockedInvoice.id },
      include: { items: true },
    });
    if (invoice.status !== "DRAFT")
      throw new AppError("Invoice sudah pernah disubmit", 409);

    const lockedProducts = await lockProducts(
      tx,
      invoice.items.map((item) => item.productId),
      req.user,
    );
    const productMap = new Map(
      lockedProducts.map((product) => [product.id, product]),
    );
    for (const item of [...invoice.items].sort((left, right) =>
      left.productId.localeCompare(right.productId),
    )) {
      const product = productMap.get(item.productId);
      if (!product?.isActive || product.availableStock < item.quantity) {
        throw new AppError(
          "Available Stock product tidak mencukupi atau Product tidak aktif dan tidak dapat digunakan.",
          422,
        );
      }
      const result = await tx.product.updateMany({
        where: ownedWhere(req.user, {
          id: item.productId,
          isActive: true,
          availableStock: { gte: item.quantity },
        }),
        data: { availableStock: { decrement: item.quantity } },
      });
      if (result.count !== 1)
        throw new AppError(
          "Available Stock product tidak mencukupi atau Product tidak aktif dan tidak dapat digunakan.",
          422,
        );
    }

    const result = await tx.invoice.updateMany({
      where: ownedWhere(req.user, { id: req.params.id, status: "DRAFT" }),
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1)
      throw new AppError(
        "Invoice tidak ditemukan atau sudah pernah disubmit",
        409,
      );
    await tx.invoiceHistory.create({
      data: {
        invoiceId: req.params.id,
        previousStatus: "DRAFT",
        currentStatus: "SUBMITTED",
        action: "SUBMIT",
        performedBy: req.user.id,
      },
    });
    return getInvoiceWithRelations(tx, req.params.id);
  });
  ok(res, "Invoice berhasil disubmit", mapInvoice(updated));
};

async function lockInvoice(tx, id, user) {
  const rows = await tx.$queryRaw(Prisma.sql`
    SELECT * FROM "Invoice"
    WHERE "id" = ${id}
    AND "ownerUserId" = ${user.id}
    FOR UPDATE
  `);
  if (!rows[0]) throw new AppError("Invoice tidak ditemukan", 404);
  return rows[0];
}

async function lockProducts(tx, ids, user) {
  const sortedIds = [...new Set(ids)].sort();
  if (!sortedIds.length) return [];
  const rows = await tx.$queryRaw(Prisma.sql`
    SELECT * FROM "Product"
    WHERE "id" IN (${Prisma.join(sortedIds)})
    AND "ownerUserId" = ${user.id}
    ORDER BY "id"
    FOR UPDATE
  `);
  if (rows.length !== sortedIds.length)
    throw new AppError("Produk tidak ditemukan", 404);
  return rows;
}

function getInvoiceWithRelations(database, id) {
  return database.invoice.findUnique({
    where: { id },
    include: { items: true },
  });
}

async function withTransactionRetry(operation, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation);
    } catch (error) {
      const databaseCode = error?.meta?.code || error?.cause?.code;
      const isRetryable =
        error?.code === "P2034" ||
        databaseCode === "40P01" ||
        databaseCode === "40001";
      if (!isRetryable || attempt === maxAttempts) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, 10 * attempt + Math.floor(Math.random() * 20)),
      );
    }
  }
  throw new AppError("Transaksi gagal diproses", 503);
}

export const payInvoice = async (req, res) =>
  changeStatus(
    req,
    res,
    "SUBMITTED",
    "PAID",
    "PAY",
    { paidAt: new Date() },
    "Invoice berhasil ditandai paid",
  );
export const cancelInvoice = async (req, res) => {
  const updated = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: ownedWhere(req.user, { id: req.params.id }),
    });
    if (!invoice) throw new AppError("Invoice tidak ditemukan", 404);
    if (invoice.status !== "DRAFT")
      throw new AppError("Invoice harus berstatus DRAFT", 409);
    const changed = await tx.invoice.updateMany({
      where: ownedWhere(req.user, { id: req.params.id, status: "DRAFT" }),
      data: {
        status: "CANCELLED",
        version: { increment: 1 },
        cancelledAt: new Date(),
      },
    });
    if (changed.count !== 1)
      throw new AppError("Invoice harus berstatus DRAFT", 409);
    await tx.invoiceHistory.create({
      data: {
        invoiceId: req.params.id,
        previousStatus: "DRAFT",
        currentStatus: "CANCELLED",
        action: "CANCEL",
        performedBy: req.user.id,
      },
    });
    return getInvoiceWithRelations(tx, req.params.id);
  });
  ok(res, "Invoice berhasil dibatalkan", mapInvoice(updated));
};

async function changeStatus(req, res, from, to, action, extra, msg) {
  const updated = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: ownedWhere(req.user, { id: req.params.id }),
    });
    if (!invoice) throw new AppError("Invoice tidak ditemukan", 404);
    if (invoice.status !== from)
      throw new AppError(`Invoice harus berstatus ${from}`, 409);
    const changed = await tx.invoice.updateMany({
      where: ownedWhere(req.user, { id: req.params.id, status: from }),
      data: { status: to, version: { increment: 1 }, ...extra },
    });
    if (changed.count !== 1)
      throw new AppError(`Invoice harus berstatus ${from}`, 409);
    await tx.invoiceHistory.create({
      data: {
        invoiceId: req.params.id,
        previousStatus: from,
        currentStatus: to,
        action,
        performedBy: req.user.id,
      },
    });
    return getInvoiceWithRelations(tx, req.params.id);
  });
  ok(res, msg, mapInvoice(updated));
}

export const histories = async (req, res) => {
  const invoice = await prisma.invoice.findFirst({
    where: ownedWhere(req.user, { id: req.params.id }),
  });
  if (!invoice) throw new AppError("Invoice tidak ditemukan", 404);
  return ok(
    res,
    "Histori invoice berhasil diambil",
    await prisma.invoiceHistory.findMany({
      where: { invoiceId: req.params.id },
      orderBy: { createdAt: "asc" },
    }),
  );
};
