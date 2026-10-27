BEGIN;

ALTER TABLE "Role" ADD COLUMN "description" TEXT;
ALTER TABLE "Permission" ADD COLUMN "description" TEXT;

-- Historical debt: the duplicate-role variant CTE in applied migration
-- 20261021000000 preserved every legacy assignment by
-- generating role variants when one user held the same legacy role through
-- multiple groups. Those identities are historical and intentionally remain
-- unchanged. Surface their presence for follow-up instead of rewriting them.
DO $$
DECLARE
  legacy_variant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO legacy_variant_count
  FROM "Role"
  WHERE "id" LIKE 'iam-role:%:permission:%';

  IF legacy_variant_count > 0 THEN
    RAISE NOTICE '% historical role variant(s) retained from the applied IAM migration; identities were not rewritten.', legacy_variant_count;
  END IF;
END $$;

-- Bootstrap only known, completely grantless seed permissions. A permission
-- with any action is treated as customized and is never modified here.
WITH catalog("permissionCode", "resource", "action") AS (
  VALUES
    ('ADMIN', 'dashboard', 'view'),
    ('ADMIN', 'customers', 'view'), ('ADMIN', 'customers', 'create'), ('ADMIN', 'customers', 'update'), ('ADMIN', 'customers', 'delete'),
    ('ADMIN', 'products', 'view'), ('ADMIN', 'products', 'create'), ('ADMIN', 'products', 'update'), ('ADMIN', 'products', 'delete'),
    ('ADMIN', 'invoices', 'view'), ('ADMIN', 'invoices', 'create'), ('ADMIN', 'invoices', 'update'), ('ADMIN', 'invoices', 'delete'),
    ('ADMIN', 'invoices', 'submit'), ('ADMIN', 'invoices', 'pay'), ('ADMIN', 'invoices', 'cancel'),
    ('ADMIN', 'iam_users', 'view'), ('ADMIN', 'iam_users', 'manage'),
    ('ADMIN', 'iam_roles', 'view'), ('ADMIN', 'iam_roles', 'manage'),
    ('ADMIN', 'iam_permissions', 'view'), ('ADMIN', 'iam_permissions', 'manage'),
    ('GENERAL', 'customers', 'view'), ('GENERAL', 'customers', 'create'), ('GENERAL', 'customers', 'update'),
    ('GENERAL', 'products', 'view'), ('GENERAL', 'products', 'create'), ('GENERAL', 'products', 'update'),
    ('GENERAL', 'invoices', 'view'), ('GENERAL', 'invoices', 'create'), ('GENERAL', 'invoices', 'update'), ('GENERAL', 'invoices', 'submit'),
    ('READ_ONLY', 'customers', 'view'), ('READ_ONLY', 'products', 'view'), ('READ_ONLY', 'invoices', 'view')
)
INSERT INTO "PermissionAction" ("id", "permissionId", "resource", "action", "createdAt", "updatedAt")
SELECT
  'iam-bootstrap:' || LOWER(permission."code") || ':' || catalog."resource" || ':' || catalog."action",
  permission."id",
  catalog."resource",
  catalog."action",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM catalog
JOIN "Permission" AS permission ON permission."code" = catalog."permissionCode"
WHERE NOT EXISTS (
  SELECT 1 FROM "PermissionAction" AS existing
  WHERE existing."permissionId" = permission."id"
)
ON CONFLICT ("permissionId", "resource", "action") DO NOTHING;

-- Phase 2 still requires exactly one default access per user. Repair any
-- duplicate defaults deterministically before recreating the partial unique
-- index that the applied IAM replacement migration dropped.
WITH ranked_defaults AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "isActive" DESC, "createdAt" ASC, "id" ASC
    ) AS default_rank
  FROM "UserAccess"
  WHERE "isDefault" = TRUE
)
UPDATE "UserAccess" AS access
SET "isDefault" = FALSE
FROM ranked_defaults
WHERE access."id" = ranked_defaults."id"
  AND ranked_defaults.default_rank > 1;

DROP INDEX IF EXISTS "user_accesses_one_default_per_user";
CREATE UNIQUE INDEX "user_accesses_one_default_per_user"
ON "UserAccess" ("userId")
WHERE "isDefault" = TRUE;

COMMIT;
