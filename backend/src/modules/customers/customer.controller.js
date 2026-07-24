import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { ok } from '../../utils/response.js';

function normalizeCustomerPayload(body) {
  return {
    customerCode: String(body.customerCode || '').trim().toUpperCase(),
    customerName: String(body.customerName || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
    phone: body.phone ? String(body.phone).trim() : null,
    address: String(body.address || '').trim(),
    isActive: body.isActive ?? true,
  };
}

async function ensureUniqueCode(customerCode, exceptId) {
  const duplicate = await prisma.customer.findUnique({ where: { customerCode } });
  if (duplicate && duplicate.id !== exceptId) throw new AppError('Customer Code sudah digunakan', 409);
}

export const listCustomers = async (req, res) => {
  const { search = '', page = 1, limit = 10, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = {
    ...(status === 'active' ? { isActive: true } : {}),
    ...(status === 'inactive' ? { isActive: false } : {}),
    ...(search ? { OR: [{ customerCode: { contains: search, mode: 'insensitive' } }, { customerName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
    prisma.customer.count({ where }),
  ]);
  ok(res, 'Daftar customer berhasil diambil', { items, total, page: Number(page), limit: Number(limit) });
};

export const getCustomer = async (req, res) => {
  ok(res, 'Detail customer berhasil diambil', await getExisting(req.params.id));
};

export const createCustomer = async (req, res) => {
  const data = normalizeCustomerPayload(req.body);
  await ensureUniqueCode(data.customerCode);
  ok(res, 'Customer berhasil dibuat', await prisma.customer.create({ data }), 201);
};

export const updateCustomer = async (req, res) => {
  await getExisting(req.params.id);
  const data = normalizeCustomerPayload(req.body);
  await ensureUniqueCode(data.customerCode, req.params.id);
  ok(res, 'Customer berhasil diubah', await prisma.customer.update({ where: { id: req.params.id }, data }));
};

export const updateCustomerStatus = async (req, res) => {
  await getExisting(req.params.id);
  ok(res, 'Status customer berhasil diubah', await prisma.customer.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive } }));
};

export const deleteCustomer = async (req, res) => {
  await getExisting(req.params.id);
  const used = await prisma.invoice.count({ where: { customerId: req.params.id } });
  if (used) throw new AppError('Customer tidak dapat dihapus karena sudah digunakan pada invoice. Ubah status menjadi Inactive.', 409);
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(204).send();
};

async function getExisting(id) {
  const data = await prisma.customer.findUnique({ where: { id } });
  if (!data) throw new AppError('Customer tidak ditemukan', 404);
  return data;
}
