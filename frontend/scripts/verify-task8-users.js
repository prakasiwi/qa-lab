import fs from "node:fs";
import assert from "node:assert/strict";
const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const routes = read("src/routes/AppRoutes.jsx");
const sidebar = read("src/components/Sidebar.jsx");
const guard = read("src/components/AdminRoute.jsx");
const api = read("src/api/userApi.js");
const login = read("src/pages/LoginPage.jsx");
assert.match(routes, /<AdminRoute><UsersPage/);
assert.match(routes, /path="\/forbidden"/);
assert.match(sidebar, /allowedActions.*iam_/);
assert.match(sidebar, /<span>IAM<\/span>/);
assert.match(guard, /allowedActions.*iam_users:view/);
assert.match(api, /\/users\/\$\{id\}\/sessions/);
assert.match(api, /resend-verification/);
assert.match(
  login,
  /selectRole\(\{ selectionProof: selection\.selectionProof, roleId \}\)/,
);
console.log("Task 8 users/access-selection frontend checks passed.");
