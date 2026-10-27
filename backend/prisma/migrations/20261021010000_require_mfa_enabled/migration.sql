UPDATE "User" SET "mfaEnabled" = false WHERE "mfaEnabled" IS NULL;

ALTER TABLE "User"
  ALTER COLUMN "mfaEnabled" SET DEFAULT false,
  ALTER COLUMN "mfaEnabled" SET NOT NULL;
