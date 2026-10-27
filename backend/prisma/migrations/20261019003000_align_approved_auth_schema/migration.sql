UPDATE "User"
SET "status" = 'INACTIVE'
WHERE "isActive" = false AND "status" = 'ACTIVE';

ALTER TABLE "User"
  DROP COLUMN "isActive",
  ALTER COLUMN "mfaEnabled" DROP DEFAULT,
  ALTER COLUMN "mfaEnabled" DROP NOT NULL;

ALTER TABLE "Application"
  DROP COLUMN "createdAt",
  DROP COLUMN "updatedAt";

ALTER TABLE "AccessRole"
  DROP COLUMN "createdAt",
  DROP COLUMN "updatedAt";

ALTER TABLE "AccessGroup"
  DROP COLUMN "createdAt",
  DROP COLUMN "updatedAt";

ALTER TABLE "UserAccess"
  DROP COLUMN "createdAt",
  DROP COLUMN "updatedAt";
