import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

const DUMMY_PASSWORD_HASH =
  "$2b$10$7EqJtq98hPqEX7fNZaFWoOhiLKfZh6HvGgG58j9QxJ7J0uM6HhB6K";
const PASSWORD_AUTH_METHODS = new Set(["PASSWORD"]);

export async function verifyPasswordUser(user, password) {
  const isPasswordValid = await bcrypt.compare(
    password,
    user?.passwordHash || DUMMY_PASSWORD_HASH,
  );
  const isEligible =
    user?.status === "ACTIVE" &&
    Boolean(user.identifierVerifiedAt) &&
    Boolean(user.passwordHash);
  return isPasswordValid && isEligible ? user : null;
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
  return verifyPasswordUser(user, password);
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
