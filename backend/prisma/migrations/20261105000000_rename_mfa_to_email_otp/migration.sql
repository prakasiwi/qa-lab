ALTER TYPE "AuthMethod" RENAME VALUE 'MFA' TO 'EMAIL_OTP';
ALTER TYPE "AuthChallengePurpose" RENAME VALUE 'MFA_LOGIN' TO 'EMAIL_OTP_LOGIN';

ALTER TABLE "User"
  RENAME COLUMN "mfaEnabled" TO "emailOtpRequired";

ALTER TABLE "User"
  RENAME COLUMN "mfaSecretHash" TO "emailOtpSecretHash";

ALTER TABLE "Session"
  RENAME COLUMN "mfaVerifiedAt" TO "emailOtpVerifiedAt";
