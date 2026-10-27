import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  loginStageFromResponse,
  normalizeOtp,
  nextCountdown,
  resendOtpState,
  selectRoleState,
  sortRoles,
  switchRoleState,
} from "../src/auth/loginFlow.js";
import { firstAllowedPath } from "../src/utils/authDestination.js";
import { createAuthSession } from "../src/auth/createAuthSession.js";

const read = (path) => readFileSync(resolve(path), "utf8");
const api = read("src/api/authApi.js");
const login = read("src/pages/LoginPage.jsx");
const routes = read("src/routes/AppRoutes.jsx");
const sidebar = read("src/components/Sidebar.jsx");
const dialog = read("src/components/SwitchRoleDialog.jsx");
for (const endpoint of [
  "/auth/login",
  "/auth/mfa-login",
  "/auth/mfa/verify",
  "/auth/mfa/resend",
  "/auth/select-role",
  "/auth/roles",
  "/auth/switch-role",
])
  assert.ok(api.includes(endpoint), `missing ${endpoint}`);
assert.doesNotMatch(api, /select-access|old-login|sso\/callback/);
assert.match(login, /loginStageFromResponse\(data\)/);
assert.match(login, /autoComplete="one-time-code"/);
assert.match(login, /<option value="">Select role<\/option>/);
assert.match(login, /disabled=\{!roleId\}/);
assert.doesNotMatch(login, /sso-login|old-login|Legacy login/);
assert.doesNotMatch(routes, /old-login|sso-login|sso\/callback/);
assert.match(sidebar, /SwitchRoleDialog/);
assert.match(dialog, /aria-modal="true"/);
assert.match(dialog, /event\.key === 'Escape'/);
assert.match(dialog, /authSession\.establish\(\{ roleSwitch: true \}\)/);
assert.match(dialog, /Current role:/);
assert.match(dialog, /event\.key !== 'Tab'/);
assert.match(dialog, /closeButtonRef\.current\?\.focus\(\)/);
assert.match(routes, /key=\{session\.generation\}/);
assert.equal(
  normalizeOtp("0a1234567"),
  "012345",
  "OTP normalization preserves leading zero and limits to six digits",
);
assert.equal(nextCountdown(0), 0, "countdown cannot become negative");
assert.equal(nextCountdown(2), 1, "countdown decrements by one");
assert.deepEqual(
  sortRoles([
    { id: "2", name: "Zulu" },
    { id: "1", name: "Alpha" },
  ]).map((role) => role.name),
  ["Alpha", "Zulu"],
);
assert.equal(
  firstAllowedPath({ allowedActions: ["products:view"] }),
  "/products",
);
assert.deepEqual(
  loginStageFromResponse({
    nextStep: "OTP_REQUIRED",
    challengeId: "challenge-1",
  }),
  { stage: "OTP", challengeId: "challenge-1" },
);
assert.equal(
  loginStageFromResponse({
    nextStep: "ROLE_SELECTION_REQUIRED",
    selectionProof: "proof",
  }).stage,
  "ROLE",
);
assert.equal(loginStageFromResponse({}).stage, "ERROR");
assert.deepEqual(resendOtpState("new-challenge"), {
  challengeId: "new-challenge",
  otp: "",
  expiresIn: 300,
  resendIn: 60,
});
assert.equal(selectRoleState(true).stage, "AUTHENTICATED");
assert.equal(selectRoleState(false).stage, "ROLE");
assert.equal(switchRoleState("start").loading, true);
assert.equal(switchRoleState("success").invalidated, true);
assert.equal(switchRoleState("failure").loading, false);
const roleSession = createAuthSession(async () => ({
  data: { data: { id: "role-user", allowedActions: [] } },
}));
await roleSession.establish();
const initialGeneration = roleSession.getSnapshot().generation;
await roleSession.establish({ roleSwitch: true });
assert.equal(
  roleSession.getSnapshot().generation,
  initialGeneration + 1,
  "role switch must invalidate old role data",
);
console.log("Phase 3 authentication frontend checks passed.");
