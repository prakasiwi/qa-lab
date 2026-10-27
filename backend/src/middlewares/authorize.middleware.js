import { AppError } from "../utils/AppError.js";

export function requirePermission(resource, action) {
  const allowedAction = `${resource}:${action}`;
  return (req, res, next) => {
    if (!req.user?.allowedActions?.includes(allowedAction)) {
      return next(
        new AppError("You do not have permission to perform this action.", 403),
      );
    }
    return next();
  };
}
