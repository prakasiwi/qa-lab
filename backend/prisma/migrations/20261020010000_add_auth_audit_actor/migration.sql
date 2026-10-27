ALTER TABLE "AuthAudit" ADD COLUMN "actorUserId" TEXT;

CREATE INDEX "AuthAudit_actorUserId_createdAt_idx" ON "AuthAudit"("actorUserId", "createdAt");

ALTER TABLE "AuthAudit"
ADD CONSTRAINT "AuthAudit_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
