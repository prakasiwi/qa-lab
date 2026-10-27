import { useAuthSession } from "./useAuthSession";

export function hasAllowedAction(user, action) {
  return Boolean(action && user?.allowedActions?.includes(action));
}

export function useAllowedAction(action) {
  const session = useAuthSession();
  return hasAllowedAction(session.user, action);
}
