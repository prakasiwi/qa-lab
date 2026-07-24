ALTER TABLE "InvoiceItem" ADD COLUMN "productCodeSnapshot" TEXT;

UPDATE "InvoiceItem" ii
SET "productCodeSnapshot" = p."productCode"
FROM "Product" p
WHERE p."id" = ii."productId";
