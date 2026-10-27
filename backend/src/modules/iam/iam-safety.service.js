import { AppError } from "../../utils/AppError.js";

export const IAM_MANAGEMENT_ACTIONS = Object.freeze([
  "iam_users:manage",
  "iam_roles:manage",
  "iam_permissions:manage",
]);
export const PERMISSION_GRANT_ADMIN_ACTION = "iam_permissions:manage";

const actionFilters = IAM_MANAGEMENT_ACTIONS.map((actionKey) => {
  const [resource, action] = actionKey.split(":");
  return { actions: { some: { resource, action } } };
});

export async function lockIamManagerChanges(database) {
  await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('qa-lab-iam-manager-protection'))`;
}

export function countEffectiveIamManagers(database) {
  return database.user.count({
    where: {
      status: "ACTIVE",
      identifierVerifiedAt: { not: null },
      accesses: {
        some: {
          isActive: true,
          role: { isActive: true },
          permission: { isActive: true, AND: actionFilters },
        },
      },
    },
  });
}

export async function getIamManagerBaseline(database) {
  await lockIamManagerChanges(database);
  return countEffectiveIamManagers(database);
}

export async function ensureIamManagerRemains(database, previousCount) {
  const remainingCount = await countEffectiveIamManagers(database);
  if (previousCount > 0 && remainingCount === 0) {
    throw new AppError(
      "This change would remove the last effective IAM manager.",
      409,
    );
  }
}

export function hasPermissionGrantAuthority(allowedActions) {
  return (allowedActions || []).includes(PERMISSION_GRANT_ADMIN_ACTION);
}

export function assertPermissionGrantAuthority(allowedActions) {
  if (!hasPermissionGrantAuthority(allowedActions)) {
    throw new AppError(
      "The iam_permissions:manage action is required to administer permission grants.",
      403,
    );
  }
}
