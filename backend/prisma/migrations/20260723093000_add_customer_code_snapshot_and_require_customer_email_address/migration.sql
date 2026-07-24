ALTER TABLE "Invoice" ADD COLUMN "customerCodeSnapshot" TEXT;

UPDATE "Invoice" i
SET "customerCodeSnapshot" = c."customerCode"
FROM "Customer" c
WHERE c."id" = i."customerId";

UPDATE "Invoice"
SET "customerCodeSnapshot" = 'UNKNOWN'
WHERE "customerCodeSnapshot" IS NULL;

UPDATE "Customer"
SET "email" = CONCAT('customer-', "id", '@example.com')
WHERE "email" IS NULL OR "email" = '';

UPDATE "Customer"
SET "address" = '-'
WHERE "address" IS NULL OR "address" = '';

ALTER TABLE "Invoice" ALTER COLUMN "customerCodeSnapshot" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "address" SET NOT NULL;
