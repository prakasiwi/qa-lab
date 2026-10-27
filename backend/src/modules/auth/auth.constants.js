import net from "node:net";
import proxyaddr from "proxy-addr";

export const AUTH_COOKIE_NAME = "qa_lab_session";

const DURATION_PATTERN = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/i;
const DURATION_MULTIPLIERS = Object.freeze({
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
});
function getDurationMsFromValue(value) {
  const match = DURATION_PATTERN.exec(String(value).trim());
  if (!match) return null;

  const durationMs =
    Number(match[1]) * DURATION_MULTIPLIERS[match[2].toLowerCase()];
  return Number.isSafeInteger(durationMs) && durationMs > 0 ? durationMs : null;
}

export function getDurationMs(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "")
    return getDurationMsFromValue(fallback);

  const parsed = getDurationMsFromValue(value);
  if (parsed !== null) return parsed;
  throw new Error(`${name} harus berupa durasi positif seperti 30m atau 8h`);
}

export function getPositiveInteger(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;

  const parsed = Number(value);
  if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;

  throw new Error(`${name} harus berupa bilangan bulat positif`);
}

export const getSessionTtlMs = () => getDurationMs("AUTH_SESSION_TTL", "8h");
export const getChallengeTtlMs = () =>
  getDurationMs("AUTH_CHALLENGE_TTL", "10m");
export const getInvitationChallengeTtlMs = () =>
  getDurationMs("AUTH_INVITATION_TTL", "24h");
export const getEmailVerificationTtlMs = () =>
  getDurationMs("AUTH_EMAIL_VERIFICATION_TTL", "24h");
export const getPasswordResetTtlMs = () =>
  getDurationMs("AUTH_PASSWORD_RESET_TTL", "15m");
export const getMfaOtpTtlMs = () => getDurationMs("AUTH_MFA_OTP_TTL", "5m");
export const getRoleSelectionTtlMs = () =>
  getDurationMs("AUTH_ROLE_SELECTION_TTL", "5m");
export const getResendCooldownMs = () =>
  getDurationMs("AUTH_RESEND_COOLDOWN", "60s");
export const getMaxChallengeAttempts = () =>
  getPositiveInteger("AUTH_MAX_CHALLENGE_ATTEMPTS", 5);
export const getAuthMailDeliveryTimeoutMs = () =>
  getDurationMs("AUTH_MAIL_DELIVERY_TIMEOUT", "2s");
export const getPublicAuthResponseFloorMs = () =>
  getDurationMs("AUTH_PUBLIC_RESPONSE_FLOOR", "2250ms");

export function getTrustProxySetting() {
  const configured = process.env.TRUST_PROXY_CIDRS?.trim();
  if (!configured) return false;
  const entries = configured.split(",").map((entry) => entry.trim());
  if (entries.some((entry) => !entry))
    throw new Error("TRUST_PROXY_CIDRS berisi entri kosong");
  for (const entry of entries) {
    const [address, prefix, ...extra] = entry.split("/");
    const family = net.isIP(address);
    const maxPrefix = family === 4 ? 32 : family === 6 ? 128 : 0;
    if (
      !family ||
      extra.length ||
      (prefix !== undefined &&
        (!/^\d+$/.test(prefix) || Number(prefix) > maxPrefix))
    ) {
      throw new Error(
        "TRUST_PROXY_CIDRS harus berisi daftar IP atau CIDR yang valid",
      );
    }
  }
  return proxyaddr.compile(entries);
}

export function normalizeHttpOrigin(value) {
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    if (url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getAllowedCorsOrigins() {
  const configuredOrigins = process.env.CORS_ORIGIN || "http://localhost:5173";
  const values = configuredOrigins.split(",").map((value) => value.trim());
  const origins = values.map(normalizeHttpOrigin);
  if (values.some((value) => !value) || origins.some((origin) => !origin)) {
    throw new Error(
      "CORS_ORIGIN harus berisi daftar origin HTTP(S) yang valid",
    );
  }
  return [...new Set(origins)];
}

export function getFrontendOrigin() {
  const origin = normalizeHttpOrigin(process.env.FRONTEND_URL?.trim());
  if (!origin || !getAllowedCorsOrigins().includes(origin)) {
    throw new Error(
      "FRONTEND_URL harus berupa origin HTTP(S) yang terdaftar di CORS_ORIGIN",
    );
  }
  return origin;
}

export function getCookieOptions(expiresAt) {
  const configuredSecure = (process.env.COOKIE_SECURE || "false")
    .trim()
    .toLowerCase();
  if (!["true", "false"].includes(configuredSecure)) {
    throw new Error("COOKIE_SECURE harus bernilai true atau false");
  }
  const secure = configuredSecure === "true";
  const sameSite = (process.env.COOKIE_SAME_SITE || "lax").trim().toLowerCase();
  if (!["lax", "strict", "none"].includes(sameSite)) {
    throw new Error("COOKIE_SAME_SITE harus bernilai lax, strict, atau none");
  }

  if (sameSite === "none" && !secure) {
    throw new Error("COOKIE_SAME_SITE=none requires COOKIE_SECURE=true");
  }

  return {
    httpOnly: true,
    sameSite,
    secure,
    path: "/",
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET wajib berisi minimal 32 karakter");
  }
  return secret;
}

export function resolveAuthenticationConfig() {
  const sessionTtlMs = getSessionTtlMs();
  return {
    jwtSecret: getJwtSecret(),
    sessionTtlMs,
    cookieOptions: getCookieOptions(),
  };
}

export function validateAuthConfig() {
  resolveAuthenticationConfig();
  getChallengeTtlMs();
  getInvitationChallengeTtlMs();
  getEmailVerificationTtlMs();
  getPasswordResetTtlMs();
  getMfaOtpTtlMs();
  getRoleSelectionTtlMs();
  getResendCooldownMs();
  getMaxChallengeAttempts();
  const mailTimeoutMs = getAuthMailDeliveryTimeoutMs();
  const responseFloorMs = getPublicAuthResponseFloorMs();
  if (responseFloorMs < mailTimeoutMs + 200)
    throw new Error(
      "AUTH_PUBLIC_RESPONSE_FLOOR harus minimal 200ms lebih lama dari AUTH_MAIL_DELIVERY_TIMEOUT",
    );
  getAllowedCorsOrigins();
  getFrontendOrigin();
  getTrustProxySetting();
}
