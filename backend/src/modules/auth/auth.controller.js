import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { ok } from '../../utils/response.js';

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new AppError('Email atau password salah', 401);
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Email atau password salah', 401);
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
  return ok(res, 'Login berhasil', { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
};

export const profile = async (req, res) => ok(res, 'Profile berhasil diambil', req.user);
export const logout = async (req, res) => ok(res, 'Logout berhasil');
