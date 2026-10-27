-- Preserve existing sessions while recording MFA completion for new MFA sessions.
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "mfaVerifiedAt" TIMESTAMP(3);
