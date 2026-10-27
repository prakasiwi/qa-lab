WITH ranked_defaults AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "isActive" DESC, "id" ASC) AS default_rank
  FROM "UserAccess"
  WHERE "isDefault" = TRUE
)
UPDATE "UserAccess" AS access
SET "isDefault" = FALSE
FROM ranked_defaults
WHERE access."id" = ranked_defaults.id AND ranked_defaults.default_rank > 1;

CREATE UNIQUE INDEX user_accesses_one_default_per_user
ON "UserAccess" ("userId")
WHERE "isDefault" = TRUE;
