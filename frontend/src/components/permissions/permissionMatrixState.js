export function permissionActionId(resourceKey, actionKey) {
  return `${resourceKey}:${actionKey}`;
}

export function updatePermissionSelection({
  row,
  selected,
  actionKey,
  checked,
  confirmClear = () => true,
}) {
  const next = new Set(selected);
  const key = permissionActionId(row.resourceKey, actionKey);

  if (checked) {
    next.add(key);
    if (actionKey !== "view")
      next.add(permissionActionId(row.resourceKey, "view"));
    return next;
  }

  if (actionKey !== "view") {
    next.delete(key);
    return next;
  }

  const hasDependents = row.actions.some(
    (action) =>
      action.key !== "view" &&
      next.has(permissionActionId(row.resourceKey, action.key)),
  );
  if (hasDependents && !confirmClear()) return selected;
  row.actions.forEach((action) =>
    next.delete(permissionActionId(row.resourceKey, action.key)),
  );
  return next;
}
