import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import {
  AUTH_COOKIE_NAME,
  getCookieOptions,
  resolveAuthenticationConfig,
} from "./auth.constants.js";

export const hashSessionToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export async function createSessionInTransaction(
  tx,
  userId,
  userAccessId,
  authMethod,
) {
  const { jwtSecret, sessionTtlMs, cookieOptions } =
    resolveAuthenticationConfig();
  const sessionId = crypto.randomUUID();
  const sessionToken = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionTtlMs);
  const token = jwt.sign({ sid: sessionId, sessionToken }, jwtSecret, {
    expiresIn: Math.floor(sessionTtlMs / 1000),
  });
  const session = await tx.session.create({
    data: {
      id: sessionId,
      userId,
      userAccessId,
      tokenHash: hashSessionToken(sessionToken),
      authMethod,
      mfaVerifiedAt: authMethod === "MFA" ? new Date() : null,
      expiresAt,
    },
  });
  await tx.authAudit.create({
    data: {
      userId,
      userAccessId,
      event: "LOGIN",
      result: "SUCCESS",
      authMethod,
    },
  });
  return {
    token,
    session,
    expiresAt,
    cookieOptions: { ...cookieOptions, expires: expiresAt },
  };
}

export function setSessionCookie(
  res,
  token,
  expiresAt,
  cookieOptions = getCookieOptions(expiresAt),
) {
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
}

export function clearSessionCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, getCookieOptions());
}

export async function revokeSession(sessionId) {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeUserSessions(userId) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeUserAccessSessions(
  userAccessId,
  database = prisma,
) {
  await database.session.updateMany({
    where: { userAccessId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeRoleSessions(roleId, database = prisma) {
  await database.session.updateMany({
    where: { revokedAt: null, userAccess: { roleId } },
    data: { revokedAt: new Date() },
  });
}

export async function revokePermissionSessions(
  permissionId,
  database = prisma,
) {
  await database.session.updateMany({
    where: { revokedAt: null, userAccess: { permissionId } },
    data: { revokedAt: new Date() },
  });
}

export function listUserSessions(userId) {
  return prisma.session.findMany({
    where: { userId },
    select: {
      id: true,
      authMethod: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      userAccessId: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeOwnSession(userId, sessionId) {
  const result = await prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}
