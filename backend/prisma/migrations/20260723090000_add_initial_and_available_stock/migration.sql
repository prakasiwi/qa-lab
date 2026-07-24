ALTER TABLE "Product" RENAME COLUMN "stock" TO "initialStock";
ALTER TABLE "Product" ADD COLUMN "availableStock" INTEGER;

UPDATE "Product"
SET "availableStock" = "initialStock"
WHERE "availableStock" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "initialStock" SET DEFAULT 0;
ALTER TABLE "Product" ALTER COLUMN "availableStock" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "availableStock" SET DEFAULT 0;
