import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { ok } from '../../utils/response.js';

const mapProduct = (product) => product ? { ...product, price: Number(product.price) } : product;

function normalizeProductPayload(body) {
  return {
    productCode: String(body.productCode || '').trim().toUpperCase(),
    productName: String(body.productName || '').trim(),
    price: Number(body.price),
    initialStock: Number(body.initialStock),
    isActive: body.isActive ?? true,
  };
}

async function ensureUniqueCode(productCode, exceptId) {
  const duplicate = await prisma.product.findUnique({ where: { productCode } });
  if (duplicate && duplicate.id !== exceptId) {
    throw new AppError('Product Code sudah digunakan', 409);
  }
}

export const listProducts = async (req, res) => {
  const { search = '', page = 1, limit = 10, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = {
    ...(status === 'active' ? { isActive: true } : {}),
    ...(status === 'inactive' ? { isActive: false } : {}),
    ...(search ? {
      OR: [
        { productCode: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
    prisma.product.count({ where }),
  ]);
  ok(res, 'Daftar produk berhasil diambil', { items: rows.map(mapProduct), total, page: Number(page), limit: Number(limit) });
};

export const getProduct = async (req, res) => {
  ok(res, 'Detail produk berhasil diambil', mapProduct(await getExisting(req.params.id)));
};

export const createProduct = async (req, res) => {
  const data = normalizeProductPayload(req.body);
  await ensureUniqueCode(data.productCode);
  ok(res, 'Produk berhasil dibuat', mapProduct(await prisma.product.create({ data: { ...data, availableStock: data.initialStock } })), 201);
};

export const updateProduct = async (req, res) => {
  const product = await getExisting(req.params.id);
  const data = normalizeProductPayload(req.body);
  await ensureUniqueCode(data.productCode, req.params.id);

  const difference = data.initialStock - product.initialStock;
  const newAvailableStock = product.availableStock + difference;
  if (newAvailableStock < 0 || newAvailableStock > data.initialStock) {
    throw new AppError('Initial Stock tidak dapat lebih kecil dari stock yang sudah digunakan.', 422);
  }

  ok(res, 'Produk berhasil diubah', mapProduct(await prisma.product.update({
    where: { id: req.params.id },
    data: { ...data, availableStock: newAvailableStock },
  })));
};

export const updateProductStatus = async (req, res) => {
  await getExisting(req.params.id);
  ok(res, 'Status produk berhasil diubah', mapProduct(await prisma.product.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive } })));
};

export const deleteProduct = async (req, res) => {
  await getExisting(req.params.id);
  const used = await prisma.invoiceItem.count({ where: { productId: req.params.id } });
  if (used) throw new AppError('Product tidak dapat dihapus karena sudah digunakan pada invoice. Ubah status menjadi Inactive.', 409);
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).send();
};

async function getExisting(id) {
  const data = await prisma.product.findUnique({ where: { id } });
  if (!data) throw new AppError('Produk tidak ditemukan', 404);
  return data;
}
