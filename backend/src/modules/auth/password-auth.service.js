import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

const DUMMY_PASSWORD_HASH =
  "$2b$10$7EqJtq98hPqEX7fNZaFWoOhiLKfZh6HvGgG58j9QxJ7J0uM6HhB6K";
const PASSWORD_AUTH_METHODS = new Set(["PASSWORD"]);

function getDatabaseHost() {
  try {
    return new URL(process.env.DATABASE_URL).hostname;
  } catch {
    return "invalid";
  }
}

function fingerprintEmail(email) {
  return crypto.createHash("sha256").update(email).digest("hex").slice(0, 12);
}

async function evaluatePasswordCredentials(user, password) {
  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash || DUMMY_PASSWORD_HASH,
  );
  return {
    passwordMatches,
    isActive: user?.status === "ACTIVE",
    isIdentifierVerified: Boolean(user?.identifierVerifiedAt),
    hasPasswordHash: Boolean(user?.passwordHash),
  };
}

export async function verifyPasswordUser(user, password) {
  const result = await evaluatePasswordCredentials(user, password);
  return result.passwordMatches &&
    result.isActive &&
    result.isIdentifierVerified &&
    result.hasPasswordHash
    ? user
    : null;
}

export async function authenticatePasswordCredentials(
  email,
  password,
  database = prisma,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await database.user.findUnique({
    where: { email: normalizedEmail },
  });
  const result = await evaluatePasswordCredentials(user, password);
  const authenticatedUser =
    result.passwordMatches &&
    result.isActive &&
    result.isIdentifierVerified &&
    result.hasPasswordHash
      ? user
      : null;
  if (!authenticatedUser) {
    console.info(
      JSON.stringify({
        event: "LOGIN_CREDENTIAL_REJECTED",
        databaseHost: getDatabaseHost(),
        emailFingerprint: fingerprintEmail(normalizedEmail),
        userFound: Boolean(user),
        ...result,
      }),
    );
  }
  return authenticatedUser;
}

export function assertMfaRequirementSatisfied(user, authMethod) {
  const isPasswordAuthentication = PASSWORD_AUTH_METHODS.has(authMethod);
  const requiresMfa = Boolean(user?.mfaEnabled) && isPasswordAuthentication;
  if (requiresMfa) {
    throw new AppError(
      "MFA is required for this account. Continue with MFA login.",
      403,
      {
        code: "MFA_REQUIRED",
        next: "/login",
      },
    );
  }
}
