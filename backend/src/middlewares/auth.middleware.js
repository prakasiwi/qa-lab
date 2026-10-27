import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import {
  AUTH_COOKIE_NAME,
  getAllowedCorsOrigins,
  getJwtSecret,
  normalizeHttpOrigin,
} from "../modules/auth/auth.constants.js";
import { hashSessionToken } from "../modules/auth/session.service.js";

function getCookie(req, name) {
  const pair = req.headers.cookie
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));
  if (!pair) return undefined;
  try {
    return decodeURIComponent(pair.slice(name.length + 1));
  } catch {
    return undefined;
  }
}

function assertCookieRequestOrigin(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.get("origin");
  if (!origin || origin === "null")
    throw new AppError("Request origin is not allowed.", 403);
  const requestOrigin = normalizeHttpOrigin(origin);
  const allowedOrigins = getAllowedCorsOrigins();
  if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
    throw new AppError("Request origin is not allowed.", 403);
  }
}

export const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const cookieToken = getCookie(req, AUTH_COOKIE_NAME);
    const usesBearer = header?.startsWith("Bearer ");
    const token = usesBearer ? header.slice(7) : cookieToken;
    if (!token) throw new AppError("Authentication token is required.", 401);
    if (!usesBearer) assertCookieRequestOrigin(req);
    const payload = jwt.verify(token, getJwtSecret());
    if (
      typeof payload !== "object" ||
      typeof payload.sid !== "string" ||
      typeof payload.sessionToken !== "string"
    ) {
      throw new AppError("Authentication token is invalid.", 401);
    }
    const session = await prisma.session.findUnique({
      where: { id: payload.sid },
      select: {
        id: true,
        userId: true,
        userAccessId: true,
        tokenHash: true,
        expiresAt: true,
        revokedAt: true,
        user: { select: { id: true, name: true, email: true, status: true } },
        userAccess: {
          select: {
            userId: true,
            isActive: true,
            role: {
              select: { id: true, code: true, name: true, isActive: true },
            },
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
                actions: { select: { resource: true, action: true } },
              },
            },
          },
        },
      },
    });
    const access = session?.userAccess;
    const isValid =
      session &&
      session.tokenHash === hashSessionToken(payload.sessionToken) &&
      !session.revokedAt &&
      session.expiresAt > new Date() &&
      session.user.status === "ACTIVE" &&
      access.userId === session.userId &&
      access.isActive &&
      access.role.isActive &&
      access.permission.isActive;
    if (!isValid)
      throw new AppError("Session is invalid or no longer authorized.", 401);
    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      userAccessId: session.userAccessId,
      sessionId: session.id,
      role: {
        id: access.role.id,
        code: access.role.code,
        name: access.role.name,
      },
      permission: {
        id: access.permission.id,
        code: access.permission.code,
        name: access.permission.name,
      },
      allowedActions: access.permission.actions.map(
        ({ resource, action }) => `${resource}:${action}`,
      ),
    };
    return next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    if (
      err instanceof jwt.JsonWebTokenError ||
      err instanceof jwt.TokenExpiredError ||
      err instanceof jwt.NotBeforeError
    ) {
      return next(new AppError("Authentication token is invalid.", 401));
    }
    return next(err);
  }
};
