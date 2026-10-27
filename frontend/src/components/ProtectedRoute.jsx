import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authSession } from "../auth/authSession";
import { useAuthSession } from "../auth/useAuthSession";

export function ProtectedRoute({ children }) {
  const session = useAuthSession();
  const location = useLocation();

  useEffect(() => {
    authSession.restore();
  }, []);

  if (session.loading)
    return (
      <main className="session-loading" role="status">
        Restoring your session…
      </main>
    );
  return session.authenticated ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}
