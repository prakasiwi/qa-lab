WITH duplicate_customers AS (
    SELECT
        "id",
        "email",
        ROW_NUMBER() OVER (PARTITION BY LOWER("email") ORDER BY "createdAt", "id") AS duplicate_order
    FROM "Customer"
)
UPDATE "Customer" c
SET "email" = CONCAT('customer-', c."id", '@duplicate.local')
FROM duplicate_customers d
WHERE c."id" = d."id"
  AND d.duplicate_order > 1;

CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
