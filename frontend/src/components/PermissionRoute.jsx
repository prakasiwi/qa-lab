import { Navigate } from "react-router-dom";
import { hasAllowedAction } from "../auth/permissions";
import { useAuthSession } from "../auth/useAuthSession";
import { ProtectedRoute } from "./ProtectedRoute";

function PermissionGate({ action, children }) {
  const session = useAuthSession();
  const actions = Array.isArray(action) ? action : [action];
  const allowed = actions.every((requiredAction) =>
    hasAllowedAction(session.user, requiredAction),
  );

  if (session.loading)
    return (
      <main className="session-loading" role="status">
        Checking access…
      </main>
    );
  return allowed ? children : <Navigate to="/forbidden" replace />;
}

export function PermissionRoute({ action, children }) {
  return (
    <ProtectedRoute>
      <PermissionGate action={action}>{children}</PermissionGate>
    </ProtectedRoute>
  );
}
