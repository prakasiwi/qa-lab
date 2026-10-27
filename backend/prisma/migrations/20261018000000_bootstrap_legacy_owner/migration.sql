-- This migration can be discovered after newer migrations on an existing database.
-- Only the legacy schema needs a bootstrap owner; dynamic SQL avoids referencing
-- legacy-only columns after they have been removed.
DO $$
DECLARE
  is_legacy_schema BOOLEAN;
  bootstrap_user_id TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'User'
      AND column_name = 'isActive'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Customer'
      AND column_name = 'ownerUserId'
  ) INTO is_legacy_schema;

  IF NOT is_legacy_schema
    OR EXISTS (SELECT 1 FROM "User")
    OR NOT (
      EXISTS (SELECT 1 FROM "Customer")
      OR EXISTS (SELECT 1 FROM "Product")
      OR EXISTS (SELECT 1 FROM "Invoice")
    ) THEN
    RETURN;
  END IF;

  SELECT "createdBy"
  INTO bootstrap_user_id
  FROM "Invoice"
  ORDER BY "createdAt", "id"
  LIMIT 1;

  bootstrap_user_id := COALESCE(bootstrap_user_id, 'legacy-bootstrap-owner');

  EXECUTE format(
    'INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "isActive", "createdAt", "updatedAt") VALUES (%L, %L, %L, %L, %L::"Role", false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    bootstrap_user_id,
    'Legacy Data Owner',
    'legacy-owner@system.invalid',
    '!legacy-account-has-no-password!',
    'ADMIN'
  );
END $$;
