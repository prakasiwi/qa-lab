import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import {
  hashChallengeSecret,
  lockChallengeScope,
  prepareChallengeInTransaction,
} from "./challenge.service.js";
import {
  accessHierarchy,
  eligibleAccessWhere,
  sanitizeAccess,
} from "./auth-access.service.js";
import { completeAuthenticationInTransaction } from "./auth.service.js";

const SELECTION_METHODS = new Set(["PASSWORD", "MFA"]);

export async function prepareAccessSelectionInTransaction(
  tx,
  userId,
  authMethod,
  accesses,
  mfaEnabled = false,
) {
  if (!SELECTION_METHODS.has(authMethod))
    throw new AppError("Metode pemilihan akses tidak valid", 400);
  const mfaState = mfaEnabled ? "mfa-on" : "mfa-off";
  const proof = await prepareChallengeInTransaction(tx, {
    userId,
    purpose: "ACCESS_SELECTION",
    channel: `role-selection:${authMethod}:${mfaState}`,
    bypassCooldown: true,
  });
  return { roles: accesses.map(sanitizeAccess), selectionProof: proof.secret };
}

export async function consumeAccessSelection(selectionProof, roleId) {
  const secretHash = hashChallengeSecret(selectionProof);
  return prisma.$transaction(async (tx) => {
    let proof = await tx.authChallenge.findUnique({ where: { secretHash } });
    if (!proof) return null;
    await lockChallengeScope(tx, proof.userId, "ACCESS_SELECTION");
    proof = await tx.authChallenge.findUnique({ where: { secretHash } });
    if (!proof) return null;
    const now = new Date();
    const methodMatch = proof?.channel.match(
      /^role-selection:(PASSWORD|MFA):(mfa-on|mfa-off):pending:/,
    );
    const authMethod = methodMatch?.[1];
    const expectedMfaState = methodMatch?.[2] === "mfa-on";
    const user = await tx.user.findFirst({
      where: {
        id: proof.userId,
        status: "ACTIVE",
        identifierVerifiedAt: { not: null },
        mfaEnabled: expectedMfaState,
      },
      select: { id: true },
    });
    const isUsable =
      proof?.purpose === "ACCESS_SELECTION" &&
      SELECTION_METHODS.has(authMethod) &&
      Boolean(user) &&
      !proof.consumedAt &&
      proof.expiresAt > now;
    if (!isUsable) return null;
    const access = await tx.userAccess.findFirst({
      where: { roleId, ...eligibleAccessWhere(proof.userId) },
      include: accessHierarchy,
    });
    if (!access) throw new AppError("Akses tidak tersedia", 403);
    const authentication = await completeAuthenticationInTransaction(
      tx,
      proof.userId,
      access.id,
      authMethod,
    );
    const consumed = await tx.authChallenge.updateMany({
      where: { id: proof.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1)
      throw new AppError("Sesi pemilihan akses tidak valid", 401);
    return authentication;
  });
}
