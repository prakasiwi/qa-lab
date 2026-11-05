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

const SELECTION_METHODS = new Set(["PASSWORD", "EMAIL_OTP"]);

export async function prepareAccessSelectionInTransaction(
  tx,
  userId,
  authMethod,
  accesses,
  emailOtpRequired = false,
) {
  if (!SELECTION_METHODS.has(authMethod))
    throw new AppError("Metode pemilihan akses tidak valid", 400);
  const emailOtpState = emailOtpRequired
    ? "email-otp-required"
    : "email-otp-optional";
  const proof = await prepareChallengeInTransaction(tx, {
    userId,
    purpose: "ACCESS_SELECTION",
    channel: `role-selection:${authMethod}:${emailOtpState}`,
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
      /^role-selection:(PASSWORD|EMAIL_OTP):(email-otp-required|email-otp-optional):pending:/,
    );
    const authMethod = methodMatch?.[1];
    const expectedEmailOtpRequired = methodMatch?.[2] === "email-otp-required";
    const user = await tx.user.findFirst({
      where: {
        id: proof.userId,
        status: "ACTIVE",
        identifierVerifiedAt: { not: null },
        emailOtpRequired: expectedEmailOtpRequired,
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
