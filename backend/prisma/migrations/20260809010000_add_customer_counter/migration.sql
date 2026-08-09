CREATE TABLE "CustomerCounter" (
    "key" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerCounter_pkey" PRIMARY KEY ("key")
);

INSERT INTO "CustomerCounter" ("key", "nextNumber", "updatedAt")
VALUES (
    'CUSTOMER',
    COALESCE((
        SELECT MAX((regexp_match("customerCode", '^CUST-([0-9]+)$'))[1]::INTEGER) + 1
        FROM "Customer"
        WHERE "customerCode" ~ '^CUST-[0-9]+$'
    ), 1),
    CURRENT_TIMESTAMP
);
