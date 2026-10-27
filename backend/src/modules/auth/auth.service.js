import { AppError } from "../../utils/AppError.js";
import { prisma } from "../../config/prisma.js";
import { createSessionInTransaction } from "./session.service.js";
import { eligibleAccessWhere } from "./auth-access.service.js";
import { assertMfaRequirementSatisfied } from "./password-auth.service.js";

const SESSION_AUTH_METHODS = new Set(["PASSWORD", "MFA"]);

export async function completeAuthenticationInTransaction(
  tx,
  userId,
  userAccessId,
  authMethod,
) {
  if (!SESSION_AUTH_METHODS.has(authMethod))
    throw new AppError("Authentication method is unavailable.", 401);
  await tx.$queryRaw`
    SELECT ua.id
    FROM "UserAccess" ua
    JOIN "User" u ON u.id = ua."userId"
    JOIN "Role" r ON r.id = ua."roleId"
    JOIN "Permission" p ON p.id = ua."permissionId"
    WHERE ua.id = ${userAccessId} AND u.id = ${userId}
    FOR UPDATE OF u, ua, r, p
  `;
  const user = await tx.user.findFirst({
    where: {
      id: userId,
      status: "ACTIVE",
      identifierVerifiedAt: { not: null },
    },
  });
  const userAccess = await tx.userAccess.findFirst({
    where: {
      id: userAccessId,
      userId,
      isActive: true,
      role: { isActive: true },
      permission: { isActive: true },
    },
    include: { role: true, permission: true },
  });
  if (!user || !userAccess)
    throw new AppError("Login access is unavailable.", 401);
  assertMfaRequirementSatisfied(user, authMethod);
  const authentication = await createSessionInTransaction(
    tx,
    userId,
    userAccessId,
    authMethod,
  );
  return { ...authentication, user, userAccess };
}

export const completeAuthentication = (userId, userAccessId, authMethod) =>
  prisma.$transaction((tx) =>
    completeAuthenticationInTransaction(tx, userId, userAccessId, authMethod),
  );

export async function switchAuthenticationAccess(userId, sessionId, roleId) {
  return prisma.$transaction(async (tx) => {
    const lockedSessions = await tx.$queryRaw`
      SELECT id, "authMethod", "userAccessId", "expiresAt", "revokedAt"
      FROM "Session"
      WHERE id = ${sessionId} AND "userId" = ${userId}
      FOR UPDATE
    `;
    const currentSession = lockedSessions[0];
    const sourceSessionIsUsable =
      currentSession &&
      !currentSession.revokedAt &&
      currentSession.expiresAt > new Date();
    if (!sourceSessionIsUsable)
      throw new AppError("Session is no longer available.", 401);
    const access = await tx.userAccess.findFirst({
      where: { roleId, ...eligibleAccessWhere(userId) },
      select: { id: true },
    });
    if (!access) throw new AppError("The selected role is unavailable.", 403);
    if (currentSession.userAccessId === access.id)
      throw new AppError("The selected role is already active.", 409);
    const authentication = await completeAuthenticationInTransaction(
      tx,
      userId,
      access.id,
      currentSession.authMethod,
    );
    await tx.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    return authentication;
  });
}
