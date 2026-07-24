import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { ok } from '../../utils/response.js';

const taxRate = () => Number(process.env.TAX_PERCENTAGE || 11);
const money = (n) => Math.round(Number(n) * 100) / 100;
const toNumber = (v) => Number(v || 0);

const mapInvoice = (i) => i && ({
  ...i,
  issueDate: i.issueDate,
  invoiceDate: i.issueDate,
  additionalInfo: i.additionalInfo,
  notes: i.additionalInfo,
  customer: i.customer ? {
    ...i.customer,
    code: i.customerCodeSnapshot,
    name: i.customerNameSnapshot,
    address: i.customerAddressSnapshot,
  } : {
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
  items: i.items?.map((it) => ({
    ...it,
    productCodeSnapshot: it.productCodeSnapshot || it.product?.productCode,
    unitPrice: toNumber(it.unitPrice),
    discountPercent: toNumber(it.discountPercent),
    discountAmount: toNumber(it.discountAmount),
    grossTotal: toNumber(it.grossTotal),
    lineTotal: toNumber(it.lineTotal),
    subtotal: toNumber(it.subtotal),
  })),
});

export function calculateInvoiceItem(product, item) {
  const quantity = Number(item.quantity);
  const discountPercent = Number(item.discountPercent || 0);
  const unitPrice = toNumber(product.price);
  const grossTotal = money(quantity * unitPrice);
  const discountAmount = money(grossTotal * discountPercent / 100);
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
  const totalDiscount = money(items.reduce((sum, item) => sum + item.discountAmount, 0));
  const taxableAmount = money(subtotal - totalDiscount);
  const rate = taxRate();
  const tax = money(taxableAmount * rate / 100);
  const grandTotal = money(taxableAmount + tax);
  return { subtotal, totalDiscount, taxRate: rate, tax, grandTotal };
}

async function generateInvoiceNumber(tx) {
  const now = new Date();
  const period = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const counter = await tx.invoiceCounter.upsert({
    where: { period },
    create: { period, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
  });
  const sequence = counter.nextNumber - 1;
  return `INV-${period}-${String(sequence).padStart(6, '0')}`;
}

async function buildInvoiceData(body) {
  const issueDate = new Date(body.issueDate || body.invoiceDate);
  const dueDate = new Date(body.dueDate);
  if (Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime())) throw new AppError('Tanggal invoice tidak valid', 400);
  if (dueDate < issueDate) throw new AppError('Due date tidak boleh sebelum issue date', 422);

  const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
  if (!customer) throw new AppError('Customer tidak ditemukan', 404);
  if (!customer.isActive) throw new AppError('Customer tidak aktif dan tidak dapat digunakan pada invoice.', 422);

  const ids = body.items.map((x) => x.productId);
  if (new Set(ids).size !== ids.length) throw new AppError('Produk yang sama tidak boleh muncul dua kali', 422);

  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  if (products.length !== ids.length) throw new AppError('Produk tidak ditemukan', 404);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const items = body.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new AppError('Produk tidak ditemukan', 404);
    if (!product.isActive) throw new AppError('Produk harus aktif', 422);
    if (item.quantity > product.availableStock) throw new AppError('Quantity tidak boleh melebihi Available Stock', 422);
    return calculateInvoiceItem(product, item);
  });

  return {
    customerId: customer.id,
    customerCodeSnapshot: customer.customerCode,
    customerNameSnapshot: customer.customerName,
    customerAddressSnapshot: customer.address || null,
    issueDate,
    dueDate,
    additionalInfo: body.additionalInfo || body.notes || null,
    ...calculateInvoiceSummary(items),
    items,
  };
}

export const listInvoices = async (req, res) => {
  const rows = await prisma.invoice.findMany({ include: { customer: true }, orderBy: { createdAt: 'desc' } });
  ok(res, 'Daftar invoice berhasil diambil', rows.map(mapInvoice));
};

export const getInvoice = async (req, res) => {
  const data = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { customer: true, items: { include: { product: true } } } });
  if (!data) throw new AppError('Invoice tidak ditemukan', 404);
  ok(res, 'Detail invoice berhasil diambil', mapInvoice(data));
};

export const createInvoice = async (req, res) => {
  const data = await buildInvoiceData(req.body);
  const invoice = await prisma.$transaction(async (tx) => {
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
        status: 'DRAFT',
        createdBy: req.user.id,
        items: { create: data.items },
      },
      include: { items: { include: { product: true } }, customer: true },
    });
    await tx.invoiceHistory.create({ data: { invoiceId: created.id, previousStatus: null, currentStatus: 'DRAFT', action: 'CREATED', performedBy: req.user.id } });
    return created;
  });
  ok(res, 'Invoice berhasil dibuat', mapInvoice(invoice), 201);
};

export const updateInvoice = async (req, res) => {
  const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Invoice tidak ditemukan', 404);
  if (existing.status !== 'DRAFT') throw new AppError('Invoice SUBMITTED tidak dapat diedit', 409);
  const data = await buildInvoiceData(req.body);
  const invoice = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } });
    return tx.invoice.update({
      where: { id: req.params.id },
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
        items: { create: data.items },
      },
      include: { items: { include: { product: true } }, customer: true },
    });
  });
  ok(res, 'Invoice draft berhasil diubah', mapInvoice(invoice));
};

export const deleteInvoice = async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) throw new AppError('Invoice tidak ditemukan', 404);
  if (invoice.status !== 'DRAFT') throw new AppError('Hanya invoice DRAFT yang dapat dihapus', 409);
  await prisma.invoice.delete({ where: { id: req.params.id } });
  res.status(204).send();
};

export const submitInvoice = async (req, res) => {
  if (req.query.mode === 'buggy') return buggySubmit(req, res);
  const updated = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!invoice || invoice.status !== 'DRAFT') throw new AppError('Invoice tidak ditemukan atau sudah pernah disubmit', 409);

    for (const item of invoice.items) {
      const result = await tx.product.updateMany({
        where: { id: item.productId, isActive: true, availableStock: { gte: item.quantity } },
        data: { availableStock: { decrement: item.quantity } },
      });
      if (result.count !== 1) throw new AppError('Available Stock product tidak mencukupi atau Product tidak aktif dan tidak dapat digunakan.', 422);
    }

    const result = await tx.invoice.updateMany({ where: { id: req.params.id, status: 'DRAFT' }, data: { status: 'SUBMITTED', submittedAt: new Date(), version: { increment: 1 } } });
    if (result.count !== 1) throw new AppError('Invoice tidak ditemukan atau sudah pernah disubmit', 409);
    await tx.invoiceHistory.create({ data: { invoiceId: req.params.id, previousStatus: 'DRAFT', currentStatus: 'SUBMITTED', action: 'SUBMIT', performedBy: req.user.id } });
    return tx.invoice.findUnique({ where: { id: req.params.id }, include: { items: { include: { product: true } }, customer: true } });
  });
  ok(res, 'Invoice berhasil disubmit', mapInvoice(updated));
};

async function buggySubmit(req, res) {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice || invoice.status !== 'DRAFT') throw new AppError('Invoice tidak ditemukan atau sudah pernah disubmit', 409);
  await new Promise(r => setTimeout(r, 400));
  const updated = await prisma.invoice.update({ where: { id: req.params.id }, data: { status: 'SUBMITTED', submittedAt: new Date() }, include: { items: { include: { product: true } }, customer: true } });
  await prisma.invoiceHistory.create({ data: { invoiceId: req.params.id, previousStatus: 'DRAFT', currentStatus: 'SUBMITTED', action: 'SUBMIT_BUGGY', performedBy: req.user.id } });
  ok(res, 'Invoice berhasil disubmit (buggy)', mapInvoice(updated));
}

export const payInvoice = async (req, res) => changeStatus(req, res, 'SUBMITTED', 'PAID', 'PAY', { paidAt: new Date() }, 'Invoice berhasil ditandai paid');
export const cancelInvoice = async (req, res) => {
  const updated = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) throw new AppError('Invoice tidak ditemukan', 404);
    if (invoice.status !== 'DRAFT') throw new AppError('Invoice harus berstatus DRAFT', 409);
    const row = await tx.invoice.update({ where: { id: req.params.id }, data: { status: 'CANCELLED', version: { increment: 1 }, cancelledAt: new Date() }, include: { items: { include: { product: true } }, customer: true } });
    await tx.invoiceHistory.create({ data: { invoiceId: req.params.id, previousStatus: 'DRAFT', currentStatus: 'CANCELLED', action: 'CANCEL', performedBy: req.user.id } });
    return row;
  });
  ok(res, 'Invoice berhasil dibatalkan', mapInvoice(updated));
};

async function changeStatus(req, res, from, to, action, extra, msg) {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) throw new AppError('Invoice tidak ditemukan', 404);
  if (invoice.status !== from) throw new AppError(`Invoice harus berstatus ${from}`, 409);
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.invoice.update({ where: { id: req.params.id }, data: { status: to, version: { increment: 1 }, ...extra }, include: { items: { include: { product: true } }, customer: true } });
    await tx.invoiceHistory.create({ data: { invoiceId: req.params.id, previousStatus: from, currentStatus: to, action, performedBy: req.user.id } });
    return row;
  });
  ok(res, msg, mapInvoice(updated));
}

export const histories = async (req, res) => ok(res, 'Histori invoice berhasil diambil', await prisma.invoiceHistory.findMany({ where: { invoiceId: req.params.id }, orderBy: { createdAt: 'asc' } }));
