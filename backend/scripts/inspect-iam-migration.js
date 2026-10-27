import "dotenv/config";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const tables = await client.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Role','Permission','PermissionAction','UserAccess','LegacyUserAccess','RoleMigrationMap','PermissionMigrationMap','Application','AccessRole','AccessGroup') ORDER BY table_name`,
);
const constraints = await client.query(
  `SELECT conname, conrelid::regclass::text AS table_name FROM pg_constraint WHERE conname LIKE '%UserAccess%' OR conname LIKE '%user_access%' ORDER BY conname`,
);
const indexes = await client.query(
  `SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' AND (indexname LIKE '%UserAccess%' OR indexname LIKE '%user_access%') ORDER BY indexname`,
);
const migrations = await client.query(
  `SELECT id, migration_name, finished_at, rolled_back_at, logs IS NOT NULL AS has_logs FROM _prisma_migrations WHERE migration_name LIKE '202610210%' ORDER BY started_at`,
);
const integrity = await client.query(`
  SELECT
    (SELECT COUNT(*)::int FROM "UserAccess" ua LEFT JOIN "Role" r ON r.id = ua."roleId" WHERE r.id IS NULL) AS orphan_roles,
    (SELECT COUNT(*)::int FROM "UserAccess" ua LEFT JOIN "Permission" p ON p.id = ua."permissionId" WHERE p.id IS NULL) AS orphan_permissions,
    (SELECT COUNT(*)::int FROM "Session" s LEFT JOIN "UserAccess" ua ON ua.id = s."userAccessId" WHERE ua.id IS NULL) AS orphan_sessions,
    (SELECT COUNT(*)::int FROM "User" WHERE "mfaEnabled" IS NULL) AS null_mfa
`);
const counts = {};
for (const { table_name: table } of tables.rows) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count FROM "${table}"`,
  );
  counts[table] = result.rows[0].count;
}
console.log(
  JSON.stringify(
    {
      tables: tables.rows,
      constraints: constraints.rows,
      indexes: indexes.rows,
      migrations: migrations.rows,
      counts,
      integrity: integrity.rows[0],
    },
    null,
    2,
  ),
);
await client.end();
