-- The original PostgreSQL enum is named "Role", so rename it before creating
-- the new IAM table. PostgreSQL keeps User.role's default bound to the renamed
-- type; no value conversion is required.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role' AND typtype = 'e')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LegacyRole') THEN
    ALTER TYPE "Role" RENAME TO "LegacyRole";
  END IF;
END $$;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_userAccessId_fkey";
ALTER TABLE "AuthAudit" DROP CONSTRAINT IF EXISTS "AuthAudit_userAccessId_fkey";

DO $$
BEGIN
  IF to_regclass('"LegacyUserAccess"') IS NULL AND to_regclass('"UserAccess"') IS NOT NULL THEN
    ALTER TABLE "UserAccess" RENAME TO "LegacyUserAccess";
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = '"LegacyUserAccess"'::regclass AND conname = 'UserAccess_pkey'
  ) THEN
    ALTER TABLE "LegacyUserAccess" RENAME CONSTRAINT "UserAccess_pkey" TO "LegacyUserAccess_pkey";
  END IF;
END $$;
ALTER TABLE "LegacyUserAccess" DROP CONSTRAINT IF EXISTS "UserAccess_accessGroupId_fkey";
ALTER TABLE "LegacyUserAccess" DROP CONSTRAINT IF EXISTS "UserAccess_accessRoleId_fkey";
ALTER TABLE "LegacyUserAccess" DROP CONSTRAINT IF EXISTS "UserAccess_applicationId_fkey";
DROP INDEX IF EXISTS "UserAccess_userId_applicationId_accessRoleId_accessGroupId_key";
DROP INDEX IF EXISTS "UserAccess_userId_isActive_idx";
DROP INDEX IF EXISTS "user_accesses_one_default_per_user";

CREATE TABLE IF NOT EXISTS "Role" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Permission" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PermissionAction" (
  "id" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PermissionAction_pkey" PRIMARY KEY ("id")
);

-- A legacy role normally maps to one Role. If a user has several legacy
-- groups for that role, every group gets a deterministic role variant. This
-- preserves every UserAccess row while retaining the new unique(userId, roleId)
-- invariant. Scoped code/name collisions are deterministically namespaced.
DROP TABLE IF EXISTS "RoleMigrationMap";
CREATE TABLE "RoleMigrationMap" AS
WITH roles_requiring_variants AS (
  SELECT "accessRoleId"
  FROM "LegacyUserAccess"
  GROUP BY "userId", "accessRoleId"
  HAVING COUNT(*) > 1
), mapping_sources AS (
  SELECT access_role."id" AS "legacyRoleId", NULL::TEXT AS "legacyGroupId",
         access_role."code" AS "sourceCode", access_role."name" AS "sourceName", access_role."isActive"
  FROM "AccessRole" AS access_role
  WHERE NOT EXISTS (SELECT 1 FROM roles_requiring_variants AS variant WHERE variant."accessRoleId" = access_role."id")
  UNION ALL
  SELECT access_role."id", access_group."id", access_role."code", access_role."name", access_role."isActive"
  FROM "AccessRole" AS access_role
  JOIN roles_requiring_variants AS variant ON variant."accessRoleId" = access_role."id"
  JOIN "AccessGroup" AS access_group ON access_group."accessRoleId" = access_role."id"
), ranked_sources AS (
  SELECT *,
    COUNT(*) OVER (PARTITION BY "sourceCode") AS code_count,
    COUNT(*) OVER (PARTITION BY "sourceName") AS name_count
  FROM mapping_sources
)
SELECT
  "legacyRoleId",
  "legacyGroupId",
  'iam-role:' || "legacyRoleId" || COALESCE(':permission:' || "legacyGroupId", '') AS "newRoleId",
  CASE WHEN code_count = 1 THEN "sourceCode"
       ELSE 'legacy-role:' || "legacyRoleId" || COALESCE(':permission:' || "legacyGroupId", '') || ':' || "sourceCode" END AS "code",
  CASE WHEN name_count = 1 THEN "sourceName"
       ELSE 'Legacy role ' || "legacyRoleId" || COALESCE(' permission ' || "legacyGroupId", '') || ': ' || "sourceName" END AS "name",
  "isActive"
FROM ranked_sources;

INSERT INTO "Role" ("id", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT "newRoleId", "code", "name", "isActive", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "RoleMigrationMap";

-- Permissions deduplicate exactly matching legacy (code, name) pairs. If a
-- code or name is shared by different pairs, only the colliding value is
-- namespaced so the target's independent unique constraints remain valid.
DROP TABLE IF EXISTS "PermissionMigrationMap";
CREATE TABLE "PermissionMigrationMap" AS
WITH distinct_permissions AS (
  SELECT MIN("id") AS "canonicalGroupId", "code" AS "sourceCode", "name" AS "sourceName", BOOL_OR("isActive") AS "isActive"
  FROM "AccessGroup"
  GROUP BY "code", "name"
), ranked_permissions AS (
  SELECT *,
    COUNT(*) OVER (PARTITION BY "sourceCode") AS code_count,
    COUNT(*) OVER (PARTITION BY "sourceName") AS name_count
  FROM distinct_permissions
), resolved_permissions AS (
  SELECT
    "canonicalGroupId",
    "sourceCode",
    "sourceName",
    'iam-permission:' || "canonicalGroupId" AS "newPermissionId",
    CASE WHEN code_count = 1 THEN "sourceCode"
         ELSE 'legacy-permission:' || "canonicalGroupId" || ':' || "sourceCode" END AS "code",
    CASE WHEN name_count = 1 THEN "sourceName"
         ELSE 'Legacy permission ' || "canonicalGroupId" || ': ' || "sourceName" END AS "name",
    "isActive"
  FROM ranked_permissions
)
SELECT access_group."id" AS "legacyGroupId", resolved_permissions.*
FROM "AccessGroup" AS access_group
JOIN resolved_permissions ON resolved_permissions."sourceCode" = access_group."code"
  AND resolved_permissions."sourceName" = access_group."name";

INSERT INTO "Permission" ("id", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT DISTINCT "newPermissionId", "code", "name", "isActive", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "PermissionMigrationMap";

CREATE TABLE "UserAccess" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAccess_pkey" PRIMARY KEY ("id")
);

-- Preserve every legacy access ID. It is therefore an exact stable target for
-- Session and AuthAudit references, including historical inactive assignments.
INSERT INTO "UserAccess" ("id", "userId", "roleId", "permissionId", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT legacy."id", legacy."userId", role_map."newRoleId", permission_map."newPermissionId",
       legacy."isDefault", legacy."isActive", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "LegacyUserAccess" AS legacy
JOIN "RoleMigrationMap" AS role_map ON role_map."legacyRoleId" = legacy."accessRoleId"
  AND (role_map."legacyGroupId" IS NULL OR role_map."legacyGroupId" = legacy."accessGroupId")
JOIN "PermissionMigrationMap" AS permission_map ON permission_map."legacyGroupId" = legacy."accessGroupId";

-- The old model allowed one default per application. The target has one global
-- default; all assignments remain, but only the deterministic first is default.
WITH ranked_defaults AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "isActive" DESC, "id" ASC) AS default_rank
  FROM "UserAccess"
  WHERE "isDefault" = true
)
UPDATE "UserAccess" AS access
SET "isDefault" = false
FROM ranked_defaults
WHERE access."id" = ranked_defaults."id" AND ranked_defaults.default_rank > 1;

-- IDs were retained above, but explicitly map each dependent record through
-- the derived assignment and revoke every live session after the IAM cutover.
UPDATE "Session" AS session
SET "userAccessId" = derived."id",
    "revokedAt" = COALESCE(session."revokedAt", CURRENT_TIMESTAMP)
FROM "LegacyUserAccess" AS legacy
JOIN "UserAccess" AS derived ON derived."id" = legacy."id"
WHERE session."userAccessId" = legacy."id";

UPDATE "AuthAudit" AS audit
SET "userAccessId" = derived."id"
FROM "LegacyUserAccess" AS legacy
JOIN "UserAccess" AS derived ON derived."id" = legacy."id"
WHERE audit."userAccessId" = legacy."id";

DROP TABLE "RoleMigrationMap";
DROP TABLE "PermissionMigrationMap";

ALTER TABLE "LegacyUserAccess" DROP CONSTRAINT "UserAccess_userId_fkey";
DROP TABLE "LegacyUserAccess";
ALTER TABLE "AccessGroup" DROP CONSTRAINT "AccessGroup_accessRoleId_fkey";
ALTER TABLE "AccessRole" DROP CONSTRAINT "AccessRole_applicationId_fkey";
DROP TABLE "AccessGroup";
DROP TABLE "AccessRole";
DROP TABLE "Application";

CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");
CREATE UNIQUE INDEX "PermissionAction_permissionId_resource_action_key" ON "PermissionAction"("permissionId", "resource", "action");
CREATE INDEX "PermissionAction_permissionId_idx" ON "PermissionAction"("permissionId");
CREATE UNIQUE INDEX "UserAccess_userId_roleId_key" ON "UserAccess"("userId", "roleId");
CREATE INDEX "UserAccess_userId_isActive_idx" ON "UserAccess"("userId", "isActive");
CREATE INDEX "UserAccess_permissionId_idx" ON "UserAccess"("permissionId");

ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PermissionAction" ADD CONSTRAINT "PermissionAction_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userAccessId_fkey"
  FOREIGN KEY ("userAccessId") REFERENCES "UserAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthAudit" ADD CONSTRAINT "AuthAudit_userAccessId_fkey"
  FOREIGN KEY ("userAccessId") REFERENCES "UserAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
