import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ok } from "../../utils/response.js";
import { ownedWhere, ownerData } from "../../utils/ownership.js";

const mapProduct = (product) =>
  product ? { ...product, price: Number(product.price) } : product;

function normalizeProductPayload(body) {
  return {
    productCode: String(body.productCode || "")
      .trim()
      .toUpperCase(),
    productName: String(body.productName || "").trim(),
    price: Number(body.price),
    initialStock: Number(body.initialStock),
    isActive: body.isActive ?? true,
  };
}

async function ensureUniqueCode(
  productCode,
  ownerUserId,
  exceptId,
  database = prisma,
) {
  const duplicate = await database.product.findFirst({
    where: {
      ownerUserId,
      productCode,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });
  if (duplicate) {
    throw new AppError("Product Code sudah digunakan", 409);
  }
}

export const listProducts = async (req, res) => {
  const {
    search = "",
    page = 1,
    limit = 10,
    status,
  } = req.validatedQuery ?? req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = ownedWhere(req.user, {
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
    ...(search
      ? {
          OR: [
            { productCode: { contains: search, mode: "insensitive" } },
            { productName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  });
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);
  ok(res, "Daftar produk berhasil diambil", {
    items: rows.map(mapProduct),
    total,
    page: Number(page),
    limit: Number(limit),
  });
};

export const getProduct = async (req, res) => {
  ok(
    res,
    "Detail produk berhasil diambil",
    mapProduct(await getExisting(req.params.id, req.user)),
  );
};

export const createProduct = async (req, res) => {
  const data = normalizeProductPayload(req.body);
  await ensureUniqueCode(data.productCode, req.user.id);
  ok(
    res,
    "Produk berhasil dibuat",
    mapProduct(
      await prisma.product.create({
        data: {
          ...data,
          ...ownerData(req.user),
          availableStock: data.initialStock,
        },
      }),
    ),
    201,
  );
};

export const updateProduct = async (req, res) => {
  const data = normalizeProductPayload(req.body);
  const updated = await prisma.$transaction(async (tx) => {
    const product = await lockProduct(tx, req.params.id, req.user);
    await ensureUniqueCode(
      data.productCode,
      product.ownerUserId,
      product.id,
      tx,
    );
    const newAvailableStock =
      product.availableStock + data.initialStock - product.initialStock;
    if (newAvailableStock < 0 || newAvailableStock > data.initialStock) {
      throw new AppError(
        "Initial Stock tidak dapat lebih kecil dari stock yang sudah digunakan.",
        422,
      );
    }
    return tx.product.update({
      where: { id: product.id },
      data: { ...data, availableStock: newAvailableStock },
    });
  });
  ok(res, "Produk berhasil diubah", mapProduct(updated));
};

export const updateProductStatus = async (req, res) => {
  await getExisting(req.params.id, req.user);
  ok(
    res,
    "Status produk berhasil diubah",
    mapProduct(
      await prisma.product.update({
        where: { id: req.params.id },
        data: { isActive: req.body.isActive },
      }),
    ),
  );
};

export const deleteProduct = async (req, res) => {
  await prisma.$transaction(async (tx) => {
    const product = await lockProduct(tx, req.params.id, req.user);
    const used = await tx.invoiceItem.count({
      where: { productId: product.id },
    });
    if (used)
      throw new AppError(
        "Product tidak dapat dihapus karena sudah digunakan pada invoice. Ubah status menjadi Inactive.",
        409,
      );
    await tx.product.delete({ where: { id: product.id } });
  });
  res.status(204).send();
};

async function lockProduct(tx, id, user) {
  const rows = await tx.$queryRaw(Prisma.sql`
    SELECT * FROM "Product"
    WHERE "id" = ${id}
    AND "ownerUserId" = ${user.id}
    FOR UPDATE
  `);
  if (!rows[0]) throw new AppError("Produk tidak ditemukan", 404);
  return rows[0];
}

async function getExisting(id, user) {
  const data = await prisma.product.findFirst({
    where: ownedWhere(user, { id }),
  });
  if (!data) throw new AppError("Produk tidak ditemukan", 404);
  return data;
}
