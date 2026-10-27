CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'PENDING_ACTIVATION', 'ACTIVE', 'INACTIVE', 'LOCKED');
CREATE TYPE "AuthMethod" AS ENUM ('PASSWORD', 'MFA', 'OLD_LOGIN', 'SSO');
CREATE TYPE "AuthChallengePurpose" AS ENUM ('REGISTER', 'ADMIN_INVITATION', 'RESET_PASSWORD', 'MFA_LOGIN');
CREATE TYPE "AuthAuditResult" AS ENUM ('SUCCESS', 'FAILURE');

ALTER TABLE "User"
  ADD COLUMN "identifierVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3),
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE TABLE "Application" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AccessRole" (
  "id" TEXT NOT NULL, "applicationId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AccessRole_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AccessGroup" (
  "id" TEXT NOT NULL, "accessRoleId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AccessGroup_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserAccess" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "applicationId" TEXT NOT NULL, "accessRoleId" TEXT NOT NULL,
  "accessGroupId" TEXT NOT NULL, "isDefault" BOOLEAN NOT NULL DEFAULT false, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserAccess_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Session" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "userAccessId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL,
  "authMethod" "AuthMethod" NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuthChallenge" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "purpose" "AuthChallengePurpose" NOT NULL, "secretHash" TEXT NOT NULL,
  "channel" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3), "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuthIdentity" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "provider" TEXT NOT NULL, "providerSubject" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuthAudit" (
  "id" TEXT NOT NULL, "userId" TEXT, "event" TEXT NOT NULL, "result" "AuthAuditResult" NOT NULL,
  "authMethod" "AuthMethod", "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuthAudit_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Customer" ADD COLUMN "ownerUserId" TEXT;
ALTER TABLE "Product" ADD COLUMN "ownerUserId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "ownerUserId" TEXT;

UPDATE "Customer" SET "ownerUserId" = COALESCE((SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" LIMIT 1), (SELECT "id" FROM "User" ORDER BY "createdAt" LIMIT 1));
UPDATE "Product" SET "ownerUserId" = COALESCE((SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" LIMIT 1), (SELECT "id" FROM "User" ORDER BY "createdAt" LIMIT 1));
UPDATE "Invoice" SET "ownerUserId" = COALESCE((SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" LIMIT 1), (SELECT "id" FROM "User" ORDER BY "createdAt" LIMIT 1));

ALTER TABLE "Customer" ALTER COLUMN "ownerUserId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "ownerUserId" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "ownerUserId" SET NOT NULL;
DROP INDEX "Customer_customerCode_key";
DROP INDEX "Customer_email_key";
DROP INDEX "Product_productCode_key";

CREATE UNIQUE INDEX "Application_code_key" ON "Application"("code");
CREATE UNIQUE INDEX "AccessRole_applicationId_code_key" ON "AccessRole"("applicationId", "code");
CREATE UNIQUE INDEX "AccessGroup_accessRoleId_code_key" ON "AccessGroup"("accessRoleId", "code");
CREATE UNIQUE INDEX "UserAccess_userId_applicationId_accessRoleId_accessGroupId_key" ON "UserAccess"("userId", "applicationId", "accessRoleId", "accessGroupId");
CREATE INDEX "UserAccess_userId_isActive_idx" ON "UserAccess"("userId", "isActive");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");
CREATE UNIQUE INDEX "AuthChallenge_secretHash_key" ON "AuthChallenge"("secretHash");
CREATE INDEX "AuthChallenge_userId_purpose_consumedAt_idx" ON "AuthChallenge"("userId", "purpose", "consumedAt");
CREATE UNIQUE INDEX "AuthIdentity_provider_providerSubject_key" ON "AuthIdentity"("provider", "providerSubject");
CREATE INDEX "AuthAudit_userId_createdAt_idx" ON "AuthAudit"("userId", "createdAt");
CREATE INDEX "Customer_ownerUserId_idx" ON "Customer"("ownerUserId");
CREATE UNIQUE INDEX "Customer_ownerUserId_customerCode_key" ON "Customer"("ownerUserId", "customerCode");
CREATE UNIQUE INDEX "Customer_ownerUserId_email_key" ON "Customer"("ownerUserId", "email");
CREATE INDEX "Product_ownerUserId_idx" ON "Product"("ownerUserId");
CREATE UNIQUE INDEX "Product_ownerUserId_productCode_key" ON "Product"("ownerUserId", "productCode");
CREATE INDEX "Invoice_ownerUserId_idx" ON "Invoice"("ownerUserId");

ALTER TABLE "AccessRole" ADD CONSTRAINT "AccessRole_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE;
ALTER TABLE "AccessGroup" ADD CONSTRAINT "AccessGroup_accessRoleId_fkey" FOREIGN KEY ("accessRoleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE;
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE;
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_accessRoleId_fkey" FOREIGN KEY ("accessRoleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE;
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_accessGroupId_fkey" FOREIGN KEY ("accessGroupId") REFERENCES "AccessGroup"("id") ON DELETE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userAccessId_fkey" FOREIGN KEY ("userAccessId") REFERENCES "UserAccess"("id") ON DELETE CASCADE;
ALTER TABLE "AuthChallenge" ADD CONSTRAINT "AuthChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "AuthAudit" ADD CONSTRAINT "AuthAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT;
ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT;
