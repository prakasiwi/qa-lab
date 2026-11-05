import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const schema = read("prisma/schema.prisma");
const routes = read("src/modules/auth/auth.route.js");
const users = read("src/modules/users/user.validation.js");
const swagger = read("src/docs/swagger.js");

assert.match(schema, /EMAIL_OTP/);
assert.match(schema, /emailOtpRequired\s+Boolean/);
assert.match(schema, /emailOtpVerifiedAt/);
assert.match(routes, /"\/email-otp\/verify"/);
assert.match(routes, /"\/email-otp\/resend"/);
assert.doesNotMatch(routes, /"\/mfa\//);
assert.match(users, /emailOtpRequired: Joi\.boolean\(\)/);
assert.match(swagger, /EmailOtpVerifyRequest/);
assert.match(swagger, /"\/auth\/email-otp\/verify"/);
assert.doesNotMatch(swagger, /"\/auth\/mfa\//);

console.log("Email OTP naming checks passed.");
