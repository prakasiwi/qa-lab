import { AppError } from "../../utils/AppError.js";
import { findEligibleAccesses } from "./auth-access.service.js";
import { prepareAccessSelectionInTransaction } from "./role-selection.service.js";

export async function prepareRoleSelection(user, authMethod, database) {
  const accesses = await findEligibleAccesses(user.id, database);
  if (!accesses.length)
    throw new AppError("No active role is available for this account.", 403);

  return prepareAccessSelectionInTransaction(
    database,
    user.id,
    authMethod,
    accesses,
    user.mfaEnabled,
  );
}
