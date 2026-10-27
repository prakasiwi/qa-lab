CREATE TABLE "AuthAttemptBucket" (
    "keyHash" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowExpiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthAttemptBucket_pkey" PRIMARY KEY ("keyHash")
);

CREATE INDEX "AuthAttemptBucket_windowExpiresAt_idx" ON "AuthAttemptBucket"("windowExpiresAt");
