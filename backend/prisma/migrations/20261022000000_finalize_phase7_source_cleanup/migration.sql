-- Phase 7 source cleanup is intentionally non-destructive for populated databases.
-- Prisma no longer reads User.role, UserAccess.isDefault, AuthIdentity, or the
-- retired SSO enum values. The physical legacy columns/tables are retained here
-- for backward compatibility and may be removed only through a separately
-- approved data-retention migration after production data has been reviewed.
--
-- This migration is deliberately a no-op: applying it records the source-model
-- transition without deleting or rewriting any existing data.
SELECT 1;
