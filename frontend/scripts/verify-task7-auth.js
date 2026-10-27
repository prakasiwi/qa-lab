import assert from "node:assert/strict";
import { createAuthSession } from "../src/auth/createAuthSession.js";
import { shouldInvalidateAuth } from "../src/api/authInvalidation.js";

assert.equal(
  shouldInvalidateAuth({ response: { status: 401 }, config: {} }),
  true,
);
assert.equal(
  shouldInvalidateAuth({
    response: { status: 401 },
    config: { skipAuthInvalidation: true },
  }),
  false,
);
const session = createAuthSession(async () => ({
  data: { data: { id: "profile-user", role: { code: "GENERAL" } } },
}));
await session.establish();
assert.equal(session.getSnapshot().authenticated, true);
console.log("Authentication session checks passed.");
