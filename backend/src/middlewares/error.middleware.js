import { Prisma } from '@prisma/client';

export const errorMiddleware = (err, req, res, next) => {
  console.error(err);
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target : [];
    if (target.includes('email')) {
      return res.status(409).json({ success: false, message: 'Email customer sudah digunakan' });
    }
    if (target.includes('customerCode')) {
      return res.status(409).json({ success: false, message: 'Customer Code sudah digunakan' });
    }
    return res.status(409).json({ success: false, message: 'Data duplicate' });
  }
  const statusCode = err.statusCode || 500;
  const body = { success: false, message: err.message || 'Kesalahan server' };
  if (err.errors) body.errors = err.errors;
  return res.status(statusCode).json(body);
};
