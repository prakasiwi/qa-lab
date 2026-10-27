import crypto from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { getMaxChallengeAttempts } from "./auth.constants.js";

const WINDOW_MS = 60_000;
const hashKey = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

export async function consumePersistentAttempt({
  purpose,
  category,
  fingerprint,
  maxAttempts = getMaxChallengeAttempts(),
}) {
  try {
    await prisma.authAttemptBucket.deleteMany({
      where: { windowExpiresAt: { lte: new Date() } },
    });
  } catch {
    console.error(
      JSON.stringify({ event: "AUTH_ATTEMPT_BUCKET_CLEANUP_FAILED" }),
    );
  }
  const keyHash = hashKey(`${purpose}:${category}:${fingerprint}`);
  const windowExpiresAt = new Date(Date.now() + WINDOW_MS);
  const rows = await prisma.$queryRaw`
    INSERT INTO "AuthAttemptBucket" ("keyHash", "count", "windowExpiresAt", "updatedAt")
    VALUES (${keyHash}, 1, ${windowExpiresAt}, NOW())
    ON CONFLICT ("keyHash") DO UPDATE SET
      "count" = CASE
        WHEN "AuthAttemptBucket"."windowExpiresAt" <= NOW() THEN 1
        ELSE "AuthAttemptBucket"."count" + 1
      END,
      "windowExpiresAt" = CASE
        WHEN "AuthAttemptBucket"."windowExpiresAt" <= NOW() THEN ${windowExpiresAt}
        ELSE "AuthAttemptBucket"."windowExpiresAt"
      END,
      "updatedAt" = NOW()
    RETURNING "count"
  `;
  const bucket = rows[0];
  const isLimited = bucket.count > maxAttempts;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((new Date(bucket.windowExpiresAt).getTime() - Date.now()) / 1000),
  );
  return { isLimited, retryAfterSeconds };
}

export const hashAttemptFingerprint = (value) => hashKey(String(value));
