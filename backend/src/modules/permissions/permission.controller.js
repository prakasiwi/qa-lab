import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ok } from "../../utils/response.js";
import { revokePermissionSessions } from "../auth/session.service.js";
import {
  assertPermissionGrantAuthority,
  ensureIamManagerRemains,
  getIamManagerBaseline,
} from "../iam/iam-safety.service.js";
import {
  PERMISSION_ACTION_CATALOG,
  PERMISSION_CATALOG_ROWS,
  validatePermissionActions,
} from "./permission.catalog.js";

const actionFields = { id: true, resource: true, action: true };
const permissionFields = {
  id: true,
  code: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  actions: {
    select: actionFields,
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  },
};

function normalizeDescription(value) {
  const description = value?.trim();
  return description || null;
}

function normalizePayload(body) {
  const actions = body.actions.map(({ resource, action }) => ({
    resource: resource.trim().toLowerCase(),
    action: action.trim().toLowerCase(),
  }));
  const actionValidationError = validatePermissionActions(
    actions,
    body.isActive,
  );
  if (actionValidationError) throw new AppError(actionValidationError, 400);
  return {
    code: body.code?.trim().toUpperCase(),
    name: body.name.trim(),
    description: normalizeDescription(body.description),
    isActive: body.isActive,
    actions,
  };
}

async function getPermissionOrThrow(database, id) {
  const permission = await database.permission.findUnique({
    where: { id },
    select: permissionFields,
  });
  if (!permission) throw new AppError("Permission was not found.", 404);
  return permission;
}

async function lockPermissionNames(database) {
  await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('qa-lab-permission-names'))`;
}

async function ensureUniquePermission(database, { code, name }, exceptId) {
  const duplicate = await database.permission.findFirst({
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
    throw new AppError("A permission with this code already exists.", 409);
  if (duplicate)
    throw new AppError("A permission with this name already exists.", 409);
}

async function getPermissionImpact(database, permissionId) {
  const now = new Date();
  const [activeAssignments, activeSessions] = await Promise.all([
    database.userAccess.count({ where: { permissionId, isActive: true } }),
    database.session.count({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
        userAccess: { permissionId, isActive: true },
      },
    }),
  ]);
  const activeUsers = await database.user.count({
    where: { accesses: { some: { permissionId, isActive: true } } },
  });
  return { activeAssignments, activeUsers, activeSessions };
}

function haveActionsChanged(currentActions, requestedActions) {
  const currentKeys = currentActions
    .map(({ resource, action }) => `${resource}:${action}`)
    .sort();
  const requestedKeys = requestedActions
    .map(({ resource, action }) => `${resource}:${action}`)
    .sort();
  return (
    currentKeys.length !== requestedKeys.length ||
    currentKeys.some((key, index) => key !== requestedKeys[index])
  );
}

export function getPermissionActionCatalog(_req, res) {
  return ok(res, "Permission action catalog retrieved successfully.", {
    items: PERMISSION_CATALOG_ROWS,
    actionsByResource: PERMISSION_ACTION_CATALOG,
  });
}

export async function listPermissions(req, res) {
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
  const [permissions, total] = await prisma.$transaction([
    prisma.permission.findMany({
      where,
      select: permissionFields,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.permission.count({ where }),
  ]);
  const permissionIds = permissions.map(({ id }) => id);
  const assignedUserRows = permissionIds.length
    ? await prisma.userAccess.groupBy({
        by: ["permissionId", "userId"],
        where: { permissionId: { in: permissionIds } },
      })
    : [];
  const assignedUsersByPermission = assignedUserRows.reduce((counts, row) => {
    counts.set(row.permissionId, (counts.get(row.permissionId) || 0) + 1);
    return counts;
  }, new Map());
  const items = permissions.map((permission) => ({
    ...permission,
    assignedUsers: assignedUsersByPermission.get(permission.id) || 0,
  }));
  return ok(res, "Permissions retrieved successfully.", {
    items,
    page,
    limit,
    total,
  });
}

export async function getPermission(req, res) {
  const [permission, assignedUsers, impact] = await prisma.$transaction(
    async (tx) => {
      const currentPermission = await getPermissionOrThrow(tx, req.params.id);
      const [assignedUserRows, permissionImpact] = await Promise.all([
        tx.userAccess.groupBy({
          by: ["userId"],
          where: { permissionId: currentPermission.id },
        }),
        getPermissionImpact(tx, currentPermission.id),
      ]);
      return [currentPermission, assignedUserRows.length, permissionImpact];
    },
  );
  return ok(res, "Permission retrieved successfully.", {
    ...permission,
    assignedUsers,
    impact,
  });
}

export async function createPermission(req, res) {
  const payload = normalizePayload(req.body);
  assertPermissionGrantAuthority(req.user.allowedActions);
  const permission = await prisma.$transaction(async (tx) => {
    await lockPermissionNames(tx);
    await ensureUniquePermission(tx, payload);
    return tx.permission.create({
      data: {
        code: payload.code,
        name: payload.name,
        description: payload.description,
        isActive: payload.isActive,
        actions: { create: payload.actions },
      },
      select: permissionFields,
    });
  });
  return ok(res, "Permission created successfully.", permission, 201);
}

export async function updatePermission(req, res) {
  const payload = normalizePayload(req.body);
  assertPermissionGrantAuthority(req.user.allowedActions);
  const permission = await prisma.$transaction(async (tx) => {
    const managerBaseline = await getIamManagerBaseline(tx);
    const current = await getPermissionOrThrow(tx, req.params.id);
    if (payload.code && payload.code !== current.code.toUpperCase()) {
      throw new AppError("Permission code cannot be changed.", 409);
    }
    await lockPermissionNames(tx);
    await ensureUniquePermission(tx, { name: payload.name }, current.id);
    const result = await tx.permission.updateMany({
      where: { id: current.id, updatedAt: req.body.updatedAt },
      data: {
        name: payload.name,
        description: payload.description,
        isActive: payload.isActive,
      },
    });
    if (result.count !== 1)
      throw new AppError(
        "This permission was changed by another administrator. Refresh and try again.",
        409,
      );
    await tx.permissionAction.deleteMany({
      where: { permissionId: current.id },
    });
    if (payload.actions.length) {
      await tx.permissionAction.createMany({
        data: payload.actions.map((action) => ({
          permissionId: current.id,
          ...action,
        })),
      });
    }
    const hasAuthorizationChanged =
      current.isActive !== payload.isActive ||
      haveActionsChanged(current.actions, payload.actions);
    if (hasAuthorizationChanged) await revokePermissionSessions(current.id, tx);
    await ensureIamManagerRemains(tx, managerBaseline);
    return getPermissionOrThrow(tx, current.id);
  });
  return ok(res, "Permission updated successfully.", permission);
}
