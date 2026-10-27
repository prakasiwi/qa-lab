import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ok } from "../../utils/response.js";
import { switchAuthenticationAccess } from "./auth.service.js";
import {
  clearSessionCookie,
  listUserSessions,
  revokeOwnSession,
  revokeSession,
  setSessionCookie,
} from "./session.service.js";
import {
  completePasswordReset,
  consumeDeliveredChallengeAtomically,
  createAndDeliverChallenge,
  deliverPreparedChallenge,
  findEligibleChallenge,
  hashChallengeSecret,
  inspectPasswordResetChallenge,
  prepareChallengeInTransaction,
} from "./challenge.service.js";
import { sendAuthMail, sendPasswordChangedMail } from "./mail.service.js";
import { getPublicAuthResponseFloorMs } from "./auth.constants.js";
import {
  authenticateMfa,
  findMfaChallengeUserId,
  resendMfaChallenge,
  startMfaChallengeForUser,
} from "./mfa.service.js";
import { consumeAccessSelection } from "./role-selection.service.js";
import { findEligibleAccesses } from "./auth-access.service.js";
import { authenticatePasswordCredentials } from "./password-auth.service.js";
import { prepareRoleSelection } from "./login-flow.service.js";
import { consumePersistentAttempt } from "./auth-attempt.service.js";

async function writeAuthAudit(data) {
  try {
    await prisma.authAudit.create({ data });
  } catch {
    console.error(
      JSON.stringify({
        event: "AUTH_AUDIT_WRITE_FAILED",
        auditEvent: data.event,
        result: data.result,
      }),
    );
  }
}

async function auditRejectedAuthentication(
  event,
  authMethod,
  identifiers = {},
) {
  let userId = null;
  let challengeChannel = null;
  try {
    if (identifiers.challengeId) {
      const challenge = await prisma.authChallenge.findUnique({
        where: { id: identifiers.challengeId },
        select: { userId: true, channel: true },
      });
      userId = challenge?.userId || null;
      challengeChannel = challenge?.channel || null;
    } else if (identifiers.secret) {
      const secretHash = hashChallengeSecret(identifiers.secret);
      const challenge = await prisma.authChallenge.findUnique({
        where: { secretHash },
        select: { userId: true, channel: true },
      });
      userId = challenge?.userId || null;
      challengeChannel = challenge?.channel || null;
    }
  } catch {
    userId = null;
  }
  const selectionMethod = challengeChannel?.match(
    /^role-selection:(PASSWORD|MFA):/,
  )?.[1];
  await writeAuthAudit({
    userId,
    event:
      event === "ACCESS_SELECTION_REJECTED"
        ? `${selectionMethod || "UNKNOWN"}_SELECTION_REJECTED`
        : event,
    result: "FAILURE",
    authMethod: selectionMethod || authMethod,
  });
}

async function enforceMfaAttemptLimit(
  req,
  res,
  userId,
  fallbackFingerprint = "unknown",
) {
  const ip = req.ip || "unknown";
  const { isLimited, retryAfterSeconds } = await consumePersistentAttempt({
    purpose: "MFA_LOGIN",
    category: "otp:user-ip",
    fingerprint: `${userId || fallbackFingerprint}:${ip}`,
  });
  if (!isLimited) return;
  res.set("Retry-After", String(retryAfterSeconds));
  throw new AppError(
    "Terlalu banyak percobaan MFA. Silakan coba lagi setelah masa tunggu berakhir.",
    429,
  );
}

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await authenticatePasswordCredentials(email, password);
  if (req.authRateLimited)
    throw new AppError(
      "Terlalu banyak permintaan. Silakan coba lagi nanti.",
      429,
    );
  if (!user) throw new AppError("Email atau password salah", 401);
  if (user.mfaEnabled) {
    await enforceMfaAttemptLimit(req, res, user.id);
    const challenge = await startMfaChallengeForUser(user);
    return ok(res, "MFA verification is required.", {
      nextStep: "OTP_REQUIRED",
      ...challenge,
    });
  }
  const selection = await prisma.$transaction((tx) =>
    prepareRoleSelection(user, "PASSWORD", tx),
  );
  return ok(res, "Select a role to continue.", {
    nextStep: "ROLE_SELECTION_REQUIRED",
    ...selection,
  });
};

export const profile = async (req, res) =>
  ok(res, "Profile berhasil diambil", req.user);
export const logout = async (req, res) => {
  await revokeSession(req.user.sessionId);
  clearSessionCookie(res);
  return ok(res, "Logout berhasil");
};
export const sessions = async (req, res) =>
  ok(res, "Sesi berhasil diambil", await listUserSessions(req.user.id));
export const revokeSessionById = async (req, res) => {
  if (!(await revokeOwnSession(req.user.id, req.params.id)))
    throw new AppError("Sesi tidak ditemukan", 404);
  if (req.params.id === req.user.sessionId) clearSessionCookie(res);
  return ok(res, "Sesi berhasil dicabut");
};
export const switchRole = async (req, res) => {
  const authentication = await switchAuthenticationAccess(
    req.user.id,
    req.user.sessionId,
    req.body.roleId,
  );
  setSessionCookie(
    res,
    authentication.token,
    authentication.expiresAt,
    authentication.cookieOptions,
  );
  return ok(res, "Role switched successfully.", {
    token: authentication.token,
    user: {
      id: authentication.user.id,
      name: authentication.user.name,
      email: authentication.user.email,
      role: authentication.userAccess.role.code,
    },
  });
};

export const roles = async (req, res) => {
  const accesses = await findEligibleAccesses(req.user.id);
  const alternativeAccesses = accesses.filter(
    (access) => access.id !== req.user.userAccessId,
  );
  return ok(
    res,
    "Available roles retrieved.",
    alternativeAccesses.map(({ role }) => ({
      id: role.id,
      code: role.code,
      name: role.name,
    })),
  );
};

async function getGeneralAccess() {
  const [role, permission] = await Promise.all([
    prisma.role.findFirst({ where: { code: "GENERAL", isActive: true } }),
    prisma.permission.findFirst({ where: { code: "GENERAL", isActive: true } }),
  ]);
  if (!role || !permission)
    throw new AppError(
      "Registration access configuration is unavailable.",
      503,
    );
  return { roleId: role.id, permissionId: permission.id };
}

export const register = async (req, res) => {
  const startedAt = Date.now();
  const email = req.body.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const genericResponse = async () => {
    await waitForMinimumDuration(startedAt);
    return ok(
      res,
      "Jika akun tersedia, instruksi verifikasi akan dikirim.",
      null,
      201,
    );
  };
  if (
    req.authRateLimited ||
    (await prisma.user.findUnique({ where: { email } }))
  )
    return genericResponse();
  const access = await getGeneralAccess();
  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const phone = req.body.phone?.trim() || null;
      const user = await tx.user.create({
        data: {
          name: req.body.name.trim(),
          phone,
          email,
          passwordHash,
          status: "PENDING_VERIFICATION",
          accesses: { create: { ...access, isActive: false } },
        },
      });
      const challenge = await prepareChallengeInTransaction(tx, {
        userId: user.id,
        purpose: "REGISTER",
        bypassCooldown: true,
      });
      return { user, challenge };
    });
  } catch (error) {
    if (error.code === "P2002") return genericResponse();
    console.error(JSON.stringify({ event: "REGISTRATION_DELIVERY_FAILED" }));
    return genericResponse();
  }
  try {
    await deliverPreparedChallenge(created.challenge, email, (payload) =>
      sendAuthMail({ ...payload, name: created.user.name }),
    );
  } catch {
    console.error(JSON.stringify({ event: "REGISTRATION_DELIVERY_FAILED" }));
  }
  return genericResponse();
};

export const verifyIdentifier = async (req, res) => {
  const challenge = await consumeDeliveredChallengeAtomically(
    req.body.token,
    "REGISTER",
    async (tx, current) => {
      const user = await tx.user.findUnique({ where: { id: current.userId } });
      if (user?.status !== "PENDING_VERIFICATION") return false;
      await tx.user.update({
        where: { id: current.userId },
        data: { status: "ACTIVE", identifierVerifiedAt: new Date() },
      });
      const accesses = await tx.userAccess.findMany({
        where: { userId: current.userId, isActive: false },
        include: { role: true, permission: true },
      });
      const hasExpectedAccesses =
        accesses.length > 0 &&
        accesses.every(
          (access) =>
            access.role.code === "GENERAL" &&
            access.role.isActive &&
            access.permission.isActive,
        );
      if (!hasExpectedAccesses) return false;
      await tx.userAccess.updateMany({
        where: { userId: current.userId, isActive: false },
        data: { isActive: true },
      });
      await tx.authAudit.create({
        data: {
          userId: current.userId,
          event: "IDENTIFIER_VERIFIED",
          result: "SUCCESS",
        },
      });
      return true;
    },
  );
  if (!challenge)
    throw new AppError("Token verifikasi tidak valid atau kedaluwarsa", 400);
  return ok(res, "Identifier berhasil diverifikasi");
};

export const resendVerification = async (req, res) => {
  const startedAt = Date.now();
  const email = req.body.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!req.authRateLimited && user?.status === "PENDING_VERIFICATION") {
    try {
      await createAndDeliverChallenge({
        userId: user.id,
        purpose: "REGISTER",
        email: user.email,
        deliver: (payload) => sendAuthMail({ ...payload, name: user.name }),
      });
    } catch {}
  } else {
    await bcrypt.hash("qa-lab-public-auth-equalization", 10);
  }
  await waitForMinimumDuration(startedAt);
  return ok(res, "Jika akun tersedia, instruksi verifikasi akan dikirim.");
};

export const activationContext = async (req, res) => {
  const challenge = await findEligibleChallenge(
    req.validatedQuery.token,
    "ADMIN_INVITATION",
    { requireDelivered: true },
  );
  if (!challenge)
    throw new AppError("Invitation link is invalid or has expired.", 400);
  const user = await prisma.user.findUnique({
    where: { id: challenge.userId },
    select: { name: true, email: true, status: true },
  });
  if (user?.status !== "PENDING_ACTIVATION")
    throw new AppError("Invitation link is no longer available.", 409);
  return ok(res, "Invitation is ready to be activated.", {
    name: user.name,
    email: user.email,
  });
};

async function waitForMinimumDuration(startedAt) {
  const remaining = getPublicAuthResponseFloorMs() - (Date.now() - startedAt);
  if (remaining > 0)
    await new Promise((resolve) => setTimeout(resolve, remaining));
}

export const activateAccount = async (req, res) => {
  const eligibleChallenge = await findEligibleChallenge(
    req.body.token,
    "ADMIN_INVITATION",
    { requireDelivered: true },
  );
  if (!eligibleChallenge)
    throw new AppError("Token aktivasi tidak valid atau kedaluwarsa", 400);
  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const challenge = await consumeDeliveredChallengeAtomically(
    req.body.token,
    "ADMIN_INVITATION",
    async (tx, current) => {
      const user = await tx.user.findUnique({ where: { id: current.userId } });
      if (user?.status !== "PENDING_ACTIVATION") return false;
      await tx.user.update({
        where: { id: current.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          identifierVerifiedAt: new Date(),
          status: "ACTIVE",
        },
      });
      const accesses = await tx.userAccess.findMany({
        where: { userId: current.userId, isActive: false },
        include: { role: true, permission: true },
      });
      const hasExpectedAccesses =
        accesses.length > 0 &&
        accesses.every(
          (access) => access.role.isActive && access.permission.isActive,
        );
      if (!hasExpectedAccesses) return false;
      await tx.userAccess.updateMany({
        where: { userId: current.userId, isActive: false },
        data: { isActive: true },
      });
      await tx.authAudit.create({
        data: {
          userId: current.userId,
          event: "ACCOUNT_ACTIVATED",
          result: "SUCCESS",
        },
      });
      return true;
    },
  );
  if (!challenge)
    throw new AppError("Token aktivasi tidak valid atau kedaluwarsa", 400);
  return ok(res, "Akun berhasil diaktifkan");
};

export const forgotPassword = async (req, res) => {
  const startedAt = Date.now();
  const email = req.body.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  await writeAuthAudit({
    userId: user?.id || null,
    event: "PASSWORD_RESET_REQUESTED",
    result: "SUCCESS",
  });
  if (
    !req.authRateLimited &&
    user?.status === "ACTIVE" &&
    user.identifierVerifiedAt
  ) {
    try {
      await createAndDeliverChallenge({
        userId: user.id,
        purpose: "RESET_PASSWORD",
        email: user.email,
        deliver: (payload) => sendAuthMail({ ...payload, name: user.name }),
      });
      await writeAuthAudit({
        userId: user.id,
        event: "PASSWORD_RESET_CHALLENGE_DELIVERY",
        result: "SUCCESS",
      });
    } catch (error) {
      if (error.statusCode !== 429) {
        console.error(
          JSON.stringify({ event: "PASSWORD_RESET_CHALLENGE_DELIVERY_FAILED" }),
        );
        await writeAuthAudit({
          userId: user.id,
          event: "PASSWORD_RESET_CHALLENGE_DELIVERY",
          result: "FAILURE",
        });
      }
    }
  } else {
    await bcrypt.hash("qa-lab-public-auth-equalization", 10);
  }
  await waitForMinimumDuration(startedAt);
  return ok(res, "Jika akun tersedia, instruksi reset akan dikirim.");
};

export const resendResetPassword = forgotPassword;

export const resetContext = async (req, res) => {
  const challenge = await findEligibleChallenge(
    req.validatedQuery.token,
    "RESET_PASSWORD",
    { requireDelivered: true },
  );
  if (!challenge)
    throw new AppError("Reset link is invalid or has expired.", 400);
  const user = await prisma.user.findUnique({
    where: { id: challenge.userId },
    select: { status: true, identifierVerifiedAt: true },
  });
  if (user?.status !== "ACTIVE" || !user.identifierVerifiedAt)
    throw new AppError("Reset link is no longer available.", 409);
  return ok(res, "Reset link is ready to use.");
};

export const resetPassword = async (req, res) => {
  const inspected = await inspectPasswordResetChallenge(req.body.token);
  if (!inspected.eligible) {
    await writeAuthAudit({
      userId: inspected.userId,
      event: "PASSWORD_RESET_FAILURE",
      result: "FAILURE",
    });
    throw new AppError("Token reset tidak valid atau kedaluwarsa", 400);
  }
  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const completed = await completePasswordReset(req.body.token, passwordHash);
  if (!completed) {
    await writeAuthAudit({
      userId: inspected.userId,
      event: "PASSWORD_RESET_FAILURE",
      result: "FAILURE",
    });
    throw new AppError("Token reset tidak valid atau kedaluwarsa", 400);
  }
  const user = await prisma.user.findUnique({
    where: { id: completed.userId },
    select: { name: true, email: true, identifierVerifiedAt: true },
  });
  try {
    if (!user?.identifierVerifiedAt)
      throw new Error("Verified notification destination unavailable");
    await sendPasswordChangedMail({ email: user.email, name: user.name });
    await writeAuthAudit({
      userId: completed.userId,
      event: "PASSWORD_CHANGE_NOTIFICATION",
      result: "SUCCESS",
    });
  } catch {
    console.error(
      JSON.stringify({ event: "PASSWORD_CHANGE_NOTIFICATION_FAILED" }),
    );
    await writeAuthAudit({
      userId: completed.userId,
      event: "PASSWORD_CHANGE_NOTIFICATION",
      result: "FAILURE",
    });
  }
  return ok(res, "Password berhasil diubah. Silakan login kembali.");
};

async function completeRoleSelection(req, res) {
  let selected;
  try {
    selected = await consumeAccessSelection(
      req.body.selectionProof,
      req.body.roleId,
    );
    if (!selected)
      throw new AppError("Role selection session is invalid.", 401);
  } catch (error) {
    await auditRejectedAuthentication("ACCESS_SELECTION_REJECTED", "PASSWORD", {
      secret: req.body.selectionProof,
    });
    throw error;
  }
  const { token, expiresAt, cookieOptions, user } = selected;
  setSessionCookie(res, token, expiresAt, cookieOptions);
  return ok(res, "Login successful.", {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: selected.userAccess.role.code,
    },
  });
}

export const verifyMfa = async (req, res) => {
  let authentication;
  try {
    const userId = await findMfaChallengeUserId(req.body.challengeId);
    await enforceMfaAttemptLimit(req, res, userId, req.body.challengeId);
    authentication = await authenticateMfa(req.body.challengeId, req.body.otp);
    if (!authentication)
      throw new AppError("Kode MFA tidak valid atau kedaluwarsa", 400);
  } catch (error) {
    await auditRejectedAuthentication("MFA_VERIFY_REJECTED", "MFA", {
      challengeId: req.body.challengeId,
    });
    throw error;
  }
  return ok(res, "Select a role to continue.", {
    nextStep: "ROLE_SELECTION_REQUIRED",
    ...authentication,
  });
};

export const resendMfa = async (req, res) => {
  const userId = await findMfaChallengeUserId(req.body.challengeId);
  await enforceMfaAttemptLimit(req, res, userId, req.body.challengeId);
  const challenge = await resendMfaChallenge(req.body.challengeId);
  return ok(res, "MFA verification code sent.", {
    nextStep: "OTP_REQUIRED",
    ...challenge,
  });
};

export const selectRole = async (req, res) => completeRoleSelection(req, res);
