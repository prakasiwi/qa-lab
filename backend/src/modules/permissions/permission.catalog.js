const catalogDefinitions = [
  {
    resourceKey: "dashboard",
    menuLabel: "Dashboard",
    submenuLabel: "-",
    actionKeys: ["view"],
  },
  {
    resourceKey: "customers",
    menuLabel: "Master Data",
    submenuLabel: "Customers",
    actionKeys: ["view", "create", "update", "delete"],
  },
  {
    resourceKey: "products",
    menuLabel: "Master Data",
    submenuLabel: "Products",
    actionKeys: ["view", "create", "update", "delete"],
  },
  {
    resourceKey: "invoices",
    menuLabel: "Transactions",
    submenuLabel: "Invoices",
    actionKeys: [
      "view",
      "create",
      "update",
      "delete",
      "submit",
      "pay",
      "cancel",
    ],
  },
  {
    resourceKey: "iam_users",
    menuLabel: "IAM",
    submenuLabel: "Users",
    actionKeys: ["view", "manage"],
  },
  {
    resourceKey: "iam_roles",
    menuLabel: "IAM",
    submenuLabel: "Role",
    actionKeys: ["view", "manage"],
  },
  {
    resourceKey: "iam_permissions",
    menuLabel: "IAM",
    submenuLabel: "Permission",
    actionKeys: ["view", "manage"],
  },
];

const actionLabels = Object.freeze({
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  submit: "Submit",
  pay: "Pay",
  cancel: "Cancel",
  manage: "Manage",
});

export const PERMISSION_CATALOG_ROWS = Object.freeze(
  catalogDefinitions.map((definition) =>
    Object.freeze({
      resourceKey: definition.resourceKey,
      menuLabel: definition.menuLabel,
      submenuLabel: definition.submenuLabel,
      isActive: true,
      isRegistered: true,
      actions: Object.freeze(
        definition.actionKeys.map((key) =>
          Object.freeze({ key, label: actionLabels[key] }),
        ),
      ),
    }),
  ),
);

export const PERMISSION_ACTION_CATALOG = Object.freeze(
  Object.fromEntries(
    catalogDefinitions.map(({ resourceKey, actionKeys }) => [
      resourceKey,
      Object.freeze([...actionKeys]),
    ]),
  ),
);

const freezeActionPairs = (actions) =>
  Object.freeze(actions.map((action) => Object.freeze(action)));
const noBootstrapActions = Object.freeze([]);

export const SEEDED_PERMISSION_ACTION_CATALOG = Object.freeze({
  ADMIN: freezeActionPairs(
    PERMISSION_CATALOG_ROWS.flatMap(({ resourceKey, actions }) =>
      actions.map(({ key }) => [resourceKey, key]),
    ),
  ),
  GENERAL: freezeActionPairs([
    ["customers", "view"],
    ["customers", "create"],
    ["customers", "update"],
    ["products", "view"],
    ["products", "create"],
    ["products", "update"],
    ["invoices", "view"],
    ["invoices", "create"],
    ["invoices", "update"],
    ["invoices", "submit"],
  ]),
  READ_ONLY: freezeActionPairs([
    ["customers", "view"],
    ["products", "view"],
    ["invoices", "view"],
  ]),
});

export function getPermissionBootstrapActions(permissionCode, wasCreated) {
  if (wasCreated !== true) return noBootstrapActions;
  return SEEDED_PERMISSION_ACTION_CATALOG[permissionCode] || noBootstrapActions;
}

const catalogActions = new Set(
  PERMISSION_CATALOG_ROWS.flatMap(({ resourceKey, actions }) =>
    actions.map(({ key }) => `${resourceKey}:${key}`),
  ),
);

export function validatePermissionActions(actions, isActive = false) {
  const actionKeys = actions.map(
    ({ resource, action }) => `${resource}:${action}`,
  );
  const uniqueActionKeys = new Set(actionKeys);
  if (uniqueActionKeys.size !== actionKeys.length)
    return "Permission actions must not contain duplicates.";

  const containsUnsupportedAction = actionKeys.some(
    (key) => !catalogActions.has(key),
  );
  if (containsUnsupportedAction)
    return "Permission actions contain an unsupported resource or action.";

  for (const { resource, action } of actions) {
    const requiresView = action !== "view";
    const hasView = uniqueActionKeys.has(`${resource}:view`);
    if (requiresView && !hasView)
      return `The ${resource}:${action} action requires ${resource}:view.`;
  }

  const hasViewAction = actions.some(({ action }) => action === "view");
  if (isActive && !hasViewAction)
    return "An active permission must contain at least one View action.";

  return null;
}
