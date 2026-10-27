import { Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuthSession } from "../auth/useAuthSession";

function AdminGate({ children }) {
  const session = useAuthSession();
  if (session.loading)
    return (
      <main className="session-loading" role="status">
        Checking access…
      </main>
    );
  const canViewUsers = session.user?.allowedActions?.includes("iam_users:view");
  if (!canViewUsers) return <Navigate to="/forbidden" replace />;
  return children;
}
export function AdminRoute({ children }) {
  return (
    <ProtectedRoute>
      <AdminGate>{children}</AdminGate>
    </ProtectedRoute>
  );
}
