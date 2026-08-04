const SSL_MODES_REQUIRING_VERIFY_FULL = new Set(["prefer", "require", "verify-ca"]);

export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL belum dikonfigurasi");
  }

  const parsedUrl = new URL(databaseUrl);
  const sslMode = parsedUrl.searchParams.get("sslmode");

  if (sslMode && SSL_MODES_REQUIRING_VERIFY_FULL.has(sslMode)) {
    parsedUrl.searchParams.set("sslmode", "verify-full");
  }

  return parsedUrl.toString();
}
