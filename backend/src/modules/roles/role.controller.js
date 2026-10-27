import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ok } from "../../utils/response.js";
import { revokeRoleSessions } from "../auth/session.service.js";
import {
  ensureIamManagerRemains,
  getIamManagerBaseline,
} from "../iam/iam-safety.service.js";

const roleFields = {
  id: true,
  code: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

function normalizeDescription(value) {
  const description = value?.trim();
  return description || null;
}

async function getRoleOrThrow(database, id) {
  const role = await database.role.findUnique({
    where: { id },
    select: roleFields,
  });
  if (!role) throw new AppError("Role was not found.", 404);
  return role;
}

async function lockRoleNames(database) {
  await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('qa-lab-role-names'))`;
}

async function ensureUniqueRole(database, { code, name }, exceptId) {
  const duplicate = await database.role.findFirst({
    where: {
      ...(exceptId ? { id: { not: exceptId } } : {}),
      OR: [
        ...(code ? [{ code: { equals: code, mode: "insensitive" } }] : []),
        { name: { equals: name, mode: "insensitive" } },
      ],
    },
    select: { code: true, name: true },
  });
  const hasDuplicateCode =
    code && duplicate?.code.toUpperCase() === code.toUpperCase();
  if (hasDuplicateCode)
    throw new AppError("A role with this code already exists.", 409);
  if (duplicate)
    throw new AppError("A role with this name already exists.", 409);
}

async function getRoleImpact(database, roleId) {
  const now = new Date();
  const [activeAssignments, activeSessions] = await Promise.all([
    database.userAccess.count({ where: { roleId, isActive: true } }),
    database.session.count({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
        userAccess: { roleId, isActive: true },
      },
    }),
  ]);
  return { activeAssignments, activeUsers: activeAssignments, activeSessions };
}

export async function listRoles(req, res) {
  const { page, limit, search, status } = req.validatedQuery;
  const where = {
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
  };
  const [roles, total] = await prisma.$transaction([
    prisma.role.findMany({
      where,
      select: { ...roleFields, _count: { select: { userAccesses: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.role.count({ where }),
  ]);
  const items = roles.map(({ _count, ...role }) => ({
    ...role,
    assignedUsers: _count.userAccesses,
  }));
  return ok(res, "Roles retrieved successfully.", {
    items,
    page,
    limit,
    total,
  });
}

export async function getRole(req, res) {
  const [role, assignedUsers, impact] = await prisma.$transaction(
    async (tx) => {
      const currentRole = await getRoleOrThrow(tx, req.params.id);
      const [assignedUserCount, roleImpact] = await Promise.all([
        tx.userAccess.count({ where: { roleId: currentRole.id } }),
        getRoleImpact(tx, currentRole.id),
      ]);
      return [currentRole, assignedUserCount, roleImpact];
    },
  );
  return ok(res, "Role retrieved successfully.", {
    ...role,
    assignedUsers,
    impact,
  });
}

export async function createRole(req, res) {
  const payload = {
    code: req.body.code.trim().toUpperCase(),
    name: req.body.name.trim(),
    description: normalizeDescription(req.body.description),
    isActive: req.body.isActive,
  };
  const role = await prisma.$transaction(async (tx) => {
    await lockRoleNames(tx);
    await ensureUniqueRole(tx, payload);
    return tx.role.create({ data: payload, select: roleFields });
  });
  return ok(res, "Role created successfully.", role, 201);
}

export async function updateRole(req, res) {
  const role = await prisma.$transaction(async (tx) => {
    const managerBaseline = await getIamManagerBaseline(tx);
    const current = await getRoleOrThrow(tx, req.params.id);
    const submittedCode = req.body.code?.trim().toUpperCase();
    if (submittedCode && submittedCode !== current.code.toUpperCase()) {
      throw new AppError("Role code cannot be changed.", 409);
    }
    await lockRoleNames(tx);
    await ensureUniqueRole(tx, { name: req.body.name.trim() }, current.id);
    const result = await tx.role.updateMany({
      where: { id: current.id, updatedAt: req.body.updatedAt },
      data: {
        name: req.body.name.trim(),
        description: normalizeDescription(req.body.description),
        isActive: req.body.isActive,
      },
    });
    if (result.count !== 1)
      throw new AppError(
        "This role was changed by another administrator. Refresh and try again.",
        409,
      );
    const hasStatusChanged = current.isActive !== req.body.isActive;
    if (hasStatusChanged) await revokeRoleSessions(current.id, tx);
    await ensureIamManagerRemains(tx, managerBaseline);
    return getRoleOrThrow(tx, current.id);
  });
  return ok(res, "Role updated successfully.", role);
}
