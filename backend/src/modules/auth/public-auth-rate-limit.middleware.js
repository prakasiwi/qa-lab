import crypto from "node:crypto";
import {
  consumePersistentAttempt,
  hashAttemptFingerprint,
} from "./auth-attempt.service.js";

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const MAX_KEYS = 10_000;
const attempts = new Map();
const ipAttempts = new Map();
const IP_MAX_ATTEMPTS = Number.parseInt(
  process.env.AUTH_PUBLIC_IP_MAX_ATTEMPTS || "12",
  10,
);

function increment(store, key, maxAttempts) {
  const now = Date.now();
  if (store.size >= MAX_KEYS) {
    for (const [candidate, entry] of store)
      if (entry.expiresAt <= now) store.delete(candidate);
    if (store.size >= MAX_KEYS) store.delete(store.keys().next().value);
  }
  const current = store.get(key);
  if (!current || current.expiresAt <= now) {
    store.set(key, { count: 1, expiresAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > maxAttempts;
}

export function publicAuthIpRateLimit(req, res, next) {
  const isLimited = increment(
    ipAttempts,
    `${req.path}:${req.ip}`,
    IP_MAX_ATTEMPTS,
  );
  if (isLimited)
    return res
      .status(429)
      .json({
        success: false,
        message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
      });
  next();
}

export function publicAuthRateLimit(req, res, next) {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const key = `${req.path}:${req.ip}:${email}`;
  req.authRateLimited = increment(attempts, key, MAX_ATTEMPTS);
  next();
}

export function publicChallengeRateLimit(req, res, next) {
  const challengeCredential = String(
    req.body?.token || req.body?.challengeId || "",
  );
  const tokenKey = challengeCredential
    ? crypto.createHash("sha256").update(challengeCredential).digest("hex")
    : "missing";
  if (increment(attempts, `${req.path}:${req.ip}:${tokenKey}`, MAX_ATTEMPTS)) {
    return res
      .status(429)
      .json({
        success: false,
        message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
      });
  }
  next();
}

export async function persistentResetAttemptRateLimit(req, res, next) {
  try {
    const ipFingerprint = hashAttemptFingerprint(req.ip || "unknown");
    const { isLimited, retryAfterSeconds } = await consumePersistentAttempt({
      purpose: "RESET_PASSWORD",
      category: "ip",
      fingerprint: ipFingerprint,
    });
    if (isLimited) {
      res.set("Retry-After", String(retryAfterSeconds));
      return res
        .status(429)
        .json({
          success: false,
          message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
        });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
