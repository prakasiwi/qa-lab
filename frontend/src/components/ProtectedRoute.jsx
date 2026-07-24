import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
}
