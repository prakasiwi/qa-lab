import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { login, logout, profile } from './auth.controller.js';
import { loginSchema } from './auth.validation.js';

const router = Router();
router.post('/login', validate(loginSchema), asyncHandler(login));
router.get('/profile', authMiddleware, asyncHandler(profile));
router.post('/logout', authMiddleware, asyncHandler(logout));
export default router;
