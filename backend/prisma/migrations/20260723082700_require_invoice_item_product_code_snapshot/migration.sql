UPDATE "InvoiceItem"
SET "productCodeSnapshot" = 'UNKNOWN'
WHERE "productCodeSnapshot" IS NULL;

ALTER TABLE "InvoiceItem" ALTER COLUMN "productCodeSnapshot" SET NOT NULL;
