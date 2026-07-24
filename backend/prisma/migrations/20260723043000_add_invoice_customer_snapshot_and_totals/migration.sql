-- Add invoice snapshot, discount, and atomic counter fields without resetting existing data.

ALTER TABLE "Invoice" RENAME COLUMN "invoiceDate" TO "issueDate";
ALTER TABLE "Invoice" RENAME COLUMN "notes" TO "additionalInfo";

ALTER TABLE "Invoice" ADD COLUMN "customerNameSnapshot" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "customerAddressSnapshot" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "totalDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 11;

UPDATE "Invoice" i
SET "customerNameSnapshot" = c."customerName",
    "customerAddressSnapshot" = c."address"
FROM "Customer" c
WHERE c."id" = i."customerId";

ALTER TABLE "Invoice" ALTER COLUMN "customerNameSnapshot" SET NOT NULL;

ALTER TABLE "InvoiceItem" ADD COLUMN "productNameSnapshot" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "InvoiceItem" ADD COLUMN "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "InvoiceItem" ADD COLUMN "grossTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "InvoiceItem" ADD COLUMN "lineTotal" DECIMAL(12,2);

UPDATE "InvoiceItem" ii
SET "productNameSnapshot" = p."productName",
    "grossTotal" = (ii."quantity" * ii."unitPrice"),
    "lineTotal" = ii."subtotal"
FROM "Product" p
WHERE p."id" = ii."productId";

ALTER TABLE "InvoiceItem" ALTER COLUMN "productNameSnapshot" SET NOT NULL;
ALTER TABLE "InvoiceItem" ALTER COLUMN "lineTotal" SET NOT NULL;

CREATE TABLE "InvoiceCounter" (
    "period" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("period")
);
