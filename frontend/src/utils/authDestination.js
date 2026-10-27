const destinations = [
  ["dashboard:view", "/dashboard"],
  ["customers:view", "/customers"],
  ["products:view", "/products"],
  ["invoices:view", "/invoices"],
  ["iam_users:view", "/users"],
  ["iam_roles:view", "/roles"],
  ["iam_permissions:view", "/permissions"],
];
export function firstAllowedPath(user) {
  return (
    destinations.find(([action]) =>
      user?.allowedActions?.includes(action),
    )?.[1] || "/forbidden"
  );
}
