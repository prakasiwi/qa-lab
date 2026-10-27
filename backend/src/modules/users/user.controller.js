import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ok } from "../../utils/response.js";
import {
  deliverPreparedChallenge,
  prepareChallengeInTransaction,
} from "../auth/challenge.service.js";
import { sendAuthMail } from "../auth/mail.service.js";
import { listUserSessions } from "../auth/session.service.js";
import {
  assertPermissionGrantAuthority,
  ensureIamManagerRemains,
  getIamManagerBaseline,
} from "../iam/iam-safety.service.js";

const accessInclude = { role: true, permission: true };
const userFields = {
  id: true,
  name: true,
  phone: true,
  email: true,
  status: true,
  identifierVerifiedAt: true,
  mfaEnabled: true,
  createdAt: true,
  updatedAt: true,
};
const audit = (tx, actor, target, event, userAccessId = null) =>
  tx.authAudit.create({
    data: {
      userId: target,
      actorUserId: actor.id,
      userAccessId,
      event,
      result: "SUCCESS",
    },
  });
const mustExist = async (tx, id) => {
  const user = await tx.user.findUnique({ where: { id } });
  if (!user) throw new AppError("User tidak ditemukan", 404);
  return user;
};

async function validateAssignments(tx, accessAssignments, allowedActions) {
  assertPermissionGrantAuthority(allowedActions);
  const roleIds = accessAssignments.map(({ roleId }) => roleId);
  const permissionIds = accessAssignments.map(
    ({ permissionId }) => permissionId,
  );
  if (roleIds.length !== new Set(roleIds).size)
    throw new AppError("Role tidak boleh ditetapkan lebih dari satu kali", 400);
  const [roles, permissions] = await Promise.all([
    tx.role.findMany({
      where: { id: { in: roleIds }, isActive: true },
      select: { id: true },
    }),
    tx.permission.findMany({
      where: { id: { in: permissionIds }, isActive: true },
      select: { id: true },
    }),
  ]);
  if (
    roles.length !== new Set(roleIds).size ||
    permissions.length !== new Set(permissionIds).size
  )
    throw new AppError(
      "Role atau permission tidak valid atau tidak aktif",
      400,
    );
}

async function replaceAssignments(tx, user, accessAssignments, allowedActions) {
  await validateAssignments(tx, accessAssignments, allowedActions);
  const existingAccesses = await tx.userAccess.findMany({
    where: { userId: user.id },
    select: { id: true, roleId: true, permissionId: true, isActive: true },
  });
  const assignmentsByRoleId = new Map(
    accessAssignments.map((assignment) => [assignment.roleId, assignment]),
  );
  const shouldActivate = user.status === "ACTIVE";
  const affectedAccessIds = [];
  for (const existingAccess of existingAccesses) {
    const assignment = assignmentsByRoleId.get(existingAccess.roleId);
    if (!assignment) {
      if (existingAccess.isActive) affectedAccessIds.push(existingAccess.id);
      await tx.userAccess.update({
        where: { id: existingAccess.id },
        data: { isActive: false },
      });
      continue;
    }
    const hasChanged =
      existingAccess.permissionId !== assignment.permissionId ||
      existingAccess.isActive !== shouldActivate;
    if (hasChanged && existingAccess.isActive)
      affectedAccessIds.push(existingAccess.id);
    await tx.userAccess.update({
      where: { id: existingAccess.id },
      data: { permissionId: assignment.permissionId, isActive: shouldActivate },
    });
    assignmentsByRoleId.delete(existingAccess.roleId);
  }

  for (const assignment of assignmentsByRoleId.values()) {
    await tx.userAccess.create({
      data: {
        userId: user.id,
        roleId: assignment.roleId,
        permissionId: assignment.permissionId,
        isActive: shouldActivate,
      },
    });
  }
  if (affectedAccessIds.length)
    await tx.session.updateMany({
      where: { userAccessId: { in: affectedAccessIds }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
}

const userWithAssignments = {
  ...userFields,
  accesses: {
    include: accessInclude,
    orderBy: [{ role: { name: "asc" } }, { role: { id: "asc" } }],
  },
};

export async function listUsers(req, res) {
  const { page, limit, search, status, verified, mfaEnabled, role } =
    req.validatedQuery;
  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(verified === undefined
      ? {}
      : { identifierVerifiedAt: verified ? { not: null } : null }),
    ...(mfaEnabled === undefined ? {} : { mfaEnabled }),
    ...(role
      ? { accesses: { some: { role: { code: role }, isActive: true } } }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: userWithAssignments,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  return ok(res, "Daftar user berhasil diambil", { items, page, limit, total });
}

export async function getUserOptions(req, res) {
  assertPermissionGrantAuthority(req.user.allowedActions);
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, description: true },
      orderBy: { name: "asc" },
    }),
    prisma.permission.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, description: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return ok(res, "Pilihan akses berhasil diambil", { roles, permissions });
}

export async function getUser(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: userWithAssignments,
  });
  if (!user) throw new AppError("User tidak ditemukan", 404);
  return ok(res, "Detail user berhasil diambil", user);
}

export async function createUser(req, res) {
  const email = req.body.email.trim().toLowerCase();
  const created = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('admin-invitation'), hashtext(${email}))`;
    if (await tx.user.findUnique({ where: { email } }))
      throw new AppError("User tidak dapat dibuat", 409);
    await validateAssignments(
      tx,
      req.body.accessAssignments,
      req.user.allowedActions,
    );
    const user = await tx.user.create({
      data: {
        name: req.body.name.trim(),
        phone: req.body.phone || null,
        email,
        status: "PENDING_ACTIVATION",
        mfaEnabled: req.body.mfaEnabled,
      },
    });
    await replaceAssignments(
      tx,
      user,
      req.body.accessAssignments,
      req.user.allowedActions,
    );
    const createdUser = await tx.user.findUnique({
      where: { id: user.id },
      select: userWithAssignments,
    });
    const challenge = await prepareChallengeInTransaction(tx, {
      userId: user.id,
      purpose: "ADMIN_INVITATION",
      bypassCooldown: true,
    });
    await audit(tx, req.user, user.id, "ADMIN_USER_CREATED");
    return { user: createdUser, challenge };
  });
  let deliveryStatus = "ACCEPTED";
  try {
    await deliverPreparedChallenge(created.challenge, email, (payload) =>
      sendAuthMail({ ...payload, name: created.user.name }),
    );
  } catch {
    deliveryStatus = "FAILED";
    await recordInvitationOutcome(
      req.user,
      created.user.id,
      "ADMIN_INVITATION_DELIVERY_FAILED",
      "FAILURE",
    );
  }
  return ok(
    res,
    deliveryStatus === "ACCEPTED"
      ? "User created and invitation accepted for delivery."
      : "User created, but invitation delivery failed. Use resend to try again.",
    { ...created.user, deliveryStatus },
    201,
  );
}

export async function updateUser(req, res) {
  const user = await prisma.$transaction(async (tx) => {
    const managerBaseline = await getIamManagerBaseline(tx);
    const current = await mustExist(tx, req.params.id);
    const email = req.body.email.trim().toLowerCase();
    if (email !== current.email)
      throw new AppError("Email cannot be changed from this screen.", 409);
    if (
      current.updatedAt.toISOString() !==
      new Date(req.body.updatedAt).toISOString()
    )
      throw new AppError(
        "This user was changed by another administrator. Refresh and try again.",
        409,
      );
    await replaceAssignments(
      tx,
      current,
      req.body.accessAssignments,
      req.user.allowedActions,
    );
    const hasMfaChanged = Boolean(current.mfaEnabled) !== req.body.mfaEnabled;
    const result = await tx.user.update({
      where: { id: current.id },
      data: {
        name: req.body.name.trim(),
        phone: req.body.phone || null,
        mfaEnabled: req.body.mfaEnabled,
      },
      select: userWithAssignments,
    });
    if (hasMfaChanged)
      await tx.session.updateMany({
        where: { userId: current.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    await ensureIamManagerRemains(tx, managerBaseline);
    await audit(tx, req.user, result.id, "ADMIN_USER_UPDATED");
    return result;
  });
  return ok(res, "User berhasil diperbarui", user);
}

export async function updateUserStatus(req, res) {
  const user = await prisma.$transaction(async (tx) => {
    const managerBaseline = await getIamManagerBaseline(tx);
    const current = await mustExist(tx, req.params.id);
    if (
      ["PENDING_VERIFICATION", "PENDING_ACTIVATION"].includes(current.status) &&
      req.body.status === "ACTIVE"
    )
      throw new AppError(
        "User harus menyelesaikan verifikasi atau aktivasi akun",
        409,
      );
    if (current.id === req.user.id && req.body.status !== "ACTIVE")
      throw new AppError("Admin tidak dapat menonaktifkan akun sendiri", 409);
    const result = await tx.user.update({
      where: { id: current.id },
      data: { status: req.body.status },
      select: userFields,
    });
    if (result.status !== "ACTIVE")
      await tx.session.updateMany({
        where: { userId: result.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    await ensureIamManagerRemains(tx, managerBaseline);
    await audit(tx, req.user, result.id, "ADMIN_USER_STATUS_CHANGED");
    return result;
  });
  return ok(res, "Status user berhasil diubah", user);
}

export async function resendInvitation(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new AppError("User tidak ditemukan", 404);
  if (user.status !== "PENDING_ACTIVATION")
    throw new AppError(
      "Undangan hanya dapat dikirim untuk user yang menunggu aktivasi",
      409,
    );
  const challenge = await prisma.$transaction(async (tx) => {
    const value = await prepareChallengeInTransaction(tx, {
      userId: user.id,
      purpose: "ADMIN_INVITATION",
    });
    await audit(tx, req.user, user.id, "ADMIN_INVITATION_RESEND_REQUESTED");
    return value;
  });
  try {
    await deliverPreparedChallenge(challenge, user.email, (payload) =>
      sendAuthMail({ ...payload, name: user.name }),
    );
  } catch {
    await recordInvitationOutcome(
      req.user,
      user.id,
      "ADMIN_INVITATION_RESEND_FAILED",
      "FAILURE",
    );
    throw new AppError(
      "Undangan tidak dapat dikirim. Silakan coba kembali.",
      503,
    );
  }
  await recordInvitationOutcome(
    req.user,
    user.id,
    "ADMIN_INVITATION_RESEND_SENT",
    "SUCCESS",
  );
  return ok(
    res,
    "Jika alamat dapat menerima undangan, instruksi aktivasi akan dikirim.",
  );
}

export async function resendVerification(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new AppError("User tidak ditemukan", 404);
  if (user.status !== "PENDING_VERIFICATION")
    throw new AppError(
      "Verification email is only available for users pending verification.",
      409,
    );
  const challenge = await prisma.$transaction(async (tx) => {
    const value = await prepareChallengeInTransaction(tx, {
      userId: user.id,
      purpose: "REGISTER",
    });
    await audit(tx, req.user, user.id, "ADMIN_VERIFICATION_RESEND_REQUESTED");
    return value;
  });
  try {
    await deliverPreparedChallenge(challenge, user.email, (payload) =>
      sendAuthMail({ ...payload, name: user.name }),
    );
  } catch {
    throw new AppError(
      "Verification email could not be delivered. Try again later.",
      503,
    );
  }
  return ok(res, "Verification email accepted for delivery.");
}

async function recordInvitationOutcome(actor, userId, event, result) {
  try {
    await prisma.authAudit.create({
      data: { userId, actorUserId: actor.id, event, result },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "INVITATION_AUDIT_WRITE_FAILED",
        result,
        errorCode: error?.code || null,
      }),
    );
  }
}

export async function getUserSessions(req, res) {
  if (
    !(await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    }))
  )
    throw new AppError("User tidak ditemukan", 404);
  return ok(
    res,
    "Sesi user berhasil diambil",
    await listUserSessions(req.params.id),
  );
}

export async function revokeUserSession(req, res) {
  await prisma.$transaction(async (tx) => {
    const session = await tx.session.findFirst({
      where: {
        id: req.params.sessionId,
        userId: req.params.id,
        revokedAt: null,
      },
      select: { id: true, userAccessId: true },
    });
    if (!session) throw new AppError("Sesi aktif tidak ditemukan", 404);
    await tx.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    await audit(
      tx,
      req.user,
      req.params.id,
      "ADMIN_SESSION_REVOKED",
      session.userAccessId,
    );
  });
  return ok(res, "Sesi berhasil dicabut");
}
