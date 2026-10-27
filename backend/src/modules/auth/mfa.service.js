import crypto from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { getMaxChallengeAttempts } from "./auth.constants.js";
import {
  createAndDeliverChallenge,
  hashChallengeSecret,
  lockChallengeScope,
} from "./challenge.service.js";
import { sendAuthMail } from "./mail.service.js";
import { prepareRoleSelection } from "./login-flow.service.js";
import { authenticatePasswordCredentials } from "./password-auth.service.js";

const createOtp = () =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
export async function startMfaChallenge(email, password) {
  const user = await authenticatePasswordCredentials(email, password);
  if (!user?.mfaEnabled) throw new AppError("Email atau password salah", 401);
  return startMfaChallengeForUser(user);
}

export async function startMfaChallengeForUser(user) {
  const challenge = await createAndDeliverChallenge({
    userId: user.id,
    purpose: "MFA_LOGIN",
    email: user.email,
    deliver: (payload) => sendAuthMail({ ...payload, name: user.name }),
    channel: "email-otp",
    secretFactory: createOtp,
  });
  return { challengeId: challenge.id };
}

export async function findMfaChallengeUserId(challengeId) {
  const challenge = await prisma.authChallenge.findFirst({
    where: { id: challengeId, purpose: "MFA_LOGIN" },
    select: { userId: true },
  });
  return challenge?.userId || null;
}

export async function authenticateMfa(challengeId, otp) {
  return prisma.$transaction(async (tx) => {
    let challenge = await tx.authChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) return null;
    await lockChallengeScope(tx, challenge.userId, "MFA_LOGIN");
    challenge = await tx.authChallenge.findUnique({
      where: { id: challengeId },
    });
    const now = new Date();
    const isValid =
      challenge?.purpose === "MFA_LOGIN" &&
      challenge.channel === "email-otp:delivered" &&
      !challenge.consumedAt &&
      challenge.expiresAt > now &&
      challenge.attemptCount < getMaxChallengeAttempts() &&
      crypto.timingSafeEqual(
        Buffer.from(challenge.secretHash),
        Buffer.from(hashChallengeSecret(otp)),
      );
    if (!isValid) {
      if (
        challenge?.purpose === "MFA_LOGIN" &&
        !challenge.consumedAt &&
        challenge.attemptCount < getMaxChallengeAttempts()
      ) {
        await tx.authChallenge.update({
          where: { id: challenge.id },
          data: { attemptCount: { increment: 1 } },
        });
      }
      return null;
    }
    const user = await tx.user.findFirst({
      where: {
        id: challenge.userId,
        status: "ACTIVE",
        identifierVerifiedAt: { not: null },
        mfaEnabled: true,
      },
    });
    if (!user) return null;
    const authentication = await prepareRoleSelection(user, "MFA", tx);
    const consumed = await tx.authChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1)
      throw new AppError("Kode MFA tidak valid atau kedaluwarsa", 400);
    return authentication;
  });
}

export async function resendMfaChallenge(challengeId) {
  const challenge = await prisma.authChallenge.findUnique({
    where: { id: challengeId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          identifierVerifiedAt: true,
          mfaEnabled: true,
        },
      },
    },
  });
  const user = challenge?.user;
  const isEligible =
    challenge?.purpose === "MFA_LOGIN" &&
    !challenge.consumedAt &&
    challenge.expiresAt > new Date() &&
    user?.status === "ACTIVE" &&
    Boolean(user.identifierVerifiedAt) &&
    user.mfaEnabled;
  if (!isEligible)
    throw new AppError("MFA sign-in session is invalid or expired.", 401);
  return startMfaChallengeForUser(user);
}
