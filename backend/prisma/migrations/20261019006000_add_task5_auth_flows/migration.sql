ALTER TYPE "AuthChallengePurpose" ADD VALUE IF NOT EXISTS 'ACCESS_SELECTION';
ALTER TYPE "AuthChallengePurpose" ADD VALUE IF NOT EXISTS 'SSO_STATE';

ALTER TABLE "AuthAudit" ADD COLUMN "userAccessId" TEXT;
CREATE INDEX "AuthAudit_userAccessId_idx" ON "AuthAudit"("userAccessId");
ALTER TABLE "AuthAudit" ADD CONSTRAINT "AuthAudit_userAccessId_fkey"
  FOREIGN KEY ("userAccessId") REFERENCES "UserAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;
