import crypto from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import {
  getChallengeTtlMs,
  getEmailVerificationTtlMs,
  getInvitationChallengeTtlMs,
  getJwtSecret,
  getMaxChallengeAttempts,
  getMfaOtpTtlMs,
  getPasswordResetTtlMs,
  getResendCooldownMs,
  getRoleSelectionTtlMs,
} from "./auth.constants.js";

const hash = (secret) =>
  crypto
    .createHmac(
      "sha256",
      process.env.AUTH_CHALLENGE_HASH_SECRET?.trim() || getJwtSecret(),
    )
    .update(secret)
    .digest("hex");
const pendingChannel = (operationId, channel) =>
  `${channel}:pending:${operationId}`;
const FINALIZE_MAX_ATTEMPTS = 3;

function getChallengeTtlForPurpose(purpose) {
  if (purpose === "REGISTER") return getEmailVerificationTtlMs();
  if (purpose === "ADMIN_INVITATION") return getInvitationChallengeTtlMs();
  if (purpose === "RESET_PASSWORD") return getPasswordResetTtlMs();
  if (purpose === "MFA_LOGIN") return getMfaOtpTtlMs();
  if (purpose === "ACCESS_SELECTION") return getRoleSelectionTtlMs();
  return getChallengeTtlMs();
}

// Advisory-lock namespace: first key is user id, second is challenge purpose.
async function lockChallengeScope(database, userId, purpose) {
  await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${purpose}))`;
}

export async function prepareChallengeInTransaction(
  database,
  { userId, purpose, channel = "email", bypassCooldown = false, secretFactory },
) {
  await lockChallengeScope(database, userId, purpose);
  const latest = await database.authChallenge.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: "desc" },
  });
  const isInCooldown =
    !bypassCooldown &&
    latest &&
    Date.now() - latest.createdAt.getTime() < getResendCooldownMs();
  if (isInCooldown)
    throw new AppError("Mohon tunggu sebelum meminta kode baru.", 429);
  const operationId = crypto.randomUUID();
  const secret = secretFactory
    ? secretFactory()
    : crypto.randomBytes(32).toString("base64url");
  const challenge = await database.authChallenge.create({
    data: {
      userId,
      purpose,
      channel: pendingChannel(operationId, channel),
      secretHash: hash(secret),
      expiresAt: new Date(Date.now() + getChallengeTtlForPurpose(purpose)),
    },
  });
  return {
    id: challenge.id,
    userId,
    purpose,
    channel,
    operationId,
    pendingChannel: challenge.channel,
    secret,
  };
}

export const prepareChallenge = (options) =>
  prisma.$transaction((tx) => prepareChallengeInTransaction(tx, options));

async function cancelPreparedChallenge(prepared) {
  await prisma.$transaction(async (tx) => {
    await lockChallengeScope(tx, prepared.userId, prepared.purpose);
    await tx.authChallenge.deleteMany({
      where: {
        id: prepared.id,
        userId: prepared.userId,
        purpose: prepared.purpose,
        channel: prepared.pendingChannel,
        consumedAt: null,
      },
    });
  });
}

async function finalizeDeliveredChallenge(prepared) {
  await prisma.$transaction(async (tx) => {
    await lockChallengeScope(tx, prepared.userId, prepared.purpose);
    const finalized = await tx.authChallenge.updateMany({
      where: {
        id: prepared.id,
        userId: prepared.userId,
        purpose: prepared.purpose,
        channel: prepared.pendingChannel,
        consumedAt: null,
      },
      data: { channel: `${prepared.channel}:delivered` },
    });
    if (finalized.count !== 1)
      throw new Error("Prepared challenge is no longer pending");
    await tx.authChallenge.updateMany({
      where: {
        userId: prepared.userId,
        purpose: prepared.purpose,
        id: { not: prepared.id },
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });
  });
}

async function auditFinalizeFailure(prepared) {
  try {
    await prisma.authAudit.create({
      data: {
        userId: prepared.userId,
        event: "CHALLENGE_DELIVERY_FINALIZE_FAILURE",
        result: "FAILURE",
      },
    });
  } catch {
    console.error(
      JSON.stringify({
        event: "AUTH_AUDIT_WRITE_FAILED",
        auditEvent: "CHALLENGE_DELIVERY_FINALIZE_FAILURE",
        result: "FAILURE",
      }),
    );
  }
}

async function finalizeWithRetry(prepared, finalize) {
  let lastError;
  for (let attempt = 1; attempt <= FINALIZE_MAX_ATTEMPTS; attempt += 1) {
    try {
      await finalize(prepared);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function deliverPreparedChallenge(
  prepared,
  email,
  deliver,
  lifecycle = {},
) {
  try {
    await deliver({
      email,
      purpose: prepared.purpose,
      secret: prepared.secret,
    });
  } catch (error) {
    try {
      await (lifecycle.cancel || cancelPreparedChallenge)(prepared);
    } catch {
      console.error(
        JSON.stringify({
          event: "CHALLENGE_DELIVERY_COMPENSATION_FAILED",
          challengeId: prepared.id,
        }),
      );
    }
    throw error;
  }
  try {
    await finalizeWithRetry(
      prepared,
      lifecycle.finalize || finalizeDeliveredChallenge,
    );
  } catch {
    console.error(
      JSON.stringify({
        event: "CHALLENGE_DELIVERY_FINALIZE_FAILED",
        challengeId: prepared.id,
      }),
    );
    await auditFinalizeFailure(prepared);
    try {
      await (lifecycle.cancel || cancelPreparedChallenge)(prepared);
    } catch {
      console.error(
        JSON.stringify({
          event: "CHALLENGE_DELIVERY_COMPENSATION_FAILED",
          challengeId: prepared.id,
        }),
      );
    }
    throw new AppError(
      "Pengiriman kode autentikasi gagal diselesaikan. Silakan coba lagi.",
      503,
    );
  }
  return prepared;
}

export async function createAndDeliverChallenge({
  userId,
  purpose,
  email,
  deliver,
  channel = "email",
  bypassCooldown = false,
  secretFactory,
}) {
  const prepared = await prepareChallenge({
    userId,
    purpose,
    channel,
    bypassCooldown,
    secretFactory,
  });
  return deliverPreparedChallenge(prepared, email, deliver);
}

export const createChallenge = (userId, purpose, channel = "email") =>
  prepareChallenge({ userId, purpose, channel });

export const hashChallengeSecret = hash;
export { lockChallengeScope };

export async function findEligibleChallenge(
  secret,
  purpose,
  { requireDelivered = false } = {},
) {
  return prisma.authChallenge.findFirst({
    where: {
      secretHash: hash(secret),
      purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      attemptCount: { lt: getMaxChallengeAttempts() },
      ...(requireDelivered ? { channel: { endsWith: ":delivered" } } : {}),
    },
    select: { id: true, userId: true },
  });
}

export async function consumeDeliveredChallengeAtomically(
  secret,
  purpose,
  applyStateChange,
) {
  const secretHash = hash(secret);
  return prisma.$transaction(async (tx) => {
    let challenge = await tx.authChallenge.findUnique({
      where: { secretHash },
    });
    if (!challenge) return null;
    await lockChallengeScope(tx, challenge.userId, purpose);
    challenge = await tx.authChallenge.findUnique({ where: { secretHash } });
    const now = new Date();
    const isEligible =
      challenge?.purpose === purpose &&
      challenge.channel.endsWith(":delivered") &&
      !challenge.consumedAt &&
      challenge.expiresAt > now &&
      challenge.attemptCount < getMaxChallengeAttempts();
    if (!isEligible) return null;
    const consumed = await tx.authChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        expiresAt: { gt: now },
        attemptCount: { lt: getMaxChallengeAttempts() },
      },
      data: { consumedAt: now },
    });
    const wasApplied =
      consumed.count === 1 && (await applyStateChange(tx, challenge));
    if (!wasApplied)
      throw new AppError("Token tidak valid atau kedaluwarsa", 400);
    return challenge;
  });
}

async function incrementRejectedAttempt(database, challenge) {
  await database.authChallenge.updateMany({
    where: {
      id: challenge.id,
      attemptCount: { lt: getMaxChallengeAttempts() },
    },
    data: { attemptCount: { increment: 1 } },
  });
}

export async function inspectPasswordResetChallenge(secret) {
  const secretHash = hash(secret);
  return prisma.$transaction(async (tx) => {
    let challenge = await tx.authChallenge.findUnique({
      where: { secretHash },
    });
    if (!challenge || challenge.purpose !== "RESET_PASSWORD")
      return { eligible: false, userId: null };
    await lockChallengeScope(tx, challenge.userId, "RESET_PASSWORD");
    challenge = await tx.authChallenge.findUnique({ where: { secretHash } });
    const user = await tx.user.findUnique({
      where: { id: challenge.userId },
      select: { status: true, identifierVerifiedAt: true },
    });
    const eligible =
      challenge.channel.endsWith(":delivered") &&
      !challenge.consumedAt &&
      challenge.expiresAt > new Date() &&
      challenge.attemptCount < getMaxChallengeAttempts() &&
      user?.status === "ACTIVE" &&
      Boolean(user.identifierVerifiedAt);
    if (!eligible) await incrementRejectedAttempt(tx, challenge);
    return { eligible, userId: challenge.userId };
  });
}

export async function completePasswordReset(secret, passwordHash) {
  const secretHash = hash(secret);
  return prisma.$transaction(async (tx) => {
    let challenge = await tx.authChallenge.findUnique({
      where: { secretHash },
    });
    if (!challenge) return null;
    await lockChallengeScope(tx, challenge.userId, "RESET_PASSWORD");
    challenge = await tx.authChallenge.findUnique({ where: { secretHash } });
    const now = new Date();
    const isEligible =
      challenge &&
      challenge.purpose === "RESET_PASSWORD" &&
      challenge.channel.endsWith(":delivered") &&
      !challenge.consumedAt &&
      challenge.expiresAt > now &&
      challenge.attemptCount < getMaxChallengeAttempts();
    if (!isEligible) {
      if (challenge) await incrementRejectedAttempt(tx, challenge);
      return null;
    }
    const user = await tx.user.findUnique({
      where: { id: challenge.userId },
      select: { id: true, status: true, identifierVerifiedAt: true },
    });
    if (user?.status !== "ACTIVE" || !user.identifierVerifiedAt) return null;
    const consumed = await tx.authChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        expiresAt: { gt: now },
        attemptCount: { lt: getMaxChallengeAttempts() },
      },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) return null;
    await tx.authChallenge.updateMany({
      where: { userId: user.id, purpose: "RESET_PASSWORD", consumedAt: null },
      data: { consumedAt: now },
    });
    await tx.authChallenge.updateMany({
      where: {
        userId: user.id,
        purpose: { in: ["MFA_LOGIN", "ACCESS_SELECTION"] },
        consumedAt: null,
      },
      data: { consumedAt: now },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordChangedAt: now },
    });
    await tx.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.authAudit.create({
      data: { userId: user.id, event: "PASSWORD_RESET", result: "SUCCESS" },
    });
    return { userId: user.id };
  });
}

export async function consumeChallenge(secret, purpose) {
  const secretHash = hash(secret);
  return prisma.$transaction(async (tx) => {
    let challenge = await tx.authChallenge.findUnique({
      where: { secretHash },
    });
    if (!challenge) return null;
    await lockChallengeScope(tx, challenge.userId, purpose);
    challenge = await tx.authChallenge.findUnique({
      where: { secretHash },
      include: { user: true },
    });
    if (
      !challenge ||
      challenge.purpose !== purpose ||
      challenge.consumedAt ||
      challenge.expiresAt <= new Date() ||
      challenge.attemptCount >= getMaxChallengeAttempts()
    )
      return null;
    const consumed = await tx.authChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });
    return consumed.count === 1 ? challenge : null;
  });
}
