import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { updatePermissionSelection } from "../src/components/permissions/permissionMatrixState.js";

const read = (path) => readFileSync(resolve(path), "utf8");
const routes = read("src/routes/AppRoutes.jsx");
const sidebar = read("src/components/Sidebar.jsx");
const guard = read("src/components/PermissionRoute.jsx");
const roleApi = read("src/api/roleApi.js");
const permissionApi = read("src/api/permissionApi.js");
const roleForm = read("src/pages/roles/RoleFormPage.jsx");
const permissionForm = read("src/pages/permissions/PermissionFormPage.jsx");
const permissionMatrix = read(
  "src/components/permissions/PermissionMatrix.jsx",
);
const usersPage = read("src/pages/users/UsersPage.jsx");
const userDetail = read("src/pages/users/UserDetailPage.jsx");
const rolesPage = read("src/pages/roles/RolesPage.jsx");
const permissionsPage = read("src/pages/permissions/PermissionsPage.jsx");
const apiErrors = read("src/utils/apiErrors.js");

for (const path of [
  "/roles",
  "/roles/new",
  "/roles/:id",
  "/roles/:id/edit",
  "/permissions",
  "/permissions/new",
  "/permissions/:id",
  "/permissions/:id/edit",
]) {
  assert.ok(routes.includes(`path="${path}"`), `missing route ${path}`);
}
assert.match(guard, /<Navigate to="\/forbidden" replace/);
assert.match(guard, /Array\.isArray\(action\)/);
assert.match(sidebar, /canViewUsers.*canViewRoles.*canViewPermissions/s);
assert.match(
  sidebar,
  /canViewIam = canViewUsers \|\| canViewRoles \|\| canViewPermissions/,
);
assert.doesNotMatch(roleApi, /\/status/);
assert.match(permissionApi, /get\('\/permissions\/action-catalog'\)/);
assert.doesNotMatch(permissionApi, /\/status/);
assert.match(
  routes,
  /permissionPage\(\['iam_users:manage', 'iam_permissions:manage'\]/,
);
assert.match(
  usersPage,
  /const canManage = canManageUsers && canManagePermissions/,
);
assert.match(userDetail, /if \(!user\) return/);
assert.match(apiErrors, /status === 403/);
assert.match(rolesPage, /setResult\(\{ items: \[\], total: 0 \}\)/);
assert.match(permissionsPage, /setResult\(\{ items: \[\], total: 0 \}\)/);
assert.match(roleForm, /disabled=\{isEdit\}/);
assert.match(permissionForm, /updatedAt: form\.updatedAt/);
assert.match(
  permissionForm,
  /active permission must contain at least one View action/i,
);
assert.match(
  permissionMatrix,
  /<th>No<\/th><th>Menu<\/th><th>Submenu<\/th><th>Action<\/th>/,
);

const row = {
  resourceKey: "customers",
  actions: [{ key: "view" }, { key: "create" }, { key: "update" }],
};
const selectedMutation = updatePermissionSelection({
  row,
  selected: new Set(),
  actionKey: "create",
  checked: true,
});
assert.deepEqual(
  [...selectedMutation].sort(),
  ["customers:create", "customers:view"],
  "mutation must auto-select View",
);

const cancelledClear = updatePermissionSelection({
  row,
  selected: selectedMutation,
  actionKey: "view",
  checked: false,
  confirmClear: () => false,
});
assert.equal(
  cancelledClear,
  selectedMutation,
  "cancelled View clear must preserve the original selection",
);

const confirmedClear = updatePermissionSelection({
  row,
  selected: selectedMutation,
  actionKey: "view",
  checked: false,
  confirmClear: () => true,
});
assert.deepEqual(
  [...confirmedClear],
  [],
  "confirmed View clear must clear dependent actions",
);

console.log("Phase 2 IAM frontend structural and behavior checks passed.");
