import { prisma } from "../../config/prisma.js";
export const accessHierarchy = {
  role: true,
  permission: {
    include: { actions: { select: { resource: true, action: true } } },
  },
};

export const eligibleAccessWhere = (userId) => ({
  userId,
  isActive: true,
  role: { isActive: true },
  permission: { isActive: true },
});

export function isEligibleAccess(access) {
  return access.isActive && access.role.isActive && access.permission.isActive;
}

export async function findEligibleAccesses(userId, database = prisma) {
  const accesses = await database.userAccess.findMany({
    where: eligibleAccessWhere(userId),
    include: accessHierarchy,
    orderBy: [{ role: { name: "asc" } }, { role: { id: "asc" } }],
  });
  return accesses.filter(isEligibleAccess);
}

export function sanitizeAccess(access) {
  return {
    id: access.role.id,
    code: access.role.code,
    name: access.role.name,
  };
}
