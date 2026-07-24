import { Prisma } from '@prisma/client';

export const errorMiddleware = (err, req, res, next) => {
  console.error(err);
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Data duplicate' });
  }
  const statusCode = err.statusCode || 500;
  const body = { success: false, message: err.message || 'Kesalahan server' };
  if (err.errors) body.errors = err.errors;
  return res.status(statusCode).json(body);
};
